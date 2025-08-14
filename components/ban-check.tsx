"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getUserFromStorage } from "@/lib/client-auth"

interface BanCheckProps {
  children: React.ReactNode
  redirectOnBan?: boolean
  showToast?: boolean
}

export default function BanCheck({ children, redirectOnBan = false, showToast = true }: BanCheckProps) {
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkBanStatus = async () => {
      const user = await getUserFromStorage()

      if (user?.is_banned) {
        if (showToast) {
          toast({
            title: "Account Banned",
            description: `Your account has been banned. Reason: ${user.banned_reason || "No reason provided"}`,
            variant: "destructive",
            duration: Number.POSITIVE_INFINITY, // Persistent until manually closed
          })
        }

        if (redirectOnBan) {
          router.push("/dashboard?banned=true")
        }
      }
    }

    checkBanStatus()
  }, [toast, router, redirectOnBan, showToast])

  return <>{children}</>
}
