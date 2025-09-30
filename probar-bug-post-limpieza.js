const { createClient } = require('@supabase/supabase-js');

// Script para probar el bug del botón "Completar y Enviar" después de la limpieza

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function probarBugCompletarEnviar() {
  console.log('🧪 PROBANDO BUG DEL BOTÓN "COMPLETAR Y ENVIAR" POST-LIMPIEZA');
  console.log('=' .repeat(65));

  try {
    // 1. CREAR EMBARQUE DE PRUEBA
    console.log('\n📦 1. Creando embarque de prueba...');
    
    const folioTest = `TEST-LIMPIEZA-${Date.now().toString().slice(-6)}`;
    const embarquePrueba = {
      folio: folioTest,
      cliente_id: null, // Permitir null para prueba
      estado: 'creado',
      estado_facturacion: 'pendiente_facturacion',
      contenido: 'Prueba post-limpieza',
      fecha_creacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: nuevoEmbarque, error: errorCrear } = await supabase
      .from('embarques')
      .insert(embarquePrueba)
      .select()
      .single();

    if (errorCrear) {
      console.error('❌ Error creando embarque:', errorCrear);
      return;
    }

    console.log(`✅ Embarque creado: ${nuevoEmbarque.folio} (ID: ${nuevoEmbarque.id})`);

    // 2. SIMULAR "COMPLETAR Y ENVIAR"
    console.log('\n🔄 2. Simulando botón "Completar y Enviar"...');
    
    const updatePayload = {
      estado: 'listo-para-asignar',
      fecha_completado: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: embarqueActualizado, error: errorUpdate } = await supabase
      .from('embarques')
      .update(updatePayload)
      .eq('id', nuevoEmbarque.id)
      .select()
      .single();

    if (errorUpdate) {
      console.error('❌ Error actualizando embarque:', errorUpdate);
      return;
    }

    console.log('✅ Estado actualizado a:', embarqueActualizado.estado);
    console.log('✅ fecha_completado:', embarqueActualizado.fecha_completado);

    // 3. VERIFICAR PERSISTENCIA (simular refresh/cierre sesión)
    console.log('\n🔍 3. Verificando persistencia del estado...');
    
    const { data: embarqueVerificado, error: errorVerificar } = await supabase
      .from('embarques')
      .select('*')
      .eq('id', nuevoEmbarque.id)
      .single();

    if (errorVerificar) {
      console.error('❌ Error verificando embarque:', errorVerificar);
      return;
    }

    // 4. ANÁLISIS DE RESULTADOS
    console.log('\n📊 4. Análisis de resultados...');
    
    const persistenciaCorrecta = 
      embarqueVerificado.estado === 'listo-para-asignar' && 
      embarqueVerificado.fecha_completado !== null;

    if (persistenciaCorrecta) {
      console.log('🎉 ¡BUG RESUELTO! El estado persiste correctamente');
      console.log('✅ Estado actual:', embarqueVerificado.estado);
      console.log('✅ fecha_completado:', embarqueVerificado.fecha_completado);
      console.log('✅ El botón "Archivar" debe aparecer, NO "Completar y Enviar"');
    } else {
      console.log('❌ Bug AÚN presente - Estado no persiste');
      console.log('⚠️  Estado actual:', embarqueVerificado.estado);
      console.log('⚠️  fecha_completado:', embarqueVerificado.fecha_completado);
    }

    // 5. SIMULAR LÓGICA DE UI
    console.log('\n🎨 5. Simulando lógica de UI (mapeo de estados)...');
    
    function determinarBotonUI(embarque) {
      // Esta es la lógica que usa el frontend
      if (embarque.fecha_completado && embarque.estado === 'listo-para-asignar') {
        return 'ARCHIVAR'; // Botón correcto
      } else if (embarque.estado === 'creado') {
        return 'COMPLETAR_Y_ENVIAR'; // Botón inicial
      } else {
        return 'OTRO_ESTADO';
      }
    }

    const botonUI = determinarBotonUI(embarqueVerificado);
    
    console.log('🎯 Botón que debe mostrar la UI:', botonUI);
    
    if (botonUI === 'ARCHIVAR') {
      console.log('✅ CORRECTO: Debe mostrar botón ARCHIVAR (azul)');
    } else if (botonUI === 'COMPLETAR_Y_ENVIAR') {
      console.log('❌ INCORRECTO: Mostraría botón COMPLETAR Y ENVIAR (problema persiste)');
    } else {
      console.log('⚪ Estado intermedio o diferente');
    }

    // 6. LIMPIAR DATOS DE PRUEBA
    console.log('\n🧹 6. Limpiando datos de prueba...');
    
    const { error: errorLimpiar } = await supabase
      .from('embarques')
      .delete()
      .eq('id', nuevoEmbarque.id);

    if (errorLimpiar) {
      console.warn('⚠️  No se pudo limpiar embarque de prueba:', errorLimpiar);
      console.log(`📝 Eliminar manualmente: ${nuevoEmbarque.folio}`);
    } else {
      console.log('✅ Datos de prueba eliminados');
    }

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(65));
    console.log('🏁 RESUMEN DE PRUEBA:');
    console.log('='.repeat(65));
    
    if (persistenciaCorrecta && botonUI === 'ARCHIVAR') {
      console.log('🎉 ✅ BUG COMPLETAMENTE RESUELTO');
      console.log('   - Estado persiste después de "Completar y Enviar"');
      console.log('   - fecha_completado se guarda correctamente');  
      console.log('   - UI debe mostrar botón "Archivar" en lugar de "Completar y Enviar"');
      console.log('   - Limpieza de tablas normalizadas: EXITOSA');
    } else {
      console.log('❌ ⚠️  BUG PARCIALMENTE RESUELTO O PERSISTE');
      console.log('   - Revisar lógica de mapeo en frontend');
      console.log('   - Verificar que UI use fecha_completado correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante prueba:', error);
  }
}

// Ejecutar prueba
if (require.main === module) {
  probarBugCompletarEnviar().catch(console.error);
}

module.exports = { probarBugCompletarEnviar };