import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar, Code, Heart, UserPlus, Activity } from "lucide-react"

export default async function RecentActivityFeed() {
  const supabase = createClient()

  // Get recent activities from different tables
  const [
    { data: recentRegistrations },
    { data: recentLikes },
    { data: recentUsers },
    { data: recentEvents },
    { data: recentApps },
  ] = await Promise.all([
    supabase
      .from("event_registrations")
      .select(`
        *,
        user:profiles(full_name, avatar_url),
        event:events(title)
      `)
      .order("registered_at", { ascending: false })
      .limit(3),
    supabase
      .from("app_likes")
      .select(`
        *,
        user:profiles(full_name, avatar_url),
        app:apps(title)
      `)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(3),
    supabase
      .from("events")
      .select(`
        *,
        creator:profiles(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("apps")
      .select(`
        *,
        creator:profiles(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(2),
  ])

  // Combine and sort all activities
  const activities = [
    ...(recentRegistrations?.map((reg: any) => ({
      id: `reg-${reg.id}`,
      type: "registration",
      user: reg.user,
      target: reg.event?.title,
      timestamp: reg.registered_at,
      icon: Calendar,
    })) || []),
    ...(recentLikes?.map((like: any) => ({
      id: `like-${like.id}`,
      type: "like",
      user: like.user,
      target: like.app?.title,
      timestamp: like.created_at,
      icon: Heart,
    })) || []),
    ...(recentUsers?.map((user: any) => ({
      id: `user-${user.id}`,
      type: "signup",
      user: user,
      target: null,
      timestamp: user.created_at,
      icon: UserPlus,
    })) || []),
    ...(recentEvents?.map((event: any) => ({
      id: `event-${event.id}`,
      type: "event",
      user: event.creator,
      target: event.title,
      timestamp: event.created_at,
      icon: Calendar,
    })) || []),
    ...(recentApps?.map((app: any) => ({
      id: `app-${app.id}`,
      type: "app",
      user: app.creator,
      target: app.title,
      timestamp: app.created_at,
      icon: Code,
    })) || []),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case "registration":
        return `registered for "${activity.target}"`
      case "like":
        return `liked "${activity.target}"`
      case "signup":
        return "joined the platform"
      case "event":
        return `created event "${activity.target}"`
      case "app":
        return `published app "${activity.target}"`
      default:
        return "performed an action"
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "registration":
        return "bg-blue-100 text-blue-800"
      case "like":
        return "bg-red-100 text-red-800"
      case "signup":
        return "bg-green-100 text-green-800"
      case "event":
        return "bg-purple-100 text-purple-800"
      case "app":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <Badge variant="outline">{activities.length} activities</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            const userInitials = activity.user?.full_name
              ? activity.user.full_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
              : "U"

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="secondary" className={`text-xs ${getActivityColor(activity.type)}`}>
                      {activity.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user?.full_name || "Anonymous"}</span>{" "}
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )
          })}
          {activities.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
