"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Code, Heart, ExternalLink, BarChart3, Eye, Trash2, Flag } from "lucide-react"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminAppsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
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
    await fetchApps()
    setLoading(false)
  }

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from("student_apps")
        .select(`
          *,
          creator:users!student_apps_created_by_fkey(full_name),
          likes:app_likes(count),
          comments:app_comments(count),
          reports:app_reports(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Process the data to get proper counts
      const processedApps =
        data?.map((app) => ({
          ...app,
          _count: {
            likes: app.likes?.[0]?.count || 0,
            comments: app.comments?.[0]?.count || 0,
            reports: app.reports?.[0]?.count || 0,
          },
        })) || []

      setApps(processedApps)
    } catch (error) {
      console.error("Error fetching apps:", error)
    }
  }

  const deleteApp = async (appId: string, appTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${appTitle}"? This action cannot be undone.`)) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase.from("student_apps").delete().eq("id", appId)

      if (error) throw error
      await fetchApps()
    } catch (error) {
      console.error("Error deleting app:", error)
      alert("Failed to delete app. Please try again.")
    } finally {
      setActionLoading(false)
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
          <Code className="w-8 h-8 text-primary" />
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">App Management</h1>
        </div>

        <div className="grid gap-6">
          {apps.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{app.title}</h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{app.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {app._count?.likes || 0} likes
                      </div>
                      <div className="flex items-center gap-1">
                        <Code className="w-4 h-4" />
                        {app.tech_stack}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {app._count?.comments || 0} comments
                      </div>
                      {app._count?.reports > 0 && (
                        <div className="flex items-center gap-1">
                          <Flag className="w-4 h-4 text-red-500" />
                          {app._count.reports} reports
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">By {app.creator?.full_name}</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/apps/${app.id}/analytics`}>
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/apps/${app.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    {app.demo_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={app.demo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteApp(app.id, app.title)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {apps.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl mb-2">No apps found</h3>
                <p className="text-muted-foreground">No student apps have been published yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
