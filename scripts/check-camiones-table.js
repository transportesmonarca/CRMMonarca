require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCamionesTable() {
  try {
    console.log('🔍 Verificando estructura de tabla camiones...');
    
    // Primero probar una consulta simple en la tabla camiones
    const { data: testData, error: testError } = await supabase
      .from('camiones')
      .select('id, proxima_verificacion')
      .limit(1);

    if (testError) {
      console.error('❌ Error consultando tabla camiones:', JSON.stringify(testError, null, 2));
      
      // Si el error es por columna que no existe
      if (testError.message && testError.message.includes('proxima_verificacion')) {
        console.log('🔧 La columna proxima_verificacion no existe. Intentando agregarla...');
        
        // Intentar agregar la columna usando SQL directo
        const { error: alterError } = await supabase
          .rpc('execute_sql', { 
            sql: 'ALTER TABLE camiones ADD COLUMN IF NOT EXISTS proxima_verificacion DATE;' 
          });
        
        if (alterError) {
          console.error('❌ Error agregando columna con execute_sql:', alterError);
          
          // Probar con otra función RPC
          const { error: alterError2 } = await supabase
            .rpc('exec_sql', { 
              query: 'ALTER TABLE camiones ADD COLUMN IF NOT EXISTS proxima_verificacion DATE;' 
            });
            
          if (alterError2) {
            console.error('❌ Error agregando columna con exec_sql:', alterError2);
            console.log('💡 Necesitas ejecutar manualmente en Supabase:');
            console.log('   ALTER TABLE camiones ADD COLUMN IF NOT EXISTS proxima_verificacion DATE;');
          } else {
            console.log('✅ Columna proxima_verificacion agregada exitosamente');
          }
        } else {
          console.log('✅ Columna proxima_verificacion agregada exitosamente');
        }
      }
    } else {
      console.log('✅ La tabla camiones y la columna proxima_verificacion funcionan correctamente');
      console.log('📊 Datos de prueba:', testData);
    }

  } catch (error) {
    console.error('❌ Error general:', JSON.stringify(error, null, 2));
  }
}

checkCamionesTable();