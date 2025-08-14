"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Bell, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { User } from "@/lib/client-auth"

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

interface NotificationDropdownProps {
  user: User
}

export default function NotificationDropdown({ user }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => {
          fetchNotifications()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          sender:users!sender_id(full_name, username, avatar_url, is_admin)
        `)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user.id)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all notifications as read")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative hover:bg-orange-100">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs ${
                unreadCount > 0 ? "animate-pulse" : ""
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs hover:bg-orange-100">
              Mark all read
            </Button>
          )}
        </div>

        <div className="h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-0 focus:bg-transparent"
                onSelect={(e) => e.preventDefault()}
              >
                <div className="w-full p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {notification.sender?.avatar_url ? (
                          <img
                            src={notification.sender.avatar_url || "/placeholder.svg"}
                            alt="Admin"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-primary">
                            {notification.sender?.full_name?.charAt(0) || "A"}
                          </span>
                        )}
                      </div>
                      {notification.sender?.is_admin && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">A</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`rounded-2xl px-3 py-2 max-w-[280px] ${
                          notification.sender?.is_admin ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={`font-medium text-xs ${
                              notification.sender?.is_admin ? "text-blue-100" : "text-gray-600"
                            }`}
                          >
                            {notification.sender?.full_name || "Admin"}
                          </p>
                          {notification.notification_type === "admin_announcement" && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                notification.sender?.is_admin
                                  ? "bg-blue-400 text-blue-100"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              @all
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm font-medium mb-1 ${
                            notification.sender?.is_admin ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p
                          className={`text-xs leading-relaxed ${
                            notification.sender?.is_admin ? "text-blue-100" : "text-gray-600"
                          }`}
                        >
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">{formatDate(notification.created_at)}</p>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0 hover:bg-blue-100 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                          >
                            <Check className="w-3 h-3 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="w-full text-center py-2 hover:bg-orange-50 flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
