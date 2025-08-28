import { getCurrentUser } from "./auth"
import { supabase } from "./supabase"

export interface AuditLogEntry {
  id: string
  timestamp: string
  usuario: string
  accion: "CREAR" | "ACTUALIZAR" | "ELIMINAR" | "EXPORTAR" | "LOGIN" | "LOGOUT"
  modulo: string
  detalles: string
  ip?: string
}

// Función optimizada para agregar entradas al audit log
export const agregarAuditLog = (accion: AuditLogEntry["accion"], modulo: string, detalles: string) => {
  try {
    const currentUser = getCurrentUser()

    const fechaISO = new Date().toISOString()
    const usuario = currentUser?.nombre || "Usuario Desconocido"
    const ip = "192.168.1.1" // TODO: en producción obtener IP real del request

    // Intento asíncrono de guardar en Supabase (no bloquea la UI)
    ;(async () => {
      try {
        const { error } = await supabase.from("audit_logs").insert({
          usuario,
          accion,
          modulo,
          detalles,
          ip,
          fecha_creacion: fechaISO,
        })
        if (error) throw error
      } catch (err) {
        // Fallback a localStorage si Supabase falla o no existe la tabla/política
        const nuevaEntradaLocal: AuditLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: fechaISO,
          usuario,
          accion,
          modulo,
          detalles,
          ip,
        }
        try {
          const logsExistentes = JSON.parse(localStorage.getItem("auditLogs") || "[]")
          const logsActualizados = [nuevaEntradaLocal, ...logsExistentes].slice(0, 500)
          localStorage.setItem("auditLogs", JSON.stringify(logsActualizados))
        } catch (lsErr) {
          console.error("Error guardando audit log en localStorage:", lsErr)
        }
      }
    })()
  } catch (error) {
    console.error("Error al registrar audit log:", error)
  }
}

// Función para obtener logs con paginación
export const obtenerAuditLogs = (pagina = 1, limite = 50) => {
  try {
    const logs = JSON.parse(localStorage.getItem("auditLogs") || "[]")
    const inicio = (pagina - 1) * limite
    const fin = inicio + limite

    return {
      logs: logs.slice(inicio, fin),
      total: logs.length,
      pagina,
      totalPaginas: Math.ceil(logs.length / limite),
    }
  } catch (error) {
    console.error("Error al obtener audit logs:", error)
    return { logs: [], total: 0, pagina: 1, totalPaginas: 0 }
  }
}

// Función para limpiar logs antiguos (ejecutar periódicamente)
export const limpiarLogsAntiguos = (diasRetencion = 30) => {
  try {
    const logs = JSON.parse(localStorage.getItem("auditLogs") || "[]")
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion)

    const logsActuales = logs.filter((log: AuditLogEntry) => new Date(log.timestamp) > fechaLimite)

    localStorage.setItem("auditLogs", JSON.stringify(logsActuales))
    return logs.length - logsActuales.length // Retorna cantidad eliminada
  } catch (error) {
    console.error("Error al limpiar logs antiguos:", error)
    return 0
  }
}

// Función para limpiar registros de audit_logs en Supabase (cada 6 meses)
export const limpiarAuditLogsAntiguos = async (mesesRetencion = 6) => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - mesesRetencion)
    const fechaLimiteISO = fechaLimite.toISOString()

    // Obtener cantidad de registros antes de eliminar
    const { count: totalAntes, error: countError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error obteniendo conteo de audit_logs:", countError)
      return { success: false, error: countError.message, eliminados: 0 }
    }

    // Eliminar registros antiguos
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .lt("fecha_creacion", fechaLimiteISO)

    if (error) {
      console.error("Error eliminando audit_logs antiguos:", error)
      return { success: false, error: error.message, eliminados: 0 }
    }

    // Obtener cantidad después de eliminar
    const { count: totalDespues, error: countError2 } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    if (countError2) {
      console.error("Error obteniendo conteo después de eliminación:", countError2)
      return { success: false, error: countError2.message, eliminados: 0 }
    }

    const eliminados = (totalAntes || 0) - (totalDespues || 0)

    // Registrar la limpieza en audit_logs
    const currentUser = getCurrentUser()
    const usuario = currentUser?.nombre || "Sistema"
    const detalles = `Limpieza automática de audit_logs: ${eliminados} registros eliminados (antiguos de ${mesesRetencion} meses)`

    await supabase.from("audit_logs").insert({
      usuario,
      accion: "ELIMINAR",
      modulo: "Sistema",
      detalles,
      ip: "127.0.0.1",
      fecha_creacion: new Date().toISOString(),
    })

    console.log(`Limpieza de audit_logs completada: ${eliminados} registros eliminados`)
    return { success: true, eliminados, error: null }
  } catch (error) {
    console.error("Error en limpieza de audit_logs:", error)
    return { success: false, error: (error as Error).message, eliminados: 0 }
  }
}
