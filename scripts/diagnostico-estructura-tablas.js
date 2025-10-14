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

console.log('🔍 DIAGNÓSTICO DE ESTRUCTURA DE TABLAS\n');

async function diagnosticar() {
  // 1. Ver estructura de embarques
  console.log('1️⃣ Estructura de tabla embarques:');
  const { data: emb, error: embError } = await supabase
    .from('embarques')
    .select('*')
    .limit(1);
  
  if (!embError && emb && emb.length > 0) {
    console.log('✅ Columnas:', Object.keys(emb[0]).join(', '));
  } else {
    console.log('❌ Error:', embError?.message);
  }

  // 2. Ver estructura de operadores
  console.log('\n2️⃣ Estructura de tabla operadores:');
  const { data: ops, error: opsError } = await supabase
    .from('operadores')
    .select('*')
    .limit(1);
  
  if (!opsError && ops && ops.length > 0) {
    console.log('✅ Columnas:', Object.keys(ops[0]).join(', '));
  } else {
    console.log('❌ Error:', opsError?.message);
  }

  // 3. Buscar embarques con operador asignado (sin join complejo)
  console.log('\n3️⃣ Embarques con operador_id asignado:');
  const { data: embarques, error: e3 } = await supabase
    .from('embarques')
    .select('id, folio, operador_id, operator_number, estado')
    .not('operador_id', 'is', null)
    .limit(5);
  
  if (!e3 && embarques) {
    console.log(`✅ Encontrados: ${embarques.length}`);
    embarques.forEach(e => {
      console.log(`   Embarque: ${e.folio}, Operador ID: ${e.operador_id}, Operator Number: ${e.operator_number}, Estado: ${e.estado}`);
    });

    // 4. Para cada embarque, buscar el operador
    if (embarques.length > 0) {
      console.log('\n4️⃣ Buscando datos de operadores:');
      for (const embarque of embarques) {
        // Usar operator_number directamente si existe en embarques
        if (embarque.operator_number) {
          console.log(`   Embarque ${embarque.folio} tiene operator_number: ${embarque.operator_number}`);
          
          // Verificar si tiene ubicación
          const { data: ubicacion } = await supabase
            .from('locations')
            .select('latitude, longitude, captured_at')
            .eq('operator_number', embarque.operator_number)
            .order('captured_at', { ascending: false })
            .limit(1)
            .single();
          
          if (ubicacion) {
            console.log(`      ✅ Tiene ubicación: Lat ${ubicacion.latitude}, Lng ${ubicacion.longitude}`);
            console.log(`      📅 Capturada: ${new Date(ubicacion.captured_at).toLocaleString()}`);
          } else {
            console.log(`      ⚠️  Sin ubicación en la tabla locations`);
          }
        } else {
          // Buscar en tabla operadores
          const { data: operador } = await supabase
            .from('operadores')
            .select('id, operator_number, nombre')
            .eq('id', embarque.operador_id)
            .single();
          
          if (operador) {
            console.log(`   Operador ID ${operador.id}: ${operador.operator_number} - ${operador.nombre}`);
            
            // Verificar si tiene ubicación
            const { data: ubicacion } = await supabase
              .from('locations')
              .select('latitude, longitude, captured_at')
              .eq('operator_number', operador.operator_number)
              .order('captured_at', { ascending: false })
              .limit(1)
              .single();
            
            if (ubicacion) {
              console.log(`      ✅ Tiene ubicación: Lat ${ubicacion.latitude}, Lng ${ubicacion.longitude}`);
            } else {
              console.log(`      ⚠️  Sin ubicación en la tabla locations`);
            }
          }
        }
      }
    }
  } else {
    console.log('❌ Error:', e3?.message);
  }

  console.log('\n✅ Diagnóstico completado');
}

diagnosticar();
