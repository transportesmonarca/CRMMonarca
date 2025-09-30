// Investigar estructura de direcciones múltiples en BD
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function investigarDirecciones() {
  try {
    console.log('🔍 Investigando cómo se guardan las direcciones múltiples...\n')
    
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('folio, estado, observaciones, direccion_recolecta, direccion_entrega, origen, destino')
      .in('estado', ['listo-para-asignar', 'asignado'])
      .limit(5)
    
    if (error) throw error
    
    console.log(`📊 Encontrados ${embarques.length} embarques en estados listo-para-asignar/asignado\n`)
    
    for (const embarque of embarques) {
      console.log(`📦 FOLIO: ${embarque.folio} | ESTADO: ${embarque.estado}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // Verificar campos JSON - NO EXISTEN EN ESTA TABLA
      let tieneJSON = false
      console.log('📍 Los campos direcciones_recolecta y direcciones_entrega NO EXISTEN en la tabla')
      
      // Verificar observaciones
      let tieneObservaciones = false
      if (embarque.observaciones) {
        if (embarque.observaciones.includes('DIRECCIONES MÚLTIPLES')) {
          console.log('📝 ✅ Observaciones contienen marcador de múltiples direcciones')
          console.log('📄 Fragmento:', embarque.observaciones.substring(0, 100) + '...')
          tieneObservaciones = true
        } else {
          console.log('📝 Observaciones presentes pero sin marcador múltiples direcciones')
        }
      }
      
      // Verificar campos legacy
      let tieneLegacy = false
      console.log('🏠 Campos legacy:')
      if (embarque.direccion_recolecta) {
        console.log('  ✅ direccion_recolecta:', embarque.direccion_recolecta)
        tieneLegacy = true
      }
      if (embarque.direccion_entrega) {
        console.log('  ✅ direccion_entrega:', embarque.direccion_entrega)
        tieneLegacy = true
      }
      if (embarque.origen) {
        console.log('  ✅ origen:', embarque.origen)
        tieneLegacy = true
      }
      if (embarque.destino) {
        console.log('  ✅ destino:', embarque.destino)
        tieneLegacy = true
      }
      
      // Resumen
      console.log('\\n📋 RESUMEN:')
      console.log(`  JSON: ${tieneJSON ? '✅' : '❌'}`)
      console.log(`  Observaciones: ${tieneObservaciones ? '✅' : '❌'}`)
      console.log(`  Legacy: ${tieneLegacy ? '✅' : '❌'}`)
      
      console.log('\\n' + '='.repeat(60) + '\\n')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

investigarDirecciones()