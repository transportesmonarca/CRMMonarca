const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function corregirTIM040Simple() {
  try {
    console.log('🔧 Corrigiendo TIM-2509-040 en tabla embarques...\n');
    
    // Verificar primero con campos básicos
    console.log('📋 Estado actual:');
    const { data: before, error: errorBefore } = await supabase
      .from('embarques')
      .select('folio, estado, estado_facturacion')
      .eq('folio', 'TIM-2509-040');
      
    if (errorBefore) {
      console.error('❌ Error al consultar estado actual:', errorBefore);
      return;
    }
    
    if (before.length === 0) {
      console.log('⚠️ No se encontró TIM-2509-040 en tabla embarques');
      
      // Buscar en todas las tablas para ver dónde está
      console.log('\n🔍 Buscando en embarques_completa para referencia...');
      const { data: inView, error: errorView } = await supabase
        .from('embarques_completa')
        .select('folio, estado, estado_facturacion')
        .eq('folio', 'TIM-2509-040');
        
      if (errorView) {
        console.error('❌ Error en vista:', errorView);
        return;
      }
      
      if (inView.length > 0) {
        console.log('📍 Encontrado en vista embarques_completa:');
        console.log(`   Folio: ${inView[0].folio}`);
        console.log(`   Estado: ${inView[0].estado}`);
        console.log(`   Facturación: ${inView[0].estado_facturacion || 'NULL'}`);
        console.log('\n⚠️ El embarque existe en la vista pero no en la tabla base');
        console.log('💡 Esto sugiere que está en una tabla relacionada o es un problema de permisos');
      }
      
      return;
    }
    
    console.log(`   Folio: ${before[0].folio}`);
    console.log(`   Estado: ${before[0].estado}`);
    console.log(`   Facturación: ${before[0].estado_facturacion || 'NULL'}`);
    
    // Aplicar corrección solo si encontramos el registro
    if (before[0].estado === 'pendiente' || before[0].estado_facturacion) {
      console.log('\n🔧 Aplicando corrección...');
      
      const updateData = {};
      if (before[0].estado === 'pendiente') {
        updateData.estado = 'creado';
      }
      if (before[0].estado_facturacion) {
        updateData.estado_facturacion = null;
      }
      
      const { data, error } = await supabase
        .from('embarques')
        .update(updateData)
        .eq('folio', 'TIM-2509-040')
        .select();
        
      if (error) {
        console.error('❌ Error al corregir:', error);
        return;
      }
      
      console.log('✅ Corrección aplicada exitosamente');
      if (updateData.estado) {
        console.log(`   Estado: "${before[0].estado}" → "${updateData.estado}"`);
      }
      if (updateData.estado_facturacion !== undefined) {
        console.log(`   Facturación: "${before[0].estado_facturacion}" → NULL`);
      }
      
    } else {
      console.log('\n✅ El embarque ya tiene estados correctos');
    }
    
    // Verificar resultado final
    console.log('\n📋 Estado final:');
    const { data: after, error: errorAfter } = await supabase
      .from('embarques')
      .select('folio, estado, estado_facturacion')
      .eq('folio', 'TIM-2509-040');
      
    if (errorAfter) {
      console.error('❌ Error al verificar:', errorAfter);
      return;
    }
    
    if (after.length > 0) {
      console.log(`   Folio: ${after[0].folio}`);
      console.log(`   Estado: ${after[0].estado} ✅`);
      console.log(`   Facturación: ${after[0].estado_facturacion || 'NULL'} ✅`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

corregirTIM040Simple();