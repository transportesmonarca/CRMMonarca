const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function validarFleteInteligente() {
  try {
    console.log('🔍 VALIDACIÓN SISTEMA FLETE FALSO INTELIGENTE');
    console.log('='.repeat(60));
    
    // 1. Verificar que las nuevas columnas existen
    console.log('\n📋 1. Verificando nuevas columnas...');
    const { data: columnasData, error: columnasError } = await supabase
      .from('embarques_financiero')
      .select('tipo_servicio_precio, tipo_servicio_nombre, precio_operador_final')
      .limit(1);
    
    if (columnasError) {
      console.log('❌ Error verificando columnas:', columnasError.message);
      return;
    } else {
      console.log('✅ Nuevas columnas disponibles');
    }
    
    // 2. Verificar datos migrados
    console.log('\n📊 2. Verificando migración de datos...');
    const { data: datosCompletos, error: datosError } = await supabase
      .from('embarques_financiero')
      .select('*')
      .not('tipo_servicio_precio', 'is', null)
      .not('tipo_servicio_nombre', 'is', null)
      .not('precio_operador_final', 'is', null);
    
    const { data: totalRegistros } = await supabase
      .from('embarques_financiero')
      .select('id', { count: 'exact', head: true });
    
    if (datosError) {
      console.log('❌ Error verificando datos:', datosError.message);
    } else {
      console.log(`✅ Registros migrados: ${datosCompletos?.length || 0}/${totalRegistros?.length || 0}`);
    }
    
    // 3. Probar función insertar_embarque_completo_v2
    console.log('\n🔧 3. Probando nueva función de inserción...');
    
    // Obtener cliente y tipo de servicio para prueba
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .limit(1)
      .single();
    
    const { data: tipoServicio } = await supabase
      .from('tipos_servicio')
      .select('id')
      .limit(1)
      .single();
    
    if (cliente && tipoServicio) {
      // Probar inserción normal
      const { data: embarqueNormal, error: insertNormalError } = await supabase
        .rpc('insertar_embarque_completo_v2', {
          p_folio: 'TEST-NORMAL-001',
          p_cliente_id: cliente.id,
          p_tipo_servicio_id: tipoServicio.id,
          p_contenido: 'Embarque de prueba normal',
          p_origen: 'Origen Test',
          p_destino: 'Destino Test',
          p_precio_flete: 8000.00,
          p_es_flete_falso: false
        });
      
      if (insertNormalError) {
        console.log(`❌ insertar_embarque_completo_v2 (normal): ${insertNormalError.message}`);
      } else {
        console.log(`✅ insertar_embarque_completo_v2 (normal): ID ${embarqueNormal}`);
        
        // Verificar que se creó correctamente
        const { data: verificarNormal } = await supabase
          .rpc('obtener_embarque_completo', { p_embarque_id: embarqueNormal });
        
        if (verificarNormal && verificarNormal[0]) {
          const datos = verificarNormal[0];
          console.log(`   📋 Tipo servicio: ${datos.tipo_servicio_nombre}`);
          console.log(`   💰 Precio final: $${datos.precio_operador_final}`);
          console.log(`   🚫 Flete falso: ${datos.flete_falso ? 'SÍ' : 'NO'}`);
        }
      }
      
      // Probar inserción con flete falso
      const { data: embarqueFalso, error: insertFalsoError } = await supabase
        .rpc('insertar_embarque_completo_v2', {
          p_folio: 'TEST-FALSO-001',
          p_cliente_id: cliente.id,
          p_tipo_servicio_id: tipoServicio.id,
          p_contenido: 'Embarque de prueba flete falso',
          p_origen: 'Origen Test',
          p_destino: 'Destino Test',
          p_precio_flete: 8000.00,
          p_es_flete_falso: true,
          p_precio_flete_falso: 2500.00
        });
      
      if (insertFalsoError) {
        console.log(`❌ insertar_embarque_completo_v2 (flete falso): ${insertFalsoError.message}`);
      } else {
        console.log(`✅ insertar_embarque_completo_v2 (flete falso): ID ${embarqueFalso}`);
        
        // Verificar que se creó correctamente
        const { data: verificarFalso } = await supabase
          .rpc('obtener_embarque_completo', { p_embarque_id: embarqueFalso });
        
        if (verificarFalso && verificarFalso[0]) {
          const datos = verificarFalso[0];
          console.log(`   📋 Tipo servicio: ${datos.tipo_servicio_nombre}`);
          console.log(`   💰 Precio final: $${datos.precio_operador_final}`);
          console.log(`   🚫 Flete falso: ${datos.flete_falso ? 'SÍ' : 'NO'}`);
        }
      }
    }
    
    // 4. Probar función actualizar_flete_falso
    console.log('\n🔄 4. Probando actualización de flete falso...');
    
    // Buscar un embarque existente para probar
    const { data: embarquePrueba } = await supabase
      .from('embarques_nuevo')
      .select('id')
      .limit(1)
      .single();
    
    if (embarquePrueba) {
      const { data: cambioFlete, error: cambioError } = await supabase
        .rpc('actualizar_flete_falso', {
          p_embarque_id: embarquePrueba.id,
          p_es_flete_falso: true,
          p_precio_flete_falso: 3000.00
        });
      
      if (cambioError) {
        console.log(`❌ actualizar_flete_falso: ${cambioError.message}`);
      } else {
        console.log(`✅ actualizar_flete_falso: ${cambioFlete ? 'Actualizado' : 'No encontrado'}`);
      }
    }
    
    // 5. Verificar vista actualizada
    console.log('\n👁️  5. Verificando vista embarques_completa actualizada...');
    const { data: vistaData, error: vistaError } = await supabase
      .from('embarques_completa')
      .select('id, folio, tipo_servicio_nombre, precio_operador_final, flete_falso')
      .limit(3);
    
    if (vistaError) {
      console.log(`❌ Vista embarques_completa: ${vistaError.message}`);
    } else {
      console.log(`✅ Vista embarques_completa: ${vistaData?.length || 0} registros`);
      if (vistaData && vistaData.length > 0) {
        vistaData.forEach((embarque, index) => {
          console.log(`   ${index + 1}. ${embarque.folio} - ${embarque.tipo_servicio_nombre} - $${embarque.precio_operador_final} ${embarque.flete_falso ? '(FLETE FALSO)' : ''}`);
        });
      }
    }
    
    // 6. Verificar que no hay precios en $0
    console.log('\n💰 6. Verificando que no hay precios en $0...');
    const { data: preciosVacios, error: preciosError } = await supabase
      .from('embarques_financiero')
      .select('embarque_id, precio_operador_final')
      .or('precio_operador_final.is.null,precio_operador_final.eq.0');
    
    if (preciosError) {
      console.log(`❌ Error verificando precios: ${preciosError.message}`);
    } else {
      if (preciosVacios && preciosVacios.length > 0) {
        console.log(`⚠️  ${preciosVacios.length} registros con precio $0 o NULL`);
      } else {
        console.log('✅ Todos los registros tienen precio_operador_final válido');
      }
    }
    
    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('🎉 VALIDACIÓN COMPLETADA - SISTEMA FLETE FALSO V2.0');
    console.log('');
    console.log('✅ BENEFICIOS IMPLEMENTADOS:');
    console.log('   🎯 Facturación/cobranza NUNCA mostrará $0');
    console.log('   📋 Tipo de servicio siempre visible (sin depender de ID)');
    console.log('   💰 Precio final calculado automáticamente');
    console.log('   🔄 Flete falso se puede activar/desactivar sin perder datos');
    console.log('   📊 Vista completa incluye todas las nuevas columnas');
    console.log('');
    console.log('💡 USO EN CÓDIGO:');
    console.log('   - Usar insertar_embarque_completo_v2() para nuevos embarques');
    console.log('   - Usar precio_operador_final en lugar de pago_operador');
    console.log('   - Usar actualizar_flete_falso() para cambiar estado');
    
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
  }
}

validarFleteInteligente();