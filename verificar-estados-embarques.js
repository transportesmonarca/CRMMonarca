#!/usr/bin/env node

/**
 * Script para verificar y corregir estados inconsistentes de embarques
 * 
 * Casos que verifica:
 * 1. Embarques en "finalizado" sin fecha_finalizacion
 * 2. Embarques recién creados con estado incorrecto
 * 3. Embarques con estado_facturacion sin haber sido finalizados
 * 4. Duplicados por folio
 * 
 * Uso:
 * - node verificar-estados-embarques.js --check  (solo verificar)
 * - node verificar-estados-embarques.js --fix    (corregir automáticamente)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Argumentos de línea de comandos
const args = process.argv.slice(2);
const shouldCheck = args.includes('--check');
const shouldFix = args.includes('--fix');
const targetFolio = args.find(arg => arg.startsWith('--folio='))?.split('=')[1];

if (!shouldCheck && !shouldFix) {
  console.log('Uso:');
  console.log('  node verificar-estados-embarques.js --check              # Solo verificar');
  console.log('  node verificar-estados-embarques.js --fix                # Corregir automáticamente');
  console.log('  node verificar-estados-embarques.js --check --folio=XXX  # Verificar folio específico');
  process.exit(1);
}

async function verificarEmbarques() {
  console.log('🔍 Verificando estados de embarques...\n');

  try {
    // Obtener todos los embarques o uno específico
    let query = supabase
      .from('embarques')
      .select('id, folio, estado, estado_facturacion, fecha_creacion, fecha_finalizacion, updated_at, operador_id, camion_id');
    
    if (targetFolio) {
      query = query.ilike('folio', `%${targetFolio}%`);
    }
    
    const { data: embarques, error } = await query.order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo embarques:', error);
      return;
    }

    console.log(`📊 Analizando ${embarques.length} embarques...\n`);

    const problemas = [];

    // 1. Verificar embarques con estado "finalizado" sin fecha_finalizacion
    const finalizadosSinFecha = embarques.filter(e => 
      e.estado === 'finalizado' && !e.fecha_finalizacion
    );

    if (finalizadosSinFecha.length > 0) {
      console.log(`❌ PROBLEMA 1: ${finalizadosSinFecha.length} embarques "finalizado" sin fecha_finalizacion:`);
      finalizadosSinFecha.forEach(e => {
        console.log(`   - ${e.folio} (ID: ${e.id})`);
        problemas.push({
          tipo: 'finalizado_sin_fecha',
          embarque: e,
          correccion: 'Agregar fecha_finalizacion = updated_at o cambiar estado'
        });
      });
      console.log();
    }

    // 2. Verificar embarques con estado_facturacion sin estar finalizados
    const facturacionSinFinalizar = embarques.filter(e => 
      e.estado_facturacion && e.estado !== 'finalizado'
    );

    if (facturacionSinFinalizar.length > 0) {
      console.log(`❌ PROBLEMA 2: ${facturacionSinFinalizar.length} embarques con estado_facturacion pero no finalizados:`);
      facturacionSinFinalizar.forEach(e => {
        console.log(`   - ${e.folio}: estado="${e.estado}", estado_facturacion="${e.estado_facturacion}"`);
        problemas.push({
          tipo: 'facturacion_sin_finalizar',
          embarque: e,
          correccion: 'Limpiar estado_facturacion o finalizar embarque'
        });
      });
      console.log();
    }

    // 3. Verificar embarques recién creados (últimas 24h) con estado avanzado
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);
    
    const recienCreadosEstadoAvanzado = embarques.filter(e => {
      const fechaCreacion = new Date(e.fecha_creacion);
      return fechaCreacion > hace24h && 
             !e.operador_id && 
             !e.camion_id && 
             ['finalizado', 'en-transito', 'archivado'].includes(e.estado);
    });

    if (recienCreadosEstadoAvanzado.length > 0) {
      console.log(`❌ PROBLEMA 3: ${recienCreadosEstadoAvanzado.length} embarques recién creados con estado avanzado sin recursos:`);
      recienCreadosEstadoAvanzado.forEach(e => {
        console.log(`   - ${e.folio}: estado="${e.estado}", sin operador/camión`);
        problemas.push({
          tipo: 'recien_creado_estado_avanzado',
          embarque: e,
          correccion: 'Cambiar estado a "creado"'
        });
      });
      console.log();
    }

    // 4. Verificar duplicados por folio
    const folioCount = {};
    embarques.forEach(e => {
      if (e.folio) {
        folioCount[e.folio] = (folioCount[e.folio] || 0) + 1;
      }
    });

    const duplicados = Object.entries(folioCount).filter(([folio, count]) => count > 1);
    if (duplicados.length > 0) {
      console.log(`❌ PROBLEMA 4: ${duplicados.length} folios duplicados:`);
      duplicados.forEach(([folio, count]) => {
        console.log(`   - ${folio}: ${count} registros`);
        const embsDuplicados = embarques.filter(e => e.folio === folio);
        embsDuplicados.forEach(e => {
          console.log(`     * ID ${e.id}: estado="${e.estado}", creado=${e.fecha_creacion}`);
        });
        problemas.push({
          tipo: 'duplicados',
          folio: folio,
          embarques: embsDuplicados,
          correccion: 'Revisar manualmente cuál conservar'
        });
      });
      console.log();
    }

    // 5. Caso específico: Verificar TIM 2509-040
    const tim2509040 = embarques.find(e => e.folio && e.folio.includes('2509-040'));
    if (tim2509040) {
      console.log(`🔍 ANÁLISIS ESPECÍFICO: TIM 2509-040`);
      console.log(`   - ID: ${tim2509040.id}`);
      console.log(`   - Estado: ${tim2509040.estado}`);
      console.log(`   - Estado facturación: ${tim2509040.estado_facturacion || 'null'}`);
      console.log(`   - Fecha creación: ${tim2509040.fecha_creacion}`);
      console.log(`   - Fecha finalización: ${tim2509040.fecha_finalizacion || 'null'}`);
      console.log(`   - Tiene operador: ${tim2509040.operador_id ? 'Sí' : 'No'}`);
      console.log(`   - Tiene camión: ${tim2509040.camion_id ? 'Sí' : 'No'}`);
      
      // Verificar si debería estar en "creado"
      const deberiaSerCreado = !tim2509040.operador_id && 
                               !tim2509040.camion_id && 
                               !tim2509040.fecha_finalizacion &&
                               tim2509040.estado !== 'creado';
      
      if (deberiaSerCreado) {
        console.log(`   ❌ PROBLEMA: Debería estar en estado "creado"`);
        problemas.push({
          tipo: 'tim_2509040_estado_incorrecto',
          embarque: tim2509040,
          correccion: 'Cambiar a estado "creado" y limpiar estado_facturacion'
        });
      } else {
        console.log(`   ✅ Estado parece correcto`);
      }
      console.log();
    }

    // Resumen
    console.log(`📋 RESUMEN:`);
    console.log(`   - Total embarques analizados: ${embarques.length}`);
    console.log(`   - Problemas encontrados: ${problemas.length}`);
    
    if (problemas.length === 0) {
      console.log(`   ✅ No se encontraron inconsistencias`);
      return;
    }

    // Aplicar correcciones si se especificó --fix
    if (shouldFix) {
      console.log(`\n🔧 APLICANDO CORRECCIONES...\n`);
      await aplicarCorrecciones(problemas);
    } else {
      console.log(`\n💡 Para aplicar correcciones automáticas, ejecuta:`);
      console.log(`   node verificar-estados-embarques.js --fix`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function aplicarCorrecciones(problemas) {
  let corregidos = 0;
  let errores = 0;

  for (const problema of problemas) {
    try {
      switch (problema.tipo) {
        case 'finalizado_sin_fecha':
          // Agregar fecha_finalizacion basada en updated_at
          const { error: errorFecha } = await supabase
            .from('embarques')
            .update({ 
              fecha_finalizacion: problema.embarque.updated_at,
              updated_at: new Date().toISOString()
            })
            .eq('id', problema.embarque.id);
          
          if (errorFecha) throw errorFecha;
          console.log(`✅ ${problema.embarque.folio}: Agregada fecha_finalizacion`);
          corregidos++;
          break;

        case 'facturacion_sin_finalizar':
          // Limpiar estado_facturacion
          const { error: errorFacturacion } = await supabase
            .from('embarques')
            .update({ 
              estado_facturacion: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', problema.embarque.id);
          
          if (errorFacturacion) throw errorFacturacion;
          console.log(`✅ ${problema.embarque.folio}: Limpiado estado_facturacion`);
          corregidos++;
          break;

        case 'recien_creado_estado_avanzado':
        case 'tim_2509040_estado_incorrecto':
          // Cambiar a estado "creado"
          const { error: errorEstado } = await supabase
            .from('embarques')
            .update({ 
              estado: 'creado',
              estado_facturacion: null,
              fecha_finalizacion: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', problema.embarque.id);
          
          if (errorEstado) throw errorEstado;
          console.log(`✅ ${problema.embarque.folio}: Cambiado a estado "creado"`);
          corregidos++;
          break;

        case 'duplicados':
          console.log(`⚠️  ${problema.folio}: Duplicados requieren revisión manual`);
          break;

        default:
          console.log(`⚠️  Tipo de problema no manejado: ${problema.tipo}`);
      }
    } catch (error) {
      console.error(`❌ Error corrigiendo ${problema.embarque?.folio || problema.folio}:`, error.message);
      errores++;
    }
  }

  console.log(`\n📊 RESULTADO:`);
  console.log(`   - Correcciones aplicadas: ${corregidos}`);
  console.log(`   - Errores: ${errores}`);
  console.log(`   - Pendientes de revisión manual: ${problemas.length - corregidos - errores}`);
}

// Ejecutar
verificarEmbarques().then(() => {
  console.log('\n✅ Verificación completada');
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});