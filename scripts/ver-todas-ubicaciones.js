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

console.log('📍 TODAS LAS UBICACIONES EN LA TABLA LOCATIONS\n');

async function mostrarUbicaciones() {
  try {
    const { data: ubicaciones, error } = await supabase
      .from('locations')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (!ubicaciones || ubicaciones.length === 0) {
      console.log('⚠️  No hay ubicaciones en la tabla');
      return;
    }

    console.log(`✅ Total de ubicaciones encontradas: ${ubicaciones.length}\n`);
    console.log('='.repeat(100));
    
    const groupedByOperator = {};
    
    ubicaciones.forEach(loc => {
      const opNum = loc.operator_number || 'SIN_NUMERO';
      if (!groupedByOperator[opNum]) {
        groupedByOperator[opNum] = [];
      }
      groupedByOperator[opNum].push(loc);
    });

    Object.keys(groupedByOperator).forEach(operatorNum => {
      const locs = groupedByOperator[operatorNum];
      console.log(`\n📱 Operador: ${operatorNum} (${locs.length} ubicaciones)`);
      console.log('-'.repeat(100));
      
      locs.forEach((loc, index) => {
        const fecha = new Date(loc.captured_at);
        const hace = Math.floor((Date.now() - fecha.getTime()) / 60000);
        
        console.log(`   ${index + 1}. ID: ${loc.id}`);
        console.log(`      📍 Coordenadas: ${loc.latitude}, ${loc.longitude}`);
        console.log(`      🕐 Capturada: ${fecha.toLocaleString('es-MX')} (hace ${hace} min)`);
        console.log(`      📱 Device: ${loc.device_id?.substring(0, 30)}...`);
        console.log('');
      });
    });

    console.log('\n' + '='.repeat(100));
    console.log('\n📊 Resumen por operador:');
    Object.keys(groupedByOperator).forEach(operatorNum => {
      const count = groupedByOperator[operatorNum].length;
      const ultima = groupedByOperator[operatorNum][0];
      const hace = Math.floor((Date.now() - new Date(ultima.captured_at).getTime()) / 60000);
      console.log(`   ${operatorNum}: ${count} ubicaciones (última hace ${hace} min)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

mostrarUbicaciones();
