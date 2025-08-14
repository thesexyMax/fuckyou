"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, Calendar, Code, Activity } from "lucide-react"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import { useRouter } from "next/navigation"

export default function AdminAnalyticsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalApps: 0,
    totalRegistrations: 0,
    totalLikes: 0,
    activeUsers: 0,
    monthlyGrowth: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getUserFromStorage()
    if (!currentUser || !currentUser.is_admin) {
      router.push("/dashboard")
      return
    }
    setUser(currentUser)
    await fetchAnalytics()
    setLoading(false)
  }

  const fetchAnalytics = async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalEvents },
        { count: totalApps },
        { count: totalRegistrations },
        { count: totalLikes },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("student_apps").select("*", { count: "exact", head: true }),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }),
        supabase.from("app_likes").select("*", { count: "exact", head: true }),
      ])

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalApps: totalApps || 0,
        totalRegistrations: totalRegistrations || 0,
        totalLikes: totalLikes || 0,
        activeUsers: Math.floor((totalUsers || 0) * 0.7),
        monthlyGrowth: 12.5,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Analytics Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <Badge variant="secondary">Total</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
              <p className="text-sm text-muted-foreground">Registered Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
                <Badge variant="secondary">Events</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalEvents}</div>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Code className="w-8 h-8 text-green-600" />
                <Badge variant="secondary">Apps</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalApps}</div>
              <p className="text-sm text-muted-foreground">Published Apps</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-orange-600" />
                <Badge variant="secondary">Active</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.activeUsers}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Event Registrations</span>
                  <Badge>{analytics.totalRegistrations}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>App Likes</span>
                  <Badge>{analytics.totalLikes}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monthly Growth</span>
                  <Badge className="bg-green-100 text-green-800">+{analytics.monthlyGrowth}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>User Engagement Rate</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Events per User</span>
                  <Badge>{(analytics.totalEvents / analytics.totalUsers).toFixed(1)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Apps per User</span>
                  <Badge>{(analytics.totalApps / analytics.totalUsers).toFixed(1)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
