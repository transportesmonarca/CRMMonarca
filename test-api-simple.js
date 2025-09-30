// 🧪 Test simple para verificar API embarques/estado
async function testAPI() {
  console.log('\n🧪 TEST: API /api/embarques/estado');
  console.log('='.repeat(50));
  
  try {
    // Test con un ID que no existe para evitar modificar datos reales
    const response = await fetch('http://localhost:3001/api/embarques/estado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: '999999', // ID que no existe
        estado: 'listo-para-asignar',
        fuente: 'legacy'
      })
    });
    
    const result = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log(`📊 Response:`, result);
    
    if (response.status === 400 && result.error?.message?.includes('fecha_completado')) {
      console.log('❌ CONFIRMADO: Error con fecha_completado');
      console.log('🔧 SOLUCION: Ya se removió fecha_completado del código');
    } else if (response.ok || (response.status === 400 && !result.error?.message?.includes('fecha_completado'))) {
      console.log('✅ API funciona correctamente (sin errores de columna)');
    } else {
      console.log(`⚠️ Otro error: ${result.error?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testAPI();