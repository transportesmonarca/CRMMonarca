import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Transportes Internacionales Monarca App",
  description: "Sistema de gestión para Transportes Internacionales Monarca",
  icons: {
    icon: "/images/logo-monarca-transparent.png",
    shortcut: "/images/logo-monarca-transparent.png",
    apple: "/images/logo-monarca-transparent.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
