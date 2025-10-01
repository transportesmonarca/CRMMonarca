const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verificarEmbarque() {
  console.log('🔍 Verificando embarque 2509-001...');
  
  try {
    // Buscar el embarque
    const { data: embarque, error: embarqueError } = await supabase
      .from('embarques')
      .select('id, folio, operador_original_id, operador_reemplazo_id, operador_original_nombre, operador_reemplazo_nombre')
      .eq('folio', '2509-001')
      .single();
      
    if (embarqueError) {
      console.error('❌ Error buscando embarque:', embarqueError);
      return;
    }
    
    console.log('📋 Embarque encontrado:', embarque);
    
    // Verificar modificaciones
    const { data: modificaciones, error: modError } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .eq('embarque_id', embarque.id);
      
    if (modError) {
      console.error('❌ Error buscando modificaciones:', modError);
      return;
    }
    
    console.log('📝 Modificaciones encontradas:', modificaciones.length);
    
    if (modificaciones.length === 0) {
      console.log('⚠️ No hay modificaciones registradas para este embarque');
    } else {
      modificaciones.forEach((mod, i) => {
        console.log(`Modificación ${i+1}:`, {
          operador_original: mod.operador_original_nombre,
          operador_nuevo: mod.operador_nuevo_nombre,
          operador_original_id: mod.operador_original_id,
          operador_nuevo_id: mod.operador_nuevo_id,
          fecha: mod.fecha_modificacion,
          razon: mod.razon,
          tipo: mod.tipo_modificacion
        });
      });
    }
    
    // Verificar si cumple la condición para mostrar el botón
    const tieneModificacionOperador = modificaciones.some(mod => 
      mod.operador_original_id && mod.operador_nuevo_id
    );
    
    console.log('✅ ¿Debe mostrar botón?', tieneModificacionOperador);
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

verificarEmbarque().then(() => process.exit(0));
