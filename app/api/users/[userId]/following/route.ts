import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from("user_follows")
    .select(`
      following_id,
      users!user_follows_following_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("follower_id", params.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const following = data.map((item) => item.users).filter(Boolean)

  return NextResponse.json({ following })
}
