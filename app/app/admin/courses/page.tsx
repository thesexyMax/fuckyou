"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BookOpen, Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface Course {
  id: string
  name: string
  description: string
  code: string
  created_at: string
  _count: { quizzes: number }
}

export default function CoursesManagementPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
  })
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
      await fetchCourses()
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          quizzes:quizzes(count)
        `)
        .order("name")

      if (error) throw error

      const processedCourses =
        data?.map((course) => ({
          ...course,
          _count: {
            quizzes: course.quizzes?.[0]?.count || 0,
          },
        })) || []

      setCourses(processedCourses)
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.code) {
      alert("Please fill in all required fields")
      return
    }

    setActionLoading(true)
    try {
      if (editingCourse) {
        // Update existing course
        const { error } = await supabase
          .from("courses")
          .update({
            name: formData.name,
            description: formData.description,
            code: formData.code.toUpperCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCourse.id)

        if (error) throw error
      } else {
        // Create new course
        const { error } = await supabase.from("courses").insert([
          {
            name: formData.name,
            description: formData.description,
            code: formData.code.toUpperCase(),
            created_by: user?.id,
          },
        ])

        if (error) throw error
      }

      await fetchCourses()
      setIsDialogOpen(false)
      setEditingCourse(null)
      setFormData({ name: "", description: "", code: "" })
    } catch (error) {
      console.error("Error saving course:", error)
      alert("Failed to save course. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      description: course.description || "",
      code: course.code,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This will also delete all associated quizzes.")) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseId)

      if (error) throw error
      await fetchCourses()
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", code: "" })
    setEditingCourse(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading courses...</p>
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/quizzes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Course Management</h1>
            <p className="text-muted-foreground text-lg">Organize your quizzes by courses</p>
          </div>
        </div>

        {/* Add Course Button */}
        <div className="mb-6">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 w-4 h-4" />
                Add New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Course Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Course Code *</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., CS"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the course"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading ? "Saving..." : editingCourse ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{course.code}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(course)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{course.description || "No description provided"}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {course._count.quizzes} quiz{course._count.quizzes !== 1 ? "es" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(course.created_at).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif font-bold text-xl mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-6">Create your first course to organize your quizzes.</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 w-4 h-4" />
                    Create First Course
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
