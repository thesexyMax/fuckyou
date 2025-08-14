"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Users, BarChart3, CheckCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage } from "@/lib/client-auth"
import QRScanner from "@/components/admin/qr-scanner"

export default function AdminEventDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getUserFromStorage()
      if (!currentUser || !currentUser.is_admin) {
        router.push("/dashboard")
        return
      }
      setUser(currentUser)

      // Load event data
      const { data: eventData } = await supabase.from("events").select("*").eq("id", params.id).single()

      if (!eventData) {
        router.push("/admin/events")
        return
      }

      setEvent(eventData)

      // Load registrations with check-in status
      const { data: registrationsData } = await supabase
        .from("event_registrations")
        .select(`
          *,
          user:users(full_name, avatar_url, student_id)
        `)
        .eq("event_id", params.id)
        .order("registered_at", { ascending: false })

      setRegistrations(registrationsData || [])
      setLoading(false)
    }

    loadData()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !event) return null

  const checkedInCount = registrations.filter((reg) => reg.checked_in).length
  const totalRegistrations = registrations.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/admin/events">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Events
          </Link>
        </Button>

        <div className="space-y-6">
          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-serif">{event.title}</CardTitle>
                  <p className="text-muted-foreground mt-2">{new Date(event.event_date).toLocaleString()}</p>
                  <p className="text-muted-foreground">{event.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {checkedInCount}/{totalRegistrations}
                  </div>
                  <div className="text-sm text-muted-foreground">Checked In</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totalRegistrations}</div>
                <div className="text-sm text-muted-foreground">Total Registered</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
                <div className="text-sm text-muted-foreground">Checked In</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{totalRegistrations - checkedInCount}</div>
                <div className="text-sm text-muted-foreground">Not Checked In</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
              <TabsTrigger value="registrations">Registrations</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="space-y-4">
              <QRScanner eventId={params.id} />
            </TabsContent>

            <TabsContent value="registrations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Event Registrations ({totalRegistrations})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {registrations.map((registration) => (
                      <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {registration.user.avatar_url ? (
                              <img
                                src={registration.user.avatar_url || "/placeholder.svg"}
                                alt={registration.user.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold text-primary">
                                {registration.user.full_name?.charAt(0) || "U"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{registration.user.full_name}</p>
                            <p className="text-sm text-muted-foreground">Student ID: {registration.user.student_id}</p>
                            <p className="text-xs text-muted-foreground">
                              Registered: {new Date(registration.registered_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {registration.checked_in ? (
                            <div>
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Checked In
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(registration.checked_in_at).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline">Not Checked In</Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {registrations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No registrations yet</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Event Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{totalRegistrations}</div>
                        <div className="text-sm text-muted-foreground">Total Registrations</div>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
                        <div className="text-sm text-muted-foreground">Actual Attendance</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Attendance Rate</span>
                        <span>
                          {totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${totalRegistrations > 0 ? (checkedInCount / totalRegistrations) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
