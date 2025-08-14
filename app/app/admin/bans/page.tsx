"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserFromStorage, type User } from "@/lib/client-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Ban, Users, Search, AlertTriangle, Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface UserWithRestrictions {
  id: string
  student_id: number
  full_name: string
  username: string
  email?: string
  is_banned: boolean
  banned_reason?: string
  banned_at?: string
  created_at: string
}

export default function UserBansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithRestrictions[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "banned" | "active">("all")
  const [selectedUser, setSelectedUser] = useState<UserWithRestrictions | null>(null)
  const [banReason, setBanReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getUserFromStorage()

      if (!currentUser) {
        window.location.href = "/auth/login"
        return
      }

      if (!currentUser.is_admin) {
        window.location.href = "/dashboard"
        return
      }

      setUser(currentUser)
      await fetchUsers()
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/auth/login"
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const banUser = async (userId: string, reason: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_banned: true,
          banned_reason: reason,
          banned_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error

      await fetchUsers()
      setSelectedUser(null)
      setBanReason("")
    } catch (error) {
      console.error("Error banning user:", error)
      alert("Failed to ban user. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const unbanUser = async (userId: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_banned: false,
          banned_reason: null,
          banned_at: null,
        })
        .eq("id", userId)

      if (error) throw error

      await fetchUsers()
    } catch (error) {
      console.error("Error unbanning user:", error)
      alert("Failed to unban user. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.student_id.toString().includes(searchTerm)

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "banned" && user.is_banned) ||
      (filterStatus === "active" && !user.is_banned)

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">
          <Ban className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Ban className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground">User Management</h1>
            <p className="text-muted-foreground text-lg">Manage user restrictions and bans</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => u.is_banned).length}</p>
                  <p className="text-sm text-muted-foreground">Banned Users</p>
                </div>
                <Ban className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => !u.is_banned).length}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, username, or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "banned" | "active") => setFilterStatus(value)}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users</SelectItem>
                  <SelectItem value="banned">Banned Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((userData) => (
                <div key={userData.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{userData.full_name}</h3>
                      <Badge variant={userData.is_banned ? "destructive" : "secondary"}>
                        {userData.is_banned ? "Banned" : "Active"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        @{userData.username} • Student ID: {userData.student_id}
                      </p>
                      <p>Joined: {new Date(userData.created_at).toLocaleDateString("en-GB")}</p>
                      {userData.is_banned && userData.banned_reason && (
                        <p className="text-red-600">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Banned: {userData.banned_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {userData.is_banned ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbanUser(userData.id)}
                        disabled={actionLoading}
                        className="text-green-600 hover:text-green-700"
                      >
                        Unban User
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(userData)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Ban User
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ban User: {userData.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Reason for ban</label>
                              <Textarea
                                placeholder="Enter the reason for banning this user..."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(null)
                                  setBanReason("")
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => banUser(userData.id, banReason)}
                                disabled={!banReason.trim() || actionLoading}
                              >
                                {actionLoading ? "Banning..." : "Ban User"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif font-bold text-xl mb-2">No users found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
