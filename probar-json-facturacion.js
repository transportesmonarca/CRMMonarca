// Script de prueba para la nueva estructura JSON de facturación
// Ejecutar con: node probar-json-facturacion.js

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuración de Supabase (usar variables de entorno en producción)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(texto) {
  return new Promise(resolve => rl.question(texto, resolve));
}

async function probarEstructuraJSON() {
  console.log('🧪 Probando nueva estructura JSON para facturación\n');
  
  try {
    // 1. Verificar si las columnas JSON existen
    console.log('1. Verificando estructura de la tabla...');
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'embarques' })
      .catch(() => null);
    
    if (!colError && columns) {
      const hasFacturasJson = columns.some(col => col.column_name === 'facturas_json');
      console.log(`   ✅ Columna facturas_json: ${hasFacturasJson ? 'Existe' : 'No existe'}`);
    }
    
    // 2. Buscar embarque de prueba
    console.log('\n2. Buscando embarque para prueba...');
    const { data: embarques, error: embarqueError } = await supabase
      .from('embarques')
      .select('id, folio, facturas_json')
      .limit(5);
    
    if (embarqueError) {
      console.error('Error buscando embarques:', embarqueError.message);
      return;
    }
    
    if (!embarques || embarques.length === 0) {
      console.log('   ❌ No se encontraron embarques');
      return;
    }
    
    console.log(`   ✅ Encontrados ${embarques.length} embarques`);
    embarques.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.folio} - JSON: ${e.facturas_json ? JSON.stringify(e.facturas_json) : 'null'}`);
    });
    
    // 3. Seleccionar embarque para prueba
    const respuesta = await pregunta('\n¿Qué embarque usar para prueba? (número): ');
    const indice = parseInt(respuesta) - 1;
    
    if (indice < 0 || indice >= embarques.length) {
      console.log('Índice inválido');
      return;
    }
    
    const embarquePrueba = embarques[indice];
    console.log(`\n3. Usando embarque: ${embarquePrueba.folio}`);
    
    // 4. Crear datos de prueba JSON
    const facturasPrueba = [
      {
        numero: 'FACT-001-TEST',
        fecha_envio: '2025-01-15',
        fecha_pago: '2025-01-30',
        referencia: 'REF-001'
      },
      {
        numero: 'FACT-002-TEST',
        fecha_envio: '2025-02-15',
        fecha_pago: null,
        referencia: 'REF-002'
      }
    ];
    
    console.log('   Datos de prueba:', JSON.stringify(facturasPrueba, null, 2));
    
    const confirmar = await pregunta('\n¿Actualizar este embarque con datos de prueba? (s/n): ');
    if (confirmar.toLowerCase() !== 's') {
      console.log('Prueba cancelada');
      return;
    }
    
    // 5. Actualizar con estructura JSON
    console.log('\n4. Actualizando con estructura JSON...');
    const { data: updateResult, error: updateError } = await supabase
      .from('embarques')
      .update({
        facturas_json: facturasPrueba,
        // También actualizar campos legacy para compatibilidad
        folio_factura_1: facturasPrueba[0]?.numero || null,
        folio_factura_2: facturasPrueba[1]?.numero || null,
        fecha_envio_cliente_1: facturasPrueba[0]?.fecha_envio || null,
        fecha_envio_cliente_2: facturasPrueba[1]?.fecha_envio || null,
        fecha_pago_1: facturasPrueba[0]?.fecha_pago || null,
        fecha_pago_2: facturasPrueba[1]?.fecha_pago || null,
        referencia_pago_1: facturasPrueba[0]?.referencia || null,
        referencia_pago_2: facturasPrueba[1]?.referencia || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', embarquePrueba.id)
      .select();
    
    if (updateError) {
      console.error('   ❌ Error actualizando:', updateError.message);
      return;
    }
    
    console.log('   ✅ Embarque actualizado exitosamente');
    
    // 6. Verificar datos guardados
    console.log('\n5. Verificando datos guardados...');
    const { data: verificacion, error: verError } = await supabase
      .from('embarques')
      .select('folio, facturas_json, fecha_envio_cliente, referencia_pago')
      .eq('id', embarquePrueba.id)
      .single();
    
    if (verError) {
      console.error('   ❌ Error verificando:', verError.message);
      return;
    }
    
    console.log('   📄 Datos verificados:');
    console.log('   JSON:', JSON.stringify(verificacion.facturas_json, null, 4));
    console.log('   Campo fecha_envio_cliente:', verificacion.fecha_envio_cliente);
    console.log('   Campo referencia_pago:', verificacion.referencia_pago);
    
    // 7. Probar búsqueda por JSON
    console.log('\n6. Probando búsqueda por número de factura...');
    const { data: busqueda, error: busquedaError } = await supabase
      .from('embarques')
      .select('folio, facturas_json')
      .contains('facturas_json', [{ numero: 'FACT-001-TEST' }]);
    
    if (busquedaError) {
      console.error('   ❌ Error en búsqueda:', busquedaError.message);
    } else {
      console.log(`   ✅ Búsqueda exitosa: ${busqueda?.length || 0} resultados`);
      busqueda?.forEach(e => {
        console.log(`      - ${e.folio}: ${e.facturas_json?.length || 0} facturas`);
      });
    }
    
    // 8. Limpiar datos de prueba
    const limpiar = await pregunta('\n¿Limpiar datos de prueba? (s/n): ');
    if (limpiar.toLowerCase() === 's') {
      console.log('\n7. Limpiando datos de prueba...');
      const { error: cleanError } = await supabase
        .from('embarques')
        .update({
          facturas_json: null,
          fecha_envio_cliente: null,
          fecha_pago: null,
          referencia_pago: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', embarquePrueba.id);
      
      if (cleanError) {
        console.error('   ❌ Error limpiando:', cleanError.message);
      } else {
        console.log('   ✅ Datos limpiados');
      }
    }
    
    console.log('\n🎉 Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    rl.close();
  }
}

async function mostrarEstructuraActual() {
  console.log('📊 Analizando estructura actual de facturación...\n');
  
  try {
    // Contar embarques con datos JSON
    const { data: jsonData, error: jsonError } = await supabase
      .from('embarques')
      .select('id')
      .not('facturas_json', 'is', null);
    
    // Contar total de embarques
    const { data: total, error: totalError } = await supabase
      .from('embarques')
      .select('id', { count: 'exact' });
    
    console.log(`Total de embarques: ${total?.length || 0}`);
    console.log(`Embarques con datos JSON: ${jsonData?.length || 0}`);
    
    // Mostrar ejemplo de estructura JSON
    if (jsonData && jsonData.length > 0) {
      const { data: ejemplo, error: ejemploError } = await supabase
        .from('embarques')
        .select('folio, facturas_json')
        .not('facturas_json', 'is', null)
        .limit(1)
        .single();
      
      if (ejemplo) {
        console.log('\nEjemplo de estructura JSON:');
        console.log(`  Folio: ${ejemplo.folio}`);
        console.log(`  Facturas JSON:`, JSON.stringify(ejemplo.facturas_json, null, 2));
      }
    }
    
    // Verificar si existen columnas legacy (después de la migración no deberían existir)
    try {
      const { data: testLegacy } = await supabase
        .from('embarques')
        .select('folio_factura_1')
        .limit(1);
      
      if (testLegacy) {
        console.log('\n⚠️  Advertencia: Las columnas legacy aún existen. La migración no se ha ejecutado.');
      }
    } catch (legacyError) {
      console.log('\n✅ Confirmado: Las columnas legacy han sido eliminadas correctamente.');
    }
    
  } catch (error) {
    console.error('Error analizando estructura:', error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  HERRAMIENTA DE MIGRACIÓN - FACTURACIÓN JSON');
  console.log('='.repeat(60));
  
  const opciones = [
    '1. Analizar estructura actual',
    '2. Probar nueva estructura JSON',
    '3. Salir'
  ];
  
  console.log('\nOpciones disponibles:');
  opciones.forEach(opcion => console.log(opcion));
  
  const seleccion = await pregunta('\nSelecciona una opción: ');
  
  switch (seleccion) {
    case '1':
      await mostrarEstructuraActual();
      break;
    case '2':
      await probarEstructuraJSON();
      break;
    case '3':
      console.log('👋 ¡Hasta luego!');
      break;
    default:
      console.log('Opción inválida');
  }
  
  rl.close();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  probarEstructuraJSON,
  mostrarEstructuraActual
};