import { QrCode } from "lucide-react"

export default function AdminCheckinLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-background flex items-center justify-center">
      <div className="text-center">
        <QrCode className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
        <p className="text-lg text-muted-foreground">Loading check-in system...</p>
      </div>
    </div>
  )
}
