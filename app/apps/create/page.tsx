"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserFromStorage } from "@/lib/client-auth"
import { createClient } from "@/lib/supabase/client"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import AppForm from "@/components/apps/app-form"
import { Card, CardContent } from "@/components/ui/card"
import { Ban, Loader2 } from "lucide-react"

interface User {
  id: string
  student_id: number
  username: string
  full_name: string
  major?: string
  graduation_year?: number
  is_admin: boolean
  bio?: string
  avatar_url?: string
  created_at: string
  is_banned: boolean
  banned_reason?: string
  banned_at?: string
}

interface Restriction {
  id: string
  user_id: string
  restriction_type: string
  reason: string
  expires_at: string | null
  is_active: boolean
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export default function CreateAppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [restrictions, setRestrictions] = useState<Restriction | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      console.log("🔍 Apps/Create - Starting auth check...")
      const currentUser = await getUserFromStorage()
      console.log("👤 Apps/Create - User data:", currentUser)

      if (!currentUser) {
        console.log("❌ Apps/Create - No user found, redirecting to login")
        router.push("/auth/login")
        return
      }

      console.log("✅ Apps/Create - User authenticated, checking restrictions...")
      setUser(currentUser)

      if (currentUser.is_banned) {
        console.log("🚫 Apps/Create - User is banned")
        setLoading(false)
        return
      }

      console.log("🔍 Apps/Create - Checking publishing restrictions...")
      const supabase = createClient()
      const { data: userRestrictions, error: restrictionError } = await supabase
        .from("user_restrictions")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("restriction_type", "cannot_publish")
        .eq("is_active", true)
        .maybeSingle()

      if (restrictionError) {
        console.error("❌ Apps/Create - Error checking restrictions:", restrictionError)
      } else {
        console.log("📋 Apps/Create - Restrictions check result:", userRestrictions)
      }

      setRestrictions(userRestrictions)
      setLoading(false)
      console.log("✅ Apps/Create - Auth check complete, showing form")
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (user.is_banned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        <DashboardHeader user={user} />

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-12 text-center">
              <Ban className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="font-serif font-bold text-2xl text-destructive mb-2">Account Banned</h1>
              <p className="text-muted-foreground mb-4">You cannot publish apps while your account is banned.</p>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground mb-2">{user.banned_reason || "No reason provided"}</p>
                {user.banned_at && (
                  <p className="text-xs text-muted-foreground">Banned on: {formatDate(user.banned_at)}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (restrictions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
        <DashboardHeader user={user} />

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-12 text-center">
              <Ban className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="font-serif font-bold text-2xl text-destructive mb-2">Publishing Restricted</h1>
              <p className="text-muted-foreground mb-4">You are currently restricted from publishing apps.</p>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{restrictions.reason}</p>
                {restrictions.expires_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This restriction expires on {new Date(restrictions.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-foreground mb-2">Publish Your App</h1>
          <p className="text-muted-foreground text-lg">Share your amazing project with the campus community.</p>
        </div>

        <AppForm userId={user.id} />
      </main>
    </div>
  )
}
