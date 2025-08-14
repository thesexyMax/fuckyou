"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Calendar, Code, User, LogOut, Settings, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOutUser } from "@/lib/client-auth"

interface DashboardHeaderProps {
  user: {
    id: string
    student_id: number
    full_name: string
    major?: string
    graduation_year?: number
    is_admin: boolean
    avatar_url?: string
  }
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const isAdmin = user.is_admin

  const handleSignOut = async () => {
    await signOutUser()
    router.push("/auth/login")
  }

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-xl text-foreground">Campus Connect</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/events"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Events
            </Link>
            <Link
              href="/apps"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Apps
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || ""} alt={user.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.full_name}</p>
                <p className="text-xs leading-none text-muted-foreground">Student ID: {user.student_id}</p>
                {user.major && <p className="text-xs leading-none text-muted-foreground">{user.major}</p>}
                {isAdmin && (
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">Admin</span>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
