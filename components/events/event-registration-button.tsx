"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, UserMinus, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import EventQRCode from "@/components/events/event-qr-code"

interface EventRegistrationButtonProps {
  eventId: string
  isRegistered: boolean
  isFull: boolean
  canRegister: boolean
  userId: string
  isCreator?: boolean
  onRegistrationChange?: () => void
  eventTitle?: string // Added eventTitle prop for QR code
}

export default function EventRegistrationButton({
  eventId,
  isRegistered,
  isFull,
  canRegister,
  userId,
  isCreator = false,
  onRegistrationChange,
  eventTitle = "Event", // Added eventTitle with default value
}: EventRegistrationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [currentRegistrationStatus, setCurrentRegistrationStatus] = useState(isRegistered)
  const router = useRouter()
  const supabase = createClient()

  const handleRegistration = async () => {
    setLoading(true)

    try {
      if (currentRegistrationStatus) {
        // Unregister
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId)

        if (error) {
          console.error("Error unregistering:", error)
          toast({
            title: "Error",
            description: "Failed to unregister. Please try again.",
            variant: "destructive",
          })
        } else {
          setCurrentRegistrationStatus(false)
          toast({
            title: "Unregistered Successfully",
            description: "You have been unregistered from this event.",
          })
          if (onRegistrationChange) {
            onRegistrationChange()
          }
        }
      } else {
        // Register
        const { error } = await supabase.from("event_registrations").insert([
          {
            event_id: eventId,
            user_id: userId,
          },
        ])

        if (error) {
          console.error("Error registering:", error)
          if (error.code === "23505") {
            toast({
              title: "Already Registered",
              description: "You are already registered for this event.",
              variant: "destructive",
            })
            setCurrentRegistrationStatus(true)
          } else {
            toast({
              title: "Registration Failed",
              description: "Failed to register. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          setCurrentRegistrationStatus(true)
          toast({
            title: "Registration Successful!",
            description: "You have been registered for this event. Check your credentials below.",
          })
          if (onRegistrationChange) {
            onRegistrationChange()
          }
        }
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!canRegister) {
    return (
      <Button disabled variant="destructive" className="w-full">
        Registration Restricted
      </Button>
    )
  }

  if (isFull && !currentRegistrationStatus) {
    return (
      <Button disabled variant="destructive" className="w-full">
        Event Full
      </Button>
    )
  }

  if (currentRegistrationStatus) {
    return (
      <div className="space-y-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full bg-green-50 border-green-200 hover:bg-green-100">
              <QrCode className="mr-2 w-4 h-4 text-green-600" />
              <span className="text-green-700">Your Check-in Credentials</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif">Event Check-in QR Code</SheetTitle>
              <SheetDescription>Show this QR code at the event for check-in</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <EventQRCode eventId={eventId} userId={userId} eventTitle={eventTitle} />
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={loading} variant="destructive" className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unregistering...
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unregister
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unregister from Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unregister from this event? You can register again later if spots are
                available.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRegistration}>Unregister</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={loading}
          className="w-full bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Register for Event
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Register for Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to register for this event? You'll receive updates and be counted as an attendee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegistration}>Register</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
