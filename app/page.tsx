"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Code,
  ChevronRight,
  Github,
  Linkedin,
  Twitter,
  Loader2,
  Users,
  Calendar,
  Trophy,
  BookOpen,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [activeMembers, setActiveMembers] = useState(0)
  const [projects, setProjects] = useState(0)
  const [events, setEvents] = useState(0)
  const [quizzes, setQuizzes] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)

    const checkAuthStatus = () => {
      try {
        const userData = localStorage.getItem("user")
        const isLoggedIn = userData && userData !== "null"
        setIsAuthenticated(!!isLoggedIn)
      } catch (error) {
        console.error("Error checking auth status:", error)
        setIsAuthenticated(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    setTimeout(() => {
      checkAuthStatus()
    }, 100)

    const animateCounter = (setter: (value: number) => void, target: number, duration = 2000) => {
      let start = 0
      const increment = target / (duration / 16)
      const timer = setInterval(() => {
        start += increment
        if (start >= target) {
          setter(target)
          clearInterval(timer)
        } else {
          setter(Math.floor(start))
        }
      }, 16)
    }

    setTimeout(() => {
      animateCounter(setActiveMembers, 1247)
      animateCounter(setProjects, 389)
      animateCounter(setEvents, 127)
      animateCounter(setQuizzes, 56)
    }, 1000)
  }, [])

  const renderAuthButtons = () => {
    if (isCheckingAuth) {
      return (
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-gray-300 hover:text-white border border-gray-700 rounded-lg">
            <Loader2 className="w-3 h-3 animate-spin mr-2" />
            Sign in
          </Button>
          <Button className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg">
            <Loader2 className="w-3 h-3 animate-spin mr-2" />
            Join Us
          </Button>
        </div>
      )
    }

    if (isAuthenticated) {
      return (
        <Button asChild className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      )
    }

    return (
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" className="text-gray-300 hover:text-white border border-gray-700 rounded-lg">
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg">
          <Link href="/auth/sign-up">Join Us</Link>
        </Button>
      </div>
    )
  }

  const renderMainCTA = () => {
    if (isCheckingAuth) {
      return (
        <Button className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-4 rounded-lg text-lg font-semibold transform hover:scale-105 transition-all duration-200">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Join Us <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      )
    }

    if (isAuthenticated) {
      return (
        <Button
          asChild
          className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-4 rounded-lg text-lg font-semibold transform hover:scale-105 transition-all duration-200"
        >
          <Link href="/dashboard">
            Go to Dashboard <ChevronRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      )
    }

    return (
      <Button
        asChild
        className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-4 rounded-lg text-lg font-semibold transform hover:scale-105 transition-all duration-200"
      >
        <Link href="/auth/sign-up">
          Join Us <ChevronRight className="ml-2 w-5 h-5" />
        </Link>
      </Button>
    )
  }

  const processSteps = [
    {
      step: "STEP ONE",
      title: "Smart Registration",
      description: "Easy Signup!",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      step: "STEP TWO",
      title: "Build Your Profile",
      description: "Superfast!",
      icon: Code,
      color: "from-green-500 to-green-600",
    },
    {
      step: "STEP THREE",
      title: "Join Events & Quizzes",
      description: "Smartfirst!",
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
    },
    {
      step: "FINALLY",
      title: "Grow Your Network",
      description: "And Enjoy that!",
      icon: Trophy,
      color: "from-orange-500 to-orange-600",
    },
  ]

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center animate-pulse">
            <Code className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-600 rounded-full animate-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Enhanced Header */}
      <header className="border-b border-gray-800 bg-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">DCIC</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-gray-300 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                href="#process"
                className="text-gray-300 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="#community"
                className="text-gray-300 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                Community
              </Link>
              <Link
                href="#events"
                className="text-gray-300 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                Events
              </Link>
              {renderAuthButtons()}
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-800">
              <div className="flex flex-col gap-4 pt-4">
                <Link href="#features" className="text-gray-300 hover:text-orange-600 text-sm font-medium">
                  Features
                </Link>
                <Link href="#process" className="text-gray-300 hover:text-orange-600 text-sm font-medium">
                  How It Works
                </Link>
                <Link href="#community" className="text-gray-300 hover:text-orange-600 text-sm font-medium">
                  Community
                </Link>
                <Link href="#events" className="text-gray-300 hover:text-orange-600 text-sm font-medium">
                  Events
                </Link>
                <div className="pt-2">{renderAuthButtons()}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        {/* Hero section */}
        <section className="py-20 md:py-32 px-6 relative">
          <div className="container mx-auto text-center max-w-5xl relative z-10">
            <div className="animate-fade-in-up">
              <h1 className="font-bold text-5xl md:text-7xl text-white mb-8 leading-tight">
                Join the Future of
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
                  Development
                </span>
              </h1>

              <p className="text-gray-400 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
                Connect with innovators, showcase your skills, and unlock resources that will shape your tech career.
              </p>

              {renderMainCTA()}
            </div>

            {/* Stats Grid */}
            <div
              className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              {[
                { value: activeMembers, label: "Active Members", suffix: "+", icon: Users },
                { value: projects, label: "Projects Built", suffix: "+", icon: Code },
                { value: events, label: "Events Hosted", suffix: "+", icon: Calendar },
                { value: quizzes, label: "Tech Quizzes", suffix: "+", icon: BookOpen },
              ].map((stat, index) => (
                <Card
                  key={index}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group"
                >
                  <CardContent className="p-6 text-center">
                    <stat.icon className="w-8 h-8 text-orange-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <div className="text-3xl font-bold text-white mb-2">{`${stat.value}${stat.suffix}`}</div>
                    <div className="text-gray-400 text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="py-20 px-6 relative">
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="font-bold text-4xl md:text-5xl text-white mb-6">Connect with Innovators</h2>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Discover powerful features designed to accelerate your development journey
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Connect with Innovators",
                  description:
                    "Join a network of passionate developers, designers, and tech enthusiasts from around the world.",
                  icon: Users,
                  gradient: "from-blue-600 to-purple-600",
                },
                {
                  title: "Unlock Resources",
                  description: "Access exclusive tutorials, tools, and learning materials curated by industry experts.",
                  icon: BookOpen,
                  gradient: "from-green-600 to-teal-600",
                },
                {
                  title: "Showcase Your Skills",
                  description:
                    "Build your portfolio, participate in challenges, and get recognized for your achievements.",
                  icon: Trophy,
                  gradient: "from-orange-600 to-red-600",
                },
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-300 group cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-2xl text-white mb-4 group-hover:text-orange-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Step-by-Step Process Section */}
        <section id="process" className="py-20 px-6 relative">
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="font-bold text-4xl md:text-5xl text-white mb-6">How It Works</h2>
              <p className="text-gray-400 text-xl">Simple steps to join our community</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {processSteps.map((item, index) => (
                <Card
                  key={index}
                  className="bg-white/95 backdrop-blur-sm border-0 rounded-2xl p-6 hover:bg-white transition-all duration-300 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <CardContent className="p-0">
                    <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">{item.step}</div>

                    <h3 className="font-bold text-xl text-gray-900 mb-4 leading-tight">{item.title}</h3>

                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      {index < 3 && <ChevronRight className="w-5 h-5 text-gray-400" />}
                    </div>

                    <div className="text-sm font-medium text-gray-600">{item.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-20 px-6 relative">
          <div className="container mx-auto text-center max-w-4xl relative z-10">
            <div className="animate-fade-in-up">
              <h2 className="font-bold text-4xl md:text-5xl mb-8 text-white">Become a Member Today!</h2>
              <p className="text-gray-400 text-xl mb-12 leading-relaxed">
                Join thousands of developers shaping tomorrow's technology. Your journey starts here.
              </p>
              {renderMainCTA()}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-16 px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-start justify-between mb-12">
            <div className="flex-1">
              <h2 className="text-2xl font-medium text-white mb-2">Build Different™</h2>
              <div className="flex items-center gap-4 mt-6">
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-600"
                />
                <Button className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg px-6 py-2 font-medium">
                  Join for free
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <Twitter className="w-4 h-4 text-gray-400" />
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <Linkedin className="w-4 h-4 text-gray-400" />
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <Github className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <Button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 rounded-full px-8 py-2 font-medium">
              Contact
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div>
              <h3 className="font-medium text-white mb-4">Find Work</h3>
              <div className="space-y-3">
                <Link href="/apps" className="block text-gray-400 hover:text-white text-sm">
                  Explore Projects
                </Link>
                <Link href="/events" className="block text-gray-400 hover:text-white text-sm">
                  Discover Events
                </Link>
                <Link href="/quiz" className="block text-gray-400 hover:text-white text-sm">
                  Browse Quizzes
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-white mb-4">Find People</h3>
              <div className="space-y-3">
                <Link href="/leaderboard" className="block text-gray-400 hover:text-white text-sm">
                  Learn More
                </Link>
                <Link href="/auth/sign-up" className="block text-gray-400 hover:text-white text-sm">
                  Sign up
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-white mb-4">Company</h3>
              <div className="space-y-3">
                <Link href="/about" className="block text-gray-400 hover:text-white text-sm">
                  About us
                </Link>
                <Link href="/careers" className="block text-gray-400 hover:text-white text-sm">
                  Careers
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white text-sm">
                  Contact
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-white mb-4">Community tools</h3>
              <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex items-center justify-between">
              <div className="text-8xl md:text-9xl lg:text-[12rem] font-bold text-white tracking-[0.2em] leading-none">
                dcic
              </div>
              <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium">
                Visit site
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
