"use client"

import { useEffect, useState } from "react"
import LoginForm from "@/components/auth/login-form"
import Link from "next/link"
import { Users, ArrowRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserFromStorage } from "@/lib/client-auth"
import { signOutUser } from "@/lib/client-auth"

export default function LoginPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedUser = await getUserFromStorage()
        console.log("🔍 Login page - checking user:", storedUser)
        setUser(storedUser)
      } catch (error) {
        console.log("❌ Error getting user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const handleSignOut = async () => {
    await signOutUser()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-2xl text-foreground">Campus Connect</span>
            </Link>
            <h1 className="font-serif font-bold text-3xl text-foreground mb-2">Already signed in</h1>
            <p className="text-muted-foreground mb-6">Welcome back, {user.full_name}!</p>
          </div>

          <div className="space-y-4">
            <Link href="/dashboard">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>

            <Button onClick={handleSignOut} variant="outline" className="w-full bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out and login with different account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-2xl text-foreground">Campus Connect</span>
          </Link>
          <h1 className="font-serif font-bold text-3xl text-foreground mb-2">Welcome</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
