const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probarLogicaFleteFalso() {
    console.log('🧪 PROBANDO LÓGICA CORREGIDA DE FLETE FALSO...\n');
    
    try {
        // 1. Buscar un embarque de prueba que NO sea flete falso
        console.log('1. BUSCANDO EMBARQUE DE PRUEBA (NO FLETE FALSO):');
        const { data: embarquesPrueba, error: error1 } = await supabase
            .from('embarques_completa')
            .select('id, folio, pago_operador, precio_flete, flete_falso, precio_operador_final, tipo_servicio_precio')
            .eq('flete_falso', false)
            .not('precio_flete', 'is', null)
            .limit(1);
        
        if (error1 || !embarquesPrueba?.length) {
            console.error('❌ Error buscando embarque de prueba:', error1);
            return;
        }
        
        const embarquePrueba = embarquesPrueba[0];
        console.log('📦 Embarque de prueba encontrado:', {
            folio: embarquePrueba.folio,
            precio_flete: embarquePrueba.precio_flete,
            pago_operador_original: embarquePrueba.pago_operador,
            precio_operador_final: embarquePrueba.precio_operador_final,
            flete_falso: embarquePrueba.flete_falso
        });
        console.log('');
        
        // 2. Marcar como flete falso usando nuestra función
        console.log('2. MARCANDO COMO FLETE FALSO:');
        const precioFleteFalso = 666;
        
        const { data, error: error2 } = await supabase
            .rpc('actualizar_flete_falso', {
                p_embarque_id: embarquePrueba.id,
                p_es_flete_falso: true,
                p_precio_flete_falso: precioFleteFalso
            });
        
        if (error2) {
            console.error('❌ Error marcando como flete falso:', error2);
            return;
        }
        
        console.log('✅ Función actualizar_flete_falso ejecutada correctamente');
        console.log('');
        
        // 3. Verificar cambios
        console.log('3. VERIFICANDO CAMBIOS:');
        const { data: embarqueVerificacion, error: error3 } = await supabase
            .from('embarques_completa')
            .select('folio, pago_operador, precio_flete, flete_falso, precio_operador_final, tipo_servicio_precio')
            .eq('id', embarquePrueba.id)
            .single();
        
        if (error3) {
            console.error('❌ Error verificando cambios:', error3);
            return;
        }
        
        console.log('📦 Estado después de marcar flete falso:');
        console.log({
            folio: embarqueVerificacion.folio,
            precio_flete: embarqueVerificacion.precio_flete,
            pago_operador: embarqueVerificacion.pago_operador,
            precio_operador_final: embarqueVerificacion.precio_operador_final,
            flete_falso: embarqueVerificacion.flete_falso
        });
        
        // 4. Validar lógica correcta
        console.log('\n4. VALIDANDO LÓGICA CORRECTA:');
        
        const cambioCorrectoPrecioFlete = embarqueVerificacion.precio_flete === embarquePrueba.precio_flete;
        const cambioCorrectoPagoOperador = embarqueVerificacion.precio_operador_final === precioFleteFalso;
        const cambioCorrectoFleteFalso = embarqueVerificacion.flete_falso === true;
        
        console.log(`✅ Precio del flete SIN CAMBIOS: ${cambioCorrectoPrecioFlete ? 'CORRECTO' : 'ERROR'}`);
        console.log(`   - Original: $${embarquePrueba.precio_flete}`);
        console.log(`   - Actual: $${embarqueVerificacion.precio_flete}`);
        
        console.log(`✅ Pago del operador CAMBIADO: ${cambioCorrectoPagoOperador ? 'CORRECTO' : 'ERROR'}`);
        console.log(`   - Original: $${embarquePrueba.precio_operador_final || embarquePrueba.pago_operador || 'NULL'}`);
        console.log(`   - Actual: $${embarqueVerificacion.precio_operador_final}`);
        console.log(`   - Esperado: $${precioFleteFalso}`);
        
        console.log(`✅ Flag flete_falso ACTIVADO: ${cambioCorrectoFleteFalso ? 'CORRECTO' : 'ERROR'}`);
        
        // 5. Restaurar estado original
        console.log('\n5. RESTAURANDO ESTADO ORIGINAL:');
        const { error: error4 } = await supabase
            .rpc('actualizar_flete_falso', {
                p_embarque_id: embarquePrueba.id,
                p_es_flete_falso: false
            });
        
        if (error4) {
            console.error('❌ Error restaurando estado:', error4);
        } else {
            console.log('✅ Estado original restaurado');
        }
        
        const logicaCorrecta = cambioCorrectoPrecioFlete && cambioCorrectoPagoOperador && cambioCorrectoFleteFalso;
        
        if (logicaCorrecta) {
            console.log('\n🎯 ✅ LÓGICA CORRECTA: El flete falso SOLO cambia el pago del operador, NO el precio del flete');
        } else {
            console.log('\n❌ LÓGICA INCORRECTA: Revisar implementación');
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar prueba
probarLogicaFleteFalso();