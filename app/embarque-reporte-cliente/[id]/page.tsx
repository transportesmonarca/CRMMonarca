"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Pencil, ExternalLink } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { supabase, obtenerFotosEmbarque } from "@/lib/supabase"
import { formatDateMatamoros } from '@/lib/date-utils'

export default function EmbarqueReporteClientePage() {
  const params = useParams()
  const id = (params as any)?.id as string
  const [embarque, setEmbarque] = useState<any | null>(null)
  const [fotos, setFotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipoServicioText, setTipoServicioText] = useState<string | null>(null)
  const [reporteUrl, setReporteUrl] = useState<string>("")
  const [savingUrl, setSavingUrl] = useState<boolean>(false)
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true)
        setError(null)
        if (!id) { setError('ID faltante'); setLoading(false); return }

        // Cargar embarque
        const { data: embData, error: embErr } = await supabase
          .from('embarques')
          .select(`*, cliente:clientes(nombre), operador:operadores(nombre, apellidos), camion:camiones(numero_economico,placas), remolque:remolques(numero_economico,placas,marca)`)
          .eq('id', id)
          .single()

        if (embErr || !embData) {
          setError('No se encontró el embarque')
          setEmbarque(null)
          setFotos([])
          setLoading(false)
          return
        }

  setEmbarque(embData)
  const existing = String((embData as any)?.reporte_cliente_url || "")
  setReporteUrl(existing)
  setIsEditingUrl(!Boolean(existing))

        // Cargar y ordenar/agrupar fotos por operador (subido_por)
        const fotosGuardadas = await obtenerFotosEmbarque(id)
        const fotosArr = fotosGuardadas || []

        // Orden: por subido_por (operador) y luego por fecha_subida asc
        fotosArr.sort((a: any, b: any) => {
          const opA = (a.subido_por || '').toString().toLowerCase()
          const opB = (b.subido_por || '').toString().toLowerCase()
          if (opA < opB) return -1
          if (opA > opB) return 1
          const da = new Date(a.fecha_subida || a.created_at || 0).getTime()
          const db = new Date(b.fecha_subida || b.created_at || 0).getTime()
          return da - db
        })

        setFotos(fotosArr)
      } catch (e) {
        console.error('Error cargando reporte cliente:', e)
        setError('Error cargando datos')
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [id])

  // Cargar nombre de tipo de servicio cuando el embarque esté disponible
  useEffect(() => {
    const cargarTipoServicio = async () => {
      try {
        if (!embarque || !embarque.tipo_servicio_id) { setTipoServicioText(null); return }
        if (embarque.tipo_servicio && typeof embarque.tipo_servicio === 'string') { setTipoServicioText(embarque.tipo_servicio); return }
        const { data, error } = await supabase.from('tipos_servicio').select('nombre').eq('id', embarque.tipo_servicio_id).single()
        if (!error && data && (data as any).nombre) setTipoServicioText((data as any).nombre)
        else setTipoServicioText(null)
      } catch (e) { console.error('Error buscando tipo de servicio', e); setTipoServicioText(null) }
    }
    cargarTipoServicio()
  }, [embarque])

  const validarUrl = (u: string) => {
    if (!u) return true
    try {
      const parsed = new URL(u)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const guardarLigaCliente = async () => {
    if (!id) return
    if (reporteUrl && !validarUrl(reporteUrl)) {
      toast({ title: 'Liga inválida', description: 'Ingresa una URL válida que comience con http(s)://', variant: 'destructive' })
      return
    }
    try {
      setSavingUrl(true)
  const { error } = await supabase.from('embarques').update({ reporte_cliente_url: reporteUrl || null }).eq('id', id)
      if (error) throw new Error(error.message)
      toast({ title: 'Liga guardada', description: 'La liga para el cliente fue guardada correctamente.' })
  setEmbarque((prev: any) => ({ ...(prev || {}), reporte_cliente_url: reporteUrl || null }))
  setIsEditingUrl(Boolean(reporteUrl) ? false : true)
    } catch (e: any) {
      console.error('Error guardando liga cliente:', e)
      toast({ title: 'Error al guardar', description: e?.message || 'No se pudo guardar la liga.', variant: 'destructive' })
    } finally {
      setSavingUrl(false)
    }
  }

  const downloadAllImages = () => {
    if (!fotos || fotos.length === 0) return
    fotos.forEach((f: any) => {
      try {
        const a = document.createElement('a')
        a.href = f.url_blob
        const filename = f.nombre_archivo || f.url_blob?.split('/')?.pop() || 'imagen'
        a.download = filename
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      } catch (e) { console.error('Error descargando imagen', e) }
    })
  }

  const formatDateTime = (v?: string | null) => {
    if (!v) return '—'
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return formatDateMatamoros(v)
      return `${formatDateMatamoros(v)} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    } catch (e) {
      return String(v)
    }
  }

  if (loading) return (
    <div>
      <div className="pt-24 p-6">Cargando reporte del embarque...</div>
    </div>
  )

  if (!embarque) return (
    <div className="pt-24 p-6">
      <h2 className="text-lg font-semibold">Embarque no encontrado</h2>
      <p className="text-sm text-gray-700">{error || 'No se encontró el embarque'}</p>
    </div>
  )

  // Agrupar por subido_por
  const grupos: Record<string, any[]> = {}
  fotos.forEach((f) => {
    const key = (f.subido_por || 'Operador desconocido').toString()
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(f)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <main className="pt-24 p-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader className="pb-8">
            <div className="flex items-center justify-between w-full">
              <div className="w-1/3" />
            <div className="flex flex-col items-center w-1/3">
              <CardTitle className="flex flex-col items-center">
                <img src="/monarca-logo.png" alt="Monarca" className="h-12 w-auto" />
                <div className="mt-3 text-xl md:text-2xl font-semibold text-gray-900 capitalize truncate">transportes internacionales monarca</div>
                <span className="mt-2 text-lg font-semibold">Información del Embarque</span>
              </CardTitle>
              <CardDescription className="mt-1">Vista de Reporte Cliente</CardDescription>
            </div>
              <div className="w-1/3 text-right">
                <div className="text-sm text-gray-600">Fecha creación</div>
                <div className="text-sm text-gray-700">{(embarque?.fecha_creacion || embarque?.created_at) ? formatDateMatamoros(embarque?.fecha_creacion || embarque?.created_at) : '—'}</div>
              </div>
            </div>
            <div>
              <div className="mt-10 text-center text-2xl font-semibold text-gray-900">{embarque?.cliente?.nombre || '—'}</div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Información del embarque (similar a Subir Fotos) */}
            {/* Campos adicionales solicitados: Cliente (ya en header), Operador, Origen, Destino, No. Tractocamión, Fecha/Hora Recolecta, No. Remolque, Fecha/Hora Entrega */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {/* Operador y Tractocamión - mostrar siempre si existen, evita duplicar cliente (está en header) */}
              <div className="md:col-span-2">
                <Label className="text-base font-semibold text-gray-900">Operador</Label>
                <p className="text-base font-bold text-gray-900">{embarque.operador ? `${embarque.operador.nombre || ''} ${embarque.operador.apellidos || ''}`.trim() : (embarque.operador_nombre || '—')}</p>
              </div>
              <div className="md:col-span-3 text-right">
                <Label className="text-base font-semibold text-gray-900">No. Tractocamión</Label>
                <p className="text-base font-bold text-gray-900">{(embarque.camion && (embarque.camion.numero_economico || embarque.camion.placas)) || embarque.camion_numero_economico || embarque.camion_placas || '—'}</p>
              </div>
              <div className="md:col-span-1">
                <Label className="text-base font-semibold text-gray-900">Folio</Label>
                <p className="text-base font-bold text-gray-900">{embarque.folio || '—'}</p>
              </div>
              <div className="md:col-span-4 flex flex-col items-end">
                <Label className="text-base font-semibold text-gray-900">Tipo de Servicio</Label>
                <p className="text-lg text-right">{tipoServicioText || embarque.tipo_servicio_id || '—'}</p>
              </div>
              <div className="md:col-span-5 lg:col-span-5">
                <Label className="text-base font-semibold text-gray-900">Contenido</Label>
                <p className="text-lg">{embarque.contenido || '—'}</p>
              </div>
              <div className="md:col-span-5">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-gray-900">Lugar Recolecta</Label>
                  <Label className="text-base font-semibold text-gray-900">Fecha / Hora Recolecta</Label>
                </div>
                <p className="mt-1 text-lg">{(embarque.recolectas && embarque.recolectas.length>0) ? embarque.recolectas.map((r:any)=>r.direccion).join(' • ') : (embarque.origen || '—')}</p>
              </div>

              {/* Liga para cliente (editable) */}
              <div className="md:col-span-5 bg-gray-50 border rounded p-3">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="reporte-url" className="text-base font-semibold text-gray-900">Liga para el cliente (opcional)</Label>
                    <Input id="reporte-url" placeholder="https://…" value={reporteUrl} onChange={(e)=>setReporteUrl(e.target.value)} disabled={!isEditingUrl} />
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingUrl ? (
                      <Button onClick={guardarLigaCliente} disabled={savingUrl} className="bg-blue-600 hover:bg-blue-700 text-white">{savingUrl ? 'Guardando…' : 'Guardar liga'}</Button>
                    ) : (
                      <Button type="button" variant="outline" onClick={()=>setIsEditingUrl(true)} className="inline-flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Modificar
                      </Button>
                    )}
                    {embarque?.reporte_cliente_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(embarque.reporte_cliente_url as string, '_blank')}
                        className="inline-flex items-center gap-2"
                        title="Abrir la liga en una nueva pestaña"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fotos agrupadas por operador */}
            <div className="space-y-6">
              {Object.keys(grupos).length === 0 ? (
                <p className="text-gray-500">No hay fotografías disponibles para este embarque.</p>
              ) : (
                Object.entries(grupos).map(([operador, fotosGrupo]) => (
                  <div key={operador}>
                    <h3 className="text-lg font-semibold mb-3">Fotos subidas por: {operador}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fotosGrupo.map((f) => (
                        <div key={f.id} className="bg-white rounded shadow p-2">
                          <img src={f.url_blob} alt={f.nombre_archivo} className="w-full h-48 object-cover rounded" />
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-gray-600 truncate">{f.nombre_archivo}</p>
                            <div className="text-xs text-gray-500">{f.fecha_subida ? new Date(f.fecha_subida).toLocaleString() : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          {/* Footer actions: imprimir y descargar - colocados en la esquina inferior derecha del reporte */}
          <div className="px-6 pb-6 flex justify-end gap-2">
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Imprimir</Button>
            <Button onClick={downloadAllImages} className="bg-green-600 hover:bg-green-700 text-white">Descargar imágenes</Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
