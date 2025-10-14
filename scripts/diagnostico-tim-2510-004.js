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

console.log('🔍 DIAGNÓSTICO: TIM-2510-004 y Operador OP007\n');
console.log('='.repeat(80));

async function diagnosticar() {
  try {
    // 1. Verificar embarque TIM-2510-004
    console.log('\n1️⃣ Verificando embarque TIM-2510-004...');
    const { data: embarque, error: embError } = await supabase
      .from('embarques')
      .select('id, folio, operador_id, operator_number, estado')
      .eq('folio', 'TIM-2510-004')
      .single();

    if (embError) {
      console.error('❌ Error al consultar embarque:', embError);
      return;
    }

    if (!embarque) {
      console.error('❌ No se encontró el embarque TIM-2510-004');
      return;
    }

    console.log('✅ Embarque encontrado:');
    console.log(`   Folio: ${embarque.folio}`);
    console.log(`   Estado: ${embarque.estado}`);
    console.log(`   Operador ID: ${embarque.operador_id}`);
    console.log(`   Operator Number en embarque: ${embarque.operator_number}`);

    // 2. Verificar operador OP007
    console.log('\n2️⃣ Verificando operador OP007...');
    const { data: operador, error: opError } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number, telefono')
      .eq('operator_number', 'OP007')
      .single();

    if (opError) {
      console.error('❌ Error al consultar operador:', opError);
      return;
    }

    if (!operador) {
      console.error('❌ No se encontró el operador OP007');
      return;
    }

    console.log('✅ Operador encontrado:');
    console.log(`   ID: ${operador.id}`);
    console.log(`   Nombre: ${operador.nombre} ${operador.apellidos || ''}`);
    console.log(`   Operator Number: ${operador.operator_number}`);
    console.log(`   Teléfono: ${operador.telefono || 'No disponible'}`);

    // 3. Verificar si el embarque está asignado al operador correcto
    console.log('\n3️⃣ Verificando asignación...');
    if (embarque.operador_id === operador.id) {
      console.log('✅ El embarque está correctamente asignado al operador');
    } else {
      console.warn('⚠️  El embarque NO está asignado a este operador');
      console.log(`   Embarque.operador_id: ${embarque.operador_id}`);
      console.log(`   Operador OP007 ID: ${operador.id}`);
    }

    // 4. Verificar operator_number en embarque
    console.log('\n4️⃣ Verificando operator_number en embarque...');
    if (embarque.operator_number === 'OP007') {
      console.log('✅ El operator_number en el embarque es correcto');
    } else {
      console.warn('⚠️  El operator_number en el embarque NO coincide');
      console.log(`   Actual: ${embarque.operator_number}`);
      console.log(`   Esperado: OP007`);
      
      // Actualizar
      console.log('\n   🔧 Actualizando operator_number en embarque...');
      const { error: updateError } = await supabase
        .from('embarques')
        .update({ operator_number: 'OP007' })
        .eq('id', embarque.id);
      
      if (updateError) {
        console.error('   ❌ Error al actualizar:', updateError);
      } else {
        console.log('   ✅ Actualizado correctamente');
      }
    }

    // 5. Verificar ubicaciones del operador OP007
    console.log('\n5️⃣ Verificando ubicaciones de OP007...');
    const { data: ubicaciones, error: ubError } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_number', 'OP007')
      .order('captured_at', { ascending: false })
      .limit(5);

    if (ubError) {
      console.error('❌ Error al consultar ubicaciones:', ubError);
      return;
    }

    if (!ubicaciones || ubicaciones.length === 0) {
      console.warn('⚠️  No se encontraron ubicaciones para OP007');
      console.log('\n   💡 Posibles razones:');
      console.log('   - La app móvil no ha enviado ubicaciones aún');
      console.log('   - El operator_number en la app es diferente');
      console.log('   - Hay un problema de conectividad');
    } else {
      console.log(`✅ Se encontraron ${ubicaciones.length} ubicaciones`);
      console.log('\n   📍 Últimas ubicaciones:');
      ubicaciones.forEach((loc, index) => {
        const fecha = new Date(loc.captured_at);
        const hace = Math.floor((Date.now() - fecha.getTime()) / 60000);
        console.log(`   ${index + 1}. Lat: ${loc.latitude}, Lng: ${loc.longitude}`);
        console.log(`      Capturada: ${fecha.toLocaleString('es-MX')}`);
        console.log(`      Hace: ${hace} minutos`);
        console.log(`      Device: ${loc.device_id?.substring(0, 20)}...`);
        console.log('');
      });
    }

    // 6. Resumen y recomendaciones
    console.log('='.repeat(80));
    console.log('\n📋 RESUMEN:');
    console.log(`   Embarque: ${embarque.folio}`);
    console.log(`   Operador: ${operador.nombre} ${operador.apellidos || ''} (${operador.operator_number})`);
    console.log(`   Ubicaciones disponibles: ${ubicaciones?.length || 0}`);
    
    if (ubicaciones && ubicaciones.length > 0) {
      const ultima = ubicaciones[0];
      const hace = Math.floor((Date.now() - new Date(ultima.captured_at).getTime()) / 60000);
      console.log(`\n✅ Sistema funcionando correctamente`);
      console.log(`   Última ubicación: hace ${hace} minutos`);
      console.log(`   Coordenadas: ${ultima.latitude}, ${ultima.longitude}`);
      console.log(`\n🎯 Acción sugerida:`);
      console.log(`   1. Ve a http://localhost:3002/asignar-operadores`);
      console.log(`   2. Busca el embarque TIM-2510-004`);
      console.log(`   3. Click en "Ubicación del Operador"`);
      console.log(`   4. Deberías ver el mapa con la ubicación actual`);
    } else {
      console.log(`\n⚠️  No hay ubicaciones disponibles`);
      console.log(`\n🔧 Acción sugerida:`);
      console.log(`   1. Verifica que la app móvil esté enviando con operator_number: "OP007"`);
      console.log(`   2. Verifica la conexión del dispositivo`);
      console.log(`   3. Revisa los logs de la app móvil Android`);
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

diagnosticar();
