"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, UserPlus, UserMinus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  type: "followers" | "following"
  currentUserId?: string
}

interface UserProfile {
  id: string
  full_name: string
  student_id: string
  avatar_url?: string
  bio?: string
}

function generateAvatarUrl(name: string) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=f97316&color=fff&size=128`
}

export default function FollowersModal({ isOpen, onClose, userId, type, currentUserId }: FollowersModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({})
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen, userId, type])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      let query
      if (type === "followers") {
        // Get users who follow this user
        query = supabase
          .from("user_follows")
          .select(`
            follower_id,
            users!user_follows_follower_id_fkey(
              id,
              full_name,
              student_id,
              avatar_url,
              bio
            )
          `)
          .eq("following_id", userId)
      } else {
        // Get users this user follows
        query = supabase
          .from("user_follows")
          .select(`
            following_id,
            users!user_follows_following_id_fkey(
              id,
              full_name,
              student_id,
              avatar_url,
              bio
            )
          `)
          .eq("follower_id", userId)
      }

      const { data, error } = await query

      if (error) throw error

      const userProfiles =
        data?.map((item: any) => {
          const user = type === "followers" ? item.users : item.users
          return {
            id: user.id,
            full_name: user.full_name,
            student_id: user.student_id,
            avatar_url: user.avatar_url,
            bio: user.bio,
          }
        }) || []

      setUsers(userProfiles)

      // If current user is logged in, check which users they follow
      if (currentUserId) {
        const userIds = userProfiles.map((u: UserProfile) => u.id)
        const { data: followData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", currentUserId)
          .in("following_id", userIds)

        const followingMap: Record<string, boolean> = {}
        userProfiles.forEach((user: UserProfile) => {
          followingMap[user.id] = followData?.some((f: any) => f.following_id === user.id) || false
        })
        setFollowingStatus(followingMap)
      }
    } catch (error) {
      console.error(`Failed to load ${type}:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return

    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }))

    try {
      const supabase = createClient()
      const isCurrentlyFollowing = followingStatus[targetUserId]

      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId)

        if (!error) {
          setFollowingStatus((prev) => ({ ...prev, [targetUserId]: false }))
        }
      } else {
        // Follow
        const { error } = await supabase.from("user_follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        })

        if (!error) {
          setFollowingStatus((prev) => ({ ...prev, [targetUserId]: true }))
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {type === "followers" ? "Followers" : "Following"}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {type === "followers" ? "followers" : "following"} yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Link href={`/u/${user.student_id}`} onClick={onClose} className="flex items-center gap-3 flex-1">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={user.avatar_url || generateAvatarUrl(user.full_name || `Student ${user.student_id}`)}
                      />
                      <AvatarFallback className="bg-primary text-white">
                        {user.full_name?.charAt(0) || user.student_id?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.full_name || `Student ${user.student_id}`}</p>
                      <p className="text-xs text-muted-foreground">ID: {user.student_id}</p>
                      {user.bio && <p className="text-xs text-muted-foreground truncate mt-1">{user.bio}</p>}
                    </div>
                  </Link>

                  {/* Follow/Unfollow Button */}
                  {currentUserId && user.id !== currentUserId && (
                    <Button
                      onClick={() => handleFollowToggle(user.id)}
                      disabled={followLoading[user.id]}
                      variant={followingStatus[user.id] ? "outline" : "default"}
                      size="sm"
                      className="flex items-center gap-1 text-xs px-3 py-1 h-auto"
                    >
                      {followLoading[user.id] ? (
                        "..."
                      ) : followingStatus[user.id] ? (
                        <>
                          <UserMinus className="w-3 h-3" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
