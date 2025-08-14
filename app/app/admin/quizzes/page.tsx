"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Plus, Search, Clock, Users, ArrowLeft, Eye, Edit, Trash2, Play, Pause } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Quiz {
  id: string
  title: string
  description: string
  quiz_type: "live" | "unlive"
  duration_minutes: number
  start_time?: string
  end_time?: string
  is_published: boolean
  is_active: boolean
  created_at: string
  course: { name: string; code: string }
  _count: { attempts: number; questions: number }
}

interface Course {
  id: string
  name: string
  code: string
}

export default function QuizManagementPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCourse, setFilterCourse] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [actionLoading, setActionLoading] = useState(false)

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
      await Promise.all([fetchQuizzes(), fetchCourses()])
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          course:courses(name, code),
          attempts:quiz_attempts(count),
          questions:quiz_questions(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const processedQuizzes =
        data?.map((quiz) => ({
          ...quiz,
          _count: {
            attempts: quiz.attempts?.[0]?.count || 0,
            questions: quiz.questions?.[0]?.count || 0,
          },
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

  const toggleQuizStatus = async (quizId: string, field: "is_published" | "is_active", currentValue: boolean) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ [field]: !currentValue })
        .eq("id", quizId)

      if (error) throw error
      await fetchQuizzes()
    } catch (error) {
      console.error(`Error updating quiz ${field}:`, error)
      alert(`Failed to update quiz. Please try again.`)
    } finally {
      setActionLoading(false)
    }
  }

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", quizId)

      if (error) throw error
      await fetchQuizzes()
    } catch (error) {
      console.error("Error deleting quiz:", error)
      alert("Failed to delete quiz. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.course?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCourse = filterCourse === "all" || quiz.course?.code === filterCourse
    const matchesType = filterType === "all" || quiz.quiz_type === filterType

    return matchesSearch && matchesCourse && matchesType
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date
      .toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/\//g, "-")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading quiz management...</p>
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Quiz Management</h1>
            <p className="text-muted-foreground text-lg">Create and manage quizzes for your courses</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{quizzes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{quizzes.filter((q) => q.is_published).length}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{quizzes.filter((q) => q.quiz_type === "live").length}</p>
                  <p className="text-sm text-muted-foreground">Live Quizzes</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{quizzes.reduce((sum, q) => sum + q._count.attempts, 0)}</p>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/admin/quizzes/create">
              <Plus className="mr-2 w-4 h-4" />
              Create New Quiz
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/courses">
              <BookOpen className="mr-2 w-4 h-4" />
              Manage Courses
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="live">Live Quizzes</SelectItem>
                  <SelectItem value="unlive">Unlive Quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quizzes List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Quizzes ({filteredQuizzes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-lg">{quiz.title}</h3>
                      <Badge variant={quiz.quiz_type === "live" ? "default" : "secondary"}>
                        {quiz.quiz_type === "live" ? "Live" : "Unlive"}
                      </Badge>
                      <Badge variant={quiz.is_published ? "default" : "outline"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                      {!quiz.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{quiz.description}</p>
                      <div className="flex items-center gap-4">
                        <span>Course: {quiz.course?.name}</span>
                        <span>Duration: {quiz.duration_minutes} min</span>
                        <span>Questions: {quiz._count.questions}</span>
                        <span>Attempts: {quiz._count.attempts}</span>
                      </div>
                      {quiz.quiz_type === "live" && quiz.start_time && <p>Starts: {formatDateTime(quiz.start_time)}</p>}
                      {quiz.quiz_type === "unlive" && quiz.end_time && <p>Deadline: {formatDateTime(quiz.end_time)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuizStatus(quiz.id, "is_published", quiz.is_published)}
                      disabled={actionLoading}
                    >
                      {quiz.is_published ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/quizzes/${quiz.id}/results`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuiz(quiz.id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredQuizzes.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif font-bold text-xl mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filterCourse !== "all" || filterType !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first quiz to get started."}
                  </p>
                  <Button asChild>
                    <Link href="/admin/quizzes/create">
                      <Plus className="mr-2 w-4 h-4" />
                      Create First Quiz
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
