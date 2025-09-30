const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listarTablasExistentes() {
  try {
    console.log('🔍 Listando todas las tablas existentes relacionadas con embarques...\n');
    
    // Consultar metadatos para ver qué tablas existen
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%embarque%');
      
    if (error) {
      console.log('❌ No se pudieron listar las tablas, intentando método alternativo...');
      
      // Método alternativo: probar tablas conocidas del proyecto
      const tablasConocidas = [
        'embarques',
        'embarques_normalizados',
        'embarques_temp_2509',
        'embarques_migrados',
        'temp_embarques_2509',
        'embarques_backup',
        'embarques_v2',
        'embarques_draft',
        'crear_embarque_temp',
        'embarques_pendientes_migracion'
      ];
      
      console.log('📋 Probando tablas conocidas del proyecto:\n');
      
      for (const tabla of tablasConocidas) {
        try {
          const { data, error } = await supabase
            .from(tabla)
            .select('folio')
            .limit(1);
            
          if (error) {
            console.log(`   ⚪ ${tabla}: No existe`);
          } else {
            console.log(`   ✅ ${tabla}: Existe (${data.length} registros en sample)`);
            
            // Si existe, buscar nuestro embarque
            const { data: found, error: searchError } = await supabase
              .from(tabla)
              .select('folio, estado, estado_facturacion')
              .eq('folio', 'TIM-2509-040');
              
            if (!searchError && found && found.length > 0) {
              console.log(`      🎯 ¡TIM-2509-040 ENCONTRADO en ${tabla}!`);
              console.log(`         Estado: ${found[0].estado}`);
              console.log(`         Facturación: ${found[0].estado_facturacion || 'NULL'}`);
              return { tabla, datos: found[0] };
            }
          }
        } catch (err) {
          console.log(`   ❌ ${tabla}: Error - ${err.message}`);
        }
      }
    } else if (tables && tables.length > 0) {
      console.log('📋 Tablas relacionadas con embarques encontradas:');
      tables.forEach(t => console.log(`   - ${t.table_name}`));
      
      // Buscar en cada tabla encontrada
      console.log('\n🔍 Buscando TIM-2509-040 en cada tabla...');
      
      for (const table of tables) {
        try {
          const { data: found, error } = await supabase
            .from(table.table_name)
            .select('folio, estado, estado_facturacion')
            .eq('folio', 'TIM-2509-040');
            
          if (!error && found && found.length > 0) {
            console.log(`   🎯 ¡ENCONTRADO en ${table.table_name}!`);
            console.log(`      Estado: ${found[0].estado}`);
            console.log(`      Facturación: ${found[0].estado_facturacion || 'NULL'}`);
            return { tabla: table.table_name, datos: found[0] };
          } else {
            console.log(`   ⚪ No encontrado en ${table.table_name}`);
          }
        } catch (err) {
          console.log(`   ❌ Error en ${table.table_name}: ${err.message}`);
        }
      }
    }
    
    console.log('\n❌ No se encontró TIM-2509-040 en ninguna tabla');
    console.log('\n💡 Esto confirma que el problema puede ser:');
    console.log('1. 📱 El embarque existe solo en localStorage del navegador');
    console.log('2. 🔄 La vista embarques_completa incluye datos temporales/calculados');
    console.log('3. 📊 Los datos se generan dinámicamente desde otra fuente');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar búsqueda
listarTablasExistentes().then(resultado => {
  if (resultado) {
    console.log(`\n✅ Resumen: TIM-2509-040 encontrado en tabla "${resultado.tabla}"`);
    console.log('💡 Ahora podemos proceder a corregir el estado en esa tabla');
  } else {
    console.log('\n🔍 Siguiente paso: Revisar localStorage del navegador');
    console.log('💻 Ejecutar en consola del navegador:');
    console.log('   localStorage.getItem("embarquesCompletados")');
    console.log('   localStorage.getItem("embarquesAsignados")');
  }
});