// Script para verificar directamente en Supabase si TIM-2509-039 existe y en qué tabla
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function verificarTIM2509039() {
  try {
    console.log('🔍 Verificando TIM-2509-039 en ambas tablas...\n');

    // 1. Verificar en tabla legacy
    const { data: legacyData } = await supabase
      .from('embarques')
      .select('id, fecha, cliente_id, precio_operador, created_at')
      .eq('id', 'TIM-2509-039')
      .single();

    console.log('📊 En tabla LEGACY (embarques):');
    console.log(legacyData ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    if (legacyData) {
      console.log('Detalles:', legacyData);
    }

    // 2. Verificar en tabla normalizada
    const { data: normData } = await supabase
      .from('embarques_nuevo')
      .select(`
        id, 
        fecha, 
        cliente_id, 
        precio_operador_final, 
        tipo_servicio_precio, 
        tipo_servicio_nombre,
        created_at
      `)
      .eq('id', 'TIM-2509-039')
      .single();

    console.log('\n📊 En tabla NORMALIZADA (embarques_nuevo):');
    console.log(normData ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    if (normData) {
      console.log('Detalles:', normData);
    }

    // 3. Verificar últimos embarques en ambas tablas
    console.log('\n📋 Últimos 5 embarques en LEGACY:');
    const { data: ultimosLegacy } = await supabase
      .from('embarques')
      .select('id, fecha, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    ultimosLegacy?.forEach(e => console.log(`- ${e.id} (${e.fecha}) - ${e.created_at}`));

    console.log('\n📋 Últimos 5 embarques en NORMALIZADA:');
    const { data: ultimosNorm } = await supabase
      .from('embarques_nuevo')
      .select('id, fecha, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    ultimosNorm?.forEach(e => console.log(`- ${e.id} (${e.fecha}) - ${e.created_at}`));

    // 4. Buscar todos los embarques que contengan "2509"
    console.log('\n🔍 Todos los embarques que contienen "2509":');
    
    const { data: legacy2509 } = await supabase
      .from('embarques')
      .select('id, created_at')
      .ilike('id', '%2509%')
      .order('created_at', { ascending: false });
    
    const { data: norm2509 } = await supabase
      .from('embarques_nuevo')
      .select('id, created_at')
      .ilike('id', '%2509%')
      .order('created_at', { ascending: false });

    console.log('En LEGACY:');
    legacy2509?.forEach(e => console.log(`- ${e.id} (${e.created_at})`));
    
    console.log('En NORMALIZADA:');
    norm2509?.forEach(e => console.log(`- ${e.id} (${e.created_at})`));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarTIM2509039();