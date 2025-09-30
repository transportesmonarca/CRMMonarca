// ====================================
// DIAGNÓSTICO: Embarques visibles en asignación
// ====================================
// Script para verificar si los embarques aparecen en la sección de asignación

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function diagnosticarVisibilidadAsignacion() {
  console.log('🔍 DIAGNÓSTICO: Visibilidad de embarques en asignación');
  console.log('='.repeat(60));

  try {
    // 1. Consultar embarques como lo hace la página de asignación (tabla legacy)
    console.log('\n1️⃣ Consultando embarques de tabla legacy (embarques):');
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*)
      `)
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
      .order('fecha_creacion', { ascending: false });

    if (errorLegacy) {
      console.error('❌ Error consultando tabla legacy:', errorLegacy);
    } else {
      console.log(`📊 Encontrados ${embarquesLegacy?.length || 0} embarques en tabla legacy`);
      const listosPara = embarquesLegacy?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`   - Con estado "listo-para-asignar": ${listosPara.length}`);
      listosPara.forEach(e => {
        console.log(`     * ${e.folio}: ${e.estado}`);
      });
    }

    // 2. Consultar embarques como lo hace la página de asignación (tabla nueva)
    console.log('\n2️⃣ Consultando embarques de tabla normalizada (embarques_nuevo):');
    const { data: embarquesNuevos, error: errorNuevos } = await supabase
      .from('embarques_nuevo')
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*),
        embarques_ubicaciones(origen, destino, direccion_recolecta, direccion_entrega, fecha_recolecta, hora_recolecta, fecha_entrega, hora_entrega),
        embarques_financiero(precio_flete, precio_operador_final, flete_falso),
        embarques_estado(estado_facturacion, pagado, fecha_creacion),
        embarques_documentos(carta_porte),
        embarques_adicional(dueno_mercancia, observaciones)
      `)
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
      .order('created_at', { ascending: false });

    if (errorNuevos) {
      console.error('❌ Error consultando tabla nueva:', errorNuevos);
    } else {
      console.log(`📊 Encontrados ${embarquesNuevos?.length || 0} embarques en tabla nueva`);
      const listosPara = embarquesNuevos?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`   - Con estado "listo-para-asignar": ${listosPara.length}`);
      listosPara.forEach(e => {
        console.log(`     * ${e.folio}: ${e.estado}`);
      });
    }

    // 3. Verificar específicamente embarques con estado listo-para-asignar
    console.log('\n3️⃣ Búsqueda específica de embarques "listo-para-asignar":');
    
    // En tabla legacy
    const { data: legacyListos, error: errorLegacyListos } = await supabase
      .from('embarques')
      .select('folio, estado, fecha_creacion, updated_at')
      .eq('estado', 'listo-para-asignar')
      .order('updated_at', { ascending: false });

    // En tabla nueva
    const { data: nuevosListos, error: errorNuevosListos } = await supabase
      .from('embarques_nuevo')
      .select('folio, estado, created_at, updated_at')
      .eq('estado', 'listo-para-asignar')
      .order('updated_at', { ascending: false });

    console.log('📋 Tabla legacy (embarques):');
    if (errorLegacyListos) {
      console.error('❌ Error:', errorLegacyListos);
    } else {
      console.log(`   Encontrados: ${legacyListos?.length || 0}`);
      legacyListos?.forEach(e => {
        console.log(`   - ${e.folio}: ${e.estado} (actualizado: ${e.updated_at})`);
      });
    }

    console.log('\n📋 Tabla nueva (embarques_nuevo):');
    if (errorNuevosListos) {
      console.error('❌ Error:', errorNuevosListos);
    } else {
      console.log(`   Encontrados: ${nuevosListos?.length || 0}`);
      nuevosListos?.forEach(e => {
        console.log(`   - ${e.folio}: ${e.estado} (actualizado: ${e.updated_at})`);
      });
    }

    // 4. Simular el filtrado de la página de asignación
    console.log('\n4️⃣ Simulando filtros de la página de asignación:');
    
    const todosLosEmbarques = [
      ...(embarquesLegacy || []).map(e => ({ ...e, _fuente: 'legacy' })),
      ...(embarquesNuevos || []).map(e => ({ ...e, _fuente: 'normalizado' }))
    ];

    // Deduplicar como en la página real
    const embarquesUnicos = new Map();
    todosLosEmbarques.forEach(embarque => {
      const existing = embarquesUnicos.get(embarque.id);
      if (!existing) {
        embarquesUnicos.set(embarque.id, embarque);
      } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
        embarquesUnicos.set(embarque.id, embarque);
      }
    });
    
    const embarquesDeduplicated = Array.from(embarquesUnicos.values());
    const embarquesListosParaAsignar = embarquesDeduplicated.filter(e => {
      const archivadoAsignacion = (e.observaciones || '').toUpperCase().includes('[ARCHIVADO-ASIGNACION]');
      return e.estado === 'listo-para-asignar' && !archivadoAsignacion;
    });

    console.log(`📊 Total embarques combinados: ${todosLosEmbarques.length}`);
    console.log(`📊 Después de deduplicar: ${embarquesDeduplicated.length}`);
    console.log(`📊 Filtrados "listo-para-asignar": ${embarquesListosParaAsignar.length}`);
    
    embarquesListosParaAsignar.forEach(e => {
      console.log(`   ✅ ${e.folio} (fuente: ${e._fuente})`);
    });

    // 5. Conclusiones
    console.log('\n' + '='.repeat(60));
    console.log('📋 CONCLUSIONES:');
    
    const totalListos = (legacyListos?.length || 0) + (nuevosListos?.length || 0);
    if (totalListos === 0) {
      console.log('❌ NO hay embarques con estado "listo-para-asignar" en NINGUNA tabla');
      console.log('💡 SOLUCIÓN: Crear un embarque y marcarlo como "Completar y Enviar"');
    } else if (embarquesListosParaAsignar.length === 0) {
      console.log(`⚠️  Hay ${totalListos} embarques "listo-para-asignar" en BD, pero NO aparecen después del filtrado`);
      console.log('💡 POSIBLES CAUSAS:');
      console.log('   - Tienen tag [ARCHIVADO-ASIGNACION] en observaciones');
      console.log('   - Error en la consulta de joins');
      console.log('   - Problema en la deduplicación');
    } else {
      console.log(`✅ TODO CORRECTO: ${embarquesListosParaAsignar.length} embarques deberían aparecer en asignación`);
      console.log('💡 Si no aparecen en la UI, el problema puede ser:');
      console.log('   - Cache del navegador');
      console.log('   - Estado local de React no actualizado');
      console.log('   - Filtros adicionales en la UI');
    }

  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarVisibilidadAsignacion().then(() => {
  console.log('\n🏁 Diagnóstico de visibilidad completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});