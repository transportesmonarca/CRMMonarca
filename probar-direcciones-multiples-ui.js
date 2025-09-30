const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function probarMultiplesDirecciones() {
  console.log('🧪 Probando funcionalidad de múltiples direcciones...');
  
  try {
    // 1. Primero limpiamos cualquier embarque de prueba anterior
    console.log('🧹 Limpiando embarques de prueba anteriores...');
    await supabase
      .from('embarques')
      .delete()
      .like('folio', 'TEST-MULTI-%');
    
    // 2. Crear un embarque con múltiples direcciones simuladas
    const nuevoEmbarque = {
      folio: `TEST-MULTI-${Date.now()}`,
      origen: 'Ciudad de México',
      destino: 'Guadalajara',
      direccion_recolecta: 'Primera recolección: Av. Insurgentes 123, CDMX',
      direccion_entrega: 'Última entrega: Av. López Mateos 456, GDL',
      fecha_recolecta: '2025-01-15',
      hora_recolecta: '08:00',
      fecha_entrega: '2025-01-16', 
      hora_entrega: '18:00',
      estado: 'creado',
      observaciones: 'Embarque de prueba para múltiples direcciones - NO ELIMINAR hasta terminar test',
      contenido: 'Mercancía de prueba'
    };
    
    console.log('📦 Creando embarque de prueba...');
    const { data: embarqueCreado, error: errorCrear } = await supabase
      .from('embarques')
      .insert(nuevoEmbarque)
      .select()
      .single();
    
    if (errorCrear) throw errorCrear;
    
    console.log('✅ Embarque creado:', embarqueCreado.folio);
    console.log('📍 ID del embarque:', embarqueCreado.id);
    
    // 3. Verificar que el embarque se creó correctamente
    const { data: embarqueVerificado, error: errorVerificar } = await supabase
      .from('embarques')
      .select('*')
      .eq('id', embarqueCreado.id)
      .single();
    
    if (errorVerificar) throw errorVerificar;
    
    console.log('\\n📋 DATOS DEL EMBARQUE:');
    console.log('   Folio:', embarqueVerificado.folio);
    console.log('   Dirección recolecta:', embarqueVerificado.direccion_recolecta);
    console.log('   Dirección entrega:', embarqueVerificado.direccion_entrega);
    console.log('   Observaciones:', embarqueVerificado.observaciones);
    
    // 4. Verificar comportamiento en el frontend
    console.log('\\n💡 INSTRUCCIONES PARA PROBAR EN LA UI:');
    console.log('1. Ve a http://localhost:3001/embarques');
    console.log('2. Busca el embarque con folio:', embarqueVerificado.folio);
    console.log('3. Haz clic en "Ver Detalles"');
    console.log('4. Ve a la pestaña "Direcciones y Fechas"');
    console.log('5. Verifica que aparezca el indicador "D. Múltiples" (si configuraste múltiples direcciones)');
    
    console.log('\\n🔧 INSTRUCCIONES PARA AGREGAR DIRECCIONES MÚLTIPLES:');
    console.log('1. Haz clic en "Editar" en el embarque');
    console.log('2. Agrega múltiples direcciones de recolección o entrega');
    console.log('3. Guarda el embarque');
    console.log('4. Verifica que aparezca el indicador "D. Múltiples" en la vista de lista');
    
    return embarqueCreado.id;
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  }
}

async function main() {
  try {
    const embarqueId = await probarMultiplesDirecciones();
    console.log('\\n✅ Prueba completada. Embarque ID:', embarqueId);
    console.log('\\n⚠️ Recuerda eliminar el embarque de prueba cuando termines:');
    console.log(`DELETE FROM embarques WHERE id = '${embarqueId}';`);
  } catch (error) {
    console.error('💥 Error en main:', error);
    process.exit(1);
  }
}

main();