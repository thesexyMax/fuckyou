"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { QrCode, Copy, CheckCircle, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EventQRCodeProps {
  eventId: string
  userId: string
  eventTitle: string
}

export default function EventQRCode({ eventId, userId, eventTitle }: EventQRCodeProps) {
  const [registration, setRegistration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadRegistration()
  }, [eventId, userId])

  const loadRegistration = async () => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error loading registration:", error)
        return
      }

      if (data) {
        setRegistration(data)
        // Generate QR code URL using a QR code service
        const qrData = JSON.stringify({
          type: "event_checkin",
          event_id: eventId,
          user_id: userId,
          registration_id: data.id,
          qr_code: data.qr_code,
          check_in_code: data.check_in_code,
        })

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`
        setQrCodeUrl(qrUrl)
      }
    } catch (error) {
      console.error("Error loading registration:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async () => {
    if (registration?.check_in_code) {
      await navigator.clipboard.writeText(registration.check_in_code)
      toast({
        title: "Code Copied",
        description: "Check-in code copied to clipboard",
        duration: 3000,
      })
    }
  }

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a")
      link.href = qrCodeUrl
      link.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}_QR_Code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "QR Code Downloaded",
        description: "QR code saved to your device",
        duration: 3000,
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  if (!registration) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Registration not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-semibold">Event Check-in QR Code</CardTitle>
        <p className="text-sm text-muted-foreground">Show this QR code at the event for quick check-in</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="text-center">
          {qrCodeUrl && (
            <div className="inline-block p-4 bg-white rounded-lg border">
              <img src={qrCodeUrl || "/placeholder.svg"} alt="Event Check-in QR Code" className="w-64 h-64 mx-auto" />
            </div>
          )}
        </div>

        {/* Manual Code */}
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground">or enter the code manually</p>
          <div className="flex items-center gap-2">
            <Input value={registration.check_in_code || ""} readOnly className="text-center font-mono text-lg" />
            <Button variant="outline" size="sm" onClick={copyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {registration.checked_in ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              Checked In
            </Badge>
          ) : (
            <Badge variant="outline">Not Checked In</Badge>
          )}

          {registration.checked_in_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Checked in on {new Date(registration.checked_in_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button onClick={downloadQR} variant="outline" className="w-full bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          <p>Keep this QR code safe and show it at the event entrance</p>
        </div>
      </CardContent>
    </Card>
  )
}
