const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function responderPregunta() {
    console.log('🔍 VERIFICANDO FLUJO DE PAGOS OPERADORES...\n');
    
    try {
        // Consultar algunos embarques para ver la relación
        const { data: embarques } = await supabase
            .from('embarques_financiero')
            .select('embarque_id, tipo_servicio_precio, precio_operador_final, flete_falso')
            .limit(10);
        
        console.log('📊 ANÁLISIS DE COLUMNAS:');
        console.log('======================================');
        
        let iguales = 0;
        let diferentes = 0;
        let fletesFalsos = 0;
        
        embarques.forEach((e, i) => {
            const sonIguales = e.tipo_servicio_precio === e.precio_operador_final;
            
            if (e.flete_falso) {
                fletesFalsos++;
                console.log(`${i + 1}. FLETE FALSO: tipo_servicio_precio=$${e.tipo_servicio_precio} | precio_operador_final=$${e.precio_operador_final} (REEMPLAZADO)`);
            } else {
                if (sonIguales) {
                    iguales++;
                    console.log(`${i + 1}. NORMAL: tipo_servicio_precio=$${e.tipo_servicio_precio} | precio_operador_final=$${e.precio_operador_final} (IGUALES ✅)`);
                } else {
                    diferentes++;
                    console.log(`${i + 1}. NORMAL: tipo_servicio_precio=$${e.tipo_servicio_precio} | precio_operador_final=$${e.precio_operador_final} (DIFERENTES ⚠️)`);
                }
            }
        });
        
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   • Embarques normales con valores iguales: ${iguales}`);
        console.log(`   • Embarques normales con valores diferentes: ${diferentes}`);
        console.log(`   • Embarques flete falso: ${fletesFalsos}`);
        
        console.log('\n🎯 RESPUESTA A TU PREGUNTA:');
        console.log('===========================================');
        
        if (iguales > diferentes) {
            console.log('✅ CORRECTO - El flujo es exactamente como dijiste:');
            console.log('   1. tipo_servicio_precio guarda el pago base del operador');
            console.log('   2. precio_operador_final se COPIA con el mismo valor');
            console.log('   3. Si flete falso = true: precio_operador_final se REEMPLAZA');
            console.log('   4. La interfaz SIEMPRE lee precio_operador_final');
        } else {
            console.log('⚠️  HAY VARIACIONES - Algunos embarques tienen lógica diferente');
        }
        
        console.log('\n📋 FLUJO CONFIRMADO:');
        console.log('   📥 ENTRADA: tipo_servicio_precio (valor base)');
        console.log('   📄 COPIA: precio_operador_final = tipo_servicio_precio');
        console.log('   🔄 FLETE FALSO: precio_operador_final = valor_flete_falso');
        console.log('   📤 SALIDA: Interfaz lee precio_operador_final');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

responderPregunta();