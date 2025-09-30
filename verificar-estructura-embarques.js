// Verificar estructura de la tabla embarques
require('dotenv').config({ path: './env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEstructura() {
  try {
    console.log('🔍 Verificando estructura de tabla embarques...');
    
    // Obtener información de columnas
    const { data: columnas, error: errorColumnas } = await supabase
      .rpc('get_table_columns', { table_name: 'embarques' })
      .then(result => {
        if (result.error) {
          // Si la función RPC no existe, intentar query directo
          console.log('⚠️  Función RPC no disponible, usando query directo...');
          return supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'embarques')
            .eq('table_schema', 'public')
            .order('ordinal_position');
        }
        return result;
      });

    if (errorColumnas) {
      console.error('❌ Error obteniendo columnas:', errorColumnas);
      
      // Intentar una consulta simple para verificar si la tabla existe
      console.log('🔍 Verificando si la tabla embarques existe...');
      const { data: testData, error: testError } = await supabase
        .from('embarques')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('❌ Error accediendo a tabla embarques:', testError);
        return;
      }
      
      console.log('✅ Tabla embarques accesible, pero no se pudo obtener estructura');
      console.log('📋 Muestra de datos:', testData);
      return;
    }

    console.log('📋 Columnas encontradas:', columnas?.length || 0);
    
    if (columnas && columnas.length > 0) {
      console.log('\n📊 ESTRUCTURA DE TABLA EMBARQUES:');
      console.log('═══════════════════════════════════');
      
      columnas.forEach((col, index) => {
        const nombre = col.column_name || col.name;
        const tipo = col.data_type || col.type;
        const nullable = col.is_nullable || col.nullable;
        const defaultVal = col.column_default || col.default;
        
        console.log(`${index + 1}. ${nombre}`);
        console.log(`   Tipo: ${tipo}`);
        console.log(`   Nullable: ${nullable}`);
        if (defaultVal) console.log(`   Default: ${defaultVal}`);
        console.log('');
      });
    }
    
    // Verificar que columnas críticas existan
    const columnasRequeridas = [
      'folio', 'cliente_id', 'tipo_servicio_id', 'contenido', 'peso',
      'origen', 'destino', 'fecha_recolecta', 'fecha_entrega',
      'estado', 'estado_facturacion', 'fecha_creacion', 'updated_at'
    ];
    
    console.log('\n🔍 VERIFICACIÓN DE COLUMNAS CRÍTICAS:');
    console.log('════════════════════════════════════');
    
    const nombresColumnas = (columnas || []).map(col => col.column_name || col.name);
    
    columnasRequeridas.forEach(col => {
      const existe = nombresColumnas.includes(col);
      console.log(`${existe ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('💥 Error durante verificación:', error);
  }
}

// Ejecutar verificación
verificarEstructura();