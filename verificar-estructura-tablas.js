const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarEstructuraTablas() {
  console.log('🏗️  VERIFICACIÓN: Estructura de tablas');
  console.log('='.repeat(60));

  try {
    // Verificar tabla legacy
    console.log('\n1️⃣ Estructura tabla embarques (legacy):');
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select('*')
      .limit(1);

    if (errorLegacy) {
      console.log(`❌ Error: ${errorLegacy.message}`);
    } else if (embarquesLegacy?.length > 0) {
      const columnas = Object.keys(embarquesLegacy[0]);
      console.log(`✅ ${columnas.length} columnas encontradas:`);
      columnas.forEach(col => console.log(`   - ${col}`));
      
      // Mostrar un registro de ejemplo
      const ejemplo = embarquesLegacy[0];
      console.log('\n📝 Registro de ejemplo:');
      console.log(`   ID: ${ejemplo.id}`);
      console.log(`   Folio: ${ejemplo.folio || 'N/A'}`);
      console.log(`   Estado: ${ejemplo.estado || 'N/A'}`);
      console.log(`   Cliente ID: ${ejemplo.cliente_id || 'N/A'}`);
    }

    // Verificar tabla normalizada
    console.log('\n2️⃣ Estructura tabla embarques_nuevo (normalizada):');
    const { data: embarquesNuevo, error: errorNuevo } = await supabase
      .from('embarques_nuevo')
      .select('*')
      .limit(1);

    if (errorNuevo) {
      console.log(`❌ Error: ${errorNuevo.message}`);
    } else if (embarquesNuevo?.length > 0) {
      const columnas = Object.keys(embarquesNuevo[0]);
      console.log(`✅ ${columnas.length} columnas encontradas:`);
      columnas.forEach(col => console.log(`   - ${col}`));
      
      // Mostrar un registro de ejemplo
      const ejemplo = embarquesNuevo[0];
      console.log('\n📝 Registro de ejemplo:');
      console.log(`   ID: ${ejemplo.id}`);
      console.log(`   Folio: ${ejemplo.folio || 'N/A'}`);
      console.log(`   Estado: ${ejemplo.estado || 'N/A'}`);
      console.log(`   Cliente ID: ${ejemplo.cliente_id || 'N/A'}`);
    } else {
      console.log('⚠️  Tabla vacía o no existe');
    }

    // Contar registros en cada tabla
    console.log('\n3️⃣ Conteo de registros:');
    
    const { count: countLegacy, error: errorCountLegacy } = await supabase
      .from('embarques')
      .select('*', { count: 'exact', head: true });

    if (errorCountLegacy) {
      console.log(`❌ Error contando legacy: ${errorCountLegacy.message}`);
    } else {
      console.log(`📊 Embarques legacy: ${countLegacy || 0}`);
    }

    const { count: countNuevo, error: errorCountNuevo } = await supabase
      .from('embarques_nuevo')
      .select('*', { count: 'exact', head: true });

    if (errorCountNuevo) {
      console.log(`❌ Error contando nuevo: ${errorCountNuevo.message}`);
    } else {
      console.log(`📊 Embarques nuevo: ${countNuevo || 0}`);
    }

    // Verificar distribución por estado en legacy
    if (embarquesLegacy?.length > 0) {
      console.log('\n4️⃣ Estados en tabla legacy:');
      const { data: todosLegacy } = await supabase
        .from('embarques')
        .select('estado, folio')
        .order('fecha_creacion', { ascending: false })
        .limit(50);

      const porEstado = todosLegacy?.reduce((acc, e) => {
        acc[e.estado] = (acc[e.estado] || 0) + 1;
        return acc;
      }, {}) || {};

      Object.entries(porEstado).forEach(([estado, count]) => {
        console.log(`   ${estado}: ${count}`);
      });

      // Buscar embarques que puedan servir para prueba
      const candidatos = todosLegacy?.filter(e => 
        ['creado', 'pendiente', 'listo-para-asignar'].includes(e.estado)
      ) || [];

      console.log(`\n🎯 Candidatos para asignación: ${candidatos.length}`);
      candidatos.slice(0, 3).forEach(e => {
        console.log(`   - ${e.folio}: ${e.estado}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarEstructuraTablas().then(() => {
  console.log('\n✅ Verificación de estructura completada');
  process.exit(0);
});