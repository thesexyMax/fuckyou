export const formatDateTimeIST = (dateString: string | Date): string => {
  const date = new Date(dateString)
  return date
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-")
}

export const formatDateIST = (dateString: string | Date): string => {
  const date = new Date(dateString)
  return date
    .toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-")
}

export const formatTimeIST = (dateString: string | Date): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export const formatDateDDMMMYYYY = (dateString: string | Date): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export const formatDateTimeISTWithTime = (dateString: string | Date): string => {
  const date = new Date(dateString)
  const dateStr = date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return `${dateStr} at ${timeStr} IST`
}

export const convertISTToUTC = (istDateTimeLocal: string): string | null => {
  if (!istDateTimeLocal) return null

  // Parse the datetime-local input as if it's in IST timezone
  // The datetime-local format is "YYYY-MM-DDTHH:MM"
  const [datePart, timePart] = istDateTimeLocal.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)

  // Create a date object representing the IST time
  // We'll create it in UTC first, then adjust for IST offset
  const istDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))

  // IST is UTC+5:30, so to convert IST to UTC, we subtract 5.5 hours
  const utcDateTime = new Date(istDate.getTime() - 5.5 * 60 * 60 * 1000)

  return utcDateTime.toISOString()
}

export const convertUTCToISTForInput = (utcDateString: string | null): string => {
  if (!utcDateString) return ""

  const utcDate = new Date(utcDateString)

  // Convert UTC to IST by adding 5.5 hours
  const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000)

  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const year = istDate.getUTCFullYear()
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0")
  const day = String(istDate.getUTCDate()).padStart(2, "0")
  const hour = String(istDate.getUTCHours()).padStart(2, "0")
  const minute = String(istDate.getUTCMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export const getCurrentTimeIST = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
}

export const isQuizLive = (quiz: {
  quiz_type: string
  start_time?: string
  end_time?: string
  duration_minutes: number
  login_window_minutes: number
}): boolean => {
  const nowIST = getCurrentTimeIST()

  if (quiz.quiz_type === "live") {
    if (!quiz.start_time) return false

    const startTimeUTC = new Date(quiz.start_time)
    const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)
    const loginWindow = quiz.login_window_minutes * 60 * 1000
    const canLoginAt = new Date(startTimeIST.getTime() - loginWindow)
    const quizEndsAt = new Date(startTimeIST.getTime() + quiz.duration_minutes * 60 * 1000)

    return nowIST >= canLoginAt && nowIST <= quizEndsAt
  } else {
    if (!quiz.end_time) return true

    const endTimeUTC = new Date(quiz.end_time)
    const endTimeIST = new Date(endTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)
    return nowIST <= endTimeIST
  }
}

export const getCurrentISTAsISO = (): string => {
  return new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString()
}

export const calculateTimeRemainingIST = (startedAt: string, durationMinutes: number): number => {
  const startTimeUTC = new Date(startedAt)
  const startTimeIST = new Date(startTimeUTC.getTime() + 5.5 * 60 * 60 * 1000)
  const nowIST = getCurrentTimeIST()
  const elapsedSeconds = Math.floor((nowIST.getTime() - startTimeIST.getTime()) / 1000)
  const totalSeconds = durationMinutes * 60
  return Math.max(0, totalSeconds - elapsedSeconds)
}
