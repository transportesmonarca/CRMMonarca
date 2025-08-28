"use client"

import { supabase } from "./supabase"

export interface User {
  id: string
  username: string
  role: "admin" | "operator" | "client"
  name: string
  nombre: string // Agregamos este campo para compatibilidad
}

// Usuarios de prueba (en producción esto vendría de la base de datos)
const testUsers: User[] = [
  {
    id: "1",
    username: "admin",
    role: "admin",
    name: "Administrador",
    nombre: "Administrador",
  },
  {
    id: "2",
    username: "operador",
    role: "operator",
    name: "Operador",
    nombre: "Operador",
  },
  {
    id: "3",
    username: "cliente",
    role: "client",
    name: "Cliente",
    nombre: "Cliente",
  },
]

// Contraseñas de prueba (en producción esto estaría hasheado)
const testPasswords: Record<string, string> = {
  admin: "admin123",
  operador: "op123",
  cliente: "client123",
}

// Hash seguro con PBKDF2 cuando hay WebCrypto; fallback determinista si no hay SubtleCrypto
function simpleHash(str: string): string {
  // No criptográfico; solo fallback para ambientes sin SubtleCrypto
  let h1 = 0xdeadbeef ^ str.length
  let h2 = 0x41c6ce57 ^ str.length
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0
  h2 = (h2 ^ (h2 >>> 13)) >>> 0
  const hex = h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")
  return (hex + hex + hex + hex).slice(0, 64)
}

async function hashPassword(password: string, saltBase64: string): Promise<string> {
  const subtle = (globalThis as any)?.crypto?.subtle
  if (!subtle) {
    // Fallback: mezclar password+salt con función determinista varias iteraciones
    let acc = `${password}:${saltBase64}`
    for (let i = 0; i < 10000; i++) acc = simpleHash(acc)
    return acc
  }
  const enc = new TextEncoder()
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0))
  const key = await subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]) 
  const bits = await subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256)
  const hashArray = Array.from(new Uint8Array(bits))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

function genSalt(bytes = 16): string {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
      const arr = new Uint8Array(bytes)
      ;(crypto as any).getRandomValues(arr)
      return btoa(String.fromCharCode(...Array.from(arr)))
    }
  } catch {}
  // Fallback no criptográfico
  let s = ""
  for (let i = 0; i < bytes; i++) s += String.fromCharCode(Math.floor(Math.random() * 256))
  return btoa(s)
}

function genUUID(): string {
  const g: any = (globalThis as any)
  const c = g?.crypto
  if (c?.randomUUID) return c.randomUUID()
  const getRV = c?.getRandomValues?.bind(c)
  const rnds: Uint8Array = getRV ? getRV(new Uint8Array(16)) : (() => {
    const a = new Uint8Array(16)
    for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256)
    return a
  })()
  // RFC 4122 version 4
  rnds[6] = (rnds[6] & 0x0f) | 0x40
  rnds[8] = (rnds[8] & 0x3f) | 0x80
  const hex = Array.from(rnds, (b) => b.toString(16).padStart(2, "0"))
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
}

export async function login(username: string, password: string): Promise<User | null> {
  try {
    // Buscar usuario en Supabase primero
    const { data: users, error } = await supabase
      .from("app_users")
      .select("id, username, nombre, password_hash, password_salt, is_admin, active, failed_attempts, locked_until")
      .ilike("username", username)
      .limit(1)

    if (!error && users && users.length === 1) {
      const u = users[0]
      if (!u.active) return null

      // Lockout vigente
      if (u.locked_until && new Date(u.locked_until) > new Date()) {
        return null
      }

      const computed = await hashPassword(password, u.password_salt)
      if (computed !== u.password_hash) {
        // incrementar failed_attempts y bloquear si excede
        const { data: sec } = await supabase.from("security_settings").select("max_failed_attempts, lockout_minutes").eq("id", 1).single()
        const maxFails = sec?.max_failed_attempts ?? 5
        const lockMins = sec?.lockout_minutes ?? 15
        const nextFails = (u.failed_attempts || 0) + 1
        const patch: any = { failed_attempts: nextFails }
        if (nextFails >= maxFails) {
          const lockedUntil = new Date(Date.now() + lockMins * 60_000).toISOString()
          patch.locked_until = lockedUntil
          patch.failed_attempts = 0
        }
        await supabase.from("app_users").update(patch).eq("id", u.id)
        return null
      }

      // Resetear failed_attempts
      await supabase.from("app_users").update({ failed_attempts: 0, locked_until: null }).eq("id", u.id)

  const user: User = {
        id: u.id,
        username: u.username,
        role: u.is_admin ? "admin" : "operator",
        name: u.nombre,
        nombre: u.nombre,
      }

      // Guardar sesión con expiración
      const { data: sec2 } = await supabase
        .from("security_settings")
        .select("session_timeout_minutes")
        .eq("id", 1)
        .single()
      const ttl = (sec2?.session_timeout_minutes ?? 30) * 60_000
      const session = { user, exp: Date.now() + ttl }
      if (typeof window !== "undefined" && window?.localStorage) {
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.setItem("session_exp", String(session.exp))
      }

      // Audit: LOGIN (no usar agregarAuditLog para evitar ciclo de imports)
      try {
        await supabase.from("audit_logs").insert({
          usuario: user.nombre || user.username,
          accion: "LOGIN",
          modulo: "Sistema",
          detalles: `Inicio de sesión de ${user.username}`,
          ip: "127.0.0.1",
          fecha_creacion: new Date().toISOString(),
        })
      } catch (e) {
        // Ignorar errores de auditoría para no bloquear login
        console.warn("No se pudo registrar LOGIN en audit_logs:", e)
      }
      return user
    }

    // Fallback a usuarios de prueba si tabla no existe
    const user = testUsers.find((u) => u.username.toLowerCase() === username.toLowerCase())
    if (!user) return null
    const expectedPassword = testPasswords[user.username]
    if (expectedPassword !== password) return null
    if (typeof window !== "undefined" && window?.localStorage) {
      localStorage.setItem("user", JSON.stringify(user))
      localStorage.setItem("session_exp", String(Date.now() + 30 * 60_000))
    }
    try {
      await supabase.from("audit_logs").insert({
        usuario: user.nombre || user.username,
        accion: "LOGIN",
        modulo: "Sistema",
        detalles: `Inicio de sesión de ${user.username} (modo prueba)`,
        ip: "127.0.0.1",
        fecha_creacion: new Date().toISOString(),
      })
    } catch {}
    return user
  } catch (error) {
    console.error("Error en login:", error)
    return null
  }
}

