// Script para insertar datos de ubicación de prueba
// Ejecutar con: node scripts/insertar-ubicacion-prueba.js

const SUPABASE_URL = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

// Ubicaciones de prueba en diferentes zonas de Ciudad de México
const ubicacionesPrueba = [
  {
    operator_number: '001',
    latitude: 19.432608,
    longitude: -99.133209,
    device_id: 'test_device_001',
    nombre_zona: 'Centro Histórico CDMX'
  },
  {
    operator_number: '002',
    latitude: 19.433731,
    longitude: -99.171631,
    device_id: 'test_device_002',
    nombre_zona: 'Polanco'
  },
  {
    operator_number: '003',
    latitude: 19.418792,
    longitude: -99.162789,
    device_id: 'test_device_003',
    nombre_zona: 'Roma Norte'
  },
  {
    operator_number: '004',
    latitude: 19.436303,
    longitude: -99.072097,
    device_id: 'test_device_004',
    nombre_zona: 'Aeropuerto CDMX'
  },
  {
    operator_number: '005',
    latitude: 19.359838,
    longitude: -99.259150,
    device_id: 'test_device_005',
    nombre_zona: 'Santa Fe'
  }
];

async function insertarUbicacionPrueba(ubicacion) {
  try {
    console.log(`\n📍 Insertando ubicación para operador ${ubicacion.operator_number} (${ubicacion.nombre_zona})...`);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/locations`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        operator_number: ubicacion.operator_number,
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        device_id: ubicacion.device_id,
        captured_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Ubicación insertada exitosamente`);
    console.log(`   Lat: ${ubicacion.latitude}, Lng: ${ubicacion.longitude}`);
    return true;

  } catch (error) {
    console.error(`❌ Error insertando ubicación:`, error.message);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Iniciando inserción de ubicaciones de prueba...\n');
  console.log('─'.repeat(60));

  let exitosos = 0;
  let fallidos = 0;

  for (const ubicacion of ubicacionesPrueba) {
    const resultado = await insertarUbicacionPrueba(ubicacion);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
    // Esperar un poco entre inserciones
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 Resumen:');
  console.log(`   ✅ Exitosos: ${exitosos}`);
  console.log(`   ❌ Fallidos: ${fallidos}`);
  console.log(`   📍 Total: ${ubicacionesPrueba.length}`);

  if (exitosos > 0) {
    console.log('\n🎉 ¡Ubicaciones insertadas! Ahora puedes:');
    console.log('   1. Ir a http://localhost:3002/asignar-operadores');
    console.log('   2. Hacer clic en cualquier botón "📍 Ubicación"');
    console.log('   3. Ver el mapa de Google Maps con las ubicaciones\n');
  }
}

main();
