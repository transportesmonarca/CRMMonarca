"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Users, Truck, Container, Package, TrendingUp, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import PieChart from "@/components/ui/pie-chart"
// Corregir importación para usar la instancia supabase existente
import { supabase } from "@/lib/supabase"
import { agregarAuditLog } from "@/lib/audit"
// No export; se cambia por impresión

export default function ConsultasPage() {
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [loading, setLoading] = useState(true)

  // Estados para las estadísticas
  const [topClientes, setTopClientes] = useState<any[]>([])
  const [camionesUsados, setCamionesUsados] = useState<any[]>([])
  const [operadoresStats, setOperadoresStats] = useState<any>({})
  const [tiposServicio, setTiposServicio] = useState<any[]>([])
  const [motivosContingencia, setMotivosContingencia] = useState<any[]>([])
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any>({})
  const [embarquesPorEstado, setEmbarquesPorEstado] = useState<any[]>([])
  const [clientesMenosAsignados, setClientesMenosAsignados] = useState<Array<{ id: string | number; nombre: string; asignados: number }>>([])

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)

      // Limitar a año actual por defecto para evitar sumar históricos enormes
      const now = new Date()
      const year = now.getFullYear()
      const startOfYear = `${year}-01-01`
      const startOfNextYear = `${year + 1}-01-01`

      // Traer una sola vez el dataset relevante del año y construir todas las agregaciones en memoria
      // Traer el dataset del año. Seleccionamos '*' para incluir posibles
      // campos adicionales como quickpaid_enabled / precio_quickpaid presentes en e.*
      const { data: rows, error: rowsError } = await supabase
        .from("vista_embarques_completa")
        .select("*")
        .gte("fecha_creacion", startOfYear)
        .lt("fecha_creacion", startOfNextYear)

      // Debug: log the supabase result to help diagnose empty error objects
      try {
        console.log('cargarEstadisticas: supabase rows fetched:', Array.isArray(rows) ? rows.length : rows)
        console.log('cargarEstadisticas: rows sample:', (rows || []).slice(0,3))
      } catch (e) {}
      if (rowsError) {
        console.error('cargarEstadisticas: rowsError raw:', rowsError)
        try {
          console.error('cargarEstadisticas: rowsError props:', Object.getOwnPropertyNames(rowsError))
        } catch (e) {}
        throw rowsError
      }

      const totalRows = (rows || []).length

      const clientesMap = new Map()
  // (removed company-level aggregation)
      const camionesMap = new Map()
      const operadoresMap = new Map()
      const tiposMap = new Map()
      const estadosMap = new Map()

      // Obtener metadatos de clientes para derivar la 'empresa' asociada
      let clientesMeta: any[] = []
      try {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id, empresa, empresa_facturadora, razon_social, nombre_comercial")
        clientesMeta = clientesData || []
      } catch (e) {
        clientesMeta = []
      }
      const clientesMetaMap = new Map((clientesMeta || []).map((c: any) => [c.id, c]))

      // Helper local: calcular monto contable de una fila (mismo criterio que Facturación)
      const getMontoFromRow = (e: any) => {
        if (!e) return 0
        // QuickPaid preferido cuando está activo y existe precio_quickpaid
        if (e?.quickpaid_enabled && (typeof e?.precio_quickpaid === 'number' || typeof e?.precio_quickpaid === 'string')) {
          return typeof e.precio_quickpaid === 'number' ? e.precio_quickpaid : Number(e.precio_quickpaid) || 0
        }
        if (typeof e?.cantidad_final_facturada === 'number') return e.cantidad_final_facturada
        if (typeof e?.precio_flete === 'number') return e.precio_flete
        if (typeof e?.precio_flete === 'string') return Number(e.precio_flete) || 0
        if (typeof e?.precioFlete === 'number') return e.precioFlete
        if (typeof e?.montoFacturado === 'number') return e.montoFacturado
        return 0
      }

      ;(rows || []).forEach((r: any) => {
        const embarqueId = r.id
        const estado = String(r.estado || "").toLowerCase()

        // Clientes (por id)
        if (r.cliente_id) {
          if (!clientesMap.has(r.cliente_id)) {
            clientesMap.set(r.cliente_id, {
              id: r.cliente_id,
              nombre: r.cliente_nombre || "Cliente sin nombre",
              embarques: 0,
              ingresos_mxn: 0,
              ingresos_usd: 0,
              embarquesEntregados: 0,
            })
          }
          const c = clientesMap.get(r.cliente_id)
          // contar una vez por fila de la vista (la vista debe devolver 1 fila por embarque)
          c.embarques++
          // siempre acumular monto cuando exista
          const precioRow = getMontoFromRow(r)
          const monedaRow = String(r.moneda_flete || "").toUpperCase() || "MXN"
          if (precioRow > 0) {
            if (monedaRow === "USD") c.ingresos_usd += precioRow
            else c.ingresos_mxn += precioRow
          }
          if (estado === "entregado") {
            c.embarquesEntregados++
          }
        }

  // (empresa aggregation removed)

        // Camiones
        if (r.camion_id) {
          if (!camionesMap.has(r.camion_id)) {
            camionesMap.set(r.camion_id, {
              id: r.camion_id,
              numero: r.camion_numero,
              embarques: 0,
              embarquesActivos: 0,
            })
          }
          const cm = camionesMap.get(r.camion_id)
          cm.embarques++
          const estadoNorm = estado.replace(/\s+/g, "-")
          if (["asignado", "en-transito", "en-transito"].includes(estadoNorm)) {
            cm.embarquesActivos++
          }
        }

        // Operadores
        if (r.operador_id) {
          if (!operadoresMap.has(r.operador_id)) {
            operadoresMap.set(r.operador_id, {
              id: r.operador_id,
              nombre: `${r.operador_nombre || ""} ${r.operador_apellidos || ""}`.trim() || "Sin asignar",
              embarques: 0,
              embarquesEntregados: 0,
            })
          }
          const op = operadoresMap.get(r.operador_id)
          op.embarques++
          if (estado === "entregado") op.embarquesEntregados++
        }

        // Tipos de servicio
        if (r.tipo_servicio_id) {
          if (!tiposMap.has(r.tipo_servicio_id)) {
            tiposMap.set(r.tipo_servicio_id, { id: r.tipo_servicio_id, embarques: 0 })
          }
          tiposMap.get(r.tipo_servicio_id).embarques++
        }

        // Estados
        estadosMap.set(estado, (estadosMap.get(estado) || 0) + 1)
      })

      // Top clientes: ordenar por cantidad (actividad). mostramos ingresos separados por moneda
      const topClientesArray = Array.from(clientesMap.values())
        .sort((a: any, b: any) => b.embarques - a.embarques)
        .slice(0, 5)
      setTopClientes(topClientesArray)

      // Camiones
      const camionesArray = Array.from(camionesMap.values())
        .sort((a: any, b: any) => b.embarques - a.embarques)
        .slice(0, 5)
      setCamionesUsados(camionesArray)

      // Operadores
      const operadoresArray = Array.from(operadoresMap.values()).sort((a: any, b: any) => b.embarques - a.embarques)
      setOperadoresStats({
        masEmbarques: operadoresArray.slice(0, 3),
        menosEmbarques: operadoresArray.slice(-3).reverse(),
      })

      // Tipos de servicio: enriquecer con nombres/categoría
      const { data: tiposServicioInfo } = await supabase.from("tipos_servicio").select("id, nombre, categoria")
      const tiposArray = Array.from(tiposMap.values())
        .map((t: any) => {
          const info = (tiposServicioInfo || []).find((x: any) => x.id === t.id)
          return {
            id: t.id,
            nombre: info?.nombre || "Sin nombre",
            categoria: info?.categoria || "Sin categoría",
            embarques: t.embarques,
          }
        })
        .sort((a: any, b: any) => b.embarques - a.embarques)
        .slice(0, 5)
      setTiposServicio(tiposArray)

      // Últimos motivos de contingencia (mantener la lógica existente)
      const { data: motivosData } = await supabase
        .from("embarque_modificaciones")
        .select(`razon, fecha_modificacion, usuario_modificacion`)
        .not("razon", "is", null)
        .order("fecha_modificacion", { ascending: false })
        .limit(5)
      setMotivosContingencia(motivosData || [])

      // Estadísticas generales (conteos globales)
      const { count: embarquesCount } = await supabase.from("embarques").select("*", { count: "exact", head: true })
      const { count: operadoresCount } = await supabase.from("operadores").select("*", { count: "exact", head: true })
      const { count: camionesCount } = await supabase.from("camiones").select("*", { count: "exact", head: true })
      const { count: clientesCount } = await supabase.from("clientes").select("*", { count: "exact", head: true })

      setEstadisticasGenerales({
        totalEmbarques: embarquesCount || 0,
        totalOperadores: operadoresCount || 0,
        totalCamiones: camionesCount || 0,
        totalClientes: clientesCount || 0,
      })

      // Distribución por estado (basada en el dataset del año)
      const estadosArray = Array.from(estadosMap.entries()).map(([estado, cantidad]) => ({
        estado,
        cantidad,
        porcentaje: ((cantidad / Math.max(1, totalRows)) * 100).toFixed(1),
      }))
      setEmbarquesPorEstado(estadosArray)

      // Clientes menos asignados: conservar la lógica histórica (consulta separada)
      const { data: clientesTodos } = await supabase.from("clientes").select("id, nombre")
      const { data: embarquesAll } = await supabase
        .from("embarques")
        .select(`cliente_id, estado, cliente:clientes(nombre)`)
        .not("cliente_id", "is", null)
        .neq("estado", "cancelado")

      const mapa = new Map<string | number, { id: string | number; nombre: string; asignados: number }>()
      ;(clientesTodos || []).forEach((c: any) => {
        mapa.set(c.id, { id: c.id, nombre: c.nombre || "Cliente sin nombre", asignados: 0 })
      })
      ;(embarquesAll || []).forEach((e: any) => {
        const id = e.cliente_id
        if (!id) return
        if (!mapa.has(id)) {
          mapa.set(id, { id, nombre: e.cliente?.nombre || "Cliente sin nombre", asignados: 0 })
        }
        const item = mapa.get(id)!
        item.asignados += 1
      })

      const menosAsignados = Array.from(mapa.values())
        .sort((a, b) => a.asignados - b.asignados || a.nombre.localeCompare(b.nombre))
        .slice(0, 5)
      setClientesMenosAsignados(menosAsignados)
    } catch (error: any) {
      console.error("Error cargando estadísticas:", error)
      try {
        console.error('Error detalles:', JSON.stringify(error))
      } catch (e) {
        // ignore stringify errors
      }
    } finally {
      setLoading(false)
    }
  }

  const imprimirReporte = () => {
    if (typeof window !== "undefined") {
  agregarAuditLog("EXPORTAR", "Consultas", "Impresión de estadísticas/reportes")
      window.print()
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estadosConfig = {
      creado: { color: "bg-blue-100 text-blue-800", label: "Creado" },
      asignado: { color: "bg-yellow-100 text-yellow-800", label: "Asignado" },
      "listo-para-asignar": { color: "bg-orange-100 text-orange-800", label: "Listo" },
      "en-transito": { color: "bg-purple-100 text-purple-800", label: "En Tránsito" },
      entregado: { color: "bg-green-100 text-green-800", label: "Entregado" },
      cancelado: { color: "bg-red-100 text-red-800", label: "Cancelado" },
      archivado: { color: "bg-gray-100 text-gray-800", label: "Archivado" },
    }

    const config = estadosConfig[estado as keyof typeof estadosConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: estado,
    }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando estadísticas...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estadísticas y Reportes</h1>
            <p className="text-gray-600 mt-2">Análisis detallado del rendimiento operativo</p>
          </div>
          <Button onClick={imprimirReporte} className="bg-green-600 hover:bg-green-700 text-white border-green-700 print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Embarques</p>
                  <p className="text-2xl font-bold">{estadisticasGenerales.totalEmbarques}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Operadores</p>
                  <p className="text-2xl font-bold">{estadisticasGenerales.totalOperadores}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Truck className="h-8 w-8 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Camiones</p>
                  <p className="text-2xl font-bold">{estadisticasGenerales.totalCamiones}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold">{estadisticasGenerales.totalClientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
              Top 5 Clientes
            </CardTitle>
            <CardDescription>Clientes con mayor actividad e ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClientes.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-transparent"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-bold text-lg">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.nombre}</p>
                      <p className="text-sm text-gray-600">{item.embarques ?? 0} embarques</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-lg">
                      {`MXN ${Number(item.ingresos_mxn || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-sm text-gray-600">{`USD ${Number(item.ingresos_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
                    <p className="text-xs text-gray-500">Ingresos por divisa{item.__isCompany ? ' (por empresa)' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

  {/* Desglose por Empresa eliminado: no se requiere según indicación del usuario */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  Camiones Más Utilizados
                </CardTitle>
              <CardDescription>Unidades con mayor actividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {camionesUsados.map((camion, index) => (
                  <div key={camion.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{camion.numero}</p>
                        <p className="text-sm text-gray-600">{camion.embarquesActivos} activos</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">{camion.embarques} embarques</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
                Rendimiento de Operadores
              </CardTitle>
              <CardDescription>Operadores con más y menos embarques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-green-600 mb-2">Más Embarques</p>
                  <div className="space-y-2">
                    {operadoresStats.masEmbarques?.map((operador: any, index: number) => (
                      <div key={operador.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">{operador.nombre}</span>
                        <Badge className="bg-green-100 text-green-800">{operador.embarques}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-red-600 mb-2">Menos Embarques</p>
                  <div className="space-y-2">
                    {operadoresStats.menosEmbarques?.map((operador: any, index: number) => (
                      <div key={operador.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <span className="text-sm font-medium">{operador.nombre}</span>
                        <Badge className="bg-red-100 text-red-800">{operador.embarques}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Container className="h-5 w-5 text-purple-600 flex-shrink-0" />
                Tipos de Servicio Más Solicitados
              </CardTitle>
              <CardDescription>Servicios con mayor demanda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tiposServicio.map((tipo, index) => (
                  <div key={tipo.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{tipo.nombre}</p>
                        <p className="text-sm text-gray-600">{tipo.categoria}</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">{tipo.embarques} solicitudes</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
                Distribución por Estado
              </CardTitle>
              <CardDescription>Estados actuales de embarques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6">
                {/* Convert estados data to pie slices */}
                <PieChart
                  data={embarquesPorEstado.map((s: any, i: number) => {
                    const key = String(s.estado || '').toLowerCase()
                    let label = s.estado || `Estado ${i + 1}`
                    let color: string | undefined
                    switch (key) {
                      case 'entregado':
                        label = 'Finalizados'
                        color = '#7c3aed' // morado para finalizados
                        break
                      case 'asignado':
                        label = 'Asignados'
                        color = '#10b981' // verde para asignados
                        break
                      case 'creado':
                        label = 'Creados'
                        break
                      case 'listo-para-asignar':
                        label = 'Listos para asignar'
                        break
                      case 'en-transito':
                        label = 'En tránsito'
                        color = '#7c3aed'
                        break
                      case 'cancelado':
                        label = 'Cancelados'
                        color = '#ef4444'
                        break
                      default:
                        // ensure plural: add 's' if simple single-word
                        if (!label.endsWith('s')) label = `${label}s`
                    }
                    return {
                      label,
                      value: Number(s.cantidad || 0),
                      color,
                    }
                  })}
                  size={300}
                  innerRadius={0.48}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                Últimos Motivos de Contingencia
              </CardTitle>
              <CardDescription>Razones recientes de modificaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {motivosContingencia.map((motivo, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-red-50">
                    <p className="font-medium text-gray-900">{motivo.razon}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-600">Por: {motivo.usuario_modificacion}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(motivo.fecha_modificacion).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {motivosContingencia.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay motivos de contingencia recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600 flex-shrink-0" />
                  Clientes con menos operaciones (Histórico)
                </CardTitle>
              <CardDescription>Top 5 clientes con menor número de operaciones (incluye archivados)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesMenosAsignados.map((cliente, index) => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{cliente.nombre}</p>
                        <p className="text-sm text-gray-600">Incluye archivados</p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">{cliente.asignados} operaciones</Badge>
                  </div>
                ))}
                {clientesMenosAsignados.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay embarques asignados este año</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

  {/* Sección de filtros de consulta eliminada según requerimiento */}
      </div>
    </MainLayout>
  )
}
