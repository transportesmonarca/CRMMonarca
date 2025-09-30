const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function corregirFleteFalso() {
    console.log('🔧 CORRIGIENDO DATOS DE FLETE FALSO...\n');
    
    try {
        // 1. Obtener precio global
        console.log('1. OBTENIENDO PRECIO GLOBAL DE FLETE FALSO:');
        const { data: config, error: configError } = await supabase
            .from('configuracion_sistema')
            .select('valor')
            .eq('nombre', 'flete_falso_precio_global')
            .single();
        
        let precioGlobal = 666; // fallback
        if (configError) {
            console.log('⚠️  No se pudo obtener precio global, usando fallback: $666');
        } else {
            precioGlobal = parseFloat(config.valor) || 666;
            console.log('💰 Precio global: $' + precioGlobal);
        }
        console.log('');
        
        // 2. Buscar embarques inconsistentes específicos
        console.log('2. BUSCANDO EMBARQUES ESPECÍFICOS INCONSISTENTES:');
        const { data: inconsistentes, error: error1 } = await supabase
            .from('embarques_completa')
            .select('id, folio, pago_operador, flete_falso, precio_operador_final')
            .eq('flete_falso', true)
            .in('folio', ['TIM-2509-020', 'TIM-2509-036']) // Los que encontramos en el diagnóstico
            .order('created_at', { ascending: false });
        
        if (error1) {
            console.error('❌ Error:', error1);
            return;
        }
        
        console.log('📋 Embarques específicos encontrados:', inconsistentes?.length || 0);
        inconsistentes?.forEach(e => {
            console.log(`   - ${e.folio}: Pago=$${e.pago_operador}, Precio Final=$${e.precio_operador_final}, Flete Falso=${e.flete_falso}`);
        });
        console.log('');
        
        // 3. Corregir usando la función actualizar_flete_falso
        console.log('3. CORRIGIENDO USANDO FUNCIÓN actualizar_flete_falso:');
        
        for (const embarque of inconsistentes || []) {
            if (embarque.precio_operador_final === 0 || embarque.precio_operador_final === null) {
                console.log(`🔧 Corrigiendo ${embarque.folio}...`);
                
                const { data, error } = await supabase
                    .rpc('actualizar_flete_falso', {
                        p_embarque_id: embarque.id,
                        p_es_flete_falso: true,
                        p_precio_flete_falso: precioGlobal
                    });
                
                if (error) {
                    console.error(`❌ Error corrigiendo ${embarque.folio}:`, error);
                } else {
                    console.log(`✅ ${embarque.folio} corregido con precio $${precioGlobal}`);
                }
            } else {
                console.log(`ℹ️  ${embarque.folio} ya tiene precio: $${embarque.precio_operador_final}`);
            }
        }
        console.log('');
        
        // 4. Verificar correcciones
        console.log('4. VERIFICANDO CORRECCIONES:');
        const { data: verificacion, error: error3 } = await supabase
            .from('embarques_completa')
            .select('folio, pago_operador, flete_falso, precio_operador_final')
            .in('folio', ['TIM-2509-020', 'TIM-2509-036'])
            .order('created_at', { ascending: false });
        
        if (error3) {
            console.error('❌ Error en verificación:', error3);
        } else {
            console.log('📋 Estado después de correcciones:');
            verificacion?.forEach(e => {
                const estado = e.precio_operador_final > 0 ? '✅' : '❌';
                console.log(`   ${estado} ${e.folio}: Pago=$${e.pago_operador}, Precio Final=$${e.precio_operador_final}`);
            });
        }
        
        console.log('\n✅ CORRECCIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar corrección
corregirFleteFalso();