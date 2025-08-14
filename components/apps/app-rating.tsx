"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Loader2 } from "lucide-react"

interface AppRatingProps {
  appId: string
  currentRating: number
  totalRatings: number
  userId?: string
}

export default function AppRating({ appId, currentRating, totalRatings, userId }: AppRatingProps) {
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [displayRating, setDisplayRating] = useState(currentRating)
  const [displayTotal, setDisplayTotal] = useState(totalRatings)
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      fetchUserRating()
    }
  }, [userId])

  const fetchUserRating = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from("app_ratings")
        .select("rating")
        .eq("app_id", appId)
        .eq("user_id", userId)
        .single()

      if (data && !error) {
        setUserRating(data.rating)
      }
    } catch (error) {
      // User hasn't rated yet
      console.log("No existing rating found")
    }
  }

  const handleRating = async (rating: number) => {
    if (!userId) {
      alert("Please sign in to rate this app")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from("app_ratings").upsert({
        app_id: appId,
        user_id: userId,
        rating,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setUserRating(rating)
      await refreshAppRatings()
    } catch (error) {
      console.error("Error rating app:", error)
      alert("Failed to submit rating. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const refreshAppRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("student_apps")
        .select("average_rating, total_ratings")
        .eq("id", appId)
        .single()

      if (data && !error) {
        setDisplayRating(data.average_rating || 0)
        setDisplayTotal(data.total_ratings || 0)
      }
    } catch (error) {
      console.error("Error refreshing ratings:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 fill-current text-yellow-500" />
          Rate This App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground">{displayRating > 0 ? displayRating.toFixed(1) : "—"}</div>
          <div className="flex justify-center items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(displayRating) ? "fill-current text-yellow-500" : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {displayTotal} {displayTotal === 1 ? "rating" : "ratings"}
          </div>
        </div>

        {userId && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2 text-center">Your Rating</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="p-1 hover:scale-110 transition-transform disabled:opacity-50"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRating(star)}
                    disabled={loading}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || userRating) ? "fill-current text-yellow-500" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {userRating > 0 && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  You rated this app {userRating} star{userRating !== 1 ? "s" : ""}
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center mt-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Updating rating...</span>
                </div>
              )}
            </div>
          </>
        )}

        {!userId && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Sign in to rate this app</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
