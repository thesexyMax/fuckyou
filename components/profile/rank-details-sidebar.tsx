"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Code, Calendar, Brain, Target } from "lucide-react"

interface RankDetailsSidebarProps {
  isOpen: boolean
  onClose: () => void
  userStats: {
    rank: number
    totalPoints: number
    quizAttempts: number
    appsPublished: number
    eventsCreated: number
    fullName: string
  }
}

export default function RankDetailsSidebar({ isOpen, onClose, userStats }: RankDetailsSidebarProps) {
  const getRankTitle = (rank: number) => {
    if (rank === 1) return "🏆 Champion"
    if (rank <= 3) return "🥉 Top Performer"
    if (rank <= 10) return "⭐ Rising Star"
    if (rank <= 50) return "🚀 Active Member"
    return "👤 Community Member"
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500"
    if (rank <= 3) return "bg-orange-500"
    if (rank <= 10) return "bg-blue-500"
    if (rank <= 50) return "bg-green-500"
    return "bg-gray-500"
  }

  const getNextRankTarget = (rank: number) => {
    if (rank > 50) return { target: 50, title: "Top 50" }
    if (rank > 10) return { target: 10, title: "Top 10" }
    if (rank > 3) return { target: 3, title: "Top 3" }
    if (rank > 1) return { target: 1, title: "Champion" }
    return null
  }

  const nextRank = getNextRankTarget(userStats.rank)
  const progressToNext = nextRank
    ? Math.max(0, 100 - ((userStats.rank - nextRank.target) / nextRank.target) * 100)
    : 100

  const quizPoints = Math.round(userStats.totalPoints - userStats.appsPublished * 50 - userStats.eventsCreated * 30)
  const appPoints = userStats.appsPublished * 50
  const eventPoints = userStats.eventsCreated * 30
  const calculatedTotal = quizPoints + appPoints + eventPoints

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="space-y-4 flex-shrink-0 p-6 pb-4">
          <SheetTitle className="text-center">Rank Details</SheetTitle>

          <div className="text-center space-y-3">
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <Badge
                className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 ${getRankColor(userStats.rank)}`}
              >
                #{userStats.rank}
              </Badge>
            </div>

            <div>
              <h3 className="font-bold text-xl">{userStats.fullName}</h3>
              <p className="text-sm text-gray-600">{getRankTitle(userStats.rank)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Total Points */}
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{userStats.totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>

            {/* Progress to Next Rank */}
            {nextRank && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {nextRank.title}</span>
                  <span>{Math.round(progressToNext)}%</span>
                </div>
                <Progress value={progressToNext} className="h-2" />
              </div>
            )}

            {/* Detailed Stats */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Contribution Stats
              </h4>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Quiz Attempts</span>
                  </div>
                  <Badge variant="secondary">{userStats.quizAttempts}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Apps Published</span>
                  </div>
                  <Badge variant="secondary">{userStats.appsPublished}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Events Created</span>
                  </div>
                  <Badge variant="secondary">{userStats.eventsCreated}</Badge>
                </div>
              </div>
            </div>

            {/* Points Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Star className="w-5 h-5" />
                Points Breakdown
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Quiz Points</span>
                  <span className="font-medium">{Math.max(0, quizPoints)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>App Points (50 each)</span>
                  <span className="font-medium">{appPoints} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Event Points (30 each)</span>
                  <span className="font-medium">{eventPoints} pts</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{userStats.totalPoints} pts</span>
                </div>
                {calculatedTotal !== userStats.totalPoints && (
                  <div className="text-xs text-orange-600 mt-1">
                    * Points may include bonus achievements or different scoring
                  </div>
                )}
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {userStats.quizAttempts > 0 && (
                  <Badge variant="outline" className="bg-blue-50">
                    🧠 Quiz Taker
                  </Badge>
                )}
                {userStats.appsPublished > 0 && (
                  <Badge variant="outline" className="bg-green-50">
                    💻 App Developer
                  </Badge>
                )}
                {userStats.eventsCreated > 0 && (
                  <Badge variant="outline" className="bg-purple-50">
                    📅 Event Organizer
                  </Badge>
                )}
                {userStats.rank <= 10 && (
                  <Badge variant="outline" className="bg-yellow-50">
                    ⭐ Top 10
                  </Badge>
                )}
              </div>
            </div>

            <div className="h-4"></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
