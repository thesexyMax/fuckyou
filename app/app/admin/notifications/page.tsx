"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Send, Users, UserIcon, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminNotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [recipient, setRecipient] = useState("")
  const [recentNotifications, setRecentNotifications] = useState<any[]>([])
  const [userSuggestions, setUserSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()
      if (!currentUser || !currentUser.is_admin) {
        window.location.href = "/dashboard"
        return
      }
      setUser(currentUser)
      await fetchRecentNotifications()
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          recipient:users!recipient_id(full_name, username),
          sender:users!sender_id(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentNotifications(data || [])
    } catch (error) {
      console.error("Error fetching recent notifications:", error)
    }
  }

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message", {
        position: "bottom-right",
        duration: 3000,
      })
      return
    }

    setSending(true)
    try {
      if (recipient.toLowerCase() === "@all") {
        // Send to all users
        const { data: users, error: usersError } = await supabase.from("users").select("id").eq("is_banned", false)

        if (usersError) throw usersError

        const notifications = users.map((u) => ({
          title: title.trim(),
          message: message.trim(),
          recipient_id: u.id,
          sender_id: user?.id,
          notification_type: "admin_announcement",
        }))

        const { error: insertError } = await supabase.from("notifications").insert(notifications)

        if (insertError) throw insertError

        toast.success(`Notification sent to ${users.length} users`, {
          position: "bottom-right",
          duration: 3000,
        })
      } else {
        // Send to specific user
        const targetUsername = recipient.startsWith("@") ? recipient.slice(1) : recipient
        const { data: targetUser, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("username", targetUsername.trim())
          .single()

        if (userError || !targetUser) {
          toast.error("User not found", {
            position: "bottom-right",
            duration: 3000,
          })
          return
        }

        const { error: insertError } = await supabase.from("notifications").insert({
          title: title.trim(),
          message: message.trim(),
          recipient_id: targetUser.id,
          sender_id: user?.id,
          notification_type: "admin_direct",
        })

        if (insertError) throw insertError

        toast.success(`Notification sent to @${targetUsername}`, {
          position: "bottom-right",
          duration: 3000,
        })
      }

      // Reset form
      setTitle("")
      setMessage("")
      setRecipient("")
      await fetchRecentNotifications()
    } catch (error) {
      console.error("Error sending notification:", error)
      toast.error("Failed to send notification", {
        position: "bottom-right",
        duration: 3000,
      })
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUserSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const searchTerm = query.startsWith("@") ? query.slice(1) : query
      const { data, error } = await supabase
        .from("users")
        .select("username, full_name, avatar_url")
        .ilike("username", `%${searchTerm}%`)
        .eq("is_banned", false)
        .limit(5)

      if (error) throw error
      setUserSuggestions(data || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error("Error searching users:", error)
    }
  }

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecipient(value)

    if (value === "@all") {
      setShowSuggestions(false)
      return
    }

    searchUsers(value)
  }

  const selectUser = (username: string) => {
    setRecipient(`@${username}`)
    setShowSuggestions(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <Send className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        {/* Improved mobile header with better spacing and responsive design */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="sm" asChild className="hover:bg-orange-100 self-start">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-foreground">Send Notification</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Send announcements to users</p>
            </div>
          </div>
        </div>

        {/* Improved mobile layout with single column on mobile, two columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="order-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5" />
                Send Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipient" className="text-sm font-medium">
                  Recipient
                </Label>
                <div className="relative">
                  <Input
                    id="recipient"
                    placeholder="@username or @all for everyone"
                    value={recipient}
                    onChange={handleRecipientChange}
                    onFocus={() => recipient && recipient !== "@all" && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="mt-1"
                  />

                  {showSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {userSuggestions.map((user) => (
                        <button
                          key={user.username}
                          type="button"
                          onClick={() => selectUser(user.username)}
                          className="w-full px-3 py-2 text-left hover:bg-orange-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                            {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">@{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.full_name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use @all to send to all users, or @username for specific user
                </p>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Notification message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 min-h-[120px] resize-none"
                />
              </div>

              <Button
                onClick={sendNotification}
                disabled={sending || !title.trim() || !message.trim() || !recipient.trim()}
                className="w-full hover:bg-primary/90 h-11"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="order-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Improved mobile scrolling with better height management */}
              <div className="space-y-3 max-h-[400px] lg:max-h-96 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notifications sent yet</p>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 border rounded-lg hover:bg-orange-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {notification.notification_type === "admin_announcement" ? (
                                <Users className="w-3 h-3 mr-1" />
                              ) : (
                                <UserIcon className="w-3 h-3 mr-1" />
                              )}
                              {notification.notification_type === "admin_announcement" ? "All" : "Direct"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{notification.message}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground">
                            <span className="truncate">
                              To:{" "}
                              {notification.notification_type === "admin_announcement"
                                ? "All users"
                                : `@${notification.recipient?.username}`}
                            </span>
                            <span className="shrink-0">{formatDate(notification.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
