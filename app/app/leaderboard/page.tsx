"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Crown, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface LeaderboardUser {
  id: string
  full_name: string
  student_id: string
  username: string
  avatar_url?: string
  total_points: number
  quiz_attempts: number
  apps_published: number
  events_created: number
  rank: number
}

function generateAvatarUrl(name: string) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=f97316&color=fff&size=128`
}

export default function LeaderboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardUser[]>([])
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [currentWeekRange, setCurrentWeekRange] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"all" | "week" | "friends">("all")

  const getCurrentWeekRange = () => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Calculate start of current week (Sunday)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - currentDay)
    startOfWeek.setHours(0, 0, 0, 0)

    // Calculate end of current week (next Sunday)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      })
    }

    return {
      start: startOfWeek,
      end: endOfWeek,
      display: `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`,
    }
  }

  useEffect(() => {
    checkAuth()
    const weekRange = getCurrentWeekRange()
    setCurrentWeekRange(weekRange.display)
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()
      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }
      setUser(currentUser)
      await fetchLeaderboard(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboard = async (currentUserId: string) => {
    try {
      console.log("🔍 Starting leaderboard fetch for user:", currentUserId)
      const supabase = createClient()

      const weekRange = getCurrentWeekRange()

      const { data: leaderboardData, error } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          student_id,
          username,
          avatar_url,
          is_admin,
          quiz_attempts(score_percentage, total_points, created_at),
          student_apps(id, created_at),
          events(id, created_at)
        `)
        .eq("is_admin", false)
        .eq("is_banned", false)

      if (error) {
        console.error("❌ Database error:", error)
        throw error
      }

      if (!leaderboardData) {
        console.log("⚠️ No leaderboard data returned")
        return
      }

      const { data: followData, error: followError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)

      if (followError) {
        console.error("❌ Follow data error:", followError)
      }

      const friendIds = followData?.map((f) => f.following_id) || []

      const processUsers = (userList: any[], weeklyFilter = false) => {
        return userList.map((user: any) => {
          const quizAttempts = user.quiz_attempts || []
          const studentApps = user.student_apps || []
          const events = user.events || []

          let filteredQuizAttempts = quizAttempts
          let filteredApps = studentApps
          let filteredEvents = events

          if (weeklyFilter) {
            filteredQuizAttempts = quizAttempts.filter((attempt: any) => {
              if (!attempt.created_at) return false
              const attemptDate = new Date(attempt.created_at)
              return attemptDate >= weekRange.start && attemptDate <= weekRange.end
            })

            filteredApps = studentApps.filter((app: any) => {
              if (!app.created_at) return false
              const appDate = new Date(app.created_at)
              return appDate >= weekRange.start && appDate <= weekRange.end
            })

            filteredEvents = events.filter((event: any) => {
              if (!event.created_at) return false
              const eventDate = new Date(event.created_at)
              return eventDate >= weekRange.start && eventDate <= weekRange.end
            })
          }

          const quizPoints = filteredQuizAttempts.reduce((sum: number, attempt: any) => {
            const points = (((attempt.total_points || 0) * (attempt.score_percentage || 0)) / 100) * 5
            return sum + points
          }, 0)
          const appPoints = filteredApps.length * 50
          const eventPoints = filteredEvents.length * 30
          const totalPoints = quizPoints + appPoints + eventPoints

          return {
            id: user.id,
            full_name: user.full_name,
            student_id: user.student_id,
            username: user.username,
            avatar_url: user.avatar_url,
            total_points: Math.round(totalPoints),
            quiz_attempts: filteredQuizAttempts.length,
            apps_published: filteredApps.length,
            events_created: filteredEvents.length,
            rank: 0,
          }
        })
      }

      const allUsersData = processUsers(leaderboardData)
      allUsersData.sort((a, b) => b.total_points - a.total_points)
      allUsersData.forEach((user, index) => {
        user.rank = index + 1
      })

      const weeklyUsersData = processUsers(leaderboardData, true)
      weeklyUsersData.sort((a, b) => b.total_points - a.total_points)
      weeklyUsersData.forEach((user, index) => {
        user.rank = index + 1
      })

      const friendsData = processUsers(leaderboardData.filter((u) => friendIds.includes(u.id)))
      friendsData.sort((a, b) => b.total_points - a.total_points)
      friendsData.forEach((user, index) => {
        user.rank = index + 1
      })

      setLeaderboard(allUsersData)
      setWeeklyLeaderboard(weeklyUsersData)
      setFriendsLeaderboard(friendsData)

      const currentUserData = await supabase.from("users").select("is_admin").eq("id", currentUserId).single()

      if (!currentUserData.data?.is_admin) {
        const userRank = allUsersData.find((u) => u.id === currentUserId)?.rank
        setCurrentUserRank(userRank || null)
      } else {
        setCurrentUserRank(null) // Admin should not have a rank displayed
      }
    } catch (error) {
      console.error("💥 Error fetching leaderboard:", error)
    }
  }

  const getCurrentLeaderboard = () => {
    switch (activeTab) {
      case "friends":
        return friendsLeaderboard
      case "week":
        return weeklyLeaderboard.slice(0, 20) // Top 20 for weekly
      default:
        return leaderboard.slice(0, 50) // Top 50 for all members
    }
  }

  const shouldShowCurrentUserAtBottom = () => {
    return activeTab === "all" && currentUserRank && currentUserRank > 50 && user && !user.is_admin
  }

  const getCurrentUserData = () => {
    if (!user || !currentUserRank) return null
    return leaderboard.find((u) => u.id === user.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-bold text-xl">Leader board</h1>
                {activeTab === "week" && <p className="text-sm text-gray-500">{currentWeekRange}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className="flex-1"
          >
            All Members
          </Button>
          <Button
            variant={activeTab === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("week")}
            className="flex-1"
          >
            This week
          </Button>
          <Button
            variant={activeTab === "friends" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("friends")}
            className="flex-1"
          >
            All Friends
          </Button>
        </div>

        {/* Top 3 Podium - only show if 3 or more users */}
        {getCurrentLeaderboard().slice(0, 3).length >= 3 && (
          <div className="mb-8">
            <div className="flex items-end justify-center gap-4 mb-6">
              {/* Second Place */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-gray-300">
                    <AvatarImage
                      src={
                        getCurrentLeaderboard()[1]?.avatar_url ||
                        generateAvatarUrl(getCurrentLeaderboard()[1]?.full_name) ||
                        "/placeholder.svg"
                      }
                    />
                    <AvatarFallback className="bg-gray-400 text-white">
                      {getCurrentLeaderboard()[1]?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="font-semibold text-sm">{getCurrentLeaderboard()[1]?.full_name}</p>
                  <p className="text-xs text-gray-500">{getCurrentLeaderboard()[1]?.total_points} pts</p>
                </div>
              </div>

              {/* First Place */}
              <div className="flex flex-col items-center -mt-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-yellow-400">
                    <AvatarImage
                      src={
                        getCurrentLeaderboard()[0]?.avatar_url ||
                        generateAvatarUrl(getCurrentLeaderboard()[0]?.full_name) ||
                        "/placeholder.svg"
                      }
                    />
                    <AvatarFallback className="bg-yellow-500 text-white">
                      {getCurrentLeaderboard()[0]?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-3 -right-1">
                    <Crown className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="font-bold text-base">{getCurrentLeaderboard()[0]?.full_name}</p>
                  <p className="text-sm text-gray-600">{getCurrentLeaderboard()[0]?.total_points} pts</p>
                </div>
              </div>

              {/* Third Place */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-orange-300">
                    <AvatarImage
                      src={
                        getCurrentLeaderboard()[2]?.avatar_url ||
                        generateAvatarUrl(getCurrentLeaderboard()[2]?.full_name) ||
                        "/placeholder.svg"
                      }
                    />
                    <AvatarFallback className="bg-orange-500 text-white">
                      {getCurrentLeaderboard()[2]?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="font-semibold text-sm">{getCurrentLeaderboard()[2]?.full_name}</p>
                  <p className="text-xs text-gray-500">{getCurrentLeaderboard()[2]?.total_points} pts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {getCurrentLeaderboard().slice(3).length > 0 && (
          <div className="space-y-3 mb-6">
            {getCurrentLeaderboard()
              .slice(3)
              .map((leaderUser) => (
                <Card key={leaderUser.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">#{leaderUser.rank}</span>
                        </div>
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={leaderUser.avatar_url || generateAvatarUrl(leaderUser.full_name)} />
                          <AvatarFallback className="bg-primary text-white">
                            {leaderUser.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/u/${leaderUser.username}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {leaderUser.full_name}
                          </Link>
                          {leaderUser.rank === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-gray-500">@{leaderUser.username}</p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-lg">{leaderUser.total_points} pts</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Remaining Users List (4th place and below) */}
        <div className="space-y-3">
          {getCurrentLeaderboard()
            .slice(3)
            .map((leaderUser) => (
              <Card key={leaderUser.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={leaderUser.avatar_url || generateAvatarUrl(leaderUser.full_name)} />
                      <AvatarFallback className="bg-primary text-white">
                        {leaderUser.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/u/${leaderUser.username}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {leaderUser.full_name}
                        </Link>
                      </div>
                      <p className="text-sm text-gray-500">@{leaderUser.username}</p>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-lg">Rs. {leaderUser.total_points}.00</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {shouldShowCurrentUserAtBottom() && getCurrentUserData() && (
          <div className="mt-6 sticky bottom-4">
            <Card className="ring-2 ring-primary bg-primary/5 shadow-lg">
              <CardContent className="p-4">
                <div className="text-center mb-2">
                  <Badge variant="outline" className="text-xs">
                    Your Rank
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getCurrentUserData()?.avatar_url || generateAvatarUrl(user.full_name)} />
                    <AvatarFallback className="bg-primary text-white">{user.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-primary">{user.full_name}</div>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">#{currentUserRank}</div>
                    <div className="text-sm text-gray-600">{getCurrentUserData()?.total_points} pts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {getCurrentLeaderboard().length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {activeTab === "friends" ? "friends" : "users"} found</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
