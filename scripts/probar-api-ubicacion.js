// Script para probar la API de ubicación desde Node.js
// Ejecutar con: node probar-api-ubicacion.js

const API_BASE = 'http://localhost:3002/api';

// Función para hacer peticiones HTTP
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    console.log(`${options.method || 'GET'} ${url}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('-------------------');
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Función principal de pruebas
async function probarAPI() {
  console.log('🚀 Iniciando pruebas de API de ubicación...\n');
  
  // 1. Insertar una ubicación individual
  console.log('1. Insertando ubicación individual para operador 001:');
  await makeRequest(`${API_BASE}/ubicacion`, {
    method: 'POST',
    body: JSON.stringify({
      operator_number: '001',
      latitude: 19.432608,
      longitude: -99.133209,
      device_id: 'test_device_001'
    })
  });
  
  // 2. Obtener la ubicación que acabamos de insertar
  console.log('2. Obteniendo ubicación del operador 001:');
  await makeRequest(`${API_BASE}/ubicacion?operator_number=001`);
  
  // 3. Insertar múltiples ubicaciones
  console.log('3. Insertando múltiples ubicaciones:');
  await makeRequest(`${API_BASE}/ubicacion/multiple`, {
    method: 'POST',
    body: JSON.stringify({
      ubicaciones: [
        {
          operator_number: '002',
          latitude: 19.433731,
          longitude: -99.171631,
          device_id: 'test_device_002'
        },
        {
          operator_number: '003',
          latitude: 19.418792,
          longitude: -99.162789,
          device_id: 'test_device_003'
        },
        {
          operator_number: '004',
          latitude: 19.436303,
          longitude: -99.072097,
          device_id: 'test_device_004'
        }
      ]
    })
  });
  
  // 4. Obtener todas las ubicaciones recientes
  console.log('4. Obteniendo todas las ubicaciones recientes:');
  await makeRequest(`${API_BASE}/ubicacion/multiple?limit=10&horas=24`);
  
  // 5. Intentar insertar con operador inexistente (debe fallar)
  console.log('5. Probando con operador inexistente (debe fallar):');
  await makeRequest(`${API_BASE}/ubicacion`, {
    method: 'POST',
    body: JSON.stringify({
      operator_number: '999',
      latitude: 19.432608,
      longitude: -99.133209,
      device_id: 'test_device_999'
    })
  });
  
  // 6. Probar con coordenadas inválidas (debe fallar)
  console.log('6. Probando con coordenadas inválidas (debe fallar):');
  await makeRequest(`${API_BASE}/ubicacion`, {
    method: 'POST',
    body: JSON.stringify({
      operator_number: '001',
      latitude: 999,  // Inválida
      longitude: -99.133209,
      device_id: 'test_device_001'
    })
  });
  
  console.log('✅ Pruebas completadas!');
}

// Ejecutar las pruebas
probarAPI();