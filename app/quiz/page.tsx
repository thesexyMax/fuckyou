"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Search, Clock, Users, Lock, Play, Trophy, RefreshCw } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import BanCheck from "@/components/ban-check"
import { formatDateIST, formatTimeIST, getCurrentTimeIST } from "@/lib/date-utils"

interface Quiz {
  id: string
  title: string
  description: string
  quiz_type: "live" | "unlive"
  duration_minutes: number
  start_time?: string
  end_time?: string
  login_window_minutes: number
  is_published: boolean
  is_active: boolean
  course: { name: string; code: string }
  _count: { attempts: number; questions: number }
  user_attempts: { id: string; status: string; score_percentage: number }[]
}

interface Course {
  id: string
  name: string
  code: string
}

export default function QuizListPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCourse, setFilterCourse] = useState<string>("all")

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!user || quizzes.length === 0) return

    const getNextStatusChangeTime = () => {
      const now = getCurrentTimeIST()
      let nextChangeTime: Date | null = null

      for (const quiz of quizzes) {
        if (quiz.quiz_type === "live" && quiz.start_time) {
          const startTime = new Date(quiz.start_time)
          const endTime = new Date(startTime.getTime() + quiz.duration_minutes * 60 * 1000)
          const loginWindowStart = new Date(startTime.getTime() - 10 * 60 * 1000) // 10 minutes before start

          // Find the next significant time change
          const times = [loginWindowStart, startTime, endTime].filter((time) => time > now)

          for (const time of times) {
            if (!nextChangeTime || time < nextChangeTime) {
              nextChangeTime = time
            }
          }
        }
      }

      return nextChangeTime
    }

    const scheduleNextRefresh = () => {
      const nextChangeTime = getNextStatusChangeTime()

      if (nextChangeTime) {
        const timeUntilChange = nextChangeTime.getTime() - getCurrentTimeIST().getTime()
        const refreshTime = Math.min(timeUntilChange + 1000, 5 * 60 * 1000) // Max 5 minutes, min 1 second after change

        console.log(`Next quiz status change in ${Math.round(refreshTime / 1000)} seconds`)

        const timeout = setTimeout(() => {
          fetchQuizzes(user.id)
          scheduleNextRefresh() // Schedule the next refresh
        }, refreshTime)

        return timeout
      } else {
        // No upcoming changes, check every 5 minutes as fallback
        const timeout = setTimeout(
          () => {
            fetchQuizzes(user.id)
            scheduleNextRefresh()
          },
          5 * 60 * 1000,
        )

        return timeout
      }
    }

    const timeout = scheduleNextRefresh()
    return () => clearTimeout(timeout)
  }, [user, quizzes])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()

      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }

      setUser(currentUser)
      await Promise.all([fetchQuizzes(currentUser.id), fetchCourses()])
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchQuizzes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          course:courses(name, code)
        `)
        .eq("is_published", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get question counts
      const { data: questionCounts } = await supabase
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", data?.map((q) => q.id) || [])

      // Get attempt counts
      const { data: attemptCounts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .in("quiz_id", data?.map((q) => q.id) || [])

      // Get user's attempts
      const { data: userAttempts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, id, status, score_percentage, submitted_at")
        .eq("user_id", userId)
        .in("quiz_id", data?.map((q) => q.id) || [])

      const processedQuizzes =
        data?.map((quiz) => ({
          ...quiz,
          _count: {
            attempts: attemptCounts?.filter((a) => a.quiz_id === quiz.id).length || 0,
            questions: questionCounts?.filter((q) => q.quiz_id === quiz.id).length || 0,
          },
          user_attempts: userAttempts?.filter((attempt) => attempt.quiz_id === quiz.id) || [],
        })) || []

      setQuizzes(processedQuizzes)
    } catch (error) {
      console.error("Error fetching quizzes:", error)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from("courses").select("*").order("name")

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.course?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCourse = filterCourse === "all" || quiz.course?.code === filterCourse

    return matchesSearch && matchesCourse
  })

  const getQuizStatus = (quiz: Quiz) => {
    const completedAttempt = quiz.user_attempts.find(
      (attempt) => attempt.status === "submitted" || attempt.status === "auto_submitted",
    )

    if (completedAttempt) {
      return {
        status: "completed",
        message: `Completed (${completedAttempt.score_percentage?.toFixed(1) || 0}%)`,
        variant: "secondary" as const,
        href: `/quiz/${quiz.id}/results`,
        buttonText: "View Results",
      }
    }

    const inProgressAttempt = quiz.user_attempts.find((attempt) => attempt.status === "in_progress")
    if (inProgressAttempt) {
      return {
        status: "in_progress",
        message: "Resume Quiz",
        variant: "default" as const,
        href: `/quiz/${quiz.id}`,
        buttonText: "Resume",
      }
    }

    if (quiz.quiz_type === "live") {
      const now = getCurrentTimeIST()
      const startTime = new Date(quiz.start_time!)
      const endTime = new Date(startTime.getTime() + quiz.duration_minutes * 60 * 1000)
      const loginWindowStart = new Date(startTime.getTime() - 10 * 60 * 1000)

      if (now < loginWindowStart) {
        // Quiz is upcoming - show countdown
        const timeUntilLogin = Math.ceil((loginWindowStart.getTime() - now.getTime()) / (1000 * 60))
        return {
          status: "upcoming",
          message: `Upcoming (Login opens in ${timeUntilLogin}m)`,
          variant: "outline" as const,
        }
      } else if (now >= loginWindowStart && now < startTime) {
        // Login window is open but quiz hasn't started
        const timeUntilStart = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60))
        return {
          status: "login_window",
          message: `Login Window Open (Starts in ${timeUntilStart}m)`,
          variant: "default" as const,
          href: `/quiz/${quiz.id}`,
          buttonText: "Enter Quiz",
        }
      } else if (now >= startTime && now < endTime) {
        // Quiz is live and active - show enter button
        const timeRemaining = Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60))
        return {
          status: "live_active",
          message: `Quiz Live Now! (${timeRemaining}m remaining)`,
          variant: "default" as const,
          href: `/quiz/${quiz.id}`,
          buttonText: "Enter Quiz",
        }
      } else {
        // Quiz has ended
        return {
          status: "ended",
          message: "Quiz Ended",
          variant: "destructive" as const,
        }
      }
    } else {
      // Unlive quiz
      if (quiz.end_time && getCurrentTimeIST() > new Date(quiz.end_time)) {
        return {
          status: "ended",
          message: "Deadline Passed",
          variant: "destructive" as const,
        }
      } else {
        return {
          status: "available",
          message: "Available",
          variant: "default" as const,
          href: `/quiz/${quiz.id}`,
          buttonText: "Start Quiz",
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <BanCheck>
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        <DashboardHeader user={user} />

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Available Quizzes</h1>
              <p className="text-muted-foreground text-lg">Test your knowledge with course quizzes</p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search quizzes by title, description, or course..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.code}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => user && fetchQuizzes(user.id)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Quizzes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quizzes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const status = getQuizStatus(quiz)
              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            status.status === "available" && quiz.quiz_type === "live"
                              ? "default"
                              : quiz.quiz_type === "live"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {quiz.quiz_type === "live" ? "Live" : "Practice"}
                        </Badge>
                        {status.status === "completed" && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{quiz.course?.name}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {quiz.description || "No description available"}
                    </p>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{quiz.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{quiz._count.questions} questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{quiz._count.attempts} attempts</span>
                      </div>
                      {quiz.quiz_type === "live" && quiz.start_time && (
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          <span>
                            Starts: {formatDateIST(quiz.start_time)} {formatTimeIST(quiz.start_time)}
                          </span>
                        </div>
                      )}
                      {quiz.quiz_type === "unlive" && quiz.end_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            Deadline: {formatDateIST(quiz.end_time)} {formatTimeIST(quiz.end_time)}
                          </span>
                        </div>
                      )}
                    </div>

                    {status.href ? (
                      <Button asChild size="sm" className="w-full">
                        <Link href={status.href}>
                          {status.status === "live_active" || status.status === "login_window" ? (
                            <Play className="mr-2 w-4 h-4" />
                          ) : status.status === "completed" ? (
                            <Trophy className="mr-2 w-4 h-4" />
                          ) : (
                            <Lock className="mr-2 w-4 h-4" />
                          )}
                          {status.buttonText}
                        </Link>
                      </Button>
                    ) : (
                      <Badge variant={status.variant} className="w-full justify-center py-2">
                        {status.message}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredQuizzes.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl mb-2">No quizzes found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterCourse !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No quizzes are currently available. Check back later!"}
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </BanCheck>
  )
}
