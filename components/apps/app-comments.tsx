"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

interface Comment {
  id: string
  comment: string
  created_at: string
  user: {
    id: string
    full_name: string
    username: string
    avatar_url?: string
    major: string
  }
}

interface AppCommentsProps {
  appId: string
  comments: Comment[]
  currentUser: any
}

export default function AppComments({ appId, comments, currentUser }: AppCommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return

    setLoading(true)

    try {
      const { error } = await supabase.from("app_comments").insert([
        {
          app_id: appId,
          user_id: currentUser.id,
          comment: newComment.trim(),
        },
      ])

      if (error) throw error

      setNewComment("")
      router.refresh()
    } catch (error) {
      console.error("Error posting comment:", error)
      alert("Failed to post comment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const { error } = await supabase.from("app_comments").delete().eq("id", commentId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert("Failed to delete comment. Please try again.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment */}
        {currentUser && (
          <div className="space-y-3">
            <Textarea
              placeholder="Share your thoughts about this app..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button onClick={handleSubmitComment} disabled={loading || !newComment.trim()} className="w-full">
              {loading ? (
                "Posting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        )}

        {!currentUser && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Sign in to leave a comment</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.user.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{comment.user.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/u/${comment.user.username}`} className="font-medium text-primary hover:underline">
                      {comment.user.full_name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      @{comment.user.username} • {comment.user.major}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {(currentUser?.id === comment.user.id || currentUser?.is_admin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
