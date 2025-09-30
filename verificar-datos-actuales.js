const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ekqvnjrcsyqaqxhksxpz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcXZuanJjc3lxYXF4aGtzeHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzOTY1ODUsImV4cCI6MjA0OTk3MjU4NX0.TLCCbLpJWYZz0s6u3b38iR_uP5NJzrSlIgxFhtyFZUc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarDatosActuales() {
  console.log('🔍 VERIFICACIÓN ACTUAL - Estados en DB\n');

  try {
    // 1. Ver distribución de estados en tabla normalizada
    console.log('1️⃣ Estados en tabla embarques_nuevo:');
    const { data: estadosNuevo } = await supabase
      .from('embarques_nuevo')
      .select('estado, numero_embarque, created_at')
      .order('created_at', { ascending: false });

    const agrupados = {};
    estadosNuevo?.forEach(e => {
      if (!agrupados[e.estado]) agrupados[e.estado] = [];
      agrupados[e.estado].push(e.numero_embarque);
    });

    Object.entries(agrupados).forEach(([estado, embarques]) => {
      console.log(`   ${estado}: ${embarques.length} embarques`);
      if (estado === 'listo-para-asignar') {
        console.log(`      - ${embarques.join(', ')}`);
      }
    });

    // 2. Ver si hay embarques "listo-para-asignar"
    const { data: listosParaAsignar } = await supabase
      .from('embarques_nuevo')
      .select('numero_embarque, estado, created_at')
      .eq('estado', 'listo-para-asignar')
      .order('created_at', { ascending: false });

    console.log(`\n2️⃣ Embarques "listo-para-asignar": ${listosParaAsignar?.length || 0}`);
    listosParaAsignar?.forEach(e => {
      console.log(`   - ${e.numero_embarque} (${e.created_at})`);
    });

    // 3. Simular la consulta exacta de la página de asignación
    console.log('\n3️⃣ Simulando consulta de asignación (normalizada)...');
    const { data: queryAsignacion, error: errorAsignacion } = await supabase
      .from('embarques_nuevo')
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*)
      `)
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
      .order('created_at', { ascending: false });

    if (errorAsignacion) {
      console.log('   ❌ Error:', errorAsignacion.message);
    } else {
      const listos = queryAsignacion?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`   ✅ Query OK - Encontrados ${listos.length} embarques "listo-para-asignar"`);
      listos.forEach(e => {
        console.log(`      - ${e.numero_embarque}: ${e.estado}`);
      });
    }

    // 4. Ver tabla legacy también
    console.log('\n4️⃣ Estados en tabla legacy (embarques):');
    const { data: embarquesLegacy } = await supabase
      .from('embarques')
      .select('estado, numero_embarque, fecha_creacion')
      .in('estado', ['listo-para-asignar', 'asignado', 'creado'])
      .order('fecha_creacion', { ascending: false })
      .limit(10);

    const agrupados2 = {};
    embarquesLegacy?.forEach(e => {
      if (!agrupados2[e.estado]) agrupados2[e.estado] = [];
      agrupados2[e.estado].push(e.numero_embarque);
    });

    Object.entries(agrupados2).forEach(([estado, embarques]) => {
      console.log(`   ${estado}: ${embarques.length} embarques`);
      if (estado === 'listo-para-asignar' && embarques.length > 0) {
        console.log(`      - ${embarques.join(', ')}`);
      }
    });

    // 5. Buscar duplicados entre tablas
    if (listosParaAsignar?.length > 0) {
      console.log('\n5️⃣ Verificando duplicados entre tablas...');
      for (const embarque of listosParaAsignar) {
        const { data: enLegacy } = await supabase
          .from('embarques')
          .select('numero_embarque, estado')
          .eq('numero_embarque', embarque.numero_embarque);

        if (enLegacy?.length > 0) {
          console.log(`   ⚠️  ${embarque.numero_embarque} existe en ambas tablas:`);
          console.log(`      Normalizada: ${embarque.estado}`);
          console.log(`      Legacy: ${enLegacy[0].estado}`);
        } else {
          console.log(`   ✅ ${embarque.numero_embarque} solo en tabla normalizada`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar la verificación
verificarDatosActuales().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error ejecutando verificación:', error);
  process.exit(1);
});