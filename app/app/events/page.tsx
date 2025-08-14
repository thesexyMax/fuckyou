"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Plus, Search, MapPin, Users, Clock } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import { getUserFromStorage } from "@/lib/client-auth"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import BanCheck from "@/components/ban-check"

export default function EventsPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  const [user, setUser] = useState(null)
  const [allEvents, setAllEvents] = useState([])
  const [registeredEvents, setRegisteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.search || "")
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getUserFromStorage()
      setUser(currentUser)

      const supabase = createClient()

      let query = supabase
        .from("events")
        .select(`
          *,
          creator:users!events_created_by_fkey(full_name, avatar_url, is_admin),
          registrations:event_registrations(count)
        `)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`,
        )
      }

      const { data: eventsData, error } = await query

      if (error) {
        console.error("Error fetching events:", error)
        setAllEvents([])
        setLoading(false)
        return
      }

      // Get user registrations if user is logged in
      let userRegistrations: any[] = []
      if (currentUser) {
        const { data } = await supabase.from("event_registrations").select("event_id").eq("user_id", currentUser.id)
        userRegistrations = data || []
      }

      // Process events to add registration status
      const processedEvents = eventsData?.map((event) => ({
        ...event,
        registrations_count: event.registrations?.[0]?.count || 0,
        is_registered: currentUser ? userRegistrations.some((reg) => reg.event_id === event.id) : false,
        is_creator: currentUser ? event.created_by === currentUser.id : false,
      }))

      setAllEvents(processedEvents || [])

      if (currentUser) {
        const userRegisteredEvents = processedEvents?.filter((event) => event.is_registered || event.is_creator) || []
        setRegisteredEvents(userRegisteredEvents)
      }

      setLoading(false)
    }

    loadData()
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const search = formData.get("search") as string
    setSearchQuery(search)

    // Update URL without page reload
    const url = new URL(window.location.href)
    if (search) {
      url.searchParams.set("search", search)
    } else {
      url.searchParams.delete("search")
    }
    window.history.pushState({}, "", url.toString())
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const EventsList = ({ events, showRegistrationButton = true }) => (
    <div className="space-y-4">
      {events.map((event, index) => (
        <Card key={event.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] cursor-pointer">
          <Link href={`/events/${event.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-xl text-foreground hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{formatDate(event.event_date)}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                </div>
                <div className="ml-4 text-right flex flex-col gap-2">
                  {event.max_attendees && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round((event.registrations_count / event.max_attendees) * 100)}% filled
                    </Badge>
                  )}
                  {user && showRegistrationButton && (
                    <Button size="sm" variant={event.is_registered ? "outline" : "default"}>
                      {event.is_registered ? "Registered" : "Register"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(event.event_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {event.max_attendees
                    ? `${event.registrations_count}/${event.max_attendees}`
                    : `${event.registrations_count} registered`}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {event.creator?.avatar_url ? (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={event.creator.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{event.creator.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {event.creator?.full_name?.charAt(0) || "A"}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">by {event.creator?.full_name || "Admin"}</span>
                  {event.creator?.is_admin && (
                    <Badge variant="outline" className="text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  )

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

  return (
    <BanCheck>
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        {user && <DashboardHeader user={user} />}

        {!user && (
          <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="font-serif font-bold text-xl text-foreground">
                Campus Connect
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/events" className="text-primary font-medium">
                  Events
                </Link>
                <Link href="/apps" className="text-muted-foreground hover:text-primary">
                  Apps
                </Link>
                <Button asChild variant="outline" size="sm">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </nav>
        )}

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-2">Campus Events</h1>
              <p className="text-muted-foreground text-lg">Discover and join exciting events in your community</p>
            </div>
            {user && user.is_admin && (
              <Button
                asChild
                className="bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
              >
                <Link href="/events/create">
                  <Plus className="mr-2 w-4 h-4" />
                  Create Event
                </Link>
              </Button>
            )}
          </div>

          {!user && (
            <Card className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <h3 className="font-serif font-bold text-lg mb-2">Join the Community</h3>
                <p className="text-muted-foreground mb-4">Sign in to create events and register for activities</p>
                <Button asChild>
                  <Link href="/auth/login">Sign In to Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search events by title, description, or location..."
                    defaultValue={searchQuery}
                    className="pl-10"
                    name="search"
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>
            </CardContent>
          </Card>

          {user ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="registered">Registered Events</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {allEvents && allEvents.length > 0 ? (
                  <EventsList events={allEvents} />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-serif font-bold text-xl mb-2">No events found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery
                          ? "Try adjusting your search terms or browse all events."
                          : "Be the first to create an event for your community!"}
                      </p>
                      {user.is_admin && (
                        <Button asChild>
                          <Link href="/events/create">
                            <Plus className="mr-2 w-4 h-4" />
                            Create First Event
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="registered">
                {registeredEvents && registeredEvents.length > 0 ? (
                  <EventsList events={registeredEvents} showRegistrationButton={false} />
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-serif font-bold text-xl mb-2">No registered events</h3>
                      <p className="text-muted-foreground mb-6">
                        You haven't registered for any events yet. Browse all events to find something interesting!
                      </p>
                      <Button asChild>
                        <Link href="#" onClick={() => document.querySelector('[value="all"]')?.click()}>
                          Browse All Events
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : allEvents && allEvents.length > 0 ? (
            <EventsList events={allEvents} showRegistrationButton={false} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif font-bold text-xl mb-2">No events found</h3>
                <p className="text-muted-foreground mb-6">Sign in to create and join events in your community!</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </BanCheck>
  )
}
