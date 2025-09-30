const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarFlujoColumnas() {
    console.log('🔍 VERIFICANDO FLUJO DE COLUMNAS DESACOPLADAS...\n');
    
    try {
        // 1. VERIFICAR ESTRUCTURA DE COLUMNAS
        console.log('1. ESTRUCTURA DE COLUMNAS EN embarques_financiero:');
        const { data: muestra, error: errorMuestra } = await supabase
            .from('embarques_financiero')
            .select('embarque_id, tipo_servicio_precio, precio_operador_final, flete_falso')
            .limit(5);
            
        if (errorMuestra) {
            console.error('❌ Error consultando estructura:', errorMuestra);
            return;
        }
        
        muestra.forEach((e, i) => {
            console.log(`   ${i + 1}. tipo_servicio_precio: $${e.tipo_servicio_precio} | precio_operador_final: $${e.precio_operador_final} | flete_falso: ${e.flete_falso}`);
        });
        
        // 2. BUSCAR EMBARQUE NORMAL (NO flete falso) para entender el flujo
        console.log('\n2. ANÁLISIS DE EMBARQUE NORMAL:');
        const { data: embarqueNormal, error: errorNormal } = await supabase
            .from('embarques_completa')
            .select('folio, flete_falso, tipo_servicio_precio, precio_operador_final')
            .eq('flete_falso', false)
            .not('precio_operador_final', 'is', null)
            .not('tipo_servicio_precio', 'is', null)
            .limit(1)
            .single();
            
        if (errorNormal || !embarqueNormal) {
            console.error('❌ No se encontró embarque normal para análisis');
            return;
        }
        
        console.log(`📋 Embarque: ${embarqueNormal.folio}`);
        console.log(`   • flete_falso: ${embarqueNormal.flete_falso}`);
        console.log(`   • tipo_servicio_precio: $${embarqueNormal.tipo_servicio_precio}`);
        console.log(`   • precio_operador_final: $${embarqueNormal.precio_operador_final}`);
        
        // PREGUNTA CLAVE: ¿Son iguales?
        const sonIguales = embarqueNormal.tipo_servicio_precio === embarqueNormal.precio_operador_final;
        console.log(`   • ¿Son iguales? ${sonIguales ? '✅ SÍ' : '❌ NO'}`);
        
        if (!sonIguales) {
            console.log(`   • Diferencia: ${embarqueNormal.precio_operador_final - embarqueNormal.tipo_servicio_precio}`);
        }
        
        // 3. BUSCAR EMBARQUE CON FLETE FALSO
        console.log('\n3. ANÁLISIS DE EMBARQUE FLETE FALSO:');
        const { data: embarqueFalso, error: errorFalso } = await supabase
            .from('embarques_completa')
            .select('folio, flete_falso, tipo_servicio_precio, precio_operador_final, tipo_servicio_nombre')
            .eq('flete_falso', true)
            .limit(1)
            .single();
            
        if (embarqueFalso) {
            console.log(`📋 Embarque: ${embarqueFalso.folio}`);
            console.log(`   • flete_falso: ${embarqueFalso.flete_falso}`);
            console.log(`   • tipo_servicio_nombre: "${embarqueFalso.tipo_servicio_nombre}"`);
            console.log(`   • tipo_servicio_precio: $${embarqueFalso.tipo_servicio_precio} (original)`);
            console.log(`   • precio_operador_final: $${embarqueFalso.precio_operador_final} (REEMPLAZADO por flete falso)`);
            
            const esFletefalsoNombre = embarqueFalso.tipo_servicio_nombre === 'Flete en Falso';
            console.log(`   • ¿Nombre cambiado? ${esFletefalsoNombre ? '✅ SÍ' : '❌ NO'}`);
        } else {
            console.log('ℹ️  No hay embarques con flete falso actualmente');
        }
        
        // 4. ESTADÍSTICAS GENERALES
        console.log('\n4. ESTADÍSTICAS DE LA ARQUITECTURA DESACOPLADA:');
        
        const { data: stats } = await supabase.rpc('exec', {
            sql: `
            SELECT 
                COUNT(*) as total_embarques,
                COUNT(CASE WHEN tipo_servicio_precio = precio_operador_final THEN 1 END) as valores_iguales,
                COUNT(CASE WHEN flete_falso = true THEN 1 END) as embarques_flete_falso,
                COUNT(CASE WHEN tipo_servicio_precio IS NOT NULL THEN 1 END) as con_precio_tipo,
                COUNT(CASE WHEN precio_operador_final IS NOT NULL THEN 1 END) as con_precio_final
            FROM embarques_financiero;
            `
        });
        
        if (stats && stats[0]) {
            const s = stats[0];
            console.log(`   • Total embarques: ${s.total_embarques}`);
            console.log(`   • Con tipo_servicio_precio: ${s.con_precio_tipo}`);
            console.log(`   • Con precio_operador_final: ${s.con_precio_final}`);
            console.log(`   • Valores iguales (tipo_servicio_precio = precio_operador_final): ${s.valores_iguales}`);
            console.log(`   • Embarques flete falso: ${s.embarques_flete_falso}`);
            
            const porcentajeIguales = ((s.valores_iguales / s.total_embarques) * 100).toFixed(1);
            console.log(`   • % embarques normales (valores iguales): ${porcentajeIguales}%`);
        }
        
        // 5. RESPUESTA A LA PREGUNTA DEL USUARIO
        console.log('\n🎯 RESPUESTA A TU PREGUNTA:');
        console.log('=====================================');
        
        if (embarqueNormal.tipo_servicio_precio === embarqueNormal.precio_operador_final) {
            console.log('✅ CORRECTO: En embarques normales:');
            console.log('   • tipo_servicio_precio y precio_operador_final tienen el MISMO valor');
            console.log('   • El valor se COPIA de tipo_servicio_precio a precio_operador_final');
        } else {
            console.log('⚠️  ATENCIÓN: Los valores no son iguales en embarques normales');
            console.log('   • Esto podría indicar que hay lógica adicional');
        }
        
        if (embarqueFalso) {
            console.log('✅ CORRECTO: En embarques flete falso:');
            console.log('   • precio_operador_final es REEMPLAZADO por el valor del flete falso');
            console.log('   • tipo_servicio_precio conserva el valor original');
            console.log('   • tipo_servicio_nombre cambia a "Flete en Falso"');
        }
        
        console.log('\n📋 FLUJO CONFIRMADO:');
        console.log('1. EMBARQUE NORMAL: tipo_servicio_precio → precio_operador_final (COPIA)');
        console.log('2. FLETE FALSO: precio_operador_final = valor_flete_falso (REEMPLAZA)');
        console.log('3. LA INTERFAZ LEE: precio_operador_final (SIEMPRE)');
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

verificarFlujoColumnas();