const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEmbarque() {
  console.log('🔍 Verificando embarque TIM-2509-001...\n');
  
  try {
    // 1. Verificar estado actual del embarque
    const { data: embarque, error: errorEmbarque } = await supabase
      .from('embarques')
      .select('*')
      .eq('folio', 'TIM-2509-001')
      .single();
      
    if (errorEmbarque) {
      console.error('❌ Error obteniendo embarque:', errorEmbarque);
      return;
    }
    
    console.log('📦 Datos del embarque:');
    console.log('- Folio:', embarque.folio);
    console.log('- Operador ID:', embarque.operador_id);
    console.log('- Pago Operador:', embarque.pago_operador);
    console.log('- Estado:', embarque.estado);
    console.log('- Created at:', embarque.created_at);
    console.log('- Updated at:', embarque.updated_at);
    console.log('');
    
    // 2. Verificar si hay modificaciones registradas
    const { data: modificaciones, error: errorMod } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .eq('embarque_id', embarque.id)
      .order('created_at', { ascending: false });
      
    if (errorMod) {
      console.error('❌ Error obteniendo modificaciones:', errorMod);
      return;
    }
    
    console.log('🔄 Modificaciones encontradas:', modificaciones.length);
    modificaciones.forEach((mod, idx) => {
      console.log(`${idx + 1}. ${mod.created_at} - Tipo: ${mod.tipo_modificacion}`);
      if (mod.detalles) {
        console.log('   Detalles:', JSON.stringify(mod.detalles, null, 2));
      }
      console.log('   Usuario:', mod.usuario_id);
      console.log('');
    });
    
    // 3. Verificar el operador actual
    if (embarque.operador_id) {
      const { data: operador, error: errorOp } = await supabase
        .from('operadores')
        .select('nombre')
        .eq('id', embarque.operador_id)
        .single();
        
      if (!errorOp && operador) {
        console.log('👨‍💼 Operador actual:', operador.nombre);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarEmbarque();