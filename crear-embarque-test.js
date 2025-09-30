const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function crearEmbarquePrueba() {
  try {
    console.log('🧪 Creando embarque de prueba para validar la corrección...');
    
    // 1. Crear embarque en tabla legacy con estado 'listo-para-asignar'
    const folioTest = `TEST-${new Date().getTime()}`;
    
    const { data: embarqueCreado, error: errorCrear } = await supabase
      .from('embarques')
      .insert({
        folio: folioTest,
        estado: 'listo-para-asignar',
        origen: 'TEST Origen',
        destino: 'TEST Destino',
        fecha_creacion: new Date().toISOString(),
        precio_flete: 1000
      })
      .select()
      .single();
    
    if (errorCrear) {
      console.error('❌ Error creando embarque:', errorCrear);
      return;
    }
    
    console.log(`✅ Embarque creado: ${folioTest} (ID: ${embarqueCreado.id})`);
    
    // 2. NO crear registro en tabla normalizada para simular embarque legacy puro
    console.log('📝 Embarque creado solo en tabla legacy (sin versión normalizada)');
    
    console.log('\n🎯 Test:');
    console.log('1. Ve a la página de embarques');
    console.log(`2. Busca el embarque ${folioTest}`);
    console.log('3. Debe mostrar badge "Listo para Asignar" y botón "Archivar"');
    console.log('4. Cambia de sección y regresa');
    console.log('5. Verifica que siga mostrando el botón "Archivar"');
    
    console.log(`\n🗑️ Para limpiar después: DELETE FROM embarques WHERE id = '${embarqueCreado.id}';`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

crearEmbarquePrueba();