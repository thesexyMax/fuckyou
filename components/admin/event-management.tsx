"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, MapPin, ExternalLink, Trash2, Eye, Star } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface Event {
  id: string
  title: string
  description: string
  location: string
  event_date: string
  max_attendees: number
  image_url?: string
  social_links: any
  event_id_suffix: string
  is_featured: boolean
  created_by: string
  creator: {
    full_name: string
    username: string
    avatar_url?: string
  }
  registrations: { count: number }[]
  _count?: {
    registrations: number
  }
}

interface EventManagementProps {
  currentUserId: string
}

export default function EventManagement({ currentUserId }: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:users!events_created_by_fkey(full_name, username, avatar_url),
          registrations:event_registrations(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const processedEvents =
        data?.map((event) => ({
          ...event,
          _count: {
            registrations: event.registrations?.[0]?.count || 0,
          },
        })) || []

      setEvents(processedEvents)
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFeatured = async (eventId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("events").update({ is_featured: !currentStatus }).eq("id", eventId)

      if (error) throw error

      setEvents(events.map((event) => (event.id === eventId ? { ...event, is_featured: !currentStatus } : event)))
    } catch (error) {
      console.error("Error updating featured status:", error)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId)

      if (error) throw error

      setEvents(events.filter((event) => event.id !== eventId))
    } catch (error) {
      console.error("Error deleting event:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif font-bold text-2xl">Event Management</h2>
        <Button asChild>
          <Link href="/events/create">Create New Event</Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    {event.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(event.event_date), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {event._count?.registrations || 0} / {event.max_attendees} registered
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleFeatured(event.id, event.is_featured)}>
                    <Star className={`w-4 h-4 ${event.is_featured ? "fill-current" : ""}`} />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/event/${event.title.toLowerCase().replace(/\s+/g, "-")}-${event.event_id_suffix}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteEvent(event.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description:</p>
                  <p className="text-sm line-clamp-3">{event.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Created by:</p>
                  <div className="flex items-center gap-2">
                    {event.creator.avatar_url && (
                      <img
                        src={event.creator.avatar_url || "/placeholder.svg"}
                        alt={event.creator.full_name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium">{event.creator.full_name}</span>
                    <span className="text-xs text-muted-foreground">@{event.creator.username}</span>
                  </div>
                </div>
              </div>

              {event.social_links && Object.keys(event.social_links).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Social Links:</p>
                  <div className="flex gap-2">
                    {Object.entries(event.social_links).map(([platform, url]) => (
                      <Button key={platform} variant="outline" size="sm" asChild>
                        <a href={url as string} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {platform}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif font-bold text-xl mb-2">No events created yet</h3>
            <p className="text-muted-foreground mb-6">Start by creating your first campus event.</p>
            <Button asChild>
              <Link href="/events/create">Create First Event</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
