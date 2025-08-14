"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Code, Plus, Search, Filter } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import AppCard from "@/components/apps/app-card"
import { getUserFromStorage } from "@/lib/client-auth"
import BanCheck from "@/components/ban-check"

export default function AppsPage({
  searchParams,
}: {
  searchParams: { search?: string; tag?: string }
}) {
  const [user, setUser] = useState(null)
  const [apps, setApps] = useState([])
  const [popularTags, setPopularTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getUserFromStorage() // Made this async to ensure proper loading
      console.log("Current user loaded in apps page:", currentUser) // Added debugging
      setUser(currentUser)

      const supabase = createClient()

      // Build query for apps using our custom users table
      let query = supabase
        .from("student_apps") // Fixed table name from "apps" to "student_apps"
        .select(`
          *,
          creator:users!student_apps_created_by_fkey(full_name, avatar_url, username, student_id),
          likes:app_likes(count)
        `)
        .order("created_at", { ascending: false })

      // Add search filter if provided
      if (searchParams.search) {
        query = query.or(`title.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`)
      }

      // Add tag filter if provided
      if (searchParams.tag) {
        query = query.contains("tags", [searchParams.tag])
      }

      const { data: appsData } = await query

      // Get user likes if user is logged in
      let userLikes: any[] = []
      if (currentUser) {
        const { data } = await supabase.from("app_likes").select("app_id").eq("user_id", currentUser.id)
        userLikes = data || []
      }

      // Process apps to add like status
      const processedApps = appsData?.map((app) => ({
        ...app,
        likes_count: app.likes?.[0]?.count || 0,
        is_liked: currentUser ? userLikes.some((like) => like.app_id === app.id) : false,
      }))

      // Get popular tags
      const { data: allApps } = await supabase.from("student_apps").select("tags") // Fixed table name
      const allTags = allApps?.flatMap((app) => app.tags || []) || []
      const tagCounts = allTags.reduce((acc: Record<string, number>, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {})
      const popularTagsList = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([tag]) => tag)

      setApps(processedApps || [])
      setPopularTags(popularTagsList)
      setLoading(false)
    }

    loadData()
  }, [searchParams.search, searchParams.tag])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BanCheck>
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        {user && <DashboardHeader user={user} />}

        {!user && (
          <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="font-serif font-bold text-xl text-foreground">
                Campus Connect
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/events" className="text-muted-foreground hover:text-primary">
                  Events
                </Link>
                <Link href="/apps" className="text-primary font-medium">
                  Apps
                </Link>
                <Button asChild variant="outline" size="sm">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </nav>
        )}

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-2">Student Apps</h1>
              <p className="text-muted-foreground text-lg">Discover amazing projects built by your peers</p>
            </div>
            {user &&
              (user.is_banned ? (
                <div className="text-center">
                  <Button disabled className="bg-gray-400 cursor-not-allowed transform-none">
                    <Plus className="mr-2 w-4 h-4" />
                    Publish App
                  </Button>
                  <p className="text-sm text-red-600 mt-1">Cannot publish apps while banned</p>
                </div>
              ) : (
                <Button
                  asChild
                  className="bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
                >
                  <Link href="/apps/create">
                    <Plus className="mr-2 w-4 h-4" />
                    Publish App
                  </Link>
                </Button>
              ))}
          </div>

          {!user && (
            <Card className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <h3 className="font-serif font-bold text-lg mb-2">Share Your Projects</h3>
                <p className="text-muted-foreground mb-4">Sign in to publish your apps and like community projects</p>
                <Button asChild>
                  <Link href="/auth/login">Sign In to Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search apps..."
                    defaultValue={searchParams.search}
                    className="pl-10"
                    name="search"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Popular Tags:</span>
                  </div>
                  {popularTags.map((tag) => (
                    <Link key={tag} href={`/apps?tag=${encodeURIComponent(tag)}`}>
                      <Badge
                        variant={searchParams.tag === tag ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                  {searchParams.tag && (
                    <Link href="/apps">
                      <Badge variant="secondary" className="cursor-pointer">
                        Clear Filter ×
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apps Grid */}
          {apps && apps.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl mb-2">No apps found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchParams.search || searchParams.tag
                    ? "Try adjusting your search terms or browse all apps."
                    : user
                      ? "Be the first to share your amazing project with the community!"
                      : "Sign in to discover and share amazing student projects!"}
                </p>
                {user && !user.is_banned && (
                  <Button asChild>
                    <Link href="/apps/create">
                      <Plus className="mr-2 w-4 h-4" />
                      Publish Your First App
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </BanCheck>
  )
}
