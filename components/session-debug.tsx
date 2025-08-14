"use client"

import { useEffect, useState } from "react"

interface User {
  id: number
  student_id: string
  username: string
  full_name: string
  major: string
  graduation_year: number
  is_admin: boolean
}

export default function SessionDebug() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkSession = () => {
      try {
        console.log("🔍 Checking session...")

        if (typeof window !== "undefined") {
          const userData = localStorage.getItem("user")
          if (userData) {
            try {
              const parsedUser = JSON.parse(userData)
              console.log("💾 LocalStorage user found:", parsedUser)
              setUser(parsedUser)
              console.log("🔐 Session Status: AUTHENTICATED (from localStorage)")
              console.log("👤 Current User:", parsedUser)
              return
            } catch (parseError) {
              console.log("💾 Failed to parse localStorage user:", parseError)
              localStorage.removeItem("user") // Clean up invalid data
            }
          } else {
            console.log("💾 No user data in localStorage")
          }
        }

        console.log("🔐 Session Status: NOT AUTHENTICATED")
        setUser(null)
      } catch (error) {
        console.log("🔐 Session Status: ERROR")
        console.error("❌ Error checking localStorage:", error)
        setUser(null)
      }
    }

    checkSession()
  }, [])

  return null // This component only logs to console
}
