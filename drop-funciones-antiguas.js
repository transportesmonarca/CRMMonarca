const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function eliminarFuncionesAntiguas() {
  try {
    console.log('🗑️  Eliminando funciones antiguas...\n');
    
    const funciones = [
      'DROP FUNCTION IF EXISTS obtener_embarque_completo(uuid);',
      'DROP FUNCTION IF EXISTS actualizar_pago_operador(uuid, numeric);',
      'DROP FUNCTION IF EXISTS actualizar_estado_embarque(uuid, varchar, timestamp);',
      'DROP FUNCTION IF EXISTS calcular_pago_operador_normalizado(uuid);',
      'DROP FUNCTION IF EXISTS insertar_embarque_completo(varchar, uuid, uuid, text, varchar, varchar, numeric);',
      'DROP FUNCTION IF EXISTS obtener_embarques_operador(uuid);'
    ];
    
    for (const sql of funciones) {
      console.log('Ejecutando:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.log('⚠️ ', error.message);
      } else {
        console.log('✅ Ejecutado correctamente');
      }
    }
    
    console.log('\n🎉 Funciones antiguas eliminadas. Ahora puedes ejecutar el script 110.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

eliminarFuncionesAntiguas();