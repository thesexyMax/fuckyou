"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import ProfileForm from "@/components/profile/profile-form"
import { getUserFromStorage } from "@/lib/client-auth"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

interface ContributionData {
  date: string
  count: number
  type: "quiz" | "app" | "event" | "comment"
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contributions, setContributions] = useState<ContributionData[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyStats, setMonthlyStats] = useState({
    totalPoints: 0,
    quizPoints: 0,
    appPoints: 0,
    eventPoints: 0,
    commentPoints: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await getUserFromStorage()

        if (!currentUser) {
          router.push("/auth/login")
          return
        }

        console.log("Profile page loaded user:", currentUser)
        setUser(currentUser)
        await fetchContributions(currentUser.id, selectedMonth, selectedYear)
      } catch (error) {
        console.error("Error loading user data:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router, selectedMonth, selectedYear])

  const fetchContributions = async (userId: string, month: number, year: number) => {
    try {
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      const [quizData, appData, eventData, commentData] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select("created_at, points_earned")
          .eq("user_id", userId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("student_apps")
          .select("created_at")
          .eq("created_by", userId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("events")
          .select("created_at")
          .eq("created_by", userId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("app_comments")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
      ])

      const contributionMap = new Map<string, ContributionData>()

      // Process quiz attempts (5 points each)
      quizData.data?.forEach((quiz) => {
        const date = new Date(quiz.created_at).toDateString()
        const existing = contributionMap.get(date) || { date, count: 0, type: "quiz" as const }
        existing.count += quiz.points_earned || 5
        contributionMap.set(date, existing)
      })

      // Process app publications (10 points each)
      appData.data?.forEach((app) => {
        const date = new Date(app.created_at).toDateString()
        const existing = contributionMap.get(date) || { date, count: 0, type: "app" as const }
        existing.count += 10
        contributionMap.set(date, existing)
      })

      // Process event creations (15 points each)
      eventData.data?.forEach((event) => {
        const date = new Date(event.created_at).toDateString()
        const existing = contributionMap.get(date) || { date, count: 0, type: "event" as const }
        existing.count += 15
        contributionMap.set(date, existing)
      })

      // Process comments (2 points each)
      commentData.data?.forEach((comment) => {
        const date = new Date(comment.created_at).toDateString()
        const existing = contributionMap.get(date) || { date, count: 0, type: "comment" as const }
        existing.count += 2
        contributionMap.set(date, existing)
      })

      setContributions(Array.from(contributionMap.values()))

      const stats = {
        totalPoints: 0,
        quizPoints: quizData.data?.reduce((sum, q) => sum + (q.points_earned || 5), 0) || 0,
        appPoints: (appData.data?.length || 0) * 10,
        eventPoints: (eventData.data?.length || 0) * 15,
        commentPoints: (commentData.data?.length || 0) * 2,
      }
      stats.totalPoints = stats.quizPoints + stats.appPoints + stats.eventPoints + stats.commentPoints
      setMonthlyStats(stats)
    } catch (error) {
      console.error("Error fetching contributions:", error)
    }
  }

  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1)
    const days = []
    const firstDay = date.getDay()

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add all days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getContributionLevel = (count: number) => {
    if (count === 0) return "bg-gray-100"
    if (count <= 5) return "bg-green-200"
    if (count <= 10) return "bg-green-300"
    if (count <= 20) return "bg-green-400"
    return "bg-green-500"
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your account information and preferences.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-2xl flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Contribution Activity
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11)
                      setSelectedYear(selectedYear - 1)
                    } else {
                      setSelectedMonth(selectedMonth - 1)
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Select
                  value={`${selectedYear}-${selectedMonth}`}
                  onValueChange={(value) => {
                    const [year, month] = value.split("-")
                    setSelectedYear(Number.parseInt(year))
                    setSelectedMonth(Number.parseInt(month))
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const date = new Date()
                      date.setMonth(date.getMonth() - i)
                      const year = date.getFullYear()
                      const month = date.getMonth()
                      return (
                        <SelectItem key={`${year}-${month}`} value={`${year}-${month}`}>
                          {monthNames[month]} {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0)
                      setSelectedYear(selectedYear + 1)
                    } else {
                      setSelectedMonth(selectedMonth + 1)
                    }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{monthlyStats.totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{monthlyStats.quizPoints}</div>
                  <div className="text-xs text-muted-foreground">Quiz Points</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{monthlyStats.appPoints}</div>
                  <div className="text-xs text-muted-foreground">App Points</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">{monthlyStats.eventPoints}</div>
                  <div className="text-xs text-muted-foreground">Event Points</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">{monthlyStats.commentPoints}</div>
                  <div className="text-xs text-muted-foreground">Comment Points</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
                  <div className="text-center">Sun</div>
                  <div className="text-center">Mon</div>
                  <div className="text-center">Tue</div>
                  <div className="text-center">Wed</div>
                  <div className="text-center">Thu</div>
                  <div className="text-center">Fri</div>
                  <div className="text-center">Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(selectedMonth, selectedYear).map((day, index) => {
                    if (!day) {
                      return <div key={index} className="w-8 h-8" />
                    }

                    const dayContribution = contributions.find(
                      (c) => new Date(c.date).toDateString() === day.toDateString(),
                    )
                    const count = dayContribution?.count || 0

                    return (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-sm border border-gray-200 flex items-center justify-center text-xs font-medium ${getContributionLevel(count)}`}
                        title={`${day.getDate()} ${monthNames[selectedMonth]}: ${count} points`}
                      >
                        {day.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm border"></div>
                  <div className="w-3 h-3 bg-green-200 rounded-sm border"></div>
                  <div className="w-3 h-3 bg-green-300 rounded-sm border"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-sm border"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-sm border"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ProfileForm user={user} />
      </main>
    </div>
  )
}
