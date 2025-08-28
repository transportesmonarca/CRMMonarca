"use client"

import { cn } from "@/lib/utils"
import {
  Package,
  Users,
  Truck,
  BarChart3,
  FileText,
  LogOut,
  X,
  Route,
  Container,
  Calendar,
  Settings,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getCurrentUser, logout } from "@/lib/auth"
import { useEffect, useState } from "react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Menú unificado para todos los roles
const menuItems = [
  { icon: BarChart3, label: "Dashboard", href: "/", color: "from-blue-500 to-blue-600" },
  { icon: Users, label: "Gestión de Clientes", href: "/clientes", color: "from-green-500 to-green-600" },
  { icon: Truck, label: "Gestión de Tractocamiones", href: "/camiones", color: "from-orange-500 to-orange-600" },
  { icon: Container, label: "Gestión de Remolques", href: "/remolques", color: "from-purple-500 to-purple-600" },
  { icon: Users, label: "Gestión de Operadores", href: "/operadores", color: "from-teal-500 to-teal-600" },
  { icon: Package, label: "Crear Embarques", href: "/embarques", color: "from-indigo-500 to-indigo-600" },
  { icon: Route, label: "Asignación de Embarques", href: "/asignar-operadores", color: "from-pink-500 to-pink-600" },
  {
    icon: DollarSign,
    label: "Facturación / Cobranza",
    href: "/facturacion-cobranza",
    color: "from-emerald-500 to-emerald-600",
  },
  { icon: Calendar, label: "Recordatorios", href: "/recordatorios", color: "from-red-500 to-red-600" },
  { icon: FileText, label: "Consultas y Reportes", href: "/consultas", color: "from-cyan-500 to-cyan-600" },
  { icon: Settings, label: "Configuración", href: "/configuracion", color: "from-gray-500 to-gray-600" },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Evitar scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (typeof window === "undefined") return
    const isMobile = window.innerWidth < 1024
    if (isOpen && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev || ""
      }
    }
    return
  }, [isOpen])

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
  }, [])

  if (!currentUser) return null

  return (
    <>
  {/* Overlay para móvil (detrás del sidebar) */}
  {isOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-20 left-0 z-50 h-[calc(100vh-5rem)] w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out shadow-lg",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Navegación */}
          {/*
            Enable vertical touch scrolling on mobile/iPad: `overflow-y-auto` + `touch-pan-y`.
            Keep desktop behavior unchanged with `lg:overflow-y-visible`.
            Add WebKit momentum scrolling via inline style for iOS.
          */}
          <nav
            className="flex-1 px-4 pb-4 pt-4 overflow-y-auto lg:overflow-y-visible"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-[#FFF2CD] text-amber-800 border-r-4 border-amber-600 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                        isActive
                          ? `bg-gradient-to-r ${item.color} text-white shadow-sm`
                          : "text-gray-500 group-hover:text-gray-700",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                logout()
                window.location.href = "/login"
              }}
              className="flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full text-left group"
            >
              <LogOut className="h-5 w-5 text-gray-500 group-hover:text-red-500 transition-colors" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
