const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarFuncionSQL() {
    console.log('🔧 CREANDO FUNCIÓN SQL: crear_embarque_normalizado...\n');
    
    try {
        // Leer el archivo SQL
        const fs = require('fs');
        const sqlContent = fs.readFileSync('scripts/119-funcion-crear-embarque-normalizado.sql', 'utf8');
        
        // Ejecutar la función SQL usando rpc
        const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
        
        if (error) {
            console.error('❌ Error creando función:', error);
            return;
        }
        
        console.log('✅ Función crear_embarque_normalizado creada exitosamente');
        
        // Probar la función con datos de ejemplo
        console.log('\n🧪 PROBANDO FUNCIÓN...');
        const { data: embarqueId, error: errorTest } = await supabase.rpc('crear_embarque_normalizado', {
            p_folio: 'TEST-FUNC-001',
            p_cliente_id: null,
            p_tipo_servicio_id: null,
            p_contenido: 'Prueba de función normalizada',
            p_origen: 'Origen Test',
            p_destino: 'Destino Test'
        });
        
        if (errorTest) {
            console.error('❌ Error probando función:', errorTest);
        } else {
            console.log(`✅ Función probada exitosamente. Embarque ID: ${embarqueId}`);
            
            // Verificar que se creó en tablas normalizadas
            const { data: verificacion } = await supabase
                .from('embarques_completa')
                .select('folio, contenido')
                .eq('id', embarqueId)
                .single();
                
            if (verificacion) {
                console.log(`✅ Verificado: ${verificacion.folio} - ${verificacion.contenido}`);
                
                // Limpiar el embarque de prueba
                await supabase.from('embarques_nuevo').delete().eq('id', embarqueId);
                console.log('🧹 Embarque de prueba eliminado');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

ejecutarFuncionSQL();