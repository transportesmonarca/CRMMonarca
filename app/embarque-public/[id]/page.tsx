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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
// Camera icon removed per UX request
import { supabase, obtenerFotosEmbarque } from "@/lib/supabase"
import { formatDateMatamoros } from '@/lib/date-utils'
import { listarDocumentosEmbarque } from "@/lib/blob"
import { FileText, ExternalLink } from "lucide-react"
import JSZip from 'jszip'

export default function EmbarquePublicPage() {
  const [id, setId] = useState<string | null>(null)
  const [embarque, setEmbarque] = useState<any | null>(null)
  const [fotos, setFotos] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentName, setCommentName] = useState('')
  const [tipoServicioText, setTipoServicioText] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<"contact"|"thanks"|"custom"|null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [googleMapsLink, setGoogleMapsLink] = useState('')
  const [savingMapsLink, setSavingMapsLink] = useState(false)
  const [editingMapsLink, setEditingMapsLink] = useState(false)

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
      // Clonar el contenido completo de la página para impresión
      const mainElement = document.querySelector('main')
      if (!mainElement) { toast({ title: 'Error: No se encontró el contenido', variant: 'destructive' }); return }
      
      // Crear una copia del contenido
      const clonedContent = mainElement.cloneNode(true) as HTMLElement
      
      // Remover botones de acción que no deben aparecer en PDF
      clonedContent.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.toLowerCase() || ''
        // Mantener solo los botones informativos, remover los de acción
        if (text.includes('descargar') || text.includes('comentario') || text.includes('enterado') || text.includes('contácten')) {
          btn.remove()
        }
      })
      
      // Obtener el HTML limpio
      const htmlContent = clonedContent.innerHTML
      
      const win = window.open('', '_blank')
      if (!win) { toast({ title: 'No se pudo abrir ventana', variant: 'destructive' }); return }
      
      // Estilos completos que replican exactamente la página web
      const styles = `
        <style>
          @page { 
            margin: 0.3in;
            size: letter;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            line-height: 1.3;
            margin: 0;
            padding: 8px;
            background: #f9fafb;
          }
          
          /* Typography */
          .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
          .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
          .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
          .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
          .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
          
          .font-bold { font-weight: 700 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-medium { font-weight: 500 !important; }
          
          /* Colors */
          .text-gray-400 { color: #9CA3AF !important; }
          .text-gray-500 { color: #6B7280 !important; }
          .text-gray-600 { color: #4B5563 !important; }
          .text-gray-700 { color: #374151 !important; }
          .text-gray-900 { color: #111827 !important; }
          .text-blue-600 { color: #2563EB !important; }
          .text-blue-700 { color: #1D4ED8 !important; }
          
          .bg-white { background-color: #FFFFFF !important; }
          .bg-gray-50 { background-color: #F9FAFB !important; }
          .bg-gray-100 { background-color: #F3F4F6 !important; }
          
          /* Layout */
          .rounded { border-radius: 0.375rem !important; }
          .rounded-lg { border-radius: 0.5rem !important; }
          .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important; }
          .border { border: 1px solid #E5E7EB !important; }
          
          .uppercase { text-transform: uppercase !important; }
          .underline { text-decoration: underline !important; }
          .break-all { word-break: break-all !important; }
          .whitespace-pre-wrap { white-space: pre-wrap !important; }
          
          /* Spacing - Optimizado para PDF compacto */
          .p-2 { padding: 0.25rem !important; }
          .p-3 { padding: 0.5rem !important; }
          .p-6 { padding: 0.75rem !important; }
          .px-3 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
          .px-6 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
          .px-8 { padding-left: 1rem !important; padding-right: 1rem !important; }
          .py-1 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
          .pb-6 { padding-bottom: 0.75rem !important; }
          .pb-8 { padding-bottom: 1rem !important; }
          
          .m-0 { margin: 0 !important; }
          .mt-1 { margin-top: 0.125rem !important; }
          .mt-2 { margin-top: 0.25rem !important; }
          .mt-3 { margin-top: 0.375rem !important; }
          .mt-4 { margin-top: 0.5rem !important; }
          .mt-6 { margin-top: 0.75rem !important; }
          .mb-2 { margin-bottom: 0.25rem !important; }
          .mb-3 { margin-bottom: 0.375rem !important; }
          
          .space-y-2 > * + * { margin-top: 0.25rem !important; }
          .space-y-4 > * + * { margin-top: 0.5rem !important; }
          
          /* Flexbox */
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .flex-1 { flex: 1 1 0% !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .items-end { align-items: flex-end !important; }
          .justify-center { justify-content: center !important; }
          .justify-between { justify-content: space-between !important; }
          .gap-2 { gap: 0.25rem !important; }
          .gap-4 { gap: 0.5rem !important; }
          
          /* Grid - CORREGIDO para PDF */
          .grid { display: grid !important; }
          .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          
          /* Responsive grid - aplicar siempre en PDF */
          .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
          .md\\:col-span-1 { 
            grid-column: span 1 / span 1 !important; 
            text-align: left !important;
          }
          .md\\:col-span-4 { 
            grid-column: span 4 / span 4 !important; 
          }
          .md\\:col-span-5 { grid-column: span 5 / span 5 !important; }
          .lg\\:col-span-5 { grid-column: span 5 / span 5 !important; }
          
          /* Columnas específicas con alineación correcta */
          .md\\:col-span-1 > * {
            text-align: left !important;
          }
          
          .md\\:col-span-4.flex.flex-col.items-end {
            align-items: flex-end !important;
            text-align: right !important;
          }
          
          .md\\:col-span-4.flex.flex-col.items-end > * {
            text-align: right !important;
          }
          
          /* Text alignment */
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-left { text-align: left !important; }
          
          /* Labels siempre alineados a la izquierda */
          label { 
            text-align: left !important; 
            display: block !important;
            white-space: nowrap !important;
          }
          
          /* Leading */
          .leading-tight { line-height: 1.25 !important; }
          
          /* Width */
          .w-full { width: 100% !important; }
          .w-auto { width: auto !important; }
          .max-w-5xl { max-width: 64rem !important; margin-left: auto !important; margin-right: auto !important; }
          .min-w-\\[140px\\] { min-width: 140px !important; }
          
          /* Evitar saltos de línea indeseados */
          .uppercase.tracking-wide {
            white-space: nowrap !important;
          }
          
          /* Height */
          .h-10 { height: 2.5rem !important; }
          .h-12 { height: 3rem !important; }
          .h-48 { height: 12rem !important; }
          
          /* Images */
          img { 
            max-width: 100% !important; 
            height: auto !important;
            display: block !important;
          }
          
          /* Logo específico - tamaño controlado para PDF */
          img[alt="Monarca"] {
            height: 2rem !important; /* 32px */
            width: auto !important;
            max-width: 140px !important;
            margin: 0 auto 0.25rem auto !important;
          }
          
          /* Imágenes de contenido - tamaño reducido para PDF */
          .grid img:not([alt="Monarca"]) {
            max-height: 80px !important;
            object-fit: contain !important;
            border-radius: 0.25rem !important;
          }
          
          /* Hide interactive elements */
          button, 
          [role="button"],
          .cursor-pointer,
          a[href*="download"],
          svg { 
            display: none !important; 
          }
          
          /* Links visibility */
          a { 
            color: #1D4ED8 !important;
            text-decoration: underline !important;
          }
          
          /* Preserve backgrounds and borders */
          pre {
            margin: 0 !important;
            font-family: inherit !important;
            white-space: pre-wrap !important;
          }
          
          /* Page breaks */
          .page-break-before { page-break-before: always !important; }
          .page-break-after { page-break-after: always !important; }
          .page-break-inside-avoid { page-break-inside: avoid !important; }
          
          /* Evitar saltos de página dentro de elementos importantes */
          .grid, .flex, label, p {
            page-break-inside: avoid !important;
          }
          
          /* Card específico */
          .min-h-screen { min-height: auto !important; }
          
          /* Asegurar que los divs no colapsen */
          div { display: block !important; }
          .hidden { display: none !important; }
          
          /* Corregir alineación de grid items */
          .grid > div {
            text-align: left !important;
          }
          
          /* Específicamente para peso y remolque - alinear a la izquierda */
          .grid > div:has(label) {
            text-align: left !important;
          }
          
          .grid > div > label {
            text-align: left !important;
          }
          
          .grid > div > p,
          .grid > div > div {
            text-align: left !important;
          }
          
          /* Peso y Remolque en la misma línea - peso izquierda, remolque derecha */
          .flex.flex-col.sm\\:flex-row.items-center.sm\\:justify-between,
          .sm\\:flex-row.items-center.sm\\:justify-between {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          
          /* Peso siempre a la izquierda */
          .flex.flex-col.sm\\:flex-row.items-center.sm\\:justify-between > div:first-child,
          .sm\\:flex-row.items-center.sm\\:justify-between > div:first-child {
            text-align: left !important;
            align-self: flex-start !important;
          }
          
          /* Remolque siempre a la derecha */
          .flex.flex-col.sm\\:flex-row.items-center.sm\\:justify-between > div:last-child,
          .sm\\:flex-row.items-center.sm\\:justify-between > div:last-child {
            text-align: right !important;
            align-self: flex-end !important;
          }
          
          .flex.flex-col.sm\\:flex-row.items-center.sm\\:justify-between > div:last-child label,
          .sm\\:flex-row.items-center.sm\\:justify-between > div:last-child label {
            text-align: right !important;
          }
          
          /* Responsive overrides para PDF - aplicar desktop siempre */
          .sm\\:p-6 { padding: 0.75rem !important; }
          .sm\\:pb-8 { padding-bottom: 1rem !important; }
          .sm\\:px-6 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
          .sm\\:px-8 { padding-left: 1rem !important; padding-right: 1rem !important; }
          .sm\\:text-xl { font-size: 1.125rem !important; line-height: 1.5rem !important; }
          .sm\\:text-lg { font-size: 1rem !important; line-height: 1.25rem !important; }
          .sm\\:h-12 { height: 2rem !important; }
          
          /* Optimizaciones adicionales para PDF compacto */
          .bg-gray-50 {
            margin-bottom: 0.375rem !important;
            padding: 0.375rem !important;
          }
          
          /* Títulos más compactos */
          h1, h2, h3, h4 {
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
            line-height: 1.2 !important;
          }
          
          /* Compactar Cards */
          .shadow {
            margin-bottom: 0.5rem !important;
          }
          
          /* Reducir espacios entre elementos del grid */
          .grid {
            gap: 0.375rem !important;
          }
          
          @media print {
            body { background: white !important; }
            .shadow { box-shadow: none !important; border: 1px solid #E5E7EB !important; }
          }
        </style>
      `
      
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Embarque ${embarque?.folio || ''} - Transportes Monarca</title>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            ${styles}
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `)
      win.document.close()
      
      // Esperar a que las imágenes carguen antes de imprimir
      setTimeout(() => { 
        try { 
          win.focus()
          win.print()
          // No cerrar automáticamente para que el usuario pueda ver el resultado
        } catch (e) { 
          console.error('Error printing:', e)
        } 
      }, 1000)
    } catch (e) { 
      console.error('Error generando PDF', e)
      toast({ title: 'Error al generar PDF', variant: 'destructive' }) 
    }
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
              // Cargar documentos del embarque
              try {
                const docs = await listarDocumentosEmbarque(id)
                setDocumentos(docs || [])
              } catch (error) {
                console.error('Error cargando documentos del embarque:', error)
                setDocumentos([])
              }
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
          setDocumentos([])
        } else {
          // Attach recolectas/entregas returned by the API into the embarque object
          const emb = json.embarque || null
          if (emb) {
            emb.recolectas = json.recolectas || []
            emb.entregas = json.entregas || []
          }
          setEmbarque(emb)
          setFotos(json.fotos || [])
          setDocumentos(json.documentos || [])
          setGoogleMapsLink(emb?.google_maps_link || '')
          setErrorMsg(null)
        }
      } catch (e) {
        console.error('Error cargando embarque público:', e)
        setEmbarque(null); setFotos([]); setDocumentos([])
      } finally { setLoading(false) }
    }
    cargar()
  }, [id])

  const handleSaveGoogleMapsLink = async () => {
    if (!id) return
    try {
      setSavingMapsLink(true)
      const { error } = await supabase
        .from('embarques')
        .update({ google_maps_link: googleMapsLink || null })
        .eq('id', id)
      
      if (error) {
        console.warn('⚠️ Error guardando Google Maps link:')
        console.warn('Message:', error.message)
        console.warn('Details:', error.details)
        console.warn('Hint:', error.hint)
        console.warn('Code:', error.code)
        throw error
      }
      
      toast({ title: 'Guardado', description: 'La dirección de Google Maps se guardó correctamente.' })
      setEmbarque((prev: any) => ({ ...prev, google_maps_link: googleMapsLink }))
    } catch (e: any) {
      console.warn('⚠️ Exception guardando Google Maps link')
      console.warn('Message:', e?.message || 'Sin mensaje')
      console.warn('Code:', e?.code || 'Sin código')
      
      const errorMsg = e?.message || e?.details || 'No se pudo guardar la dirección'
      toast({ 
        title: 'Error', 
        description: errorMsg.includes('column') 
          ? 'La columna google_maps_link no existe. Por favor ejecuta el script SQL de migración.'
          : errorMsg,
        variant: 'destructive' 
      })
    } finally {
      setSavingMapsLink(false)
    }
  }

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
      // Normalizar fecha para evitar problemas de zona horaria
      const dateStr = v.split('T')[0] // Tomar solo la parte de fecha YYYY-MM-DD
      const d = new Date(dateStr + 'T00:00:00')
      if (isNaN(d.getTime())) return String(v)
      
      // Formato dd/mm/yyyy consistente
      const day = d.getUTCDate().toString().padStart(2, '0')
      const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
      const year = d.getUTCFullYear()
      const formattedDate = `${day}/${month}/${year}`
      
      const originalTime = v.includes('T') ? v.split('T')[1]?.split('.')[0] : null
      
      if (originalTime) {
        // Formatear la hora si existe
        const [hours, minutes] = originalTime.split(':')
        return `${formattedDate} ${hours}:${minutes}`
      }
      
      return formattedDate
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

  const downloadAllFiles = async () => {
    try {
      const zip = new JSZip()
      let hasFiles = false

      // Añadir fotos al ZIP
      if (fotos && fotos.length > 0) {
        toast({ title: 'Preparando imágenes...', description: `Descargando ${fotos.length} imágenes para comprimir` })
        
        const imgFolder = zip.folder("imagenes")
        for (const foto of fotos) {
          try {
            const response = await fetch(foto.url_blob)
            const blob = await response.blob()
            const filename = foto.nombre_archivo || `imagen_${foto.id}.jpg`
            imgFolder?.file(filename, blob)
            hasFiles = true
          } catch (e) {
            console.error('Error descargando imagen:', e)
          }
        }
      }
      
      // Añadir documentos al ZIP
      if (documentos && documentos.length > 0) {
        const docFolder = zip.folder("documentos")
        for (const doc of documentos) {
          try {
            const response = await fetch(doc.url || doc.url_blob)
            const blob = await response.blob()
            const filename = doc.nombre_archivo || `documento_${doc.id}`
            docFolder?.file(filename, blob)
            hasFiles = true
          } catch (e) {
            console.error('Error descargando documento:', e)
          }
        }
      }

      if (!hasFiles) {
        toast({ title: 'Sin archivos', description: 'No hay archivos disponibles para descargar', variant: 'destructive' })
        return
      }

      // Generar y descargar el ZIP
      toast({ title: 'Generando archivo comprimido...', description: 'Por favor espera mientras se crea el archivo ZIP' })
      
      const content = await zip.generateAsync({ type: "blob" })
      const folioEmbarque = embarque?.folio || 'Sin_Folio'
      const filename = `Embarque_${folioEmbarque}_${new Date().toISOString().split('T')[0]}.zip`
      
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)

      toast({ 
        title: '✅ Archivo descargado', 
        description: `Se descargó ${filename} con todos los archivos del embarque` 
      })

    } catch (error) {
      console.error('Error creando archivo comprimido:', error)
      toast({ 
        title: 'Error al crear archivo comprimido', 
        description: 'Hubo un problema al comprimir los archivos. Inténtalo de nuevo.',
        variant: 'destructive' 
      })
    }
  }

  if (loading) return (
    <div>
      <div className="p-6">Cargando embarque público...</div>
    </div>
  )

  if (!embarque) return (
    <div>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">Embarque no encontrado</h2>
        <p className="text-sm text-gray-700">{errorMsg || 'Embarque no encontrado o enlace inválido.'}</p>
        <p className="text-sm text-gray-500 mt-3">Si eres desarrollador y estás en entorno local, la página intentará cargar el embarque sin token.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-3 sm:p-6 max-w-5xl mx-auto">
        <Toaster />

        <Card>
          <CardHeader className="pb-6 px-3 sm:pb-8 sm:px-6">
            <div className="flex flex-col space-y-4 w-full">
              {/* Logo y título - completamente centrados */}
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex flex-col items-center">
                  <img src="/monarca-logo.png" alt="Monarca" className="h-16 sm:h-18 w-auto max-w-[220px]" />
                  <CardTitle className="mt-2 text-lg sm:text-xl font-semibold text-gray-900 text-center leading-tight">
                    Transportes Internacionales Monarca
                  </CardTitle>
                  <span className="mt-1 text-lg font-normal text-gray-900">Información del Embarque</span>
                </div>
              </div>
              

            </div>
            
            {/* Nombre del cliente - sin frame azul */}
            <div className="mt-4 sm:mt-6">
              <div className="text-center p-2">
                <div className="text-base sm:text-lg font-bold text-gray-900">{embarque?.cliente?.nombre || 'Cliente no especificado'}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="embarque-printable">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 sm:px-8">
                <div className="md:col-span-1">
                  <Label className="text-xs font-semibold text-black uppercase tracking-wide">Fecha creación</Label>
                  <p className="text-xs font-medium text-black mb-3">
                    {(embarque?.fecha_creacion || embarque?.created_at) ? formatDateTime(embarque?.fecha_creacion || embarque?.created_at) : '—'}
                  </p>
                  <Label className="text-sm font-semibold text-gray-900">Folio</Label>
                  <p className="text-sm font-bold text-gray-900">{embarque.folio || '—'}</p>
                </div>
                <div className="md:col-span-4 flex flex-col items-end">
                  <Label className="text-xs font-semibold text-black uppercase tracking-wide">Fecha expiración</Label>
                  <p className="text-xs font-medium text-black mb-3">
                    {embarque?.fecha_expiracion ? formatDateTime(embarque.fecha_expiracion) : '—'}
                  </p>
                  <Label className="text-sm font-semibold text-gray-900">Tipo de Servicio</Label>
                  <p className="text-sm text-right">{tipoServicioText || embarque.tipo_servicio_id || '—'}</p>
                </div>
                <div className="md:col-span-5 lg:col-span-5">
                  <Label className="text-sm font-semibold text-gray-900">Contenido</Label>
                  <p className="text-sm">{embarque.contenido || '—'}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-4 px-6 sm:px-8">
                {/* Column 1: Lugar Recolecta, Destino, Peso (peso under destino) */}
                <div className="md:col-span-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-900">Lugar Recolecta</Label>
                    <Label className="text-sm font-semibold text-gray-900">Fecha / Hora Recolecta</Label>
                  </div>
                  {Array.isArray(embarque.recolectas) && embarque.recolectas.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {embarque.recolectas.map((r: any, i: number) => (
                        <div key={i} className="w-full text-gray-900 bg-gray-50 p-3 rounded">
                          <div className="font-medium text-xs text-gray-700">{i === 0 ? 'Original' : `Recolecta ${i + 1}`}</div>
                          <div className="mt-1 flex justify-between items-start gap-4">
                            <div className="whitespace-pre-wrap text-sm">{r?.direccion || 'Sin especificar'}</div>
                            <div className="text-sm text-gray-600 text-right min-w-[140px] font-semibold">
                              {(r?.fecha || r?.hora) ? (
                                <span>
                                  {r?.fecha ? (() => {
                                    try {
                                      // Si la fecha ya incluye 'T', extraer solo la parte de fecha
                                      const fechaSolo = r.fecha.includes('T') ? r.fecha.split('T')[0] : r.fecha
                                      
                                      const date = new Date(fechaSolo + 'T00:00:00')
                                      if (isNaN(date.getTime())) return r.fecha
                                      
                                      // Formato dd/mm/yyyy
                                      const day = date.getUTCDate().toString().padStart(2, '0')
                                      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                                      const year = date.getUTCFullYear()
                                      return `${day}/${month}/${year}`
                                    } catch (error) {
                                      return r.fecha
                                    }
                                  })() : ''} {r?.hora || ''}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Sin información</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">{embarque.origen || '—'}</p>
                  )}

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-900">Entrega</Label>
                      <Label className="text-sm font-semibold text-gray-900">Fecha / Hora Entrega</Label>
                    </div>
                    {Array.isArray(embarque.entregas) && embarque.entregas.length > 0 ? (
                      <div className="space-y-2 mt-1">
                        {embarque.entregas.map((e: any, i: number) => (
                          <div key={i} className="w-full text-gray-900 bg-gray-50 p-3 rounded">
                            <div className="font-medium text-xs text-gray-700">{i === (embarque.entregas.length - 1) ? 'Final' : `Entrega ${i + 1}`}</div>
                            <div className="mt-1 flex justify-between items-start gap-4">
                              <div className="whitespace-pre-wrap text-sm">{e?.direccion || 'Sin especificar'}</div>
                              <div className="text-sm text-gray-600 text-right min-w-[140px] font-semibold">
                                {(e?.fecha || e?.hora) ? (
                                  <span>
                                    {e?.fecha ? (() => {
                                      try {
                                        // Si la fecha ya incluye 'T', extraer solo la parte de fecha
                                        const fechaSolo = e.fecha.includes('T') ? e.fecha.split('T')[0] : e.fecha
                                        
                                        const date = new Date(fechaSolo + 'T00:00:00')
                                        if (isNaN(date.getTime())) return e.fecha
                                        
                                        // Formato dd/mm/yyyy
                                        const day = date.getUTCDate().toString().padStart(2, '0')
                                        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                                        const year = date.getUTCFullYear()
                                        return `${day}/${month}/${year}`
                                      } catch (error) {
                                        return e.fecha
                                      }
                                    })() : ''} {e?.hora || ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">Sin información</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm">{embarque.destino || '—'}</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center sm:justify-between justify-center gap-8 sm:gap-0">
                    <div className="text-center sm:text-left">
                      <Label className="text-sm font-semibold text-gray-900">Peso</Label>
                      <p className="text-sm">{embarque.peso ? `${String(embarque.peso)} Kg` : '—'}</p>
                    </div>
                    
                    <div className="text-center sm:text-left">
                      <Label className="text-sm font-semibold text-gray-900">Remolque</Label>
                      <div className="text-sm text-right max-w-[280px]">
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

                  {/* Liga compartida por Monarca - Después de Peso */}
                  {embarque?.reporte_cliente_url && (
                    <div className="mt-4">
                      <Label className="text-sm font-semibold text-gray-900">Liga de referencia</Label>
                      <div className="mt-1">
                        <a href={embarque.reporte_cliente_url} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all text-sm">{embarque.reporte_cliente_url}</a>
                      </div>
                    </div>
                  )}

                  {/* Enlace de Google Maps - Después de Peso */}
                  <div className="mt-4">
                    <Label className="text-sm font-semibold text-gray-900">📍 Ubicación de referencia (Google Maps)</Label>
                    {!editingMapsLink && googleMapsLink ? (
                      <div className="mt-1 flex items-center gap-2">
                        <a href={googleMapsLink} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all text-sm flex-1">{googleMapsLink}</a>
                        <button
                          onClick={() => setEditingMapsLink(true)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium whitespace-nowrap"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => window.open(googleMapsLink, '_blank')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium whitespace-nowrap"
                        >
                          Abrir Maps
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="url"
                          placeholder="https://maps.google.com/..."
                          value={googleMapsLink}
                          onChange={(e) => setGoogleMapsLink(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={async () => {
                            await handleSaveGoogleMapsLink()
                            setEditingMapsLink(false)
                          }}
                          disabled={savingMapsLink}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {savingMapsLink ? 'Guardando...' : 'Guardar'}
                        </Button>
                        {googleMapsLink && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setGoogleMapsLink(embarque?.google_maps_link || '')
                              setEditingMapsLink(false)
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
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
              <CardTitle className="text-sm font-semibold">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded" aria-live="polite">
                {embarque.observaciones ? (
                  <pre className="whitespace-pre-wrap text-sm m-0">{String(embarque.observaciones)}</pre>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Información Complementaria</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadPDF} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded">Descargar PDF</button>
                {(fotos.length > 0 || documentos.length > 0) && (
                  <button onClick={downloadAllFiles} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">📦 Descargar ZIP</button>
                )}
              </div>
            </div>

            {fotos.length === 0 && documentos.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay archivos disponibles.</p>
            ) : (
              <div className="space-y-6">
                {/* Sección de Imágenes */}
                {fotos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Imágenes ({fotos.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                      {fotos.map((f) => (
                        <div key={f.id} className="bg-white rounded shadow p-2">
                          <img src={f.url_blob} alt={f.nombre_archivo} className="w-full h-40 object-cover rounded" />
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
                  </div>
                )}

                {/* Sección de Documentos */}
                {documentos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Documentos ({documentos.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                      {documentos.map((doc) => (
                        <div key={doc.id} className="border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          {/* Preview del archivo */}
                          <div className="h-32 bg-gray-100 flex items-center justify-center relative group">
                            {doc.tipo_archivo?.startsWith("image/") ? (
                              <img
                                src={doc.url || doc.url_blob}
                                alt={doc.nombre_archivo}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText className="h-16 w-16 text-red-500" />
                            )}
                            {/* Overlay con botones */}
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {(doc.url || doc.url_blob) && (
                                <button
                                  onClick={() => window.open(doc.url || doc.url_blob, "_blank")}
                                  className="px-3 py-1 bg-white text-gray-900 hover:bg-gray-100 rounded text-xs font-medium"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1 inline" />
                                  Ver
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Información del archivo */}
                          <div className="p-3">
                            <p className="text-sm font-medium truncate text-gray-900">
                              {doc.nombre_archivo}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              {doc.tamano_bytes && (
                                <p className="text-xs text-gray-500">
                                  {(doc.tamano_bytes / 1024).toFixed(1)} KB
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {doc.tipo_archivo?.startsWith("image/") ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                                <span>{doc.tipo_archivo?.split('/')[1]?.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
 