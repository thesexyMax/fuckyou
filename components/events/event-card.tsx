import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Users, Clock } from "lucide-react"
import Link from "next/link"
import type { Event } from "@/lib/types"
import { formatDateIST, formatTimeIST } from "@/lib/date-utils"

interface EventCardProps {
  event: Event & {
    creator?: { full_name?: string; avatar_url?: string }
    registrations_count?: number
    is_registered?: boolean
  }
  currentUserId: string
}

export default function EventCard({ event, currentUserId }: EventCardProps) {
  const creatorInitials = event.creator?.full_name
    ? event.creator.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const isCreator = event.created_by === currentUserId

  const capacityPercentage = event.max_attendees
    ? Math.round(((event.registrations_count || 0) / event.max_attendees) * 100)
    : 0

  const getCapacityColor = () => {
    if (capacityPercentage >= 90) return "text-red-600"
    if (capacityPercentage >= 70) return "text-orange-600"
    return "text-green-600"
  }

  const eventDate = event.event_date || event.date

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-serif font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1 pr-2">
              {event.title}
            </h3>
            <div className="flex flex-col gap-1 flex-shrink-0">
              {event.is_registered && <Badge className="bg-primary text-primary-foreground text-xs">Registered</Badge>}
              {isCreator && (
                <Badge variant="secondary" className="text-xs">
                  Your Event
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{eventDate ? formatDateIST(eventDate) : "Date TBD"}</span>
              <Clock className="w-4 h-4 ml-2 flex-shrink-0" />
              <span>{eventDate ? formatTimeIST(eventDate) : "Time TBD"}</span>
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className={getCapacityColor()}>
                {event.registrations_count || 0}
                {event.max_attendees && (
                  <>
                    /{event.max_attendees} ({capacityPercentage}%)
                  </>
                )}
              </span>
              {event.max_attendees && event.registrations_count && event.registrations_count >= event.max_attendees && (
                <Badge variant="destructive" className="text-xs ml-auto">
                  Full
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={event.creator?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{creatorInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              Published by {event.creator?.full_name || "Anonymous"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
