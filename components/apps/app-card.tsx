import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, Heart, Eye, Star } from "lucide-react"
import Link from "next/link"
import type { App } from "@/lib/types"

interface AppCardProps {
  app: App & {
    creator?: { full_name?: string; avatar_url?: string }
    likes_count?: number
    is_liked?: boolean
    average_rating?: number
    total_ratings?: number
  }
  currentUserId: string
}

export default function AppCard({ app, currentUserId }: AppCardProps) {
  const creatorInitials = app.creator?.full_name
    ? app.creator.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const isCreator = app.created_by === currentUserId

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 hover:border-primary/20">
      <CardContent className="p-0">
        {app.image_url && (
          <div className="relative overflow-hidden rounded-t-lg">
            <img
              src={app.image_url || "/placeholder.svg"}
              alt={app.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 right-4">{isCreator && <Badge variant="secondary">Your App</Badge>}</div>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <Link href={`/apps/${app.id}`}>
              <h3 className="font-serif font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                {app.title}
              </h3>
            </Link>
          </div>

          {app.description && <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{app.description}</p>}

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {app.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {app.tags && app.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{app.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className={`w-4 h-4 ${app.is_liked ? "fill-red-500 text-red-500" : ""}`} />
                <span>{app.likes_count || 0}</span>
              </div>
              {app.average_rating && app.average_rating > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.round(app.average_rating) ? "fill-current text-yellow-500" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{app.average_rating.toFixed(1)}</span>
                  <span className="text-xs">({app.total_ratings})</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={app.creator?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {creatorInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{app.creator?.full_name || "Anonymous"}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild size="sm" className="flex-1">
              <Link href={`/apps/${app.id}`}>
                <Eye className="mr-2 w-4 h-4" />
                View Details
              </Link>
            </Button>

            {app.demo_url && (
              <Button asChild size="sm" variant="outline">
                <Link href={app.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            )}

            {app.github_url && (
              <Button asChild size="sm" variant="outline">
                <Link href={app.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
