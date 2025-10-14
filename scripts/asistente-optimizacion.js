import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.log('\n⚠️  Necesitas agregar en .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=tu_url');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=tu_key (para operaciones admin)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para preguntar al usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta.toLowerCase().trim());
    });
  });
}

console.log('\n' + '='.repeat(80));
console.log('🚀 ASISTENTE DE OPTIMIZACIÓN - TABLA LOCATIONS');
console.log('='.repeat(80));
console.log('\nEste script te ayudará a optimizar la tabla locations paso a paso.');
console.log('⚠️  IMPORTANTE: Solo úsalo si tienes duplicados en la tabla.\n');

async function optimizar() {
  try {
    // PASO 1: Análisis
    console.log('\n📊 PASO 1: Análisis de la situación actual\n');
    console.log('Analizando tabla locations...');
    
    const { count: totalRegistros } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });

    const { data: operadores } = await supabase
      .from('locations')
      .select('operator_id')
      .not('operator_id', 'is', null);

    const operadoresUnicos = new Set(operadores?.map(o => o.operator_id) || []).size;

    console.log(`\n✅ Resultados:`);
    console.log(`   Total de registros: ${totalRegistros || 0}`);
    console.log(`   Operadores únicos: ${operadoresUnicos}`);
    console.log(`   Promedio por operador: ${totalRegistros && operadoresUnicos ? Math.round(totalRegistros / operadoresUnicos) : 0}`);

    if (totalRegistros === operadoresUnicos) {
      console.log('\n✅ ¡Tu tabla ya está optimizada!');
      console.log('   Solo hay 1 ubicación por operador.');
      console.log('   Pero aún necesitas:');
      console.log('   1. Agregar constraint UNIQUE');
      console.log('   2. Crear índices');
      console.log('   3. Actualizar app móvil para usar UPSERT\n');
      
      const continuar = await pregunta('¿Deseas continuar con los pasos 2 y 3? (si/no): ');
      if (continuar !== 'si' && continuar !== 's' && continuar !== 'yes' && continuar !== 'y') {
        console.log('\n👋 Operación cancelada.');
        rl.close();
        return;
      }
    }

    // Ver duplicados
    const { data: duplicados } = await supabase.rpc('get_location_duplicates')
      .catch(async () => {
        // Consulta alternativa si RPC no existe
        const { data: allLocs } = await supabase
          .from('locations')
          .select('operator_id, id, captured_at')
          .not('operator_id', 'is', null)
          .order('operator_id')
          .order('captured_at', { ascending: false });

        const grouped = {};
        allLocs?.forEach(loc => {
          if (!grouped[loc.operator_id]) {
            grouped[loc.operator_id] = [];
          }
          grouped[loc.operator_id].push(loc);
        });

        return {
          data: Object.entries(grouped)
            .filter(([_, locs]) => locs.length > 1)
            .map(([operator_id, locs]) => ({
              operator_id,
              count: locs.length,
              to_delete: locs.length - 1
            }))
        };
      });

    if (duplicados && duplicados.data && duplicados.data.length > 0) {
      console.log(`\n⚠️  Operadores con duplicados encontrados: ${duplicados.data.length}`);
      console.log('\n🔝 Top 5 con más ubicaciones:\n');
      
      duplicados.data.slice(0, 5).forEach((dup, i) => {
        console.log(`   ${i + 1}. Operador: ${dup.operator_id}`);
        console.log(`      Total: ${dup.count} ubicaciones`);
        console.log(`      A eliminar: ${dup.to_delete}\n`);
      });

      const registrosAEliminar = duplicados.data.reduce((sum, d) => sum + d.to_delete, 0);
      console.log(`\n📊 Total de registros que se eliminarán: ${registrosAEliminar}`);
      console.log(`   Se mantendrán: ${totalRegistros - registrosAEliminar}`);
      console.log(`   (Solo la ubicación más reciente de cada operador)\n`);
    }

    // PASO 2: Confirmación
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  ADVERTENCIA');
    console.log('='.repeat(80));
    console.log('\nEste script realizará las siguientes acciones:');
    console.log('1. Crear un backup de la tabla locations');
    console.log('2. Eliminar ubicaciones duplicadas (mantiene solo la más reciente)');
    console.log('3. Agregar constraint UNIQUE para prevenir futuros duplicados');
    console.log('4. Crear índices para optimizar consultas');
    console.log('\n⚠️  IMPORTANTE: Los registros eliminados NO se pueden recuperar');
    console.log('   (excepto desde el backup)\n');

    const confirmar = await pregunta('¿Deseas continuar? (si/no): ');
    
    if (confirmar !== 'si' && confirmar !== 's' && confirmar !== 'yes' && confirmar !== 'y') {
      console.log('\n👋 Operación cancelada por el usuario.');
      rl.close();
      return;
    }

    // PASO 3: Crear backup
    console.log('\n📦 PASO 2: Creando backup de seguridad...\n');
    
    const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const backupTable = `locations_backup_${fecha}`;

    console.log(`   Nombre del backup: ${backupTable}`);
    console.log('   Esto puede tomar unos segundos...\n');

    // Nota: Este paso requiere permisos de admin, si falla, el usuario debe hacerlo en Supabase SQL Editor
    console.log('⚠️  IMPORTANTE:');
    console.log('   Este script no puede crear el backup automáticamente.');
    console.log('   Debes ejecutar esto manualmente en Supabase SQL Editor:\n');
    console.log(`   CREATE TABLE ${backupTable} AS SELECT * FROM locations;\n`);

    const backupHecho = await pregunta('¿Ya creaste el backup en Supabase? (si/no): ');
    
    if (backupHecho !== 'si' && backupHecho !== 's') {
      console.log('\n⚠️  Por favor, crea el backup primero.');
      console.log(`\n   Ve a Supabase → SQL Editor y ejecuta:`);
      console.log(`   CREATE TABLE ${backupTable} AS SELECT * FROM locations;`);
      console.log('\n   Luego ejecuta este script de nuevo.\n');
      rl.close();
      return;
    }

    // PASO 4: Mostrar instrucciones SQL
    console.log('\n📝 PASO 3: SQL para ejecutar en Supabase\n');
    console.log('='.repeat(80));
    console.log('\nCopia y pega el siguiente SQL en Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    
    const sqlScript = `
-- 1. Eliminar duplicados (mantener solo el más reciente)
DELETE FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    WHERE operator_id IS NOT NULL
    ORDER BY operator_id, captured_at DESC NULLS LAST
);

-- 2. Limpiar registros sin operator_id
DELETE FROM locations
WHERE operator_id IS NULL OR operator_id = '';

-- 3. Agregar constraint UNIQUE
ALTER TABLE locations 
DROP CONSTRAINT IF EXISTS unique_operator_location;

ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

-- 4. Crear índices
DROP INDEX IF EXISTS idx_locations_operator_id;
CREATE INDEX idx_locations_operator_id 
ON locations(operator_id) 
WHERE operator_id IS NOT NULL;

DROP INDEX IF EXISTS idx_locations_captured_at;
CREATE INDEX idx_locations_captured_at 
ON locations(captured_at DESC);

DROP INDEX IF EXISTS idx_locations_operator_captured;
CREATE INDEX idx_locations_operator_captured 
ON locations(operator_id, captured_at DESC)
WHERE operator_id IS NOT NULL;

-- 5. Agregar columnas útiles
ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS speed NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accuracy NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS altitude NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS heading NUMERIC;

-- 6. Verificar resultado
SELECT 
    '✅ OPTIMIZACIÓN COMPLETADA' as resultado,
    COUNT(*) as registros_actuales,
    COUNT(DISTINCT operator_id) as operadores_con_ubicacion
FROM locations;
`;

    console.log(sqlScript);
    console.log('='.repeat(80));
    console.log('\n✅ SQL generado exitosamente!');
    console.log('\n📋 INSTRUCCIONES:');
    console.log('   1. Ve a https://supabase.com');
    console.log('   2. Selecciona tu proyecto');
    console.log('   3. Ve a SQL Editor');
    console.log('   4. Copia y pega el SQL de arriba');
    console.log('   5. Haz click en "Run"');
    console.log('   6. Verifica que veas "✅ OPTIMIZACIÓN COMPLETADA"\n');

    console.log('\n📝 También puedes encontrar el SQL completo en:');
    console.log('   scripts/EJECUTAR-OPTIMIZACION-SIMPLE.sql\n');

    console.log('\n🎯 PRÓXIMOS PASOS:\n');
    console.log('   1. ✅ Optimizar base de datos (SQL arriba)');
    console.log('   2. ⬜ Actualizar app móvil Android (cambiar INSERT por UPSERT)');
    console.log('   3. ⬜ Implementar throttling en app móvil');
    console.log('   4. ⬜ Probar con operadores reales\n');

    console.log('📚 Documentación completa:');
    console.log('   - GUIA-PASO-A-PASO-OPTIMIZACION.md');
    console.log('   - RESUMEN-EJECUTIVO-LOCATIONS.md');
    console.log('   - OPTIMIZACION-TABLA-LOCATIONS.md\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n⚠️  Si encuentras errores, revisa:');
    console.log('   1. Que tengas SUPABASE_SERVICE_ROLE_KEY en .env.local');
    console.log('   2. Que la conexión a Supabase esté activa');
    console.log('   3. Ejecuta el SQL manualmente en Supabase SQL Editor\n');
  } finally {
    rl.close();
  }
}

optimizar();
