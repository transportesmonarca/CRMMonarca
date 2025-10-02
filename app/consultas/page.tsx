"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Users, Truck, Container, Package, TrendingUp, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import PieChart from "@/components/ui/pie-chart"
// Corregir importación para usar la instancia supabase existente
import { supabase, obtenerPrecioFleteFalso } from "@/lib/supabase"
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

      let precioGlobalFleteFalso = 0
      try {
        const precioObtenido = await obtenerPrecioFleteFalso()
        if (typeof precioObtenido === "number" && Number.isFinite(precioObtenido) && precioObtenido > 0) {
          precioGlobalFleteFalso = precioObtenido
        }
      } catch (error) {
        console.warn("No se pudo obtener el precio global de flete falso, usando fallback", error)
      }
      if (precioGlobalFleteFalso <= 0) {
        precioGlobalFleteFalso = 666
      }

      // Traer una sola vez el dataset relevante del año y construir todas las agregaciones en memoria
      // Usar directamente la tabla embarques con joins básicos para evitar errores de campos inexistentes
      let { data: rows, error: rowsError } = await supabase
        .from("embarques")
        .select(`
          *,
          cliente:clientes(id, nombre),
          operador:operadores(id, nombre, apellidos),
          camion:camiones(id, numero_economico),
          remolque:remolques(id, numero_economico),
          tipo_servicio:tipos_servicio(id, nombre)
        `)
        .gte("fecha_creacion", startOfYear)
        .lt("fecha_creacion", startOfNextYear)

      // Debug: log the supabase result to help diagnose empty error objects
      try {
        console.log('cargarEstadisticas: supabase rows fetched:', Array.isArray(rows) ? rows.length : rows)
        console.log('cargarEstadisticas: rows sample:', (rows || []).slice(0,3))
      } catch (e) {}
      
      if (rowsError) {
        console.log('cargarEstadisticas: Error en consulta principal:', rowsError)
        const errorMsg = rowsError.message || rowsError.details || rowsError.hint || 'Error desconocido en consulta'
        throw new Error(`Error en cargarEstadisticas: ${errorMsg}`)
      }

      const totalRows = (rows || []).length

      const clientesMap = new Map()
  // (removed company-level aggregation)
      const camionesMap = new Map()
      const operadoresMap = new Map()
      const tiposMap = new Map()
      const estadosMap = new Map()

      // Obtener metadatos básicos de clientes (solo campos que sabemos que existen)
      let clientesMeta: any[] = []
      try {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id, nombre")
        clientesMeta = clientesData || []
      } catch (e) {
        console.log('cargarEstadisticas: Error obteniendo metadatos de clientes, continuando sin ellos:', e)
        clientesMeta = []
      }
      const clientesMetaMap = new Map((clientesMeta || []).map((c: any) => [c.id, c]))

      // Helper local: calcular monto contable de una fila (mismo criterio que Facturación)
      const parseMonto = (valor: any): number | undefined => {
        if (typeof valor === "number") {
          return Number.isFinite(valor) ? valor : undefined
        }
        if (typeof valor === "string") {
          const trimmed = valor.trim()
          if (!trimmed) return undefined
          const parsed = Number(trimmed)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return undefined
      }

      const getMontoFromRow = (e: any) => {
        if (!e) return 0
        // QuickPaid preferido cuando está activo y existe precio_quickpaid
        if (e?.quickpaid_enabled && (typeof e?.precio_quickpaid === 'number' || typeof e?.precio_quickpaid === 'string')) {
          return typeof e.precio_quickpaid === 'number' ? e.precio_quickpaid : Number(e.precio_quickpaid) || 0
        }

        const estadoLower = String(e?.estado || "").toLowerCase()
        const esFleteFalsoEstado = estadoLower.includes("_contingencia_ff")
        const esFleteFalsoLegacy = e?.flete_falso === true

        if (esFleteFalsoEstado || esFleteFalsoLegacy) {
          const pagoOperador = parseMonto(e?.pago_operador)
          if (typeof pagoOperador === "number" && pagoOperador > 0) {
            return pagoOperador
          }
          return precioGlobalFleteFalso
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
            // Usar el nombre del join o fallback a cliente_nombre si existe
            const nombreCliente = r.cliente?.nombre || r.cliente_nombre || `Cliente ${r.cliente_id}`
            clientesMap.set(r.cliente_id, {
              id: r.cliente_id,
              nombre: nombreCliente,
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
            // Usar el número del join o fallback
            const numeroCamion = r.camion?.numero_economico || r.camion_numero || `Camión ${r.camion_id}`
            camionesMap.set(r.camion_id, {
              id: r.camion_id,
              numero: numeroCamion,
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
            // Usar el nombre del join o fallback
            const nombreOperador = r.operador 
              ? `${r.operador.nombre || ""} ${r.operador.apellidos || ""}`.trim()
              : `${r.operador_nombre || ""} ${r.operador_apellidos || ""}`.trim() || "Sin asignar"
            operadoresMap.set(r.operador_id, {
              id: r.operador_id,
              nombre: nombreOperador || `Operador ${r.operador_id}`,
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

      // Top clientes: calcular score combinado de actividad e ingresos (convertir USD a MXN para comparar)
      // Los mejores clientes son aquellos con mayor combinación de embarques e ingresos
      const topClientesArray = Array.from(clientesMap.values())
        .map((cliente: any) => {
          // Convertir USD a MXN aproximadamente (tasa promedio ~20 MXN/USD)
          const ingresosTotal = cliente.ingresos_mxn + (cliente.ingresos_usd * 20)
          // Score: 70% ingresos + 30% cantidad de embarques (normalizado)
          const scoreIngresos = ingresosTotal / 1000 // Normalizar dividiendo entre 1000
          const scoreEmbarques = cliente.embarques * 10 // Dar peso a los embarques
          const scoreCombinado = (scoreIngresos * 0.7) + (scoreEmbarques * 0.3)
          
          return {
            ...cliente,
            ingresosTotal,
            scoreCombinado
          }
        })
        .sort((a: any, b: any) => b.scoreCombinado - a.scoreCombinado)
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
            <CardDescription>Mejores clientes del año (actividad + ingresos combinados)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {topClientes.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
                >
                  {/* Gradient background for ranking */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                    'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`} />
                  
                  {/* Ranking badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <div className="text-right">
                        {index === 0 && <span className="text-lg">🥇</span>}
                        {index === 1 && <span className="text-lg">🥈</span>}
                        {index === 2 && <span className="text-lg">🥉</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Client name */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2" title={item.nombre}>
                      {item.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{item.embarques ?? 0} embarques</p>
                  </div>
                  
                  {/* Revenue info */}
                  <div className="space-y-2">
                    <div className="text-center">
                      <p className="font-bold text-green-600 text-lg">
                        ${Number(item.ingresosTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500">Total MXN</p>
                    </div>
                    
                    {/* Currency breakdown */}
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">MXN:</span>
                        <span className="font-medium">${Number(item.ingresos_mxn || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">USD:</span>
                        <span className="font-medium">${Number(item.ingresos_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Message when no clients */}
            {topClientes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay datos de clientes para mostrar</p>
                <p className="text-sm">Los datos aparecerán cuando haya embarques registrados</p>
              </div>
            )}
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
              <CardDescription>Tractocamiones con más embarques asignados en el año</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {camionesUsados.map((camion, index) => (
                  <div key={camion.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">#{camion.numero}</p>
                        <p className="text-sm text-gray-600">Número Económico</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-orange-600">{camion.embarques}</div>
                      <div className="text-xs text-gray-500">embarques asignados</div>
                    </div>
                  </div>
                ))}
                
                {/* Message when no trucks */}
                {camionesUsados.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Truck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>No hay datos de camiones para mostrar</p>
                    <p className="text-sm">Los datos aparecerán cuando haya embarques asignados</p>
                  </div>
                )}
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
