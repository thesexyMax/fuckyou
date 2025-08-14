"use client"

import { useEffect, useState } from "react"
import { notFound, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Code,
  Calendar,
  UserPlus,
  UserMinus,
  ArrowLeft,
  Instagram,
  Github,
  Facebook,
  LinkIcon,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import FollowersModal from "@/components/profile/followers-modal"
import RankDetailsSidebar from "@/components/profile/rank-details-sidebar"

function generateAvatarUrl(name: string) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=f97316&color=fff&size=128`
}

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [profileUser, setProfileUser] = useState(null)
  const [userApps, setUserApps] = useState([])
  const [userEvents, setUserEvents] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [userRank, setUserRank] = useState(null)
  const [userPoints, setUserPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [contributionData, setContributionData] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [monthlyStats, setMonthlyStats] = useState({
    totalPoints: 0,
    quizPoints: 0,
    appPoints: 0,
    eventPoints: 0,
    totalContributions: 0,
    commentPoints: 0,
  })

  // Modal states
  const [followersModalOpen, setFollowersModalOpen] = useState(false)
  const [followingModalOpen, setFollowingModalOpen] = useState(false)
  const [rankSidebarOpen, setRankSidebarOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const user = await getUserFromStorage()
      setCurrentUser(user)

      const supabase = createClient()
      let foundUser = null

      // First try to find by username (exact match)
      const { data: userByUsername, error: usernameError } = await supabase
        .from("users")
        .select("*")
        .eq("username", params.username)
        .single()

      if (!usernameError && userByUsername) {
        foundUser = userByUsername
      }

      // If not found by username, try student_id if the username is numeric
      if (!foundUser && !isNaN(Number(params.username))) {
        const { data: profile, error } = await supabase
          .from("users")
          .select("*")
          .eq("student_id", Number.parseInt(params.username))
          .single()

        if (!error && profile) {
          foundUser = profile
        }
      }

      // If still not found, try to find by full_name (case insensitive)
      if (!foundUser) {
        const { data: profileByName, error } = await supabase
          .from("users")
          .select("*")
          .ilike("full_name", `%${params.username}%`)
          .single()

        if (!error && profileByName) {
          foundUser = profileByName
        }
      }

      if (!foundUser) {
        console.error("User not found:", params.username)
        notFound()
        return
      }

      setProfileUser(foundUser)

      if (!foundUser) return

      const [appsResult, eventsResult, leaderboardResult, commentsResult] = await Promise.all([
        supabase
          .from("student_apps")
          .select("*")
          .eq("created_by", foundUser.id)
          .order("created_at", { ascending: false }),
        supabase.from("events").select("*").eq("created_by", foundUser.id).order("event_date", { ascending: false }),
        supabase
          .from("users")
          .select(`
            id,
            full_name,
            quiz_attempts(score_percentage, total_points),
            student_apps(id),
            events(id)
          `)
          .eq("is_admin", false),
        supabase
          .from("comments")
          .select("created_at, points")
          .eq("user_id", foundUser.id)
          .order("created_at", { ascending: false }),
      ])

      setUserApps(appsResult.data || [])
      setUserEvents(eventsResult.data || [])

      // Calculate user's rank and points
      if (leaderboardResult.data) {
        const usersWithPoints = leaderboardResult.data
          .map((u: any) => {
            const quizPoints = u.quiz_attempts.reduce((sum: number, attempt: any) => {
              const points = (((attempt.total_points || 0) * (attempt.score_percentage || 0)) / 100) * 5
              return sum + points
            }, 0)
            const appPoints = u.student_apps.length * 50
            const eventPoints = u.events.length * 30
            const totalPoints = quizPoints + appPoints + eventPoints

            return {
              id: u.id,
              full_name: u.full_name,
              totalPoints,
            }
          })
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints)

        const userIndex = usersWithPoints.findIndex((u: any) => u.id === foundUser.id)
        if (userIndex !== -1) {
          setUserRank(userIndex + 1)
          setUserPoints(usersWithPoints[userIndex].totalPoints)
        }
      }

      if (foundUser && user) {
        try {
          const { data: followData } = await supabase
            .from("user_follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", foundUser.id)
            .single()

          setIsFollowing(!!followData)

          const [followersResult, followingResult] = await Promise.all([
            supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", foundUser.id),
            supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", foundUser.id),
          ])

          setFollowersCount(followersResult.count || 0)
          setFollowingCount(followingResult.count || 0)
        } catch (error) {
          console.error("Error loading follow data:", error)
          setFollowersCount(0)
          setFollowingCount(0)
        }
      }

      await fetchContributionData(foundUser.id)

      setLoading(false)
    }

    loadData()
  }, [params.username])

  const fetchContributionData = async (userId: string) => {
    const supabase = createClient()
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)

    try {
      const [quizData, appData, eventData, commentData] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select("created_at, score_percentage, total_points")
          .eq("user_id", userId)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()),
        supabase
          .from("student_apps")
          .select("created_at")
          .eq("created_by", userId)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()),
        supabase
          .from("events")
          .select("created_at")
          .eq("created_by", userId)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()),
        supabase
          .from("comments")
          .select("created_at, points")
          .eq("user_id", userId)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()),
      ])

      // Generate contribution calendar data
      const contributions = []
      const daysInMonth = endOfMonth.getDate()

      let totalPoints = 0
      let quizPoints = 0
      let appPoints = 0
      let eventPoints = 0
      let commentPoints = 0
      let totalContributions = 0

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
        const dateStr = currentDate.toISOString().split("T")[0]

        const dayQuizzes =
          quizData.data?.filter((q) => new Date(q.created_at).toISOString().split("T")[0] === dateStr) || []

        const dayApps =
          appData.data?.filter((a) => new Date(a.created_at).toISOString().split("T")[0] === dateStr) || []

        const dayEvents =
          eventData.data?.filter((e) => new Date(e.created_at).toISOString().split("T")[0] === dateStr) || []

        const dayComments =
          commentData.data?.filter((c) => new Date(c.created_at).toISOString().split("T")[0] === dateStr) || []

        const dayQuizPoints = dayQuizzes.reduce((sum, quiz) => {
          return sum + (((quiz.total_points || 0) * (quiz.score_percentage || 0)) / 100) * 5
        }, 0)

        const dayAppPoints = dayApps.length * 50
        const dayEventPoints = dayEvents.length * 30
        const dayCommentPoints = dayComments.reduce((sum, comment) => sum + comment.points, 0)
        const dayTotalPoints = dayQuizPoints + dayAppPoints + dayEventPoints + dayCommentPoints
        const dayContributions = dayQuizzes.length + dayApps.length + dayEvents.length + dayComments.length

        contributions.push({
          date: dateStr,
          points: Math.round(dayTotalPoints),
          contributions: dayContributions,
          quizzes: dayQuizzes.length,
          apps: dayApps.length,
          events: dayEvents.length,
          comments: dayComments.length,
          level:
            dayTotalPoints === 0 ? 0 : dayTotalPoints < 25 ? 1 : dayTotalPoints < 50 ? 2 : dayTotalPoints < 100 ? 3 : 4,
        })

        totalPoints += dayTotalPoints
        quizPoints += dayQuizPoints
        appPoints += dayAppPoints
        eventPoints += dayEventPoints
        commentPoints += dayCommentPoints
        totalContributions += dayContributions
      }

      setContributionData(contributions)
      setMonthlyStats({
        totalPoints: Math.round(totalPoints),
        quizPoints: Math.round(quizPoints),
        appPoints: Math.round(appPoints),
        eventPoints: Math.round(eventPoints),
        commentPoints: Math.round(commentPoints),
        totalContributions,
      })
    } catch (error) {
      console.error("Error fetching contribution data:", error)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(selectedMonth)
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setSelectedMonth(newMonth)
  }

  useEffect(() => {
    if (profileUser) {
      fetchContributionData(profileUser.id)
    }
  }, [selectedMonth, profileUser])

  const getContributionColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-gray-100"
      case 1:
        return "bg-orange-200"
      case 2:
        return "bg-orange-300"
      case 3:
        return "bg-orange-400"
      case 4:
        return "bg-orange-500"
      default:
        return "bg-gray-100"
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser) return

    setFollowLoading(true)
    const supabase = createClient()

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profileUser.id)

        if (!error) {
          setIsFollowing(false)
          setFollowersCount((prev) => prev - 1)
        } else {
          console.error("Error unfollowing:", error)
        }
      } else {
        const { error } = await supabase.from("user_follows").insert({
          follower_id: currentUser.id,
          following_id: profileUser.id,
        })

        if (!error) {
          setIsFollowing(true)
          setFollowersCount((prev) => prev + 1)
        } else {
          console.error("Error following:", error)
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    }

    setFollowLoading(false)
  }

  const handleGoBack = () => {
    router.back()
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { text: "Champion", color: "bg-yellow-500 hover:bg-yellow-600" }
    if (rank <= 3) return { text: "Top 3", color: "bg-orange-500 hover:bg-orange-600" }
    if (rank <= 10) return { text: "Top 10", color: "bg-blue-500 hover:bg-blue-600" }
    return { text: `#${rank}`, color: "bg-gray-500 hover:bg-gray-600" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    notFound()
    return null
  }

  const isOwnProfile = currentUser?.id === profileUser.id
  const rankBadge = userRank ? getRankBadge(userRank) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <Button onClick={handleGoBack} variant="outline" className="flex items-center gap-2 bg-white/80">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card className="mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Profile Picture */}
              <div className="flex justify-center sm:justify-start">
                <Avatar className="w-20 h-20 sm:w-32 sm:h-32">
                  <AvatarImage
                    src={
                      profileUser.avatar_url ||
                      generateAvatarUrl(profileUser.full_name || `Student ${profileUser.student_id}`)
                    }
                  />
                  <AvatarFallback className="text-lg sm:text-2xl bg-primary text-white">
                    {profileUser.full_name?.charAt(0) || profileUser.student_id?.toString().charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 text-center sm:text-left">
                {/* Name and Rank */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {profileUser.full_name || `Student ${profileUser.student_id}`}
                  </h1>
                  {rankBadge && (
                    <Button
                      onClick={() => setRankSidebarOpen(true)}
                      size="sm"
                      className={`${rankBadge.color} text-white text-xs px-2 py-1 h-auto`}
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      {rankBadge.text}
                    </Button>
                  )}
                </div>

                {/* Stats Row - Instagram Style */}
                <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 mb-4">
                  <div className="text-center">
                    <div className="font-bold text-lg">{userApps.length}</div>
                    <div className="text-sm text-gray-600">Apps</div>
                  </div>
                  <button
                    onClick={() => setFollowersModalOpen(true)}
                    className="text-center hover:opacity-70 transition-opacity"
                  >
                    <div className="font-bold text-lg">{followersCount}</div>
                    <div className="text-sm text-gray-600">Followers</div>
                  </button>
                  <button
                    onClick={() => setFollowingModalOpen(true)}
                    className="text-center hover:opacity-70 transition-opacity"
                  >
                    <div className="font-bold text-lg">{followingCount}</div>
                    <div className="text-sm text-gray-600">Following</div>
                  </button>
                </div>

                {/* Bio */}
                {profileUser.bio && (
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{profileUser.bio}</p>
                  </div>
                )}

                {/* User Info */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs sm:text-sm text-gray-600 mb-4">
                  <span>ID: {profileUser.student_id}</span>
                  {profileUser.major && <span>• {profileUser.major}</span>}
                  {profileUser.graduation_year && <span>• Class of {profileUser.graduation_year}</span>}
                </div>

                {/* Social Links */}
                {(profileUser.instagram_url ||
                  profileUser.github_url ||
                  profileUser.facebook_url ||
                  profileUser.other_social_url) && (
                  <div className="flex justify-center sm:justify-start gap-2 mb-4">
                    {profileUser.instagram_url && (
                      <Button asChild variant="outline" size="sm" className="p-2 h-auto bg-transparent">
                        <a href={profileUser.instagram_url} target="_blank" rel="noopener noreferrer">
                          <Instagram className="w-4 h-4 text-pink-500" />
                        </a>
                      </Button>
                    )}
                    {profileUser.github_url && (
                      <Button asChild variant="outline" size="sm" className="p-2 h-auto bg-transparent">
                        <a href={profileUser.github_url} target="_blank" rel="noopener noreferrer">
                          <Github className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {profileUser.facebook_url && (
                      <Button asChild variant="outline" size="sm" className="p-2 h-auto bg-transparent">
                        <a href={profileUser.facebook_url} target="_blank" rel="noopener noreferrer">
                          <Facebook className="w-4 h-4 text-blue-600" />
                        </a>
                      </Button>
                    )}
                    {profileUser.other_social_url && (
                      <Button asChild variant="outline" size="sm" className="p-2 h-auto bg-transparent">
                        <a href={profileUser.other_social_url} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Follow Button */}
                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {isFollowing ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {followLoading ? "Loading..." : isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub-style contribution calendar */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Contribution Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="p-2">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="p-2"
                  disabled={selectedMonth >= new Date()}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Monthly Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-orange-600">{monthlyStats.totalPoints}</div>
                  <div className="text-xs text-gray-600">Total Points</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{monthlyStats.quizPoints}</div>
                  <div className="text-xs text-gray-600">Quiz Points</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{monthlyStats.appPoints}</div>
                  <div className="text-xs text-gray-600">App Points</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{monthlyStats.eventPoints}</div>
                  <div className="text-xs text-gray-600">Event Points</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{monthlyStats.commentPoints || 0}</div>
                  <div className="text-xs text-gray-600">Comment Points</div>
                </div>
              </div>

              {/* Contribution Calendar */}
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-1 min-w-[280px]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs text-gray-500 text-center p-1 font-medium">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before month starts */}
                  {Array.from({
                    length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay(),
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-4 h-4"></div>
                  ))}

                  {/* Contribution squares */}
                  {contributionData.map((day, index) => (
                    <div
                      key={day.date}
                      className={`w-4 h-4 rounded-sm ${getContributionColor(day.level)} border border-gray-200 cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all`}
                      title={`${day.date}: ${day.points} points, ${day.contributions} contributions`}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {monthlyStats.totalContributions} contributions in{" "}
                  {selectedMonth.toLocaleDateString("en-US", { month: "long" })}
                </span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-sm ${getContributionColor(level)} border border-gray-200`}
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="apps" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="apps">Apps ({userApps.length})</TabsTrigger>
              <TabsTrigger value="events">Events ({userEvents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="apps" className="space-y-4">
              {userApps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userApps.map((app) => (
                    <Card key={app.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Code className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{app.title}</h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{app.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {new Date(app.created_at).toLocaleDateString()}
                              </span>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/apps/${app.id}`}>View</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-gray-500">
                    <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No apps published yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              {userEvents.length > 0 ? (
                <div className="space-y-4">
                  {userEvents.map((event) => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 mb-3">
                              <span>{new Date(event.event_date).toLocaleDateString()}</span>
                              <span>{event.location}</span>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/events/${event.id}`}>View Event</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events organized yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={profileUser.id}
        type="followers"
        currentUserId={currentUser?.id}
      />

      <FollowersModal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        userId={profileUser.id}
        type="following"
        currentUserId={currentUser?.id}
      />

      <RankDetailsSidebar
        isOpen={rankSidebarOpen}
        onClose={() => setRankSidebarOpen(false)}
        userStats={{
          rank: userRank || 0,
          totalPoints: Math.round(userPoints),
          quizAttempts: userApps.length, // This should be actual quiz attempts from DB
          appsPublished: userApps.length,
          eventsCreated: userEvents.length,
          fullName: profileUser.full_name || `Student ${profileUser.student_id}`,
        }}
      />
    </div>
  )
}
