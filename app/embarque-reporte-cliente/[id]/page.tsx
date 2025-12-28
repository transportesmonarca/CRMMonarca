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

// Función para extraer direcciones múltiples de las observaciones
const extraerDireccionesMultiples = (observaciones: string) => {
  const recolectas: Array<{direccion: string, fecha: string, hora: string}> = [];
  const entregas: Array<{direccion: string, fecha: string, hora: string}> = [];
  
  if (!observaciones) return { recolectas, entregas };
  
  try {
    // Buscar patrones de múltiples direcciones en las observaciones
    const lineas = observaciones.split('\n').map(l => l.trim()).filter(Boolean);
    
    let currentSection = '';
    
    for (const linea of lineas) {
      if (linea.toLowerCase().includes('recolecta') || linea.toLowerCase().includes('pickup')) {
        currentSection = 'recolecta';
        continue;
      }
      if (linea.toLowerCase().includes('entrega') || linea.toLowerCase().includes('delivery')) {
        currentSection = 'entrega';
        continue;
      }
      
      // Intentar extraer direcciones con fechas/horas
      const addressMatch = linea.match(/^(.+?)(?:\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}))?(?:\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?))?\s*$/i);
      
      if (addressMatch && addressMatch[1].length > 10) {
        const direccion = addressMatch[1].trim();
        const fecha = addressMatch[2] || '';
        const hora = addressMatch[3] || '';
        
        if (currentSection === 'recolecta') {
          recolectas.push({ direccion, fecha, hora });
        } else if (currentSection === 'entrega') {
          entregas.push({ direccion, fecha, hora });
        }
      }
    }
  } catch (error) {
    console.warn('Error extrayendo direcciones múltiples:', error);
  }
  
  return { recolectas, entregas };
};

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
            <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between w-full gap-4">
              <div className="hidden md:block md:w-1/3" />
              <div className="flex flex-col items-center w-full md:w-1/3">
                <CardTitle className="flex flex-col items-center">
                  <img src="/monarca-logo.png" alt="Monarca" className="h-12 w-auto" />
                  <div className="mt-3 text-xl md:text-2xl font-semibold text-gray-900 capitalize truncate">transportes internacionales monarca</div>
                  <span className="mt-2 text-lg font-semibold">Información del Embarque</span>
                </CardTitle>
                <CardDescription className="mt-1 text-center">Vista de Reporte Cliente</CardDescription>
              </div>
              <div className="w-full md:w-1/3 text-center md:text-right">
                <div className="text-sm text-gray-600">Fecha creación</div>
                <div className="text-sm text-gray-700 mt-1 md:mt-0">{(embarque?.fecha_creacion || embarque?.created_at) ? formatDateMatamoros(embarque?.fecha_creacion || embarque?.created_at) : '—'}</div>
              </div>
            </div>
            <div>
              <div className="mt-6 md:mt-10 text-center text-2xl font-semibold text-gray-900">{embarque?.cliente?.nombre || '—'}</div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Información del embarque */}
            <div className="bg-gray-50 border rounded p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Folio</Label>
                  <p className="text-sm">{embarque.folio || '—'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">No. Remolque</Label>
                  <p className="text-sm">
                    {embarque.remolque?.numero_economico || (embarque as any).remolque_numero_economico || embarque.remolque?.placas || (embarque as any).remolque_placa || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">No. Load</Label>
                  <p className="text-sm">{embarque.load || embarque.numero_load || (embarque as any).load_number || '—'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">No. Carta Porte</Label>
                  <p className="text-sm">{embarque.carta_porte || (embarque as any).numero_carta_porte || (embarque as any).cartaporte || '—'}</p>
                </div>
              </div>
            </div>

            {/* Contenido en frame gris */}
            <div className="bg-gray-50 border rounded p-4 mb-6">
              <Label className="text-sm font-medium text-gray-600">Contenido</Label>
              <p className="text-sm mt-1">{embarque.contenido || '—'}</p>
            </div>

            {/* Direcciones - Adaptativo móvil/escritorio */}
            <div className="bg-gray-50 border rounded p-4 mb-6">
              {(() => {
                // Función para formatear fechas para display
                const formatearFecha = (fecha: string) => {
                  if (!fecha) return '';
                  
                  // Si la fecha viene con formato YYYY-MM-DD HH:mm:ss, extraer solo la fecha
                  const fechaSola = fecha.split(' ')[0]; // Obtener solo la parte de fecha
                  
                  try {
                    const date = new Date(fechaSola);
                    if (isNaN(date.getTime())) {
                      return fecha; // Si no se puede parsear, devolver original
                    }
                    
                    // Formatear como DD/MM/YYYY
                    const dia = date.getDate().toString().padStart(2, '0');
                    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
                    const año = date.getFullYear();
                    
                    return `${dia}/${mes}/${año}`;
                  } catch (error) {
                    console.warn('Error formateando fecha:', error);
                    return fecha; // Devolver original en caso de error
                  }
                };

                // Usar la misma lógica que en subir-fotos-embarque para extraer direcciones múltiples
                let recolectasFinales: Array<{direccion: string, fecha: string, hora: string}> = [];
                let entregasFinales: Array<{direccion: string, fecha: string, hora: string}> = [];
                
                try {
                  // Prioridad 1: Intentar extraer de campos JSON 
                  if ((embarque as any).recolectas_json) {
                    recolectasFinales = JSON.parse((embarque as any).recolectas_json);
                  }
                  if ((embarque as any).entregas_json) {
                    entregasFinales = JSON.parse((embarque as any).entregas_json);
                  }
                } catch (jsonError) {
                  console.warn("Error parsing JSON direcciones:", jsonError);
                }
                
                // Prioridad 2: Si no hay datos JSON, extraer de observaciones
                if (recolectasFinales.length === 0 && entregasFinales.length === 0) {
                  try {
                    const extracted = extraerDireccionesMultiples(embarque.observaciones || "");
                    recolectasFinales = extracted.recolectas;
                    entregasFinales = extracted.entregas;
                  } catch (e) {
                    console.warn('Error parseando direcciones múltiples:', e);
                  }
                }
                
                // Prioridad 3: Si aún no hay direcciones múltiples, usar campos legacy como fallback
                if (recolectasFinales.length === 0) {
                  const recolectaIndividual = (embarque as any).direccion_recolecta || embarque.origen;
                  if (recolectaIndividual) {
                    recolectasFinales = [{
                      direccion: recolectaIndividual,
                      fecha: (embarque as any).fecha_recolecta || "",
                      hora: (embarque as any).hora_recolecta || ""
                    }];
                  }
                }
                
                if (entregasFinales.length === 0) {
                  const entregaIndividual = (embarque as any).direccion_entrega || embarque.destino;
                  if (entregaIndividual) {
                    entregasFinales = [{
                      direccion: entregaIndividual,
                      fecha: (embarque as any).fecha_entrega || "",
                      hora: (embarque as any).hora_entrega || ""
                    }];
                  }
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recolectas */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <Label className="text-sm font-medium text-gray-900">Lugar(es) de Recolecta</Label>
                      </div>
                      <div className="space-y-2">
                        {recolectasFinales.length > 0 ? recolectasFinales.map((r, i) => (
                          <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="space-y-1">
                              {recolectasFinales.length > 1 && (
                                <div className="text-xs font-medium text-green-700 mb-1">
                                  {i === 0 ? "Original" : `Recolecta ${i + 1}`}
                                </div>
                              )}
                              <div className="text-sm text-gray-900 break-words">{r.direccion}</div>
                              {(r.fecha || r.hora) && (
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                                  {r.fecha && <span>📅 {formatearFecha(r.fecha)}</span>}
                                  {r.hora && <span>🕐 {r.hora}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">Sin dirección de recolecta</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entregas */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <Label className="text-sm font-medium text-gray-900">Lugar(es) de Entrega</Label>
                      </div>
                      <div className="space-y-2">
                        {entregasFinales.length > 0 ? entregasFinales.map((e, i) => (
                          <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="space-y-1">
                              {entregasFinales.length > 1 && (
                                <div className="text-xs font-medium text-blue-700 mb-1">
                                  {i === (entregasFinales.length - 1) ? "Final" : `Entrega ${i + 1}`}
                                </div>
                              )}
                              <div className="text-sm text-gray-900 break-words">{e.direccion}</div>
                              {(e.fecha || e.hora) && (
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                                  {e.fecha && <span>📅 {formatearFecha(e.fecha)}</span>}
                                  {e.hora && <span>🕐 {e.hora}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">Sin dirección de entrega</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Liga para cliente (editable) */}
            <div className="bg-gray-50 border rounded p-3 mb-6">
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="reporte-url" className="text-sm font-medium text-gray-600">Liga para el cliente (opcional)</Label>
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
