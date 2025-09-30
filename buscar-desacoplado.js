const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function buscarEnTablasDesacopladas() {
  try {
    console.log('🔍 Buscando TIM-2509-040 en tablas del sistema desacoplado...\n');
    
    // Tablas especializadas por estado del sistema desacoplado
    const tablasDesacopladas = [
      'embarques_creados',
      'embarques_asignados', 
      'embarques_en_transito',
      'embarques_finalizados',
      'embarques_cancelados',
      'embarques_archivados',
      'embarques_completados', // Para los que están "completados" pero no asignados
      'embarques_pendientes',  // Para estado "pendiente"
      'registros_embarques',   // Posible tabla general
      'nuevos_embarques',      // Para embarques recién creados
      'embarques_borrador'     // Para borradores o temporales
    ];
    
    for (const tabla of tablasDesacopladas) {
      try {
        console.log(`📋 Buscando en: ${tabla}`);
        const { data, error } = await supabase
          .from(tabla)
          .select('*')
          .eq('folio', 'TIM-2509-040')
          .limit(1);
          
        if (error) {
          console.log(`   ⚪ No existe o error: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`   ✅ ¡ENCONTRADO en ${tabla}!`);
          console.log('   ═══════════════════════════════════════');
          
          const embarque = data[0];
          console.log(`   📋 Datos completos:`);
          Object.keys(embarque).forEach(key => {
            const valor = embarque[key] || 'NULL';
            console.log(`      ${key}: ${valor}`);
          });
          
          // Verificar si necesita corrección
          const necesitaCorreccion = 
            embarque.estado === 'pendiente' || 
            embarque.estado_facturacion === 'pendiente_facturacion';
            
          if (necesitaCorreccion) {
            console.log(`\n   🔧 CORRECCIÓN NECESARIA en tabla ${tabla}:`);
            
            const updateData = {};
            if (embarque.estado === 'pendiente') {
              console.log(`      Estado: "${embarque.estado}" → "creado"`);
              updateData.estado = 'creado';
            }
            if (embarque.estado_facturacion === 'pendiente_facturacion') {
              console.log(`      Facturación: "${embarque.estado_facturacion}" → NULL`);
              updateData.estado_facturacion = null;
            }
            
            // Aplicar corrección
            console.log(`\n   🔧 Aplicando corrección...`);
            const { data: updated, error: updateError } = await supabase
              .from(tabla)
              .update(updateData)
              .eq('folio', 'TIM-2509-040')
              .select();
              
            if (updateError) {
              console.log(`      ❌ Error: ${updateError.message}`);
            } else {
              console.log(`      ✅ Corregido exitosamente en ${tabla}`);
              
              // Mostrar estado final
              if (updated && updated.length > 0) {
                console.log(`   📋 Estado final:`);
                console.log(`      Folio: ${updated[0].folio}`);
                console.log(`      Estado: ${updated[0].estado} ✅`);
                console.log(`      Facturación: ${updated[0].estado_facturacion || 'NULL'} ✅`);
              }
            }
          } else {
            console.log(`   ✅ Estados correctos en ${tabla}`);
          }
          
          return { tabla, embarque };
        } else {
          console.log(`   ⚪ No encontrado en ${tabla}`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
      console.log('');
    }
    
    console.log('❌ No encontrado en las tablas desacopladas conocidas');
    console.log('\n💡 Posibles soluciones:');
    console.log('1. Verificar nombres exactos de las tablas desacopladas');
    console.log('2. El embarque podría estar en localStorage del navegador');
    console.log('3. Revisar la definición de la vista embarques_completa');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

buscarEnTablasDesacopladas();