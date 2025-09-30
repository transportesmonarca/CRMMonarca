const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnosticarPriorizacion() {
  try {
    console.log('🔍 Diagnóstico de priorización Legacy vs Normalizado');
    console.log('Folios objetivo: TIM-2509-004, TIM-2509-006');
    
    const foliosTarget = ['TIM-2509-004', 'TIM-2509-006'];
    
    for (const folio of foliosTarget) {
      console.log(`\n📋 Analizando ${folio}:`);
      
      // 1. Buscar en tabla legacy
      const { data: legacy } = await supabase
        .from('embarques')
        .select('id, folio, estado')
        .eq('folio', folio)
        .single();
      
      if (legacy) {
        console.log(`  ✅ LEGACY: id=${legacy.id}, estado='${legacy.estado}'`);
      } else {
        console.log(`  ❌ LEGACY: No encontrado`);
      }
      
      // 2. Buscar en tabla normalizada por ID (si existe)
      if (legacy) {
        const { data: normalizado } = await supabase
          .from('embarques_nuevo')
          .select(`
            id,
            estado:embarques_estado(*)
          `)
          .eq('id', legacy.id)
          .single();
        
        if (normalizado) {
          // Usar la nueva lógica de derivación de estado
          const estadoData = normalizado.estado?.[0] || {};
          let estadoNorm;
          
          // Derivar estado desde fechas (arquitectura normalizada)
          if (estadoData.fecha_cancelacion) estadoNorm = 'cancelado';
          else if (estadoData.fecha_archivado) estadoNorm = 'archivado';
          else if (estadoData.fecha_finalizacion) estadoNorm = 'finalizado';
          else if (estadoData.fecha_pago && estadoData.pagado) estadoNorm = 'entregado';
          else estadoNorm = 'creado';
          
          console.log(`  ✅ NORMALIZADO: id=${normalizado.id}, estado='${estadoNorm}'`);
          console.log(`    📅 Fechas: archivado=${!!estadoData.fecha_archivado}, cancelacion=${!!estadoData.fecha_cancelacion}`);
          
          // Comparar estados
          if (legacy.estado !== estadoNorm) {
            console.log(`  🚨 CONFLICTO DETECTADO:`);
            console.log(`    - Legacy: '${legacy.estado}'`);
            console.log(`    - Normalizado: '${estadoNorm}'`);
            console.log(`    - El sistema priorizará: '${estadoNorm}' (normalizado)`);
          } else {
            console.log(`  ✅ Estados consistentes: '${legacy.estado}'`);
          }
        } else {
          console.log(`  ❌ NORMALIZADO: No existe (se usará legacy)`);
        }
      }
    }
    
    // 3. Test adicional: verificar si hay registros duplicados
    console.log(`\n🔍 Verificando duplicados en embarques_nuevo:`);
    const { data: normalizados } = await supabase
      .from('embarques_nuevo')
      .select('id')
      .in('id', foliosTarget);
    
    console.log(`Embarques encontrados en tabla normalizada: ${normalizados?.length || 0}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

diagnosticarPriorizacion();