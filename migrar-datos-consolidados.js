const { createClient } = require('@supabase/supabase-js');

// Script para migrar datos de ambas tablas (embarques y embarques_nuevo) 
// a la nueva tabla consolidada

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function migrarDatosConsolidados() {
  console.log('🚀 INICIANDO MIGRACIÓN DE DATOS A TABLA CONSOLIDADA');
  console.log('=' .repeat(70));

  try {
    // 1. VERIFICAR QUE EXISTE LA TABLA CONSOLIDADA
    console.log('\n🔍 1. Verificando tabla consolidada...');
    
    const { data: tablaConsolidada, error: errorTabla } = await supabase
      .from('embarques_consolidada')
      .select('id')
      .limit(1);
    
    if (errorTabla) {
      console.error('❌ Error: Tabla consolidada no existe o no es accesible');
      console.log('💡 Ejecuta primero: crear-tabla-consolidada.sql');
      process.exit(1);
    }
    
    console.log('✅ Tabla consolidada existe y es accesible');

    // 2. LIMPIAR TABLA CONSOLIDADA (por si hay datos previos)
    console.log('\n🧹 2. Limpiando datos previos...');
    
    const { error: errorLimpiar } = await supabase
      .from('embarques_consolidada')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos
    
    if (errorLimpiar) {
      console.warn('⚠️  Advertencia al limpiar:', errorLimpiar.message);
    } else {
      console.log('✅ Tabla consolidada limpia');
    }

    let totalMigrados = 0;

    // 3. MIGRAR DATOS DE TABLA LEGACY (embarques)
    console.log('\n📦 3. Migrando datos de tabla legacy (embarques)...');
    
    try {
      const { data: embarquesLegacy, error: errorLegacy } = await supabase
        .from('embarques')
        .select('*');
      
      if (errorLegacy) {
        console.log('⚠️  Tabla embarques no accesible:', errorLegacy.message);
      } else if (embarquesLegacy && embarquesLegacy.length > 0) {
        console.log(`📊 Encontrados ${embarquesLegacy.length} registros en embarques`);
        
        // Migrar en lotes para evitar timeouts
        const loteSize = 50;
        let migradosLegacy = 0;
        
        for (let i = 0; i < embarquesLegacy.length; i += loteSize) {
          const lote = embarquesLegacy.slice(i, i + loteSize);
          
          const datosConsolidados = lote.map(embarque => ({
            // Mantener ID original si es UUID válido, sino generar nuevo
            id: isValidUUID(embarque.id) ? embarque.id : undefined,
            folio: embarque.folio,
            cliente_id: embarque.cliente_id,
            operador_id: embarque.operador_id,
            camion_id: embarque.camion_id,
            remolque_id: embarque.remolque_id,
            tipo_servicio_id: embarque.tipo_servicio_id,
            origen: embarque.origen,
            destino: embarque.destino,
            lugar_recolecta: embarque.lugar_recolecta,
            direccion_recolecta: embarque.direccion_recolecta,
            direccion_entrega: embarque.direccion_entrega,
            fecha_recolecta: embarque.fecha_recolecta,
            hora_recolecta: embarque.hora_recolecta,
            fecha_entrega: embarque.fecha_entrega,
            hora_entrega: embarque.hora_entrega,
            tiempo_recolecta: embarque.tiempo_recolecta,
            tiempo_entrega: embarque.tiempo_entrega,
            fecha_creacion: embarque.fecha_creacion,
            fecha_completado: embarque.fecha_completado,
            fecha_cancelacion: embarque.fecha_cancelacion,
            fecha_finalizacion: embarque.fecha_finalizacion,
            updated_at: embarque.updated_at,
            contenido: embarque.contenido,
            peso: embarque.peso,
            estado: embarque.estado || 'creado',
            estado_facturacion: embarque.estado_facturacion || 'pendiente_facturacion',
            observaciones: embarque.observaciones,
            observaciones_facturacion: embarque.observaciones_facturacion,
            observaciones_archivo: embarque.observaciones_archivo,
            carta_porte: embarque.carta_porte,
            load_number: embarque.load_number,
            patente_agente_aduanal: embarque.patente_agente_aduanal,
            aduana_cruce: embarque.aduana_cruce,
            dueno_mercancia: embarque.dueno_mercancia,
            representante_cliente: embarque.representante_cliente,
            info_representante: embarque.info_representante,
            precio_flete: embarque.precio_flete,
            currency: embarque.currency || 'MXN',
            folio_factura_1: embarque.folio_factura_1,
            folio_factura_2: embarque.folio_factura_2,
            folio_factura_3: embarque.folio_factura_3,
            folio_factura_4: embarque.folio_factura_4,
            fecha_envio_cliente: embarque.fecha_envio_cliente,
            fecha_pago_cliente: embarque.fecha_pago_cliente,
            fecha_pago: embarque.fecha_pago,
            fecha_pago_1: embarque.fecha_pago_1,
            fecha_pago_2: embarque.fecha_pago_2,
            fecha_pago_3: embarque.fecha_pago_3,
            fecha_pago_4: embarque.fecha_pago_4,
            referencia_pago: embarque.referencia_pago,
            referencia_pago_1: embarque.referencia_pago_1,
            referencia_pago_2: embarque.referencia_pago_2,
            referencia_pago_3: embarque.referencia_pago_3,
            referencia_pago_4: embarque.referencia_pago_4,
            cantidad_final_facturada: embarque.cantidad_final_facturada,
            pagado: embarque.pagado || false,
            fecha_archivado: embarque.fecha_archivado,
            usuario_archivo: embarque.usuario_archivo,
            motivo_archivo: embarque.motivo_archivo,
            remolque_manual: embarque.remolque_manual || false,
            remolque_numero_economico: embarque.remolque_numero_economico,
            remolque_placa: embarque.remolque_placa,
            modificado: embarque.modificado || false,
            reporte_cliente_url: embarque.reporte_cliente_url,
            tipo_servicio_slug: embarque.tipo_servicio_slug,
            // Campos de control
            tabla_origen: 'embarques',
            migrado_en: new Date().toISOString(),
            migrado_por: 'script_migracion'
          }));

          const { error: errorInsert } = await supabase
            .from('embarques_consolidada')
            .insert(datosConsolidados);
          
          if (errorInsert) {
            console.error(`❌ Error insertando lote ${Math.floor(i/loteSize) + 1}:`, errorInsert.message);
          } else {
            migradosLegacy += lote.length;
            console.log(`✅ Migrado lote ${Math.floor(i/loteSize) + 1}: ${lote.length} registros`);
          }
        }
        
        console.log(`📦 Migración legacy completada: ${migradosLegacy}/${embarquesLegacy.length}`);
        totalMigrados += migradosLegacy;
      } else {
        console.log('ℹ️  No hay datos en tabla embarques');
      }
    } catch (err) {
      console.log('⚠️  Tabla embarques no existe o no es accesible');
    }

    // 4. MIGRAR DATOS DE TABLA NORMALIZADA (embarques_nuevo)
    console.log('\n🆕 4. Migrando datos de tabla normalizada (embarques_nuevo)...');
    
    try {
      const { data: embarquesNuevo, error: errorNuevo } = await supabase
        .from('embarques_nuevo')
        .select('*');
      
      if (errorNuevo) {
        console.log('⚠️  Tabla embarques_nuevo no accesible:', errorNuevo.message);
      } else if (embarquesNuevo && embarquesNuevo.length > 0) {
        console.log(`📊 Encontrados ${embarquesNuevo.length} registros en embarques_nuevo`);
        
        // Verificar duplicados por folio
        const { data: foliosExistentes } = await supabase
          .from('embarques_consolidada')
          .select('folio');
        
        const setExistentes = new Set((foliosExistentes || []).map(f => f.folio));
        const embarquesSinDuplicar = embarquesNuevo.filter(e => !setExistentes.has(e.folio));
        
        console.log(`🔄 Registros únicos para migrar: ${embarquesSinDuplicar.length}`);
        console.log(`⚠️  Duplicados omitidos: ${embarquesNuevo.length - embarquesSinDuplicar.length}`);
        
        // Migrar en lotes
        const loteSize = 50;
        let migradosNuevo = 0;
        
        for (let i = 0; i < embarquesSinDuplicar.length; i += loteSize) {
          const lote = embarquesSinDuplicar.slice(i, i + loteSize);
          
          const datosConsolidados = lote.map(embarque => ({
            id: embarque.id, // Mantener UUID de embarques_nuevo
            folio: embarque.folio,
            cliente_id: embarque.cliente_id,
            operador_id: embarque.operador_id,
            camion_id: embarque.camion_id,
            remolque_id: embarque.remolque_id,
            tipo_servicio_id: embarque.tipo_servicio_id,
            origen: embarque.origen,
            destino: embarque.destino,
            lugar_recolecta: embarque.lugar_recolecta,
            fecha_recolecta: embarque.fecha_recolecta,
            hora_recolecta: embarque.hora_recolecta,
            fecha_creacion: embarque.fecha_creacion,
            fecha_completado: embarque.fecha_completado,
            fecha_cancelacion: embarque.fecha_cancelacion,
            fecha_finalizacion: embarque.fecha_finalizacion,
            updated_at: embarque.updated_at,
            contenido: embarque.contenido,
            peso: embarque.peso,
            estado: embarque.estado || 'creado',
            observaciones: embarque.observaciones,
            precio_flete: embarque.precio_flete,
            currency: embarque.currency || 'MXN',
            // Campos de control
            tabla_origen: 'embarques_nuevo',
            migrado_en: new Date().toISOString(),
            migrado_por: 'script_migracion'
          }));

          const { error: errorInsert } = await supabase
            .from('embarques_consolidada')
            .insert(datosConsolidados);
          
          if (errorInsert) {
            console.error(`❌ Error insertando lote ${Math.floor(i/loteSize) + 1}:`, errorInsert.message);
          } else {
            migradosNuevo += lote.length;
            console.log(`✅ Migrado lote ${Math.floor(i/loteSize) + 1}: ${lote.length} registros`);
          }
        }
        
        console.log(`🆕 Migración normalizada completada: ${migradosNuevo}/${embarquesSinDuplicar.length}`);
        totalMigrados += migradosNuevo;
      } else {
        console.log('ℹ️  No hay datos en tabla embarques_nuevo');
      }
    } catch (err) {
      console.log('⚠️  Tabla embarques_nuevo no existe o no es accesible');
    }

    // 5. VERIFICACIÓN FINAL
    console.log('\n✅ 5. Verificación final...');
    
    const { count, error: errorCount } = await supabase
      .from('embarques_consolidada')
      .select('*', { count: 'exact', head: true });
    
    if (errorCount) {
      console.error('❌ Error verificando datos migrados:', errorCount.message);
    } else {
      console.log(`📊 Total registros en tabla consolidada: ${count}`);
    }

    // Verificar distribución por tabla origen
    const { data: distribucion } = await supabase
      .from('embarques_consolidada')
      .select('tabla_origen')
      .not('tabla_origen', 'is', null);
    
    if (distribucion) {
      const conteoOrigen = {};
      distribucion.forEach(d => {
        conteoOrigen[d.tabla_origen] = (conteoOrigen[d.tabla_origen] || 0) + 1;
      });
      
      console.log('\n📋 Distribución por origen:');
      Object.entries(conteoOrigen).forEach(([origen, count]) => {
        console.log(`  ${origen}: ${count} registros`);
      });
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log(`📊 Total migrados: ${totalMigrados} registros`);
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Error durante migración:', error);
    process.exit(1);
  }
}

// Función auxiliar para validar UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Ejecutar migración
migrarDatosConsolidados().catch(console.error);