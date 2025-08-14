"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, BarChart3, Edit, Ban, CheckCircle } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import EventRegistrationButton from "@/components/events/event-registration-button"
import EventForm from "@/components/events/event-form"
import { getUserFromStorage } from "@/lib/client-auth"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [attendeesOpen, setAttendeesOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getUserFromStorage()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser)

      const { data: eventData } = await supabase
        .from("events")
        .select(`
          *,
          creator:users!events_created_by_fkey(full_name, avatar_url, student_id),
          registrations:event_registrations(
            user_id,
            registered_at,
            checked_in,
            checked_in_at,
            user:users(full_name, avatar_url, student_id)
          )
        `)
        .eq("id", params.id)
        .single()

      if (!eventData) {
        router.push("/events")
        return
      }

      const userRegistration = eventData.registrations?.find((reg: any) => reg.user_id === currentUser.id)
      const isCurrentlyRegistered = !!userRegistration
      setIsRegistered(isCurrentlyRegistered)

      const isCreator = eventData.created_by === currentUser.id

      if (isCreator && !isCurrentlyRegistered) {
        await supabase.from("event_registrations").insert([
          {
            event_id: eventData.id,
            user_id: currentUser.id,
          },
        ])

        const { data: updatedEventData } = await supabase
          .from("events")
          .select(`
            *,
            creator:users!events_created_by_fkey(full_name, avatar_url, student_id),
            registrations:event_registrations(
              user_id,
              registered_at,
              checked_in,
              checked_in_at,
              user:users(full_name, avatar_url, student_id)
            )
          `)
          .eq("id", params.id)
          .single()

        setEvent(updatedEventData)
        setIsRegistered(true)
      } else {
        setEvent(eventData)
      }

      setLoading(false)
    }

    loadData()
  }, [params.id, router])

  const refreshRegistrationStatus = async () => {
    if (!user) return

    const { data: registration } = await supabase
      .from("event_registrations")
      .select("user_id, checked_in")
      .eq("event_id", params.id)
      .eq("user_id", user.id)
      .single()

    setIsRegistered(!!registration)

    const { data: eventData } = await supabase
      .from("events")
      .select(`
        *,
        creator:users!events_created_by_fkey(full_name, avatar_url, student_id),
        registrations:event_registrations(
          user_id,
          registered_at,
          checked_in,
          checked_in_at,
          user:users(full_name, avatar_url, student_id)
        )
      `)
      .eq("id", params.id)
      .single()

    if (eventData) {
      setEvent(eventData)
    }
  }

  const generateAvatarUrl = (name: string) => {
    if (!name) return ""
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=128`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatCheckInTime = (dateString: string) => {
    const date = new Date(dateString)
    const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000) // Convert to IST
    return {
      date: istDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: istDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user || !event) return null

  const registrationsCount = event.registrations?.length || 0
  const checkedInCount = event.registrations?.filter((reg: any) => reg.checked_in).length || 0
  const isCreator = event.created_by === user.id
  const isAdmin = user.is_admin
  const userRegistration = event.registrations?.find((reg: any) => reg.user_id === user.id)
  const isUserCheckedIn = userRegistration?.checked_in || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/events">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Events
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                {event.image_url && (
                  <img
                    src={event.image_url || "/placeholder.svg"}
                    alt={event.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-4">{event.title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>
                      {new Date(event.event_date).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      IST
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{registrationsCount} registered</span>
                  </div>
                </div>

                {event.description && (
                  <div className="prose prose-gray max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {event.registrations && event.registrations.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-xl">
                      Attendees ({registrationsCount})
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        • {checkedInCount} checked in
                      </span>
                    </CardTitle>
                    {registrationsCount > 3 && (
                      <Sheet open={attendeesOpen} onOpenChange={setAttendeesOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            Show All
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="font-serif">All Attendees ({registrationsCount})</SheetTitle>
                            <SheetDescription>Everyone registered for this event</SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-4">
                            {event.registrations.map((registration: any) => {
                              const attendeeInitials = registration.user?.full_name
                                ? registration.user.full_name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "U"

                              return (
                                <div
                                  key={registration.user_id}
                                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={
                                        registration.user?.avatar_url || generateAvatarUrl(registration.user?.full_name)
                                      }
                                    />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {attendeeInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                      {registration.user?.full_name || "Anonymous"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Registered {formatDate(registration.registered_at)}
                                      {registration.checked_in && (
                                        <span className="text-green-600 ml-2">
                                          • Checked in {formatCheckInTime(registration.checked_in_at).date} at{" "}
                                          {formatCheckInTime(registration.checked_in_at).time}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  {registration.checked_in && (
                                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                      ✓ Checked In
                                    </Badge>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {event.registrations.slice(0, 3).map((registration: any) => {
                      const attendeeInitials = registration.user?.full_name
                        ? registration.user.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                        : "U"

                      return (
                        <div key={registration.user_id} className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={registration.user?.avatar_url || generateAvatarUrl(registration.user?.full_name)}
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {attendeeInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {registration.user?.full_name || "Anonymous"}
                            </p>
                            {registration.checked_in && (
                              <div className="space-y-1">
                                <Badge
                                  variant="default"
                                  className="bg-green-100 text-green-800 border-green-200 text-xs"
                                >
                                  ✓ Checked In
                                </Badge>
                                <p className="text-xs text-green-600">
                                  {formatCheckInTime(registration.checked_in_at).date} at{" "}
                                  {formatCheckInTime(registration.checked_in_at).time}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {event.max_attendees && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Capacity</span>
                      <Badge variant={registrationsCount >= event.max_attendees ? "destructive" : "secondary"}>
                        {registrationsCount}/{event.max_attendees}
                      </Badge>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Checked In</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      {checkedInCount}/{registrationsCount}
                    </Badge>
                  </div>

                  {isUserCheckedIn && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        <span>✅ Checked In Successfully</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        You checked in on {formatCheckInTime(userRegistration.checked_in_at).date} at{" "}
                        {formatCheckInTime(userRegistration.checked_in_at).time}
                      </p>
                    </div>
                  )}

                  {isCreator || isAdmin ? (
                    <div className="space-y-2">
                      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
                        <SheetTrigger asChild>
                          <Button className="w-full bg-primary hover:bg-accent">
                            <BarChart3 className="mr-2 w-4 h-4" />
                            View Event Stats
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="font-serif">Event Statistics</SheetTitle>
                            <SheetDescription>Detailed analytics for your event</SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">{registrationsCount}</div>
                                <div className="text-sm text-muted-foreground">Total Registrations</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                  {event.max_attendees && registrationsCount !== undefined
                                    ? Math.round((registrationsCount / event.max_attendees) * 100)
                                    : registrationsCount > 0
                                      ? 100
                                      : 0}
                                  %
                                </div>
                                <div className="text-sm text-muted-foreground">Capacity Filled</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                  {event.event_date
                                    ? Math.max(
                                        0,
                                        Math.ceil(
                                          (new Date(event.event_date).getTime() - new Date().getTime()) /
                                            (1000 * 60 * 60 * 24),
                                        ),
                                      )
                                    : 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Days Until Event</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                  {event.event_date && new Date(event.event_date) > new Date() ? "Active" : "Past"}
                                </div>
                                <div className="text-sm text-muted-foreground">Event Status</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">{checkedInCount}</div>
                                <div className="text-sm text-muted-foreground">Checked In</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                  {registrationsCount > 0 ? Math.round((checkedInCount / registrationsCount) * 100) : 0}
                                  %
                                </div>
                                <div className="text-sm text-muted-foreground">Attendance Rate</div>
                              </div>
                            </div>

                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Registration Timeline</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {event.registrations?.slice(0, 10).map((registration: any, index: number) => (
                                    <div key={registration.user_id} className="flex items-center gap-3 text-sm">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium">{registration.user?.full_name}</span>
                                        <span className="text-muted-foreground ml-2">
                                          {formatDate(registration.registered_at)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </SheetContent>
                      </Sheet>

                      <Sheet open={editOpen} onOpenChange={setEditOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full bg-transparent">
                            <Edit className="mr-2 w-4 h-4" />
                            Edit Event
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="font-serif">Edit Event</SheetTitle>
                            <SheetDescription>Update your event details</SheetDescription>
                          </SheetHeader>
                          <div className="mt-6">
                            <EventForm
                              userId={user.id}
                              isAdmin={isAdmin}
                              eventId={event.id}
                              onSuccess={() => {
                                setEditOpen(false)
                                window.location.reload()
                              }}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  ) : user.is_banned ? (
                    <div className="space-y-2">
                      <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-center">
                        <Ban className="w-8 h-8 text-destructive mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          You cannot participate in events while your account is banned.
                        </p>
                      </div>
                    </div>
                  ) : (
                    !isUserCheckedIn && (
                      <EventRegistrationButton
                        eventId={event.id}
                        isRegistered={isRegistered}
                        isCreator={isCreator}
                        isFull={event.max_attendees ? registrationsCount >= event.max_attendees : false}
                        canRegister={true}
                        userId={user.id}
                        onRegistrationChange={refreshRegistrationStatus}
                      />
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Event Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={event.creator?.avatar_url || generateAvatarUrl(event.creator?.full_name)} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {event.creator?.full_name
                        ? event.creator.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{event.creator?.full_name || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{event.creator?.student_id || "Event Organizer"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm text-foreground">{formatDate(event.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="outline">Campus Event</Badge>
                </div>
                {event.max_attendees && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Attendees</span>
                    <span className="text-sm text-foreground">{event.max_attendees}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
