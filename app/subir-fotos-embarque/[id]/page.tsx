"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DropZone } from "@/components/ui/dropzone"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Upload,
  ImageIcon,
  FileText,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Camera,
  X,
  ArrowLeft,
  MapPin,
  HelpCircle,
  Zap,
} from "lucide-react"
import {
  supabase,
  type Embarque,
  type FotoEmbarque,
  buscarEmbarquePorFolio,
  obtenerFotosEmbarque,
  guardarFotoEmbarque,
  guardarConfirmacionOperador,
  obtenerConfirmacionOperador,
} from "@/lib/supabase"
import { subirFotoEmbarque, eliminarFotoEmbarque } from "@/lib/blob"
import { agregarAuditLog } from "@/lib/audit"
import { compressMultipleImages, formatFileSize, needsCompression, type CompressionResult } from "@/lib/image-compression"
import { CompressionProgress, CompressionResultSummary } from "@/components/ui/compression-progress"
import { formatDateMatamoros, normalizeDate, cleanDateString } from "@/lib/date-utils"

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

export default function SubirFotosEmbarquePage() {
  const params = useParams()
  const router = useRouter()
  const embarqueId = (params as any)?.id as string

  const [embarque, setEmbarque] = useState<Embarque | null>(null)
  const [fotos, setFotos] = useState<FotoEmbarque[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [operadorNombre, setOperadorNombre] = useState("")
  const [confirmacionGuardada, setConfirmacionGuardada] = useState(false)
  const [error, setError] = useState("")
  const [quotaFull, setQuotaFull] = useState(false)
  const [success, setSuccess] = useState("")
  
  // Estados para compresión de imágenes
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0, fileName: "" })
  const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([])
  const [showCompressionSummary, setShowCompressionSummary] = useState(false)

  const [openSuccessDialog, setOpenSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [successType, setSuccessType] = useState<"upload" | "delete">("upload")
  const [generatingLink, setGeneratingLink] = useState(false)

    // Geolocalización
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [geoStatus, setGeoStatus] = useState<"solicitando" | "ok" | "error" | null>(null)
  
  // Estado para el popup de ayuda
  const [showHelpPopup, setShowHelpPopup] = useState(false)

  // Permitir desactivar el requisito de ubicación si hay problemas (iOS/Safari)
  const [requerirUbicacion, setRequerirUbicacion] = useState<boolean>(true)
  const [toggleUbicacionMode, setToggleUbicacionMode] = useState<null | "disable" | "enable">(null)

  // Límite de archivos por embarque
  const MAX_FILES = 10

  useEffect(() => {
    const cargarFotos = async () => {
      if (!embarque?.id) return

      const fotosGuardadas = await obtenerFotosEmbarque(embarque.id)
      setFotos(fotosGuardadas)
    }

    cargarFotos()
  }, [embarque?.id])

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [embarqueId])

  // Intentar solicitar ubicación al cargar (si el navegador lo permite)
  useEffect(() => {
    // Solo en dispositivos móviles y no forzar inmediatamente
    const esMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (typeof window === "undefined" || !("geolocation" in navigator)) return
    
    // Esperar un momento antes de solicitar para que la UI se cargue
    const timer = setTimeout(() => {
      if (esMobile) {
        // En móviles, solicitar sin mostrar errores inmediatamente
        solicitarUbicacion(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cerrar popup de ayuda al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHelpPopup) {
        const target = event.target as Element
        if (!target.closest('.help-popup') && !target.closest('button')) {
          setShowHelpPopup(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHelpPopup])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError("")

      // Buscar embarque por ID o folio
      let embarqueData: Embarque | null = null

      // Primero intentar buscar por ID
      const { data: embarquePorId, error: errorId } = await supabase
        .from("embarques")
        .select(`
          *,
          cliente:clientes(nombre),
          operador:operadores(nombre, apellidos),
          camion:camiones(numero_economico, placas),
          remolque:remolques(numero_economico, placas)
        `)
        .eq("id", embarqueId)
        .single()

      if (!errorId && embarquePorId) {
        embarqueData = embarquePorId
      } else {
        // Si no se encuentra por ID, intentar por folio
        embarqueData = await buscarEmbarquePorFolio(embarqueId)
      }

      if (!embarqueData) {
        setError("No se encontró el embarque especificado")
        return
      }

      setEmbarque(embarqueData)

      // Cargar fotos existentes
      const fotosData = await obtenerFotosEmbarque(embarqueData.id)
      setFotos(fotosData)

      // Verificar si ya hay confirmación del operador
      const confirmacion = await obtenerConfirmacionOperador(embarqueData.id)
      if (confirmacion) {
        setConfirmacionGuardada(true)
        setOperadorNombre(confirmacion.operador_nombre)
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
      setError("Error al cargar los datos del embarque")
    } finally {
      setLoading(false)
    }
  }

  const solicitarUbicacion = (mostrarErrores = true) => {
    // Verificar soporte de geolocalización
    if (!("geolocation" in navigator)) {
      if (mostrarErrores) setError("Este dispositivo/navegador no soporta geolocalización")
      setGeoStatus("error")
      return
    }

    // Verificar si estamos en HTTPS o localhost (requerido en iOS)
    const esSeguro = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (!esSeguro && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      if (mostrarErrores) {
        setError("⚠️ iOS requiere HTTPS para geolocalización. Usa localhost o configura HTTPS.")
      }
      setGeoStatus("error")
      return
    }

    setGeoStatus("solicitando")

    // Configuración optimizada para móviles
    const opciones: PositionOptions = {
      enableHighAccuracy: false, // Cambiar a false para mejor compatibilidad en iOS
      timeout: 15000, // Aumentar timeout para conexiones lentas
      maximumAge: 300000 // Permitir ubicación de hasta 5 minutos (300 segundos)
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("Ubicación obtenida:", { lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLatitud(pos.coords.latitude)
        setLongitud(pos.coords.longitude)
        setGeoStatus("ok")
        if (mostrarErrores) {
          setError("") // Limpiar errores previos
        }
      },
      (err) => {
        console.error("Error de geolocalización:", err)
        let mensajeError = ""
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            mensajeError = /iPad|iPhone|iPod/.test(navigator.userAgent)
              ? "📍 Permiso denegado. Ve a Ajustes > Privacidad y Seguridad > Servicios de Ubicación y actívalos para Safari."
              : "📍 Permiso denegado. Permite el acceso a ubicación en tu navegador."
            break
          case err.POSITION_UNAVAILABLE:
            mensajeError = "📍 Ubicación no disponible. Verifica tu GPS o conexión a internet."
            break
          case err.TIMEOUT:
            mensajeError = "📍 Tiempo agotado obteniendo ubicación. Intenta de nuevo."
            break
          default:
            mensajeError = `📍 Error de ubicación: ${err.message || 'Error desconocido'}`
        }

        if (mostrarErrores) {
          setError(mensajeError)
        }
        setGeoStatus("error")
      },
      opciones
    )
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    // Validar archivos
    const archivosValidos = files.filter((file) => {
      const esImagen = file.type.startsWith("image/")
      const esPDF = file.type === "application/pdf"
      const tamañoValido = file.size <= 10 * 1024 * 1024 // 10MB máximo

      if (!esImagen && !esPDF) {
        setError(`${file.name}: Solo se permiten imágenes y archivos PDF`)
        return false
      }

      if (!tamañoValido) {
        setError(`${file.name}: El archivo es muy grande (máximo 10MB)`)
        return false
      }

      return true
    })

    // Respetar límite global de 10 (existentes + seleccionados + nuevos)
    const yaExistentes = fotos.length
    const yaSeleccionados = selectedFiles.length
    const restante = MAX_FILES - (yaExistentes + yaSeleccionados)

    if (restante <= 0) {
      setError(`No puedes subir más de ${MAX_FILES} archivos. Elimina alguno para continuar.`)
      return
    }

    const paraAgregar = archivosValidos.slice(0, Math.max(0, restante))

    if (paraAgregar.length < archivosValidos.length) {
      setError(`Solo puedes agregar ${restante} archivo(s) más (máximo ${MAX_FILES}).`)
    } else {
      setError("")
    }

    if (paraAgregar.length > 0) {
      setSelectedFiles((prev) => [...prev, ...paraAgregar])
      
      // Mostrar información sobre compresión pendiente
      const imagesToCompress = paraAgregar.filter(file => needsCompression(file));
      if (imagesToCompress.length > 0) {
        const totalSize = imagesToCompress.reduce((sum, file) => sum + file.size, 0);
        console.log(`📸 ${imagesToCompress.length} imagen(es) serán comprimidas (${formatFileSize(totalSize)} total)`);
      }
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setShowCompressionSummary(false)
    setCompressionResults([])
  }

  const subirArchivos = async () => {
    if (!embarque || selectedFiles.length === 0) return

    if (!operadorNombre.trim()) {
      setError("Por favor ingresa el nombre del operador")
      return
    }

    // Requerir ubicación para el operador móvil (solo si está activa la obligación)
    if (requerirUbicacion && (latitud == null || longitud == null)) {
      setError("Activa tu ubicación para continuar. Toca en 'Activar ubicación' y acepta el permiso, o desactiva el requisito desde el botón superior derecho.")
      return
    }

    // Verificar límite antes de subir
    if (fotos.length + selectedFiles.length > MAX_FILES) {
      setError(`No puedes subir más de ${MAX_FILES} documentos. Actualmente tienes ${fotos.length} y seleccionaste ${selectedFiles.length}.`)
      return
    }

    try {
      setUploading(true)
      setError("")
      setShowCompressionSummary(false)

      // Paso 1: Comprimir imágenes si es necesario
      let filesToUpload = selectedFiles;
      const imagesToCompress = selectedFiles.filter(file => needsCompression(file));
      
      if (imagesToCompress.length > 0) {
        setIsCompressing(true);
        
        try {
          console.log(`🔄 Comprimiendo ${imagesToCompress.length} imagen(es)...`);
          
          const compressionResults = await compressMultipleImages(
            selectedFiles,
            undefined, // Usar configuración por defecto
            (current, total, fileName) => {
              setCompressionProgress({ current, total, fileName });
            }
          );
          
          setCompressionResults(compressionResults);
          
          // Usar archivos comprimidos para la subida
          filesToUpload = compressionResults.map(result => result.compressedFile);
          
          console.log('✅ Compresión completada');
          setShowCompressionSummary(true);
          
        } catch (compressionError) {
          console.warn('⚠️ Error en compresión, usando archivos originales:', compressionError);
          // Si falla la compresión, usar archivos originales
          filesToUpload = selectedFiles;
        } finally {
          setIsCompressing(false);
        }
      }

      // Paso 2: Subir archivos (comprimidos o originales)
      let archivosSubidos = 0

      for (const file of filesToUpload) {
        // Corte de seguridad si se alcanzó el máximo mientras se sube
        if (fotos.length + archivosSubidos >= MAX_FILES) {
          break
        }
        try {
          // Crear nombre único que incluya el folio del embarque
          const timestamp = Date.now()
          const extension = file.name.split(".").pop()
          const nombreOperador = operadorNombre.replace(/\s+/g, "-")
          const nombreArchivo = `${embarque.folio}-${timestamp}-${nombreOperador}.${extension}`

          // Subir archivo a blob storage
          const { url } = await subirFotoEmbarque(file, embarque.folio, nombreOperador)

          const fotoGuardada = await guardarFotoEmbarque({
            embarque_id: embarque.id,
            nombre_archivo: nombreArchivo,
            url_blob: url,
            tipo_mime: file.type,
            subido_por: operadorNombre.trim(),
            tamano_bytes: file.size,
            latitud: requerirUbicacion ? (latitud ?? undefined) : undefined,
            longitud: requerirUbicacion ? (longitud ?? undefined) : undefined,
          })

          if (fotoGuardada) {
            setFotos((prev) => [...prev, fotoGuardada])
            archivosSubidos++
          } else {
            throw new Error(`No se pudo guardar la metadata de la foto`)
          }
          // // ✅ Agregar manualmente al estado `fotos`
          // setFotos((prev) => [
          //   ...prev,
          //   {
          //     id: crypto.randomUUID(), // ID temporal
          //     embarque_id: embarque.id,
          //     nombre_archivo: nombreArchivo,
          //     url_blob: url,
          //     tipo_mime: file.type,
          //     subido_por: operadorNombre.trim(),
          //     fecha_subida: new Date().toISOString(),
          //     tamano_bytes: file.size,
          //   },
          // ])

          // archivosSubidos++
        } catch (error) {
          console.error(`Error subiendo ${file.name}:`, error)
          const msg = error instanceof Error ? error.message : String(error)
          setError(`Error subiendo ${file.name}: ${msg}`)
          if (/almacenamiento.*lleno|quota|507/i.test(msg)) {
            setQuotaFull(true)
          }
        }
      }

      if (archivosSubidos > 0) {
        // Guardar confirmación del operador si no existe
        if (!confirmacionGuardada) {
          const confirmacionExitosa = await guardarConfirmacionOperador(embarque.id, operadorNombre.trim())
          if (confirmacionExitosa) {
            setConfirmacionGuardada(true)
          }
        }

  setSuccessType("upload")
        setSuccessMessage(`${archivosSubidos} archivo(s) subido(s) exitosamente.`)
        setOpenSuccessDialog(true)
        setSelectedFiles([])
        setShowCompressionSummary(false)
        setCompressionResults([])
        try {
          agregarAuditLog(
            "CREAR",
            "Subir Fotos Embarque",
            `Subió ${archivosSubidos} archivo(s) para embarque ${embarque.folio} por ${operadorNombre}`
          )
        } catch {}
      }
    } catch (error) {
      console.error("Error en subida:", error)
      const msg = error instanceof Error ? error.message : String(error)
      setError(msg || "Error al subir archivos")
    } finally {
      setUploading(false)
    }
  }

  const eliminarFoto = async (foto: FotoEmbarque) => {
    try {
      // 🧠 1. Obtener pathname real desde la URL del blob
      const pathname = new URL(foto.url_blob).pathname.replace(/^\/+/, "") // ejemplo: "embarques/TIM-2507-077/1753...Carlos.png"

      console.log("✅ Eliminando de Blob:", pathname)

      await fetch("/api/blob/eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      })

      // 🧠 2. Eliminar de la base de datos Supabase
      console.log("🗑️ Eliminando foto:", foto)

      const { data, error } = await supabase
        .from("fotos_embarques")
        .delete()
        .eq("id", foto.id)

      console.log("✅ Supabase delete response:", { data, error })

      if (error) {
        console.error("❌ Error eliminando foto de BD:", error)
        setError("Error al eliminar la foto de la base de datos")
        return
      }

      // ✅ 3. Eliminar del estado local
      setFotos((prev) => prev.filter((f) => f.id !== foto.id))
      setSuccessType("delete")
      setSuccessMessage("Foto eliminada exitosamente.")
      setOpenSuccessDialog(true)
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Subir Fotos Embarque",
          `Eliminó archivo ${foto.nombre_archivo} del embarque ${embarque?.folio}`
        )
      } catch {}
    } catch (error) {
      console.error("❌ Error eliminando foto:", error)
      setError("Error al eliminar la foto")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando información del embarque...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!embarque) {
    return (
      <div>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Embarque no encontrado</h1>
          <p className="text-gray-600 mb-4">No se pudo encontrar el embarque especificado</p>
          {/* Regresar removido para evitar que el usuario salga desde el móvil */}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/monarca-logo.png" 
              alt="Transportes Internacionales Monarca" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subir Fotos del Embarque</h1>
              <p className="text-gray-600 mt-1">
                Folio: <span className="font-semibold">{embarque.folio}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón superior derecho: activar ubicación o desactivar requisito */}
            <button
              type="button"
              onClick={() => setToggleUbicacionMode(requerirUbicacion ? "disable" : "enable")}
              aria-label={requerirUbicacion ? "Desactivar requisito de ubicación" : "Requerir ubicación"}
              title={requerirUbicacion ? "Desactivar requisito de ubicación" : "Requerir ubicación"}
              className={`p-2 rounded-md hover:bg-gray-100 ${requerirUbicacion ? '' : 'ring-1 ring-yellow-500/60 bg-yellow-50'}`}
            >
              {/* Icono antena; resaltar cuando el requisito está desactivado */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={requerirUbicacion ? "text-gray-600" : "text-yellow-700"}>
                <path d="M12 20v-6" />
                <path d="M5 9a7 7 0 0 1 14 0" />
                <path d="M8 12a4 4 0 0 1 8 0" />
              </svg>
            </button>
            {/* Indicador de estado del requisito */}
            <Badge variant={requerirUbicacion ? "outline" : "secondary"} className={requerirUbicacion ? "text-gray-700" : "bg-yellow-100 text-yellow-800 border-yellow-300"}>
              {requerirUbicacion ? "Ubicación requerida" : "Ubicación no requerida"}
            </Badge>
          </div>
        </div>

        {/* Información del embarque */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2 flex-nowrap">
                <Camera className="h-5 w-5 shrink-0" />
                <span className="leading-none">Información del Embarque</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                <p className="text-sm">{embarque.cliente?.nombre || "No especificado"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Operador</Label>
                <p className="text-sm">
                  {embarque.operador ? `${embarque.operador.nombre} ${embarque.operador.apellidos}` : "No asignado"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">No. Tractocamión</Label>
                <p className="text-sm">{embarque.camion?.numero_economico || "No asignado"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">No. Remolque</Label>
                <p className="text-sm">
                  {embarque.remolque?.numero_economico || (embarque as any).remolque_numero_economico || embarque.remolque?.placas || (embarque as any).remolque_placa || "No asignado"}
                </p>
              </div>
            </div>

            {/* Direcciones - Adaptativo móvil/escritorio */}
            <div className="space-y-4">
              {(() => {
                // Usar la misma lógica que en asignar-operadores para extraer direcciones múltiples
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
                        <MapPin className="h-4 w-4 text-green-600" />
                        <Label className="text-sm font-medium text-gray-900">Recolecta(s)</Label>
                      </div>
                      <div className="space-y-2">
                        {recolectasFinales.length > 0 ? recolectasFinales.map((r, i) => (
                          <div key={i} className="border rounded p-4">
                            <div className="space-y-1">
                              {recolectasFinales.length > 1 && (
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  {i === 0 ? "Original" : `Recolecta ${i + 1}`}
                                </div>
                              )}
                              <p className="text-sm text-gray-900 break-words">{r.direccion}</p>
                              {(r.fecha || r.hora) && (
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                                  {r.fecha && <span>📅 {cleanDateString(r.fecha)}</span>}
                                  {r.hora && <span>🕐 {r.hora}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-gray-500">Sin dirección de recolecta</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entregas */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <Label className="text-sm font-medium text-gray-900">Entrega(s)</Label>
                      </div>
                      <div className="space-y-2">
                        {entregasFinales.length > 0 ? entregasFinales.map((e, i) => (
                          <div key={i} className="border rounded p-4">
                            <div className="space-y-1">
                              {entregasFinales.length > 1 && (
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  {i === (entregasFinales.length - 1) ? "Final" : `Entrega ${i + 1}`}
                                </div>
                              )}
                              <p className="text-sm text-gray-900 break-words">{e.direccion}</p>
                              {(e.fecha || e.hora) && (
                                <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                                  {e.fecha && <span>📅 {cleanDateString(e.fecha)}</span>}
                                  {e.hora && <span>🕐 {e.hora}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-gray-500">Sin dirección de entrega</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              {quotaFull && <AlertTitle>Almacenamiento lleno</AlertTitle>}
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Progreso de compresión */}
        <CompressionProgress
          isCompressing={isCompressing}
          currentFile={compressionProgress.fileName}
          currentIndex={compressionProgress.current}
          totalFiles={compressionProgress.total}
        />

        {/* Resumen de compresión */}
        {showCompressionSummary && compressionResults.length > 0 && (
          <CompressionResultSummary
            results={compressionResults.map(result => ({
              fileName: result.compressedFile.name,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              compressionPercentage: result.compressionPercentage,
              success: result.compressionPercentage > 0
            }))}
          />
        )}

        {/* Formulario de subida */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subir Fotos</CardTitle>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0"
                  onClick={() => setShowHelpPopup(!showHelpPopup)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                
                {/* Popup de ayuda */}
                {showHelpPopup && (
                  <div className="help-popup absolute right-0 top-10 w-80 bg-white border rounded-lg shadow-lg p-4 z-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">📱 Ayuda para GPS</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setShowHelpPopup(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                        <div className="text-xs text-gray-700 space-y-2">
                          <p className="font-medium">Para activar GPS en iPhone/iPad:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Ve a <strong>Ajustes → Privacidad y Seguridad → Servicios de Ubicación</strong></li>
                            <li>Activa <strong>Servicios de Ubicación</strong></li>
                            <li>Busca <strong>Safari</strong> y selecciona <strong>"Al usar la app"</strong></li>
                            <li>Recarga esta página para aplicar cambios</li>
                          </ol>
                          {window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost') && (
                            <p className="text-blue-600 mt-2">
                              🔒 <strong>Nota:</strong> iOS requiere HTTPS para geolocalización.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-700">
                          <p>💡 <strong>Tip:</strong> Permite la ubicación cuando el navegador te lo solicite para agregar coordenadas GPS a tus fotos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <CardDescription>Selecciona las fotos o documentos relacionados con este embarque</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ubicación del operador (ocultada por solicitud) */}
            {/* Confirmación del operador */}
            <div className="space-y-2">
              <Label htmlFor="operador">Nombre del Operador *</Label>
              <Input
                id="operador"
                value={operadorNombre}
                onChange={(e) => setOperadorNombre(e.target.value)}
                placeholder="Operador Captura Aquí tu Nombre"
                className="placeholder:italic placeholder:text-gray-500"
                disabled={confirmacionGuardada}
              />
              {confirmacionGuardada && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Operador confirmado</span>
                </div>
              )}
            </div>

            {/* Selector de archivos */}
            <DropZone
              uploading={uploading}
              onFilesSelected={(files) => handleFileSelect({ target: { files } } as any)}
            />

            {/* Vista previa de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos Seleccionados ({selectedFiles.length})</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => {
                    const willBeCompressed = needsCompression(file);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                              {willBeCompressed && (
                                <div className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-amber-500" />
                                  <span className="text-xs text-amber-600">Se comprimirá</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeSelectedFile(index)} disabled={uploading || isCompressing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botón de subida */}
            <Button
              onClick={subirArchivos}
              disabled={uploading || isCompressing || selectedFiles.length === 0 || !operadorNombre.trim() || quotaFull}
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {isCompressing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Comprimiendo imágenes...
                </>
              ) : uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Subiendo archivos...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir {selectedFiles.length} archivo(s)
                  {selectedFiles.some(needsCompression) && (
                    <span className="ml-1 text-xs opacity-90">⚡</span>
                  )}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Galería de fotos existentes */}
        <Card>
          <CardHeader>
            <CardTitle>Fotos del Embarque ({fotos.filter(f => f.tipo_mime?.startsWith("image/")).length})</CardTitle>
            <CardDescription>Todas las fotos y documentos asociados a este embarque</CardDescription>
          </CardHeader>
          <CardContent>
            {fotos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay fotos subidas</p>
                <p className="text-sm mt-1">Las fotos aparecerán aquí una vez que las subas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {fotos
                    .filter((foto) => foto.tipo_mime?.startsWith("image/"))
                    .map((foto) => (
                  <div
                    key={foto.id}
                    className="border rounded-lg p-3 space-y-3 bg-white hover:shadow-md transition-shadow"
                  >
                    {foto.tipo_mime?.startsWith("image/") ? (
                      <div
                        className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                        onClick={() => window.open(foto.url_blob, "_blank")}
                      >
                        <img
                          src={foto.url_blob || "/placeholder.svg"}
                          alt={foto.nombre_archivo}
                          className="w-full h-full object-cover transition-opacity duration-300"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=200&width=300&text=Error+cargando+imagen"
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300">
                          <div className="text-white text-center">
                            <Eye className="h-6 w-6 mx-auto mb-1" />
                            <span className="text-xs font-medium">Click para ver</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 aspect-video rounded-lg">
                        <div className="text-center">
                          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-500">
                            {foto.tipo_mime?.includes("pdf") ? "PDF" : "Archivo"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Información del archivo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{foto.nombre_archivo}</p>
                      </div>

                      {foto.subido_por && <p className="text-xs text-gray-600">Por: {foto.subido_por}</p>}

                      {typeof (foto as any).latitud === "number" && typeof (foto as any).longitud === "number" && (
                        <p className="text-xs">
                          <a
                            className="text-blue-600 hover:underline"
                            href={`https://maps.google.com/?q=${(foto as any).latitud},${(foto as any).longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver ubicación en Google Maps
                          </a>
                        </p>
                      )}

                      <p className="text-xs text-gray-400">
                        {new Date(foto.fecha_subida).toLocaleDateString()} a las{" "}
                        {new Date(foto.fecha_subida).toLocaleTimeString()}
                      </p>

                      {/* Acciones */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => window.open(foto.url_blob, "_blank")}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={async () => {
                            try {
                              const response = await fetch(foto.url_blob)
                              const blob = await response.blob()
                              const blobUrl = URL.createObjectURL(blob)

                              const link = document.createElement("a")
                              link.href = blobUrl
                              link.download = foto.nombre_archivo
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)

                              // Liberar memoria
                              URL.revokeObjectURL(blobUrl)
                            } catch (error) {
                              console.error("Error descargando el archivo:", error)
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar foto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La foto se eliminará permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => eliminarFoto(foto)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardHeader className="mt-10">
            <CardTitle className="flex items-center justify-between">
              <span>Documentos del Embarque ({fotos.filter(f => f.tipo_mime?.includes("pdf")).length})</span>
            </CardTitle>
            <CardDescription>Archivos PDF relacionados con el embarque</CardDescription>
          </CardHeader>

          <CardContent>
            {fotos.filter((foto) => foto.tipo_mime?.includes("pdf")).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay documentos PDF</p>
                <p className="text-sm mt-1">Los documentos aparecerán aquí una vez que los subas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {fotos
                  .filter((foto) => foto.tipo_mime?.includes("pdf"))
                  .map((foto) => (
                    <div
                      key={foto.id}
                      className="border rounded-lg p-3 space-y-3 bg-white hover:shadow-md transition-shadow"
                    >
                      <div
                        className="p-6 flex flex-col items-center justify-center bg-gray-50 rounded-md cursor-pointer hover:shadow transition"
                        onClick={() => window.open(foto.url_blob, "_blank")}
                      >
                        <FileText className="h-12 w-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">PDF</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{foto.nombre_archivo}</p>
                        </div>

                        {foto.subido_por && (
                          <p className="text-xs text-gray-600">Por: {foto.subido_por}</p>
                        )}

                        <p className="text-xs text-gray-400">
                          {new Date(foto.fecha_subida).toLocaleDateString()} a las{" "}
                          {new Date(foto.fecha_subida).toLocaleTimeString()}
                        </p>

                        <div className="flex space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => window.open(foto.url_blob, "_blank")}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={async () => {
                              try {
                                const response = await fetch(foto.url_blob)
                                const blob = await response.blob()
                                const blobUrl = URL.createObjectURL(blob)

                                const link = document.createElement("a")
                                link.href = blobUrl
                                link.download = foto.nombre_archivo
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                URL.revokeObjectURL(blobUrl)
                              } catch (error) {
                                console.error("Error descargando el archivo:", error)
                              }
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Descargar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El documento se eliminará permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => eliminarFoto(foto)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

  {/* (Botón de reporte para cliente eliminado; ahora se usa el botón del card principal en Asignar Operadores) */}
        
      </div>
      <AlertDialog open={openSuccessDialog} onOpenChange={setOpenSuccessDialog}>
        <AlertDialogContent className="bg-white text-gray-900 rounded-2xl shadow-xl max-w-md">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center space-x-3">
              {successType === "upload" ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Trash2 className="h-8 w-8 text-red-500" />
              )}
              <AlertDialogTitle className="text-xl font-semibold">
                {successType === "upload" ? "¡Carga exitosa!" : "¡Eliminación exitosa!"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-end pt-4">
            <AlertDialogAction
              className={`${successType === "upload"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
                } text-white px-4 py-2 rounded-md transition-all`}
              onClick={() => setOpenSuccessDialog(false)}
            >
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Popup para confirmar cambio de requisito de ubicación */}
      <AlertDialog open={!!toggleUbicacionMode} onOpenChange={(open) => setToggleUbicacionMode(open ? (toggleUbicacionMode ?? null) : null)}>
        <AlertDialogContent className="bg-white text-gray-900 rounded-2xl shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleUbicacionMode === "disable" ? "Desactivar requisito de ubicación" : "Requerir ubicación para subir"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleUbicacionMode === "disable"
                ? "¿Deseas permitir subir archivos sin compartir tu ubicación? Puedes volver a requerirla tocando este botón otra vez."
                : "Al requerir ubicación, deberás conceder permiso para continuar con la subida de archivos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToggleUbicacionMode(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={toggleUbicacionMode === "disable" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
              onClick={() => {
                if (toggleUbicacionMode === "disable") {
                  setRequerirUbicacion(false)
                  setError("")
                } else if (toggleUbicacionMode === "enable") {
                  setRequerirUbicacion(true)
                  solicitarUbicacion(true)
                }
                setToggleUbicacionMode(null)
              }}
            >
              {toggleUbicacionMode === "disable" ? "Sí, desactivar" : "Sí, requerir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
