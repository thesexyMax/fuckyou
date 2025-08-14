"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, Check, X } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/auth"
import { saveUserToStorage } from "@/lib/client-auth"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function SignUpForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [checkingUsername, setCheckingUsername] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const checkUsernameAvailability = useCallback(
    async (usernameToCheck: string) => {
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setUsernameStatus("idle")
        setUsernameSuggestions([])
        return
      }

      setCheckingUsername(true)
      setUsernameStatus("checking")

      try {
        // Check if username exists
        const { data: existingUser, error } = await supabase
          .from("users")
          .select("username")
          .eq("username", usernameToCheck.toLowerCase())
          .single()

        if (error && error.code !== "PGRST116") {
          throw error
        }

        if (existingUser) {
          setUsernameStatus("taken")
          // Generate 3 suggestions based on the typed username
          await generateUsernameSuggestions(usernameToCheck)
        } else {
          setUsernameStatus("available")
          setUsernameSuggestions([])
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameStatus("idle")
      } finally {
        setCheckingUsername(false)
      }
    },
    [supabase],
  )

  const generateUsernameSuggestions = async (baseUsername: string) => {
    const suggestions = [
      `${baseUsername}${Math.floor(Math.random() * 100)}`,
      `${baseUsername}_${Math.floor(Math.random() * 1000)}`,
      `${baseUsername}${new Date().getFullYear()}`,
    ]

    const availableSuggestions = []

    for (const suggestion of suggestions) {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("username")
          .eq("username", suggestion.toLowerCase())
          .single()

        if (error && error.code === "PGRST116") {
          // Username doesn't exist, it's available
          availableSuggestions.push(suggestion)
        }
      } catch (error) {
        console.error("Error checking suggestion:", error)
      }
    }

    setUsernameSuggestions(availableSuggestions.slice(0, 3))
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkUsernameAvailability])

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
    setUsername(value)
  }

  const selectSuggestion = (suggestion: string) => {
    setUsername(suggestion)
    setUsernameSuggestions([])
    setUsernameStatus("available")
  }

  const handleSubmit = async (formData: FormData) => {
    if (usernameStatus === "taken") {
      toast.error("Please choose an available username", {
        position: "bottom-right",
        duration: 3000,
      })
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Update formData with the current username value
      formData.set("username", username)

      const result = await signUp(null, formData)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.user && result.redirect) {
        saveUserToStorage(result.user)
        console.log("User registered and saved to localStorage:", result.user.student_id)
        setSuccess("Account created successfully! Redirecting to dashboard...")
        toast.success("Account created successfully!", {
          position: "bottom-right",
          duration: 3000,
        })
        setTimeout(() => {
          window.location.href = result.redirect
        }, 1000)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl p-8 shadow-lg border-2">
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <Alert className="border-destructive/50 text-destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-primary/50 text-primary">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Full name
          </Label>
          <Input id="fullName" name="fullName" type="text" placeholder="Your full name" required className="h-12" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="studentId" className="text-sm font-medium">
            Student ID
          </Label>
          <Input
            id="studentId"
            name="studentId"
            type="number"
            placeholder="Enter your student ID"
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            Username
          </Label>
          <div className="relative">
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a unique username"
              value={username}
              onChange={handleUsernameChange}
              required
              className={`h-12 pr-10 ${
                usernameStatus === "available" ? "border-green-500" : usernameStatus === "taken" ? "border-red-500" : ""
              }`}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {checkingUsername ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : usernameStatus === "available" ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : usernameStatus === "taken" ? (
                <X className="w-4 h-4 text-red-500" />
              ) : null}
            </div>
          </div>

          {usernameStatus === "available" && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Username is available!
            </p>
          )}

          {usernameStatus === "taken" && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" />
              Username is already taken
            </p>
          )}

          {usernameSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Suggested available usernames:</p>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="px-3 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">This will be your unique identifier on the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="major" className="text-sm font-medium">
              Major (optional)
            </Label>
            <Input id="major" name="major" type="text" placeholder="Computer Science" className="h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear" className="text-sm font-medium">
              Graduation Year (optional)
            </Label>
            <Input
              id="graduationYear"
              name="graduationYear"
              type="number"
              placeholder="2025"
              min="2020"
              max="2030"
              className="h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            required
            minLength={6}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
        </div>

        <Button
          type="submit"
          disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
          className="w-full h-12 bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:text-accent font-medium transition-colors">
            Sign in here
          </Link>
        </div>
      </form>
    </div>
  )
}
