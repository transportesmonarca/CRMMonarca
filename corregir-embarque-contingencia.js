const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function corregirEmbarqueContingencia() {
  console.log('🔧 Corrigiendo embarque TIM-2509-001 para mostrar $0.00...\n');
  
  try {
    // 1. Obtener el embarque actual
    const { data: embarque, error: errorGet } = await supabase
      .from('embarques')
      .select('*')
      .eq('folio', 'TIM-2509-001')
      .single();
      
    if (errorGet) {
      console.error('❌ Error obteniendo embarque:', errorGet);
      return;
    }
    
    console.log('📦 Estado actual:');
    console.log('- Folio:', embarque.folio);
    console.log('- Estado:', embarque.estado);
    console.log('- Pago operador actual:', embarque.pago_operador);
    console.log('');
    
    // 2. Verificar si es realmente un caso de contingencia
    if (embarque.estado !== 'asignado_contingencia') {
      console.log('⚠️ El embarque no tiene estado de contingencia.');
      console.log('📝 Actualizando solo el pago a $0.00 por cambio de operador...');
    }
    
    // 3. Actualizar el pago a $0.00
    const { data: updated, error: errorUpdate } = await supabase
      .from('embarques')
      .update({ 
        pago_operador: 0
      })
      .eq('folio', 'TIM-2509-001')
      .select()
      .single();
      
    if (errorUpdate) {
      console.error('❌ Error actualizando embarque:', errorUpdate);
      return;
    }
    
    console.log('✅ ¡Embarque corregido exitosamente!');
    console.log('📦 Nuevo estado:');
    console.log('- Folio:', updated.folio);
    console.log('- Estado:', updated.estado);
    console.log('- Pago operador:', updated.pago_operador);
    console.log('');
    
    // 4. Registrar la corrección en audit log
    const { error: errorAudit } = await supabase
      .from('embarque_modificaciones')
      .insert({
        embarque_id: embarque.id,
        tipo_modificacion: 'correccion_pago_contingencia',
        detalles: {
          folio: embarque.folio,
          pago_anterior: embarque.pago_operador,
          pago_nuevo: 0,
          motivo: 'Corrección automática: embarques de contingencia deben tener pago $0.00',
          fecha_correccion: new Date().toISOString()
        },
        usuario_id: 'sistema-automatico'
      });
      
    if (errorAudit) {
      console.warn('⚠️ Error registrando audit log:', errorAudit);
    } else {
      console.log('📝 Corrección registrada en audit log');
    }
    
    console.log('\n🎯 ¡Listo! El embarque TIM-2509-001 ahora muestra $0.00');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

corregirEmbarqueContingencia();