"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Pencil, ExternalLink, FileDown } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { supabase, obtenerFotosEmbarque } from "@/lib/supabase"
import { formatDateMatamoros, normalizeDate as normalizeDate_imported, cleanDateString } from '@/lib/date-utils'

// Función local para normalizar fechas UTC (copia exacta de date-utils.ts)
const normalizeDate = (v?: string | null) => {
  if (!v) return null;
  // If already YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // If value is an ISO timestamp that is exactly midnight (with or without Z)
  // treat it as a date-only value to avoid timezone shifts when parsing.
  // Examples matched: 2025-09-10T00:00:00, 2025-09-10T00:00:00.000, 2025-09-10T00:00:00Z
  // Match ISO timestamps that are exactly midnight in local timestamp (with optional fractional seconds
  // and optional timezone designator like Z or +00:00 or -0600). Treat these as date-only to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}[T ]00:00:00(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(v)) {
    return v.slice(0, 10);
  }
  try {
    const dt = new Date(v);
    if (isNaN(+dt)) return null;
    // convert to America/Matamoros local date (YYYY-MM-DD)
    const iso = dt.toLocaleDateString('en-CA', { timeZone: 'America/Matamoros' });
    return iso;
  } catch (e) {
    return null;
  }
}

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

  const downloadPDF = async () => {
    try {
      toast({ title: 'Generando PDF...', description: 'Por favor espera mientras se genera el reporte.' })
      
      // Crear elementos temporales para el PDF sin los botones
      const originalContent = document.getElementById('reporte-content')
      if (!originalContent) return

      // Crear una copia del contenido sin los botones de acción
      const printContent = originalContent.cloneNode(true) as HTMLElement
      
      // Remover botones de acción del contenido clonado
      const buttonsToRemove = printContent.querySelectorAll('button, .no-print')
      buttonsToRemove.forEach(btn => btn.remove())

      // Aplicar estilos específicos para PDF
      printContent.style.width = '794px'
      printContent.style.maxWidth = '794px'
      printContent.style.backgroundColor = 'white'
      printContent.style.fontFamily = 'Arial, sans-serif'
      printContent.style.fontSize = '12px'
      printContent.style.lineHeight = '1.4'
      printContent.style.color = '#000000'

      // Ajustar frames de información para evitar cortes
      const infoFrames = printContent.querySelectorAll('.bg-gray-50')
      infoFrames.forEach((frame) => {
        const frameElement = frame as HTMLElement
        frameElement.style.pageBreakInside = 'avoid'
        frameElement.style.marginBottom = '15px'
        frameElement.style.padding = '12px'
        frameElement.style.border = '1px solid #d1d5db'
        frameElement.style.backgroundColor = '#f9fafb'
      })

      // Ajustar las imágenes para mejor distribución
      const images = printContent.querySelectorAll('img:not([alt="Monarca"])')
      images.forEach(img => {
        const imgElement = img as HTMLElement
        imgElement.style.maxWidth = '100%'
        imgElement.style.height = 'auto'
        imgElement.style.maxHeight = '120px'
        imgElement.style.objectFit = 'contain'
      })

      // Crear contenedor temporal para el PDF
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      tempDiv.style.width = '794px'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.padding = '20px'
      tempDiv.appendChild(printContent)
      document.body.appendChild(tempDiv)

      // Generar canvas desde el HTML con mejor resolución
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        logging: false
      })

      // Limpiar el elemento temporal
      document.body.removeChild(tempDiv)

      // Crear PDF con mejores márgenes
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 0

      // Agregar primera página
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Agregar páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Descargar PDF
      const fileName = `Reporte_Embarque_${embarque?.folio || 'Sin_Folio'}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast({ 
        title: '✅ PDF generado exitosamente',
        description: `El reporte se ha descargado como ${fileName}`
      })

    } catch (error) {
      console.error('Error generando PDF:', error)
      toast({
        title: 'Error al generar PDF',
        description: 'Hubo un problema al generar el archivo PDF. Inténtalo de nuevo.',
        variant: 'destructive'
      })
    }
  }

  const formatDateTime = (v?: string | null) => {
    if (!v) return '—'
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return formatDateMatamoros(v)
      const normalizedDate = normalizeDate_imported(v)
      return `${formatDateMatamoros(normalizedDate)} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    } catch (e) {
      return String(v)
    }
  }

  const formatDateOnly = (v?: string | null) => {
    if (!v) return null
    try {
      // Aplicar la misma lógica que funciona correctamente en la página de embarques
      const normalizedDate = normalizeDate(v)
      return formatDateMatamoros(normalizedDate || v)
    } catch (e) {
      return v
    }
  }

  // Función específica para fechas de creación que vienen como timestamps
  const formatCreationDate = (v?: string | null) => {
    if (!v) return '—'
    try {
      // Si es un timestamp ISO, ajustar por timezone
      if (v.includes('T') || v.includes('Z')) {
        const d = new Date(v)
        // Ajustar por offset de timezone para evitar cambio de día
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
        return d.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit", 
          day: "2-digit",
        })
      }
      // Si es solo fecha, usar directamente
      return formatDateMatamoros(v)
    } catch (e) {
      return String(v)
    }
  }

  // Función específica para fechas de direcciones (recolecta/entrega)
  // Usa la misma lógica que funciona correctamente en la página de embarques
  const formatAddressDate = (v?: string | null) => {
    if (!v) return null
    try {
      // Aplicar la misma lógica que en /embarques: normalizeDate + formatDateMatamoros
      const normalizedDate = normalizeDate(v)
      return formatDateMatamoros(normalizedDate || v)
    } catch (e) {
      return v
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
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          
          .min-h-screen {
            background: white !important;
          }
          
          main {
            padding-top: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 10px !important;
          }
          
          .card {
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Logo - Tamaño optimizado para PDF */
          img[alt="Monarca"] {
            height: 42px !important;
            width: auto !important;
            max-width: 170px !important;
          }
          
          /* Frames de información */
          .bg-gray-50 {
            page-break-inside: avoid !important;
            margin-bottom: 15px !important;
            padding: 12px !important;
            border: 1px solid #d1d5db !important;
            background-color: #f9fafb !important;
          }
          
          /* Imágenes optimizadas */
          img:not([alt="Monarca"]) {
            max-width: 100% !important;
            height: auto !important;
            max-height: 120px !important;
            object-fit: contain !important;
          }
          
          /* Grids de imágenes - Ajuste para PDF */
          .grid {
            page-break-inside: avoid !important;
            margin-bottom: 15px !important;
          }
          
          /* Contenedores de imágenes más compactos */
          .grid > div {
            max-width: 200px !important;
            margin: 0 auto !important;
          }
          
          /* Título principal en una línea */
          .whitespace-nowrap {
            white-space: nowrap !important;
            overflow: hidden !important;
          }
          
          /* Grid de datos principales - FORZAR 4 columnas en PDF con MENOS ESPACIO */
          @media print {
            .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 0.25rem !important;
              width: 100% !important;
              margin: 0 !important;
            }
            
            .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div {
              flex-direction: column !important;
              align-items: flex-start !important;
              padding: 0.25rem !important;
              border-right: 1px solid #e5e7eb;
              font-size: 0.75rem !important;
            }
            
            .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div:last-child {
              border-right: none !important;
            }
            
            .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 Label {
              font-size: 0.7rem !important;
              line-height: 1 !important;
              margin-bottom: 0.1rem !important;
            }
            
            .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 p {
              font-size: 0.75rem !important;
              line-height: 1.2 !important;
              margin: 0 !important;
            }
          }
          
          /* Contenedores de imágenes - MÁS COMPACTOS para PDF */
          @media print {
            .grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.xl\\:grid-cols-5 {
              display: grid !important;
              grid-template-columns: repeat(6, 1fr) !important;
              gap: 0.375rem !important;
            }
            
            .grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.xl\\:grid-cols-5 > div {
              max-width: 100px !important;
              margin: 0 auto !important;
            }
            
            .grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.xl\\:grid-cols-5 img {
              height: 60px !important;
              max-height: 60px !important;
            }
            
            /* Direcciones con fecha/hora alineadas */
            .flex.flex-col.lg\\:flex-row.lg\\:justify-between {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
            }
            
            .flex.flex-col.lg\\:flex-row.lg\\:gap-3 {
              display: flex !important;
              flex-direction: row !important;
              gap: 0.5rem !important;
            }
          }
        }
      `}</style>
      <Toaster />
      <main className="pt-16 p-6 max-w-6xl mx-auto">
        <Card id="reporte-content">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="w-1/3" />
            <div className="flex flex-col items-center w-1/3">
              <CardTitle className="flex flex-col items-center">
                <img src="/monarca-logo.png" alt="Monarca" className="h-14 w-auto max-w-[170px]" />
                <div className="mt-2 text-sm md:text-base font-semibold text-gray-900 text-center whitespace-nowrap">
                  TRANSPORTES INTERNACIONALES MONARCA
                </div>
                <span className="mt-1 text-lg font-semibold">Información del Embarque</span>
              </CardTitle>
              <CardDescription className="mt-0.5">Vista de Reporte Cliente</CardDescription>
            </div>
              <div className="w-1/3 text-right">
                <div className="text-sm text-gray-600">Fecha creación</div>
                <div className="text-sm text-gray-700">{(embarque?.fecha_creacion || embarque?.created_at) ? formatDateMatamoros(normalizeDate_imported(embarque?.fecha_creacion || embarque?.created_at) || embarque?.fecha_creacion || embarque?.created_at) : '—'}</div>
              </div>
            </div>
            <div>
              <div className="mt-6 text-center text-2xl font-semibold text-gray-900">{embarque?.cliente?.nombre || '—'}</div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Información del embarque */}
            <div className="bg-gray-50 border rounded p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-gray-600">Folio</Label>
                  <p className="text-sm font-semibold">{embarque.folio || '—'}</p>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-gray-600">No. Remolque</Label>
                  <p className="text-sm font-semibold">
                    {embarque.remolque?.numero_economico || (embarque as any).remolque_numero_economico || embarque.remolque?.placas || (embarque as any).remolque_placa || '—'}
                  </p>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-gray-600">No. Load</Label>
                  <p className="text-sm font-semibold">{embarque.load || embarque.numero_load || (embarque as any).load_number || '—'}</p>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-gray-600">No. Carta Porte</Label>
                  <p className="text-sm font-semibold">{embarque.carta_porte || (embarque as any).numero_carta_porte || (embarque as any).cartaporte || '—'}</p>
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
                // Usar la misma lógica que en subir-fotos-embarque para extraer direcciones múltiples
                let recolectasFinales: Array<{direccion: string, fecha: string, hora: string}> = [];
                let entregasFinales: Array<{direccion: string, fecha: string, hora: string}> = [];
                
                try {
                  // Prioridad 1: Intentar extraer de campos JSON 
                  if ((embarque as any).recolectas_json) {
                    const parsed = JSON.parse((embarque as any).recolectas_json);
                    // Pre-procesar las fechas para normalizar UTC
                    recolectasFinales = parsed.map((r: any) => ({
                      ...r,
                      fecha: r.fecha || ""
                    }));
                  }
                  if ((embarque as any).entregas_json) {
                    const parsed = JSON.parse((embarque as any).entregas_json);
                    // Pre-procesar las fechas para normalizar UTC
                    entregasFinales = parsed.map((e: any) => ({
                      ...e,
                      fecha: e.fecha || ""
                    }));
                  }
                } catch (jsonError) {
                  console.warn("Error parsing JSON direcciones:", jsonError);
                }
                
                // Prioridad 2: Si no hay datos JSON, extraer de observaciones
                if (recolectasFinales.length === 0 && entregasFinales.length === 0) {
                  try {
                    const extracted = extraerDireccionesMultiples(embarque.observaciones || "");
                    // Pre-procesar las fechas extraídas de observaciones para normalizar UTC
                    recolectasFinales = extracted.recolectas.map((r: any) => ({
                      ...r,
                      fecha: r.fecha || ""
                    }));
                    entregasFinales = extracted.entregas.map((e: any) => ({
                      ...e,
                      fecha: e.fecha || ""
                    }));
                  } catch (e) {
                    console.warn('Error parseando direcciones múltiples:', e);
                  }
                }
                
                // Prioridad 3: Si aún no hay direcciones múltiples, usar campos legacy como fallback
                if (recolectasFinales.length === 0) {
                  const recolectaIndividual = (embarque as any).direccion_recolecta || embarque.origen;
                  if (recolectaIndividual) {
                    const fechaRecolecta = (embarque as any).fecha_recolecta || "";
                    recolectasFinales = [{
                      direccion: recolectaIndividual,
                      fecha: fechaRecolecta,
                      hora: (embarque as any).hora_recolecta || ""
                    }];
                  }
                }
                
                if (entregasFinales.length === 0) {
                  const entregaIndividual = (embarque as any).direccion_entrega || embarque.destino;
                  if (entregaIndividual) {
                    const fechaEntrega = (embarque as any).fecha_entrega || "";
                    entregasFinales = [{
                      direccion: entregaIndividual,
                      fecha: fechaEntrega,
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
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2">
                              <div className="flex-1">
                                {recolectasFinales.length > 1 && (
                                  <div className="text-xs font-medium text-green-700 mb-1">
                                    {i === 0 ? "Original" : `Recolecta ${i + 1}`}
                                  </div>
                                )}
                                <p className="text-sm text-gray-900 break-words">{r.direccion}</p>
                              </div>
                              {(r.fecha || r.hora) && (
                                <div className="flex flex-col lg:flex-row lg:gap-3 text-xs text-gray-600 lg:text-right">
                                  {r.fecha && (
                                    <div className="flex items-center gap-1 lg:justify-end">
                                      <span>📅</span>
                                      <span className="font-medium">{cleanDateString(r.fecha)}</span>
                                    </div>
                                  )}
                                  {r.hora && (
                                    <div className="flex items-center gap-1 lg:justify-end">
                                      <span>🕐</span>
                                      <span className="font-medium">{r.hora}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-gray-500">Sin dirección de recolecta</p>
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
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2">
                              <div className="flex-1">
                                {entregasFinales.length > 1 && (
                                  <div className="text-xs font-medium text-blue-700 mb-1">
                                    {i === (entregasFinales.length - 1) ? "Final" : `Entrega ${i + 1}`}
                                  </div>
                                )}
                                <p className="text-sm text-gray-900 break-words">{e.direccion}</p>
                              </div>
                              {(e.fecha || e.hora) && (
                                <div className="flex flex-col lg:flex-row lg:gap-3 text-xs text-gray-600 lg:text-right">
                                  {e.fecha && (
                                    <div className="flex items-center gap-1 lg:justify-end">
                                      <span>📅</span>
                                      <span className="font-medium">{cleanDateString(e.fecha)}</span>
                                    </div>
                                  )}
                                  {e.hora && (
                                    <div className="flex items-center gap-1 lg:justify-end">
                                      <span>🕐</span>
                                      <span className="font-medium">{e.hora}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-gray-500">Sin dirección de entrega</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Liga para cliente (editable) - Oculto en PDF */}
            <div className="bg-gray-50 border rounded p-3 mb-6 no-print">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {fotosGrupo.map((f) => (
                        <div key={f.id} className="bg-white rounded shadow p-2 w-full max-w-[150px] mx-auto">
                          <img 
                            src={f.url_blob} 
                            alt={f.nombre_archivo} 
                            className="w-full h-24 md:h-28 lg:h-32 object-cover rounded border" 
                          />
                          <div className="mt-1 flex flex-col gap-1">
                            <p className="text-xs text-gray-600 truncate" title={f.nombre_archivo}>
                              {f.nombre_archivo}
                            </p>
                            <div className="text-xs text-gray-500 truncate">
                              {f.fecha_subida ? formatDateTime(f.fecha_subida) : ''}
                            </div>
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
          <div className="px-6 pb-6 flex justify-end gap-2 no-print">
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Imprimir</Button>
            <Button onClick={downloadPDF} className="bg-red-600 hover:bg-red-700 text-white">
              <FileDown className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button onClick={downloadAllImages} className="bg-green-600 hover:bg-green-700 text-white">Descargar imágenes</Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
