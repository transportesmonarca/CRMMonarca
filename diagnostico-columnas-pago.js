require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnosticarColumnasPageOperador() {
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
    console.log('📊 COLUMNAS DE PAGO AL OPERADOR EN EL SISTEMA');
    console.log('=' .repeat(60));
    
    console.log('\n🏗️ ESTRUCTURA DE TABLAS:');
    console.log('\n1. Tabla: EMBARQUES');
    console.log('   📍 Columna: pago_operador (DECIMAL)');
    console.log('   📝 Propósito: Pago específico para este embarque individual');
    console.log('   💡 Uso: Cuando se quiere sobrescribir el pago estándar del tipo de servicio');
    console.log('   🔹 Prioridad: MÁXIMA (si existe, se usa este valor)');

    console.log('\n2. Tabla: TIPOS_SERVICIO');
    console.log('   📍 Columna: precio_base (DECIMAL)');
    console.log('   📝 Propósito: Pago estándar del operador para este tipo de servicio');
    console.log('   💡 Uso: Valor por defecto cuando no hay pago específico en el embarque');
    console.log('   🔹 Prioridad: SEGUNDA (se usa si no hay pago_operador en embarque)');
    
    console.log('\n   📍 Columna: pago_operador (DECIMAL) - LEGACY');
    console.log('   📝 Propósito: Campo heredado, respaldo del precio_base');
    console.log('   💡 Uso: Fallback si precio_base es null');
    console.log('   🔹 Prioridad: TERCERA');

    console.log('\n   📍 Columna: pago_operador_flete_falso (DECIMAL)');
    console.log('   📝 Propósito: Pago específico cuando el tipo es marcado como flete falso');
    console.log('   💡 Uso: Solo para tipos de servicio individuales marcados como flete falso');
    console.log('   🔹 Prioridad: OBSOLETA (ahora se usa precio global)');

    console.log('\n⚖️ LÓGICA DE PRIORIDAD ACTUAL:');
    console.log('1. embarques.pago_operador (si existe y no es null)');
    console.log('2. Si embarques.flete_falso = true → Precio global ($666)');
    console.log('3. tipos_servicio.precio_base');
    console.log('4. tipos_servicio.pago_operador (fallback legacy)');
    console.log('5. 0 (fallback final)');

    // Buscar ejemplos
    console.log('\n🔍 EJEMPLOS DE DATOS REALES:');
    
    // Ejemplo de embarque con pago específico
    const { data: embarquePagoEspecifico, error: e1 } = await supabase
      .from('embarques')
      .select(`
        id, folio, pago_operador, flete_falso,
        tipos_servicio(nombre, precio_base, pago_operador)
      `)
      .not('pago_operador', 'is', null)
      .limit(1);

    if (!e1 && embarquePagoEspecifico?.length > 0) {
      const embarque = embarquePagoEspecifico[0];
      console.log('\n📌 EMBARQUE CON PAGO ESPECÍFICO:');
      console.log(`   Folio: ${embarque.folio}`);
      console.log(`   🥇 embarques.pago_operador: $${embarque.pago_operador}`);
      console.log(`   📦 tipos_servicio.precio_base: $${embarque.tipos_servicio?.precio_base || 0}`);
      console.log(`   → RESULTADO: Se usa $${embarque.pago_operador} (pago específico tiene prioridad)`);
    }

    // Ejemplo de embarque sin pago específico
    const { data: embarqueSinPago, error: e2 } = await supabase
      .from('embarques')
      .select(`
        id, folio, pago_operador, flete_falso,
        tipos_servicio(nombre, precio_base, pago_operador)
      `)
      .is('pago_operador', null)
      .eq('flete_falso', false)
      .limit(1);

    if (!e2 && embarqueSinPago?.length > 0) {
      const embarque = embarqueSinPago[0];
      console.log('\n📌 EMBARQUE SIN PAGO ESPECÍFICO:');
      console.log(`   Folio: ${embarque.folio}`);
      console.log(`   ⚪ embarques.pago_operador: null`);
      console.log(`   📦 tipos_servicio.precio_base: $${embarque.tipos_servicio?.precio_base || 0}`);
      console.log(`   → RESULTADO: Se usa $${embarque.tipos_servicio?.precio_base || 0} (precio base del tipo)`);
    }

    // Ejemplo de flete falso
    const { data: embarqueFleteFalso, error: e3 } = await supabase
      .from('embarques')
      .select(`
        id, folio, pago_operador, flete_falso,
        tipos_servicio(nombre, precio_base, pago_operador)
      `)
      .eq('flete_falso', true)
      .limit(1);

    if (!e3 && embarqueFleteFalso?.length > 0) {
      const embarque = embarqueFleteFalso[0];
      console.log('\n📌 EMBARQUE FLETE FALSO:');
      console.log(`   Folio: ${embarque.folio}`);
      console.log(`   🚛 embarques.flete_falso: true`);
      console.log(`   💰 embarques.pago_operador: ${embarque.pago_operador || 'null'}`);
      console.log(`   📦 tipos_servicio.precio_base: $${embarque.tipos_servicio?.precio_base || 0}`);
      if (embarque.pago_operador) {
        console.log(`   → RESULTADO: Se usa $${embarque.pago_operador} (pago específico tiene prioridad máxima)`);
      } else {
        console.log(`   → RESULTADO: Se usa $666 (precio global de flete falso)`);
      }
    }

    console.log('\n💡 RESUMEN:');
    console.log('- EMBARQUES.PAGO_OPERADOR: Pago específico por embarque individual');
    console.log('- TIPOS_SERVICIO.PRECIO_BASE: Pago estándar por tipo de servicio');
    console.log('- El sistema prioriza el pago específico sobre el estándar');
    console.log('- Para flete falso: se usa precio global $666 (a menos que haya pago específico)');

  } catch (error) {
    console.error('Error en diagnóstico:', error);
  }
}

diagnosticarColumnasPageOperador();