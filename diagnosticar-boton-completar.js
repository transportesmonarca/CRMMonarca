// 🔍 Script para diagnosticar el problema del botón "Completar y Enviar"
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diagnosticar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.log('❌ Variables de entorno de Supabase no configuradas');
    return;
  }

  const supabase = createClient(url, key);

  console.log('🔍 DIAGNÓSTICO: Problema botón "Completar y Enviar"\n');

  // 1. Verificar columnas existen
  console.log('1️⃣ Verificando estructura de tabla embarques...');
  try {
    const { data: sample } = await supabase
      .from('embarques')
      .select('*')
      .limit(1);
    
    if (sample && sample[0]) {
      const columns = Object.keys(sample[0]);
      const fechaCols = columns.filter(c => c.includes('fecha'));
      console.log('   ✅ Columnas de fecha encontradas:', fechaCols.join(', '));
      
      if (!fechaCols.includes('fecha_completado')) {
        console.log('   ❌ ERROR: fecha_completado NO existe en la tabla');
        return;
      }
    }
  } catch (error) {
    console.log('   ❌ Error verificando estructura:', error.message);
    return;
  }

  // 2. Buscar un embarque de prueba
  console.log('\n2️⃣ Buscando embarque de prueba...');
  const { data: embarques, error } = await supabase
    .from('embarques')
    .select('id, folio, estado, fecha_completado, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('   ❌ Error:', error.message);
    return;
  }

  console.log('   📦 Últimos 5 embarques:');
  embarques?.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.folio}: estado='${e.estado}', fecha_completado=${e.fecha_completado || 'null'}`);
  });

  // 3. Usar embarque existente para prueba
  const embarqueExistente = embarques.find(e => e.estado === 'listo-para-asignar');
  if (!embarqueExistente) {
    console.log('   ⚠️ No hay embarques "listo-para-asignar" para probar, usando el primero disponible');
  }
  
  const embarquePrueba = embarqueExistente || embarques[0];
  if (!embarquePrueba) {
    console.log('   ❌ No hay embarques disponibles para probar');
    return;
  }

  console.log(`\n3️⃣ Usando embarque existente para prueba: ${embarquePrueba.folio}...`);
  console.log('   ✅ Embarque seleccionado:', embarquePrueba.folio, 'ID:', embarquePrueba.id);

  // 4. Simular el API call de "Completar y Enviar"
  console.log('\n4️⃣ Simulando API call /api/embarques/estado...');
  
  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('embarques')
    .update({
      estado: 'listo-para-asignar',
      fecha_completado: nowIso,
      updated_at: nowIso
    })
    .eq('id', embarquePrueba.id);

  if (updateError) {
    console.log('   ❌ Error actualizando:', updateError.message);
    return;
  }

  console.log('   ✅ Actualización exitosa');

  // 5. Verificar el resultado
  console.log('\n5️⃣ Verificando resultado...');
  
  const { data: verificacion } = await supabase
    .from('embarques')
    .select('id, folio, estado, fecha_completado, updated_at')
    .eq('id', embarquePrueba.id)
    .single();

  console.log('   📋 Estado después de actualizar:');
  console.log(`      Folio: ${verificacion.folio}`);
  console.log(`      Estado: ${verificacion.estado}`);
  console.log(`      fecha_completado: ${verificacion.fecha_completado}`);
  console.log(`      updated_at: ${verificacion.updated_at}`);

  // 6. Simular la lógica del frontend para mapear estado
  console.log('\n6️⃣ Simulando lógica de mapeo del frontend...');
  
  let estadoMapeado = 'creado'; // default
  
  if (verificacion.fecha_completado) {
    estadoMapeado = 'listo-para-asignar';
    console.log('   ✅ Mapeado a "listo-para-asignar" por fecha_completado');
  } else if (verificacion.estado === 'listo-para-asignar') {
    estadoMapeado = 'listo-para-asignar';
    console.log('   ✅ Mapeado a "listo-para-asignar" por campo estado');
  } else {
    console.log(`   ⚠️ Se mantiene como "${verificacion.estado}"`);
  }

  // 7. Resultado final
  console.log('\n📊 RESULTADO ESPERADO:');
  if (estadoMapeado === 'listo-para-asignar') {
    console.log('   ✅ Debería mostrar botón "Archivar" (NO "Completar y Enviar")');
  } else {
    console.log('   ❌ Mostraría botón "Completar y Enviar" (PROBLEMA)');
  }

  // 8. No limpiar (usamos embarque existente)
  console.log('\n✨ Diagnóstico completado - No se necesita limpiar');
}

diagnosticar().catch(console.error);