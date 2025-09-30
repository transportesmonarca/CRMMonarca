const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probarGloboModificado() {
  console.log('🔍 PROBANDO LÓGICA DEL GLOBO "MODIFICADO"');
  console.log('='.repeat(55));

  try {
    // 1. Buscar embarques en estado "creado" (antes de completar y enviar)
    const { data: embarquesCreado, error: errorCreado } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .eq('estado', 'creado')
      .limit(5);

    if (errorCreado) {
      console.error('❌ Error buscando embarques creados:', errorCreado);
      return;
    }

    console.log('📋 EMBARQUES CON ESTADO "CREADO":');
    if (embarquesCreado?.length) {
      embarquesCreado.forEach(e => {
        console.log(`   📦 ${e.folio} (${e.estado})`);
      });
    } else {
      console.log('   ℹ️  No hay embarques con estado "creado"');
    }

    // 2. Buscar embarques "listo-para-asignar" y verificar modificaciones
    const { data: embarquesListos, error: errorListos } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .eq('estado', 'listo-para-asignar')
      .limit(10);

    if (errorListos) {
      console.error('❌ Error buscando embarques listos:', errorListos);
      return;
    }

    console.log('\n📋 EMBARQUES "LISTO-PARA-ASIGNAR" Y SUS MODIFICACIONES:');
    
    for (const embarque of (embarquesListos || [])) {
      // Verificar modificaciones
      const { data: modificaciones, error: errorMod } = await supabase
        .from('embarque_modificaciones')
        .select('id, tipo_modificacion, razon, fecha_modificacion')
        .eq('embarque_id', embarque.id)
        .order('fecha_modificacion', { ascending: false });

      const tieneModificaciones = modificaciones?.some(m => 
        m.tipo_modificacion === 'EDITAR_EMBARQUE' || !m.tipo_modificacion
      );

      const globoIcon = tieneModificaciones ? '🔴' : '⚫';
      console.log(`   ${globoIcon} ${embarque.folio}:`);
      
      if (modificaciones?.length) {
        modificaciones.forEach(mod => {
          const tipo = mod.tipo_modificacion || 'SIN_TIPO';
          const fecha = new Date(mod.fecha_modificacion).toLocaleDateString('es-MX');
          console.log(`      - ${tipo} (${fecha}): ${mod.razon?.substring(0, 30)}...`);
        });
      } else {
        console.log('      - Sin modificaciones registradas');
      }
    }

    // 3. Simular el flujo completo
    console.log('\n🎯 FLUJOS ESPERADOS:');
    console.log('   📝 Crear Embarque → estado "creado" → SIN globo');
    console.log('   ✅ "Completar y Enviar" → estado "listo-para-asignar" → SIN globo');
    console.log('   ✏️  "Editar Embarque" (modal) → tipo_modificacion "EDITAR_EMBARQUE" → CON globo 🔴');

    // 4. Verificar estructura de la tabla
    console.log('\n🔍 VERIFICANDO ESTRUCTURA TABLA embarque_modificaciones:');
    
    const { data: sample, error: sampleError } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('   ⚠️  Error accediendo a tabla de modificaciones:', sampleError.message);
    } else if (sample?.length) {
      const campos = Object.keys(sample[0]);
      console.log('   📊 Campos disponibles:', campos.join(', '));
      
      const tieneTipo = campos.includes('tipo_modificacion');
      console.log(`   🎯 Campo "tipo_modificacion": ${tieneTipo ? '✅ Existe' : '❌ No existe'}`);
      
      if (!tieneTipo) {
        console.log('   💡 Para que funcione correctamente, ejecutar:');
        console.log('       ALTER TABLE embarque_modificaciones ADD COLUMN tipo_modificacion TEXT;');
      }
    } else {
      console.log('   ℹ️  Tabla vacía, no se puede verificar estructura');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function main() {
  await probarGloboModificado();
  
  console.log('\n🚀 PARA PROBAR:');
  console.log('   1. Ir a sección "Crear Embarques"');
  console.log('   2. Buscar embarques con estado "Por completar y enviar"');
  console.log('   3. Usar "Completar y Enviar" → NO debe aparecer globo');
  console.log('   4. Ir a "Asignar Operadores" y usar "Editar Embarque" → SÍ debe aparecer globo');
  
  process.exit(0);
}

main();