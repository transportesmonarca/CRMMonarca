const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function actualizarConMultiplesDirecciones() {
  console.log('🔧 Actualizando embarque con múltiples direcciones...');
  
  try {
    // Buscar el embarque de prueba más reciente
    const { data: embarques, error: errorBuscar } = await supabase
      .from('embarques')
      .select('*')
      .like('folio', 'TEST-MULTI-%')
      .order('fecha_creacion', { ascending: false })
      .limit(1);
    
    if (errorBuscar) throw errorBuscar;
    
    if (!embarques || embarques.length === 0) {
      console.log('❌ No se encontró embarque de prueba. Ejecuta primero probar-direcciones-multiples-ui.js');
      return;
    }
    
    const embarque = embarques[0];
    console.log('📦 Embarque encontrado:', embarque.folio);
    
    // Agregar múltiples direcciones simuladas en observaciones
    const direccionesMultiples = `

--- DIRECCIONES MÚLTIPLES ---
RECOLECCIONES:
1. Primera recolección: Av. Insurgentes 123, Col. Roma, CDMX (2025-01-15 08:00)
2. Segunda recolección: Calz. de Tlalpan 456, Col. Del Valle, CDMX (2025-01-15 10:00)
3. Tercera recolección: Av. Universidad 789, Col. Coyoacán, CDMX (2025-01-15 12:00)

ENTREGAS:
1. Primera entrega: Av. López Mateos 456, Col. Providencia, GDL (2025-01-16 14:00)
2. Segunda entrega: Av. Patria 123, Col. Jardines del Bosque, GDL (2025-01-16 16:00)
3. Entrega final: Av. Americas 789, Col. Moderna, GDL (2025-01-16 18:00)
`;

    const observacionesActualizadas = (embarque.observaciones || '') + direccionesMultiples;
    
    // Actualizar el embarque
    const { error: errorActualizar } = await supabase
      .from('embarques')
      .update({
        observaciones: observacionesActualizadas
      })
      .eq('id', embarque.id);
    
    if (errorActualizar) throw errorActualizar;
    
    console.log('✅ Embarque actualizado con múltiples direcciones');
    
    // Verificar la actualización
    const { data: embarqueActualizado, error: errorVerificar } = await supabase
      .from('embarques')
      .select('observaciones')
      .eq('id', embarque.id)
      .single();
    
    if (errorVerificar) throw errorVerificar;
    
    console.log('\\n📋 OBSERVACIONES ACTUALIZADAS:');
    console.log(embarqueActualizado.observaciones?.substring(0, 200) + '...');
    
    console.log('\\n💡 AHORA PUEDES PROBAR:');
    console.log('1. Ve a http://localhost:3001/embarques');
    console.log('2. Busca el embarque:', embarque.folio);
    console.log('3. Haz clic en "Ver Detalles"');
    console.log('4. Ve a la pestaña "Direcciones y Fechas"');
    console.log('5. Deberías ver todas las direcciones múltiples listadas');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

actualizarConMultiplesDirecciones();