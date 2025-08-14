"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, ArrowLeft, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function VerifyPage() {
  const [loading, setLoading] = useState(true)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const code = searchParams.get("code")
    const qr = searchParams.get("qr")

    if (code) {
      verifyCheckInCode(code)
    } else if (qr) {
      try {
        const qrData = JSON.parse(decodeURIComponent(qr))
        verifyQRCode(qrData)
      } catch (err) {
        setError("Invalid QR code format")
        setLoading(false)
      }
    } else {
      setError("No verification code provided")
      setLoading(false)
    }
  }, [searchParams])

  const verifyCheckInCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          *,
          event:events(title, event_date, location),
          user:users(full_name, avatar_url, student_id)
        `)
        .eq("check_in_code", code.toUpperCase())
        .single()

      if (error || !data) {
        setError("Invalid check-in code")
        setLoading(false)
        return
      }

      setVerificationResult(data)
      setLoading(false)
    } catch (err) {
      setError("Verification failed")
      setLoading(false)
    }
  }

  const verifyQRCode = async (qrData: any) => {
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          *,
          event:events(title, event_date, location),
          user:users(full_name, avatar_url, student_id)
        `)
        .eq("id", qrData.registration_id)
        .eq("qr_code", qrData.qr_code)
        .single()

      if (error || !data) {
        setError("Invalid QR code")
        setLoading(false)
        return
      }

      setVerificationResult(data)
      setLoading(false)
    } catch (err) {
      setError("QR code verification failed")
      setLoading(false)
    }
  }

  const performCheckIn = async () => {
    if (!verificationResult) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", verificationResult.id)

      if (error) {
        toast({
          title: "Check-in Failed",
          description: "Failed to update check-in status",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      setVerificationResult({
        ...verificationResult,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })

      toast({
        title: "Check-in Successful",
        description: `${verificationResult.user.full_name} has been checked in`,
        duration: 5000,
      })
    } catch (err) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/events">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Events
          </Link>
        </Button>

        {error ? (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-red-600">Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button asChild>
                <Link href="/events">Return to Events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : verificationResult ? (
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Event Registration Verified</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* User Info */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  {verificationResult.user.avatar_url ? (
                    <img
                      src={verificationResult.user.avatar_url || "/placeholder.svg"}
                      alt={verificationResult.user.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-primary">
                      {verificationResult.user.full_name?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{verificationResult.user.full_name}</h3>
                <p className="text-sm text-muted-foreground">Student ID: {verificationResult.user.student_id}</p>
              </div>

              {/* Event Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Event Details</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{verificationResult.event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(verificationResult.event.event_date).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{verificationResult.event.location}</p>
                </div>
              </div>

              {/* Check-in Status */}
              <div className="text-center">
                {verificationResult.checked_in ? (
                  <div className="space-y-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Already Checked In
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Checked in on {new Date(verificationResult.checked_in_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Badge variant="outline">Not Checked In</Badge>
                    <Button onClick={performCheckIn} disabled={loading} className="w-full">
                      {loading ? "Checking In..." : "Check In Now"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
