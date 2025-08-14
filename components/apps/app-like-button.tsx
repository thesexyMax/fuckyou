"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"

interface AppLikeButtonProps {
  appId: string
  isLiked: boolean
  likesCount: number
}

export default function AppLikeButton({ appId, isLiked, likesCount }: AppLikeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [currentLikeStatus, setCurrentLikeStatus] = useState(isLiked)
  const [currentLikesCount, setCurrentLikesCount] = useState(likesCount)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUserAndLikeStatus = async () => {
      const currentUser = await getUserFromStorage()
      if (currentUser) {
        setUser(currentUser)

        const { data: existingLike } = await supabase
          .from("app_likes")
          .select("id")
          .eq("app_id", appId)
          .eq("user_id", currentUser.id)
          .single()

        setCurrentLikeStatus(!!existingLike)

        // Also get current like count
        const { data: likesData } = await supabase.from("app_likes").select("id").eq("app_id", appId)

        setCurrentLikesCount(likesData?.length || 0)
      }
    }

    checkUserAndLikeStatus()
  }, [appId, supabase])

  const handleLike = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    setLoading(true)

    try {
      if (currentLikeStatus) {
        // Unlike
        const { error } = await supabase.from("app_likes").delete().eq("app_id", appId).eq("user_id", user.id)

        if (error) {
          console.error("Error unliking:", error)
        } else {
          setCurrentLikeStatus(false)
          setCurrentLikesCount((prev) => Math.max(0, prev - 1))
        }
      } else {
        const { data: existingLike } = await supabase
          .from("app_likes")
          .select("id")
          .eq("app_id", appId)
          .eq("user_id", user.id)
          .single()

        if (existingLike) {
          // Already liked, just update UI
          setCurrentLikeStatus(true)
          return
        }

        // Like
        const { error } = await supabase.from("app_likes").insert([
          {
            app_id: appId,
            user_id: user.id,
          },
        ])

        if (error) {
          console.error("Error liking:", error)
          if (error.code === "23505") {
            // Duplicate key error - already liked
            setCurrentLikeStatus(true)
          }
        } else {
          setCurrentLikeStatus(true)
          setCurrentLikesCount((prev) => prev + 1)
        }
      }
    } catch (error) {
      console.error("Like error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLike}
      disabled={loading}
      variant={currentLikeStatus ? "default" : "outline"}
      size="sm"
      className={`${
        currentLikeStatus
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      } transition-all duration-200`}
    >
      <Heart className={`mr-2 h-4 w-4 ${currentLikeStatus ? "fill-current" : ""}`} />
      {currentLikesCount}
    </Button>
  )
}
