// ====================================
// DIAGNÓSTICO: Problema con estado inicial de embarques
// ====================================
// Script para identificar embarques con estado incorrecto

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function diagnosticarEstadoEmbarques() {
  console.log('🔍 DIAGNÓSTICO: Estado inicial de embarques');
  console.log('='.repeat(50));

  try {
    // 1. Verificar embarques recientes con estado incorrecto
    console.log('\n1️⃣ Embarques recientes con estado pendiente (incorrecto):');
    const { data: pendientes, error: errorPendientes } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .eq('estado', 'pendiente')
      .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 2 días
      .order('created_at', { ascending: false });

    if (errorPendientes) {
      console.error('❌ Error consultando embarques pendientes:', errorPendientes);
    } else {
      if (pendientes && pendientes.length > 0) {
        console.log(`⚠️  ENCONTRADOS ${pendientes.length} embarques con estado 'pendiente':`);
        pendientes.forEach(e => {
          console.log(`   - ${e.folio}: estado=${e.estado}, creado=${e.created_at}`);
        });
      } else {
        console.log('✅ No hay embarques con estado pendiente en los últimos 2 días');
      }
    }

    // 2. Verificar embarques recientes con estado correcto
    console.log('\n2️⃣ Embarques recientes con estado creado (correcto):');
    const { data: creados, error: errorCreados } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .eq('estado', 'creado')
      .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 2 días
      .order('created_at', { ascending: false });

    if (errorCreados) {
      console.error('❌ Error consultando embarques creados:', errorCreados);
    } else {
      if (creados && creados.length > 0) {
        console.log(`✅ ENCONTRADOS ${creados.length} embarques con estado 'creado':`);
        creados.forEach(e => {
          console.log(`   - ${e.folio}: estado=${e.estado}, creado=${e.created_at}`);
        });
      } else {
        console.log('⚠️  No hay embarques con estado creado en los últimos 2 días');
      }
    }

    // 3. Resumen de todos los estados
    console.log('\n3️⃣ Resumen de estados en los últimos 2 días:');
    const { data: resumen, error: errorResumen } = await supabase
      .from('embarques_nuevo')
      .select('estado')
      .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (errorResumen) {
      console.error('❌ Error obteniendo resumen:', errorResumen);
    } else if (resumen) {
      const estadoCount = resumen.reduce((acc, e) => {
        acc[e.estado] = (acc[e.estado] || 0) + 1;
        return acc;
      }, {});
      console.table(estadoCount);
    }

    // 4. Verificar la función SQL actual
    console.log('\n4️⃣ Verificando función crear_embarque_normalizado:');
    const { data: funcionInfo, error: errorFuncion } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          proname as nombre_funcion,
          pronargs as num_parametros,
          prorettype::regtype as tipo_retorno,
          pg_get_functiondef(oid) as definicion
        FROM pg_proc 
        WHERE proname = 'crear_embarque_normalizado'
        LIMIT 1;
      `
    });

    if (errorFuncion) {
      console.error('❌ Error verificando función:', errorFuncion);
    } else if (funcionInfo && funcionInfo.length > 0) {
      const func = funcionInfo[0];
      console.log(`✅ Función encontrada: ${func.nombre_funcion} (${func.num_parametros} parámetros)`);
      
      // Verificar si la función incluye 'estado' en el INSERT
      const includeEstado = func.definicion && func.definicion.includes("'creado'");
      if (includeEstado) {
        console.log('✅ La función SÍ incluye estado=\'creado\' explícitamente');
      } else {
        console.log('❌ La función NO incluye estado=\'creado\' - NECESITA ACTUALIZACIÓN');
      }
    } else {
      console.log('❌ Función crear_embarque_normalizado NO encontrada');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 CONCLUSIONES:');
    
    if (pendientes && pendientes.length > 0) {
      console.log(`⚠️  PROBLEMA CONFIRMADO: ${pendientes.length} embarques con estado incorrecto`);
      console.log('🔧 SOLUCIÓN: Ejecutar script corregir-estado-creacion-embarques.sql');
    } else {
      console.log('✅ No se detectaron embarques con estado incorrecto reciente');
    }

  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarEstadoEmbarques().then(() => {
  console.log('\n🏁 Diagnóstico completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});