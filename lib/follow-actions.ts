"use server"

import { createClient } from "@supabase/supabase-js"

function createSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function followUser(followerId: string, followingId: string) {
  const supabase = createSupabaseClient()

  const { error } = await supabase.from("user_follows").insert({
    follower_id: followerId,
    following_id: followingId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  const supabase = createSupabaseClient()

  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function checkIfFollowing(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single()

  return !error && !!data
}
