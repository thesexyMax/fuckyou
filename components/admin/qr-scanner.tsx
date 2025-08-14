"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, CheckCircle, X, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface QRScannerProps {
  eventId?: string
}

export default function QRScanner({ eventId }: QRScannerProps) {
  const [manualCode, setManualCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastScannedUser, setLastScannedUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const processCheckIn = async (qrData: any) => {
    setLoading(true)

    try {
      let registrationData = null

      // If QR data is a string (manual code), search by check_in_code
      if (typeof qrData === "string") {
        const { data, error } = await supabase
          .from("event_registrations")
          .select(`
            *,
            event:events(title, event_date),
            user:users(full_name, avatar_url, student_id)
          `)
          .eq("check_in_code", qrData.toUpperCase())
          .single()

        if (error || !data) {
          toast({
            title: "Invalid Code",
            description: "Check-in code not found",
            variant: "destructive",
            duration: 5000,
          })
          return
        }

        registrationData = data
      } else {
        // QR code data object
        const { data, error } = await supabase
          .from("event_registrations")
          .select(`
            *,
            event:events(title, event_date),
            user:users(full_name, avatar_url, student_id)
          `)
          .eq("id", qrData.registration_id)
          .eq("qr_code", qrData.qr_code)
          .single()

        if (error || !data) {
          toast({
            title: "Invalid QR Code",
            description: "QR code not found or expired",
            variant: "destructive",
            duration: 5000,
          })
          return
        }

        registrationData = data
      }

      // Check if event matches (if eventId is provided)
      if (eventId && registrationData.event_id !== eventId) {
        toast({
          title: "Wrong Event",
          description: "This QR code is for a different event",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      // Check if already checked in
      if (registrationData.checked_in) {
        toast({
          title: "Already Checked In",
          description: `${registrationData.user.full_name} was already checked in on ${new Date(registrationData.checked_in_at).toLocaleString()}`,
          variant: "destructive",
          duration: 5000,
        })
        setLastScannedUser(registrationData)
        return
      }

      // Perform check-in
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", registrationData.id)

      if (updateError) {
        toast({
          title: "Check-in Failed",
          description: "Failed to update check-in status",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      // Success
      setLastScannedUser({
        ...registrationData,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })

      toast({
        title: "Check-in Successful",
        description: `${registrationData.user.full_name} has been checked in`,
        duration: 5000,
      })

      setManualCode("")
    } catch (error) {
      console.error("Check-in error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      processCheckIn(manualCode.trim())
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // For now, show a message that QR scanning from image is not implemented
    // In a real app, you'd use a QR code library like jsQR
    toast({
      title: "Feature Coming Soon",
      description: "QR code scanning from images will be available soon. Please use manual code entry for now.",
      duration: 5000,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Event Check-in Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Code Entry */}
          <div className="space-y-4">
            <Label htmlFor="manual-code">Enter Check-in Code</Label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                id="manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter 12-character code"
                className="font-mono"
                maxLength={12}
              />
              <Button type="submit" disabled={loading || !manualCode.trim()}>
                {loading ? "Checking..." : "Check In"}
              </Button>
            </form>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Upload QR Code Image</Label>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload QR Image
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Take a photo of the QR code or upload an image</p>
          </div>
        </CardContent>
      </Card>

      {/* Last Scanned User */}
      {lastScannedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Last Scanned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                {lastScannedUser.user.avatar_url ? (
                  <img
                    src={lastScannedUser.user.avatar_url || "/placeholder.svg"}
                    alt={lastScannedUser.user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-primary">
                    {lastScannedUser.user.full_name?.charAt(0) || "U"}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">{lastScannedUser.user.full_name}</h3>
                <p className="text-sm text-muted-foreground">Student ID: {lastScannedUser.user.student_id}</p>
                <p className="text-sm text-muted-foreground">Event: {lastScannedUser.event.title}</p>
              </div>

              <div className="text-right">
                {lastScannedUser.checked_in ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Checked In
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="w-4 h-4 mr-1" />
                    Not Checked In
                  </Badge>
                )}

                {lastScannedUser.checked_in_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(lastScannedUser.checked_in_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
