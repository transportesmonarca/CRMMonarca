import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚚 CREANDO EMBARQUE DE PRUEBA CON UBICACIÓN\n');

async function crearEmbarquePrueba() {
  try {
    // 1. Obtener un operador con operator_number
    const { data: operador, error: opError } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number')
      .eq('operator_number', '001')
      .single();

    if (opError || !operador) {
      console.error('❌ Error al obtener operador:', opError);
      return;
    }

    console.log(`👤 Operador seleccionado: ${operador.nombre} (${operador.operator_number})`);

    // 2. Verificar que tiene ubicación
    const { data: ubicacion } = await supabase
      .from('locations')
      .select('latitude, longitude, captured_at')
      .eq('operator_number', operador.operator_number)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (!ubicacion) {
      console.error('❌ El operador no tiene ubicación');
      return;
    }

    console.log(`📍 Ubicación disponible: Lat ${ubicacion.latitude}, Lng ${ubicacion.longitude}`);

    // 3. Obtener un cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, nombre')
      .limit(1)
      .single();

    if (!cliente) {
      console.error('❌ No hay clientes en la base de datos');
      return;
    }

    console.log(`🏢 Cliente: ${cliente.nombre}`);

    // 4. Generar folio único
    const fecha = new Date();
    const folio = `PRUEBA-UBI-${fecha.getDate()}${fecha.getMonth() + 1}-${fecha.getHours()}${fecha.getMinutes()}`;

    // 5. Crear embarque
    console.log(`\n📝 Creando embarque ${folio}...`);

    const nuevoEmbarque = {
      folio: folio,
      cliente_id: cliente.id,
      operador_id: operador.id,
      operator_number: operador.operator_number,
      origen: 'Ciudad de México',
      destino: 'Monterrey',
      lugar_recolecta: 'Almacén Central CDMX',
      direccion_recolecta: 'Av. Insurgentes Sur 1234, CDMX',
      direccion_entrega: 'Parque Industrial, Monterrey, NL',
      fecha_recolecta: new Date().toISOString().split('T')[0],
      hora_recolecta: '09:00',
      fecha_entrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hora_entrega: '18:00',
      contenido: 'Material de prueba para verificar ubicación',
      peso: 1500,
      estado: 'en_transito',
      observaciones: 'Embarque de prueba para verificar sistema de ubicación GPS',
      precio_flete: 8500,
      moneda_flete: 'MXN',
      fecha_creacion: new Date().toISOString(),
      fecha_asignacion: new Date().toISOString()
    };

    const { data: embarqueCreado, error: embError } = await supabase
      .from('embarques')
      .insert(nuevoEmbarque)
      .select()
      .single();

    if (embError) {
      console.error('❌ Error al crear embarque:', embError);
      return;
    }

    console.log('✅ Embarque creado exitosamente!');
    console.log(`\n📦 Detalles del embarque:`);
    console.log(`   Folio: ${embarqueCreado.folio}`);
    console.log(`   Estado: ${embarqueCreado.estado}`);
    console.log(`   Operador: ${operador.nombre} (${operador.operator_number})`);
    console.log(`   Ubicación disponible: Sí`);
    console.log(`\n🎯 Ahora puedes:`);
    console.log(`   1. Ir a http://localhost:3002/asignar-operadores`);
    console.log(`   2. Buscar el embarque ${folio}`);
    console.log(`   3. Click en el botón de "Ubicación del Operador"`);
    console.log(`   4. Deberías ver el mapa con la ubicación del operador`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearEmbarquePrueba();
