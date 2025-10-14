/**
 * Script para verificar el estado actual de la tabla locations
 * Verifica si los cambios de la app móvil están funcionando correctamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificarEstadoLocations() {
  console.log('🔍 VERIFICANDO ESTADO ACTUAL DE LA TABLA LOCATIONS...\n');
  
  try {
    // 1. Contar total de registros
    const { data: allRecords, error: countError } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (countError) {
      console.error('❌ Error al consultar locations:', countError);
      return;
    }

    console.log('📊 ESTADÍSTICAS GENERALES:');
    console.log('─'.repeat(80));
    console.log(`Total de registros: ${allRecords.length}`);
    
    // 2. Contar operadores únicos
    const uniqueOperators = new Set();
    const uniqueOperatorNumbers = new Set();
    
    allRecords.forEach(record => {
      if (record.operator_id) uniqueOperators.add(record.operator_id);
      if (record.operator_number) uniqueOperatorNumbers.add(record.operator_number);
    });
    
    console.log(`Operadores únicos (por operator_id): ${uniqueOperators.size}`);
    console.log(`Operadores únicos (por operator_number): ${uniqueOperatorNumbers.size}`);
    console.log(`Promedio de registros por operador: ${(allRecords.length / uniqueOperators.size).toFixed(2)}`);
    console.log('');

    // 3. Verificar estructura de datos
    console.log('🔍 VERIFICANDO ESTRUCTURA DE DATOS:');
    console.log('─'.repeat(80));
    
    const sample = allRecords[0];
    if (sample) {
      console.log('Campos presentes en el último registro:');
      console.log(`  ✓ operator_id: ${sample.operator_id ? '✅ Presente' : '❌ Faltante'} ${sample.operator_id ? `(${sample.operator_id.substring(0, 8)}...)` : ''}`);
      console.log(`  ✓ operator_number: ${sample.operator_number ? '✅ Presente' : '❌ Faltante'} ${sample.operator_number ? `(${sample.operator_number})` : ''}`);
      console.log(`  ✓ latitude: ${sample.latitude ? '✅ Presente' : '❌ Faltante'}`);
      console.log(`  ✓ longitude: ${sample.longitude ? '✅ Presente' : '❌ Faltante'}`);
      console.log(`  ✓ accuracy: ${sample.accuracy !== null && sample.accuracy !== undefined ? '✅ Presente' : '❌ Faltante'} ${sample.accuracy ? `(${sample.accuracy}m)` : ''}`);
      console.log(`  ✓ speed: ${sample.speed !== null && sample.speed !== undefined ? '✅ Presente' : '❌ Faltante'} ${sample.speed ? `(${sample.speed} m/s)` : ''}`);
      console.log(`  ✓ altitude: ${sample.altitude !== null && sample.altitude !== undefined ? '✅ Presente' : '❌ Faltante'} ${sample.altitude ? `(${sample.altitude}m)` : ''}`);
      console.log(`  ✓ heading: ${sample.heading !== null && sample.heading !== undefined ? '✅ Presente' : '❌ Faltante'} ${sample.heading ? `(${sample.heading}°)` : ''}`);
      console.log(`  ✓ device_id: ${sample.device_id ? '✅ Presente' : '❌ Faltante'}`);
      console.log(`  ✓ captured_at: ${sample.captured_at ? '✅ Presente' : '❌ Faltante'}`);
      console.log(`  ✓ updated_at: ${sample.updated_at ? '✅ Presente' : '❌ Faltante'}`);
    }
    console.log('');

    // 4. Verificar si operator_id tiene formato UUID correcto
    console.log('🔍 VERIFICANDO FORMATO DE OPERATOR_ID:');
    console.log('─'.repeat(80));
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const operatorNumberRegex = /^OP\d+$/i;
    
    let correctUUIDs = 0;
    let operatorNumbersInUUID = 0;
    let otherFormats = 0;
    
    allRecords.forEach(record => {
      if (uuidRegex.test(record.operator_id)) {
        correctUUIDs++;
      } else if (operatorNumberRegex.test(record.operator_id)) {
        operatorNumbersInUUID++;
      } else {
        otherFormats++;
      }
    });
    
    console.log(`✅ Registros con UUID correcto en operator_id: ${correctUUIDs}`);
    console.log(`❌ Registros con número de operador en operator_id: ${operatorNumbersInUUID}`);
    console.log(`⚠️  Registros con otro formato: ${otherFormats}`);
    console.log('');

    // 5. Verificar si hay duplicados (debería ser 0 con UNIQUE constraint)
    console.log('🔍 VERIFICANDO DUPLICADOS:');
    console.log('─'.repeat(80));
    
    const operatorCounts = {};
    allRecords.forEach(record => {
      const opId = record.operator_id || 'null';
      operatorCounts[opId] = (operatorCounts[opId] || 0) + 1;
    });
    
    const duplicates = Object.entries(operatorCounts).filter(([id, count]) => count > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados - Constraint UNIQUE funcionando correctamente');
    } else {
      console.log('⚠️  Se encontraron duplicados:');
      duplicates.forEach(([opId, count]) => {
        console.log(`   - ${opId}: ${count} registros`);
      });
    }
    console.log('');

    // 6. Mostrar últimos 10 registros
    console.log('📋 ÚLTIMOS 10 REGISTROS (más recientes):');
    console.log('─'.repeat(80));
    
    allRecords.slice(0, 10).forEach((record, index) => {
      const isUUID = uuidRegex.test(record.operator_id);
      const opIdDisplay = record.operator_id 
        ? (isUUID ? record.operator_id.substring(0, 13) + '...' : record.operator_id)
        : 'null';
      
      console.log(`${index + 1}. ${record.operator_number || 'N/A'} | ${opIdDisplay} ${isUUID ? '✅' : '❌'}`);
      console.log(`   Coords: ${record.latitude}, ${record.longitude}`);
      console.log(`   Accuracy: ${record.accuracy || 'N/A'}m | Speed: ${record.speed || 'N/A'}m/s`);
      console.log(`   Created: ${new Date(record.created_at).toLocaleString('es-MX')}`);
      console.log(`   Updated: ${record.updated_at ? new Date(record.updated_at).toLocaleString('es-MX') : 'N/A'}`);
      console.log('');
    });

    // 7. Análisis de actualización vs creación
    console.log('📊 ANÁLISIS DE ACTUALIZACIONES:');
    console.log('─'.repeat(80));
    
    const recordsWithUpdates = allRecords.filter(r => r.updated_at && r.updated_at !== r.created_at);
    const timeDifferences = recordsWithUpdates.map(r => {
      const created = new Date(r.created_at);
      const updated = new Date(r.updated_at);
      return (updated - created) / 1000; // segundos
    });
    
    if (timeDifferences.length > 0) {
      const avgDiff = timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length;
      console.log(`Registros actualizados (UPSERT): ${recordsWithUpdates.length}`);
      console.log(`Registros solo creados (INSERT): ${allRecords.length - recordsWithUpdates.length}`);
      console.log(`Tiempo promedio entre creación y última actualización: ${avgDiff.toFixed(0)} segundos`);
    } else {
      console.log(`Registros actualizados (UPSERT): 0`);
      console.log(`Todos los registros fueron creados recientemente (no actualizados aún)`);
    }
    console.log('');

    // 8. Diagnóstico final
    console.log('🎯 DIAGNÓSTICO FINAL:');
    console.log('─'.repeat(80));
    
    if (correctUUIDs === allRecords.length && allRecords.length === uniqueOperators.size) {
      console.log('✅✅✅ PERFECTO - Todo funciona correctamente:');
      console.log('  ✅ Todos los operator_id son UUID válidos');
      console.log('  ✅ No hay duplicados');
      console.log('  ✅ 1 registro por operador (UPSERT funcionando)');
    } else if (correctUUIDs > 0 && operatorNumbersInUUID > 0) {
      console.log('⚠️  TRANSICIÓN EN PROGRESO:');
      console.log(`  ✅ ${correctUUIDs} registros nuevos con UUID correcto`);
      console.log(`  ❌ ${operatorNumbersInUUID} registros antiguos con número en operator_id`);
      console.log('  💡 La app está enviando datos correctamente, pero hay registros antiguos');
      console.log('  📝 Recomendación: Esperar a que los registros antiguos sean reemplazados');
    } else if (operatorNumbersInUUID === allRecords.length) {
      console.log('❌ LA APP AÚN NO ESTÁ ENVIANDO UUID:');
      console.log('  ❌ Todos los registros tienen número de operador en operator_id');
      console.log('  ❌ Los cambios en Android Studio no se han aplicado correctamente');
      console.log('  📝 Recomendación: Verificar que la app esté usando operatorUUID');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar verificación
verificarEstadoLocations()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
