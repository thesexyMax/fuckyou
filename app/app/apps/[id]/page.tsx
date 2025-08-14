"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Code, ExternalLink, Github, ArrowLeft, Loader2, Star, MessageCircle, Send, Flag, Trash2 } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import AppLikeButton from "@/components/apps/app-like-button"
import { getUserFromStorage } from "@/lib/client-auth"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AppDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [app, setApp] = useState(null)
  const [moreApps, setMoreApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState([])
  const [userRating, setUserRating] = useState(null)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [overallRating, setOverallRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportCategory, setReportCategory] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getUserFromStorage()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser)

      const { data: appData } = await supabase
        .from("student_apps")
        .select(`
          *,
          creator:users!student_apps_created_by_fkey(full_name, avatar_url, bio, major, student_id),
          likes:app_likes(
            user_id,
            created_at,
            user:users(full_name, avatar_url, student_id)
          )
        `)
        .eq("id", params.id)
        .single()

      if (!appData) {
        router.push("/apps")
        return
      }

      setApp(appData)

      const { data: commentsData } = await supabase
        .from("app_comments")
        .select(`
          *,
          user:users(full_name, avatar_url, student_id)
        `)
        .eq("app_id", params.id)
        .order("created_at", { ascending: false })

      setComments(commentsData || [])

      const { data: userRatingData } = await supabase
        .from("app_ratings")
        .select("rating")
        .eq("app_id", params.id)
        .eq("user_id", currentUser.id)
        .single()

      if (userRatingData) {
        setUserRating(userRatingData.rating)
        setRating(userRatingData.rating)
      }

      const { data: allRatings } = await supabase.from("app_ratings").select("rating").eq("app_id", params.id)

      if (allRatings && allRatings.length > 0) {
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        setOverallRating(avgRating)
        setTotalRatings(allRatings.length)
      }

      const { data: creatorApps } = await supabase
        .from("student_apps")
        .select("id, title, image_url, tags")
        .eq("created_by", appData.created_by)
        .neq("id", params.id)
        .limit(3)

      setMoreApps(creatorApps || [])
      setLoading(false)
    }

    loadData()
  }, [params.id, router])

  const generateAvatarUrl = (name: string) => {
    if (!name) return ""
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=128`
  }

  const handleRatingSubmit = async () => {
    if (!rating || !user) return

    setRatingSubmitting(true)

    try {
      const { error } = await supabase.from("app_ratings").upsert({
        app_id: app.id,
        user_id: user.id,
        rating: rating,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error submitting rating:", error)
        toast({
          title: "Error submitting rating",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setUserRating(rating)

      const { data: allRatings } = await supabase.from("app_ratings").select("rating").eq("app_id", app.id)

      if (allRatings && allRatings.length > 0) {
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        setOverallRating(avgRating)
        setTotalRatings(allRatings.length)
      }

      toast({
        title: "Rating submitted successfully!",
        description: `You rated this app ${rating}/5 stars.`,
      })
    } catch (error) {
      console.error("Error submitting rating:", error)
      toast({
        title: "Error submitting rating",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRatingSubmitting(false)
    }
  }

  const handleCommentSubmit = async () => {
    if (!comment.trim() || !user) return

    if (user.is_banned) {
      toast({
        title: "Cannot post comment",
        description: "You cannot post comments while your account is banned.",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("app_comments")
        .insert({
          app_id: app.id,
          user_id: user.id,
          content: comment.trim(),
        })
        .select(`
          *,
          user:users(full_name, avatar_url, student_id)
        `)
        .single()

      if (error) {
        console.error("Error posting comment:", error)
        toast({
          title: "Error posting comment",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data) {
        setComments([data, ...comments])
        setComment("")
        toast({
          title: "Comment posted successfully!",
          description: "Your comment has been added to the discussion.",
        })
      }
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error posting comment",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReportApp = async () => {
    if (!user || !reportReason.trim() || !reportCategory) return

    setReportSubmitting(true)

    try {
      const { error } = await supabase.from("app_reports").insert({
        app_id: app.id,
        reported_by: user.id,
        reason: reportReason.trim(),
        category: reportCategory,
        status: "pending",
      })

      if (error) {
        console.error("Error submitting report:", error)
        toast({
          title: "Error submitting report",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setReportOpen(false)
      setReportReason("")
      setReportCategory("")
      toast({
        title: "App reported successfully",
        description: "Thank you for helping keep our community safe.",
      })
    } catch (error) {
      console.error("Error submitting report:", error)
      toast({
        title: "Error submitting report",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleDeleteApp = async () => {
    if (!user?.is_admin) return

    if (confirm("Are you sure you want to delete this app? This action cannot be undone.")) {
      const { error } = await supabase.from("student_apps").delete().eq("id", app.id)

      if (!error) {
        toast({
          title: "App deleted successfully",
          description: "The app has been removed from the platform.",
        })
        router.push("/apps")
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user || !app) return null

  const isLiked = app.likes?.some((like: any) => like.user_id === user.id) || false
  const likesCount = app.likes?.length || 0
  const isCreator = app.created_by === user.id

  const creatorInitials = app.creator?.full_name
    ? app.creator.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/apps">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Apps
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* App Header */}
            <Card>
              <CardContent className="p-8">
                {app.image_url && (
                  <img
                    src={app.image_url || "/placeholder.svg"}
                    alt={app.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                <div className="flex items-start justify-between mb-4">
                  <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">{app.title}</h1>
                  <div className="flex items-center gap-2">
                    <AppLikeButton appId={app.id} isLiked={isLiked} likesCount={likesCount} />
                    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 bg-transparent"
                        >
                          <Flag className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Report App</DialogTitle>
                          <DialogDescription>
                            Help us keep the community safe by reporting inappropriate content.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select value={reportCategory} onValueChange={setReportCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spam">Spam</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="copyright">Copyright Violation</SelectItem>
                                <SelectItem value="harassment">Harassment</SelectItem>
                                <SelectItem value="fake">Fake Content</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                              id="reason"
                              placeholder="Please provide details about why you're reporting this app..."
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleReportApp}
                            disabled={!reportReason.trim() || !reportCategory || reportSubmitting}
                          >
                            {reportSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Submit Report
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {user?.is_admin && (
                      <Button
                        onClick={handleDeleteApp}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {app.tags?.map((tag) => (
                    <Link key={tag} href={`/apps?tag=${encodeURIComponent(tag)}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10 transition-colors">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>

                {app.description && (
                  <div className="prose prose-gray max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap text-lg">{app.description}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mt-8">
                  {app.live_url && (
                    <Button asChild className="bg-primary hover:bg-accent">
                      <Link href={app.live_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 w-4 h-4" />
                        View Live Demo
                      </Link>
                    </Button>
                  )}
                  {app.github_url && (
                    <Button asChild variant="outline">
                      <Link href={app.github_url} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 w-4 h-4" />
                        View Source Code
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ratings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Rate this App
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalRatings > 0 && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(overallRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-lg">{overallRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({totalRatings} rating{totalRatings !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Overall rating from all users</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      disabled={ratingSubmitting}
                      className={`w-8 h-8 ${
                        star <= rating ? "text-yellow-400" : "text-gray-300"
                      } hover:text-yellow-400 transition-colors disabled:opacity-50`}
                    >
                      <Star className="w-full h-full fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {userRating ? `You rated: ${userRating}/5` : "Click to rate"}
                  </span>
                </div>
                {rating > 0 && rating !== userRating && (
                  <Button onClick={handleRatingSubmit} size="sm" disabled={ratingSubmitting}>
                    {ratingSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {userRating ? "Update Rating" : "Submit Rating"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Community Discussion ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Comment Input */}
                {!user.is_banned ? (
                  <div className="flex gap-3 mb-6">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar_url || generateAvatarUrl(user?.full_name)} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Share your thoughts about this app..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Button onClick={handleCommentSubmit} disabled={!comment.trim()} size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      You cannot post comments while your account is banned.
                    </p>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.user?.avatar_url || generateAvatarUrl(comment.user?.full_name)} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {comment.user?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.user?.full_name || "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">{comment.user?.student_id}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* More Apps from Creator */}
            {moreApps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">More from {app.creator?.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {moreApps.map((moreApp: any) => (
                      <Link key={moreApp.id} href={`/apps/${moreApp.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            {moreApp.image_url && (
                              <img
                                src={moreApp.image_url || "/placeholder.svg"}
                                alt={moreApp.title}
                                className="w-full h-32 object-cover rounded mb-3"
                              />
                            )}
                            <h3 className="font-medium text-foreground mb-2">{moreApp.title}</h3>
                            <div className="flex flex-wrap gap-1">
                              {moreApp.tags?.slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* App Creator */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Created by</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={app.creator?.avatar_url || generateAvatarUrl(app.creator?.full_name)} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{creatorInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{app.creator?.full_name || "Anonymous"}</p>
                    {app.creator?.major && <p className="text-sm text-muted-foreground">{app.creator.major}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">App Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Published</span>
                  <span className="text-sm text-foreground">
                    {/* Use custom date formatting */}
                    {formatDate(app.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Likes</span>
                  <span className="text-sm text-foreground">{likesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <span className="text-sm text-foreground">
                    {totalRatings > 0 ? `${overallRating.toFixed(1)}/5 (${totalRatings})` : "No ratings"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <span className="text-sm text-foreground">{app.tags?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.live_url && (
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href={app.live_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 w-4 h-4" />
                      Try Live Demo
                    </Link>
                  </Button>
                )}
                {app.github_url && (
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href={app.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 w-4 h-4" />
                      View on GitHub
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/apps">
                    <Code className="mr-2 w-4 h-4" />
                    Browse More Apps
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
