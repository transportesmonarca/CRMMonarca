export type LoginMoment = "day" | "evening" | "night"

export interface LoginBackground {
  id: string
  moment: LoginMoment
  url: string
  pathname: string
  uploaded_by?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  is_temp?: boolean
}

export type LoginBackgroundMap = Record<LoginMoment, LoginBackground[]>

export const LOGIN_MOMENTS: readonly LoginMoment[] = ["day", "evening", "night"]

// Imágenes predeterminadas que se mantienen en /public/login-images/...
export const FALLBACK_LOGIN_IMAGES: Record<LoginMoment, string[]> = {
  day: [
    "/login-images/dia/dia1.jpeg",
    "/login-images/dia/dia2.jpeg",
    "/login-images/dia/dia3.jpeg",
    "/login-images/dia/dia5.jpeg",
    "/login-images/dia/dia7.jpeg",
  ],
  // Tarde (reemplaza a "evening")
  evening: [
    "/login-images/tarde/tarde1.jpeg",
    "/login-images/tarde/tarde2.jpeg",
    // También se permiten archivos que hayan quedado con nombre distinto en la carpeta
    "/login-images/tarde/dia1.jpeg",
    "/login-images/tarde/dia4.jpeg",
  ],
  // Noche (reemplaza a "night")
  night: [
    "/login-images/noche/noche1.jpeg",
    "/login-images/noche/noche2.jpeg",
    "/login-images/noche/noche3.jpeg",
    "/login-images/noche/Gemini_Generated_Image_5payny5payny5pay.jpeg",
  ],
}

// Alias para compatibilidad con importaciones existentes
export const LOGIN_IMAGES = FALLBACK_LOGIN_IMAGES

export function createEmptyLoginBackgroundMap(): LoginBackgroundMap {
  return {
    day: [],
    evening: [],
    night: [],
  }
}

function isLoginMoment(value: unknown): value is LoginMoment {
  return typeof value === "string" && (LOGIN_MOMENTS as readonly string[]).includes(value)
}

export function groupLoginBackgrounds(records: LoginBackground[]): LoginBackgroundMap {
  const map = createEmptyLoginBackgroundMap()
  if (!Array.isArray(records)) return map

  for (const record of records) {
    if (!record || typeof record !== "object") continue
    if (!isLoginMoment((record as any).moment)) continue
    map[record.moment].push(record)
  }

  for (const moment of LOGIN_MOMENTS) {
    map[moment].sort((a, b) => {
      const aDate = a.created_at ? Date.parse(a.created_at) : 0
      const bDate = b.created_at ? Date.parse(b.created_at) : 0
      return bDate - aDate
    })
  }

  return map
}

export function getLoginMomentByHour(date: Date = new Date()): LoginMoment {
  const hour = date.getHours()

  if (hour >= 6 && hour < 18) {
    return "day"
  }
  if (hour >= 18 && hour < 21) {
    return "evening"
  }
  return "night"
}

export function getLoginImageByTime(
  images: Partial<Record<LoginMoment, string[]>> = FALLBACK_LOGIN_IMAGES,
  date: Date = new Date(),
): string {
  const moment = getLoginMomentByHour(date)
  const candidates = Array.isArray(images[moment]) && images[moment] && images[moment]!.length > 0
    ? images[moment]!
    : FALLBACK_LOGIN_IMAGES[moment]

  if (!candidates || candidates.length === 0) {
    return "/placeholder.svg?height=1080&width=1920&query=white trucks on highway"
  }

  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex]
}

export function getGreetingByTime(date: Date = new Date()): string {
  const hour = date.getHours()

  if (hour >= 6 && hour < 12) {
    return "Buenos días"
  } else if (hour >= 12 && hour < 18) {
    return "Buenas tardes"
  } else {
    return "Buen día"
  }
}
