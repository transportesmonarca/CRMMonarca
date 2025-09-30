const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function sincronizarEstadosCorrectamente() {
  try {
    console.log('🔄 Sincronizando estados: normalizado → legacy');
    
    const embarqueIds = [
      '20fa6c23-9294-448b-bfa2-659c87c91da7', // TIM-2509-004
      '508be320-5f66-48d9-8467-189598c4dffd'  // TIM-2509-006
    ];
    
    for (const embarqueId of embarqueIds) {
      console.log(`\n📋 Procesando ${embarqueId}:`);
      
      // 1. Obtener estado normalizado
      const { data: normalizado } = await supabase
        .from('embarques_nuevo')
        .select(`
          id,
          estado:embarques_estado(*)
        `)
        .eq('id', embarqueId)
        .single();
      
      if (!normalizado || !normalizado.estado?.[0]) {
        console.log(`  ❌ No encontrado estado normalizado`);
        continue;
      }
      
      const estadoData = normalizado.estado[0];
      
      // Derivar estado usando la misma lógica que el frontend
      let estadoNormalizado;
      if (estadoData.fecha_cancelacion) estadoNormalizado = 'cancelado';
      else if (estadoData.fecha_archivado) estadoNormalizado = 'archivado';
      else if (estadoData.fecha_finalizacion) estadoNormalizado = 'finalizado';
      else if (estadoData.fecha_pago && estadoData.pagado) estadoNormalizado = 'entregado';
      else estadoNormalizado = 'creado';
      
      console.log(`  📊 Estado derivado: '${estadoNormalizado}'`);
      
      // 2. Obtener estado legacy actual
      const { data: legacy } = await supabase
        .from('embarques')
        .select('folio, estado')
        .eq('id', embarqueId)
        .single();
      
      if (!legacy) {
        console.log(`  ❌ No encontrado en tabla legacy`);
        continue;
      }
      
      console.log(`  📋 Legacy (${legacy.folio}): '${legacy.estado}' → '${estadoNormalizado}'`);
      
      // 3. Actualizar estado legacy si es diferente
      if (legacy.estado !== estadoNormalizado) {
        const { error } = await supabase
          .from('embarques')
          .update({ estado: estadoNormalizado })
          .eq('id', embarqueId);
        
        if (error) {
          console.error(`  ❌ Error actualizando legacy: ${error.message}`);
        } else {
          console.log(`  ✅ Estado legacy actualizado`);
        }
      } else {
        console.log(`  ✅ Estados ya consistentes`);
      }
    }
    
    console.log('\n🎯 Sincronización completada');
    console.log('🔄 Ahora recarga la página para ver los cambios');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

sincronizarEstadosCorrectamente();