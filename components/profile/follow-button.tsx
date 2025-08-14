"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { followUser, unfollowUser, checkIfFollowing } from "@/lib/follow-actions"
import { UserPlus, UserMinus, Loader2 } from "lucide-react"

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
}

export default function FollowButton({ currentUserId, targetUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkFollow() {
      const following = await checkIfFollowing(currentUserId, targetUserId)
      setIsFollowing(following)
      setLoading(false)
    }
    checkFollow()
  }, [currentUserId, targetUserId])

  const handleFollow = async () => {
    setLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(currentUserId, targetUserId)
        setIsFollowing(false)
      } else {
        await followUser(currentUserId, targetUserId)
        setIsFollowing(true)
      }
    } catch (error) {
      console.error("Follow action failed:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }

  return (
    <Button
      onClick={handleFollow}
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "hover:bg-destructive hover:text-white" : ""}
    >
      {isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  )
}
