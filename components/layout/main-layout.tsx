"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { isAuthenticated } from "@/lib/auth"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Verificar autenticación al montar el componente
    setMounted(true)
    if (!isAuthenticated()) {
      // navigate after mount
      router.push("/login")
    }
  }, [router])

  // Auto-close sidebar on route change (mobile) and on small window widths
  useEffect(() => {
    // Close when the pathname changes (navigation)
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const onResize = () => {
      try {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          setSidebarOpen(false)
        }
      } catch {}
    }
    // Run once
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Si no está autenticado, no renderizar nada para evitar flash
  // During SSR or before mount, render nothing (stable) to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  if (!isAuthenticated()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
