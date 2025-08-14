"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User as AdminUser } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Camera, QrCode, Upload, CheckCircle, XCircle, ArrowLeft, Calendar, History } from "lucide-react"
import Link from "next/link"
import { Html5QrcodeScanner } from "html5-qrcode"
import "jsqr"

interface CheckinResult {
  success: boolean
  user?: {
    id: string
    full_name: string
    username: string
    email: string
  }
  event?: {
    id: string
    title: string
    event_date: string
  }
  message: string
  alreadyCheckedIn?: boolean
}

interface CheckinHistory {
  id: string
  checked_in_at: string
  user: {
    full_name: string
    username: string
  }
  event: {
    title: string
    event_date: string
  }
}

export default function AdminCheckinPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [processingCheckin, setProcessingCheckin] = useState(false)
  const [checkinHistory, setCheckinHistory] = useState<CheckinHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()
      if (!currentUser || !currentUser.is_admin) {
        window.location.href = "/admin"
        return
      }
      setUser(currentUser)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/admin"
    } finally {
      setLoading(false)
    }
  }

  const fetchCheckinHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id,
          checked_in_at,
          user:users(full_name, username),
          event:events(title, event_date)
        `)
        .eq("checked_in", true)
        .order("checked_in_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setCheckinHistory(data || [])
    } catch (error) {
      console.error("Error fetching check-in history:", error)
      toast({
        title: "❌ Error",
        description: "Failed to load check-in history",
        className: "bg-red-50 border-red-200 text-red-800",
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  const startScanning = () => {
    setScanning(true)
    setResult(null)

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false)

      scanner.render(
        (decodedText) => {
          scanner.clear()
          setScanning(false)
          processCheckin(decodedText)
        },
        (error) => {
          console.log("QR scan error:", error)
        },
      )

      scannerRef.current = scanner
    }, 100)
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
    }
    setScanning(false)
  }

  const processCheckin = async (code: string) => {
    setProcessingCheckin(true)
    try {
      let eventId: string, userId: string, checkInCode: string

      // Try to parse as JSON first (new format)
      try {
        const qrData = JSON.parse(code)
        if (qrData.type === "event_checkin" && qrData.event_id && qrData.user_id && qrData.check_in_code) {
          eventId = qrData.event_id
          userId = qrData.user_id
          checkInCode = qrData.check_in_code
        } else {
          throw new Error("Invalid JSON format")
        }
      } catch (jsonError) {
        const parts = code.split(":")
        if (parts.length !== 3) {
          setResult({
            success: false,
            message: "Invalid QR code format. Expected JSON or eventId:userId:checkInCode format",
          })
          return
        }
        ;[eventId, userId, checkInCode] = parts
      }

      // Verify the registration exists
      const { data: registration, error: regError } = await supabase
        .from("event_registrations")
        .select(`
          *,
          event:events(*),
          user:users(*)
        `)
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("check_in_code", checkInCode)
        .single()

      if (regError || !registration) {
        setResult({
          success: false,
          message: "Invalid QR code or registration not found",
        })
        return
      }

      // Check if already checked in
      if (registration.checked_in) {
        setResult({
          success: true,
          user: registration.user,
          event: registration.event,
          message: "User already checked in",
          alreadyCheckedIn: true,
        })
        return
      }

      // Update check-in status
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", registration.id)

      if (updateError) {
        throw updateError
      }

      const playSuccessBeep = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      }

      try {
        playSuccessBeep()
      } catch (error) {
        console.log("Could not play beep sound:", error)
      }

      setResult({
        success: true,
        user: registration.user,
        event: registration.event,
        message: "Check-in successful!",
      })

      toast({
        title: "✅ Check-in Successful",
        description: `${registration.user.full_name} checked in for ${registration.event.title}`,
        className: "bg-green-50 border-green-200 text-green-800",
      })
    } catch (error) {
      console.error("Check-in error:", error)
      setResult({
        success: false,
        message: "Error processing check-in. Please try again.",
      })

      toast({
        title: "❌ Check-in Failed",
        description: "Error processing check-in. Please try again.",
        className: "bg-red-50 border-red-200 text-red-800",
      })
    } finally {
      setProcessingCheckin(false)
    }
  }

  const handleManualCheckin = () => {
    if (!manualCode.trim()) {
      toast({
        title: "❌ Invalid Code",
        description: "Please enter a valid check-in code",
        className: "bg-red-50 border-red-200 text-red-800",
      })
      return
    }
    processCheckin(manualCode.trim())
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setProcessingCheckin(true)

      // Create a canvas to process the image
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        // Convert to data URL and try to decode QR
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)

        if (imageData) {
          try {
            // Use jsQR library to decode QR code from image data
            const jsQR = (await import("jsqr")).default
            const code = jsQR(imageData.data, imageData.width, imageData.height)

            if (code) {
              // Successfully decoded QR code, process check-in
              await processCheckin(code.data)
            } else {
              toast({
                title: "❌ No QR Code Found",
                description: "Could not find a valid QR code in the uploaded image",
                className: "bg-red-50 border-red-200 text-red-800",
              })
            }
          } catch (error) {
            console.error("QR decode error:", error)
            toast({
              title: "❌ QR Code Processing Failed",
              description: "Error reading QR code from image. Please try again.",
              className: "bg-red-50 border-red-200 text-red-800",
            })
          }
        }
        setProcessingCheckin(false)
      }

      img.onerror = () => {
        toast({
          title: "❌ Invalid Image",
          description: "Could not load the uploaded image. Please try a different file.",
          className: "bg-red-50 border-red-200 text-red-800",
        })
        setProcessingCheckin(false)
      }

      img.src = URL.createObjectURL(file)
    } catch (error) {
      console.error("Image upload error:", error)
      toast({
        title: "❌ Upload Failed",
        description: "Error processing image. Please try again.",
        className: "bg-red-50 border-red-200 text-red-800",
      })
      setProcessingCheckin(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    // Format time in IST
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: true,
    }
    const time = date.toLocaleTimeString("en-IN", timeOptions)

    return `${day} ${month} ${year} at ${time} IST`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <QrCode className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading check-in system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-3xl text-foreground">Event Check-in</h1>
              <p className="text-muted-foreground">Scan QR codes to check in event attendees</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Scanner
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" onClick={fetchCheckinHistory}>
              <History className="w-4 h-4" />
              Check-in History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* QR Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    QR Code Scanner
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!scanning ? (
                    <div className="text-center space-y-4">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-gray-400" />
                      </div>
                      <Button onClick={startScanning} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Camera className="mr-2 w-4 h-4" />
                        Start Scanning
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div id="qr-reader" className="w-full"></div>
                      <Button onClick={stopScanning} variant="outline" className="w-full bg-transparent">
                        Stop Scanning
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Entry */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Manual Entry & Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload QR Code Image</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                      disabled={processingCheckin}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Upload a QR code image to process check-in</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Enter Check-in Code or JSON</label>
                    <Input
                      placeholder="Enter check-in code or paste QR JSON data"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports both JSON format and eventId:userId:checkInCode format
                    </p>
                  </div>
                  <Button onClick={handleManualCheckin} className="w-full" disabled={processingCheckin}>
                    {processingCheckin ? "Processing..." : "Process Check-in"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    Check-in Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.success && result.user && result.event ? (
                    <div className="space-y-4">
                      <div
                        className={`p-4 rounded-lg ${result.alreadyCheckedIn ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {result.user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{result.user.full_name}</h3>
                            <p className="text-sm text-muted-foreground">@{result.user.username}</p>
                          </div>
                          <Badge variant={result.alreadyCheckedIn ? "secondary" : "default"} className="ml-auto">
                            {result.alreadyCheckedIn ? "Already Checked In" : "Checked In"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{result.event.title}</span>
                          <span>•</span>
                          <span>{formatDate(result.event.event_date)}</span>
                        </div>
                      </div>
                      <p
                        className={`text-center font-medium ${result.alreadyCheckedIn ? "text-yellow-700" : "text-green-700"}`}
                      >
                        {result.message}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <p className="text-red-700 font-medium">{result.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Check-in History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading check-in history...</p>
                  </div>
                ) : checkinHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No check-ins recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {checkinHistory.map((checkin) => (
                      <div key={checkin.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {checkin.user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{checkin.user.full_name}</p>
                            <Badge variant="outline" className="text-xs">
                              @{checkin.user.username}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{checkin.event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Checked in: {formatDate(checkin.checked_in_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Checked In
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
