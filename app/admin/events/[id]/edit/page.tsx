"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import EventForm from "@/components/events/event-form"

export default function EditEventPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getUserFromStorage()
    if (!currentUser || !currentUser.is_admin) {
      router.push("/dashboard")
      return
    }
    setUser(currentUser)
    await loadEvent()
    setLoading(false)
  }

  const loadEvent = async () => {
    try {
      const { data: eventData } = await supabase.from("events").select("*").eq("id", params.id).single()

      if (!eventData) {
        router.push("/admin/events")
        return
      }

      setEvent(eventData)
    } catch (error) {
      console.error("Error loading event:", error)
      router.push("/admin/events")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !event) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/admin/events">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Events Management
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-2">Edit Event</h1>
          <p className="text-muted-foreground">Update event details and settings</p>
        </div>

        <EventForm userId={user.id} initialData={event} isEditing={true} />
      </main>
    </div>
  )
}
