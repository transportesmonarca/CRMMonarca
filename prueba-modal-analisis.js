require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function probarCalculoPagos() {
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
    console.log('🧪 PRUEBA DE CÁLCULO DE PAGOS - MODAL ANÁLISIS OPERADORES\n');

    // 1. Obtener precio global de flete falso
    console.log('1. Obteniendo precio global de flete falso...');
    const { data: configData, error: configError } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'flete_falso_precio_global')
      .single();

    let precioGlobal = 800;
    if (configError) {
      console.log('⚠️ No se pudo obtener precio global, usando fallback: $800.00');
    } else {
      precioGlobal = Number(configData.valor) || 800;
      console.log(`✅ Precio global configurado: $${precioGlobal.toFixed(2)}`);
    }

    // 2. Probar con embarques específicos
    const foliosTest = ['TIM-2509-028', 'TIM-2509-036'];
    
    for (const folio of foliosTest) {
      console.log(`\n--- Probando ${folio} ---`);
      
      const { data: embarques, error: embarqueError } = await supabase
        .from('embarques')
        .select(`
          id, folio, tipo_servicio_id, precio_flete,
          flete_falso, pago_operador
        `)
        .ilike('folio', `%${folio}%`);

      if (embarqueError || !embarques || embarques.length === 0) {
        console.log(`❌ No se encontró ${folio}`);
        continue;
      }

      const embarque = embarques[0];
      
      // Obtener tipo de servicio
      const { data: tipoServicio, error: tipoError } = await supabase
        .from('tipos_servicio')
        .select(`id, nombre, precio_base, pago_operador, es_flete_falso, pago_operador_flete_falso`)
        .eq('id', embarque.tipo_servicio_id)
        .single();

      console.log(`📋 Datos del embarque:`, {
        folio: embarque.folio,
        flete_falso: embarque.flete_falso,
        pago_operador: embarque.pago_operador,
        tipo_servicio: tipoServicio?.nombre || 'No encontrado'
      });

      // Simular la lógica de calcularPagoOperadorAsync
      let pagoCalculado = 0;
      
      // 1. Prioridad máxima: pago específico del embarque
      if (embarque.pago_operador != null) {
        pagoCalculado = Number(embarque.pago_operador);
        console.log(`💰 Pago (específico embarque): $${pagoCalculado.toFixed(2)}`);
      } 
      // 2. Si es flete falso, usar precio global
      else if (embarque.flete_falso) {
        pagoCalculado = precioGlobal;
        console.log(`🚛 Pago (flete falso global): $${pagoCalculado.toFixed(2)}`);
      }
      // 3. Usar tipo de servicio
      else if (tipoServicio) {
        pagoCalculado = tipoServicio.precio_base || tipoServicio.pago_operador || 0;
        console.log(`📦 Pago (tipo servicio): $${pagoCalculado.toFixed(2)}`);
      }
      
      console.log(`✅ RESULTADO FINAL: El modal de análisis debe mostrar $${pagoCalculado.toFixed(2)} para ${folio}`);
    }

    console.log('\n🎯 RESUMEN:');
    console.log('- TIM-2509-028 (flete_falso: true) → Debe mostrar precio global');
    console.log('- TIM-2509-036 (flete_falso: false) → Debe mostrar precio base del tipo de servicio');
    console.log('- El modal de análisis ahora usa calcularPagoOperadorAsync para obtener precios correctos');

  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

probarCalculoPagos();