"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, Eye, Heart, Star, MessageCircle, Flag } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

export default function AppAnalyticsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [app, setApp] = useState(null)
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalRatings: 0,
    averageRating: 0,
    totalComments: 0,
    totalReports: 0,
  })
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
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
    await loadData()
    setLoading(false)
  }

  const loadData = async () => {
    try {
      // Get app details
      const { data: appData } = await supabase.from("student_apps").select("*").eq("id", params.id).single()

      if (!appData) {
        router.push("/admin/apps")
        return
      }

      setApp(appData)

      const [
        { count: totalLikes },
        { count: totalRatings },
        { count: totalComments },
        { data: reportsData, count: totalReports },
      ] = await Promise.all([
        supabase.from("app_likes").select("*", { count: "exact", head: true }).eq("app_id", params.id),
        supabase.from("app_ratings").select("*", { count: "exact", head: true }).eq("app_id", params.id),
        supabase.from("app_comments").select("*", { count: "exact", head: true }).eq("app_id", params.id),
        supabase
          .from("app_reports")
          .select(`
          *,
          reporter:users!app_reports_reported_by_fkey(full_name),
          created_at,
          category,
          reason,
          status
        `)
          .eq("app_id", params.id),
      ])

      setAnalytics({
        totalViews: appData.view_count || 0, // Use real view count from database
        totalLikes: totalLikes || 0,
        totalRatings: totalRatings || 0,
        averageRating: appData.average_rating || 0,
        totalComments: totalComments || 0,
        totalReports: totalReports || 0,
      })

      setReports(reportsData || [])
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !app) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/admin/apps">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Apps Management
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">App Analytics</h1>
            <p className="text-muted-foreground">{app.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Eye className="w-8 h-8 text-blue-600" />
                <Badge variant="secondary">Views</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalViews}</div>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heart className="w-8 h-8 text-red-600" />
                <Badge variant="secondary">Likes</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalLikes}</div>
              <p className="text-sm text-muted-foreground">Total Likes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Star className="w-8 h-8 text-yellow-600" />
                <Badge variant="secondary">Rating</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">{analytics.totalRatings} ratings</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <MessageCircle className="w-8 h-8 text-green-600" />
                <Badge variant="secondary">Comments</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalComments}</div>
              <p className="text-sm text-muted-foreground">Total Comments</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Flag className="w-8 h-8 text-orange-600" />
                <Badge variant="secondary">Reports</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalReports}</div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>App Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Created</span>
                  <Badge>{new Date(app.created_at).toLocaleDateString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last Updated</span>
                  <Badge>{new Date(app.updated_at).toLocaleDateString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tags</span>
                  <Badge>{app.tags?.length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tech Stack</span>
                  <Badge>{app.tech_stack?.length || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Like Rate</span>
                  <Badge className="bg-green-100 text-green-800">
                    {analytics.totalViews > 0 ? ((analytics.totalLikes / analytics.totalViews) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Comment Rate</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {analytics.totalViews > 0 ? ((analytics.totalComments / analytics.totalViews) * 100).toFixed(1) : 0}
                    %
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rating Rate</span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {analytics.totalViews > 0 ? ((analytics.totalRatings / analytics.totalViews) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {reports.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  App Reports ({reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant={report.status === "pending" ? "secondary" : "outline"}>
                            {report.category}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Reported by {report.reporter?.full_name} •{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{report.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
