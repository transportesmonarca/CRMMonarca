const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function auditarEmbarquesFantasma() {
  try {
    console.log('👻 AUDITORIA DE EMBARQUES FANTASMA EN LOCALSTORAGE');
    console.log('=================================================\n');
    
    // Simular datos que podrían estar en localStorage
    // (En la realidad esto vendría del navegador)
    const posiblesEmbarquesLS = [
      'TIM-2509-040',
      'TIM-2509-039', 
      'TIM-2509-038',
      'TIM-2509-037'
    ];
    
    console.log('🔍 Verificando qué embarques existen realmente en BD vs localStorage...\n');
    
    const fantasmas = [];
    const reales = [];
    
    for (const folio of posiblesEmbarquesLS) {
      console.log(`📋 Verificando ${folio}:`);
      
      // Buscar en tabla principal
      const { data: enTabla, error } = await supabase
        .from('embarques')
        .select('folio, estado, estado_facturacion')
        .eq('folio', folio);
        
      // Buscar en vista completa
      const { data: enVista, error: errorVista } = await supabase
        .from('embarques_completa')
        .select('folio, estado, estado_facturacion')
        .eq('folio', folio);
      
      if (error || errorVista) {
        console.log(`   ❌ Error al consultar: ${error?.message || errorVista?.message}`);
        continue;
      }
      
      const existeEnTabla = enTabla && enTabla.length > 0;
      const existeEnVista = enVista && enVista.length > 0;
      
      if (!existeEnTabla && existeEnVista) {
        console.log(`   👻 FANTASMA: Solo en vista, no en tabla`);
        console.log(`      Estado en vista: ${enVista[0].estado}`);
        console.log(`      Facturación en vista: ${enVista[0].estado_facturacion || 'NULL'}`);
        fantasmas.push({
          folio,
          estado: enVista[0].estado,
          estado_facturacion: enVista[0].estado_facturacion
        });
      } else if (existeEnTabla) {
        console.log(`   ✅ REAL: Existe en tabla principal`);
        console.log(`      Estado: ${enTabla[0].estado}`);
        console.log(`      Facturación: ${enTabla[0].estado_facturacion || 'NULL'}`);
        reales.push({
          folio,
          estado: enTabla[0].estado,
          estado_facturacion: enTabla[0].estado_facturacion
        });
      } else {
        console.log(`   ⚪ NO ENCONTRADO: Ni en tabla ni en vista`);
      }
      console.log('');
    }
    
    console.log('📊 RESUMEN DE LA AUDITORIA:');
    console.log('==========================');
    console.log(`👻 Embarques fantasma (solo localStorage): ${fantasmas.length}`);
    console.log(`✅ Embarques reales (en BD): ${reales.length}`);
    
    if (fantasmas.length > 0) {
      console.log('\n👻 EMBARQUES FANTASMA DETECTADOS:');
      fantasmas.forEach(e => {
        console.log(`   - ${e.folio}: ${e.estado} (${e.estado_facturacion || 'sin facturación'})`);
      });
      
      console.log('\n🧹 COMANDOS PARA LIMPIAR EN NAVEGADOR:');
      console.log('=====================================');
      console.log('// Ejecutar en consola del navegador (F12 > Console):');
      console.log('');
      console.log('// 1. Ver qué hay actualmente');
      console.log('console.log("Completados:", JSON.parse(localStorage.getItem("embarquesCompletados") || "[]"));');
      console.log('console.log("Asignados:", JSON.parse(localStorage.getItem("embarquesAsignados") || "[]"));');
      console.log('');
      console.log('// 2. Limpiar embarques fantasma');
      fantasmas.forEach(e => {
        console.log(`// Eliminar ${e.folio}:`);
        console.log(`["embarquesCompletados", "embarquesAsignados", "embarquesCreados"].forEach(key => {`);
        console.log(`  const items = JSON.parse(localStorage.getItem(key) || "[]");`);
        console.log(`  const filtered = items.filter(item => item.folio !== "${e.folio}");`);
        console.log(`  localStorage.setItem(key, JSON.stringify(filtered));`);
        console.log(`});`);
        console.log('');
      });
      console.log('// 3. Recargar página');
      console.log('location.reload();');
    }
    
    if (reales.length > 0) {
      console.log('\n✅ EMBARQUES REALES CON PROBLEMAS DE ESTADO:');
      const problemasReales = reales.filter(e => 
        e.estado === 'pendiente' || 
        (e.estado_facturacion && e.estado !== 'finalizado')
      );
      
      if (problemasReales.length > 0) {
        console.log(`🔧 ${problemasReales.length} embarques reales necesitan corrección de estado`);
        problemasReales.forEach(e => {
          console.log(`   - ${e.folio}: ${e.estado} (facturación: ${e.estado_facturacion || 'NULL'})`);
        });
      } else {
        console.log('   Todos los embarques reales tienen estados correctos ✅');
      }
    }
    
    return { fantasmas, reales };
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

auditarEmbarquesFantasma();