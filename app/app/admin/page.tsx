"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calendar,
  Code,
  TrendingUp,
  Shield,
  Activity,
  Ban,
  AlertTriangle,
  Brain,
  Plus,
  QrCode,
} from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import AdminStatsCard from "@/components/admin/admin-stats-card"

interface Stats {
  totalUsers: number
  totalEvents: number
  totalApps: number
  totalRegistrations: number
  totalLikes: number
  totalReports: number
  bannedUsers: number
}

interface RecentUser {
  id: string
  full_name: string
  email?: string
  is_admin: boolean
  is_banned: boolean
  username?: string
}

interface RecentEvent {
  id: string
  title: string
  event_date: string
  creator: { full_name: string }
  registrations: { count: number }[]
}

interface RecentReport {
  id: string
  created_at: string
  category: string
  app: { title: string }
  reporter: { full_name: string }
  reason: string
  app_id: string
  status: string
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEvents: 0,
    totalApps: 0,
    totalRegistrations: 0,
    totalLikes: 0,
    totalReports: 0,
    bannedUsers: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()

      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }

      if (!currentUser.is_admin) {
        window.location.href = "/dashboard"
        return
      }

      setUser(currentUser)
      await fetchData()
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      // Get platform statistics
      const [
        { count: totalUsers },
        { count: totalEvents },
        { count: totalApps },
        { count: totalRegistrations },
        { count: totalLikes },
        { count: totalReports },
        { count: bannedUsers },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("student_apps").select("*", { count: "exact", head: true }),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }),
        supabase.from("app_likes").select("*", { count: "exact", head: true }),
        supabase.from("app_reports").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_banned", true),
      ])

      setStats({
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalApps: totalApps || 0,
        totalRegistrations: totalRegistrations || 0,
        totalLikes: totalLikes || 0,
        totalReports: totalReports || 0,
        bannedUsers: bannedUsers || 0,
      })

      // Get recent data
      const [{ data: usersData }, { data: eventsData }, { data: reportsData }] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(5),
        supabase
          .from("events")
          .select(`
            *,
            creator:users!events_created_by_fkey(full_name),
            registrations:event_registrations(count)
          `)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("app_reports")
          .select(`
            *,
            app:student_apps(title),
            reporter:users!app_reports_reported_by_fkey(full_name)
          `)
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      setRecentUsers(usersData || [])
      setRecentEvents(eventsData || [])
      setRecentReports(reportsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with Quick Action Icons */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground text-lg">Manage your campus community platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="w-10 h-10 p-0 bg-transparent">
              <Link href="/admin/checkin" title="QR Scanner">
                <QrCode className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-10 h-10 p-0 bg-transparent">
              <Link href="/admin/notifications" title="Send Notification">
                <AlertTriangle className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminStatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            trend="+12%"
            trendUp={true}
            description="Active community members"
          />
          <AdminStatsCard
            title="Events Created"
            value={stats.totalEvents}
            icon={Calendar}
            trend="+8%"
            trendUp={true}
            description="Campus events hosted"
          />
          <AdminStatsCard
            title="Apps Published"
            value={stats.totalApps}
            icon={Code}
            trend="+15%"
            trendUp={true}
            description="Student projects shared"
          />
          <AdminStatsCard
            title="Engagement"
            value={stats.totalRegistrations + stats.totalLikes}
            icon={Activity}
            trend="+23%"
            trendUp={true}
            description="Total interactions"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <Badge variant="outline">Platform Overview</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Recent Events</h4>
                      <div className="space-y-2">
                        {recentEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className="text-sm">
                            <p className="font-medium truncate">{event.title}</p>
                            <p className="text-muted-foreground text-xs">
                              by {event.creator?.full_name} • {/* Use custom date formatting */}
                              {formatDate(event.event_date)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Platform Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Registrations</span>
                          <span className="font-medium">{stats.totalRegistrations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Likes</span>
                          <span className="font-medium">{stats.totalLikes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>App Reports</span>
                          <span className="font-medium">{stats.totalReports}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/admin/quizzes/create">
                    <Plus className="mr-2 w-4 h-4" />
                    Create Quiz
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/users">
                    <Users className="mr-2 w-4 h-4" />
                    Manage Users
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/events">
                    <Calendar className="mr-2 w-4 h-4" />
                    Manage Events
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/apps">
                    <Code className="mr-2 w-4 h-4" />
                    Manage Apps
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/bans">
                    <Ban className="mr-2 w-4 h-4" />
                    User Restrictions
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/quizzes">
                    <Brain className="mr-2 w-4 h-4" />
                    Manage Quizzes
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href="/admin/analytics">
                    <TrendingUp className="mr-2 w-4 h-4" />
                    View Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* User Restrictions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  User Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Banned Users</span>
                    <Badge variant="destructive" className="text-xs">
                      {stats.bannedUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">App Reports</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.totalReports}
                    </Badge>
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <Link href="/admin/bans">Manage Restrictions</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.slice(0, 4).map((recentUser) => (
                    <Link key={recentUser.id} href={`/u/${recentUser.username || recentUser.id}`}>
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">{recentUser.full_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{recentUser.email || "No email"}</p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={recentUser.is_admin ? "default" : "secondary"} className="text-xs">
                            {recentUser.is_admin ? "Admin" : "User"}
                          </Badge>
                          {recentUser.is_banned && (
                            <Badge variant="destructive" className="text-xs">
                              Banned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {recentUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent users</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentication</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Reports */}
        {recentReports.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent App Reports ({stats.totalReports})
                </CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/reports">View All Reports</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50/30"
                    >
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{report.app?.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {report.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Reported by {report.reporter?.full_name} • {formatDate(report.created_at)}
                        </p>
                        <p className="text-sm text-foreground bg-white/50 p-2 rounded border">{report.reason}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/apps/${report.app_id}`}>View App</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/apps/${report.app_id}/analytics`}>Analytics</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Report Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Total Reports:</span>
                      <span className="font-medium">{stats.totalReports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Review:</span>
                      <span className="font-medium text-orange-600">
                        {recentReports.filter((r) => r.status === "pending").length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
