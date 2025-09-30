const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function simularCargaPage() {
  try {
    console.log('🧪 Simulando carga de página embarques...');
    
    // Simular exactamente lo que hace loadEmbarques()
    console.log("🔄 Cargando embarques desde tablas legacy Y normalizadas...");
    
    // 1. Cargar embarques LEGACY
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from("embarques")
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*)
      `)
      .order("fecha_creacion", { ascending: false });

    if (errorLegacy) {
      console.error("Error loading embarques legacy:", errorLegacy);
    } else {
      console.log(`✅ Embarques legacy cargados: ${embarquesLegacy?.length || 0}`);
      
      // Verificar los embarques que deberían mostrar "Archivar"
      const listos = embarquesLegacy?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`📊 Embarques con estado 'listo-para-asignar' en legacy: ${listos.length}`);
      
      listos.forEach(embarque => {
        console.log(`  - ${embarque.folio}: estado='${embarque.estado}' (debe mostrar botón Archivar)`);
      });
    }

    // 2. Cargar embarques NORMALIZADOS
    const { data: embarquesNormalizados, error: errorNormalizado } = await supabase
      .from("embarques_nuevo")
      .select(`*`)
      .order("fecha_creacion", { ascending: false });

    if (errorNormalizado) {
      console.error("Error loading embarques normalizados:", errorNormalizado);
    } else {
      console.log(`✅ Embarques normalizados cargados: ${embarquesNormalizados?.length || 0}`);
    }

    // 3. Verificar si hay conflictos o problemas de procesamiento
    console.log('\n🔍 Análisis de estados:');
    
    if (embarquesLegacy && embarquesLegacy.length > 0) {
      const estadosCount = {};
      embarquesLegacy.forEach(e => {
        estadosCount[e.estado] = (estadosCount[e.estado] || 0) + 1;
      });
      
      console.log('Estados encontrados:');
      Object.entries(estadosCount).forEach(([estado, count]) => {
        console.log(`  - ${estado}: ${count} embarque(s)`);
      });
    }

    // 4. Test específico: buscar los folios que sabemos están en listo-para-asignar
    console.log('\n🎯 Verificando folios específicos TIM-2509-004 y TIM-2509-006:');
    
    const folio004 = embarquesLegacy?.find(e => e.folio === 'TIM-2509-004');
    const folio006 = embarquesLegacy?.find(e => e.folio === 'TIM-2509-006');
    
    if (folio004) {
      console.log(`TIM-2509-004: estado='${folio004.estado}' → ${folio004.estado === 'listo-para-asignar' ? '✅ Debe mostrar Archivar' : '❌ Problema detectado'}`);
    } else {
      console.log('TIM-2509-004: ❌ No encontrado en legacy');
    }
    
    if (folio006) {
      console.log(`TIM-2509-006: estado='${folio006.estado}' → ${folio006.estado === 'listo-para-asignar' ? '✅ Debe mostrar Archivar' : '❌ Problema detectado'}`);
    } else {
      console.log('TIM-2509-006: ❌ No encontrado en legacy');  
    }

  } catch (error) {
    console.error('💥 Error en simulación:', error);
  }
}

simularCargaPage();