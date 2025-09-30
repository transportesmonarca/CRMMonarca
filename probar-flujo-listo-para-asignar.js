// ====================================
// PRUEBA: Flujo completo listo-para-asignar
// ====================================
// Script para probar que el flujo de embarques funciona correctamente después de las correcciones

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function probarFlujoCompleto() {
  console.log('🧪 PRUEBA: Flujo completo de creación y completado de embarque');
  console.log('='.repeat(60));

  try {
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const folioTest = `TEST-FLUJO-${timestamp}`;

    // 1. Crear embarque de prueba
    console.log('\n1️⃣ Creando embarque de prueba...');
    const response = await fetch('http://localhost:3000/api/embarques/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_folio: folioTest,
        p_contenido: 'Prueba de flujo completo',
        p_origen: 'Ciudad de México',
        p_destino: 'Guadalajara'
      })
    });

    if (!response.ok) {
      console.error('❌ Error creando embarque:', await response.text());
      return;
    }

    const createResult = await response.json();
    if (!createResult.ok) {
      console.error('❌ Error en respuesta:', createResult);
      return;
    }

    console.log(`✅ Embarque creado: ${folioTest}, ID: ${createResult.id}`);

    // 2. Verificar estado inicial
    console.log('\n2️⃣ Verificando estado inicial...');
    const { data: embarqueCreado, error: errorVerificar } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .eq('id', createResult.id)
      .single();

    if (errorVerificar || !embarqueCreado) {
      console.error('❌ Error verificando embarque:', errorVerificar);
      return;
    }

    console.log(`✅ Estado inicial: ${embarqueCreado.estado} (debería ser 'creado')`);
    
    if (embarqueCreado.estado !== 'creado') {
      console.error(`❌ PROBLEMA: Estado incorrecto. Esperado: 'creado', Actual: '${embarqueCreado.estado}'`);
      return;
    }

    // 3. Completar embarque (cambiar a listo-para-asignar)
    console.log('\n3️⃣ Completando embarque...');
    const completarResponse = await fetch('http://localhost:3000/api/embarques/estado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: createResult.id, 
        estado: 'listo-para-asignar',
        fuente: 'normalizado'
      })
    });

    if (!completarResponse.ok) {
      console.error('❌ Error completando embarque:', await completarResponse.text());
      return;
    }

    const completarResult = await completarResponse.json();
    if (!completarResult.ok) {
      console.error('❌ Error en respuesta de completar:', completarResult);
      return;
    }

    console.log('✅ Embarque completado exitosamente');

    // 4. Verificar estado después de completar
    console.log('\n4️⃣ Verificando estado después de completar...');
    const { data: embarqueCompletado, error: errorVerificarCompletado } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, updated_at')
      .eq('id', createResult.id)
      .single();

    if (errorVerificarCompletado || !embarqueCompletado) {
      console.error('❌ Error verificando embarque completado:', errorVerificarCompletado);
      return;
    }

    console.log(`✅ Estado después de completar: ${embarqueCompletado.estado} (debería ser 'listo-para-asignar')`);
    
    if (embarqueCompletado.estado !== 'listo-para-asignar') {
      console.error(`❌ PROBLEMA: Estado incorrecto. Esperado: 'listo-para-asignar', Actual: '${embarqueCompletado.estado}'`);
      return;
    }

    // 5. Verificar que aparece en la consulta de asignación
    console.log('\n5️⃣ Verificando que aparece en sección de asignación...');
    const { data: embarquesAsignacion, error: errorAsignacion } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado')
      .eq('estado', 'listo-para-asignar')
      .eq('id', createResult.id);

    if (errorAsignacion) {
      console.error('❌ Error consultando embarques para asignación:', errorAsignacion);
      return;
    }

    if (!embarquesAsignacion || embarquesAsignacion.length === 0) {
      console.error('❌ PROBLEMA: El embarque NO aparece en la consulta de asignación');
      return;
    }

    console.log(`✅ El embarque SÍ aparece en asignación: ${embarquesAsignacion[0].folio}`);

    // 6. Limpiar embarque de prueba
    console.log('\n6️⃣ Limpiando embarque de prueba...');
    const { error: errorLimpiar } = await supabase
      .from('embarques_nuevo')
      .delete()
      .eq('id', createResult.id);

    if (errorLimpiar) {
      console.warn('⚠️ No se pudo limpiar el embarque de prueba:', errorLimpiar);
    } else {
      console.log('✅ Embarque de prueba eliminado');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESULTADO: PRUEBA EXITOSA');
    console.log('✅ El flujo funciona correctamente:');
    console.log('   • Embarques se crean con estado "creado"');
    console.log('   • Al completar cambian a "listo-para-asignar"');
    console.log('   • Aparecen correctamente en la sección de asignación');

  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

// Ejecutar prueba
probarFlujoCompleto().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});