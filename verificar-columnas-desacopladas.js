const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarColumnasDesacopladas() {
    console.log('🔍 VERIFICANDO ESTADO DE COLUMNAS DESACOPLADAS...\n');
    
    try {
        // 1. Verificar que existen las columnas desacopladas
        console.log('1. VERIFICANDO EXISTENCIA DE COLUMNAS DESACOPLADAS:');
        const { data: embarques, error: error1 } = await supabase
            .from('embarques_completa')
            .select(`
                folio, 
                tipo_servicio_nombre_original, 
                tipo_servicio_nombre, 
                precio_operador_final, 
                pago_operador,
                flete_falso
            `)
            .limit(5);
        
        if (error1) {
            console.error('❌ Error:', error1);
            return;
        }
        
        console.log('✅ Columnas disponibles verificadas');
        console.log('');
        
        // 2. Mostrar algunos ejemplos
        console.log('2. EJEMPLOS DE DATOS ACTUALES:');
        embarques?.forEach((e, index) => {
            console.log(`📋 Embarque ${index + 1}: ${e.folio}`);
            console.log(`   • tipo_servicio_nombre_original: "${e.tipo_servicio_nombre_original}" (del JOIN)`);
            console.log(`   • tipo_servicio_nombre: "${e.tipo_servicio_nombre || 'NULL'}" (desacoplada)`);
            console.log(`   • precio_operador_final: $${e.precio_operador_final || 'NULL'} (desacoplada)`);
            console.log(`   • pago_operador: $${e.pago_operador || 'NULL'} (antigua)`);
            console.log(`   • flete_falso: ${e.flete_falso}`);
            console.log('');
        });
        
        // 3. Contar cuántos embarques tienen datos en las columnas desacopladas
        console.log('3. ESTADÍSTICAS DE COLUMNAS DESACOPLADAS:');
        
        const { data: stats, error: error2 } = await supabase
            .from('embarques_completa')
            .select('tipo_servicio_nombre, precio_operador_final')
            .not('tipo_servicio_nombre', 'is', null)
            .not('precio_operador_final', 'is', null);
        
        if (error2) {
            console.error('❌ Error en estadísticas:', error2);
        } else {
            console.log(`✅ Embarques con tipo_servicio_nombre poblado: ${stats?.length || 0}`);
        }
        
        const { data: totalStats, error: error3 } = await supabase
            .from('embarques_completa')
            .select('folio', { count: 'exact' });
        
        if (error3) {
            console.error('❌ Error en total:', error3);
        } else {
            const total = totalStats?.length || 0;
            const poblados = stats?.length || 0;
            const porcentaje = total > 0 ? ((poblados / total) * 100).toFixed(1) : '0';
            console.log(`📊 Total de embarques: ${total}`);
            console.log(`📊 Embarques con datos desacoplados: ${poblados} (${porcentaje}%)`);
        }
        
        // 4. Verificar embarques de flete falso específicamente
        console.log('');
        console.log('4. EMBARQUES DE FLETE FALSO:');
        const { data: fleteFalso, error: error4 } = await supabase
            .from('embarques_completa')
            .select(`
                folio, 
                tipo_servicio_nombre_original, 
                tipo_servicio_nombre, 
                precio_operador_final,
                flete_falso
            `)
            .eq('flete_falso', true)
            .limit(10);
        
        if (error4) {
            console.error('❌ Error en flete falso:', error4);
        } else {
            console.log(`🚚 Embarques de flete falso encontrados: ${fleteFalso?.length || 0}`);
            fleteFalso?.forEach((e, index) => {
                console.log(`   ${index + 1}. ${e.folio}:`);
                console.log(`      • Nombre original: "${e.tipo_servicio_nombre_original}"`);
                console.log(`      • Nombre desacoplado: "${e.tipo_servicio_nombre || 'NULL'}"`);
                console.log(`      • Precio final: $${e.precio_operador_final || 'NULL'}`);
            });
        }
        
        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        console.log('📋 SIGUIENTE PASO: Modificar interfaz para usar solo columnas desacopladas');
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar verificación
verificarColumnasDesacopladas();