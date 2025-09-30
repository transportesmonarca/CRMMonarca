const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarFleteFalso() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE FLETE FALSO...\n');
    
    try {
        // 1. Verificar embarques con flete falso
        console.log('1. BUSCANDO EMBARQUES CON FLETE FALSO:');
        const { data: embarquesFleteFalso, error: error1 } = await supabase
            .from('embarques_completa')
            .select('folio, pago_operador, flete_falso, tipo_servicio_precio, tipo_servicio_nombre, precio_operador_final')
            .eq('flete_falso', true)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error1) {
            console.error('❌ Error:', error1);
        } else {
            console.log('📋 Embarques con flete falso encontrados:', embarquesFleteFalso?.length || 0);
            embarquesFleteFalso?.forEach(e => {
                console.log(`   - Folio: ${e.folio}, Pago: $${e.pago_operador}, Precio Final: $${e.precio_operador_final}`);
            });
        }
        console.log('');
        
        // 2. Buscar embarques con precio 666
        console.log('2. BUSCANDO EMBARQUES CON PRECIO 666:');
        const { data: embarques666, error: error2 } = await supabase
            .from('embarques_completa')
            .select('folio, pago_operador, flete_falso, precio_operador_final')
            .or('pago_operador.eq.666,precio_operador_final.eq.666')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error2) {
            console.error('❌ Error:', error2);
        } else {
            console.log('📋 Embarques con precio 666 encontrados:', embarques666?.length || 0);
            embarques666?.forEach(e => {
                console.log(`   - Folio: ${e.folio}, Pago: $${e.pago_operador}, Precio Final: $${e.precio_operador_final}, Flete Falso: ${e.flete_falso}`);
            });
        }
        console.log('');
        
        // 3. Revisar modificaciones con flete en falso
        console.log('3. BUSCANDO MODIFICACIONES CON FLETE EN FALSO:');
        const { data: modificaciones, error: error3 } = await supabase
            .from('embarque_modificaciones')
            .select(`
                embarque_id,
                flete_en_falso,
                fecha_modificacion,
                operador_original_nombre,
                operador_nuevo_nombre,
                razon,
                embarques_nuevo!inner(folio)
            `)
            .eq('flete_en_falso', true)
            .order('fecha_modificacion', { ascending: false })
            .limit(5);
        
        if (error3) {
            console.error('❌ Error:', error3);
        } else {
            console.log('📋 Modificaciones con flete en falso encontradas:', modificaciones?.length || 0);
            modificaciones?.forEach(m => {
                console.log(`   - Folio: ${m.embarques_nuevo?.folio}, Operador Original: ${m.operador_original_nombre}, Nuevo: ${m.operador_nuevo_nombre}`);
            });
        }
        console.log('');
        
        // 4. Revisar precio global de flete falso
        console.log('4. REVISANDO PRECIO GLOBAL DE FLETE FALSO:');
        const { data: config, error: error4 } = await supabase
            .from('configuracion_sistema')
            .select('nombre, valor, fecha_actualizacion')
            .eq('nombre', 'flete_falso_precio_global')
            .single();
        
        if (error4) {
            console.error('❌ Error:', error4);
        } else {
            console.log('💰 Precio global configurado:', config?.valor || 'NO CONFIGURADO');
            console.log('📅 Última actualización:', config?.fecha_actualizacion || 'N/A');
        }
        console.log('');
        
        // 5. Verificar inconsistencias
        console.log('5. BUSCANDO INCONSISTENCIAS (FLETE FALSO CON PRECIO 0):');
        const { data: inconsistencias, error: error5 } = await supabase
            .from('embarques_completa')
            .select('folio, pago_operador, flete_falso, precio_operador_final')
            .eq('flete_falso', true)
            .eq('precio_operador_final', 0);
        
        if (error5) {
            console.error('❌ Error:', error5);
        } else {
            console.log('⚠️  Embarques con flete falso pero precio 0:', inconsistencias?.length || 0);
            inconsistencias?.forEach(e => {
                console.log(`   - Folio: ${e.folio}, Pago: $${e.pago_operador}, Precio Final: $${e.precio_operador_final}`);
            });
        }
        
        console.log('\n✅ DIAGNÓSTICO COMPLETADO');
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar diagnóstico
diagnosticarFleteFalso();