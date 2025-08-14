import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/auth/sign-up-form"
import Link from "next/link"
import { Users } from "lucide-react"

export default async function SignUpPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
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
          <h1 className="font-serif font-bold text-3xl text-foreground mb-2">Join the community</h1>
          <p className="text-muted-foreground">Create your account to get started</p>
        </div>

        <SignUpForm />
      </div>
    </div>
  )
}
