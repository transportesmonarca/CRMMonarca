const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

console.log('🔧 Variables de entorno disponibles:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ No definida');
console.log('  SUPABASE_SERVICE_ROLE:', process.env.SUPABASE_SERVICE_ROLE ? '✅ Definida' : '❌ No definida');
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida');
console.log('');

// Usar la key disponible
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  console.error('   Verificar archivo ./env');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey
);

async function buscarEmbarqueCompleto() {
  try {
    console.log('🔍 Buscando TIM 2509-040 en embarques_completa...\n');
    
    // Buscar por folio que contenga 040
    const { data, error } = await supabase
      .from('embarques_completa')
      .select('*')
      .ilike('folio', '%040%');
      
    if (error) {
      console.error('❌ Error al consultar embarques_completa:', error);
      return;
    }
    
    if (data.length === 0) {
      console.log('⚠️ No se encontró ningún embarque con folio que contenga "040" en embarques_completa');
      
      // Buscar más específicamente
      console.log('\n🔍 Intentando búsqueda más específica...');
      const { data: data2, error: error2 } = await supabase
        .from('embarques_completa')
        .select('*')
        .eq('folio', 'TIM 2509-040');
        
      if (error2) {
        console.error('❌ Error en búsqueda específica:', error2);
        return;
      }
      
      if (data2.length === 0) {
        console.log('⚠️ Tampoco se encontró con folio exacto "TIM 2509-040"');
      } else {
        console.log('✅ Encontrado con búsqueda exacta:');
        mostrarEmbarques(data2);
      }
      
      return;
    }
    
    console.log(`✅ Encontrado${data.length > 1 ? 's' : ''} ${data.length} embarque${data.length > 1 ? 's' : ''}:`);
    mostrarEmbarques(data);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

function mostrarEmbarques(embarques) {
  console.log('═══════════════════════════════════════════════');
  
  embarques.forEach((embarque, index) => {
    if (index > 0) console.log('───────────────────────────────────────────────');
    
    console.log('📋 Datos del embarque:');
    console.log('  Folio:', embarque.folio || 'N/A');
    console.log('  Estado:', embarque.estado || 'N/A');
    console.log('  Estado Facturación:', embarque.estado_facturacion || 'N/A');
    console.log('  Fecha Creación:', embarque.created_at || 'N/A');
    console.log('  Fecha Finalización:', embarque.fecha_finalizacion || 'N/A');
    console.log('  Cliente:', embarque.cliente || 'N/A');
    console.log('  Origen → Destino:', `${embarque.origen || 'N/A'} → ${embarque.destino || 'N/A'}`);
    console.log('  Tipo Material:', embarque.tipo_material || 'N/A');
    console.log('  Cantidad:', embarque.cantidad_material || 'N/A');
    
    // Mostrar campos adicionales relevantes para el estado
    if (embarque.operador_asignado) {
      console.log('  Operador Asignado:', embarque.operador_asignado);
    }
    if (embarque.fecha_asignacion) {
      console.log('  Fecha Asignación:', embarque.fecha_asignacion);
    }
    if (embarque.fecha_inicio_transito) {
      console.log('  Fecha Inicio Tránsito:', embarque.fecha_inicio_transito);
    }
  });
  
  console.log('═══════════════════════════════════════════════');
}

// Ejecutar la búsqueda
buscarEmbarqueCompleto();