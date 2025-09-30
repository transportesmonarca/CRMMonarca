const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ekqvnjrcsyqaqxhksxpz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcXZuanJjc3lxYXF4aGtzeHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzOTY1ODUsImV4cCI6MjA0OTk3MjU4NX0.TLCCbLpJWYZz0s6u3b38iR_uP5NJzrSlIgxFhtyFZUc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probarFlujoCompleto() {
  console.log('🚀 PRUEBA DE FLUJO COMPLETO - DEBUG\n');

  try {
    // 1. Verificar embarques en estado 'creado'
    console.log('1️⃣ Verificando embarques en estado "creado"...');
    const { data: embarcuesCreados } = await supabase
      .from('embarques_nuevo')
      .select('numero_embarque, estado')
      .eq('estado', 'creado')
      .order('created_at', { ascending: false })
      .limit(5);

    if (embarcuesCreados?.length > 0) {
      console.log('   ✅ Encontrados', embarcuesCreados.length, 'embarques en estado "creado":');
      embarcuesCreados.forEach(e => console.log(`      - ${e.numero_embarque}: ${e.estado}`));
      
      // Tomar el primer embarque para la prueba
      const embarquePrueba = embarcuesCreados[0];
      console.log(`\n2️⃣ Simulando "Completar y Enviar" para ${embarquePrueba.numero_embarque}...`);
      
      // Simular el cambio de estado que hace la página de embarques
      const { error } = await supabase
        .from('embarques_nuevo')
        .update({ estado: 'listo-para-asignar' })
        .eq('numero_embarque', embarquePrueba.numero_embarque);

      if (error) {
        console.log('   ❌ Error actualizando estado:', error.message);
        return;
      }

      console.log(`   ✅ Estado cambiado a "listo-para-asignar"`);

      // 3. Verificar que aparece en la consulta de asignación
      console.log('\n3️⃣ Verificando en consulta de asignación...');
      const { data: embarquesAsignacion } = await supabase
        .from('embarques_nuevo')
        .select('numero_embarque, estado, created_at')
        .in('estado', ['listo-para-asignar', 'asignado', 'cargando', 'en-ruta', 'descargando', 'entregado'])
        .order('created_at', { ascending: false });

      const encontrado = embarquesAsignacion?.find(e => e.numero_embarque === embarquePrueba.numero_embarque);
      
      if (encontrado) {
        console.log(`   ✅ Embarque ${embarquePrueba.numero_embarque} encontrado en asignación:`);
        console.log(`      Estado: ${encontrado.estado}`);
        console.log(`      Created: ${encontrado.created_at}`);
      } else {
        console.log(`   ❌ Embarque ${embarquePrueba.numero_embarque} NO encontrado en consulta de asignación`);
      }

      // 4. Simular la consulta completa con joins que hace la página de asignación
      console.log('\n4️⃣ Simulando consulta completa de asignación con JOINs...');
      const { data: consultaCompleta, error: errorConsulta } = await supabase
        .from('embarques_nuevo')
        .select(`
          *,
          cliente:clientes(*),
          operador:operadores(*),
          camion:camiones(*),
          remolque:remolques(*),
          embarques_ubicaciones(origen, destino, direccion_recolecta, direccion_entrega, fecha_recolecta, hora_recolecta, fecha_entrega, hora_entrega),
          embarques_financiero(precio_flete, precio_operador_final, flete_falso),
          embarques_estado(estado_facturacion, pagado, fecha_creacion),
          embarques_documentos(carta_porte),
          embarques_adicional(dueno_mercancia, observaciones)
        `)
        .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
        .order('created_at', { ascending: false });

      if (errorConsulta) {
        console.log('   ❌ Error en consulta completa:', errorConsulta.message);
      } else {
        const encontradoCompleto = consultaCompleta?.find(e => e.numero_embarque === embarquePrueba.numero_embarque);
        if (encontradoCompleto) {
          console.log(`   ✅ Embarque encontrado en consulta completa:`);
          console.log(`      Número: ${encontradoCompleto.numero_embarque}`);
          console.log(`      Estado: ${encontradoCompleto.estado}`);
          console.log(`      Cliente: ${encontradoCompleto.cliente?.nombre_comercial || 'N/A'}`);
        } else {
          console.log(`   ❌ Embarque NO encontrado en consulta completa`);
        }
      }

      // 5. Verificar deduplicación
      console.log('\n5️⃣ Verificando deduplicación (si existe en ambas tablas)...');
      const { data: enLegacy } = await supabase
        .from('embarques')
        .select('numero_embarque, estado')
        .eq('numero_embarque', embarquePrueba.numero_embarque);

      if (enLegacy?.length > 0) {
        console.log(`   ⚠️  Embarque también existe en tabla legacy:`);
        console.log(`      Estado en legacy: ${enLegacy[0].estado}`);
        console.log(`   📝 La deduplicación debería preferir la tabla normalizada`);
      } else {
        console.log(`   ✅ Embarque solo existe en tabla normalizada`);
      }

    } else {
      console.log('   ⚠️  No hay embarques en estado "creado" para probar');
      
      // Mostrar embarques disponibles
      console.log('\n📋 Estados disponibles:');
      const { data: todosLosEstados } = await supabase
        .from('embarques_nuevo')
        .select('estado, numero_embarque')
        .order('created_at', { ascending: false })
        .limit(10);

      const agrupados = {};
      todosLosEstados?.forEach(e => {
        if (!agrupados[e.estado]) agrupados[e.estado] = [];
        agrupados[e.estado].push(e.numero_embarque);
      });

      Object.entries(agrupados).forEach(([estado, embarques]) => {
        console.log(`   ${estado}: ${embarques.length} embarques`);
      });
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
probarFlujoCompleto().then(() => {
  console.log('\n✅ Prueba completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error ejecutando prueba:', error);
  process.exit(1);
});