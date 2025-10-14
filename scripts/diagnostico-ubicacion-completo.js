import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DIAGNÓSTICO COMPLETO DE UBICACIÓN DE OPERADORES\n');
console.log('='.repeat(80));

async function diagnosticar() {
  try {
    // 1. Verificar tabla locations
    console.log('\n1️⃣ Verificando tabla locations...');
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(10);

    if (locError) {
      console.error('❌ Error al consultar locations:', locError);
    } else {
      console.log(`✅ Ubicaciones encontradas: ${locations.length}`);
      if (locations.length > 0) {
        console.log('\n📍 Últimas ubicaciones:');
        locations.forEach(loc => {
          console.log(`   Operador: ${loc.operator_number} | Lat: ${loc.latitude}, Lng: ${loc.longitude} | ${new Date(loc.captured_at).toLocaleString()}`);
        });
      }
    }

    // 2. Verificar embarques con operador asignado
    console.log('\n2️⃣ Verificando embarques con operador...');
    const { data: embarques, error: embError } = await supabase
      .from('embarques')
      .select(`
        embarque_id,
        estado,
        operador:operadores!embarques_operador_id_fkey (
          operador_id,
          operator_number,
          nombre
        )
      `)
      .not('operador_id', 'is', null)
      .limit(10);

    if (embError) {
      console.error('❌ Error al consultar embarques:', embError);
    } else {
      console.log(`✅ Embarques con operador: ${embarques.length}`);
      if (embarques.length > 0) {
        console.log('\n🚚 Embarques encontrados:');
        embarques.forEach(emb => {
          const op = emb.operador;
          console.log(`   Embarque: ${emb.embarque_id} | Operador: ${op?.operator_number || 'N/A'} (${op?.nombre || 'Sin nombre'})`);
        });
      }
    }

    // 3. Cruzar datos: buscar embarques cuyo operador tenga ubicación
    console.log('\n3️⃣ Cruzando datos: embarques con ubicación disponible...');
    if (embarques && embarques.length > 0 && locations && locations.length > 0) {
      const operadoresConUbicacion = new Set(locations.map(l => l.operator_number));
      const embarquesConUbicacion = embarques.filter(e => 
        e.operador && operadoresConUbicacion.has(e.operador.operator_number)
      );
      
      console.log(`✅ Embarques con ubicación disponible: ${embarquesConUbicacion.length}`);
      if (embarquesConUbicacion.length > 0) {
        console.log('\n🎯 Coincidencias encontradas:');
        embarquesConUbicacion.forEach(emb => {
          const op = emb.operador;
          const ubicacion = locations.find(l => l.operator_number === op.operator_number);
          console.log(`   Embarque: ${emb.embarque_id}`);
          console.log(`   Operador: ${op.operator_number} (${op.nombre})`);
          console.log(`   Ubicación: Lat ${ubicacion.latitude}, Lng ${ubicacion.longitude}`);
          console.log(`   Capturada: ${new Date(ubicacion.captured_at).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No hay coincidencias entre operadores asignados y ubicaciones');
        console.log('\n📋 Operadores con ubicación:');
        locations.forEach(l => console.log(`   - ${l.operator_number}`));
        console.log('\n📋 Operadores asignados:');
        embarques.forEach(e => {
          if (e.operador) console.log(`   - ${e.operador.operator_number}`);
        });
      }
    }

    // 4. Verificar estructura de la tabla locations
    console.log('\n4️⃣ Verificando estructura de la tabla locations...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('locations')
      .select('*')
      .limit(1);
    
    if (!tableError && tableInfo && tableInfo.length > 0) {
      console.log('✅ Columnas en locations:', Object.keys(tableInfo[0]).join(', '));
    }

    // 5. Verificar que los operadores existan en la tabla operadores
    console.log('\n5️⃣ Verificando operadores en la tabla operadores...');
    const operadoresNumerosConUbicacion = locations ? locations.map(l => l.operator_number) : [];
    if (operadoresNumerosConUbicacion.length > 0) {
      const { data: operadores, error: opError } = await supabase
        .from('operadores')
        .select('operador_id, operator_number, nombre')
        .in('operator_number', operadoresNumerosConUbicacion);
      
      if (!opError && operadores) {
        console.log(`✅ Operadores encontrados: ${operadores.length}/${operadoresNumerosConUbicacion.length}`);
        operadores.forEach(op => {
          console.log(`   - ${op.operator_number}: ${op.nombre} (ID: ${op.operador_id})`);
        });
        
        // Verificar si faltan operadores
        const operadoresEncontrados = new Set(operadores.map(o => o.operator_number));
        const faltantes = operadoresNumerosConUbicacion.filter(num => !operadoresEncontrados.has(num));
        if (faltantes.length > 0) {
          console.log('\n⚠️  Operadores con ubicación pero sin registro en tabla operadores:');
          faltantes.forEach(num => console.log(`   - ${num}`));
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

diagnosticar();
