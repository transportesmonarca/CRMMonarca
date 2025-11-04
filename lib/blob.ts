import { del, list } from "@vercel/blob"
import { supabase } from "@/lib/supabase"

export async function subirFotoEmbarque(
  file: File,
  folioEmbarque: string,
  operador: string,
): Promise<{ url: string; pathname: string }> {
  try {
    // Crear nombre único para el archivo
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const nombreArchivo = `embarques/${folioEmbarque}/${timestamp}-${operador}.${extension}`

    // Usar la API route para subir el archivo
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", nombreArchivo)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      // Detect server-provided quota/full signal
      const raw = await response.text()
      try {
        const errorData = JSON.parse(raw)
        if (errorData?.code === "BLOB_QUOTA_EXCEEDED" || response.status === 507) {
          throw new Error(
            errorData?.error ||
              "El almacenamiento de imágenes está lleno. Avise al administrador para liberar espacio o ampliar el plan."
          )
        }
        throw new Error(errorData?.error || "Error al subir archivo")
      } catch {
        // Fallback if response isn't JSON
        const msg = raw && raw.trim().length > 0 ? raw : undefined
        if (response.status === 507 || /quota|storage|insufficient/i.test(msg || "")) {
          throw new Error("El almacenamiento de imágenes está lleno. Avise al administrador para liberar espacio o ampliar el plan.")
        }
        throw new Error(msg || "Error al subir archivo")
      }
    }

    const result = await response.json()
    return {
      url: result.url,
      pathname: result.pathname,
    }
  } catch (error) {
    console.error("Error al subir foto:", error)
    // Conservar el mensaje específico si está disponible
    if (error instanceof Error && error.message) {
      throw error
    }
    throw new Error("Error al subir la foto")
  }
}

export async function eliminarFotoEmbarque(pathname: string): Promise<void> {
  try {
    // Usar la variable de entorno disponible
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.warn("Token de Blob no disponible, saltando eliminación de archivo:", pathname)
      return // No lanzar error, solo advertir
    }

    await del(pathname, {
      token: token,
    })
  } catch (error) {
    console.error("Error al eliminar foto:", error)
    // No lanzar error para evitar que falle toda la eliminación
    console.warn("Continuando con la eliminación a pesar del error en blob storage")
  }
}