export function logout(): void {
  try {
    const userStr = localStorage.getItem("user")
    const user = userStr ? (JSON.parse(userStr) as User) : null
    // Intentar guardar LOGOUT antes de limpiar
    if (user) {
      ;(async () => {
        try {
          await supabase.from("audit_logs").insert({
            usuario: user.nombre || user.username,
            accion: "LOGOUT",
            modulo: "Sistema",
            detalles: `Cierre de sesión de ${user.username}`,
            ip: "127.0.0.1",
            fecha_creacion: new Date().toISOString(),
          })
        } catch (e) {
          console.warn("No se pudo registrar LOGOUT en audit_logs:", e)
        }
      })()
    }
  } finally {
    if (typeof window !== "undefined" && window?.localStorage) {
      localStorage.removeItem("user")
      localStorage.removeItem("session_exp")
    }
    console.log("Usuario deslogueado")
  }
}

export function getCurrentUser(): User | null {
  try {
    if (typeof window === "undefined" || !window?.localStorage) return null
    const userStr = localStorage.getItem("user")
    if (!userStr) return null

    const expStr = localStorage.getItem("session_exp")
    if (expStr && Date.now() > Number(expStr)) {
      // Expir f3 la sesi f3n
      localStorage.removeItem("user")
      localStorage.removeItem("session_exp")
      return null
    }

    const user = JSON.parse(userStr)
    // Avoid noisy logs on server builds
    try {
      console.log("Usuario actual obtenido:", user)
    } catch {}
    return user
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    return null
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  try {
    const authenticated = getCurrentUser() !== null
    try {
      console.log("Usuario autenticado:", authenticated)
    } catch {}
    return authenticated
  } catch {
    return false
  }
}

export function hasRole(requiredRole: User["role"]): boolean {
  const user = getCurrentUser()
  if (!user) return false

  // Admin tiene acceso a todo
  if (user.role === "admin") return true

  // Verificar rol específico
  return user.role === requiredRole
}

// Función para verificar contraseña del audit log
export function verifyAuditPassword(password: string): boolean {
  const correctPassword = "Adele.2013"
  console.log("Verificando contraseña audit log:", { password, correctPassword })
  return password === correctPassword
}

// Verificar contraseña del usuario actual (requiere admin para operaciones sensibles)
export async function verifyCurrentUserPassword(password: string): Promise<boolean> {
  const user = getCurrentUser()
  if (!user) return false
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, password_hash, password_salt, is_admin")
      .eq("id", user.id)
      .single()

    if (!error && data) {
      if (!data.is_admin) return false
      const hash = await hashPassword(password, data.password_salt)
      return hash === data.password_hash
    }
  } catch (e) {
    console.warn("Fallo verificación contra DB, intentando fallback:", e)
  }

  // Fallback a usuarios de prueba
  if (user.role === "admin") {
    const expected = (testPasswords as any)[user.username]
    if (!expected) return false
    return expected === password
  }
  return false
}

// Gestión de usuarios secundarios
export async function createUser(username: string, nombre: string, password: string, isAdmin = false) {
  const salt = genSalt()
  const hash = await hashPassword(password, salt)
  const id = genUUID()
  const { error } = await supabase.from("app_users").insert({
    id,
    username,
    nombre,
    password_hash: hash,
    password_salt: salt,
    is_admin: !!isAdmin,
  })
  if (error) throw error
  return { id, username, nombre, is_admin: !!isAdmin }
}

export async function listUsers() {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, nombre, is_admin, active, failed_attempts, locked_until, created_at, updated_at")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data || []
}

export async function resetPassword(userId: string, newPassword: string) {
  const salt = genSalt()
  const hash = await hashPassword(newPassword, salt)
  const { error } = await supabase
    .from("app_users")
    .update({ password_hash: hash, password_salt: salt })
    .eq("id", userId)
  if (error) throw error
  return true
}

// Desactivar (soft delete) usuario secundario: no afecta registros históricos
export async function deactivateUser(userId: string) {
  const { error } = await supabase
    .from("app_users")
    .update({ active: false, failed_attempts: 0, locked_until: null })
    .eq("id", userId)
  if (error) throw error
  return true
}

export async function setSecuritySettings(params: { max_failed_attempts: number; lockout_minutes: number; session_timeout_minutes: number }) {
  const { error } = await supabase
    .from("security_settings")
    .update({
      max_failed_attempts: params.max_failed_attempts,
      lockout_minutes: params.lockout_minutes,
      session_timeout_minutes: params.session_timeout_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
  if (error) throw error
  return true
}

export async function getSecuritySettings() {
  const { data, error } = await supabase
    .from("security_settings")
    .select("max_failed_attempts, lockout_minutes, session_timeout_minutes")
    .eq("id", 1)
    .single()
  if (error) throw error
  return data
}
