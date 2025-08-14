"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, CheckCircle, Calendar, MapPin, Users, ImageIcon, Link, Star, Plus, X, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EventFormProps {
  userId: string
  isAdmin?: boolean
  eventId?: string // For editing existing events
  initialData?: any // Pre-loaded event data for editing
  isEditing?: boolean // Explicit editing flag
  onSuccess?: () => void // Callback for sidebar close
}

export default function EventForm({
  userId,
  isAdmin = false,
  eventId,
  initialData,
  isEditing = false,
  onSuccess,
}: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editMode, setEditMode] = useState(isEditing || !!eventId)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    max_attendees: "",
    image_url: "",
    is_featured: false,
    registration_deadline_date: "",
    registration_deadline_time: "",
  })

  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([])

  useEffect(() => {
    if (initialData) {
      loadInitialData(initialData)
    } else if (eventId && editMode) {
      loadEventData()
    }
  }, [eventId, editMode, initialData])

  const loadInitialData = (event: any) => {
    const eventDate = new Date(event.event_date)
    const dateStr = eventDate.toISOString().split("T")[0]
    const timeStr = eventDate.toTimeString().slice(0, 5)

    let regDeadlineDate = ""
    let regDeadlineTime = ""
    if (event.registration_deadline) {
      const regDeadline = new Date(event.registration_deadline)
      regDeadlineDate = regDeadline.toISOString().split("T")[0]
      regDeadlineTime = regDeadline.toTimeString().slice(0, 5)
    }

    setFormData({
      title: event.title || "",
      description: event.description || "",
      event_date: dateStr,
      event_time: timeStr,
      location: event.location || "",
      max_attendees: event.max_attendees?.toString() || "",
      image_url: event.image_url || "",
      is_featured: event.is_featured || false,
      registration_deadline_date: regDeadlineDate,
      registration_deadline_time: regDeadlineTime,
    })

    if (event.social_links && typeof event.social_links === "object") {
      const links = Object.entries(event.social_links).map(([platform, url]) => ({
        platform,
        url: url as string,
      }))
      setSocialLinks(links)
    }
  }

  const loadEventData = async () => {
    try {
      const { data: event, error } = await supabase.from("events").select("*").eq("id", eventId).single()

      if (error) {
        setError("Failed to load event data")
        return
      }

      if (event) {
        loadInitialData(event)
      }
    } catch (err) {
      setError("Failed to load event data")
    }
  }

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "", url: "" }])
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const updateSocialLink = (index: number, field: "platform" | "url", value: string) => {
    const updated = socialLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    setSocialLinks(updated)
  }

  const generateEventIdSuffix = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("🎯 EventForm - Using userId from parent:", userId)

      const { data: userExists, error: userError } = await supabase.from("users").select("id").eq("id", userId).single()

      if (userError || !userExists) {
        const errorMsg = "User account not found in database. Please contact support."
        console.error("❌ EventForm - User validation failed:", userError)
        setError(errorMsg)
        toast({
          title: "Authentication Error",
          description: errorMsg,
          variant: "destructive",
          duration: Number.POSITIVE_INFINITY,
        })
        setLoading(false)
        return
      }

      if (!formData.event_date || !formData.event_time) {
        const errorMsg = "Please select both event date and time"
        setError(errorMsg)
        toast({
          title: "Validation Error",
          description: errorMsg,
          variant: "destructive",
          duration: Number.POSITIVE_INFINITY,
        })
        setLoading(false)
        return
      }

      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`).toISOString()

      if (isNaN(new Date(eventDateTime).getTime())) {
        const errorMsg = "Please enter a valid date and time"
        setError(errorMsg)
        toast({
          title: "Validation Error",
          description: errorMsg,
          variant: "destructive",
          duration: Number.POSITIVE_INFINITY,
        })
        setLoading(false)
        return
      }

      let registrationDeadline = null
      if (formData.registration_deadline_date && formData.registration_deadline_time) {
        registrationDeadline = new Date(
          `${formData.registration_deadline_date}T${formData.registration_deadline_time}`,
        ).toISOString()

        if (isNaN(new Date(registrationDeadline).getTime())) {
          const errorMsg = "Please enter a valid registration deadline"
          setError(errorMsg)
          toast({
            title: "Validation Error",
            description: errorMsg,
            variant: "destructive",
            duration: Number.POSITIVE_INFINITY,
          })
          setLoading(false)
          return
        }

        if (new Date(registrationDeadline) >= new Date(eventDateTime)) {
          const errorMsg = "Registration deadline must be before the event date"
          setError(errorMsg)
          toast({
            title: "Validation Error",
            description: errorMsg,
            variant: "destructive",
            duration: Number.POSITIVE_INFINITY,
          })
          setLoading(false)
          return
        }
      }

      const socialLinksObject = socialLinks.reduce(
        (acc, link) => {
          if (link.platform && link.url) {
            acc[link.platform] = link.url
          }
          return acc
        },
        {} as Record<string, string>,
      )

      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_date: eventDateTime,
        location: formData.location || null,
        max_attendees: formData.max_attendees ? Number.parseInt(formData.max_attendees) : null,
        image_url: formData.image_url || null,
        social_links: Object.keys(socialLinksObject).length > 0 ? socialLinksObject : {},
        is_featured: isAdmin ? formData.is_featured : false,
        registration_deadline: registrationDeadline,
        updated_at: new Date().toISOString(), // Always update the timestamp
      }

      if (editMode && (eventId || initialData)) {
        const updateId = eventId || initialData?.id
        const { error } = await supabase.from("events").update(eventData).eq("id", updateId)

        if (error) {
          const errorMsg = `Failed to update event: ${error.message}`
          setError(errorMsg)
          toast({
            title: "Update Failed",
            description: errorMsg,
            variant: "destructive",
            duration: Number.POSITIVE_INFINITY,
          })
        } else {
          setSuccess("Event updated successfully!")
          toast({
            title: "Success",
            description: "Event updated successfully!",
            variant: "default",
            duration: 5000,
          })
          if (onSuccess) {
            setTimeout(() => onSuccess(), 1500)
          } else if (isAdmin) {
            setTimeout(() => router.push("/admin/events"), 1500)
          } else {
            setTimeout(() => router.push(`/events/${updateId}`), 1500)
          }
        }
      } else {
        const newEventData = {
          ...eventData,
          created_by: userId,
          event_id_suffix: generateEventIdSuffix(),
        }

        console.log("📝 EventForm - Creating event with data:", newEventData)

        const { data, error } = await supabase.from("events").insert([newEventData]).select().single()

        if (error) {
          let errorMsg = `Failed to create event: ${error.message}`

          if (error.code === "23503" && error.message.includes("events_created_by_fkey")) {
            errorMsg = "Database error: User account not properly linked. Please contact support to resolve this issue."
          } else if (error.code === "23505") {
            errorMsg = "An event with similar details already exists. Please modify your event details."
          } else if (error.code === "42703") {
            errorMsg = "Database schema error. Please contact support."
          }

          console.error("❌ EventForm - Database error:", error)
          console.error("❌ EventForm - Event data that failed:", newEventData)
          setError(errorMsg)
          toast({
            title: "Event Creation Failed",
            description: errorMsg,
            variant: "destructive",
            duration: Number.POSITIVE_INFINITY,
          })
        } else {
          console.log("✅ EventForm - Event created successfully:", data)
          setSuccess("Event created successfully!")
          toast({
            title: "Success",
            description: "Event created successfully!",
            variant: "default",
            duration: 5000,
          })

          await supabase.from("event_registrations").insert([
            {
              event_id: data.id,
              user_id: userId,
            },
          ])

          setTimeout(() => {
            router.push(`/events/${data.id}`)
          }, 1500)
        }
      }
    } catch (err) {
      const errorMsg = "An unexpected error occurred. Please try again or contact support if the problem persists."
      setError(errorMsg)
      toast({
        title: "Unexpected Error",
        description: errorMsg,
        variant: "destructive",
        duration: Number.POSITIVE_INFINITY,
      })
      console.error("💥 EventForm - Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl flex items-center gap-2">
          {editMode ? "Edit Event" : "Event Details"}
          {isAdmin && <Star className="w-5 h-5 text-primary" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-destructive/50 text-destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-primary/50 text-primary">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Tech Talk: AI in Education"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a detailed description of your event, what attendees can expect, agenda, speakers, and any important details..."
              rows={6}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="event_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event Date *
              </Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                min={today}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_time">Event Time *</Label>
              <Input
                id="event_time"
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="registration_deadline_date" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Registration Deadline Date
              </Label>
              <Input
                id="registration_deadline_date"
                type="date"
                value={formData.registration_deadline_date}
                onChange={(e) => setFormData({ ...formData, registration_deadline_date: e.target.value })}
                min={today}
                max={formData.event_date || undefined}
              />
              <p className="text-xs text-muted-foreground">Optional: Set when registration closes</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_deadline_time">Registration Deadline Time</Label>
              <Input
                id="registration_deadline_time"
                type="time"
                value={formData.registration_deadline_time}
                onChange={(e) => setFormData({ ...formData, registration_deadline_time: e.target.value })}
                disabled={!formData.registration_deadline_date}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location *
            </Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Student Center Room 101, Online via Zoom"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_attendees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Maximum Attendees *
            </Label>
            <Input
              id="max_attendees"
              type="number"
              value={formData.max_attendees}
              onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
              placeholder="e.g., 50"
              min="1"
              required
            />
            <p className="text-xs text-muted-foreground">Set a limit on how many people can register for your event</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Event Image URL
            </Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/event-image.jpg"
            />
            <p className="text-xs text-muted-foreground">Optional: Add an image to make your event more appealing</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Social Links
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
                <Plus className="w-4 h-4 mr-1" />
                Add Link
              </Button>
            </div>

            {socialLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Platform (e.g., Discord, Instagram)"
                  value={link.platform}
                  onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  className="flex-2"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => removeSocialLink(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {socialLinks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Optional: Add social media links, Discord servers, or other relevant links for your event
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-sm font-medium text-primary">Admin Features</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
                />
                <Label htmlFor="is_featured" className="text-sm">
                  Feature this event (will be highlighted on the events page)
                </Label>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMode ? "Updating Event..." : "Creating Event..."}
                </>
              ) : editMode ? (
                "Update Event"
              ) : (
                "Create Event"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => (onSuccess ? onSuccess() : router.back())}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
