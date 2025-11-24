"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  Users,
  Truck,
  Container,
  Bell,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { obtenerEmbarques, obtenerRecordatorios, obtenerOperadores, obtenerCamiones, obtenerRemolques } from "@/lib/supabase"
import type { Embarque, Recordatorio, Operador, Camion, Remolque } from "@/lib/supabase"
// import { Progress } from "@/components/ui/progress"

export function Dashboard() {
  const [embarquesRecientes, setEmbarquesRecientes] = useState<Embarque[]>([])
  const [recordatoriosUrgentes, setRecordatoriosUrgentes] = useState<Recordatorio[]>([])
  const [, setAgendaHoy] = useState<Embarque[]>([])
  const [, setEmbarquesSinAsignar] = useState<Embarque[]>([])
  const [vencimientos, setVencimientos] = useState<Recordatorio[]>([])
  const [, setUtilizacion] = useState({ operadores: 0, camiones: 0, remolques: 0 })
  const [cumples, setCumples] = useState<Array<{ id: string; nombre: string; fecha: string; dias: number; nacimiento?: string }>>([])
  const [stats, setStats] = useState({
    embarques: { total: 0, creados: 0, asignados: 0, enTransito: 0, entregados: 0 },
    operadores: { total: 0, activos: 0, inactivos: 0, suspendidos: 0 },
    camiones: { total: 0, optima: 0, noOptima: 0, fueraServicio: 0 },
    remolques: { total: 0, disponibles: 0, enUso: 0, mantenimiento: 0 },
    recordatorios: { total: 0, pendientes: 0, vencidos: 0, completados: 0 },
  })
  const [mostrarEmbarquesRecientes, setMostrarEmbarquesRecientes] = useState(false)
  const [mostrarRecordatoriosUrgentes, setMostrarRecordatoriosUrgentes] = useState(false)
  const [mostrarVencimientos, setMostrarVencimientos] = useState(false)
  const [mostrarCumples, setMostrarCumples] = useState(false)

  useEffect(() => {

    const cargarDatos = async () => {
      try {
        // Cargar últimos 5 embarques creados
        const { data: embarques } = await obtenerEmbarques()
        const embarquesOrdenados =
          (embarques as Embarque[])
            ?.sort((a: Embarque, b: Embarque) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
            ?.slice(0, 5) || []
        setEmbarquesRecientes(embarquesOrdenados)

        // Cargar recordatorios urgentes (vencidos o próximos a vencer en 15 días)
        const { data: recordatorios } = await obtenerRecordatorios()
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0) // Normalizar a inicio del día
        const en15Dias = new Date()
        en15Dias.setDate(hoy.getDate() + 15)
        en15Dias.setHours(23, 59, 59, 999) // Final del día

        const recordatoriosUrgentes =
          (recordatorios as Recordatorio[])
            ?.filter((r: Recordatorio) => {
              const fechaVencimiento = new Date(r.fecha_vencimiento)
              fechaVencimiento.setHours(0, 0, 0, 0) // Normalizar a inicio del día
              // Incluir: ya vencidos o próximos a vencer en 15 días
              return fechaVencimiento <= en15Dias && r.estado !== "completado"
            })
            ?.sort((a: Recordatorio, b: Recordatorio) => {
              // Ordenar: primero los vencidos, luego por proximidad de vencimiento
              const fechaA = new Date(a.fecha_vencimiento)
              const fechaB = new Date(b.fecha_vencimiento)
              fechaA.setHours(0, 0, 0, 0)
              fechaB.setHours(0, 0, 0, 0)
              return fechaA.getTime() - fechaB.getTime()
            })
            ?.slice(0, 8) || [] // Mostrar hasta 8 recordatorios
        setRecordatoriosUrgentes(recordatoriosUrgentes)

        // Agenda de hoy y sin asignar
        const sameDay = (iso?: string) => {
          if (!iso) return false
          const d = new Date(iso)
          return (
            d.getFullYear() === hoy.getFullYear() &&
            d.getMonth() === hoy.getMonth() &&
            d.getDate() === hoy.getDate()
          )
        }

        const agenda = (embarques as Embarque[])
          ?.filter((e: Embarque) => sameDay(e.fecha_recolecta) || sameDay(e.fecha_entrega))
          ?.slice(0, 5) || []
        setAgendaHoy(agenda)

        const sinAsignar = (embarques as Embarque[])
          ?.filter((e: Embarque) => !e.operador_id || !e.camion_id || (!e.remolque_manual && !e.remolque_id))
          ?.slice(0, 5) || []
        setEmbarquesSinAsignar(sinAsignar)

        // Obtener operadores, camiones y remolques
        const [{ data: operadores }, { data: camiones }, { data: remolques }] = await Promise.all([
          obtenerOperadores(),
          obtenerCamiones(),
          obtenerRemolques(),
        ])

        // Calcular estadísticas
        const ops: Operador[] = (operadores as Operador[]) || []
        const cms: Camion[] = (camiones as Camion[]) || []
        const rms: Remolque[] = (remolques as Remolque[]) || []
        const statsEmbarques = {
          total: (embarques as Embarque[])?.length || 0,
          creados: (embarques as Embarque[])?.filter((e: Embarque) => e.estado === "creado")?.length || 0,
          asignados: (embarques as Embarque[])?.filter((e: Embarque) => e.estado === "listo-para-asignar")?.length || 0,
          enTransito: (embarques as Embarque[])?.filter((e: Embarque) => e.estado === "en-transito")?.length || 0,
          entregados: (embarques as Embarque[])?.filter((e: Embarque) => e.estado === "entregado")?.length || 0,
        }

        const statsRecordatorios = {
          total: (recordatorios as Recordatorio[])?.length || 0,
          pendientes: (recordatorios as Recordatorio[])?.filter((r: Recordatorio) => r.estado === "pendiente")?.length || 0,
          vencidos:
            (recordatorios as Recordatorio[])?.filter((r: Recordatorio) => {
              const fechaVencimiento = new Date(r.fecha_vencimiento)
              return fechaVencimiento < hoy && r.estado !== "completado"
            })?.length || 0,
          completados: (recordatorios as Recordatorio[])?.filter((r: Recordatorio) => r.estado === "completado")?.length || 0,
        }

        const statsOperadores = {
          total: ops.length || 0,
          activos: ops.filter((o) => o.estado === "activo")?.length || 0,
          inactivos: ops.filter((o) => o.estado === "inactivo")?.length || 0,
          suspendidos: ops.filter((o) => o.estado === "suspendido")?.length || 0,
        }

        const statsCamiones = {
          total: cms.length || 0,
          optima: cms.filter((c) => c.estado === "optima")?.length || 0,
          noOptima: cms.filter((c) => c.estado === "no-optima")?.length || 0,
          fueraServicio: cms.filter((c) => c.estado === "fuera-servicio")?.length || 0,
        }

        const statsRemolques = {
          total: rms.length || 0,
          disponibles: rms.filter((r) => r.estado === "disponible")?.length || 0,
          enUso: rms.filter((r) => r.estado === "en-uso")?.length || 0,
          mantenimiento: rms.filter((r) => r.estado === "mantenimiento")?.length || 0,
        }

        setStats((prevStats) => ({
          ...prevStats,
          embarques: statsEmbarques,
          recordatorios: statsRecordatorios,
          operadores: statsOperadores,
          camiones: statsCamiones,
          remolques: statsRemolques,
        }))

        // Vencimientos (selección por tipo conocido) con semáforo
        const tiposVenc = ["licencia", "apto", "visa", "seguro", "inspe", "verifi"]
        const venci = (recordatorios as Recordatorio[])
          ?.filter((r: Recordatorio) => {
            const t = (r.tipo || r.titulo || "").toLowerCase()
            return tiposVenc.some((k) => t.includes(k)) && r.estado !== "completado"
          })
          ?.sort((a: Recordatorio, b: Recordatorio) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
          ?.slice(0, 5) || []
        setVencimientos(venci.length ? venci : recordatoriosUrgentes)

        // Utilización de flota/operadores basada en embarques en tránsito
        const activos = (embarques as Embarque[])?.filter((e: Embarque) => e.estado === "en-transito") || []
        const opEnUso = new Set(activos.map((e) => e.operador_id).filter(Boolean)).size
        const camEnUso = new Set(activos.map((e) => e.camion_id).filter(Boolean)).size
        const remEnUso = new Set(activos.map((e) => e.remolque_id).filter(Boolean)).size
        setUtilizacion({
          operadores: statsOperadores.total ? Math.round((opEnUso / statsOperadores.total) * 100) : 0,
          camiones: statsCamiones.total ? Math.round((camEnUso / statsCamiones.total) * 100) : 0,
          remolques: statsRemolques.total ? Math.round((remEnUso / statsRemolques.total) * 100) : 0,
        })

        // Cumpleaños de operadores: calcular próxima ocurrencia y ordenar (mostrar todos, el más próximo primero)
    const proximosCumples = ops
          .filter((o) => !!o.fecha_nacimiento)
          .map((o) => {
            const fn = new Date(o.fecha_nacimiento as string)
            const now = new Date()
            const next = new Date(now.getFullYear(), fn.getMonth(), fn.getDate())
            if (next < now) next.setFullYear(now.getFullYear() + 1)
            const dias = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { id: o.id, nombre: `${o.nombre} ${o.apellidos || ""}`.trim(), fecha: next.toISOString(), dias, nacimiento: o.fecha_nacimiento || undefined }
          })
          .sort((a, b) => a.dias - b.dias)
          .slice(0, 5)
        setCumples(proximosCumples)
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error)
      }
    }

    cargarDatos()
  }, [])

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "creado":
        return <Badge className="bg-blue-100 text-blue-800">Creado</Badge>
      case "asignado":
        return <Badge className="bg-yellow-100 text-yellow-800">Asignado</Badge>
      case "en-transito":
        return <Badge className="bg-orange-100 text-orange-800">En Tránsito</Badge>
      case "entregado":
        return <Badge className="bg-green-100 text-green-800">Entregado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case "alta":
        return <Badge className="bg-red-100 text-red-800">Alta</Badge>
      case "media":
        return <Badge className="bg-yellow-100 text-yellow-800">Media</Badge>
      case "baja":
        return <Badge className="bg-green-100 text-green-800">Baja</Badge>
      default:
        return <Badge variant="outline">{prioridad}</Badge>
    }
  }

  const getMobileEstadoBadge = (estado: string) => {
    if (
      estado === "listo-para-asignar" ||
      estado === "listo-para-asignar_contingencia" ||
      estado === "listo-para-asignar_contingencia_FF"
    ) {
      return <Badge className="bg-blue-100 text-blue-800">Asignar</Badge>
    }

    if (estado === "asignado_contingencia_FF") {
      return <Badge className="bg-red-100 text-red-800">Contingencia</Badge>
    }

    return getEstadoBadge(estado)
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
        <Card className="h-full">
          <CardContent className="pt-4 pb-4 md:pt-6 md:pb-6 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs leading-tight md:text-sm font-medium text-gray-600 truncate">Embarques</p>
                <p className="text-2xl font-bold text-blue-700">{stats.embarques.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.embarques.creados} creados • {stats.embarques.asignados} asignados
                </p>
              </div>
              <Package className="hidden md:block h-8 w-8 text-blue-700 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="pt-4 pb-4 md:pt-6 md:pb-6 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs leading-tight md:text-sm font-medium text-gray-600 truncate">Operadores</p>
                <p className="text-2xl font-bold text-green-700">{stats.operadores.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.operadores.activos} activos • {stats.operadores.inactivos} inactivos
                </p>
              </div>
              <Users className="hidden md:block h-8 w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="pt-4 pb-4 md:pt-6 md:pb-6 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs leading-tight md:text-sm font-medium text-gray-600 truncate">Camiones</p>
                <p className="text-2xl font-bold text-orange-700">{stats.camiones.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.camiones.optima} óptimos • {stats.camiones.noOptima} no óptimos
                </p>
              </div>
              <Truck className="hidden md:block h-8 w-8 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="pt-4 pb-4 md:pt-6 md:pb-6 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs leading-tight md:text-sm font-medium text-gray-600 truncate">Remolques</p>
                <p className="text-2xl font-bold text-purple-700">{stats.remolques.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.remolques.disponibles} disponibles • {stats.remolques.enUso} en uso
                </p>
              </div>
              <Container className="hidden md:block h-8 w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="pt-4 pb-4 md:pt-6 md:pb-6 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs leading-tight md:text-sm font-medium text-gray-600 truncate">Recordatorios</p>
                <p className="text-2xl font-bold text-red-700">{stats.recordatorios.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.recordatorios.pendientes} pendientes • {stats.recordatorios.vencidos} vencidos
                </p>
              </div>
              <Bell className="hidden md:block h-8 w-8 text-red-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

  {/* Sección de embarques y recordatorios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embarques recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 md:text-lg">Embarques Recientes</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/embarques" className="hidden md:inline-flex">
                <Button variant="outline" size="sm">
                  Ver todos
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setMostrarEmbarquesRecientes((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
                aria-expanded={mostrarEmbarquesRecientes}
                aria-label="Mostrar u ocultar embarques recientes"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mostrarEmbarquesRecientes ? "" : "-rotate-90"}`}
                />
              </button>
            </div>
          </CardHeader>
          <CardContent className={`${mostrarEmbarquesRecientes ? "" : "hidden"} md:block`}>
            <div className="space-y-3">
              {embarquesRecientes.map((embarque: Embarque) => (
                <div key={embarque.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg md:items-center">
                  <div className="flex items-start space-x-3">
                    <Package className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{embarque.folio}</p>
                      <p className="text-sm text-gray-600">{embarque.cliente?.nombre || "Sin cliente"}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{embarque.destino}</span>
                        <Calendar className="h-3 w-3 ml-2" />
                        <span>{new Date(embarque.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right self-start md:self-auto">
                    <div className="md:hidden">{getMobileEstadoBadge(embarque.estado)}</div>
                    <div className="hidden md:block">{getEstadoBadge(embarque.estado)}</div>
                  </div>
                </div>
              ))}
              {embarquesRecientes.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No hay embarques recientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recordatorios urgentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 md:text-lg">Recordatorios Urgentes</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/recordatorios" className="hidden md:inline-flex">
                <Button variant="outline" size="sm">
                  Ver todos
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setMostrarRecordatoriosUrgentes((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
                aria-expanded={mostrarRecordatoriosUrgentes}
                aria-label="Mostrar u ocultar recordatorios urgentes"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${mostrarRecordatoriosUrgentes ? "" : "-rotate-90"}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent className={`${mostrarRecordatoriosUrgentes ? "" : "hidden"} md:block`}>
            <div className="space-y-3">
              {recordatoriosUrgentes.map((recordatorio: Recordatorio) => {
                const fechaVencimiento = new Date(recordatorio.fecha_vencimiento)
                const hoy = new Date()
                fechaVencimiento.setHours(0, 0, 0, 0)
                hoy.setHours(0, 0, 0, 0)
                
                const diasDiff = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                const esVencido = diasDiff < 0
                const esCritico = diasDiff >= 0 && diasDiff <= 3
                const esUrgente = diasDiff > 3 && diasDiff <= 7

                // Determinar estilo y color
                let bgClass = "bg-yellow-50 border-yellow-200"
                let iconClass = "text-yellow-600"
                let badgeClass = "bg-yellow-100 text-yellow-800"
                let badgeText = "Próximo"

                if (esVencido) {
                  bgClass = "bg-red-50 border-red-200"
                  iconClass = "text-red-600"
                  badgeClass = "bg-red-100 text-red-800"
                  badgeText = `Vencido ${Math.abs(diasDiff)}d`
                } else if (esCritico) {
                  bgClass = "bg-red-50 border-red-200"
                  iconClass = "text-red-600" 
                  badgeClass = "bg-red-100 text-red-800"
                  badgeText = diasDiff === 0 ? "Hoy" : `${diasDiff}d`
                } else if (esUrgente) {
                  bgClass = "bg-orange-50 border-orange-200"
                  iconClass = "text-orange-600"
                  badgeClass = "bg-orange-100 text-orange-800"
                  badgeText = `${diasDiff}d`
                }

                return (
                  <div
                    key={recordatorio.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${bgClass}`}
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className={`h-6 w-6 ${iconClass}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{recordatorio.titulo}</p>
                        <p className="text-xs text-gray-600">
                          {recordatorio.operador
                            ? `${recordatorio.operador.nombre} ${recordatorio.operador.apellidos || ""}`.trim()
                            : recordatorio.camion
                            ? `Camión ${recordatorio.camion.numero_economico || recordatorio.camion.placas}`
                            : "Sin asignar"}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3" />
                          <span className={esVencido || esCritico ? "text-red-600 font-medium" : ""}>
                            {fechaVencimiento.toLocaleDateString()}
                          </span>
                          {recordatorio.tipo && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{recordatorio.tipo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <Badge className={`${badgeClass} text-xs`}>
                        {badgeText}
                      </Badge>
                      {recordatorio.prioridad && (
                        <div className="mt-1">
                          {getPrioridadBadge(recordatorio.prioridad)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {recordatoriosUrgentes.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">¡Todo al día!</p>
                  <p className="text-sm">No hay recordatorios próximos a vencer</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

  {/* Sección "Agenda de hoy" y "Utilización" ocultada a solicitud */}

  {/* Vencimientos con semáforo y Recordatorios personales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencimientos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 md:text-lg">Vencimientos</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/recordatorios" className="hidden md:inline-flex">
                <Button variant="outline" size="sm">Ver todos</Button>
              </Link>
              <button
                type="button"
                onClick={() => setMostrarVencimientos((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
                aria-expanded={mostrarVencimientos}
                aria-label="Mostrar u ocultar vencimientos"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${mostrarVencimientos ? "" : "-rotate-90"}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent className={`${mostrarVencimientos ? "" : "hidden"} md:block`}>
            <div className="space-y-3">
              {vencimientos.map((r) => {
                const fv = new Date(r.fecha_vencimiento)
                const hoy = new Date()
                const diff = Math.ceil((fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                const esVencido = diff < 0
                const color = esVencido ? "bg-red-100 text-red-800" : diff <= 7 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{r.titulo}</p>
                      <p className="text-xs text-gray-500">Vence: {fv.toLocaleDateString()}</p>
                    </div>
                    <Badge className={color}>{esVencido ? "Vencido" : diff <= 7 ? `En ${diff} días` : "OK"}</Badge>
                  </div>
                )
              })}
              {vencimientos.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Sin vencimientos próximos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cumpleaños de operadores (próximos) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 md:text-lg">Cumpleaños de operadores</CardTitle>
            <button
              type="button"
              onClick={() => setMostrarCumples((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
              aria-expanded={mostrarCumples}
              aria-label="Mostrar u ocultar cumpleaños"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${mostrarCumples ? "" : "-rotate-90"}`} />
            </button>
          </CardHeader>
          <CardContent className={`${mostrarCumples ? "" : "hidden"} md:block`}>
            <div>
              <p className="font-semibold mb-2">Próximos cumpleaños</p>
              <div className="space-y-2">
                {cumples.map((c) => {
                  const d = new Date(c.fecha)
                  const color = c.dias <= 7 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                  return (
                    <div key={c.id} className="p-2 border rounded-md">
                      <div className="text-sm text-gray-900 truncate">{c.nombre}</div>
                      <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
                        <span>Nacimiento: {c.nacimiento ? new Date(c.nacimiento).toLocaleDateString() : "N/D"}</span>
                        <Badge className={color}>{c.dias === 0 ? "Hoy" : `En ${c.dias} d`}</Badge>
                      </div>
                    </div>
                  )
                })}
                {cumples.length === 0 && <p className="text-sm text-gray-500">Sin cumpleaños próximos</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
