// Keep only one implementation to avoid redeclarations below
import { put, del } from "@vercel/blob"
import { NextResponse } from "next/server"

// Forzar runtime dinámico para asegurar lectura de variables de entorno en cada request
export const dynamic = "force-dynamic"

// Health-check sencillo: verificar si existe el token y el modo de simulación
export async function GET(): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN || ""
  const tokenPresent = Boolean(token)
  const tail = token ? token.slice(-6) : null
  return NextResponse.json({
    ok: true,
    tokenPresent,
    tokenTail: tail, // solo para diagnóstico (no revela el token completo)
    simulateQuota: process.env.SIMULATE_BLOB_QUOTA === '1',
    nodeEnv: process.env.NODE_ENV,
  })
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log("Iniciando carga de archivo...")

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const customFilename = formData.get("fileName") as string | null
  const simulateFlag = formData.get("simulate") as string | null

  if (!file) {
      console.error("No se proporcionó archivo")
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 })
    }
    // Simulación opcional de cuota llena (solo en desarrollo y controlada por variable)
    if (process.env.NODE_ENV !== 'production' && (process.env.SIMULATE_BLOB_QUOTA === '1' || simulateFlag === 'quota')) {
      console.warn('[SIMULATE] Enviando 507 BLOB_QUOTA_EXCEEDED por simulación controlada')
      return NextResponse.json(
        {
          error: "Almacenamiento de imágenes lleno.",
          code: "BLOB_QUOTA_EXCEEDED",
          simulated: true,
        },
        { status: 507 },
      )
    }


    console.log("Archivo recibido:", {
      name: file.name,
      size: file.size,
      type: file.type,
      customFilename,
    })

    // Validar tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error("Archivo muy grande:", file.size)
      return NextResponse.json({ error: "El archivo es muy grande. Tamaño máximo: 10MB" }, { status: 400 })
    }

    // Validar tipo de archivo
    const tiposPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
      "application/pdf",
    ]
    if (!tiposPermitidos.includes(file.type)) {
      console.error("Tipo de archivo no permitido:", file.type)
      return NextResponse.json(
        {
          error: "Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, BMP, WebP) y PDFs",
        },
        { status: 400 },
      )
    }

    // Verificar token de Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("Token de Blob no configurado. Defina BLOB_READ_WRITE_TOKEN en .env.local o en Variables de Entorno de Vercel (scope Server) con permisos read-write.")
      return NextResponse.json({
        error: "Configuración de almacenamiento no disponible",
        hint: "Falta BLOB_READ_WRITE_TOKEN. Genere uno con 'vercel blob token create' y reinicie el servidor.",
      }, { status: 500 })
    }

    // Usar el nombre de archivo personalizado si se proporciona, de lo contrario, el nombre original
    const filenameToUse = customFilename || file.name

    console.log("Subiendo archivo a Blob:", filenameToUse)

    const blob = await put(filenameToUse, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log("Archivo subido exitosamente:", blob)

    // Devolver la respuesta completa del blob, que incluye la URL
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    })
  } catch (error: any) {
    console.error("Error al subir al blob:", error)
    const msg = String(error?.message || "")
    const quotaLike = /quota|limit|storage|space|exceed/i.test(msg)
    const status = quotaLike ? 507 : 500 // 507 Insufficient Storage
    const code = quotaLike ? "BLOB_QUOTA_EXCEEDED" : "BLOB_UPLOAD_ERROR"
    const friendly = quotaLike
      ? "El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan."
      : `Error del servidor: ${msg || "Error desconocido"}`
    return NextResponse.json({ error: friendly, code, original: msg }, { status })
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    console.log("Iniciando eliminación de archivo...")

    const body = await request.json()
    const pathname: string | undefined = body?.pathname
    const url: string | undefined = body?.url
    const target = url || pathname

    if (!target) {
      console.error("No se proporcionó url ni pathname")
      return NextResponse.json({ error: "Falta url o pathname del archivo." }, { status: 400 })
    }

    // Verificar token de Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("Token de Blob no configurado para eliminación. Defina BLOB_READ_WRITE_TOKEN.")
      return NextResponse.json({ error: "Configuración de almacenamiento no disponible", hint: "Defina BLOB_READ_WRITE_TOKEN" }, { status: 500 })
    }

    console.log("Eliminando archivo de Blob (raw):", target)

    // Normalizar target:
    // - Si es una URL completa a blob.vercel-storage.com, extraer el pathname
    // - Si es un pathname, eliminar barras iniciales
    let normalizedTarget = target
    try {
      if (/^https?:\/\//i.test(target)) {
        try {
          const parsed = new URL(target)
          // Si es URL de Vercel Blob, usar solo el pathname (sin slash inicial)
          if (parsed.hostname && parsed.hostname.includes("vercel-storage.com")) {
            normalizedTarget = parsed.pathname.replace(/^\/+/, "")
          } else {
            // Mantener la URL completa para del() si no es vercel blob
            normalizedTarget = target
          }
        } catch (e) {
          // Si no se puede parsear, seguir con el target original
          normalizedTarget = target
        }
      } else {
        // Es un pathname: asegurarnos que no tenga barras iniciales
        normalizedTarget = String(target).replace(/^\/+/, "")
      }
    } catch (e) {
      normalizedTarget = target
    }

    console.log("Eliminando archivo de Blob (normalized):", normalizedTarget)

    await del(normalizedTarget, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log("Archivo eliminado exitosamente")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al eliminar archivo del blob:", error)
    return NextResponse.json(
      {
        error: `Error del servidor: ${error.message || "Error desconocido"}`,
      },
      { status: 500 },
    )
  }
}