export async function listarFotosEmbarque(folioEmbarque: string) {
  try {
    const { blobs } = await list({
      prefix: `embarques/${folioEmbarque}/`,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return blobs
  } catch (error) {
    console.error("Error al listar fotos:", error)
    throw new Error("Error al obtener las fotos")
  }
}

export async function uploadFile(fileName: string, file: File): Promise<{ url: string; pathname: string }> {
  try {
    console.log("Subiendo archivo a través de API:", fileName)

    // Usar la API route para subir el archivo
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    }).catch((fetchError) => {
      console.error("Error de red al contactar API de upload:", fetchError)
      throw new Error("No se pudo conectar con el servidor. Asegúrese de que la aplicación esté ejecutándose.")
    })

    if (!response.ok) {
      let errorText = await response.text()
      try {
        const errorData = JSON.parse(errorText)
        if (errorData?.code === "BLOB_QUOTA_EXCEEDED" || response.status === 507) {
          throw new Error(
            errorData?.error ||
              "El almacenamiento de imágenes está lleno. Avise al administrador para liberar espacio o ampliar el plan."
          )
        }
        throw new Error(errorData?.error || "Error al subir archivo")
      } catch {
        throw new Error(errorText || "Error al subir archivo")
      }
    }

    const result = await response.json()
    console.log("Archivo subido exitosamente:", result.url)

    return {
      url: result.url,
      pathname: result.pathname,
    }
  } catch (error) {
    console.error("Error al subir archivo:", error)
    throw new Error(`Error al subir el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

// Nueva función específica para documentos de operadores
export async function subirDocumentoOperador(
  operadorId: string,
  file: File,
  tipoDocumento: string,
  numeroDocumento?: string,
): Promise<{ url: string; pathname: string }> {
  try {
    console.log("Subiendo documento de operador:", { operadorId, tipoDocumento, fileName: file.name })

    // Validar archivo
    if (!file) {
      throw new Error("No se proporcionó archivo")
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("El archivo es muy grande. Tamaño máximo: 10MB")
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
      throw new Error("Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, BMP, WebP) y PDFs")
    }

    // Crear nombre único para el archivo y organizar en subcarpetas por tipo
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()

    // Clasificación de subcarpeta según tipoDocumento
    let subfolder = "otros"
    if (tipoDocumento === "fotografia_operador") subfolder = "fotografia"
    else if (tipoDocumento.startsWith("documento_basico_")) subfolder = "basicos"
    else if (
      [
        "licencia",
        "apto_medico",
        "visa",
        "fast",
        "curp",
        "rfc",
        "nss",
        "ine",
        "pasaporte",
        "comprobante_domicilio",
        "contrato",
        "otro",
      ].includes(tipoDocumento)
    ) {
      subfolder = "oficiales"
    }

    const nombreBase = `${tipoDocumento}_${timestamp}.${extension}`
    const nombreArchivo = `operadores/${operadorId}/${subfolder}/${nombreBase}`

  console.log("Nombre de archivo generado:", nombreArchivo)

    // Usar la API route para subir el archivo
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", nombreArchivo)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      let errorText = await response.text()
      console.error("Error en respuesta del servidor:", errorText)
      try {
        const parsed = JSON.parse(errorText)
        if (parsed?.code === "BLOB_QUOTA_EXCEEDED" || response.status === 507) {
          throw new Error(
            parsed?.error ||
              "El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan."
          )
        }
        throw new Error(parsed?.error || `Error del servidor: ${response.status}`)
      } catch {
        // Si no es JSON, usar el texto plano
        if (response.status === 507 || /quota|storage|insufficient/i.test(errorText)) {
          throw new Error("El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan.")
        }
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`)
      }
    }

    const result = await response.json()
    console.log("Documento subido exitosamente:", result)

    return {
      url: result.url,
      pathname: result.pathname,
    }
  } catch (error) {
    console.error("Error al subir documento de operador:", error)
    throw new Error(`Error al subir el documento: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

// Función para eliminar documento de operador
export async function eliminarDocumentoOperador(target: string): Promise<void> {
  try {
    console.log("Eliminando documento de operador:", target)
    // Normalize target to a pathname that the server-side blob deleter expects.
    // Accepts full URLs, /api/blob-proxy?pathname=..., or raw pathnames like "operadores/...".
    let pathnameToDelete = String(target || "");

    try {
      // Proxy URL form: /api/blob-proxy?pathname=ENCODED
      if (pathnameToDelete.startsWith('/api/blob-proxy')) {
        const u = new URL(window.location.origin + pathnameToDelete)
        const p = u.searchParams.get('pathname') || ''
        pathnameToDelete = tryDecode(p) || p || pathnameToDelete
      } else if (/^https?:\/\//i.test(pathnameToDelete)) {
        // Full URL to storage: extract pathname portion
        const u = new URL(pathnameToDelete)
        pathnameToDelete = u.pathname.replace(/^\/+/, '')
      }

    } catch (e) {
      // If parsing fails, fall back to the raw target string
      console.warn('No se pudo normalizar target para eliminación, usando raw target:', e)
    }

    const response = await fetch('/api/blob/eliminar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: pathnameToDelete }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error eliminando archivo (blob/eliminar):', errorText)
      if (response.status === 507) {
        throw new Error('El almacenamiento está lleno y no se pudo completar la operación.')
      }
      throw new Error(`Error al eliminar archivo: ${response.status}`)
    }

    console.log('Documento eliminado exitosamente (blob/eliminar)')
  } catch (error) {
    console.error("Error al eliminar documento:", error)
    throw error
  }
}

function tryDecode(v: string) {
  try {
    return decodeURIComponent(v || '')
  } catch { return v }
}

// ================= Helpers para Foto de Perfil de Operador =================
// Guarda la foto en Blob (usando API /api/upload) y crea la fila en imagenes_perfil_operador
export async function subirFotoPerfilOperador(operadorId: string, file: File): Promise<{ id: string | null; url: string; pathname: string }> {
  if (!operadorId) throw new Error('OperadorId requerido')
  try {
    // Guardar en folder específico por operador
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `operadores/${operadorId}/perfil/perfil_operador_${timestamp}.${extension}`

    const { url, pathname } = await uploadFile(fileName, file)

    // Desactivar otras fotos activas
    await supabase.from('imagenes_perfil_operador').update({ activo: false }).eq('operador_id', operadorId).eq('activo', true)

    // Insertar nueva fila
    const { data, error } = await supabase.from('imagenes_perfil_operador').insert({
      operador_id: operadorId,
      pathname,
      url_blob: url,
      activo: true,
    }).select().single()

    if (error) throw error

    return { id: data?.id || null, url, pathname }
  } catch (error) {
    console.error('Error subirFotoPerfilOperador:', error)
    throw error
  }
}

// Elimina la foto de perfil: busca por id o pathname, elimina el blob y marca inactiva la fila
export async function eliminarFotoPerfilOperador(opts: { id?: string; pathname?: string; operadorId?: string }): Promise<void> {
  try {
    let record: any = null
    if (opts.id) {
      const { data } = await supabase.from('imagenes_perfil_operador').select('*').eq('id', opts.id).maybeSingle()
      record = data
    } else if (opts.pathname) {
      const { data } = await supabase.from('imagenes_perfil_operador').select('*').eq('pathname', opts.pathname).maybeSingle()
      record = data
    } else if (opts.operadorId) {
      const { data } = await supabase.from('imagenes_perfil_operador').select('*').eq('operador_id', opts.operadorId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      record = data
    }

    if (!record) {
      console.warn('No se encontró registro de imagen de perfil para eliminar', opts)
      return
    }

    // Eliminar blob (intenta por pathname)
    try {
      await eliminarDocumentoOperador(record.pathname || record.url_blob || '')
    } catch (e) {
      console.warn('Fallo al eliminar blob para imagen de perfil:', e)
      // continuar para marcar inactivo igualmente
    }

    // Marcar como inactivo
    await supabase.from('imagenes_perfil_operador').update({ activo: false }).eq('id', record.id)
  } catch (error) {
    console.error('Error eliminarFotoPerfilOperador:', error)
    throw error
  }
}

// ================= Helpers para archivos de operador (no perfil) =================
// Guarda archivo en blob bajo operadores/{operadorId}/archivos/ y crea fila en archivos_operadores
export async function subirArchivoOperador(
  operadorId: string,
  file: File,
  opts?: { subfolder?: string; subidoPor?: string }
): Promise<{ id: string | null; url: string; pathname: string }> {
  if (!operadorId) throw new Error('OperadorId requerido')
  try {
    const timestamp = Date.now()
    const extension = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '')
    const sub = opts?.subfolder ? `${opts.subfolder.replace(/[^a-z0-9_-]/gi, '')}` : 'archivos'
    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const fileName = `operadores/${operadorId}/${sub}/${timestamp}_${safeName}`

    const { url, pathname } = await uploadFile(fileName, file)

    // Insertar fila en archivos_operadores
    const { data, error } = await supabase.from('archivos_operadores').insert({
      operador_id: operadorId,
      pathname,
      url_blob: url,
      nombre_archivo: file.name,
      tamano_bytes: file.size,
      tipo_mime: file.type,
      metadata: null,
      subido_por: opts?.subidoPor || 'Usuario',
      activo: true,
    }).select().single()

    if (error) {
      console.warn('Advertencia: no se pudo insertar metadata en archivos_operadores, pero el blob fue subido', error)
      return { id: null, url, pathname }
    }

    return { id: data?.id || null, url, pathname }
  } catch (error) {
    console.error('Error subirArchivoOperador:', error)
    throw error
  }
}

// Listar archivos de un operador
export async function listarArchivosOperador(operadorId: string) {
  try {
    const { data, error } = await supabase.from('archivos_operadores').select('*').eq('operador_id', operadorId).eq('activo', true).order('fecha_subida', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error listarArchivosOperador:', error)
    throw error
  }
}

// Eliminar un archivo de la tabla archivos_operadores y del blob
export async function eliminarArchivoOperador(opts: { id?: string; pathname?: string; operadorId?: string }): Promise<void> {
  try {
    let record: any = null
    if (opts.id) {
      const { data } = await supabase.from('archivos_operadores').select('*').eq('id', opts.id).maybeSingle()
      record = data
    } else if (opts.pathname) {
      const { data } = await supabase.from('archivos_operadores').select('*').eq('pathname', opts.pathname).maybeSingle()
      record = data
    } else if (opts.operadorId) {
      const { data } = await supabase.from('archivos_operadores').select('*').eq('operador_id', opts.operadorId).limit(100)
      record = data && data.length ? data[0] : null
    }

    if (!record) {
      console.warn('No se encontró registro en archivos_operadores para eliminar', opts)
      return
    }

    // Intentar eliminar blob
    try {
      await eliminarDocumentoOperador(record.pathname || record.url_blob || '')
    } catch (e) {
      console.warn('Fallo al eliminar blob para archivo operador:', e)
    }

    // Marcar inactivo
    await supabase.from('archivos_operadores').update({ activo: false, updated_at: new Date().toISOString() }).eq('id', record.id)
  } catch (error) {
    console.error('Error eliminarArchivoOperador:', error)
    throw error
  }
}

// ================= Helpers para documentos de remolques =================

export async function subirDocumentoRemolque(
  remolqueId: string,
  file: File,
  tipoDocumento: string = 'documento_general',
  numeroDocumento?: string,
): Promise<{ url: string; pathname: string }> {
  try {
    console.log("Subiendo documento de remolque:", { remolqueId, tipoDocumento, fileName: file.name })

    // Validar archivo
    if (!file) {
      throw new Error("No se proporcionó archivo")
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("El archivo es muy grande. Tamaño máximo: 10MB")
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
      throw new Error("Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, BMP, WebP) y PDFs")
    }

    // Crear nombre único para el archivo y organizar en subcarpetas por tipo
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()

    // Clasificación de subcarpeta según tipoDocumento
    let subfolder = "general"
    if (tipoDocumento === "poliza_seguro") subfolder = "seguros"
    else if (tipoDocumento === "verificacion") subfolder = "verificaciones"
    else if (tipoDocumento === "tarjeta_circulacion") subfolder = "circulacion"
    else if (tipoDocumento === "inspeccion") subfolder = "inspecciones"
    else if (tipoDocumento === "mantenimiento") subfolder = "mantenimiento"
    else if (tipoDocumento === "factura") subfolder = "facturas"
    else if (tipoDocumento === "manual") subfolder = "manuales"

    const nombreBase = `${tipoDocumento}_${timestamp}.${extension}`
    const nombreArchivo = `remolques/${remolqueId}/${subfolder}/${nombreBase}`

    console.log("Nombre de archivo generado:", nombreArchivo)

    // Usar la API route para subir el archivo
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", nombreArchivo)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      let errorText = await response.text()
      console.error("Error en respuesta del servidor:", errorText)
      try {
        const parsed = JSON.parse(errorText)
        if (parsed?.code === "BLOB_QUOTA_EXCEEDED" || response.status === 507) {
          throw new Error(
            parsed?.error ||
              "El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan."
          )
        }
        throw new Error(parsed?.error || `Error del servidor: ${response.status}`)
      } catch {
        // Si no es JSON, usar el texto plano
        if (response.status === 507 || /quota|storage|insufficient/i.test(errorText)) {
          throw new Error("El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan.")
        }
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`)
      }
    }

    const result = await response.json()
    console.log("Documento de remolque subido exitosamente:", result)

    return {
      url: result.url,
      pathname: result.pathname,
    }
  } catch (error) {
    console.error("Error al subir documento de remolque:", error)
    throw new Error(`Error al subir el documento: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

export async function eliminarDocumentoRemolque(target: string): Promise<void> {
  try {
    console.log("Eliminando documento de remolque:", target)

    // Determinar si target es un ID o un pathname
    let documentoRemolque: any
    
    if (target.includes('/')) {
      // Es un pathname, buscar por pathname
      const { data, error } = await supabase
        .from('documentos_remolques')
        .select('*')
        .eq('pathname', target)
        .eq('activo', true)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error buscando documento por pathname: ${error.message}`)
      }
      documentoRemolque = data
    } else {
      // Es un ID, buscar por ID
      const { data, error } = await supabase
        .from('documentos_remolques')
        .select('*')
        .eq('id', target)
        .eq('activo', true)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error buscando documento por ID: ${error.message}`)
      }
      documentoRemolque = data
    }

    if (!documentoRemolque) {
      console.warn('Documento de remolque no encontrado:', target)
      return
    }

    // Eliminar del blob storage
    try {
      const response = await fetch(`/api/delete-blob?pathname=${encodeURIComponent(documentoRemolque.pathname)}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        console.warn(`Error eliminando blob (${response.status}):`, await response.text())
      }
    } catch (e) {
      console.warn('Fallo al eliminar blob para documento remolque:', e)
    }

    // Marcar como inactivo en la base de datos
    const { error: updateError } = await supabase
      .from('documentos_remolques')
      .update({ 
        activo: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', documentoRemolque.id)

    if (updateError) {
      throw new Error(`Error marcando documento como inactivo: ${updateError.message}`)
    }

    console.log("Documento de remolque eliminado exitosamente")
  } catch (error) {
    console.error("Error eliminando documento de remolque:", error)
    throw error
  }
}

