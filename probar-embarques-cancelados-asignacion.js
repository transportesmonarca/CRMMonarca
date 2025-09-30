const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probarEmbarquesCanceladosEnAsignacion() {
  console.log('🧪 PRUEBA: Embarques cancelados en sección de asignación\n');

  try {
    // 1. Crear embarque en estado "listo-para-asignar"
    console.log('📋 1. Creando embarque listo para asignar...');
    
    const folioTest = `CANCEL-TEST-${Date.now()}`;
    const embarquePrueba = {
      folio: folioTest,
      estado: 'listo-para-asignar',
      observaciones: 'RECOLECTA: Dirección 1, Ciudad A - 10:00 AM\nRECOLECTA: Dirección 2, Ciudad B - 2:00 PM\nENTREGA: Warehouse Principal - 6:00 PM',
      origen: 'Ciudad A',
      destino: 'Ciudad B',
      cliente_id: '1d4b7c49-6b43-4e3a-9f2a-8d7c5b1dbe96',
      tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96',
      fecha_creacion: new Date().toISOString()
    };

    const { data: embarqueCreado, error: errorCreacion } = await supabase
      .from('embarques')
      .insert([embarquePrueba])
      .select()
      .single();

    if (errorCreacion) {
      console.error('❌ Error creando embarque:', errorCreacion);
      return;
    }

    console.log(`✅ Embarque creado: ${embarqueCreado.folio} (ID: ${embarqueCreado.id})`);
    console.log(`   📍 Estado: ${embarqueCreado.estado}`);

    // 2. Simular cancelación del embarque
    console.log('\n📋 2. Cancelando el embarque...');
    
    const motivoCancelacion = 'Prueba de cancelación en asignación';
    const { data: embarqueCancelado, error: errorCancelacion } = await supabase
      .from('embarques')
      .update({
        estado: 'cancelado',
        cancelado_por: 'Usuario de Prueba',
        motivo_cancelacion: motivoCancelacion,
        fecha_cancelacion: new Date().toISOString(),
        observaciones: `${embarquePrueba.observaciones}\n\n[CANCELADO] ${motivoCancelacion}`.trim()
      })
      .eq('id', embarqueCreado.id)
      .select()
      .single();

    if (errorCancelacion) {
      console.error('❌ Error cancelando embarque:', errorCancelacion);
      return;
    }

    console.log(`✅ Embarque cancelado: ${embarqueCancelado.folio}`);
    console.log(`   📍 Estado: ${embarqueCancelado.estado}`);
    console.log(`   👤 Cancelado por: ${embarqueCancelado.cancelado_por}`);
    console.log(`   💬 Motivo: ${embarqueCancelado.motivo_cancelacion}`);

    // 3. Crear otro embarque asignado y cancelarlo
    console.log('\n📋 3. Creando embarque asignado para cancelar...');
    
    const folioTest2 = `CANCEL-ASIG-${Date.now()}`;
    const embarqueAsignado = {
      folio: folioTest2,
      estado: 'asignado',
      observaciones: 'RECOLECTA: Punto A - 09:00 AM\nENTREGA: Punto B - 15:00 PM\nENTREGA: Punto C - 17:00 PM',
      origen: 'Punto A',
      destino: 'Punto B',
      cliente_id: '1d4b7c49-6b43-4e3a-9f2a-8d7c5b1dbe96',
      tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96',
      operador_id: 'operador-test-123',
      camion_id: 'camion-test-456',
      fecha_creacion: new Date().toISOString()
    };

    const { data: embarqueAsignadoCreado, error: errorAsignado } = await supabase
      .from('embarques')
      .insert([embarqueAsignado])
      .select()
      .single();

    if (errorAsignado) {
      console.error('❌ Error creando embarque asignado:', errorAsignado);
    } else {
      console.log(`✅ Embarque asignado creado: ${embarqueAsignadoCreado.folio}`);

      // Cancelar el embarque asignado
      const motivoCancelacion2 = 'Cliente canceló servicio';
      const { data: embarqueAsignadoCancelado, error: errorCancelAsignado } = await supabase
        .from('embarques')
        .update({
          estado: 'cancelado',
          cancelado_por: 'Usuario de Prueba',
          motivo_cancelacion: motivoCancelacion2,
          fecha_cancelacion: new Date().toISOString()
        })
        .eq('id', embarqueAsignadoCreado.id)
        .select()
        .single();

      if (errorCancelAsignado) {
        console.error('❌ Error cancelando embarque asignado:', errorCancelAsignado);
      } else {
        console.log(`✅ Embarque asignado cancelado: ${embarqueAsignadoCancelado.folio}`);
      }
    }

    // 4. Instrucciones para verificar
    console.log('\n🔍 INSTRUCCIONES PARA VERIFICAR LOS CAMBIOS:');
    console.log('');
    console.log('📱 1. ABRE LA APLICACIÓN:');
    console.log('   🚀 http://localhost:3000/embarques');
    console.log('');
    console.log('👀 2. BUSCA LOS EMBARQUES CREADOS:');
    console.log(`   📋 Folio: ${embarqueCancelado.folio}`);
    if (embarqueAsignadoCreado) {
      console.log(`   📋 Folio: ${folioTest2}`);
    }
    console.log('');
    console.log('✅ 3. VERIFICA QUE LOS EMBARQUES CANCELADOS:');
    console.log('   👁️  SIGUEN VISIBLES en la interfaz');
    console.log('   🔵 Muestran badge "D. Múltiples" (tienen múltiples direcciones)');
    console.log('   🎯 Solo muestran el botón "Archivar"');
    console.log('   🚫 NO muestran otros botones de acción');
    console.log('   🏷️  Muestran badge de estado "Cancelado" (del sistema)');
    console.log('');
    console.log('🎨 4. APARIENCIA ESPERADA:');
    console.log('   🔵 Badge azul "D. Múltiples" (si tiene múltiples direcciones)');
    console.log('   🔴 Badge rojo "Cancelado" (del sistema de estados)');
    console.log('   📁 Botón gris "Archivar"');
    console.log('   ❌ Sin otros botones (completar, asignar, etc.)');

    console.log('\n📊 RESUMEN DE EMBARQUES CREADOS:');
    console.log(`✅ ${embarqueCancelado.folio}: cancelado (era listo-para-asignar)`);
    if (embarqueAsignadoCreado) {
      console.log(`✅ ${folioTest2}: cancelado (era asignado)`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
probarEmbarquesCanceladosEnAsignacion().catch(console.error);