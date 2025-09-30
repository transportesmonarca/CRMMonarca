const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testearLogicaAsignacion() {
  console.log('🧪 TEST: Lógica exacta de página de asignación');
  console.log('='.repeat(60));

  try {
    // Paso 1: Consultar tabla legacy
    console.log('\n1️⃣ Consultando tabla legacy (embarques)...');
    const { data: embarquesLegacy, error: embarquesLegacyError } = await supabase
      .from("embarques")
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*)
      `)
      .in("estado", ["listo-para-asignar", "asignado", "en-transito", "cancelado", "archivado"])
      .order("fecha_creacion", { ascending: false });

    if (embarquesLegacyError) {
      console.error('❌ Error legacy:', embarquesLegacyError);
    } else {
      console.log(`✅ Legacy: ${embarquesLegacy?.length || 0} embarques`);
      const listosLegacy = embarquesLegacy?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`   - "listo-para-asignar": ${listosLegacy.length}`);
      listosLegacy.forEach(e => console.log(`     * ${e.numero_embarque}`));
    }

    // Paso 2: Consultar tabla normalizada
    console.log('\n2️⃣ Consultando tabla normalizada (embarques_nuevo)...');
    const { data: embarquesNuevos, error: embarquesNuevosError } = await supabase
      .from("embarques_nuevo")
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
      .in("estado", ["listo-para-asignar", "asignado", "en-transito", "cancelado", "archivado"])
      .order("created_at", { ascending: false });

    if (embarquesNuevosError) {
      console.error('❌ Error nuevo:', embarquesNuevosError);
    } else {
      console.log(`✅ Nuevo: ${embarquesNuevos?.length || 0} embarques`);
      const listosNuevo = embarquesNuevos?.filter(e => e.estado === 'listo-para-asignar') || [];
      console.log(`   - "listo-para-asignar": ${listosNuevo.length}`);
      listosNuevo.forEach(e => console.log(`     * ${e.numero_embarque}`));
    }

    // Paso 3: Simular la lógica de combinación
    console.log('\n3️⃣ Simulando combinación y deduplicación...');
    let todosLosEmbarques = [];

    // Agregar legacy con marca de fuente
    if (embarquesLegacy) {
      todosLosEmbarques.push(...embarquesLegacy.map(e => ({ ...e, _fuente: 'legacy' })));
    }

    // Mapear y agregar embarques nuevos
    if (embarquesNuevos) {
      const embarquesNuevosMapeados = embarquesNuevos.map(e => {
        const ubicaciones = e.embarques_ubicaciones?.[0] || {};
        const financiero = e.embarques_financiero?.[0] || {};
        const estado = e.embarques_estado?.[0] || {};
        const documentos = e.embarques_documentos?.[0] || {};
        const adicional = e.embarques_adicional?.[0] || {};

        return {
          ...e,
          _fuente: 'normalizado',
          // Mapear campos de ubicaciones
          origen: ubicaciones.origen,
          destino: ubicaciones.destino,
          direccion_recolecta: ubicaciones.direccion_recolecta,
          direccion_entrega: ubicaciones.direccion_entrega,
          fecha_recolecta: ubicaciones.fecha_recolecta,
          hora_recolecta: ubicaciones.hora_recolecta,
          fecha_entrega: ubicaciones.fecha_entrega,
          hora_entrega: ubicaciones.hora_entrega,
          // Mapear campos financieros
          precio_flete: financiero.precio_flete,
          precio_operador: financiero.precio_operador_final,
          flete_falso: financiero.flete_falso,
          // Mapear campos de estado
          estado_facturacion: estado.estado_facturacion,
          pagado: estado.pagado,
          fecha_creacion: estado.fecha_creacion || e.created_at,
          // Mapear documentos
          carta_porte: documentos.carta_porte,
          // Mapear adicionales
          dueno_mercancia: adicional.dueno_mercancia,
          observaciones: adicional.observaciones
        };
      });
      todosLosEmbarques.push(...embarquesNuevosMapeados);
    }

    console.log(`📦 Total embarques antes de deduplicar: ${todosLosEmbarques.length}`);

    // Deduplicar por ID
    const embarquesUnicos = new Map();
    todosLosEmbarques.forEach(embarque => {
      const existing = embarquesUnicos.get(embarque.id);
      if (!existing) {
        embarquesUnicos.set(embarque.id, embarque);
        console.log(`➕ Agregando: ${embarque.numero_embarque} (${embarque._fuente}) - Estado: ${embarque.estado}`);
      } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
        embarquesUnicos.set(embarque.id, embarque);
        console.log(`🔄 Reemplazando: ${embarque.numero_embarque} (legacy → normalizado) - Estado: ${embarque.estado}`);
      } else {
        console.log(`⏭️  Manteniendo: ${existing.numero_embarque} (${existing._fuente}) - Ignorando: ${embarque._fuente}`);
      }
    });

    const embarquesDeduplicated = Array.from(embarquesUnicos.values());
    console.log(`🎯 Total después de deduplicar: ${embarquesDeduplicated.length}`);

    // Filtrar solo los "listo-para-asignar"
    const listosParaAsignar = embarquesDeduplicated.filter(e => e.estado === 'listo-para-asignar');
    console.log(`\n4️⃣ Embarques "listo-para-asignar" finales: ${listosParaAsignar.length}`);
    
    listosParaAsignar.forEach(e => {
      console.log(`   ✅ ${e.numero_embarque} (${e._fuente})`);
      console.log(`      - ID: ${e.id}`);
      console.log(`      - Cliente: ${e.cliente?.nombre_comercial || 'N/A'}`);
      console.log(`      - Creado: ${e.created_at || e.fecha_creacion}`);
    });

    // Paso 4: Verificar si hay filtros adicionales que puedan estar ocultándolos
    console.log('\n5️⃣ Verificando posibles filtros adicionales...');
    listosParaAsignar.forEach(e => {
      console.log(`\n📋 Análisis de ${e.numero_embarque}:`);
      console.log(`   - Estado: ${e.estado}`);
      console.log(`   - Cliente presente: ${!!e.cliente}`);
      console.log(`   - Número válido: ${!!e.numero_embarque}`);
      console.log(`   - ID válido: ${!!e.id}`);
      console.log(`   - Fuente: ${e._fuente}`);
      console.log(`   - Archivado: ${e.archivado || 'false'}`);
      console.log(`   - Observaciones: ${e.observaciones || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testearLogicaAsignacion().then(() => {
  console.log('\n✅ Test completado');
  process.exit(0);
});