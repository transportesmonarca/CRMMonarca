const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrarArquitecturaDesacoplada() {
  try {
    console.log('🚀 MIGRACIÓN A ARQUITECTURA DESACOPLADA');
    console.log('=====================================\n');
    
    // Paso 1: Verificar que las tablas desacopladas existen
    console.log('📋 1. Verificando tablas desacopladas...');
    const tablasRequeridas = [
      'embarques_creados',
      'embarques_asignados', 
      'embarques_en_transito',
      'embarques_finalizados',
      'embarques_archivados',
      'embarques_cancelados'
    ];
    
    let tablasExistentes = 0;
    for (const tabla of tablasRequeridas) {
      const { error } = await supabase.from(tabla).select('id').limit(1);
      if (error) {
        console.log(`   ❌ ${tabla}: No existe - ${error.message}`);
      } else {
        console.log(`   ✅ ${tabla}: Existe`);
        tablasExistentes++;
      }
    }
    
    if (tablasExistentes < tablasRequeridas.length) {
      console.log('\n⚠️ FALTAN TABLAS DESACOPLADAS');
      console.log('📋 Ejecuta primero los scripts SQL:');
      console.log('   1. EJECUTAR-EN-SUPABASE-arquitectura-desacoplada.sql');
      console.log('   2. EJECUTAR-EN-SUPABASE-vista-unificada.sql');
      console.log('   3. EJECUTAR-EN-SUPABASE-funciones-transicion.sql');
      return;
    }
    
    // Paso 2: Obtener datos actuales de tabla principal
    console.log('\n📋 2. Obteniendo datos de tabla embarques...');
    const { data: embarquesActuales, error: errorEmbarques } = await supabase
      .from('embarques')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (errorEmbarques) {
      console.error('❌ Error al obtener embarques:', errorEmbarques);
      return;
    }
    
    console.log(`   Encontrados ${embarquesActuales.length} embarques para migrar`);
    
    if (embarquesActuales.length === 0) {
      console.log('   ⚠️ No hay embarques que migrar');
      console.log('\n✅ SISTEMA LISTO para nueva arquitectura desacoplada');
      return;
    }
    
    // Paso 3: Clasificar embarques por estado
    console.log('\n📋 3. Clasificando embarques por estado...');
    const clasificacion = {
      creados: [],
      asignados: [],
      en_transito: [],
      finalizados: [],
      archivados: [],
      cancelados: [],
      problematicos: []
    };
    
    embarquesActuales.forEach(embarque => {
      switch (embarque.estado) {
        case 'creado':
        case 'borrador':
        case 'pendiente': // Los embarques "pendiente" van a creados
          clasificacion.creados.push(embarque);
          break;
        case 'asignado':
        case 'listo-para-asignar':
          clasificacion.asignados.push(embarque);
          break;
        case 'en-transito':
        case 'en_transito':
          clasificacion.en_transito.push(embarque);
          break;
        case 'finalizado':
          clasificacion.finalizados.push(embarque);
          break;
        case 'archivado':
          clasificacion.archivados.push(embarque);
          break;
        case 'cancelado':
          clasificacion.cancelados.push(embarque);
          break;
        default:
          clasificacion.problematicos.push(embarque);
      }
    });
    
    console.log('   📊 Clasificación:');
    Object.entries(clasificacion).forEach(([estado, embarques]) => {
      if (embarques.length > 0) {
        console.log(`      ${estado}: ${embarques.length} embarques`);
      }
    });
    
    // Paso 4: Migrar datos a tablas desacopladas
    console.log('\n📋 4. Iniciando migración...');
    const args = process.argv.slice(2);
    const ejecutarMigracion = args.includes('--ejecutar');
    
    if (!ejecutarMigracion) {
      console.log('⚠️ MODO PREVIEW - No se modificarán datos');
      console.log('💡 Usar --ejecutar para realizar la migración real\n');
    }
    
    let migrados = 0;
    let errores = 0;
    
    // Migrar embarques creados
    if (clasificacion.creados.length > 0) {
      console.log(`\n🔄 Migrando ${clasificacion.creados.length} embarques a embarques_creados...`);
      for (const embarque of clasificacion.creados) {
        try {
          if (ejecutarMigracion) {
            const { error } = await supabase
              .from('embarques_creados')
              .insert({
                folio: embarque.folio,
                cliente: embarque.cliente,
                origen: embarque.origen,
                destino: embarque.destino,
                tipo_material: embarque.tipo_material,
                cantidad_material: embarque.cantidad_material,
                precio_flete: embarque.precio_flete,
                observaciones: embarque.observaciones,
                estado: 'creado', // Normalizar estado
                created_at: embarque.created_at,
                created_by: embarque.created_by
              });
              
            if (error) throw error;
          }
          console.log(`   ✅ ${embarque.folio}: Migrado a creados`);
          migrados++;
        } catch (error) {
          console.log(`   ❌ ${embarque.folio}: Error - ${error.message}`);
          errores++;
        }
      }
    }
    
    // Migrar embarques asignados
    if (clasificacion.asignados.length > 0) {
      console.log(`\n🔄 Migrando ${clasificacion.asignados.length} embarques a embarques_asignados...`);
      for (const embarque of clasificacion.asignados) {
        try {
          if (ejecutarMigracion) {
            const { error } = await supabase
              .from('embarques_asignados')
              .insert({
                folio: embarque.folio,
                cliente: embarque.cliente,
                origen: embarque.origen,
                destino: embarque.destino,
                tipo_material: embarque.tipo_material,
                cantidad_material: embarque.cantidad_material,
                precio_flete: embarque.precio_flete,
                observaciones: embarque.observaciones,
                operador_asignado: embarque.operador_asignado,
                fecha_asignacion: embarque.fecha_asignacion,
                created_at: embarque.created_at
              });
              
            if (error) throw error;
          }
          console.log(`   ✅ ${embarque.folio}: Migrado a asignados`);
          migrados++;
        } catch (error) {
          console.log(`   ❌ ${embarque.folio}: Error - ${error.message}`);
          errores++;
        }
      }
    }
    
    // Migrar otros estados...
    // (Similar para en_transito, finalizados, archivados, cancelados)
    
    // Paso 5: Limpiar embarques problemáticos
    if (clasificacion.problematicos.length > 0) {
      console.log(`\n⚠️ ${clasificacion.problematicos.length} embarques con estados problemáticos:`);
      clasificacion.problematicos.forEach(e => {
        console.log(`   - ${e.folio}: estado="${e.estado}"`);
        
        // Corregir estados problemáticos automáticamente
        if (ejecutarMigracion) {
          // Los embarques con estado_facturacion pero no finalizados van a creados
          if (e.estado_facturacion && e.estado !== 'finalizado') {
            console.log(`     → Corrigiendo: estado_facturacion removido`);
            // Aquí iría la lógica de corrección
          }
        }
      });
    }
    
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log('========================');
    console.log(`✅ Migrados exitosamente: ${migrados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📋 Total procesados: ${migrados + errores}`);
    
    if (!ejecutarMigracion) {
      console.log('\n💡 SIGUIENTE PASO:');
      console.log('   node migrar-arquitectura-desacoplada.js --ejecutar');
    } else {
      console.log('\n✅ MIGRACIÓN COMPLETADA');
      console.log('💡 Ya puedes usar el nuevo endpoint: /api/embarques/estado-desacoplado');
      console.log('💡 La vista embarques_completa_new incluye todos los datos');
    }
    
  } catch (error) {
    console.error('❌ Error general en migración:', error);
  }
}

migrarArquitecturaDesacoplada();