// Script para probar la visibilidad de embarques en la interfaz híbrida
// Este script simula la función loadEmbarques actualizada

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testInterfaceVisibility() {
  try {
    console.log('🔍 Probando visibilidad de embarques con sistema híbrido...\n');

    // 1. Cargar embarques legacy (tabla embarques)
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select('*')
      .order('fecha', { ascending: false });

    if (errorLegacy) {
      console.error('❌ Error cargando legacy:', errorLegacy);
      return;
    }

    console.log(`📊 Embarques Legacy: ${embarquesLegacy?.length || 0}`);
    console.log('Últimos 3 legacy:', embarquesLegacy?.slice(0, 3).map(e => e.id));

    // 2. Cargar embarques normalizados
    const { data: embarquesNormalizados, error: errorNorm } = await supabase
      .from('embarques_nuevo')
      .select(`
        *,
        ubicaciones:embarques_ubicaciones(*),
        financiero:embarques_financiero(*),
        estado:embarques_estado(*),
        documentos:embarques_documentos(*),
        adicional:embarques_adicional(*)
      `)
      .order('fecha', { ascending: false });

    if (errorNorm) {
      console.error('❌ Error cargando normalizados:', errorNorm);
      return;
    }

    console.log(`📊 Embarques Normalizados: ${embarquesNormalizados?.length || 0}`);
    console.log('Últimos 3 normalizados:', embarquesNormalizados?.slice(0, 3).map(e => e.id));

    // 3. Buscar específicamente TIM-2509-039
    const tim039Legacy = embarquesLegacy?.find(e => e.id === 'TIM-2509-039');
    const tim039Norm = embarquesNormalizados?.find(e => e.id === 'TIM-2509-039');

    console.log('\n🔍 Búsqueda específica de TIM-2509-039:');
    console.log('En legacy:', tim039Legacy ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    console.log('En normalizados:', tim039Norm ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');

    if (tim039Norm) {
      console.log('\n📋 Detalles de TIM-2509-039 normalizado:');
      console.log('ID:', tim039Norm.id);
      console.log('Cliente ID:', tim039Norm.cliente_id);
      console.log('Fecha:', tim039Norm.fecha);
      console.log('Precio operador final:', tim039Norm.precio_operador_final);
      console.log('Tipo servicio nombre:', tim039Norm.tipo_servicio_nombre);
      console.log('Tipo servicio precio:', tim039Norm.tipo_servicio_precio);
    }

    // 4. Probar mapeo de campos para compatibilidad con interfaz
    if (embarquesNormalizados && embarquesNormalizados.length > 0) {
      console.log('\n🔄 Probando mapeo de campos...');
      
      const embarqueMapeado = embarquesNormalizados[0];
      const ubicacion = embarqueMapeado.ubicaciones?.[0] || {};
      const financiero = embarqueMapeado.financiero?.[0] || {};
      const estado = embarqueMapeado.estado?.[0] || {};
      const documentos = embarqueMapeado.documentos?.[0] || {};
      const adicional = embarqueMapeado.adicional?.[0] || {};

      console.log('Ejemplo de mapeo para:', embarqueMapeado.id);
      console.log('- origen:', ubicacion.origen || 'N/A');
      console.log('- destino:', ubicacion.destino || 'N/A'); 
      console.log('- precio_flete:', financiero.precio_flete || embarqueMapeado.tipo_servicio_precio);
      console.log('- precio_operador:', embarqueMapeado.precio_operador_final || financiero.precio_operador);
      console.log('- estado:', estado.estado || 'nuevo');
    }

    console.log('\n✅ Prueba de visibilidad completada');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testInterfaceVisibility();