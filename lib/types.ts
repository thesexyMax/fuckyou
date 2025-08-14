export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  college?: string
  major?: string
  graduation_year?: number
  role: "student" | "admin"
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description?: string
  event_date: string
  location?: string
  max_attendees?: number
  image_url?: string
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
  registrations_count?: number
  is_registered?: boolean
}

export interface App {
  id: string
  title: string
  description?: string
  github_url?: string
  demo_url?: string
  image_url?: string
  tags?: string[]
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
  likes_count?: number
  is_liked?: boolean
}
