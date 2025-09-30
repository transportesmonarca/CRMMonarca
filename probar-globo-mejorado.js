const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probarGloboMejorado() {
  console.log('🧪 PRUEBA: COMPORTAMIENTO GLOBO "MODIFICADO" MEJORADO');
  console.log('='.repeat(65));

  try {
    // 1. Simular la nueva función verificarModificacion
    const verificarModificacion = async (embarqueId) => {
      const { data, error } = await supabase
        .from("embarque_modificaciones")
        .select("id, tipo_modificacion, razon")
        .eq("embarque_id", embarqueId)
        .limit(1);

      if (error || !data?.length) return false;

      // Solo considerar como "modificado" si hay registros del tipo "EDITAR_EMBARQUE"
      const modificacionReal = data.some(registro => 
        registro.tipo_modificacion === "EDITAR_EMBARQUE" ||
        !registro.tipo_modificacion // Compatibilidad con registros antiguos
      );
      return modificacionReal;
    };

    // 2. Obtener embarques para probar
    const { data: embarques, error: embarquesError } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .in('estado', ['listo-para-asignar', 'asignado'])
      .order('created_at', { ascending: false })
      .limit(15);

    if (embarquesError) {
      console.error('❌ Error obteniendo embarques:', embarquesError);
      return;
    }

    console.log('📋 ANÁLISIS DEL COMPORTAMIENTO:');
    console.log('   (🔴 = CON globo modificado, ⚫ = SIN globo)\n');

    for (const embarque of (embarques || [])) {
      const tieneModificacion = await verificarModificacion(embarque.id);
      const globo = tieneModificacion ? '🔴' : '⚫';
      
      console.log(`${globo} ${embarque.folio} (${embarque.estado})`);
      
      // Mostrar detalles de las modificaciones
      const { data: mods } = await supabase
        .from('embarque_modificaciones')
        .select('tipo_modificacion, razon, fecha_modificacion')
        .eq('embarque_id', embarque.id)
        .order('fecha_modificacion', { ascending: false });

      if (mods?.length) {
        mods.forEach(mod => {
          const tipo = mod.tipo_modificacion || 'LEGACY';
          const fecha = new Date(mod.fecha_modificacion).toLocaleDateString('es-MX');
          const razon = (mod.razon || '').substring(0, 40);
          console.log(`     - ${tipo} (${fecha}): ${razon}...`);
        });
      }
    }

    // 3. Estadísticas generales
    console.log('\n📊 ESTADÍSTICAS:');
    
    const { data: stats } = await supabase
      .from('embarque_modificaciones')
      .select('tipo_modificacion');

    if (stats) {
      const porTipo = stats.reduce((acc, item) => {
        const tipo = item.tipo_modificacion || 'SIN_TIPO';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});

      Object.entries(porTipo).forEach(([tipo, count]) => {
        console.log(`   ${tipo}: ${count} registros`);
      });
    }

    // 4. Verificar estructura actualizada
    console.log('\n🔍 VERIFICANDO ESTRUCTURA ACTUALIZADA:');
    const { data: sample } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .limit(1);

    if (sample?.length) {
      const campos = Object.keys(sample[0]);
      const tieneTipo = campos.includes('tipo_modificacion');
      console.log(`   Campo "tipo_modificacion": ${tieneTipo ? '✅' : '❌'}`);
    }

    console.log('\n🎯 COMPORTAMIENTO ESPERADO:');
    console.log('   📝 Embarques creados vía modal "Nuevo Embarque" → ⚫ Sin globo');
    console.log('   ✅ Después de "Completar y Enviar" → ⚫ Sin globo');
    console.log('   ✏️  Después de "Editar Embarque" (modal) → 🔴 Con globo');
    console.log('   🔄 Después de asignar operador/camión → ⚫ Sin globo (no es modificación)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  await probarGloboMejorado();
  
  console.log('\n🚀 PASOS PARA COMPLETAR:');
  console.log('   1. Ejecutar mejora-globo-modificado.sql en Supabase');
  console.log('   2. Reiniciar la aplicación para aplicar cambios');
  console.log('   3. Probar flujos:');
  console.log('      a) "Completar y Enviar" → Sin globo ✅');
  console.log('      b) "Editar Embarque" → Con globo 🔴');
  
  process.exit(0);
}

main();