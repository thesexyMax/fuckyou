"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import EventForm from "@/components/events/event-form"
import { Shield, AlertTriangle } from "lucide-react"
import { getUserFromStorage } from "@/lib/client-auth"
import { Card, CardContent } from "@/components/ui/card"

export default function CreateEventPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      console.log("🔍 Events/Create - Starting auth check...")
      const currentUser = await getUserFromStorage()
      console.log("👤 Events/Create - User data:", currentUser)

      if (!currentUser) {
        console.log("❌ Events/Create - No user found, redirecting to login")
        router.push("/auth/login")
        return
      }

      if (!currentUser.is_admin) {
        console.log("🚫 Events/Create - User is not admin")
        setError("Only administrators can create events.")
        setLoading(false)
        return
      }

      if (currentUser.banned_from_events || currentUser.is_banned) {
        console.log("🚫 Events/Create - User is banned from events")
        setError("You are banned from creating events.")
        setLoading(false)
        return
      }

      console.log("✅ Events/Create - Admin access granted")
      setUser(currentUser)
      setLoading(false)
    }

    checkAuth()
  }, [router])

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif font-bold text-xl text-destructive mb-2">Access Denied</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) return null

  console.log("🎉 Events/Create - Admin access granted, showing form")
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Create New Event</h1>
          </div>
          <p className="text-muted-foreground text-lg">Create and organize campus events for the community.</p>
        </div>

        <EventForm userId={user.id} isAdmin={user.is_admin} />
      </main>
    </div>
  )
}
