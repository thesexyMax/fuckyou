"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, Instagram, Github, Facebook, Link } from "lucide-react"
import { updateProfile } from "@/lib/auth"
import { toast } from "sonner"

interface ProfileFormProps {
  user: {
    id: string
    student_id: number
    username: string
    full_name: string
    major?: string
    graduation_year?: number
    bio?: string
    avatar_url?: string
    instagram_url?: string
    github_url?: string
    facebook_url?: string
    other_social_url?: string
    is_admin: boolean
  }
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    username: user.username || "",
    bio: user.bio || "",
    major: user.major || "",
    graduation_year: user.graduation_year?.toString() || "",
    avatar_url: user.avatar_url || "",
    instagram_url: user.instagram_url || "",
    github_url: user.github_url || "",
    facebook_url: user.facebook_url || "",
    other_social_url: user.other_social_url || "",
  })

  const hasUsername = Boolean(user.username)

  const initials = formData.full_name
    ? formData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.username?.[0]?.toUpperCase() || "U"

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)

    try {
      formData.append("userId", user.id)

      const result = await updateProfile(null, formData)

      if (result.error) {
        toast.error(result.error, {
          position: "top-center",
          duration: 5000,
          style: {
            zIndex: 9999,
          },
        })
      } else if (result.success) {
        toast.success(result.message || "Profile updated successfully!", {
          position: "top-center",
          duration: 4000,
          style: {
            zIndex: 9999,
          },
        })
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user))
        }
        setTimeout(() => {
          router.refresh()
        }, 1000)
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.", {
        position: "top-center",
        duration: 5000,
        style: {
          zIndex: 9999,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i - 5)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url || "/placeholder.svg"} alt={formData.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Profile Picture URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatar_url"
                    name="avatar_url"
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Enter a URL to your profile picture</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Your unique username"
                  required
                  disabled={hasUsername}
                  className={hasUsername ? "bg-muted" : ""}
                />
                {hasUsername && <p className="text-xs text-muted-foreground">Username cannot be changed once set</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Major/Field of Study</Label>
                <Input
                  id="major"
                  name="major"
                  type="text"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Select
                  name="graduationYear"
                  value={formData.graduation_year}
                  onValueChange={(value) => setFormData({ ...formData, graduation_year: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input type="text" value={user.student_id} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Student ID cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself, your interests, and what you're working on..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Share your interests, projects, or anything you'd like the community to know about you.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl flex items-center gap-2">
            <Link className="w-5 h-5" />
            Social Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram
                </Label>
                <Input
                  id="instagram_url"
                  name="instagram_url"
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github_url" className="flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  GitHub
                </Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  id="facebook_url"
                  name="facebook_url"
                  type="url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_social_url" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Other Social Link
                </Label>
                <Input
                  id="other_social_url"
                  name="other_social_url"
                  type="url"
                  value={formData.other_social_url}
                  onChange={(e) => setFormData({ ...formData, other_social_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-accent transform hover:scale-105 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Social Links"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
