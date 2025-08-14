"use server"

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Create a server client for database operations
function createSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const studentId = formData.get("studentId")
  const username = formData.get("username")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const major = formData.get("major")
  const graduationYear = formData.get("graduationYear")

  if (!studentId || !username || !password || !fullName) {
    return { error: "Student ID, username, password, and full name are required" }
  }

  const supabase = createSupabaseClient()

  try {
    // Check if student ID already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("student_id")
      .eq("student_id", Number.parseInt(studentId.toString()))
      .single()

    if (existingUser) {
      return { error: "Student ID already registered" }
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from("users")
      .select("username")
      .eq("username", username.toString())
      .single()

    if (existingUsername) {
      return { error: "Username already taken" }
    }

    // Create user in our custom users table
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        student_id: Number.parseInt(studentId.toString()),
        username: username.toString(),
        password: password.toString(),
        full_name: fullName.toString(),
        major: major?.toString() || null,
        graduation_year: graduationYear ? Number.parseInt(graduationYear.toString()) : null,
        is_admin: false,
      })
      .select()
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    const cookieStore = cookies()
    cookieStore.set("user_session", newUser.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Return user data to be stored in localStorage
    return {
      success: true,
      redirect: "/dashboard",
      user: {
        id: newUser.id,
        student_id: newUser.student_id,
        username: newUser.username,
        full_name: newUser.full_name,
        major: newUser.major,
        graduation_year: newUser.graduation_year,
        is_admin: newUser.is_admin,
        bio: newUser.bio,
        avatar_url: newUser.avatar_url,
        created_at: newUser.created_at,
      },
    }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const studentId = formData.get("studentId")
  const password = formData.get("password")

  if (!studentId || !password) {
    return { error: "Student ID and password are required" }
  }

  const supabase = createSupabaseClient()

  try {
    // Get user by student_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("student_id", Number.parseInt(studentId.toString()))
      .single()

    if (userError || !user) {
      return { error: "Invalid student ID or password" }
    }

    if (password.toString() !== user.password) {
      return { error: "Invalid student ID or password" }
    }

    const cookieStore = cookies()
    cookieStore.set("user_session", user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Return user data to be stored in localStorage
    return {
      success: true,
      redirect: "/dashboard",
      user: {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        full_name: user.full_name,
        major: user.major,
        graduation_year: user.graduation_year,
        is_admin: user.is_admin,
        bio: user.bio,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    }
  } catch (error) {
    console.error("Sign in error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getCurrentUser() {
  // This function is kept for compatibility but will not be used
  // Client components should use getUserFromStorage() from lib/client-auth.ts
  return null
}

export async function signOut() {
  // This function is kept for compatibility but will not be used
  // Client components should use clearUserFromStorage() from lib/client-auth.ts
  return { success: true }
}

export async function updateProfile(prevState: any, formData: FormData) {
  // This will be called from client-side with user data from localStorage
  const userId = formData.get("userId")
  if (!userId) {
    return { error: "Not authenticated" }
  }

  const fullName = formData.get("fullName")
  const username = formData.get("username")
  const major = formData.get("major")
  const graduationYear = formData.get("graduationYear")
  const bio = formData.get("bio")
  const avatarUrl = formData.get("avatar_url")
  const instagramUrl = formData.get("instagram_url")
  const githubUrl = formData.get("github_url")
  const facebookUrl = formData.get("facebook_url")
  const otherSocialUrl = formData.get("other_social_url")

  const supabase = createSupabaseClient()

  try {
    // Check if username is taken by another user
    if (username) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toString())
        .neq("id", userId.toString())
        .single()

      if (existingUser) {
        return { error: "Username already taken" }
      }
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        full_name: fullName?.toString(),
        username: username?.toString(),
        major: major?.toString(),
        graduation_year: graduationYear ? Number.parseInt(graduationYear.toString()) : null,
        bio: bio?.toString(),
        avatar_url: avatarUrl?.toString(),
        instagram_url: instagramUrl?.toString(),
        github_url: githubUrl?.toString(),
        facebook_url: facebookUrl?.toString(),
        other_social_url: otherSocialUrl?.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId.toString())
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return {
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    }
  } catch (error) {
    console.error("Update profile error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function clearSession() {
  const cookieStore = cookies()
  cookieStore.delete("user_session")
  return { success: true }
}
