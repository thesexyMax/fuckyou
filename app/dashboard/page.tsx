"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Users,
  Calendar,
  Code,
  TrendingUp,
  Activity,
  Plus,
  Brain,
  UserIcon,
  Ban,
  AlertTriangle,
  Trophy,
  ChevronDown,
  ChevronUp,
  LogOut,
  GripVertical,
} from "lucide-react"
import Link from "next/link"
import BanCheck from "@/components/ban-check"
import NotificationDropdown from "@/components/notifications/notification-dropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserStats {
  eventsCreated: number
  appsPublished: number
  eventsRegistered: number
  appsLiked: number
}

interface RecentEvent {
  id: string
  title: string
  event_date: string
  creator: { full_name: string }
}

interface RecentApp {
  id: string
  title: string
  description: string
  created_at: string
  creator: { full_name: string }
}

interface DashboardSection {
  id: string
  title: string
  component: React.ReactNode
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({
    eventsCreated: 0,
    appsPublished: 0,
    eventsRegistered: 0,
    appsLiked: 0,
  })
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [recentApps, setRecentApps] = useState<RecentApp[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [sectionOrder, setSectionOrder] = useState<string[]>(["quick-actions", "top-performers", "your-profile"])

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

      setUser(currentUser)
      await fetchUserData(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      const [{ count: eventsCreated }, { count: appsPublished }, { count: eventsRegistered }, { count: appsLiked }] =
        await Promise.all([
          supabase.from("events").select("*", { count: "exact", head: true }).eq("created_by", userId),
          supabase.from("student_apps").select("*", { count: "exact", head: true }).eq("created_by", userId),
          supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("app_likes").select("*", { count: "exact", head: true }).eq("user_id", userId),
        ])

      setStats({
        eventsCreated: eventsCreated || 0,
        appsPublished: appsPublished || 0,
        eventsRegistered: eventsRegistered || 0,
        appsLiked: appsLiked || 0,
      })

      const [{ data: eventsData }, { data: appsData }] = await Promise.all([
        supabase
          .from("events")
          .select(`
            *,
            creator:users!events_created_by_fkey(full_name)
          `)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("student_apps")
          .select(`
            *,
            creator:users!student_apps_created_by_fkey(full_name)
          `)
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      setRecentEvents(eventsData || [])
      setRecentApps(appsData || [])

      const { data: leaderboardData } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          student_id,
          username,
          quiz_attempts(score_percentage, total_points),
          student_apps(id),
          events(id)
        `)
        .eq("is_admin", false)
        .eq("is_banned", false)

      if (leaderboardData) {
        const usersWithPoints = leaderboardData
          .map((u: any) => {
            const quizPoints = u.quiz_attempts.reduce((sum: number, attempt: any) => {
              const points = (((attempt.total_points || 0) * (attempt.score_percentage || 0)) / 100) * 5
              return sum + points
            }, 0)
            const appPoints = u.student_apps.length * 50
            const eventPoints = u.events.length * 30
            const totalPoints = quizPoints + appPoints + eventPoints

            return {
              id: u.id,
              full_name: u.full_name,
              student_id: u.student_id,
              username: u.username,
              totalPoints: Math.round(totalPoints),
            }
          })
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
          .slice(0, 5)

        setLeaderboard(usersWithPoints)

        const allUsers = leaderboardData
          .map((u: any) => {
            const quizPoints = u.quiz_attempts.reduce((sum: number, attempt: any) => {
              const points = (((attempt.total_points || 0) * (attempt.score_percentage || 0)) / 100) * 5
              return sum + points
            }, 0)
            const appPoints = u.student_apps.length * 50
            const eventPoints = u.events.length * 30
            const totalPoints = quizPoints + appPoints + eventPoints

            return { id: u.id, totalPoints }
          })
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints)

        const userIndex = allUsers.findIndex((u: any) => u.id === userId)
        if (userIndex !== -1) {
          setUserRank(userIndex + 1)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedItem(sectionId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const newOrder = [...sectionOrder]
    const draggedIndex = newOrder.indexOf(draggedItem)
    const targetIndex = newOrder.indexOf(targetId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    setSectionOrder(newOrder)
    setDraggedItem(null)
  }

  const renderSection = (sectionId: string) => {
    const sections: Record<string, React.ReactNode> = {
      "quick-actions": (
        <Card
          className="cursor-move"
          draggable
          onDragStart={(e) => handleDragStart(e, "quick-actions")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "quick-actions")}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Quick Actions</CardTitle>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/quiz">
                <Brain className="mr-2 w-4 h-4" />
                Take Quiz
              </Link>
            </Button>
            {user?.is_admin && (
              <Button asChild className="w-full justify-start hover:bg-orange-100 bg-transparent" variant="outline">
                <Link href="/events/create">
                  <Plus className="mr-2 w-4 h-4" />
                  Create Event
                </Link>
              </Button>
            )}
            <Button
              asChild={!user?.is_banned}
              className="w-full justify-start hover:bg-orange-100 bg-transparent"
              variant="outline"
              disabled={user?.is_banned}
            >
              {user?.is_banned ? (
                <span className="flex items-center">
                  <Code className="mr-2 w-4 h-4" />
                  Publish App (Restricted)
                </span>
              ) : (
                <Link href="/apps/create">
                  <Code className="mr-2 w-4 h-4" />
                  Publish App
                </Link>
              )}
            </Button>
            <Button asChild className="w-full justify-start hover:bg-orange-100 bg-transparent" variant="outline">
              <Link href="/profile">
                <UserIcon className="mr-2 w-4 h-4" />
                Edit Profile
              </Link>
            </Button>
            <Button asChild className="w-full justify-start hover:bg-orange-100 bg-transparent" variant="outline">
              <Link href="/events">
                <Calendar className="mr-2 w-4 h-4" />
                Browse Events
              </Link>
            </Button>
            <Button asChild className="w-full justify-start hover:bg-orange-100 bg-transparent" variant="outline">
              <Link href="/apps">
                <TrendingUp className="mr-2 w-4 h-4" />
                Explore Apps
              </Link>
            </Button>
          </CardContent>
        </Card>
      ),
      "top-performers": (
        <Card
          className="cursor-move"
          draggable
          onDragStart={(e) => handleDragStart(e, "top-performers")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "top-performers")}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Top Performers
            </CardTitle>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <Link
                  key={user.id}
                  href={`/u/${user.username}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-50/50 to-transparent hover:from-primary/5 transition-colors block"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                            ? "bg-gray-400"
                            : index === 2
                              ? "bg-orange-500"
                              : "bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{user.full_name}</span>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{user.totalPoints} pts</span>
                </Link>
              ))}
              <Button asChild size="sm" className="w-full mt-4 hover:bg-primary/90">
                <Link href="/leaderboard">
                  <Trophy className="mr-2 w-4 h-4" />
                  View Full Leaderboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ),
      "your-profile": (
        <Card
          className="cursor-move"
          draggable
          onDragStart={(e) => handleDragStart(e, "your-profile")}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "your-profile")}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Your Profile
            </CardTitle>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Student ID</span>
                <Badge variant="secondary" className="text-xs">
                  {user?.student_id}
                </Badge>
              </div>
              {user?.major && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Major</span>
                  <Badge variant="outline" className="text-xs">
                    {user.major}
                  </Badge>
                </div>
              )}
              {user?.graduation_year && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Graduation</span>
                  <Badge variant="outline" className="text-xs">
                    {user.graduation_year}
                  </Badge>
                </div>
              )}
              <Button asChild size="sm" className="w-full hover:bg-primary/90">
                <Link href="/profile">Update Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ),
    }
    return sections[sectionId]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <BanCheck>
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Brand */}
              <Link
                href="/dashboard"
                className="font-serif font-bold text-xl text-gray-900 hover:text-primary transition-colors"
              >
                Campus Community
              </Link>

              {/* Center: Navigation Icons */}
              <div className="hidden md:flex items-center gap-6">
                <Link href="/quiz" className="p-2 rounded-lg hover:bg-blue-50 transition-colors" title="Quizzes">
                  <Brain className="w-5 h-5 text-blue-600" />
                </Link>
                <Link href="/events" className="p-2 rounded-lg hover:bg-green-50 transition-colors" title="Events">
                  <Calendar className="w-5 h-5 text-green-600" />
                </Link>
                <Link href="/apps" className="p-2 rounded-lg hover:bg-purple-50 transition-colors" title="Apps">
                  <Code className="w-5 h-5 text-purple-600" />
                </Link>
                <Link
                  href="/leaderboard"
                  className="p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                  title="Leaderboard"
                >
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </Link>
              </div>

              {/* Right: Notifications and User Profile */}
              <div className="flex items-center gap-3">
                <NotificationDropdown user={user} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-100">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg border-2 border-white ring-2 ring-primary/20">
                        {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <Activity className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <UserIcon className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        localStorage.removeItem("campus_user")
                        window.location.href = "/auth/login"
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {user.is_banned && (
            <Card className="mb-8 border-destructive/50 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ban className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif font-bold text-xl text-destructive mb-2">Account Banned</h3>
                    <p className="text-muted-foreground mb-3">
                      Your account has been restricted. You can view content but cannot create or interact with posts.
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-sm">Reason:</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{user.banned_reason || "No reason provided"}</p>
                      {user.banned_at && (
                        <p className="text-xs text-muted-foreground">Banned on: {formatDate(user.banned_at)}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Contact an administrator if you believe this is an error.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl md:text-2xl text-foreground">
                Welcome back, {user.full_name}!
              </h1>
              <p className="text-muted-foreground text-sm">Your campus community dashboard</p>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.appsPublished}</p>
                    <p className="text-sm font-medium text-foreground">Apps Published</p>
                    <p className="text-xs text-muted-foreground">Projects shared with community</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Code className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.eventsRegistered}</p>
                    <p className="text-sm font-medium text-foreground">Events Joined</p>
                    <p className="text-xs text-muted-foreground">Community events attended</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.appsLiked}</p>
                    <p className="text-sm font-medium text-foreground">Apps Liked</p>
                    <p className="text-xs text-muted-foreground">Projects you appreciated</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">#{userRank || "—"}</p>
                    <p className="text-sm font-medium text-foreground">Your Rank</p>
                    <p className="text-xs text-muted-foreground">Campus leaderboard position</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:hidden">
            <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Your Stats</h3>
                          <p className="text-sm text-muted-foreground">View your activity summary</p>
                        </div>
                      </div>
                      {isStatsOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{stats.appsPublished}</p>
                        <p className="text-xs font-medium text-foreground">Apps Published</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{stats.eventsRegistered}</p>
                        <p className="text-xs font-medium text-foreground">Events Joined</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{stats.appsLiked}</p>
                        <p className="text-xs font-medium text-foreground">Apps Liked</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">#{userRank || "—"}</p>
                        <p className="text-xs font-medium text-foreground">Your Rank</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mt-12">
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-serif text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <Badge variant="outline">Campus Updates</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Recent Events
                      </h4>
                      <div className="space-y-3">
                        {recentEvents.slice(0, 4).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-orange-50/50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">by {event.creator?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(event.event_date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Recent Apps
                      </h4>
                      <div className="space-y-3">
                        {recentApps.slice(0, 4).map((app) => (
                          <div
                            key={app.id}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-orange-50/50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Code className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{app.title}</p>
                              <p className="text-xs text-muted-foreground">by {app.creator?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(app.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {user.is_admin && (
                <div className="mt-6">
                  <div className="flex items-center gap-4 justify-center">
                    <Link
                      href="/admin/notifications"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white border hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h8V9H4v2z"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">Send Notification</span>
                    </Link>

                    <Link
                      href="/admin/checkin"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white border hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-4h.01M12 8h.01M12 8h4.01M12 8H7.99M12 8V4m0 0H7.99M12 4h4.01"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">QR Check-in</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {sectionOrder.map((sectionId) => (
                <div key={sectionId}>{renderSection(sectionId)}</div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </BanCheck>
  )
}
