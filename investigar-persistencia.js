const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function investigarPersistencia() {
  try {
    console.log('🔍 Investigando persistencia de cambios de estado...');
    
    // 1. Verificar el embarque de prueba que creamos
    const folioTest = 'FLOW-1758831360353';
    
    console.log(`\n📋 1. Verificando embarque ${folioTest} en tabla legacy:`);
    
    const { data: legacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select('id, folio, estado, motivo_cancelacion, fecha_cancelacion, cancelado_por, observaciones')
      .eq('folio', folioTest)
      .single();
    
    if (errorLegacy) {
      console.log(`❌ Error o no encontrado en legacy: ${errorLegacy.message}`);
    } else {
      console.log(`✅ LEGACY encontrado:`);
      console.log(`   Estado: '${legacy.estado}'`);
      console.log(`   Motivo cancelación: '${legacy.motivo_cancelacion || 'N/A'}'`);
      console.log(`   Fecha cancelación: '${legacy.fecha_cancelacion || 'N/A'}'`);
      console.log(`   Cancelado por: '${legacy.cancelado_por || 'N/A'}'`);
    }
    
    // 2. Verificar si existe en tabla normalizada
    if (legacy) {
      console.log(`\n📋 2. Verificando mismo embarque en tabla normalizada:`);
      
      const { data: normalizado, error: errorNorm } = await supabase
        .from('embarques_nuevo')
        .select(`
          id,
          estado:embarques_estado(*)
        `)
        .eq('id', legacy.id)
        .single();
      
      if (errorNorm) {
        console.log(`❌ No encontrado en normalizada: ${errorNorm.message}`);
      } else {
        const estadoData = normalizado.estado?.[0] || {};
        
        // Derivar estado usando la lógica del frontend
        let estadoDerivado;
        if (estadoData.fecha_cancelacion) estadoDerivado = 'cancelado';
        else if (estadoData.fecha_archivado) estadoDerivado = 'archivado';
        else if (estadoData.fecha_finalizacion) estadoDerivado = 'finalizado';
        else if (estadoData.fecha_pago && estadoData.pagado) estadoDerivado = 'entregado';
        else estadoDerivado = 'creado';
        
        console.log(`✅ NORMALIZADO encontrado:`);
        console.log(`   Estado derivado: '${estadoDerivado}'`);
        console.log(`   Fecha cancelación: '${estadoData.fecha_cancelacion || 'N/A'}'`);
        console.log(`   Cancelado por: '${estadoData.cancelado_por || 'N/A'}'`);
        console.log(`   Motivo: '${estadoData.motivo_cancelacion || 'N/A'}'`);
        
        // Verificar conflicto
        if (legacy.estado !== estadoDerivado) {
          console.log(`\n🚨 CONFLICTO DETECTADO:`);
          console.log(`   Legacy: '${legacy.estado}'`);
          console.log(`   Normalizado: '${estadoDerivado}'`);
          console.log(`   🎯 El frontend priorizará: '${estadoDerivado}' (normalizado)`);
        } else {
          console.log(`\n✅ Estados consistentes entre ambas tablas`);
        }
      }
    }
    
    // 3. Simular lo que hace loadEmbarques() - buscar embarques recientes
    console.log(`\n📋 3. Simulando carga completa (como loadEmbarques):`);
    
    const { data: todosLegacy } = await supabase
      .from('embarques')
      .select('folio, estado')
      .order('fecha_creacion', { ascending: false })
      .limit(10);
    
    const { data: todosNormalizados } = await supabase
      .from('embarques_nuevo')
      .select(`
        id,
        estado:embarques_estado(*)
      `)
      .limit(10);
    
    console.log(`Legacy: ${todosLegacy?.length || 0} embarques`);
    console.log(`Normalizados: ${todosNormalizados?.length || 0} embarques`);
    
    // Mostrar estados de embarques recientes
    console.log(`\n📊 Estados de embarques recientes (legacy):`);
    todosLegacy?.slice(0, 5).forEach(e => {
      console.log(`   ${e.folio}: '${e.estado}'`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

investigarPersistencia();