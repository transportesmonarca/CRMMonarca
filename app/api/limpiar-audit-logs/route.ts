import { NextRequest, NextResponse } from "next/server"
import { limpiarAuditLogsAntiguos } from "@/lib/audit"
import { isAuthenticated, hasRole } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    if (!isAuthenticated()) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Verificar que sea admin (opcional, dependiendo de permisos)
    if (!hasRole("admin")) {
      return NextResponse.json(
        { error: "Permisos insuficientes" },
        { status: 403 }
      )
    }

    // Obtener parámetros del body (opcional, por defecto 6 meses)
    const body = await request.json().catch(() => ({}))
    const mesesRetencion = body.mesesRetencion || 6

    // Ejecutar limpieza
    const resultado = await limpiarAuditLogsAntiguos(mesesRetencion)

    if (resultado.success) {
      // Obtener estadísticas después de la limpieza
      const { count: registrosRestantes } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })

      return NextResponse.json({
        message: "Limpieza completada exitosamente",
        eliminados: resultado.eliminados,
        registrosRestantes: registrosRestantes || 0,
        mesesRetencion
      })
    } else {
      return NextResponse.json(
        { error: resultado.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error en API de limpieza de audit logs:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// También permitir GET para verificar estado (opcional)
export async function GET() {
  try {
    if (!isAuthenticated()) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Obtener estadísticas actuales
    const { supabase } = await import("@/lib/supabase")
    const { count: totalRegistros } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - 6)
    const { count: registrosAntiguos } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .lt("fecha_creacion", fechaLimite.toISOString())

    return NextResponse.json({
      totalRegistros: totalRegistros || 0,
      registrosAntiguos: registrosAntiguos || 0,
      registrosActivos: (totalRegistros || 0) - (registrosAntiguos || 0)
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
