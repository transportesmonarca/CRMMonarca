const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarEmbarque039() {
  console.log('🔍 VERIFICANDO EMBARQUE TIM-2509-039')
  
  try {
    // Buscar en tabla legacy
    const { data: embarqueLegacy } = await supabase
      .from('embarques')
      .select('folio, id')
      .eq('folio', 'TIM-2509-039')
    
    // Buscar en tabla normalizada
    const { data: embarqueNormalizado } = await supabase
      .from('embarques_nuevo')
      .select('folio, id')
      .eq('folio', 'TIM-2509-039')
    
    console.log('📊 RESULTADOS:')
    console.log(`   • En tabla LEGACY (embarques): ${embarqueLegacy?.length || 0}`)
    console.log(`   • En tabla NORMALIZADA (embarques_nuevo): ${embarqueNormalizado?.length || 0}`)
    
    if (embarqueNormalizado && embarqueNormalizado.length > 0) {
      console.log('✅ TIM-2509-039 existe en tablas normalizadas')
      console.log('   ID:', embarqueNormalizado[0].id)
      
      // Verificar en todas las tablas relacionadas
      const tablas = [
        'embarques_ubicaciones',
        'embarques_financiero', 
        'embarques_estado',
        'embarques_documentos',
        'embarques_adicional'
      ]
      
      for (const tabla of tablas) {
        const { data } = await supabase
          .from(tabla)
          .select('*')
          .eq('embarque_id', embarqueNormalizado[0].id)
        
        console.log(`   • ${tabla}: ${data?.length || 0} registros`)
      }
    } else {
      console.log('❌ TIM-2509-039 NO existe en tablas normalizadas')
    }
    
    if (embarqueLegacy && embarqueLegacy.length > 0) {
      console.log('⚠️  TIM-2509-039 existe en tabla legacy')
    }
    
    console.log('\n💡 PROBLEMA IDENTIFICADO:')
    console.log('   La interfaz sigue leyendo de la tabla legacy "embarques"')
    console.log('   Pero los nuevos embarques se crean en "embarques_nuevo"')
    console.log('   SOLUCIÓN: Actualizar la interfaz para leer de tablas normalizadas')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Llamada directa sin async wrapper
verificarEmbarque039().then(() => {
  console.log('✅ Verificación completada')
}).catch(err => {
  console.error('❌ Error en verificación:', err)
})