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

console.log('🧪 PRUEBA: Buscar ubicación de OP007 con la nueva lógica\n');
console.log('='.repeat(80));

async function probar() {
  try {
    const operatorNumber = 'OP007';
    
    // 1. Obtener operador
    console.log('\n1️⃣ Obteniendo operador OP007...');
    const { data: operador } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number')
      .eq('operator_number', operatorNumber)
      .single();

    if (!operador) {
      console.error('❌ No se encontró el operador');
      return;
    }

    console.log(`✅ Operador: ${operador.nombre} ${operador.apellidos}`);
    console.log(`   UUID: ${operador.id}`);

    // 2. Buscar por UUID (método correcto)
    console.log('\n2️⃣ Buscando ubicación por operator_id (UUID)...');
    const { data: porUuid } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_id', operador.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (porUuid) {
      console.log('✅ Encontrado por UUID:');
      console.log(`   Lat: ${porUuid.latitude}, Lng: ${porUuid.longitude}`);
      console.log(`   Capturada: ${new Date(porUuid.captured_at).toLocaleString('es-MX')}`);
    } else {
      console.log('⚠️  No encontrado por UUID');
    }

    // 3. Buscar por operator_number
    console.log('\n3️⃣ Buscando por operator_number...');
    const { data: porNumber } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_number', operatorNumber)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (porNumber) {
      console.log('✅ Encontrado por operator_number:');
      console.log(`   Lat: ${porNumber.latitude}, Lng: ${porNumber.longitude}`);
      console.log(`   Capturada: ${new Date(porNumber.captured_at).toLocaleString('es-MX')}`);
    } else {
      console.log('⚠️  No encontrado por operator_number');
    }

    // 4. Buscar en operator_id por el número (fallback)
    console.log('\n4️⃣ Buscando en operator_id por el número (fallback)...');
    const { data: fallback } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_id', operatorNumber)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallback) {
      console.log('✅ Encontrado en fallback (operator_id contiene el número):');
      console.log(`   Lat: ${fallback.latitude}, Lng: ${fallback.longitude}`);
      console.log(`   Capturada: ${new Date(fallback.captured_at).toLocaleString('es-MX')}`);
      const hace = Math.floor((Date.now() - new Date(fallback.captured_at).getTime()) / 60000);
      console.log(`   Hace: ${hace} minutos`);
    } else {
      console.log('⚠️  No encontrado en fallback');
    }

    // 5. Resumen
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMEN:');
    
    const encontrada = porUuid || porNumber || fallback;
    
    if (encontrada) {
      console.log('✅ SE ENCONTRÓ UBICACIÓN');
      console.log(`   Método: ${porUuid ? 'UUID' : porNumber ? 'operator_number' : 'fallback'}`);
      console.log(`   Coordenadas: ${encontrada.latitude}, ${encontrada.longitude}`);
      const hace = Math.floor((Date.now() - new Date(encontrada.captured_at).getTime()) / 60000);
      console.log(`   Antigüedad: ${hace} minutos`);
      console.log('\n🎯 La función obtenerUltimaUbicacionOperador() debería funcionar ahora');
      console.log('   Ve a: http://localhost:3002/asignar-operadores');
      console.log('   Busca: TIM-2510-004');
      console.log('   Click en: "Ubicación del Operador"');
    } else {
      console.log('❌ NO SE ENCONTRÓ UBICACIÓN');
      console.log('   La app móvil no ha enviado ubicaciones aún');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

probar();
