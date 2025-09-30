const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function crearEmbarqueEstadoCreado() {
  console.log('🧪 CREAR: Embarque en estado "creado" para pruebas');
  console.log('='.repeat(60));

  try {
    // 1. Buscar un embarque archivado o finalizado para cambiar su estado
    console.log('1️⃣ Buscando embarque para cambiar a "creado"...');
    const { data: embarquesDisponibles } = await supabase
      .from('embarques')
      .select('id, folio, estado, cliente_id')
      .in('estado', ['archivado', 'finalizado', 'cancelado'])
      .limit(1);

    if (embarquesDisponibles?.length > 0) {
      const embarque = embarquesDisponibles[0];
      console.log(`✅ Encontrado: ${embarque.folio} (${embarque.estado})`);
      
      // Cambiar a estado "creado" 
      console.log('\n2️⃣ Cambiando estado a "creado"...');
      const { error } = await supabase
        .from('embarques')
        .update({ 
          estado: 'creado',
          updated_at: new Date().toISOString()
        })
        .eq('id', embarque.id);

      if (error) {
        console.log(`❌ Error: ${error.message}`);
        return;
      }

      console.log(`✅ Estado actualizado a "creado"`);
      
      // Verificar el cambio
      const { data: verificacion } = await supabase
        .from('embarques')
        .select('folio, estado, cliente_id')
        .eq('id', embarque.id);

      console.log(`📋 Verificación: ${verificacion?.[0]?.folio} - ${verificacion?.[0]?.estado}`);
      
      // También verificar si aparece en consulta de embarques page
      console.log('\n3️⃣ Verificando que aparece en consulta de embarques...');
      const { data: consultaEmbarques } = await supabase
        .from('embarques')
        .select('folio, estado, cliente_id, fecha_creacion')
        .in('estado', ['creado', 'pendiente'])
        .order('fecha_creacion', { ascending: false });

      const encontrado = consultaEmbarques?.find(e => e.folio === embarque.folio);
      if (encontrado) {
        console.log(`✅ ${encontrado.folio} aparece en página de embarques`);
        console.log(`   Estado: ${encontrado.estado}`);
        
        // Simular el "Completar y Enviar"
        console.log('\n4️⃣ Simulando "Completar y Enviar"...');
        const { error: errorCompletar } = await supabase
          .from('embarques')
          .update({ 
            estado: 'listo-para-asignar',
            updated_at: new Date().toISOString()
          })
          .eq('id', embarque.id);

        if (errorCompletar) {
          console.log(`❌ Error completando: ${errorCompletar.message}`);
        } else {
          console.log(`✅ Embarque ${embarque.folio} cambiado a "listo-para-asignar"`);
          
          // Verificar que aparece en asignación
          console.log('\n5️⃣ Verificando que aparece en página de asignación...');
          const { data: consultaAsignacion } = await supabase
            .from('embarques')
            .select('folio, estado')
            .in('estado', ['listo-para-asignar', 'asignado'])
            .order('fecha_creacion', { ascending: false });

          const enAsignacion = consultaAsignacion?.filter(e => e.estado === 'listo-para-asignar') || [];
          console.log(`📊 Embarques "listo-para-asignar" en legacy: ${enAsignacion.length}`);
          enAsignacion.forEach(e => console.log(`   ✅ ${e.folio}`));
        }
      } else {
        console.log(`❌ ${embarque.folio} NO aparece en consulta de embarques`);
      }

    } else {
      console.log('❌ No se encontraron embarques disponibles para modificar');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearEmbarqueEstadoCreado().then(() => {
  console.log('\n✅ Prueba completada');
  process.exit(0);
});