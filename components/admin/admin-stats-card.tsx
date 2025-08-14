import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

interface AdminStatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  description?: string
}

export default function AdminStatsCard({ title, value, icon: Icon, trend, trendUp, description }: AdminStatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          {trend && (
            <Badge variant={trendUp ? "secondary" : "destructive"} className="text-xs">
              {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground mb-1">{value.toLocaleString()}</p>
          <p className="text-sm font-medium text-foreground mb-1">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