export async function listarDocumentosRemolque(remolqueId: string) {
  try {
    const { data, error } = await supabase
      .from('documentos_remolques')
      .select('*')
      .eq('remolque_id', remolqueId)
      .eq('activo', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error listando documentos de remolque: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Error listando documentos de remolque:", error)
    throw error
  }
}

// ===== FUNCIONES PARA DOCUMENTOS DE EMBARQUES =====

export async function subirDocumentoEmbarque(
  embarqueId: string,
  file: File,
): Promise<{ url: string; pathname: string }> {
  try {
    console.log("Subiendo documento de embarque:", { embarqueId, fileName: file.name })

    // Validar archivo
    if (!file) {
      throw new Error("No se proporcionó archivo")
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("El archivo es muy grande. Tamaño máximo: 10MB")
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
      throw new Error("Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, BMP, WebP) y PDFs")
    }

    // Crear nombre único para el archivo
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const nombreArchivo = `embarques/${embarqueId}/documentos/${timestamp}.${extension}`

    // Usar la API route para subir el archivo
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", nombreArchivo)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const raw = await response.text()
      try {
        const errorData = JSON.parse(raw)
        if (errorData?.code === "BLOB_QUOTA_EXCEEDED" || response.status === 507) {
          throw new Error(
            errorData?.error ||
              "El almacenamiento está lleno. Avise al administrador para liberar espacio."
          )
        }
        throw new Error(errorData?.error || "Error al subir archivo")
      } catch {
        throw new Error("Error al subir archivo")
      }
    }

    const result = await response.json()
    console.log("Documento de embarque subido exitosamente:", result.url)

    return {
      url: result.url,
      pathname: result.pathname,
    }
  } catch (error: any) {
    console.error("❌ [subirDocumentoEmbarque] Error subiendo documento de embarque:", {
      error,
      message: error?.message,
      stack: error?.stack,
      embarqueId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })
    
    const errorMessage = error?.message || 
                        error?.error_description || 
                        error?.details || 
                        (typeof error === 'string' ? error : 'Error desconocido al subir documento de embarque')
                        
    throw new Error(errorMessage)
  }
}

