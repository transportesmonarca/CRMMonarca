require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function diagnosticarEmbarque() {
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
    console.log('🔍 DIAGNÓSTICO TIM-2509-036\n');
    
    // 1. Buscar el embarque TIM-2509-036
    console.log('1. Buscando embarque TIM-2509-036...');
    const { data: embarques, error: embarqueError } = await supabase
      .from('embarques')
      .select(`
        id, folio, tipo_servicio_id, precio_flete,
        flete_falso
      `)
      .ilike('folio', '%2509-036%');

    if (embarqueError) {
      console.error('Error buscando embarque:', embarqueError);
      return;
    }

    if (!embarques || embarques.length === 0) {
      console.log('❌ No se encontró el embarque TIM-2509-036');
      return;
    }

    const embarque = embarques[0];
    console.log('✅ Embarque encontrado:', {
      id: embarque.id,
      folio: embarque.folio,
      tipo_servicio_id: embarque.tipo_servicio_id,
      precio_flete: embarque.precio_flete,
      flete_falso: embarque.flete_falso
    });

    // 2. Buscar el tipo de servicio asociado
    if (embarque.tipo_servicio_id) {
      console.log('\n2. Buscando tipo de servicio...');
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
          id: tipoServicio.id,
          nombre: tipoServicio.nombre,
          precio_base: tipoServicio.precio_base,
          pago_operador: tipoServicio.pago_operador,
          es_flete_falso: tipoServicio.es_flete_falso,
          pago_operador_flete_falso: tipoServicio.pago_operador_flete_falso,
          slug: tipoServicio.slug
        });
      }
    }

    // 3. Verificar si existe la tabla configuracion_sistema
    console.log('\n3. Verificando tabla configuracion_sistema...');
    const { data: configData, error: configError } = await supabase
      .from('configuracion_sistema')
      .select('clave, valor')
      .eq('clave', 'flete_falso_precio_global');

    if (configError) {
      console.log('❌ Error accediendo configuracion_sistema:', configError.message);
    } else if (!configData || configData.length === 0) {
      console.log('❌ No existe la configuración flete_falso_precio_global');
    } else {
      console.log('✅ Precio global configurado:', configData[0].valor);
    }

    // 4. Probar la API
    console.log('\n4. Probando API /api/config/flete-falso...');
    try {
      const response = await fetch('http://localhost:3002/api/config/flete-falso');
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API responde:', apiData);
      } else {
        console.log('❌ API error:', response.status, response.statusText);
      }
    } catch (apiError) {
      console.log('❌ Error llamando API:', apiError.message);
    }

  } catch (error) {
    console.error('Error general:', error);
  }
}

diagnosticarEmbarque();