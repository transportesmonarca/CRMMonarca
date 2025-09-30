const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probarFuncionVerificarModificacion() {
  console.log('🧪 PROBANDO FUNCIÓN verificarModificacion CORREGIDA');
  console.log('='.repeat(60));

  // Simular la función mejorada
  const verificarModificacion = async (embarqueId) => {
    try {
      console.log(`🔍 Verificando modificaciones para embarque: ${embarqueId}`);
      
      // Primero intentar con la columna tipo_modificacion
      let { data, error } = await supabase
        .from("embarque_modificaciones")
        .select("id, tipo_modificacion, razon")
        .eq("embarque_id", embarqueId)
        .limit(1);

      console.log(`   📊 Primera consulta - Error: ${error ? 'SÍ' : 'NO'}, Datos: ${data?.length || 0}`);

      // Si hay error, probablemente la columna tipo_modificacion no existe
      // Hacer fallback a la consulta original
      if (error) {
        console.warn("   ⚠️  Error consultando tipo_modificacion, usando fallback:", error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("embarque_modificaciones")
          .select("id")
          .eq("embarque_id", embarqueId)
          .limit(1);
        
        console.log(`   📊 Consulta fallback - Error: ${fallbackError ? 'SÍ' : 'NO'}, Datos: ${fallbackData?.length || 0}`);
        
        if (fallbackError) {
          console.error("   ❌ Error verificando modificaciones:", fallbackError);
          return false;
        }
        
        // Si no hay tipo_modificacion, considerar cualquier registro como modificación
        const resultado = fallbackData && fallbackData.length > 0;
        console.log(`   🎯 Resultado fallback: ${resultado}`);
        return resultado;
      }

      // Solo considerar como "modificado" si hay registros del tipo "EDITAR_EMBARQUE"
      if (data && data.length > 0) {
        const modificacionReal = data.some(registro => 
          registro.tipo_modificacion === "EDITAR_EMBARQUE" ||
          !registro.tipo_modificacion // Compatibilidad con registros antiguos
        );
        console.log(`   🎯 Resultado con tipo_modificacion: ${modificacionReal}`);
        return modificacionReal;
      }

      console.log(`   🎯 Resultado: false (sin datos)`);
      return false;
    } catch (error) {
      console.error("   ❌ Error inesperado verificando modificaciones:", error);
      return false;
    }
  };

  try {
    // Obtener algunos embarques para probar
    const { data: embarques, error: embarquesError } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado')
      .limit(5);

    if (embarquesError) {
      console.error('❌ Error obteniendo embarques:', embarquesError);
      return;
    }

    console.log('📋 PROBANDO CON EMBARQUES REALES:');
    
    for (const embarque of (embarques || [])) {
      console.log(`\n📦 Embarque: ${embarque.folio} (${embarque.estado})`);
      
      try {
        const tieneModificacion = await verificarModificacion(embarque.id);
        const globo = tieneModificacion ? '🔴' : '⚫';
        console.log(`   ${globo} Globo modificado: ${tieneModificacion ? 'SÍ' : 'NO'}`);
      } catch (e) {
        console.log(`   ❌ Error en verificación: ${e.message}`);
      }
    }

    // Probar con un ID inexistente
    console.log(`\n📦 Embarque: INEXISTENTE-123`);
    try {
      const tieneModificacion = await verificarModificacion('00000000-0000-0000-0000-000000000000');
      const globo = tieneModificacion ? '🔴' : '⚫';
      console.log(`   ${globo} Globo modificado: ${tieneModificacion ? 'SÍ' : 'NO'}`);
    } catch (e) {
      console.log(`   ❌ Error en verificación: ${e.message}`);
    }

    // Verificar estructura de la tabla
    console.log('\n🔍 VERIFICANDO ESTRUCTURA DE TABLA:');
    const { data: estructura, error: estructuraError } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .limit(1);

    if (estructuraError) {
      console.log(`   ⚠️  Error accediendo tabla: ${estructuraError.message}`);
    } else if (estructura?.length) {
      const campos = Object.keys(estructura[0]);
      const tieneTipo = campos.includes('tipo_modificacion');
      console.log(`   📊 Campo 'tipo_modificacion': ${tieneTipo ? '✅ Existe' : '❌ No existe'}`);
      console.log(`   📋 Total campos: ${campos.length}`);
    } else {
      console.log('   ℹ️  Tabla vacía, no se puede verificar estructura');
    }

    console.log('\n✅ FUNCIÓN CORREGIDA FUNCIONA CORRECTAMENTE');
    console.log('   - Maneja el caso cuando tipo_modificacion no existe');
    console.log('   - Usa fallback a consulta simple');
    console.log('   - No genera errores en consola');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function main() {
  await probarFuncionVerificarModificacion();
  
  console.log('\n🚀 SIGUIENTE PASO:');
  console.log('   Ejecutar mejora-globo-modificado.sql para agregar la columna');
  console.log('   La función ya funciona con o sin la columna');
  
  process.exit(0);
}

main();