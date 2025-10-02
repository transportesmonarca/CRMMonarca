const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3MzY5NiwiZXhwIjoyMDcxNTQ5Njk2fQ.rG6zRGshJFrLiHykmjr5TziRY92eSB_9EIwV7_0BqAc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función actualizada de detección de flete falso
const esFleteFalso = (embarque) => {
  return embarque?.estado?.includes('_contingencia_FF') || embarque?.flete_falso === true;
};

async function probarFuncionActualizada() {
  try {
    console.log('🔍 Probando función esFleteFalso actualizada...');
    
    // Buscar el embarque específico
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('*')
      .ilike('folio', '%2509-006%');
    
    if (error) {
      console.error('Error buscando embarque:', error);
      return;
    }
    
    if (embarques && embarques.length > 0) {
      const embarque = embarques[0];
      console.log('\n📦 Embarque encontrado:');
      console.log('Folio:', embarque.folio);
      console.log('Estado:', embarque.estado);
      console.log('Flete falso (campo):', embarque.flete_falso);
      
      // Probar la función actualizada
      const resultado = esFleteFalso(embarque);
      console.log('\n🎯 RESULTADO:');
      console.log('Es Flete Falso (función actualizada):', resultado);
      console.log('Debería mostrar badge "Flete F.":', resultado ? 'SÍ' : 'NO');
      
      // Explicar por qué
      const porEstado = embarque?.estado?.includes('_contingencia_FF');
      const porCampo = embarque?.flete_falso === true;
      console.log('\n📋 DETALLES:');
      console.log('- Por estado (_contingencia_FF):', porEstado);
      console.log('- Por campo (flete_falso = true):', porCampo);
      console.log('- Resultado final (OR):', porEstado || porCampo);
      
    } else {
      console.log('❌ No se encontró el embarque TIM-2509-006');
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

probarFuncionActualizada();