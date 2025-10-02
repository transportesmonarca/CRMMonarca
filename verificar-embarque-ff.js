const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificarEmbarqueFF() {
  console.log('🔍 Verificando embarque TIM-2509-006...');
  
  try {
    const { data, error } = await supabase
      .from('embarques')
      .select('*')
      .eq('folio', 'TIM-2509-006')
      .single();
      
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!data) {
      console.log('❌ Embarque no encontrado');
      return;
    }
    
    console.log('📦 Embarque encontrado:');
    console.log('- ID:', data.id);
    console.log('- Folio:', data.folio);
    console.log('- Estado:', data.estado);
    console.log('- Estado facturación:', data.estado_facturacion);
    console.log('- Flete falso (campo):', data.flete_falso);
    console.log('- Modificado por emergencia:', data.modificadoPorEmergencia);
    
    // Verificar si cumple la condición para mostrar badge "Flete F." (lógica actualizada)
    const tieneEstadoContingencia = data.estado?.includes('_contingencia_FF') || false;
    const tieneCampoFleteFalso = data.flete_falso === true;
    const esFleteFalso = tieneEstadoContingencia || tieneCampoFleteFalso;
    
    console.log('');
    console.log('🔍 Análisis badge "Flete F." (lógica actualizada):');
    console.log('- ¿Estado contiene "_contingencia_FF"?:', tieneEstadoContingencia);
    console.log('- ¿Campo flete_falso es true?:', tieneCampoFleteFalso);
    console.log('- ¿Debería mostrar badge?:', esFleteFalso ? 'SÍ ✅' : 'NO ❌');
    
    if (esFleteFalso) {
      console.log('');
      console.log('✅ El badge "Flete F." DEBE aparecer para este embarque');
      if (tieneEstadoContingencia) console.log('   Razón: Estado contiene "_contingencia_FF"');
      if (tieneCampoFleteFalso) console.log('   Razón: Campo flete_falso es true');
    } else {
      console.log('');
      console.log('❌ El badge "Flete F." NO debe aparecer');
      console.log('💡 Para que aparezca, necesita:');
      console.log('   - Estado que contenga "_contingencia_FF", O');
      console.log('   - Campo flete_falso = true');
    }
    
  } catch (error) {
    console.error('❌ Error verificando embarque:', error.message);
  }
}

verificarEmbarqueFF();
