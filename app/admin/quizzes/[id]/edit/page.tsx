"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Edit, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Course {
  id: string
  name: string
  code: string
}

interface QuizFormData {
  title: string
  description: string
  course_id: string
  quiz_type: "live" | "unlive"
  password: string
  duration_minutes: number
  start_time: string
  end_time: string
  login_window_minutes: number
  instructions: string
  show_results_immediately: boolean
  show_correct_answers: boolean
  allow_review: boolean
  max_attempts: number
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
    course_id: "",
    quiz_type: "unlive",
    password: "",
    duration_minutes: 60,
    start_time: "",
    end_time: "",
    login_window_minutes: 10,
    instructions: "",
    show_results_immediately: true,
    show_correct_answers: true,
    allow_review: true,
    max_attempts: 1,
  })

  const router = useRouter()
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
      await Promise.all([fetchCourses(), fetchQuiz()])
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
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

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", params.id).single()

      if (error) throw error

      const { count } = await supabase
        .from("quiz_questions")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", params.id)

      setQuestionCount(count || 0)

      const { convertUTCToISTForInput } = await import("@/lib/date-utils")

      setFormData({
        title: data.title || "",
        description: data.description || "",
        course_id: data.course_id || "",
        quiz_type: data.quiz_type || "unlive",
        password: data.password || "",
        duration_minutes: data.duration_minutes || 60,
        start_time: convertUTCToISTForInput(data.start_time),
        end_time: convertUTCToISTForInput(data.end_time),
        login_window_minutes: data.login_window_minutes || 10,
        instructions: data.instructions || "",
        show_results_immediately: data.show_results_immediately ?? true,
        show_correct_answers: data.show_correct_answers ?? true,
        allow_review: data.allow_review ?? true,
        max_attempts: data.max_attempts || 1,
      })
    } catch (error) {
      console.error("Error fetching quiz:", error)
      alert("Failed to load quiz data. Please try again.")
    }
  }

  const handleInputChange = (field: keyof QuizFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    handleInputChange("password", password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.course_id || !formData.password) {
      alert("Please fill in all required fields")
      return
    }

    if (formData.quiz_type === "live" && !formData.start_time) {
      alert("Start time is required for live quizzes")
      return
    }

    if (formData.quiz_type === "unlive" && !formData.end_time) {
      alert("Deadline is required for unlive quizzes")
      return
    }

    setSaving(true)
    try {
      const { convertISTToUTC } = await import("@/lib/date-utils")

      const quizData = {
        ...formData,
        start_time: convertISTToUTC(formData.start_time),
        end_time: convertISTToUTC(formData.end_time),
      }

      const { error } = await supabase.from("quizzes").update(quizData).eq("id", params.id)

      if (error) throw error

      alert("Quiz updated successfully!")
      router.push("/admin/quizzes")
    } catch (error) {
      console.error("Error updating quiz:", error)
      alert("Failed to update quiz. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/quizzes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Edit Quiz</h1>
            <p className="text-muted-foreground text-lg">Update quiz settings and configuration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter quiz title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the quiz"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="course">Course *</Label>
                <Select value={formData.course_id} onValueChange={(value) => handleInputChange("course_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Type and Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Type and Timing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quiz_type">Quiz Type</Label>
                <Select
                  value={formData.quiz_type}
                  onValueChange={(value: "live" | "unlive") => handleInputChange("quiz_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Quiz (Synchronized start time)</SelectItem>
                    <SelectItem value="unlive">Unlive Quiz (Flexible timing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange("duration_minutes", Number.parseInt(e.target.value))}
                  min="1"
                  max="300"
                />
              </div>

              {formData.quiz_type === "live" && (
                <>
                  <div>
                    <Label htmlFor="start_time">Start Time (IST)</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange("start_time", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time will be saved in Indian Standard Time (IST)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="login_window">Login Window (minutes before start)</Label>
                    <Input
                      id="login_window"
                      type="number"
                      value={formData.login_window_minutes}
                      onChange={(e) => handleInputChange("login_window_minutes", Number.parseInt(e.target.value))}
                      min="1"
                      max="60"
                    />
                  </div>
                </>
              )}

              {formData.quiz_type === "unlive" && (
                <div>
                  <Label htmlFor="end_time">Deadline (IST)</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange("end_time", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deadline will be saved in Indian Standard Time (IST)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security and Access */}
          <Card>
            <CardHeader>
              <CardTitle>Security and Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="password">Quiz Password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Enter quiz password"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="max_attempts">Maximum Attempts</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => handleInputChange("max_attempts", Number.parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Instructions and Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions and Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instructions">Instructions for Students</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange("instructions", e.target.value)}
                  placeholder="Enter instructions that will be shown before the quiz starts"
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_results"
                    checked={formData.show_results_immediately}
                    onCheckedChange={(checked) => handleInputChange("show_results_immediately", checked)}
                  />
                  <Label htmlFor="show_results">Show results immediately after submission</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_answers"
                    checked={formData.show_correct_answers}
                    onCheckedChange={(checked) => handleInputChange("show_correct_answers", checked)}
                  />
                  <Label htmlFor="show_answers">Show correct answers in results</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow_review"
                    checked={formData.allow_review}
                    onCheckedChange={(checked) => handleInputChange("allow_review", checked)}
                  />
                  <Label htmlFor="allow_review">Allow students to review their answers</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                "Updating..."
              ) : (
                <>
                  <Save className="mr-2 w-4 h-4" />
                  Update Quiz
                </>
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/quizzes">Cancel</Link>
            </Button>
          </div>
        </form>

        {/* Question Management Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Question Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  This quiz currently has <span className="font-semibold text-foreground">{questionCount}</span>{" "}
                  question{questionCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">Add, edit, or remove questions for this quiz</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/quizzes/${params.id}/questions`}>
                    <Edit className="mr-2 w-4 h-4" />
                    Manage Questions
                  </Link>
                </Button>
                {questionCount === 0 && (
                  <Button asChild>
                    <Link href={`/admin/quizzes/${params.id}/questions`}>
                      <Plus className="mr-2 w-4 h-4" />
                      Add Questions
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
