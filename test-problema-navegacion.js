// 🔧 Test para reproducir el problema de navegación
// Este script simula el flujo completo del problema reportado

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProblemaNavegacion() {
  console.log('\n🧪 TEST: Problema de navegación - Embarques cancelados vuelven a aparecer');
  console.log('='.repeat(80));
  
  // 1. Verificar estado inicial del embarque de prueba
  console.log('\n📋 1. Estado inicial del embarque de prueba:');
  const { data: embarqueInicial } = await supabase
    .from('embarques')
    .select('folio, estado, fecha_cancelacion, fecha_archivado')
    .eq('folio', 'FLOW-1758831360353')
    .single();
  
  if (!embarqueInicial) {
    console.log('❌ No se encontró el embarque de prueba');
    return;
  }
  
  console.log(`   Folio: ${embarqueInicial.folio}`);
  console.log(`   Estado: ${embarqueInicial.estado}`);
  console.log(`   Fecha cancelación: ${embarqueInicial.fecha_cancelacion}`);
  console.log(`   Fecha archivado: ${embarqueInicial.fecha_archivado}`);
  
  // 2. Simular carga inicial de embarques (como en loadEmbarques)
  console.log('\n📋 2. Simulando carga inicial de embarques:');
  
  const { data: embarquesNormalizados } = await supabase
    .from('embarques_nuevo')
    .select(`
      id, folio, load_number, estado,
      fecha_creacion, fecha_finalizacion, fecha_cancelacion, fecha_archivado,
      direccion_recolecta, direccion_entrega
    `);
  
  const { data: embarquesLegacy } = await supabase
    .from('embarques')
    .select(`
      id, folio, load_number, estado, created_at,
      direccion_recolecta, direccion_entrega
    `);
  
  console.log(`   📊 Embarques normalizados: ${embarquesNormalizados?.length || 0}`);
  console.log(`   📊 Embarques legacy: ${embarquesLegacy?.length || 0}`);
  
  // 3. Simular deduplicación
  console.log('\n📋 3. Simulando proceso de deduplicación:');
  
  const embarquesCombinados = [
    ...(embarquesNormalizados || []).map(e => ({ ...e, _fuente: 'normalizado' })),
    ...(embarquesLegacy || []).map(e => ({ ...e, _fuente: 'legacy' }))
  ];
  
  console.log(`   📊 Total combinados: ${embarquesCombinados.length}`);
  
  // Encontrar nuestro embarque de prueba
  const embarquesPrueba = embarquesCombinados.filter(e => e.folio?.includes('FLOW-1758831360353'));
  console.log(`   🔍 Embarques de prueba encontrados: ${embarquesPrueba.length}`);
  
  embarquesPrueba.forEach((e, index) => {
    console.log(`      ${index + 1}. Fuente: ${e._fuente}, Estado: ${e.estado}, Fecha cancelación: ${e.fecha_cancelacion}`);
  });
  
  // Deduplicación
  const embarquesUnicos = new Map();
  embarquesCombinados.forEach(embarque => {
    const id = embarque.id;
    const existing = embarquesUnicos.get(id);
    
    if (!existing) {
      embarquesUnicos.set(id, embarque);
    } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
      embarquesUnicos.set(id, embarque);
    }
  });
  
  const todosLosEmbarques = Array.from(embarquesUnicos.values());
  const embarqueFinal = todosLosEmbarques.find(e => e.folio?.includes('FLOW-1758831360353'));
  
  console.log(`   📊 Total después de deduplicación: ${todosLosEmbarques.length}`);
  console.log(`   🎯 Embarque final seleccionado:`, {
    folio: embarqueFinal?.folio,
    estado: embarqueFinal?.estado,
    fuente: embarqueFinal?._fuente,
    fecha_cancelacion: embarqueFinal?.fecha_cancelacion
  });
  
  // 4. Simular filtrado
  console.log('\n📋 4. Simulando filtrado con diferentes estados:');
  
  const filtros = ['todos', 'activos', 'cancelado'];
  
  filtros.forEach(filtro => {
    const embarquesFiltrados = todosLosEmbarques.filter(embarque => {
      if (embarque.estado === "archivado") return false;
      
      const coincideEstado =
        filtro === "todos" ||
        embarque.estado === filtro ||
        (filtro === "activos" &&
          embarque.estado !== "cancelado" &&
          embarque.estado !== "archivado" &&
          embarque.estado !== "finalizado");
      
      return coincideEstado;
    });
    
    const embarquePruebaVisible = embarquesFiltrados.find(e => e.folio?.includes('FLOW-1758831360353'));
    
    console.log(`   📊 Filtro "${filtro}": ${embarquesFiltrados.length} embarques total, embarque de prueba ${embarquePruebaVisible ? '✅ VISIBLE' : '❌ OCULTO'}`);
  });
  
  // 5. Análisis del problema
  console.log('\n📋 5. Análisis del problema:');
  
  if (embarqueFinal?.estado === 'cancelado') {
    console.log('   ✅ El embarque tiene estado "cancelado" correctamente');
    console.log('   🔍 Si el usuario no ve el embarque cancelado, posibles causas:');
    console.log('      • El filtro está en "activos" (oculta cancelados)');
    console.log('      • Hay algún reseteo de filtro durante la navegación');
    console.log('      • localStorage del filtro no se está persistiendo');
    console.log('      • Hay una recarga de datos que revierte el estado local');
  } else {
    console.log('   ❌ El embarque NO tiene estado "cancelado"');
    console.log('   🔍 El problema está en la persistencia de datos');
  }
  
  // 6. Verificar localStorage simulation
  console.log('\n📋 6. Simulación de comportamiento de filtro:');
  console.log('   💡 Escenarios posibles:');
  console.log('   • Usuario cancela embarque → filtro "todos" → embarque visible');
  console.log('   • Usuario navega a otra página → filtro se mantiene en localStorage');
  console.log('   • Usuario regresa → si filtro "activos", embarque cancelado oculto');
  console.log('   • Usuario piensa que "volvió a aparecer como activo"');
  
  console.log('\n🎯 CONCLUSIÓN:');
  console.log('   El problema probablemente NO es que el embarque "vuelva a activo"');
  console.log('   sino que el filtro cambia o se resetea durante la navegación.');
  console.log('   Con el logging implementado, podremos confirmar esto.');
}

testProblemaNavegacion().catch(console.error);