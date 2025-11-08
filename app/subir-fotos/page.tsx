"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, X, Check, User, Truck, Package, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { subirFotoEmbarque } from "@/lib/blob"
import { agregarAuditLog } from "@/lib/audit"
import { formatDateMatamoros, normalizeDate, cleanDateString } from "@/lib/date-utils"

export default function SubirFotosPage() {
  const searchParams = useSearchParams()
  const [folio, setFolio] = useState("")
  const [operador, setOperador] = useState("")
  const [tractor, setTractor] = useState("")
  const [contenedor, setContenedor] = useState("")
  const [fechaRecolecta, setFechaRecolecta] = useState("")
  const [fechaEntrega, setFechaEntrega] = useState("")
  type LocalFoto = { id: number; file: File; preview: string | ArrayBuffer | null; nombre: string; tamaño: string }
  const [fotos, setFotos] = useState<LocalFoto[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [completado, setCompletado] = useState(false)
  const [embarqueId, setEmbarqueId] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    // Leer parámetros de la URL
  const folioParam = searchParams?.get("folio") || ""
  const operadorParam = searchParams?.get("op") || ""
  const tractorParam = searchParams?.get("tractor") || ""
  const contenedorParam = searchParams?.get("contenedor") || ""

    setFolio(folioParam)
    setOperador(operadorParam)
    setTractor(tractorParam)
    setContenedor(contenedorParam)

    // Buscar el embarque en Supabase para obtener el ID
    if (folioParam) {
      buscarEmbarque(folioParam)
    }
  }, [searchParams])

  const buscarEmbarque = async (folioEmbarque: string) => {
    try {
      const { data, error } = await supabase
        .from("embarques")
        .select("id, fecha_recolecta, fecha_entrega")
        .eq("folio", folioEmbarque)
        .single()

      if (error) {
        console.error("Error al buscar embarque:", error)
        return
      }

      if (data) {
        setEmbarqueId(data.id)
        setFechaRecolecta(data.fecha_recolecta || "")
        setFechaEntrega(data.fecha_entrega || "")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    const maxFotos = 10

    if (fotos.length + files.length > maxFotos) {
      alert(`Solo puedes subir máximo ${maxFotos} fotos. Actualmente tienes ${fotos.length} fotos.`)
      return
    }

    files.forEach((file) => {
      const f = file as File
      if (f.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const nuevaFoto = {
            id: Date.now() + Math.random(),
            file: f,
            preview: e.target?.result || null,
            nombre: f.name,
            tamaño: (f.size / 1024 / 1024).toFixed(2) + " MB",
          }
          setFotos((prev) => [...prev, nuevaFoto])
        }
        reader.readAsDataURL(f)
      }
    })

    // Limpiar el input
    if (input) input.value = ""
  }

  const eliminarFoto = (id: number) => {
    setFotos((prev: LocalFoto[]) => prev.filter((foto) => foto.id !== id))
  }

  const subirFotos = async () => {
  if (fotos.length === 0) {
      alert("Por favor selecciona al menos una foto")
      return
    }

    if (!embarqueId) {
      alert("No se pudo encontrar el embarque. Verifica el folio.")
      return
    }

    setSubiendo(true)

  try {
      const fotosSubidas = []

      // Subir cada foto a Vercel Blob
  for (const foto of fotos) {
        try {
          // Subir a Vercel Blob
          const { url, pathname } = await subirFotoEmbarque(foto.file, folio, operador)

          // Guardar referencia en Supabase
          const { data, error } = await supabase
            .from("fotos_embarques")
            .insert({
              embarque_id: embarqueId,
              nombre_archivo: foto.nombre,
              url_blob: url,
              tamaño_bytes: foto.file.size,
              tipo_mime: foto.file.type,
              subido_por: operador,
            })
            .select()
            .single()

          if (error) {
            console.error("Error al guardar foto en BD:", error)
            continue
          }

          fotosSubidas.push(data)
        } catch (error) {
          console.error("Error al subir foto:", foto.nombre, error)
          const msg = error instanceof Error ? error.message : String(error)
          // Mostrar alerta clara si es por cuota llena
          if (/almacenamiento.*lleno|quota|507/i.test(msg)) {
            setErrorMsg("El almacenamiento de imágenes está lleno y no se pueden subir más archivos. Contacta al administrador para liberar espacio o ampliar el plan.")
          } else {
            setErrorMsg(msg)
          }
        }
      }

      if (fotosSubidas.length > 0) {
        setCompletado(true)
        try {
          agregarAuditLog(
            "CREAR",
            "Subir Fotos",
            `Subió ${fotosSubidas.length} foto(s) para embarque ${folio} por ${operador || 'N/A'}`
          )
        } catch {}
      } else {
        setErrorMsg((prev) => prev || "No se pudieron subir las fotos. Intenta nuevamente.")
      }
    } catch (error) {
      console.error("Error general:", error)
      const msg = error instanceof Error ? error.message : String(error)
      setErrorMsg(msg || "Error al subir las fotos. Intenta nuevamente.")
    } finally {
      setSubiendo(false)
    }
  }

  if (completado) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800 mb-2">¡Fotos Subidas Exitosamente!</h2>
            <p className="text-green-600 mb-4">
              Se subieron {fotos.length} foto{fotos.length !== 1 ? "s" : ""} del embarque {folio}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Las fotos han sido guardadas en el sistema y estarán disponibles para consulta.
            </p>
            <Button
              onClick={() => {
                setCompletado(false)
                setFotos([])
              }}
              className="w-full"
            >
              Subir Más Fotos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTitle>Almacenamiento lleno</AlertTitle>
            <AlertDescription>
              {errorMsg}
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Subir Fotos del Embarque</CardTitle>
            <CardDescription>Sube las fotos del embarque para completar el registro</CardDescription>
          </CardHeader>
        </Card>

        {/* Información del embarque */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Información del Embarque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Folio:</span>
              <Badge variant="outline" className="font-mono">
                {folio}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center">
                <User className="h-3 w-3 mr-1" />
                Operador:
              </span>
              <span className="font-medium">{operador}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center">
                <Truck className="h-3 w-3 mr-1" />
                Tractor:
              </span>
              <span className="font-medium">{tractor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center">
                <Package className="h-3 w-3 mr-1" />
                Contenedor:
              </span>
              <span className="font-medium">{contenedor}</span>
            </div>
            {fechaRecolecta && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fecha de Recolecta:</span>
                <span className="font-medium text-green-600">{cleanDateString(fechaRecolecta)}</span>
              </div>
            )}
            {fechaEntrega && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fecha de Entrega:</span>
                <span className="font-medium text-blue-600">{cleanDateString(fechaEntrega)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selector de fotos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Fotos</CardTitle>
            <CardDescription>Puedes subir hasta 10 fotos. Actualmente: {fotos.length}/10</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="block">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={fotos.length >= 10}
                />
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    fotos.length >= 10
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                      : "border-blue-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {fotos.length >= 10 ? "Máximo de fotos alcanzado" : "Toca para seleccionar fotos"}
                  </p>
                </div>
              </label>

              {/* Preview de fotos */}
              {fotos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Fotos seleccionadas:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="relative">
                        <img
                          src={(typeof foto.preview === 'string' ? foto.preview : undefined) || "/placeholder.svg"}
                          alt={foto.nombre}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => eliminarFoto(foto.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="mt-1">
                          <p className="text-xs text-gray-600 truncate">{foto.nombre}</p>
                          <p className="text-xs text-gray-400">{foto.tamaño}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botón de subir */}
        <Button onClick={subirFotos} disabled={fotos.length === 0 || subiendo} className="w-full h-12" size="lg">
          {subiendo ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Subiendo fotos...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Subir {fotos.length} foto{fotos.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>

        {/* Información adicional */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Instrucciones:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Toma fotos claras del contenedor y tractor</li>
                <li>Incluye fotos de los documentos si es necesario</li>
                <li>Asegúrate de que las fotos sean legibles</li>
                <li>Máximo 10 fotos por embarque</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