export async function eliminarDocumentoEmbarque(pathname: string): Promise<void> {
  try {
    console.log("Eliminando documento de embarque:", pathname)
    
    const response = await fetch(`/api/delete-blob?pathname=${encodeURIComponent(pathname)}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      console.warn(`Error eliminando blob (${response.status}):`, await response.text())
    }

    console.log("Documento de embarque eliminado exitosamente")
  } catch (error) {
    console.error("Error eliminando documento de embarque:", error)
    throw error
  }
}

export async function eliminarDocumentoEmbarqueCompleto(documentoId: string): Promise<void> {
  try {
    console.log("🗑️ [eliminarDocumentoEmbarqueCompleto] Eliminando documento ID:", documentoId)
    
    // Primero obtener información del documento
    const { data: documento, error: fetchError } = await supabase
      .from('documentos_embarques')
      .select('*')
      .eq('id', documentoId)
      .single()

    if (fetchError) {
      console.error("❌ [eliminarDocumentoEmbarqueCompleto] Error obteniendo documento:", fetchError)
      throw new Error(`Error obteniendo documento: ${fetchError.message}`)
    }

    if (!documento) {
      throw new Error("Documento no encontrado")
    }

    console.log("📄 [eliminarDocumentoEmbarqueCompleto] Documento encontrado:", {
      id: documento.id,
      nombre_archivo: documento.nombre_archivo,
      pathname: documento.pathname
    })

    // Eliminar de Vercel Blob si tiene pathname
    if (documento.pathname) {
      try {
        await eliminarDocumentoEmbarque(documento.pathname)
        console.log("✅ [eliminarDocumentoEmbarqueCompleto] Archivo eliminar de Vercel Blob")
      } catch (blobError) {
        console.warn("⚠️ [eliminarDocumentoEmbarqueCompleto] Error eliminando de blob (continuando):", blobError)
      }
    }

    // Eliminar registro de la base de datos
    const { error: deleteError } = await supabase
      .from('documentos_embarques')
      .delete()
      .eq('id', documentoId)

    if (deleteError) {
      console.error("❌ [eliminarDocumentoEmbarqueCompleto] Error eliminando de base de datos:", deleteError)
      throw new Error(`Error eliminando documento de base de datos: ${deleteError.message}`)
    }

    console.log("✅ [eliminarDocumentoEmbarqueCompleto] Documento eliminado completamente")
  } catch (error) {
    console.error("❌ [eliminarDocumentoEmbarqueCompleto] Error general:", error)
    throw error
  }
}

export async function listarDocumentosEmbarque(embarqueId: string) {
  try {
    console.log("📂 [listarDocumentosEmbarque] Iniciando consulta para embarque:", embarqueId)
    console.log("📂 [listarDocumentosEmbarque] Tipo de embarqueId:", typeof embarqueId)
    
    const { data, error } = await supabase
      .from('documentos_embarques')
      .select('*')
      .eq('embarque_id', embarqueId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("❌ [listarDocumentosEmbarque] Error de Supabase:", error)
      throw new Error(`Error listando documentos de embarque: ${error.message}`)
    }

    console.log("✅ [listarDocumentosEmbarque] Documentos encontrados:", {
      cantidad: data?.length || 0,
      embarqueId: embarqueId,
      documentos: data
    })
    
    // Log detallado de cada documento
    if (data && data.length > 0) {
      data.forEach((doc, index) => {
        console.log(`📄 [listarDocumentosEmbarque] Documento ${index + 1}:`, {
          id: doc.id,
          nombre_archivo: doc.nombre_archivo,
          url: doc.url,
          pathname: doc.pathname,
          embarque_id: doc.embarque_id,
          created_at: doc.created_at
        })
      })
    }
    
    return data || []
  } catch (error) {
    console.error("❌ [listarDocumentosEmbarque] Error general:", error)
    throw error
  }
}

