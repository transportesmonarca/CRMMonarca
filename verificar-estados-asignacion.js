const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarEstadosAsignacion() {
  console.log('🔍 VERIFICANDO ESTADOS EN SECCIÓN DE ASIGNACIÓN');
  console.log('='.repeat(60));

  try {
    // Verificar embarques en diferentes estados
    const { data: todosEmbarques, error } = await supabase
      .from('embarques_nuevo')
      .select('id, folio, estado, created_at')
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error consultando embarques:', error);
      return;
    }

    console.log('📊 ESTADOS ENCONTRADOS:');
    
    const porEstado = {};
    (todosEmbarques || []).forEach(e => {
      if (!porEstado[e.estado]) porEstado[e.estado] = [];
      porEstado[e.estado].push(e);
    });

    // Mostrar estadísticas
    Object.keys(porEstado).forEach(estado => {
      const count = porEstado[estado].length;
      const icon = estado === 'listo-para-asignar' ? '🟦' : 
                   estado === 'asignado' ? '🟨' : '🟩';
      console.log(`${icon} ${estado.toUpperCase()}: ${count} embarques`);
    });

    console.log('\n📋 EJEMPLOS POR ESTADO:');
    
    Object.keys(porEstado).forEach(estado => {
      console.log(`\n--- ${estado.toUpperCase()} ---`);
      porEstado[estado].slice(0, 3).forEach(e => {
        const fecha = new Date(e.created_at).toLocaleDateString('es-MX');
        console.log(`   ${e.folio} (${fecha})`);
      });
      if (porEstado[estado].length > 3) {
        console.log(`   ... y ${porEstado[estado].length - 3} más`);
      }
    });

    console.log('\n✅ CONCLUSIÓN:');
    console.log('   La sección de Asignación ahora mostrará:');
    console.log('   🟦 Embarques "listo-para-asignar" → Para asignar recursos');
    console.log('   🟨 Embarques "asignado" → Ya asignados, pueden modificarse');  
    console.log('   🟩 Embarques "en-transito" → En proceso, seguimiento');
    
    const total = Object.values(porEstado).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n📈 TOTAL EN ASIGNACIÓN: ${total} embarques activos`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// También verificar embarques legacy
async function verificarEmbarquesLegacy() {
  console.log('\n🔍 VERIFICANDO EMBARQUES LEGACY...');
  
  try {
    const { data: embarquesLegacy, error } = await supabase
      .from('embarques')
      .select('id, folio, estado, fecha_creacion')
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito'])
      .order('fecha_creacion', { ascending: false })
      .limit(10);

    if (error || !embarquesLegacy?.length) {
      console.log('   💡 Sin embarques legacy en estos estados');
      return;
    }

    const porEstado = {};
    embarquesLegacy.forEach(e => {
      if (!porEstado[e.estado]) porEstado[e.estado] = 0;
      porEstado[e.estado]++;
    });

    Object.keys(porEstado).forEach(estado => {
      console.log(`   📦 Legacy ${estado}: ${porEstado[estado]} embarques`);
    });

  } catch (e) {
    console.log('   ⚠️  Error consultando legacy:', e.message);
  }
}

async function main() {
  await verificarEstadosAsignacion();
  await verificarEmbarquesLegacy();
  
  console.log('\n🎯 PRÓXIMOS PASOS:');
  console.log('   1. Abrir sección "Asignar Operadores" en la aplicación');
  console.log('   2. Verificar que filtro "Todos" muestra los 3 estados');
  console.log('   3. Probar filtros individuales para cada estado');
  console.log('   4. Confirmar que estadísticas coinciden con la realidad');
  
  process.exit(0);
}

main();