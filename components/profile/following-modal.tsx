"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import Link from "next/link"

interface FollowingModalProps {
  userId: string
  count: number
}

export default function FollowingModal({ userId, count }: FollowingModalProps) {
  const [open, setOpen] = useState(false)
  const [following, setFollowing] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadFollowing = async () => {
    if (following.length > 0) return // Already loaded

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}/following`)
      const data = await response.json()
      setFollowing(data.following || [])
    } catch (error) {
      console.error("Failed to load following:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto" onClick={loadFollowing}>
          <span className="font-semibold">{count}</span>
          <span className="text-gray-600 ml-1">following</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Following ({count})
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : following.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Not following anyone yet</div>
          ) : (
            <div className="space-y-3">
              {following.map((user) => (
                <Link
                  key={user.id}
                  href={`/u/${user.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>{user.full_name?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
