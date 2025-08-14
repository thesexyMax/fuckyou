"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signIn } from "@/lib/auth"
import { saveUserToStorage } from "@/lib/client-auth"

export default function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError("")

    try {
      const result = await signIn(null, formData)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.user) {
        saveUserToStorage(result.user)
        console.log("User logged in and saved to localStorage:", result.user.student_id)
        router.push("/dashboard")
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
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            className="h-12"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/sign-up" className="text-primary hover:text-accent font-medium transition-colors">
            Sign up here
          </Link>
        </div>
      </form>
    </div>
  )
}
