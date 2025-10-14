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

console.log('🔍 VERIFICANDO ESTRUCTURA DE LOCATIONS\n');

async function verificar() {
  try {
    // 1. Ver estructura de la tabla
    console.log('1️⃣ Estructura de la tabla locations:');
    const { data: sample, error: sampleError } = await supabase
      .from('locations')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error:', sampleError);
      return;
    }

    if (sample && sample.length > 0) {
      console.log('   Columnas:', Object.keys(sample[0]).join(', '));
    }

    // 2. Buscar ubicaciones del operador Luis Miguel (ID: d3b1506a-6cb2-4275-bf62-da19d7385029)
    console.log('\n2️⃣ Buscando ubicaciones por operator_id...');
    const operadorId = 'd3b1506a-6cb2-4275-bf62-da19d7385029';
    
    const { data: ubicacionesPorId, error: idError } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_id', operadorId)
      .order('captured_at', { ascending: false })
      .limit(5);

    if (idError) {
      console.error('❌ Error:', idError);
    } else if (!ubicacionesPorId || ubicacionesPorId.length === 0) {
      console.log('   ⚠️  No hay ubicaciones con operator_id');
    } else {
      console.log(`   ✅ Encontradas ${ubicacionesPorId.length} ubicaciones`);
      ubicacionesPorId.forEach((loc, i) => {
        console.log(`   ${i + 1}. Lat: ${loc.latitude}, Lng: ${loc.longitude}`);
        console.log(`      Capturada: ${new Date(loc.captured_at).toLocaleString('es-MX')}`);
      });
    }

    // 3. Ver todas las ubicaciones recientes
    console.log('\n3️⃣ Últimas 10 ubicaciones en la tabla:');
    const { data: recientes, error: recError } = await supabase
      .from('locations')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(10);

    if (recError) {
      console.error('❌ Error:', recError);
    } else if (!recientes || recientes.length === 0) {
      console.log('   ⚠️  No hay ubicaciones en la tabla');
    } else {
      console.log(`   ✅ Total: ${recientes.length} ubicaciones`);
      recientes.forEach((loc, i) => {
        const hace = Math.floor((Date.now() - new Date(loc.captured_at).getTime()) / 60000);
        console.log(`   ${i + 1}. operator_id: ${loc.operator_id || 'null'}`);
        console.log(`      operator_number: ${loc.operator_number || 'null'}`);
        console.log(`      Lat: ${loc.latitude}, Lng: ${loc.longitude}`);
        console.log(`      Hace: ${hace} minutos`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificar();
