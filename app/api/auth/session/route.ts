import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (user) {
      return NextResponse.json(user)
    } else {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "Session check failed" }, { status: 500 })
  }
}
