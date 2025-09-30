const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function investigarTablasEmbarques() {
  try {
    console.log('🔍 Investigando estructura de tablas de embarques...\n');
    
    // Buscar en múltiples posibles tablas
    const tablasAProbr = [
      'embarques',
      'embarques_temp',
      'embarques_draft', 
      'embarques_pending',
      'embarques_nuevos',
      'crear_embarques',
      'temp_embarques'
    ];
    
    for (const tabla of tablasAProbr) {
      try {
        console.log(`📋 Buscando en tabla: ${tabla}`);
        const { data, error } = await supabase
          .from(tabla)
          .select('folio, estado, estado_facturacion')
          .eq('folio', 'TIM-2509-040')
          .limit(1);
          
        if (error) {
          console.log(`   ❌ Error o no existe: ${error.message}`);
        } else if (data.length > 0) {
          console.log(`   ✅ ENCONTRADO en ${tabla}:`);
          console.log(`      Folio: ${data[0].folio}`);
          console.log(`      Estado: ${data[0].estado}`);
          console.log(`      Facturación: ${data[0].estado_facturacion || 'NULL'}`);
          
          // Si lo encontramos, intentar corregirlo
          console.log(`\n🔧 Intentando corregir en tabla ${tabla}...`);
          
          const updateData = {};
          if (data[0].estado === 'pendiente') {
            updateData.estado = 'creado';
          }
          if (data[0].estado_facturacion) {
            updateData.estado_facturacion = null;
          }
          
          if (Object.keys(updateData).length > 0) {
            const { data: updated, error: updateError } = await supabase
              .from(tabla)
              .update(updateData)
              .eq('folio', 'TIM-2509-040')
              .select();
              
            if (updateError) {
              console.log(`      ❌ Error al actualizar: ${updateError.message}`);
            } else {
              console.log(`      ✅ Corregido exitosamente en ${tabla}`);
              if (updateData.estado) {
                console.log(`         Estado: ${data[0].estado} → ${updateData.estado}`);
              }
              if (updateData.estado_facturacion !== undefined) {
                console.log(`         Facturación: ${data[0].estado_facturacion} → NULL`);
              }
              
              // Verificar corrección
              const { data: verified } = await supabase
                .from(tabla)
                .select('folio, estado, estado_facturacion')
                .eq('folio', 'TIM-2509-040');
                
              if (verified && verified.length > 0) {
                console.log(`      📋 Estado verificado:`);
                console.log(`         Folio: ${verified[0].folio}`);
                console.log(`         Estado: ${verified[0].estado} ✅`);
                console.log(`         Facturación: ${verified[0].estado_facturacion || 'NULL'} ✅`);
              }
            }
          } else {
            console.log(`      ✅ Ya tiene estados correctos en ${tabla}`);
          }
          
          return tabla; // Retornar la tabla donde lo encontramos
        } else {
          console.log(`   ⚪ No encontrado en ${tabla}`);
        }
      } catch (err) {
        console.log(`   ❌ Error accediendo a ${tabla}: ${err.message}`);
      }
      console.log('');
    }
    
    console.log('❌ No se encontró TIM-2509-040 en ninguna tabla base conocida');
    console.log('💡 El registro podría estar en una tabla con nombre diferente');
    console.log('💡 O podría ser parte de un sistema de datos temporal/borrador');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

investigarTablasEmbarques();