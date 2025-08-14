// Client-side authentication utilities
export interface User {
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
}

export function saveUserToStorage(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("campus_connect_user", JSON.stringify(user))
    console.log("User saved to localStorage:", user.student_id)
  }
}

export async function getUserFromStorage(): Promise<User | null> {
  if (typeof window !== "undefined") {
    try {
      const userData = localStorage.getItem("campus_connect_user")
      if (userData) {
        const cachedUser = JSON.parse(userData)
        console.log("User loaded from localStorage:", cachedUser.student_id)

        // Always fetch fresh data from database to get latest admin status
        try {
          const { createClient } = await import("@/lib/supabase/client")
          const supabase = createClient()

          const { data, error } = await supabase.from("users").select("*").eq("id", cachedUser.id).single()

          if (data && !error) {
            const freshUser = {
              ...data,
              username: data.student_id.toString(),
            }
            // Update localStorage with fresh data
            saveUserToStorage(freshUser)
            console.log("Fresh user data loaded with admin status:", freshUser.is_admin)
            return freshUser
          }
        } catch (dbError) {
          console.error("Error fetching fresh user data:", dbError)
        }

        // Return cached data if database fetch fails
        return cachedUser
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error)
      localStorage.removeItem("campus_connect_user")
    }
  }
  return null
}

export function getUserFromStorageSync(): User | null {
  if (typeof window !== "undefined") {
    try {
      const userData = localStorage.getItem("campus_connect_user")
      if (userData) {
        const user = JSON.parse(userData)
        console.log("User loaded from localStorage (sync):", user.student_id)
        return user
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error)
      localStorage.removeItem("campus_connect_user")
    }
  }
  return null
}

export async function refreshUserData(): Promise<User | null> {
  const currentUser = getUserFromStorageSync()
  if (!currentUser) return null

  try {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    const { data, error } = await supabase.from("users").select("*").eq("id", currentUser.id).single()

    if (error || !data) {
      console.error("Error refreshing user data:", error)
      return currentUser
    }

    const updatedUser = {
      ...data,
      username: data.student_id.toString(), // Use student_id as username
    }

    saveUserToStorage(updatedUser)
    return updatedUser
  } catch (error) {
    console.error("Error refreshing user data:", error)
    return currentUser
  }
}

export async function signOutUser() {
  console.log("Signing out and clearing all authentication data")

  try {
    // Clear Supabase session
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    console.log("Supabase session cleared")
  } catch (error) {
    console.error("Error clearing Supabase session:", error)
  }

  // Clear localStorage
  clearUserFromStorage()

  // Force redirect to login page
  window.location.href = "/auth/login"
}

export function clearUserFromStorage() {
  if (typeof window !== "undefined") {
    localStorage.clear()
    console.log("All localStorage cleared")
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getUserFromStorage()
  return user !== null
}

export async function isAdmin(): Promise<boolean> {
  const user = await getUserFromStorage()
  return user?.is_admin || false
}
