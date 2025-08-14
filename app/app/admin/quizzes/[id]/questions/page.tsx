"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Save, Trash2, ImageIcon, Type } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Quiz {
  id: string
  title: string
  description: string
  course_id: string
}

interface Question {
  id?: string
  question_text: string
  question_image_url: string
  question_type: "multiple_choice" | "true_false" | "short_answer" // Fixed to match database constraint
  content_type: "text" | "image" // Added separate field for content type
  points: number
  explanation: string
  options: QuestionOption[]
}

interface QuestionOption {
  id?: string
  option_text: string
  option_image_url: string
  option_type: "text" | "image"
  is_correct: boolean
}

export default function QuizQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

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
      await fetchQuiz()
      await fetchQuestions()
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
        .select("id, title, description, course_id")
        .eq("id", quizId)
        .single()

      if (error) throw error
      setQuiz(data)
    } catch (error) {
      console.error("Error fetching quiz:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select(`
          *,
          quiz_options (*)
        `)
        .eq("quiz_id", quizId)
        .order("question_number")

      if (error) throw error

      const formattedQuestions = data.map((q) => ({
        id: q.id,
        question_text: q.question_text || "",
        question_image_url: q.question_image_url || "",
        question_type: q.question_type as "multiple_choice" | "true_false" | "short_answer", // Fixed type
        content_type: (q.question_image_url ? "image" : "text") as "text" | "image", // Determine content type from data
        points: q.points,
        explanation: q.explanation || "",
        options: q.quiz_options.map((opt: any) => ({
          id: opt.id,
          option_text: opt.option_text || "",
          option_image_url: opt.option_image_url || "",
          option_type: (opt.option_image_url ? "image" : "text") as "text" | "image", // Determine option type from data
          is_correct: opt.is_correct,
        })),
      }))

      setQuestions(formattedQuestions)
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      question_text: "",
      question_image_url: "",
      question_type: "multiple_choice", // Default to multiple_choice
      content_type: "text", // Default content type to text
      points: 1,
      explanation: "",
      options: [
        { option_text: "", option_image_url: "", option_type: "text", is_correct: true },
        { option_text: "", option_image_url: "", option_type: "text", is_correct: false },
        { option_text: "", option_image_url: "", option_type: "text", is_correct: false },
        { option_text: "", option_image_url: "", option_type: "text", is_correct: false },
      ],
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: keyof QuestionOption, value: any) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      [field]: value,
    }

    // If setting this option as correct, make others incorrect
    if (field === "is_correct" && value === true) {
      updated[questionIndex].options.forEach((opt, idx) => {
        if (idx !== optionIndex) {
          opt.is_correct = false
        }
      })
    }

    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const saveQuestions = async () => {
    if (questions.length === 0) {
      alert("Please add at least one question")
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (q.content_type === "text" && !q.question_text.trim()) {
        alert(`Question ${i + 1} must have question text`)
        return
      }
      if (q.content_type === "image" && !q.question_image_url.trim()) {
        alert(`Question ${i + 1} must have an image URL`)
        return
      }

      const hasCorrectAnswer = q.options.some((opt) => opt.is_correct)
      if (!hasCorrectAnswer && q.question_type !== "short_answer") {
        alert(`Question ${i + 1} must have at least one correct answer`)
        return
      }

      if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
        const optionCount = q.question_type === "true_false" ? 2 : 4
        for (let j = 0; j < optionCount; j++) {
          const opt = q.options[j]
          if (opt.option_type === "text" && !opt.option_text.trim()) {
            alert(`Question ${i + 1}, Option ${j + 1} must have text`)
            return
          }
          if (opt.option_type === "image" && !opt.option_image_url.trim()) {
            alert(`Question ${i + 1}, Option ${j + 1} must have an image URL`)
            return
          }
        }
      }
    }

    setSaving(true)
    try {
      // Delete existing questions and options
      await supabase.from("quiz_questions").delete().eq("quiz_id", quizId)

      // Insert new questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        const questionText =
          question.content_type === "image" && !question.question_text.trim()
            ? "[Image Question]"
            : question.question_text.trim()

        const { data: questionData, error: questionError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            question_text: questionText,
            question_image_url: question.question_image_url || null,
            question_type: question.question_type,
            question_number: i + 1,
            points: question.points,
            explanation: question.explanation || null,
          })
          .select()
          .single()

        if (questionError) throw questionError

        if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
          const optionCount = question.question_type === "true_false" ? 2 : 4
          const optionsData = question.options.slice(0, optionCount).map((option, optIndex) => ({
            question_id: questionData.id,
            option_text:
              option.option_type === "image" && !option.option_text.trim()
                ? `Option ${String.fromCharCode(65 + optIndex)}`
                : option.option_text || null,
            option_image_url: option.option_image_url || null,
            option_letter: String.fromCharCode(65 + optIndex), // A, B, C, D
            is_correct: option.is_correct,
          }))

          const { error: optionsError } = await supabase.from("quiz_options").insert(optionsData)

          if (optionsError) throw optionsError
        }
      }

      alert("Questions saved successfully!")
      router.push("/admin/quizzes")
    } catch (error) {
      console.error("Error saving questions:", error)
      alert("Failed to save questions. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/quizzes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Add Questions</h1>
            <p className="text-muted-foreground text-lg">{quiz.title}</p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, questionIndex) => (
            <Card key={questionIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Question {questionIndex + 1}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => removeQuestion(questionIndex)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Question Type</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(value: "multiple_choice" | "true_false" | "short_answer") =>
                        updateQuestion(questionIndex, "question_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Content Type</Label>
                    <Select
                      value={question.content_type}
                      onValueChange={(value: "text" | "image") => updateQuestion(questionIndex, "content_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            Text Question
                          </div>
                        </SelectItem>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Image Question
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Question Content */}
                {question.content_type === "text" ? ( // Use content_type instead of question_type
                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(questionIndex, "question_text", e.target.value)}
                      placeholder="Enter your question here..."
                      rows={3}
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Question Image URL</Label>
                    <Input
                      value={question.question_image_url}
                      onChange={(e) => updateQuestion(questionIndex, "question_image_url", e.target.value)}
                      placeholder="Enter image URL..."
                    />
                  </div>
                )}

                {/* Points and Explanation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(questionIndex, "points", Number.parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <Label>Explanation (Optional)</Label>
                    <Input
                      value={question.explanation}
                      onChange={(e) => updateQuestion(questionIndex, "explanation", e.target.value)}
                      placeholder="Explain the correct answer..."
                    />
                  </div>
                </div>

                {/* Options - Only show for multiple choice and true/false */}
                {(question.question_type === "multiple_choice" || question.question_type === "true_false") && (
                  <div>
                    <Label>Answer Options</Label>
                    <div className="space-y-3 mt-2">
                      {question.options.slice(0, question.question_type === "true_false" ? 2 : 4).map(
                        (
                          option,
                          optionIndex, // Show 2 options for true/false, 4 for multiple choice
                        ) => (
                          <div key={optionIndex} className="flex items-center gap-3 p-3 border rounded-lg">
                            <input
                              type="radio"
                              name={`question-${questionIndex}`}
                              checked={option.is_correct}
                              onChange={() => updateOption(questionIndex, optionIndex, "is_correct", true)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <Select
                                value={option.option_type}
                                onValueChange={(value: "text" | "image") =>
                                  updateOption(questionIndex, optionIndex, "option_type", value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="image">Image</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              {option.option_type === "text" ? (
                                <Input
                                  value={option.option_text}
                                  onChange={(e) =>
                                    updateOption(questionIndex, optionIndex, "option_text", e.target.value)
                                  }
                                  placeholder={
                                    question.question_type === "true_false"
                                      ? optionIndex === 0
                                        ? "True"
                                        : "False"
                                      : `Option ${optionIndex + 1}...`
                                  } // Different placeholders for true/false
                                />
                              ) : (
                                <Input
                                  value={option.option_image_url}
                                  onChange={(e) =>
                                    updateOption(questionIndex, optionIndex, "option_image_url", e.target.value)
                                  }
                                  placeholder="Image URL..."
                                />
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Short Answer - No options needed */}
                {question.question_type === "short_answer" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Short answer questions don't require predefined options. Students will type their answers
                      directly.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add Question Button */}
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Button onClick={addQuestion} variant="outline" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button onClick={saveQuestions} disabled={saving} className="flex-1">
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 w-4 h-4" />
                  Save Questions
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/quizzes">Cancel</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
