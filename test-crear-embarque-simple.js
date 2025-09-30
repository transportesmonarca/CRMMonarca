// Test simple para la función crear_embarque_normalizado
// Este script probará la función directamente para identificar el problema

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  'https://gtuficayhiyzpfkvqgip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3MzY5NiwiZXhwIjoyMDcxNTQ5Njk2fQ.rG6zRGshJFrLiHykmjr5TziRY92eSB_9EIwV7_0BqAc'
);

async function testCrearEmbarqueNormalizado() {
  try {
    console.log('🧪 Probando crear_embarque_normalizado con datos mínimos...\n');

    const testFolio = `TEST-${Date.now()}`;
    
    console.log(`📋 Creando embarque de prueba: ${testFolio}`);

    // Prueba 1: Solo campos obligatorios
    console.log('\n1️⃣ Prueba con campos mínimos...');
    const { data: result1, error: error1 } = await supabase.rpc('crear_embarque_normalizado', {
      p_folio: testFolio
    });

    if (error1) {
      console.error('❌ Error prueba 1:', error1);
      console.error('Código:', error1?.code);
      console.error('Mensaje:', error1?.message);
      console.error('Detalles:', error1?.details);
    } else {
      console.log('✅ Prueba 1 exitosa, ID:', result1);
      
      // Limpiar después de la prueba
      const { error: deleteError } = await supabase
        .from('embarques_nuevo')
        .delete()
        .eq('id', result1);
      
      if (deleteError) {
        console.warn('⚠️ Error limpiando prueba:', deleteError);
      }
    }

    // Prueba 2: Con más campos
    const testFolio2 = `TEST-${Date.now()}-2`;
    console.log('\n2️⃣ Prueba con más campos...');
    
    const { data: result2, error: error2 } = await supabase.rpc('crear_embarque_normalizado', {
      p_folio: testFolio2,
      p_origen: 'Origen de prueba',
      p_destino: 'Destino de prueba',
      p_contenido: 'Contenido de prueba',
      p_peso: 1000.50,
      p_observaciones: 'Observaciones de prueba'
    });

    if (error2) {
      console.error('❌ Error prueba 2:', error2);
      console.error('Código:', error2?.code);
      console.error('Mensaje:', error2?.message);
      console.error('Detalles:', error2?.details);
      console.error('JSON completo del error:', JSON.stringify(error2, null, 2));
    } else {
      console.log('✅ Prueba 2 exitosa, ID:', result2);
      
      // Limpiar después de la prueba
      const { error: deleteError } = await supabase
        .from('embarques_nuevo')
        .delete()
        .eq('id', result2);
      
      if (deleteError) {
        console.warn('⚠️ Error limpiando prueba:', deleteError);
      }
    }

    // Prueba 3: Con UUIDs inválidos para ver si ese es el problema
    const testFolio3 = `TEST-${Date.now()}-3`;
    console.log('\n3️⃣ Prueba con UUID inválido...');
    
    const { data: result3, error: error3 } = await supabase.rpc('crear_embarque_normalizado', {
      p_folio: testFolio3,
      p_cliente_id: 'uuid-invalid',  // UUID inválido intencional
      p_tipo_servicio_id: 'otro-uuid-invalid'
    });

    if (error3) {
      console.error('❌ Error prueba 3 (esperado):', error3);
      console.error('Código:', error3?.code);
      console.error('Mensaje:', error3?.message);
    } else {
      console.log('✅ Prueba 3 exitosa (inesperado), ID:', result3);
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testCrearEmbarqueNormalizado();