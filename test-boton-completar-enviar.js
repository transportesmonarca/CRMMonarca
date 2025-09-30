// 🧪 Test rápido: Crear embarque y verificar botón "Completar y Enviar"
async function testBotonCompletarYEnviar() {
  console.log('\n🧪 TEST: Botón "Completar y Enviar" debe aparecer');
  console.log('='.repeat(50));
  
  try {
    // 1. Crear embarque de prueba con estado "creado"
    console.log('\n📋 1. Creando embarque de prueba...');
    
    const folioTest = `BOTON-TEST-${Date.now()}`;
    
    const response = await fetch('http://localhost:3001/api/embarques/crear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folio: folioTest,
        cliente_id: 1,
        direccion_recolecta: 'Origen prueba',
        direccion_entrega: 'Destino prueba',
        // No especificar estado, debería ser "creado" por defecto
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.ok) {
      console.log(`✅ Embarque creado: ${folioTest}`);
      console.log(`📊 ID: ${result.embarque?.id}`);
    } else {
      console.log(`❌ Error creando embarque: ${result.error?.message}`);
      return;
    }
    
    // 2. Verificar que aparece en la lista con el estado correcto
    console.log('\n📋 2. Verificando aparición del botón...');
    console.log('🔍 INSTRUCCIONES PARA USUARIO:');
    console.log('   1. Ve a la página de embarques en el navegador');
    console.log('   2. Busca el embarque con folio: ' + folioTest);
    console.log('   3. Verifica que tenga el botón azul "Completar y Enviar"');
    console.log('   4. Revisa la consola del navegador para los logs de mapeo');
    console.log('   5. Logs esperados:');
    console.log('      🔧 [MAPEO] ' + folioTest + ': estadoLegacy=\'creado\', estadoNorm=\'undefined\'');
    console.log('      🔧 [MAPEO] ' + folioTest + ': Conservando \'creado\' → BOTÓN VISIBLE');
    console.log('      🎯 [RENDER] ' + folioTest + ': estado=\'creado\' → Botón Completar y Enviar');
    
    // 3. Después de unos segundos, limpiar
    setTimeout(async () => {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          'https://gspvgjjvswbzftjbsrvg.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw'
        );
        
        await supabase.from('embarques').delete().eq('folio', folioTest);
        console.log('\n🗑️ Embarque de prueba eliminado después de 30 segundos');
      } catch (e) {
        console.log('⚠️ No se pudo limpiar el embarque de prueba');
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

testBotonCompletarYEnviar();