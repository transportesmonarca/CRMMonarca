import { NextRequest, NextResponse } from "next/server"
import { limpiarAuditLogsAntiguos } from "@/lib/audit"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Nota: Temporalmente removemos la verificación de autenticación para diagnosticar
    // En producción se debe implementar autenticación del lado del servidor
    console.log("📋 Iniciando limpieza de audit logs...")

    // Obtener parámetros del body (opcional, por defecto 6 meses)
    const body = await request.json().catch(() => ({}))
    const mesesRetencion = body.mesesRetencion || 6

    console.log(`🗓️ Limpiando logs con más de ${mesesRetencion} meses`)

    // Ejecutar limpieza
    const resultado = await limpiarAuditLogsAntiguos(mesesRetencion)

    if (resultado.success) {
      // Obtener estadísticas después de la limpieza
      const { count: registrosRestantes } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })

      console.log(`✅ Limpieza completada: ${resultado.eliminados} eliminados, ${registrosRestantes || 0} restantes`)

      return NextResponse.json({
        message: "Limpieza completada exitosamente",
        eliminados: resultado.eliminados,
        registrosRestantes: registrosRestantes || 0,
        mesesRetencion
      })
    } else {
      console.error("❌ Error en limpieza:", resultado.error)
      return NextResponse.json(
        { error: resultado.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("❌ Error en API de limpieza de audit logs:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// También permitir GET para verificar estado (opcional)
export async function GET() {
  try {
    console.log("📊 Obteniendo estadísticas de audit logs...")

    // Obtener estadísticas actuales
    const { count: totalRegistros } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - 6)
    const { count: registrosAntiguos } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .lt("fecha_creacion", fechaLimite.toISOString())

    const stats = {
      totalRegistros: totalRegistros || 0,
      registrosAntiguos: registrosAntiguos || 0,
      registrosActivos: (totalRegistros || 0) - (registrosAntiguos || 0)
    }

    console.log("📊 Estadísticas:", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
