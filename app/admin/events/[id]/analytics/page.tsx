"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, Users, Calendar, TrendingUp } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

export default function EventAnalyticsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [analytics, setAnalytics] = useState({
    totalRegistrations: 0,
    maxAttendees: 0,
    registrationRate: 0,
    daysUntilEvent: 0,
  })
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
    await loadData()
    setLoading(false)
  }

  const loadData = async () => {
    try {
      // Get event details
      const { data: eventData } = await supabase.from("events").select("*").eq("id", params.id).single()

      if (!eventData) {
        router.push("/admin/events")
        return
      }

      setEvent(eventData)

      // Get registrations count
      const { count: totalRegistrations } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", params.id)

      const eventDate = new Date(eventData.event_date)
      const today = new Date()
      const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      setAnalytics({
        totalRegistrations: totalRegistrations || 0,
        maxAttendees: eventData.max_attendees || 0,
        registrationRate: eventData.max_attendees > 0 ? ((totalRegistrations || 0) / eventData.max_attendees) * 100 : 0,
        daysUntilEvent,
      })
    } catch (error) {
      console.error("Error loading analytics:", error)
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/admin/events">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Events Management
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">Event Analytics</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <Badge variant="secondary">Registered</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.totalRegistrations}</div>
              <p className="text-sm text-muted-foreground">Total Registrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-green-600" />
                <Badge variant="secondary">Capacity</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.maxAttendees}</div>
              <p className="text-sm text-muted-foreground">Max Attendees</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <Badge variant="secondary">Fill Rate</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.registrationRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Registration Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-orange-600" />
                <Badge variant="secondary">Countdown</Badge>
              </div>
              <div className="text-2xl font-bold">{analytics.daysUntilEvent}</div>
              <p className="text-sm text-muted-foreground">Days Until Event</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Event Date</span>
                  <Badge>{new Date(event.event_date).toLocaleDateString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Location</span>
                  <Badge>{event.location || "TBD"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Registration Deadline</span>
                  <Badge>
                    {event.registration_deadline
                      ? new Date(event.registration_deadline).toLocaleDateString()
                      : "No deadline"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Created</span>
                  <Badge>{new Date(event.created_at).toLocaleDateString()}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Available Spots</span>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.max(0, analytics.maxAttendees - analytics.totalRegistrations)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Waitlist</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {Math.max(0, analytics.totalRegistrations - analytics.maxAttendees)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge
                    className={
                      analytics.daysUntilEvent < 0
                        ? "bg-gray-100 text-gray-800"
                        : analytics.registrationRate >= 100
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }
                  >
                    {analytics.daysUntilEvent < 0 ? "Past Event" : analytics.registrationRate >= 100 ? "Full" : "Open"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
