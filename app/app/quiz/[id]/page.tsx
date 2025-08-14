"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookOpen, ArrowLeft, ArrowRight, Send, AlertTriangle, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Quiz {
  id: string
  title: string
  description: string
  quiz_type: "live" | "unlive"
  duration_minutes: number
  start_time?: string
  end_time?: string
  login_window_minutes: number
  instructions: string
  password: string
  course: { name: string; code: string }
}

interface Question {
  id: string
  question_number: number
  question_text: string
  question_image_url?: string
  question_type: string
  points: number
  options: {
    id: string
    option_letter: string
    option_text: string
    option_image_url?: string
    is_correct: boolean
  }[]
}

interface QuizAttempt {
  id: string
  started_at: string
  status: string
  time_remaining_seconds?: number
  total_questions?: number
  correct_answers?: number
  total_points?: number
  score_percentage?: number
}

interface Answer {
  question_id: string
  selected_option_id?: string
  answer_text?: string
  is_correct?: boolean
  points_earned?: number
}

export default function QuizTakingPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showWaitingPage, setShowWaitingPage] = useState(false)
  const [timeUntilStart, setTimeUntilStart] = useState(0)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [instructionsRead, setInstructionsRead] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (attempt && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [attempt, timeRemaining])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (showWaitingPage && timeUntilStart > 0) {
      interval = setInterval(() => {
        setTimeUntilStart((prev) => {
          if (prev <= 1) {
            // Quiz is starting now, load questions
            setShowWaitingPage(false)
            startQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [showWaitingPage, timeUntilStart])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()

      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }

      setUser(currentUser)
      await fetchQuiz(currentUser.id)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchQuiz = async (userId: string) => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(`
          *,
          course:courses(name, code)
        `)
        .eq("id", params.id)
        .eq("is_published", true)
        .eq("is_active", true)
        .single()

      if (quizError) throw quizError
      setQuiz(quizData)

      const { data: completedAttempt } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", params.id)
        .eq("user_id", userId)
        .in("status", ["submitted", "auto_submitted"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single()

      if (completedAttempt) {
        // Redirect to results if already completed
        router.push(`/quiz/${params.id}/results`)
        return
      }

      // Check for existing in-progress attempt
      const { data: attemptData } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", params.id)
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .single()

      if (attemptData) {
        setAttempt(attemptData)
        await loadQuizContent()
        await loadExistingAnswers(attemptData.id)
        calculateTimeRemaining(attemptData, quizData)
      } else {
        // Check if user can start quiz
        if (!isQuizAvailable(quizData)) {
          alert("This quiz is not currently available.")
          router.push("/quiz")
          return
        }
        setShowPasswordDialog(true)
      }
    } catch (error) {
      console.error("Error fetching quiz:", error)
      router.push("/quiz")
    }
  }

  const loadQuizContent = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select(`
          *,
          options:quiz_options(*)
        `)
        .eq("quiz_id", params.id)
        .order("question_number")

      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error("Error loading questions:", error)
    }
  }

  const loadExistingAnswers = async (attemptId: string) => {
    try {
      const { data, error } = await supabase.from("quiz_answers").select("*").eq("attempt_id", attemptId)

      if (error) throw error

      const answersMap: Record<string, Answer> = {}
      data?.forEach((answer) => {
        answersMap[answer.question_id] = {
          question_id: answer.question_id,
          selected_option_id: answer.selected_option_id,
          answer_text: answer.answer_text,
          is_correct: answer.is_correct,
          points_earned: answer.points_earned,
        }
      })
      setAnswers(answersMap)
    } catch (error) {
      console.error("Error loading existing answers:", error)
    }
  }

  const calculateTimeRemaining = (attemptData: QuizAttempt, quizData: Quiz) => {
    const startTimeUTC = new Date(attemptData.started_at)
    const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)
    const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
    const elapsedSeconds = Math.floor((nowIST.getTime() - startTimeIST.getTime()) / 1000)
    const totalSeconds = quizData.duration_minutes * 60
    const remaining = Math.max(0, totalSeconds - elapsedSeconds)
    setTimeRemaining(remaining)
  }

  const isQuizAvailable = (quiz: Quiz) => {
    const nowUTC = new Date()
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000)

    if (quiz.quiz_type === "live") {
      if (!quiz.start_time) return false

      // Database stores UTC time, convert to IST for comparison
      const startTimeUTC = new Date(quiz.start_time)
      const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)

      // Allow login 10 minutes before start time (as requested)
      const loginWindow = 10 * 60 * 1000 // 10 minutes in milliseconds
      const canLoginAt = new Date(startTimeIST.getTime() - loginWindow)
      const quizEndsAt = new Date(startTimeIST.getTime() + quiz.duration_minutes * 60 * 1000)

      console.log("Quiz availability check:", {
        nowIST: nowIST.toLocaleString("en-IN"),
        startTimeIST: startTimeIST.toLocaleString("en-IN"),
        canLoginAt: canLoginAt.toLocaleString("en-IN"),
        quizEndsAt: quizEndsAt.toLocaleString("en-IN"),
        canAccess: nowIST >= canLoginAt && nowIST <= quizEndsAt,
      })

      return nowIST >= canLoginAt && nowIST <= quizEndsAt
    } else {
      if (!quiz.end_time) return true
      const endTimeUTC = new Date(quiz.end_time)
      const endTimeIST = new Date(endTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)
      return nowIST <= endTimeIST
    }
  }

  const handlePasswordSubmit = async () => {
    if (!quiz || !user) return

    if (password !== quiz.password) {
      setPasswordError("Incorrect password. Please try again.")
      return
    }

    try {
      // Create new attempt
      const { data: attemptData, error } = await supabase
        .from("quiz_attempts")
        .insert([
          {
            quiz_id: params.id,
            user_id: user.id,
            attempt_number: 1,
            status: "in_progress",
          },
        ])
        .select()
        .single()

      if (error) throw error

      setAttempt(attemptData)
      setShowPasswordDialog(false)
      setPasswordError("")

      if (quiz.quiz_type === "live" && quiz.start_time) {
        const nowUTC = new Date()
        const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000)
        const startTimeUTC = new Date(quiz.start_time)
        const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)

        if (nowIST < startTimeIST) {
          // Quiz hasn't started yet, show waiting page
          const secondsUntilStart = Math.floor((startTimeIST.getTime() - nowIST.getTime()) / 1000)
          setTimeUntilStart(secondsUntilStart)
          setShowWaitingPage(true)
          return
        }
      }

      // Quiz can start immediately (unlive or live quiz that has already started)
      if (quiz.instructions) {
        setShowInstructions(true)
      } else {
        await startQuiz()
      }
    } catch (error) {
      console.error("Error starting quiz:", error)
      alert("Failed to start quiz. Please try again.")
    }
  }

  const startQuiz = async () => {
    await loadQuizContent()
    if (quiz) {
      setTimeRemaining(quiz.duration_minutes * 60)
    }
    setShowInstructions(false)
  }

  const handleAnswerChange = async (questionId: string, optionId: string) => {
    if (!attempt) return

    const newAnswer: Answer = {
      question_id: questionId,
      selected_option_id: optionId,
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: newAnswer,
    }))

    // Save to database
    try {
      const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString()
      await supabase.from("quiz_answers").upsert(
        {
          attempt_id: attempt.id,
          question_id: questionId,
          selected_option_id: optionId,
          answered_at: istTime,
        },
        {
          onConflict: "attempt_id,question_id",
        },
      )
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const handleClearAnswer = async (questionId: string) => {
    if (!attempt) return

    setAnswers((prev) => {
      const newAnswers = { ...prev }
      delete newAnswers[questionId]
      return newAnswers
    })

    // Remove from database
    try {
      await supabase.from("quiz_answers").delete().eq("attempt_id", attempt.id).eq("question_id", questionId)
    } catch (error) {
      console.error("Error clearing answer:", error)
    }
  }

  const handleAutoSubmit = useCallback(async () => {
    if (!attempt || submitting) return

    setSubmitting(true)
    try {
      const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString()
      await supabase
        .from("quiz_attempts")
        .update({
          status: "auto_submitted",
          submitted_at: istTime,
          time_remaining_seconds: 0,
        })
        .eq("id", attempt.id)

      await calculateQuizResults(attempt.id)
      router.push(`/quiz/${params.id}/results`)
    } catch (error) {
      console.error("Error auto-submitting quiz:", error)
    }
  }, [attempt, submitting, supabase, router, params.id])

  const handleSubmit = async () => {
    if (!attempt || submitting) return

    if (!confirm("Are you sure you want to submit your quiz? You cannot change your answers after submission.")) {
      return
    }

    setSubmitting(true)
    try {
      const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString()
      await supabase
        .from("quiz_attempts")
        .update({
          status: "submitted",
          submitted_at: istTime,
          time_remaining_seconds: timeRemaining,
        })
        .eq("id", attempt.id)

      await calculateQuizResults(attempt.id)
      router.push(`/quiz/${params.id}/results`)
    } catch (error) {
      console.error("Error submitting quiz:", error)
      alert("Failed to submit quiz. Please try again.")
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).length
  }

  const calculateQuizResults = async (attemptId: string) => {
    try {
      console.log("Starting result calculation for attempt:", attemptId)

      // Get all questions with correct answers
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select(`
          id,
          question_number,
          points,
          options:quiz_options(id, option_letter, is_correct)
        `)
        .eq("quiz_id", params.id)
        .order("question_number")

      if (questionsError) {
        console.error("Error fetching questions:", questionsError)
        throw questionsError
      }

      console.log("Questions data:", questionsData)

      // Get user's answers
      const { data: answersData, error: answersError } = await supabase
        .from("quiz_answers")
        .select("*")
        .eq("attempt_id", attemptId)

      if (answersError) {
        console.error("Error fetching answers:", answersError)
        throw answersError
      }

      console.log("User answers data:", answersData)

      let totalCorrect = 0
      let totalPoints = 0
      const totalQuestions = questionsData?.length || 0
      const maxPossiblePoints = questionsData?.reduce((sum, q) => sum + q.points, 0) || 0

      // Calculate results for each question
      for (const question of questionsData || []) {
        const userAnswer = answersData?.find((a) => a.question_id === question.id)
        const correctOption = question.options.find((opt) => opt.is_correct)

        console.log(`Question ${question.question_number}:`, {
          questionId: question.id,
          userAnswerId: userAnswer?.selected_option_id,
          correctOptionId: correctOption?.id,
          correctOptionLetter: correctOption?.option_letter,
        })

        let isCorrect = false
        let pointsEarned = 0

        if (userAnswer && correctOption && userAnswer.selected_option_id === correctOption.id) {
          isCorrect = true
          pointsEarned = question.points
          totalCorrect++
          totalPoints += question.points
          console.log(`✓ Question ${question.question_number} is CORRECT`)
        } else {
          console.log(`✗ Question ${question.question_number} is INCORRECT`)
        }

        // Update the answer with correctness and points
        if (userAnswer) {
          const { error: updateError } = await supabase
            .from("quiz_answers")
            .update({
              is_correct: isCorrect,
              points_earned: pointsEarned,
            })
            .eq("id", userAnswer.id)

          if (updateError) {
            console.error("Error updating answer:", updateError)
          }
        } else {
          // Create a record for unanswered questions
          const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString()
          await supabase.from("quiz_answers").insert({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option_id: null,
            answer_text: null,
            is_correct: false,
            points_earned: 0,
            answered_at: istTime,
          })
        }
      }

      const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0

      console.log("Final results:", {
        totalQuestions,
        totalCorrect,
        totalPoints,
        maxPossiblePoints,
        scorePercentage,
      })

      // Update the attempt with results
      const { error: attemptUpdateError } = await supabase
        .from("quiz_attempts")
        .update({
          total_questions: totalQuestions,
          correct_answers: totalCorrect,
          total_points: totalPoints,
          score_percentage: Math.round(scorePercentage * 10) / 10, // Round to 1 decimal place
        })
        .eq("id", attemptId)

      if (attemptUpdateError) {
        console.error("Error updating attempt:", attemptUpdateError)
        throw attemptUpdateError
      }

      console.log("Result calculation completed successfully")
    } catch (error) {
      console.error("Error calculating results:", error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!user || !quiz) {
    return null
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Quiz Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError("")
                }}
                placeholder="Enter quiz password"
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
              {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePasswordSubmit} className="flex-1">
                Start Quiz
              </Button>
              <Button variant="outline" onClick={() => router.push("/quiz")}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Waiting Page for Live Quiz */}
      {showWaitingPage && quiz && (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" size="sm" asChild>
                <Link href="/quiz">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Quizzes
                </Link>
              </Button>
            </div>

            <Card className="p-8">
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <BookOpen className="w-16 h-16 text-primary mx-auto" />
                  <h1 className="font-serif font-bold text-3xl text-foreground">{quiz.title}</h1>
                  <p className="text-lg text-muted-foreground">{quiz.course?.name}</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-orange-800">Quiz Starting Soon</h2>
                  <p className="text-orange-700">
                    You have successfully entered the quiz. Please wait for the quiz to begin.
                  </p>

                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold text-orange-600">{formatTime(timeUntilStart)}</div>
                    <p className="text-sm text-orange-600">Time until quiz starts</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-left">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Quiz Details</h3>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li>Duration: {quiz.duration_minutes} minutes</li>
                      <li>Type: {quiz.quiz_type === "live" ? "Live Quiz" : "Practice Quiz"}</li>
                      {quiz.start_time && (
                        <li>
                          Start Time:{" "}
                          {new Date(new Date(quiz.start_time).getTime() + 5.5 * 60 * 60 * 1000).toLocaleString(
                            "en-IN",
                            {
                              dateStyle: "short",
                              timeStyle: "short",
                            },
                          )}
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Important Notes</h3>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li>• Keep this page open</li>
                      <li>• Quiz will start automatically</li>
                      <li>• Ensure stable internet connection</li>
                      <li>• Do not refresh the page</li>
                    </ul>
                  </div>
                </div>

                {quiz.instructions && (
                  <div className="bg-gray-50 border rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-gray-800 mb-2">Instructions</h3>
                    <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                      <p className="whitespace-pre-wrap">{quiz.instructions}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected and ready</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      )}

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Quiz Instructions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex-1 overflow-y-auto max-h-96 p-4 border rounded-lg bg-gray-50">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{quiz.instructions}</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="instructions-read"
                checked={instructionsRead}
                onChange={(e) => setInstructionsRead(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="instructions-read" className="text-sm font-medium">
                I have read and understood the instructions
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={startQuiz} className="flex-1" disabled={!instructionsRead}>
                Start Quiz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Content - only show when quiz has actually started */}
      {attempt && questions.length > 0 && !showWaitingPage && (
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/quiz">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Quizzes
                </Link>
              </Button>
              <div>
                <h1 className="font-serif font-bold text-2xl text-foreground">{quiz.title}</h1>
                <p className="text-muted-foreground">{quiz.course?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{formatTime(timeRemaining)}</div>
                <div className="text-sm text-muted-foreground">Time Remaining</div>
              </div>
              {timeRemaining <= 300 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="w-4 h-4 mr-1" />5 min left
                </Badge>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Question Navigation */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Questions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getAnsweredCount()} of {questions.length} answered
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((question, index) => (
                      <Button
                        key={question.id}
                        variant={
                          index === currentQuestionIndex ? "default" : answers[question.id] ? "secondary" : "outline"
                        }
                        size="sm"
                        className="aspect-square"
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {question.question_number}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-4">
                    <Send className="mr-2 w-4 h-4" />
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Question Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Question {currentQuestion.question_number} of {questions.length}
                    </CardTitle>
                    <Badge variant="outline">{currentQuestion.points} point(s)</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-lg mb-4">{currentQuestion.question_text}</p>
                    {currentQuestion.question_image_url && (
                      <img
                        src={currentQuestion.question_image_url || "/placeholder.svg"}
                        alt="Question"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    )}
                  </div>

                  <RadioGroup
                    value={answers[currentQuestion.id]?.selected_option_id || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{option.option_letter}.</span>
                            <span>{option.option_text}</span>
                          </div>
                          {option.option_image_url && (
                            <img
                              src={option.option_image_url || "/placeholder.svg"}
                              alt={`Option ${option.option_letter}`}
                              className="mt-2 max-w-xs h-auto rounded border"
                            />
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {answers[currentQuestion.id]?.selected_option_id && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearAnswer(currentQuestion.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="mr-2 w-4 h-4" />
                        Clear Response
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === questions.length - 1}
                    >
                      Next
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
