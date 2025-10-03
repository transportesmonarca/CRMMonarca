"use client"
import React, { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Label } from "@/components/ui/label"
// Camera icon removed per UX request
import { supabase, obtenerFotosEmbarque } from "@/lib/supabase"
import { formatDateMatamoros } from '@/lib/date-utils'

export default function EmbarquePublicPage() {
  const [id, setId] = useState<string | null>(null)
  const [embarque, setEmbarque] = useState<any | null>(null)
  const [fotos, setFotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentName, setCommentName] = useState('')
  const [tipoServicioText, setTipoServicioText] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<"contact"|"thanks"|"custom"|null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Seguridad/UX: en la vista pública no permitimos subir archivos.
  // - Eliminamos del DOM cualquier control marcado con la clase `upload-cta` o el atributo `data-upload`.
  // - Bloqueamos eventos de drag/drop para evitar que se puedan soltar archivos en esta página.
  useEffect(() => {
    try {
      const removeUploadControls = () => {
        // common markers used by upload UIs in the app
        const selectors = [
          '.upload-cta', '[data-upload]', '.dropzone', '.drop-zone', '.dropZone', "input[type=\"file\"]"
        ].join(',')
        document.querySelectorAll(selectors).forEach((el) => el.remove())
      }
      removeUploadControls()

      const prevent = (e: any) => { e.preventDefault(); e.stopPropagation(); }
      window.addEventListener('dragover', prevent, { passive: false })
      window.addEventListener('drop', prevent, { passive: false })

      return () => {
        window.removeEventListener('dragover', prevent as EventListener)
        window.removeEventListener('drop', prevent as EventListener)
      }
    } catch (e) {
      // no-op
    }
  }, [])

  const getTokenFromLocation = () => {
    try {
      if (typeof window === 'undefined') return null
      const sp = new URLSearchParams(window.location.search)
      return sp.get('token')
    } catch (e) { return null }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (id) return
    try {
      const parts = window.location.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('embarque-public')
      if (idx >= 0 && parts.length > idx + 1) setId(parts[idx + 1])
    } catch (e) { /* ignore */ }
  }, [id])

  const handleDownloadPDF = () => {
    if (!embarque) { toast({ title: 'No hay información', variant: 'destructive' }); return }
    try {
      const printable = document.getElementById('embarque-printable')
      const html = printable ? printable.innerHTML : document.body.innerHTML
      const win = window.open('', '_blank')
      if (!win) { toast({ title: 'No se pudo abrir ventana', variant: 'destructive' }); return }
      win.document.write(`\n<html><head><title>Embarque ${embarque?.folio || ''}</title><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div>${html}</div></body></html>`)
      win.document.close()
      setTimeout(() => { try { win.print(); win.close() } catch (e) { /* ignore */ } }, 600)
    } catch (e) { console.error('Error generando PDF', e); toast({ title: 'Error al generar PDF', variant: 'destructive' }) }
  }

  useEffect(() => {
    const cargar = async () => {
      const token = getTokenFromLocation()
      if (!id) { setLoading(false); setErrorMsg('ID de embarque faltante'); return }

      if (!token) {
        if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
          try {
            setLoading(true)
            const { data } = await supabase
              .from('embarques')
              .select(`*, cliente:clientes(nombre), operador:operadores(nombre, apellidos), camion:camiones(numero_economico,placas,marca), remolque:remolques(numero_economico,placas,marca)`)
              .eq('id', id)
              .single()
              // Attach embarque_puntos as recolectas/entregas when present
              let emb = data || null
              if (emb) {
                const { data: puntos } = await supabase.from('embarque_puntos').select('*').eq('embarque_id', id).order('orden', { ascending: true })
                const recolectas = (puntos || []).filter((p: any) => p.tipo === 'recolecta').map((p: any) => ({ direccion: p.direccion, fecha: p.fecha, hora: p.hora, orden: p.orden }))
                const entregas = (puntos || []).filter((p: any) => p.tipo === 'entrega').map((p: any) => ({ direccion: p.direccion, fecha: p.fecha, hora: p.hora, orden: p.orden }))
                emb.recolectas = recolectas
                emb.entregas = entregas
              }
              setEmbarque(emb)
              const fotosGuardadas = await obtenerFotosEmbarque(id)
              setFotos(fotosGuardadas || [])
            setErrorMsg(null)
            setLoading(false)
            return
          } catch (e) {
            console.error('Dev fallback failed', e)
            setErrorMsg('No se proporcionó token en la URL.');
            setLoading(false)
            return
          }
        }
        setErrorMsg('Enlace inválido: falta token en la URL.')
        setLoading(false)
        return
      }

      setLoading(true)
          try {
        const res = await fetch(`/api/public-link/${token}`)
        const json = await res.json()
        if (json?.error) {
          if (json.error === 'expired') setErrorMsg('El enlace público ha expirado.')
          else if (json.error === 'invalid_token') setErrorMsg('Enlace inválido o no encontrado.')
          else setErrorMsg('Error validando el enlace público.')
          setEmbarque(null)
          setFotos([])
        } else {
          // Attach recolectas/entregas returned by the API into the embarque object
          const emb = json.embarque || null
          if (emb) {
            emb.recolectas = json.recolectas || []
            emb.entregas = json.entregas || []
          }
          setEmbarque(emb)
          setFotos(json.fotos || [])
          setErrorMsg(null)
        }
      } catch (e) {
        console.error('Error cargando embarque público:', e)
        setEmbarque(null); setFotos([])
      } finally { setLoading(false) }
    }
    cargar()
  }, [id])

  useEffect(() => {
    const fetchTipo = async () => {
      try {
        if (!embarque || !embarque.tipo_servicio_id) { setTipoServicioText(null); return }
        if (embarque.tipo_servicio && typeof embarque.tipo_servicio === 'string') { setTipoServicioText(embarque.tipo_servicio); return }
        const { data, error } = await supabase.from('tipos_servicio').select('nombre').eq('id', embarque.tipo_servicio_id).single()
        if (!error && data && (data as any).nombre) setTipoServicioText((data as any).nombre)
        else setTipoServicioText(String(embarque.tipo_servicio_id))
      } catch (e) { console.error('Error buscando tipo de servicio', e); if (embarque) setTipoServicioText(String(embarque.tipo_servicio_id)) }
    }
    fetchTipo()
  }, [embarque])

  const formatDateTime = (v?: string | null) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return formatDateMatamoros(v)
      return `${formatDateMatamoros(v)} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    } catch (e) {
      return String(v)
    }
  }

  const sendQuickComment = async (name: string, message: string) => {
    try {
      const token = getTokenFromLocation()
      if (!token) { toast({ title: 'Enlace inválido', variant: 'destructive' }); return { ok: false } }
      const res = await fetch(`/api/public-link/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, message }) })
      const j = await res.json()
      if (j?.ok) {
        setComment(''); setCommentName('')
        if (message === 'Por favor contáctenme') setConfirmType('contact')
        else if (message === 'Muchas gracias' || message === 'Enterado') setConfirmType('thanks')
        else setConfirmType('custom')
        setConfirmOpen(true)
        return { ok: true }
      } else {
        toast({ title: 'Error enviando comentario: ' + (j?.error || 'error'), variant: 'destructive' })
        return { ok: false }
      }
    } catch (e) { toast({ title: 'Error enviando comentario', variant: 'destructive' }); return { ok: false } }
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

  if (loading) return (
    <div>
      <Header onMenuClick={() => {}} showControls={false} />
      <div className="pt-24 p-6">Cargando embarque público...</div>
    </div>
  )

  if (!embarque) return (
    <div>
      <Header onMenuClick={() => {}} showControls={false} />
      <div className="pt-24 p-6">
        <h2 className="text-lg font-semibold mb-2">Embarque no encontrado</h2>
        <p className="text-sm text-gray-700">{errorMsg || 'Embarque no encontrado o enlace inválido.'}</p>
        <p className="text-sm text-gray-500 mt-3">Si eres desarrollador y estás en entorno local, la página intentará cargar el embarque sin token.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => {}} showControls={false} />
      <main className="pt-24 p-3 sm:p-6 max-w-5xl mx-auto">
        <Toaster />

        <Card>
          <CardHeader className="pb-6 px-3 sm:pb-8 sm:px-6">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between w-full">
              {/* Logo y título - responsive */}
              <div className="flex flex-col items-center sm:items-start order-2 sm:order-1">
                <CardTitle className="flex flex-col items-center sm:items-start">
                  <img src="/monarca-logo.png" alt="Monarca" className="h-10 sm:h-12 w-auto" />
                  <div className="mt-2 sm:mt-3 text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 text-center sm:text-left leading-tight">
                    Transportes Internacionales Monarca
                  </div>
                  <span className="mt-1 sm:mt-2 text-base sm:text-lg font-semibold text-blue-600">Información del Embarque</span>
                </CardTitle>
                <CardDescription className="mt-1 text-center sm:text-left">Vista pública para permisionarios</CardDescription>
              </div>
              
              {/* Fecha de creación - más visible en móvil */}
              <div className="bg-blue-50 p-3 rounded-lg text-center sm:text-right order-1 sm:order-2">
                <div className="text-xs sm:text-sm font-medium text-blue-700 uppercase tracking-wide">Fecha creación</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 mt-1">
                  {(embarque?.fecha_creacion || embarque?.created_at) ? formatDateTime(embarque?.fecha_creacion || embarque?.created_at) : '—'}
                </div>
              </div>
            </div>
            
            {/* Nombre del cliente */}
            <div className="mt-4 sm:mt-6">
              <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{embarque?.cliente?.nombre || 'Cliente no especificado'}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div id="embarque-printable">
              {/* Información básica - Grid responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">Folio</Label>
                  <p className="text-lg sm:text-xl font-bold text-blue-600 mt-1">{embarque.folio || '—'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">Tipo de Servicio</Label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1">{tipoServicioText || embarque.tipo_servicio_id || '—'}</p>
                </div>
              </div>
              
              {/* Liga de referencia - si existe */}
              {embarque?.reporte_cliente_url && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                  <Label className="text-xs sm:text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Liga de referencia
                  </Label>
                  <div className="mt-2">
                    <a 
                      href={embarque.reporte_cliente_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-700 hover:text-blue-800 underline break-all text-xs sm:text-sm font-medium"
                    >
                      {embarque.reporte_cliente_url}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Contenido */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Contenido de la carga
                </Label>
                <p className="text-sm sm:text-base text-gray-900 mt-2 leading-relaxed">{embarque.contenido || 'No especificado'}</p>
              </div>

              {/* Sección de Recolectas - Mejorada para móvil */}
              <div className="mb-4 sm:mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <Label className="text-xs sm:text-sm font-semibold text-green-800 uppercase tracking-wide flex items-center mb-3">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Lugar de Recolecta
                  </Label>
                  {Array.isArray(embarque.recolectas) && embarque.recolectas.length > 0 ? (
                    <div className="space-y-3">
                      {embarque.recolectas.map((r: any, i: number) => (
                        <div key={i} className="bg-white border border-green-100 rounded-lg p-3 shadow-sm">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="font-medium text-xs sm:text-sm text-green-700 bg-green-100 px-2 py-1 rounded-full inline-block w-fit">
                              {i === 0 ? 'Recolecta Principal' : `Recolecta ${i + 1}`}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-gray-600">
                              {(r?.fecha || r?.hora) ? (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  📅 {r?.fecha ? new Date(r.fecha).toLocaleDateString('es-MX') : ''} {r?.hora ? `⏰ ${r.hora}` : ''}
                                </span>
                              ) : (
                                <span className="text-gray-400">Sin programar</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm sm:text-base text-gray-900 leading-relaxed">
                            {r?.direccion || 'Sin especificar'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-green-100 rounded-lg p-3">
                      <p className="text-sm sm:text-base text-gray-900">{embarque.origen || 'No especificado'}</p>
                    </div>
                  )}
                </div>
              </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-gray-900">Entrega</Label>
                      <Label className="text-base font-semibold text-gray-900">Fecha / Hora Entrega</Label>
                    </div>
                    {Array.isArray(embarque.entregas) && embarque.entregas.length > 0 ? (
                      <div className="space-y-2 mt-1">
                        {embarque.entregas.map((e: any, i: number) => (
                          <div key={i} className="w-full text-gray-900 bg-gray-50 p-3 rounded">
                            <div className="font-medium text-sm text-gray-700">{i === (embarque.entregas.length - 1) ? 'Final' : `Entrega ${i + 1}`}</div>
                            <div className="mt-1 flex justify-between items-start gap-4">
                              <div className="whitespace-pre-wrap text-lg">{e?.direccion || 'Sin especificar'}</div>
                              <div className="text-lg text-gray-600 text-right min-w-[140px] font-semibold">
                                {(e?.fecha || e?.hora) ? (
                                  <span>{e?.fecha ? new Date(e.fecha).toLocaleDateString() : ''} {e?.hora || ''}</span>
                                ) : (
                                  <span className="text-gray-400 text-lg">Sin información</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base">{embarque.destino || '—'}</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center sm:justify-between justify-center gap-8 sm:gap-0">
                    <div className="text-center sm:text-left">
                      <Label className="text-base font-semibold text-gray-900">Peso</Label>
                      <p className="text-lg">{embarque.peso ? `${String(embarque.peso)} Kg` : '—'}</p>
                    </div>
                    
                    <div className="text-center sm:text-left">
                      <Label className="text-base font-semibold text-gray-900">Remolque</Label>
                      <div className="text-lg text-right max-w-[280px]">
                        {(() => {
                          // Usar la misma lógica que en embarques/page.tsx
                          const remolqueNumero = embarque.remolque?.numero_economico || embarque.remolque_numero_economico || "";
                          const remolqueMarca = embarque.remolque?.marca || (embarque as any).remolque_marca || "";
                          const remolquePlacas = embarque.remolque?.placas || embarque.remolque_placa || "";
                          
                          if (!remolqueNumero && !remolquePlacas && !remolqueMarca) {
                            return <span>—</span>;
                          }
                          
                          return (
                            <div>
                              {remolqueNumero && (
                                <div className="font-semibold"># {remolqueNumero}</div>
                              )}
                              {remolquePlacas && (
                                <div className="text-sm text-gray-600">{remolquePlacas}</div>
                              )}
                              {remolqueMarca && (
                                <div className="text-sm text-gray-500">{remolqueMarca}</div>
                              )}
                              {!remolqueNumero && !remolquePlacas && !remolqueMarca && (
                                <span>Sin información</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* No right column — recolecta column spans full width */}
                <div className="hidden" />

              </div>

            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg text-gray-700 bg-gray-50 p-2 rounded" aria-live="polite">
                {embarque.observaciones ? (
                  <pre className="whitespace-pre-wrap text-lg m-0">{String(embarque.observaciones)}</pre>
                ) : (
                  <span className="text-gray-400 text-lg">—</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Fotografías del Embarque</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadPDF} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded">Descargar PDF</button>
                {fotos.length > 0 && (
                  <button onClick={downloadAllImages} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-700">Descargar imágenes</button>
                )}
              </div>
            </div>

            {fotos.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay fotografías disponibles.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fotos.map((f) => (
                  <div key={f.id} className="bg-white rounded shadow p-2">
                    <img src={f.url_blob} alt={f.nombre_archivo} className="w-full h-48 object-cover rounded" />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-600">{f.nombre_archivo}</p>
                      <div className="flex items-center gap-2">
                        {f.latitud && f.longitud ? (
                          <a href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1" title={`Ver ubicación: ${f.latitud}, ${f.longitud}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="hidden sm:inline">Ubicación</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Sin ubicación</span>
                        )}
                        <a href={f.url_blob} download={f.nombre_archivo || ''} className="text-xs text-gray-700 hover:text-gray-900 ml-2" title="Descargar imagen">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          <AlertDialog open={confirmOpen} onOpenChange={(v)=>setConfirmOpen(v)}>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <div className="flex justify-center mb-2"><img src="/monarca-logo.png" alt="Monarca" className="h-12 w-auto"/></div>
                <AlertDialogTitle>{confirmType === 'contact' ? 'Comentario recibido' : (confirmType === 'thanks' ? 'Gracias' : 'Comentario enviado')}</AlertDialogTitle>
                <AlertDialogDescription>{confirmType === 'contact' ? 'Gracias por tu respuesta. En breve nos comunicaremos contigo.' : (confirmType === 'thanks' ? '¡Estamos contentos de ayudarte!' : 'Gracias por tu mensaje. El operador recibirá tu comentario.')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={()=>{ setConfirmOpen(false); setConfirmType(null); }}>Cerrar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </main>
      {/* Botones flotantes removidos por requerimiento de UX */}
    </div>
  )
}
 