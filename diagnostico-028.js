require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnosticarTIM2509028() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    console.error('Missing environment variables');
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    console.log('🔍 DIAGNÓSTICO TIM-2509-028 - PAGO FLETE FALSO\n');
    
    // 1. Buscar el embarque TIM-2509-028
    console.log('1. Buscando embarque TIM-2509-028...');
    const { data: embarques, error: embarqueError } = await supabase
      .from('embarques')
      .select(`
        id, folio, tipo_servicio_id, precio_flete,
        flete_falso
      `)
      .ilike('folio', '%2509-028%');

    if (embarqueError) {
      console.error('Error buscando embarque:', embarqueError);
      return;
    }

    if (!embarques || embarques.length === 0) {
      console.log('❌ No se encontró el embarque TIM-2509-028');
      return;
    }

    const embarque = embarques[0];
    console.log('✅ Embarque encontrado:', {
      id: embarque.id,
      folio: embarque.folio,
      tipo_servicio_id: embarque.tipo_servicio_id,
      precio_flete: embarque.precio_flete,
      flete_falso: embarque.flete_falso,
      estado_actual: embarque.flete_falso ? 'MARCADO como flete falso' : 'NO marcado como flete falso'
    });

    // 2. Buscar el tipo de servicio asociado
    if (embarque.tipo_servicio_id) {
      console.log('\n2. Analizando tipo de servicio...');
      const { data: tipoServicio, error: tipoError } = await supabase
        .from('tipos_servicio')
        .select(`
          id, nombre, precio_base, pago_operador,
          es_flete_falso, pago_operador_flete_falso, slug
        `)
        .eq('id', embarque.tipo_servicio_id)
        .single();

      if (tipoError) {
        console.error('Error buscando tipo de servicio:', tipoError);
      } else {
        console.log('✅ Tipo de servicio:', {
          nombre: tipoServicio.nombre,
          precio_base: tipoServicio.precio_base,
          pago_operador: tipoServicio.pago_operador,
          es_flete_falso: tipoServicio.es_flete_falso,
          pago_operador_flete_falso: tipoServicio.pago_operador_flete_falso
        });

        // 3. Obtener precio global de flete falso
        console.log('\n3. Consultando precio global de flete falso...');
        const { data: configData, error: configError } = await supabase
          .from('configuracion_sistema')
          .select('valor')
          .eq('clave', 'flete_falso_precio_global')
          .single();

        let precioGlobal = 800; // fallback
        if (configError) {
          console.log('⚠️ No se pudo obtener precio global, usando fallback: $800.00');
        } else {
          precioGlobal = Number(configData.valor) || 800;
          console.log(`✅ Precio global configurado: $${precioGlobal.toFixed(2)}`);
        }

        // 4. Mostrar análisis de pagos
        console.log('\n📊 ANÁLISIS DE PAGOS:');
        console.log('=' .repeat(50));
        
        // Pago actual (servicio normal)
        const pagoNormal = tipoServicio.precio_base || tipoServicio.pago_operador || 0;
        console.log(`💰 Pago ACTUAL (servicio normal): $${pagoNormal.toFixed(2)}`);
        
        // Pago si fuera flete falso
        console.log(`🚛 Pago SI FUERA flete falso: $${precioGlobal.toFixed(2)}`);
        
        // Diferencia
        const diferencia = precioGlobal - pagoNormal;
        const porcentaje = pagoNormal > 0 ? ((diferencia / pagoNormal) * 100) : 0;
        
        if (diferencia > 0) {
          console.log(`📈 Diferencia: +$${diferencia.toFixed(2)} (+${porcentaje.toFixed(1)}% más)`);
        } else if (diferencia < 0) {
          console.log(`📉 Diferencia: $${diferencia.toFixed(2)} (${Math.abs(porcentaje).toFixed(1)}% menos)`);
        } else {
          console.log(`➡️ Sin diferencia: mismo monto`);
        }

        // Estado actual vs. potencial
        console.log('\n🎯 RESUMEN:');
        if (embarque.flete_falso) {
          console.log(`✅ El embarque YA está marcado como flete falso`);
          console.log(`   → El operador recibe: $${precioGlobal.toFixed(2)}`);
        } else {
          console.log(`ℹ️ El embarque NO está marcado como flete falso`);
          console.log(`   → El operador recibe actualmente: $${pagoNormal.toFixed(2)}`);
          console.log(`   → Si se marcara como flete falso, recibiría: $${precioGlobal.toFixed(2)}`);
        }

        // Información adicional sobre el tipo de servicio
        if (tipoServicio.es_flete_falso) {
          console.log(`\n⚠️ NOTA: El tipo de servicio "${tipoServicio.nombre}" está marcado como "flete falso"`);
          console.log(`   pero esto no afecta el pago individual del embarque.`);
        }
      }
    }

  } catch (error) {
    console.error('Error general:', error);
  }
}

diagnosticarTIM2509028();