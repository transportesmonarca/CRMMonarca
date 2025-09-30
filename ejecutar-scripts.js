const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Error: Faltan variables de entorno de Supabase')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function ejecutarScripts() {
  console.log('🚀 EJECUTANDO SCRIPTS DE MIGRACIÓN\n')
  
  try {
    // PASO 1: Verificar si la función ya existe
    console.log('📋 PASO 1: Verificando función crear_embarque_normalizado...')
    
    const { data: funcionExiste, error: errorVerificar } = await supabase
      .rpc('crear_embarque_normalizado', {
        p_folio: 'TEST-VERIFICACION'
      })
    
    if (errorVerificar) {
      if (errorVerificar.message.includes('function') && errorVerificar.message.includes('does not exist')) {
        console.log('❌ La función crear_embarque_normalizado NO existe')
        console.log('📝 NECESITAS EJECUTAR MANUALMENTE EN SUPABASE:')
        console.log('   1. Ve a Supabase Dashboard → SQL Editor')
        console.log('   2. Copia y ejecuta: EJECUTAR-EN-SUPABASE-crear-funcion.sql')
        console.log('   3. Después ejecuta este script nuevamente')
        return
      } else {
        console.log('❌ Error al verificar función:', errorVerificar.message)
        return
      }
    }
    
    console.log('✅ La función crear_embarque_normalizado existe y funciona')
    
    // PASO 2: Verificar embarques problema
    console.log('\n📋 PASO 2: Verificando embarques TIM-2509-037 y 038...')
    
    const { data: embarquesLegacy } = await supabase
      .from('embarques')
      .select('folio, id')
      .in('folio', ['TIM-2509-037', 'TIM-2509-038'])
    
    const { data: embarquesNormalizados } = await supabase
      .from('embarques_nuevo')
      .select('folio, id')
      .in('folio', ['TIM-2509-037', 'TIM-2509-038'])
    
    console.log(`   • En tabla LEGACY: ${embarquesLegacy?.length || 0}`)
    console.log(`   • En tabla NORMALIZADA: ${embarquesNormalizados?.length || 0}`)
    
    if (embarquesLegacy && embarquesLegacy.length > 0) {
      console.log('\n🔄 PASO 3: Migrando embarques a tablas normalizadas...')
      
      for (const embarque of embarquesLegacy) {
        console.log(`   Migrando ${embarque.folio}...`)
        
        // Obtener datos completos del embarque
        const { data: embarqueCompleto } = await supabase
          .from('embarques')
          .select('*')
          .eq('id', embarque.id)
          .single()
        
        if (embarqueCompleto) {
          // Crear en tablas normalizadas usando la función
          const { data: nuevoId, error: errorMigracion } = await supabase
            .rpc('crear_embarque_normalizado', {
              p_folio: embarqueCompleto.folio,
              p_cliente_id: embarqueCompleto.cliente_id,
              p_tipo_servicio_id: embarqueCompleto.tipo_servicio_id,
              p_contenido: embarqueCompleto.contenido,
              p_origen: embarqueCompleto.origen,
              p_destino: embarqueCompleto.destino,
              p_peso: embarqueCompleto.peso,
              p_load_number: embarqueCompleto.load_number,
              p_direccion_recolecta: embarqueCompleto.direccion_recolecta,
              p_direccion_entrega: embarqueCompleto.direccion_entrega,
              p_fecha_recolecta: embarqueCompleto.fecha_recolecta,
              p_hora_recolecta: embarqueCompleto.hora_recolecta,
              p_fecha_entrega: embarqueCompleto.fecha_entrega,
              p_hora_entrega: embarqueCompleto.hora_entrega,
              p_camion_id: embarqueCompleto.camion_id,
              p_remolque_id: embarqueCompleto.remolque_id,
              p_camion_numero_economico: embarqueCompleto.camion_numero_economico,
              p_camion_placa: embarqueCompleto.camion_placa,
              p_remolque_numero_economico: embarqueCompleto.remolque_numero_economico,
              p_remolque_placa: embarqueCompleto.remolque_placa,
              p_carta_porte: embarqueCompleto.carta_porte,
              p_patente_agente_aduanal: embarqueCompleto.patente_agente_aduanal,
              p_aduana_cruce: embarqueCompleto.aduana_cruce,
              p_dueno_mercancia: embarqueCompleto.dueno_mercancia,
              p_representante_cliente: embarqueCompleto.representante_cliente,
              p_info_representante: embarqueCompleto.info_representante,
              p_observaciones: embarqueCompleto.observaciones
            })
          
          if (errorMigracion) {
            console.log(`   ❌ Error migrando ${embarque.folio}:`, errorMigracion.message)
          } else {
            console.log(`   ✅ ${embarque.folio} migrado exitosamente`)
            
            // Eliminar de tabla legacy
            await supabase
              .from('embarques')
              .delete()
              .eq('id', embarque.id)
            
            console.log(`   🗑️  ${embarque.folio} eliminado de tabla legacy`)
          }
        }
      }
    } else {
      console.log('✅ No hay embarques para migrar')
    }
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA')
    console.log('📊 Ahora puedes crear nuevos embarques y se guardarán en las tablas normalizadas')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

ejecutarScripts()