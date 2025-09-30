const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 DIAGNÓSTICO DE LA FUNCIÓN crear_embarque_normalizado')

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Error: Faltan variables de entorno de Supabase')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticar() {
  try {
    console.log('\n1️⃣ VERIFICANDO SI LA FUNCIÓN EXISTE...')
    
    // Verificar si la función existe consultando pg_proc
    const { data: funcionExists, error: errorVerificar } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'crear_embarque_normalizado')
      .eq('routine_type', 'FUNCTION')
    
    if (errorVerificar) {
      console.log('❌ Error verificando función:', errorVerificar)
      return
    }
    
    if (funcionExists && funcionExists.length > 0) {
      console.log('✅ La función crear_embarque_normalizado existe')
    } else {
      console.log('❌ La función crear_embarque_normalizado NO existe')
      console.log('💡 SOLUCIÓN: Ejecuta EJECUTAR-EN-SUPABASE-crear-funcion.sql en Supabase Dashboard')
      return
    }
    
    console.log('\n2️⃣ PROBANDO LLAMADA SIMPLE...')
    
    // Probar con datos mínimos
    const { data: resultado, error: errorLlamada } = await supabase.rpc('crear_embarque_normalizado', {
      p_folio: 'TEST-DIAGNOSTICO-' + Date.now(),
      p_origen: 'Test Origen',
      p_destino: 'Test Destino'
    })
    
    if (errorLlamada) {
      console.log('❌ Error en llamada simple:', errorLlamada)
      console.log('   Code:', errorLlamada.code)
      console.log('   Message:', errorLlamada.message)
      console.log('   Details:', errorLlamada.details)
      console.log('   Hint:', errorLlamada.hint)
    } else {
      console.log('✅ Llamada simple exitosa, ID retornado:', resultado)
      
      // Limpiar el test
      await supabase
        .from('embarques_nuevo')
        .delete()
        .eq('id', resultado)
    }
    
    console.log('\n3️⃣ VERIFICANDO ESTRUCTURA DE TABLAS...')
    
    // Verificar que las tablas existan
    const tablas = ['embarques_nuevo', 'embarques_ubicaciones', 'embarques_financiero', 'embarques_estado', 'embarques_documentos', 'embarques_adicional']
    
    for (const tabla of tablas) {
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Tabla ${tabla} no existe o error:`, error.message)
      } else {
        console.log(`✅ Tabla ${tabla} existe`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

diagnosticar()