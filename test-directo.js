// Prueba directa de la función de limpieza
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function limpiarAuditLogsAntiguosTest(mesesRetencion = 6) {
  try {
    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - mesesRetencion)
    const fechaLimiteISO = fechaLimite.toISOString()

    console.log(`🗓️ Fecha límite para eliminación: ${fechaLimiteISO} (${mesesRetencion} meses atrás)`)

    // Obtener cantidad de registros antes de eliminar
    console.log('📊 Obteniendo conteo antes de la limpieza...')
    const { count: totalAntes, error: countError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("❌ Error obteniendo conteo de audit_logs:", countError)
      return { success: false, error: countError.message, eliminados: 0 }
    }

    console.log(`📊 Total de registros antes: ${totalAntes || 0}`)

    // Verificar cuántos registros serían eliminados
    const { count: aEliminar, error: countEliminarError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .lt("fecha_creacion", fechaLimiteISO)

    if (countEliminarError) {
      console.error("❌ Error contando registros a eliminar:", countEliminarError)
    } else {
      console.log(`🗑️ Registros que serían eliminados: ${aEliminar || 0}`)
    }

    // Eliminar registros antiguos
    console.log('🗑️ Eliminando registros antiguos...')
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .lt("fecha_creacion", fechaLimiteISO)

    if (error) {
      console.error("❌ Error eliminando audit_logs antiguos:", error)
      return { success: false, error: error.message, eliminados: 0 }
    }

    // Obtener cantidad después de eliminar
    const { count: totalDespues, error: countError2 } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })

    if (countError2) {
      console.error("❌ Error obteniendo conteo después de eliminación:", countError2)
      return { success: false, error: countError2.message, eliminados: 0 }
    }

    const eliminados = (totalAntes || 0) - (totalDespues || 0)

    console.log(`✅ Limpieza completada:`)
    console.log(`   • Registros eliminados: ${eliminados}`)
    console.log(`   • Registros restantes: ${totalDespues || 0}`)

    return { success: true, eliminados, error: null }
  } catch (error) {
    console.error("❌ Error en limpieza de audit_logs:", error)
    return { success: false, error: error.message, eliminados: 0 }
  }
}

async function testDirecto() {
  console.log('🧪 Probando función de limpieza directamente...')
  
  try {
    // Primero verificar conexión
    console.log('🔌 Verificando conexión a Supabase...')
    const { data, error } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).limit(1)
    
    if (error) {
      console.error('❌ Error conectando a audit_logs:', error.message)
      if (error.message.includes('does not exist')) {
        console.log('📝 La tabla audit_logs no existe. Puede que necesites crear la tabla primero.')
      }
      return
    }
    
    console.log('✅ Conexión exitosa')
    console.log(`📊 Total de registros en audit_logs: ${data?.count || 0}`)
    
    // Ejecutar limpieza
    const resultado = await limpiarAuditLogsAntiguosTest(6)
    
    if (resultado.success) {
      console.log('🎉 ¡Función de limpieza funcionó correctamente!')
    } else {
      console.log('❌ Función de limpieza falló:', resultado.error)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testDirecto()