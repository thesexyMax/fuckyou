"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ArrowLeft, Trophy, CheckCircle, XCircle, Award, Users } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface QuizResult {
  id: string
  quiz_id: string
  user_id: string
  total_questions: number
  correct_answers: number
  total_points: number
  score_percentage: number
  submitted_at: string
  time_remaining_seconds: number
  status: string
  quiz: {
    title: string
    description: string
    course: { name: string; code: string }
    show_correct_answers: boolean
    allow_review: boolean
  }
}

interface QuestionResult {
  id: string
  question_number: number
  question_text: string
  question_image_url?: string
  points: number
  explanation?: string
  user_answer: {
    selected_option_id?: string
    answer_text?: string
    is_correct: boolean
    points_earned: number
  }
  options: {
    id: string
    option_letter: string
    option_text: string
    option_image_url?: string
    is_correct: boolean
  }[]
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  username: string
  avatar_url?: string
  score_percentage: number
  total_points: number
  correct_answers: number
  total_questions: number
  submitted_at: string
  time_remaining_seconds: number
}

export default function QuizResultsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [questions, setQuestions] = useState<QuestionResult[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number>(0)

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

      setUser(currentUser)
      await Promise.all([fetchResults(currentUser.id), fetchLeaderboard(currentUser.id)])
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async (userId: string) => {
    try {
      // Get user's quiz attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .select(`
          *,
          quiz:quizzes(
            title,
            description,
            show_correct_answers,
            allow_review,
            course:courses(name, code)
          )
        `)
        .eq("quiz_id", params.id)
        .eq("user_id", userId)
        .in("status", ["submitted", "auto_submitted"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single()

      if (attemptError) throw attemptError
      setResult(attemptData)

      // Get detailed question results if review is allowed
      if (attemptData.quiz.allow_review) {
        await fetchQuestionResults(attemptData.id)
      }
    } catch (error) {
      console.error("Error fetching results:", error)
    }
  }

  const fetchQuestionResults = async (attemptId: string) => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select(`
          *,
          options:quiz_options(*),
          user_answer:quiz_answers!inner(
            selected_option_id,
            answer_text,
            is_correct,
            points_earned
          )
        `)
        .eq("quiz_id", params.id)
        .eq("user_answer.attempt_id", attemptId)
        .order("question_number")

      if (error) throw error

      const processedQuestions =
        data?.map((question) => ({
          ...question,
          user_answer: question.user_answer[0],
        })) || []

      setQuestions(processedQuestions)
    } catch (error) {
      console.error("Error fetching question results:", error)
    }
  }

  const fetchLeaderboard = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("quiz_leaderboard")
        .select("*")
        .eq("quiz_id", params.id)
        .order("rank")
        .limit(50)

      if (error) throw error

      setLeaderboard(data || [])

      // Find user's rank
      const userEntry = data?.find((entry) => entry.user_id === userId)
      if (userEntry) {
        setUserRank(userEntry.rank)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 80) return "text-blue-600"
    if (percentage >= 70) return "text-yellow-600"
    if (percentage >= 60) return "text-orange-600"
    return "text-red-600"
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return "A"
    if (percentage >= 80) return "B"
    if (percentage >= 70) return "C"
    if (percentage >= 60) return "D"
    return "F"
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
          <p className="text-lg text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!user || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif font-bold text-xl mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-6">You haven't completed this quiz yet.</p>
            <Button asChild>
              <Link href="/quiz">Back to Quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/quiz">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Quiz Results</h1>
            <p className="text-muted-foreground text-lg">{result.quiz.title}</p>
          </div>
        </div>

        {/* Results Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(result.score_percentage)}`}>
                {result.score_percentage.toFixed(1)}%
              </div>
              <div className="text-2xl font-bold text-muted-foreground mb-2">{getGrade(result.score_percentage)}</div>
              <Progress value={result.score_percentage} className="mb-2" />
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500 mr-2" />
                <span className="text-3xl font-bold">{result.correct_answers}</span>
              </div>
              <p className="text-sm text-muted-foreground">Correct out of {result.total_questions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-8 h-8 text-yellow-500 mr-2" />
                <span className="text-3xl font-bold">{result.total_points}</span>
              </div>
              <p className="text-sm text-muted-foreground">Points Earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-8 h-8 text-purple-500 mr-2" />
                <span className="text-3xl font-bold">#{userRank}</span>
              </div>
              <p className="text-sm text-muted-foreground">Your Rank</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {result.quiz.allow_review && <TabsTrigger value="review">Question Review</TabsTrigger>}
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Quiz Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Course:</span>
                        <span>{result.quiz.course.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Questions:</span>
                        <span>{result.total_questions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Submitted:</span>
                        <span>{new Date(result.submitted_at).toLocaleString("en-GB")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={result.status === "submitted" ? "default" : "secondary"}>
                          {result.status === "submitted" ? "Submitted" : "Auto-submitted"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Correct Answers:</span>
                        <span className="text-green-600 font-medium">
                          {result.correct_answers}/{result.total_questions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span className={`font-medium ${getScoreColor(result.score_percentage)}`}>
                          {result.score_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Points Earned:</span>
                        <span className="font-medium">{result.total_points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Remaining:</span>
                        <span>{formatTime(result.time_remaining_seconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {result.quiz.allow_review && (
            <TabsContent value="review" className="space-y-6">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Question {question.question_number}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={question.user_answer.is_correct ? "default" : "destructive"}>
                          {question.user_answer.is_correct ? (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          {question.user_answer.is_correct ? "Correct" : "Incorrect"}
                        </Badge>
                        <Badge variant="outline">
                          {question.user_answer.points_earned}/{question.points} pts
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-lg mb-2">{question.question_text}</p>
                      {question.question_image_url && (
                        <img
                          src={question.question_image_url || "/placeholder.svg"}
                          alt="Question"
                          className="max-w-full h-auto rounded-lg border mb-4"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const isUserAnswer = option.id === question.user_answer.selected_option_id
                        const isCorrect = option.is_correct

                        let bgColor = ""
                        if (isUserAnswer && isCorrect) bgColor = "bg-green-100 border-green-300"
                        else if (isUserAnswer && !isCorrect) bgColor = "bg-red-100 border-red-300"
                        else if (isCorrect && result.quiz.show_correct_answers) bgColor = "bg-green-50 border-green-200"

                        return (
                          <div key={option.id} className={`p-3 rounded-lg border ${bgColor}`}>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{option.option_letter}.</span>
                              <span>{option.option_text}</span>
                              {isUserAnswer && (
                                <Badge variant="outline" className="ml-auto">
                                  Your Answer
                                </Badge>
                              )}
                              {isCorrect && result.quiz.show_correct_answers && (
                                <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                              )}
                            </div>
                            {option.option_image_url && (
                              <img
                                src={option.option_image_url || "/placeholder.svg"}
                                alt={`Option ${option.option_letter}`}
                                className="mt-2 max-w-xs h-auto rounded border"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {question.explanation && result.quiz.show_correct_answers && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-medium text-blue-900 mb-2">Explanation:</h5>
                        <p className="text-blue-800 text-sm">{question.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Quiz Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        entry.user_id === user.id ? "bg-primary/5 border-primary/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {entry.rank <= 3 ? (
                            <Trophy
                              className={`w-5 h-5 ${
                                entry.rank === 1
                                  ? "text-yellow-500"
                                  : entry.rank === 2
                                    ? "text-gray-400"
                                    : "text-orange-600"
                              }`}
                            />
                          ) : (
                            <span className="text-sm font-medium">#{entry.rank}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {entry.full_name}
                            {entry.user_id === user.id && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">@{entry.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(entry.score_percentage)}`}>
                          {entry.score_percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.correct_answers}/{entry.total_questions} correct
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {leaderboard.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
