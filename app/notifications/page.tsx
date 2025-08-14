"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Notification {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  notification_type: string
  sender: {
    full_name: string
    username: string
    avatar_url: string
    is_admin: boolean
  }
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
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
      await fetchNotifications(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          sender:users!sender_id(full_name, username, avatar_url, is_admin)
        `)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user?.id)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
      toast.success("Notification marked as read", {
        position: "bottom-right",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read", {
        position: "bottom-right",
        duration: 3000,
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("recipient_id", user?.id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success("All notifications marked as read", {
        position: "bottom-right",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all notifications as read", {
        position: "bottom-right",
        duration: 3000,
      })
    }
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const groupNotificationsByTime = (notifications: Notification[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const groups: { [key: string]: Notification[] } = {
      New: [],
      Today: [],
      Yesterday: [],
      Earlier: [],
    }

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.created_at)
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())

      if (!notification.is_read && now.getTime() - notifDate.getTime() < 60 * 60 * 1000) {
        groups.New.push(notification)
      } else if (notifDay.getTime() === today.getTime()) {
        groups.Today.push(notification)
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notification)
      } else {
        groups.Earlier.push(notification)
      }
    })

    return groups
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading notifications...</p>
        </div>
      </div>
    )
  }

  const groupedNotifications = groupNotificationsByTime(notifications)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="p-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="font-semibold text-lg">Notifications</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-2">
        {unreadCount > 0 && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-blue-600 hover:bg-blue-50 text-sm"
            >
              Mark all as read
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500 text-sm">When you receive notifications, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => {
              if (groupNotifications.length === 0) return null

              return (
                <div key={groupName}>
                  <h2 className="text-sm font-medium text-gray-500 mb-3 px-2">{groupName}</h2>
                  <div className="space-y-3">
                    {groupNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          !notification.is_read
                            ? "border-blue-200 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                              {notification.sender?.avatar_url ? (
                                <img
                                  src={notification.sender.avatar_url || "/placeholder.svg"}
                                  alt={notification.sender.full_name || "Admin"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {notification.sender?.full_name?.charAt(0) || "A"}
                                  </span>
                                </div>
                              )}
                            </div>
                            {notification.sender?.is_admin && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">A</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm">{notification.title}</h3>
                                {notification.notification_type === "admin_announcement" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-200"
                                  >
                                    @all
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {getRelativeTime(notification.created_at)}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed mb-3">{notification.message}</p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  From: {notification.sender?.full_name || "Admin"}
                                </span>
                                {!notification.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                              </div>

                              {!notification.is_read && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs px-3 py-1 h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
