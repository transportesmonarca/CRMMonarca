const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pqmjfqmwhepzkrjjjayb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbWpmcW13aGVwemtyampqYXliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzEzMzc3NywiZXhwIjoyMDQyNzA5Nzc3fQ.HPU_33GOP1n8nkz_g2OHMx6aC4__FiwCOGrRrjTmgN4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarEmbarqueTim003() {
  try {
    console.log('🔍 Buscando embarque tim-2510-003...\n');
    
    // Buscar el embarque
    const { data: embarque, error } = await supabase
      .from('embarques')
      .select('*')
      .eq('folio', 'tim-2510-003')
      .single();

    if (error) {
      console.error('❌ Error buscando embarque:', error);
      return;
    }

    if (!embarque) {
      console.log('❌ Embarque tim-2510-003 no encontrado');
      return;
    }

    console.log('✅ Embarque encontrado:');
    console.log('📄 Folio:', embarque.folio);
    console.log('📝 Estado:', embarque.estado);
    console.log('📋 Observaciones:', embarque.observaciones || 'No tiene observaciones');
    console.log('🎯 Direcciones:');
    console.log('   - Recolecta:', embarque.direccion_recolecta || 'No especificada');
    console.log('   - Entrega:', embarque.direccion_entrega || 'No especificada');
    
    // Verificar si tiene el marcador de direcciones múltiples
    if (embarque.observaciones && embarque.observaciones.includes('DIRECCIONES MÚLTIPLES')) {
      console.log('\n🔍 Analizando direcciones múltiples...');
      
      try {
        const marcador = "--- DIRECCIONES MÚLTIPLES ---";
        const partes = embarque.observaciones.split(marcador);
        
        if (partes.length > 1) {
          console.log('✅ Marcador de direcciones múltiples encontrado');
          
          // Parsear las direcciones
          const seccionDirecciones = partes[1];
          const lineas = seccionDirecciones.split('\n').filter(linea => linea.trim());
          
          const recolectas = [];
          const entregas = [];
          let tipoActual = null;
          
          for (const linea of lineas) {
            const lineaTrim = linea.trim();
            if (lineaTrim.startsWith('RECOLECTAS:')) {
              tipoActual = 'recolectas';
              continue;
            }
            if (lineaTrim.startsWith('ENTREGAS:')) {
              tipoActual = 'entregas';
              continue;
            }
            
            if (lineaTrim && lineaTrim.startsWith('-')) {
              const direccion = lineaTrim.substring(1).trim();
              if (tipoActual === 'recolectas') {
                recolectas.push({ direccion });
              } else if (tipoActual === 'entregas') {
                entregas.push({ direccion });
              }
            }
          }
          
          console.log('📍 Recolectas encontradas:', recolectas.length);
          recolectas.forEach((r, i) => console.log(`   ${i + 1}. ${r.direccion}`));
          
          console.log('📍 Entregas encontradas:', entregas.length);
          entregas.forEach((e, i) => console.log(`   ${i + 1}. ${e.direccion}`));
          
          // Verificar si debe mostrar badge D. Múltiples
          const tieneMultiples = recolectas.length > 1 || entregas.length > 1;
          console.log(`\n🏷️  Badge D. Múltiples: ${tieneMultiples ? '✅ SÍ debe aparecer' : '❌ NO debe aparecer'}`);
          
        } else {
          console.log('❌ Marcador de direcciones múltiples no válido');
        }
        
      } catch (e) {
        console.error('❌ Error parseando direcciones múltiples:', e);
      }
      
    } else {
      console.log('\n❌ No tiene marcador de direcciones múltiples en observaciones');
    }
    
    // Verificar si debe mostrar badge F. Falso
    const tieneFleteFalso = embarque.estado && embarque.estado.includes('_contingencia_FF');
    console.log(`🏷️  Badge F. Falso: ${tieneFleteFalso ? '✅ SÍ debe aparecer' : '❌ NO debe aparecer'}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarEmbarqueTim003();