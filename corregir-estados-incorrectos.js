const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function corregirEstadosIncorrectos() {
  try {
    console.log('🔍 Analizando embarques con estados incorrectos...\n');
    
    // Buscar embarques recientes con estados incorrectos
    const { data: problemEmbarques, error } = await supabase
      .from('embarques_completa')
      .select('folio, estado, estado_facturacion, created_at, fecha_finalizacion')
      .or('and(estado.neq.creado,estado.neq.asignado,estado.neq.en-transito,estado.neq.finalizado,estado.neq.cancelado,estado.neq.archivado),and(estado_facturacion.not.is.null,estado.neq.finalizado)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('❌ Error al consultar embarques:', error);
      return;
    }
    
    console.log(`📊 Encontrados ${problemEmbarques.length} embarques con posibles problemas de estado:`);
    console.log('═══════════════════════════════════════════════');
    
    const problemTypes = {
      estadoIncorrecto: [],
      facturacionIncorrecta: [],
      ambosIncorrectos: []
    };
    
    problemEmbarques.forEach(embarque => {
      const estadosValidos = ['creado', 'asignado', 'en-transito', 'finalizado', 'cancelado', 'archivado'];
      const estadoInvalido = !estadosValidos.includes(embarque.estado);
      const facturacionIncorrecta = embarque.estado_facturacion && embarque.estado !== 'finalizado';
      
      if (estadoInvalido && facturacionIncorrecta) {
        problemTypes.ambosIncorrectos.push(embarque);
      } else if (estadoInvalido) {
        problemTypes.estadoIncorrecto.push(embarque);
      } else if (facturacionIncorrecta) {
        problemTypes.facturacionIncorrecta.push(embarque);
      }
      
      console.log(`📋 ${embarque.folio}:`);
      console.log(`   Estado: ${embarque.estado} ${estadoInvalido ? '❌' : '✅'}`);
      console.log(`   Facturación: ${embarque.estado_facturacion || 'NULL'} ${facturacionIncorrecta ? '❌' : '✅'}`);
      console.log(`   Creado: ${embarque.created_at}`);
      console.log('───────────────────────────────────────────────');
    });
    
    console.log('\n📈 Resumen de problemas:');
    console.log(`  ❌ Estados incorrectos: ${problemTypes.estadoIncorrecto.length}`);
    console.log(`  ❌ Facturación incorrecta: ${problemTypes.facturacionIncorrecta.length}`);
    console.log(`  ❌ Ambos problemas: ${problemTypes.ambosIncorrectos.length}`);
    
    // Proponer correcciones específicas
    console.log('\n🔧 Correcciones propuestas:');
    
    // Para TIM-2509-040 específicamente
    const tim040 = problemEmbarques.find(e => e.folio === 'TIM-2509-040');
    if (tim040) {
      console.log('\n📌 TIM-2509-040 (caso específico del usuario):');
      console.log('   Estado actual: "pendiente" → Corregir a: "creado"');
      console.log('   Facturación actual: "pendiente_facturacion" → Corregir a: NULL');
      console.log('   Razón: Embarque recién creado debe estar en estado inicial');
    }
    
    // Para otros embarques con estado "pendiente"
    const pendientes = problemEmbarques.filter(e => e.estado === 'pendiente');
    if (pendientes.length > 0) {
      console.log(`\n📌 ${pendientes.length} embarques con estado "pendiente":`);
      console.log('   Todos deben cambiarse a "creado" (estado inicial correcto)');
      pendientes.forEach(e => console.log(`   - ${e.folio}`));
    }
    
    // Para embarques con facturación incorrecta
    const facturacionProblems = problemEmbarques.filter(e => 
      e.estado_facturacion && e.estado !== 'finalizado'
    );
    if (facturacionProblems.length > 0) {
      console.log(`\n📌 ${facturacionProblems.length} embarques con estado_facturacion incorrecto:`);
      console.log('   Remover estado_facturacion (solo para embarques finalizados)');
      facturacionProblems.forEach(e => 
        console.log(`   - ${e.folio}: ${e.estado} con ${e.estado_facturacion}`)
      );
    }
    
    return {
      problemEmbarques,
      problemTypes,
      corrections: {
        tim040,
        pendientes,
        facturacionProblems
      }
    };
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function aplicarCorreccionesTIM040() {
  console.log('\n🔧 Aplicando corrección específica para TIM-2509-040...');
  
  const { data, error } = await supabase
    .from('embarques_completa')
    .update({
      estado: 'creado',
      estado_facturacion: null
    })
    .eq('folio', 'TIM-2509-040');
    
  if (error) {
    console.error('❌ Error al corregir TIM-2509-040:', error);
    return false;
  }
  
  console.log('✅ TIM-2509-040 corregido exitosamente');
  console.log('   Estado: "pendiente" → "creado"');
  console.log('   Facturación: "pendiente_facturacion" → NULL');
  
  return true;
}

// Ejecutar análisis
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const shouldFixTIM = args.includes('--fix-tim040');
  
  const result = await corregirEstadosIncorrectos();
  
  if (shouldFixTIM && result?.corrections?.tim040) {
    await aplicarCorreccionesTIM040();
  } else if (shouldFix) {
    console.log('\n⚠️ Para aplicar correcciones masivas, usar: --fix-all');
    console.log('⚠️ Para corregir solo TIM-2509-040, usar: --fix-tim040');
  } else {
    console.log('\n💡 Para corregir TIM-2509-040 específicamente: node corregir-estados-incorrectos.js --fix-tim040');
    console.log('💡 Para ver todas las opciones: node corregir-estados-incorrectos.js --help');
  }
}

main();