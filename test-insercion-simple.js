// Verificar columnas de tabla embarques mediante insert simple
require('dotenv').config({ path: './env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsercion() {
  try {
    console.log('🔍 Probando inserción mínima en tabla embarques...');
    
    // Datos mínimos para test
    const testEmbarque = {
      folio: 'TEST-' + Date.now(),
      contenido: 'TEST',
      peso: 1,
      origen: 'TEST',
      destino: 'TEST',
      fecha_recolecta: new Date().toISOString().split('T')[0],
      fecha_entrega: new Date().toISOString().split('T')[0],
      estado: 'creado',
      estado_facturacion: 'pendiente_facturacion',
      fecha_creacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Datos de prueba:', testEmbarque);

    const { data, error } = await supabase
      .from('embarques')
      .insert(testEmbarque)
      .select()
      .single();

    if (error) {
      console.error('❌ Error en inserción de prueba:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      console.error('❌ Error message:', error.message);
    } else {
      console.log('✅ Inserción de prueba exitosa:', data);
      
      // Eliminar el registro de prueba
      console.log('🗑️ Eliminando registro de prueba...');
      const { error: deleteError } = await supabase
        .from('embarques')
        .delete()
        .eq('id', data.id);
        
      if (deleteError) {
        console.warn('⚠️ No se pudo eliminar registro de prueba:', deleteError);
      } else {
        console.log('✅ Registro de prueba eliminado');
      }
    }

  } catch (error) {
    console.error('💥 Error durante test de inserción:', error);
  }
}

// Ejecutar test
testInsercion();