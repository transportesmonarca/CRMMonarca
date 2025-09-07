"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Camera } from "lucide-react"
import { supabase, obtenerFotosEmbarque } from "@/lib/supabase"

export default function EmbarquePublicPage() {
  const params = useParams()
  const id = (params as any)?.id as string

  const [embarque, setEmbarque] = useState<any | null>(null)
  const [fotos, setFotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentName, setCommentName] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<"contact"|"thanks"|"custom"|null>(null)
  const search = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const token = search?.get('token')
      if (!id) { setLoading(false); setErrorMsg('ID de embarque faltante'); return }

      // If no token provided, allow localhost dev fallback to load embarque directly
      if (!token) {
        if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
          try {
            setLoading(true)
            const { data } = await supabase
              .from('embarques')
              .select(`*, cliente:clientes(nombre), operador:operadores(nombre, apellidos), camion:camiones(numero_economico,placas,marca), remolque:remolques(numero_economico,placas,marca)`)
              .eq('id', id)
              .single()
            setEmbarque(data || null)
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
          console.error('public link error', json.error)
          if (json.error === 'expired') setErrorMsg('El enlace público ha expirado.')
          else if (json.error === 'invalid_token') setErrorMsg('Enlace inválido o no encontrado.')
          else setErrorMsg('Error validando el enlace público.')
          setEmbarque(null)
          setFotos([])
        } else {
          setEmbarque(json.embarque || null)
          setFotos(json.fotos || [])
          setErrorMsg(null)
        }
      } catch (e) {
        console.error('Error cargando embarque público:', e)
        setEmbarque(null)
        setFotos([])
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [id])

  // Helper para enviar comentario (uso por los botones rápidos)
  const sendQuickComment = async (name: string, message: string) => {
    try {
      const token = search?.get('token')
      if (!token) { toast({ title: 'Enlace inválido', variant: 'destructive' }); return { ok: false } }
      const res = await fetch(`/api/public-link/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, message }) })
      const j = await res.json()
      if (j?.ok) {
        setComment(''); setCommentName('');
        // determinar tipo de confirmación para el modal
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

  // Descargar todas las imágenes (intenta descargar cada archivo individualmente)
  const downloadAllImages = () => {
    if (!fotos || fotos.length === 0) return
    fotos.forEach((f: any) => {
      try {
        const a = document.createElement('a')
        a.href = f.url_blob
        // use provided filename or fallback to last segment of URL
        const filename = f.nombre_archivo || f.url_blob?.split('/')?.pop() || 'imagen'
        a.download = filename
        // Some browsers won't honor download for cross-origin blobs, but this will attempt
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (e) {
        console.error('Error descargando imagen', e)
      }
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
      <main className="pt-24 p-6 max-w-5xl mx-auto">
        <Toaster />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><Camera className="h-5 w-5" /><span>Información del Embarque</span></CardTitle>
            <CardDescription>Vista pública para el dueño de la mercancía</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Nombre de la empresa centrado dentro del Card (no como título) */}
            {embarque?.cliente?.nombre && (
              <div className="w-full text-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">{embarque.cliente.nombre}</h3>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Operador</Label>
                <p className="text-sm">{embarque.operador ? `${embarque.operador.nombre} ${embarque.operador.apellidos}` : '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Origen</Label>
                <p className="text-sm">{embarque.origen || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Destino</Label>
                <p className="text-sm">{embarque.destino || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">No. Tractocamión</Label>
                <p className="text-sm">{embarque.camion?.numero_economico || (embarque as any).camion_numero_economico || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Marca del Tractocamión</Label>
                <p className="text-sm">{embarque.camion?.marca || (embarque as any).camion_marca || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">No. Remolque</Label>
                <p className="text-sm">{embarque.remolque?.numero_economico || (embarque as any).remolque_numero_economico || embarque.remolque?.placas || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Marca del Remolque</Label>
                <p className="text-sm">{embarque.remolque?.marca || (embarque as any).remolque_marca || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Fecha / Hora Recolecta</Label>
                <p className="text-sm">{embarque.fecha_recolecta ? new Date(embarque.fecha_recolecta).toLocaleDateString() : '—'} {embarque.hora_recolecta || ''}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Fecha / Hora Entrega</Label>
                <p className="text-sm">{embarque.fecha_entrega ? new Date(embarque.fecha_entrega).toLocaleDateString() : '—'} {embarque.hora_entrega || ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

          <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Fotografías del Embarque</h3>
            {fotos.length > 0 && (
              <button onClick={downloadAllImages} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-700">
                Descargar imágenes
              </button>
            )}
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
                        <a
                          href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 flex items-center gap-1"
                          title={`Ver ubicación: ${f.latitud}, ${f.longitud}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span className="hidden sm:inline">Ubicación</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sin ubicación</span>
                      )}
                      {/* botón de descarga individual */}
                      <a href={f.url_blob} download={f.nombre_archivo || ''} className="text-xs text-gray-700 hover:text-gray-900 ml-2" title="Descargar imagen">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sección de acciones rápidas: botones entre las fotos y el bloque de comentarios */}
          {/* Quick action removed: replaced by a single persistent red contact button at the bottom of the page */}

          {/* Comentarios removidos por requerimiento de UX */}
          {/* Confirmación modal */}
          <AlertDialog open={confirmOpen} onOpenChange={(v)=>setConfirmOpen(v)}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                  <div className="flex justify-center mb-2">
                    <img src="/monarca-logo.png" alt="Monarca" className="h-12 w-auto" />
                  </div>
                  <AlertDialogTitle>
                    {confirmType === 'contact' ? 'Comentario recibido' : (confirmType === 'thanks' ? 'Gracias' : 'Comentario enviado')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirmType === 'contact' ? 'Gracias por tu respuesta. En breve nos comunicaremos contigo.' : (confirmType === 'thanks' ? '¡Estamos contentos de ayudarte!' : 'Gracias por tu mensaje. El operador recibirá tu comentario.')}
                  </AlertDialogDescription>
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
