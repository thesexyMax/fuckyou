"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ArrowLeft, Trophy, Users, BarChart3, Download, Search } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Quiz {
  id: string
  title: string
  description: string
  course: { name: string; code: string }
  total_questions: number
  total_points: number
}

interface QuizStats {
  total_attempts: number
  completed_attempts: number
  average_score: number
  highest_score: number
  lowest_score: number
  average_time_taken: number
}

interface AttemptResult {
  id: string
  user_id: string
  user: {
    full_name: string
    username: string
    student_id: number
    avatar_url?: string
  }
  score_percentage: number
  correct_answers: number
  total_questions: number
  total_points: number
  submitted_at: string
  time_remaining_seconds: number
  status: string
  rank: number
}

interface QuestionAnalysis {
  question_id: string
  question_number: number
  question_text: string
  total_attempts: number
  correct_attempts: number
  accuracy_percentage: number
  points: number
}

export default function AdminQuizResultsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [results, setResults] = useState<AttemptResult[]>([])
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("rank")

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()

      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }

      if (!currentUser.is_admin) {
        window.location.href = "/dashboard"
        return
      }

      setUser(currentUser)
      await Promise.all([fetchQuiz(), fetchStats(), fetchResults(), fetchQuestionAnalysis()])
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          course:courses(name, code),
          questions:quiz_questions(count)
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      setQuiz({
        ...data,
        total_questions: data.questions?.[0]?.count || 0,
        total_points: 0, // Will be calculated from questions
      })
    } catch (error) {
      console.error("Error fetching quiz:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: attempts, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", params.id)
        .in("status", ["submitted", "auto_submitted"])

      if (error) throw error

      if (attempts && attempts.length > 0) {
        const completedAttempts = attempts.length
        const totalAttempts = completedAttempts // For now, same as completed
        const averageScore = attempts.reduce((sum, attempt) => sum + attempt.score_percentage, 0) / completedAttempts
        const highestScore = Math.max(...attempts.map((a) => a.score_percentage))
        const lowestScore = Math.min(...attempts.map((a) => a.score_percentage))

        // Calculate average time taken (quiz duration - time remaining)
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("duration_minutes")
          .eq("id", params.id)
          .single()
        const quizDurationSeconds = (quizData?.duration_minutes || 60) * 60
        const averageTimeTaken =
          attempts.reduce((sum, attempt) => sum + (quizDurationSeconds - (attempt.time_remaining_seconds || 0)), 0) /
          completedAttempts

        setStats({
          total_attempts: totalAttempts,
          completed_attempts: completedAttempts,
          average_score: averageScore,
          highest_score: highestScore,
          lowest_score: lowestScore,
          average_time_taken: averageTimeTaken,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase.from("quiz_leaderboard").select("*").eq("quiz_id", params.id).order("rank")

      if (error) throw error

      const processedResults =
        data?.map((result) => ({
          id: result.user_id,
          user_id: result.user_id,
          user: {
            full_name: result.full_name,
            username: result.username,
            student_id: 0, // Not available in leaderboard view
            avatar_url: result.avatar_url,
          },
          score_percentage: result.score_percentage,
          correct_answers: result.correct_answers,
          total_questions: result.total_questions,
          total_points: result.total_points,
          submitted_at: result.submitted_at,
          time_remaining_seconds: result.time_remaining_seconds,
          status: "submitted",
          rank: result.rank,
        })) || []

      setResults(processedResults)
    } catch (error) {
      console.error("Error fetching results:", error)
    }
  }

  const fetchQuestionAnalysis = async () => {
    try {
      // Get all questions for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, question_number, question_text, points")
        .eq("quiz_id", params.id)
        .order("question_number")

      if (questionsError) throw questionsError

      // Get answer statistics for each question
      const analysisPromises = questions?.map(async (question) => {
        const { data: answers, error: answersError } = await supabase
          .from("quiz_answers")
          .select("is_correct")
          .eq("question_id", question.id)
          .not("is_correct", "is", null)

        if (answersError) throw answersError

        const totalAttempts = answers?.length || 0
        const correctAttempts = answers?.filter((a) => a.is_correct).length || 0
        const accuracyPercentage = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

        return {
          question_id: question.id,
          question_number: question.question_number,
          question_text: question.question_text,
          total_attempts: totalAttempts,
          correct_attempts: correctAttempts,
          accuracy_percentage: accuracyPercentage,
          points: question.points,
        }
      })

      const analysis = await Promise.all(analysisPromises || [])
      setQuestionAnalysis(analysis)
    } catch (error) {
      console.error("Error fetching question analysis:", error)
    }
  }

  const filteredResults = results.filter(
    (result) =>
      result.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.user.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case "rank":
        return a.rank - b.rank
      case "score":
        return b.score_percentage - a.score_percentage
      case "name":
        return a.user.full_name.localeCompare(b.user.full_name)
      case "time":
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      default:
        return a.rank - b.rank
    }
  })

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 80) return "text-blue-600"
    if (percentage >= 70) return "text-yellow-600"
    if (percentage >= 60) return "text-orange-600"
    return "text-red-600"
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading quiz results...</p>
        </div>
      </div>
    )
  }

  if (!user || !quiz) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/quizzes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Quiz Results</h1>
            <p className="text-muted-foreground text-lg">{quiz.title}</p>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{stats.completed_attempts}</div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(stats.average_score)}`}>
                  {stats.average_score.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{stats.highest_score.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Highest Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{formatTime(stats.average_time_taken)}</div>
                <p className="text-sm text-muted-foreground">Avg. Time Taken</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Results */}
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Student Results</TabsTrigger>
            <TabsTrigger value="analysis">Question Analysis</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search by student name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rank">Rank</SelectItem>
                      <SelectItem value="score">Score</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="time">Submission Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 w-4 h-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Student Results ({sortedResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {result.rank <= 3 ? (
                            <Trophy
                              className={`w-5 h-5 ${
                                result.rank === 1
                                  ? "text-yellow-500"
                                  : result.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                              }`}
                            />
                          ) : (
                            <span className="text-sm font-medium">#{result.rank}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{result.user.full_name}</p>
                          <p className="text-sm text-muted-foreground">@{result.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(result.score_percentage)}`}>
                            {result.score_percentage.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground">Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {result.correct_answers}/{result.total_questions}
                          </div>
                          <div className="text-muted-foreground">Correct</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{result.total_points}</div>
                          <div className="text-muted-foreground">Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{formatTime(result.time_remaining_seconds)}</div>
                          <div className="text-muted-foreground">Time Left</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {sortedResults.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No results found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Question Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questionAnalysis.map((question) => (
                    <div key={question.question_id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">Question {question.question_number}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{question.question_text}</p>
                        </div>
                        <Badge variant={question.accuracy_percentage >= 70 ? "default" : "destructive"}>
                          {question.accuracy_percentage.toFixed(1)}% correct
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{question.correct_attempts} correct</span>
                        <span>{question.total_attempts} total attempts</span>
                        <span>{question.points} points</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.slice(0, 10).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {result.rank <= 3 ? (
                            <Trophy
                              className={`w-5 h-5 ${
                                result.rank === 1
                                  ? "text-yellow-500"
                                  : result.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                              }`}
                            />
                          ) : (
                            <span className="text-sm font-medium">#{result.rank}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{result.user.full_name}</p>
                          <p className="text-sm text-muted-foreground">@{result.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getScoreColor(result.score_percentage)}`}>
                            {result.score_percentage.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground">Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {result.correct_answers}/{result.total_questions}
                          </div>
                          <div className="text-muted-foreground">Correct</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {results.length === 0 && (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No results available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
