const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function sincronizarEstados() {
  try {
    console.log('🔄 Sincronizando estados legacy → normalizado');
    
    const foliosTarget = ['TIM-2509-004', 'TIM-2509-006'];
    
    for (const folio of foliosTarget) {
      console.log(`\n📋 Procesando ${folio}:`);
      
      // 1. Obtener estado de tabla legacy
      const { data: legacy } = await supabase
        .from('embarques')
        .select('id, folio, estado')
        .eq('folio', folio)
        .single();
      
      if (!legacy) {
        console.log(`  ❌ No encontrado en legacy`);
        continue;
      }
      
      console.log(`  ✅ Legacy: estado='${legacy.estado}'`);
      
      // 2. Verificar si existe registro en embarques_estado
      const { data: estadoExistente } = await supabase
        .from('embarques_estado')
        .select('*')
        .eq('embarque_id', legacy.id)
        .single();
      
      if (estadoExistente) {
        console.log(`  📝 Estado existente: '${estadoExistente.estado}'`);
        
        if (estadoExistente.estado !== legacy.estado) {
          // Actualizar estado existente
          const { error } = await supabase
            .from('embarques_estado')
            .update({ 
              estado: legacy.estado,
              updated_at: new Date().toISOString()
            })
            .eq('embarque_id', legacy.id);
          
          if (error) {
            console.error(`  ❌ Error actualizando: ${error.message}`);
          } else {
            console.log(`  ✅ Estado actualizado: '${estadoExistente.estado}' → '${legacy.estado}'`);
          }
        } else {
          console.log(`  ✅ Estado ya correcto`);
        }
      } else {
        // Crear nuevo registro de estado
        const { error } = await supabase
          .from('embarques_estado')
          .insert({
            embarque_id: legacy.id,
            estado: legacy.estado,
            estado_facturacion: 'pendiente_facturacion',
            pagado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error(`  ❌ Error creando estado: ${error.message}`);
        } else {
          console.log(`  ✅ Estado creado: '${legacy.estado}'`);
        }
      }
    }
    
    console.log('\n🎯 Sincronización completada');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

sincronizarEstados();