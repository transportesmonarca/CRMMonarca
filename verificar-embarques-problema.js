const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEmbarquesProblema() {
    console.log('🔍 VERIFICANDO EMBARQUES TIM-2509-037 y TIM-2509-038...\n');
    
    try {
        // Buscar en tabla LEGACY (embarques)
        console.log('1. BUSCANDO EN TABLA LEGACY (embarques):');
        const { data: legacyEmbarques, error: errorLegacy } = await supabase
            .from('embarques')
            .select('folio, created_at, cliente_id, tipo_servicio_id')
            .or('folio.eq.TIM-2509-037,folio.eq.TIM-2509-038')
            .order('created_at', { ascending: false });
        
        if (errorLegacy) {
            console.error('❌ Error consultando tabla legacy:', errorLegacy);
        } else if (legacyEmbarques.length > 0) {
            console.log(`❌ PROBLEMA CONFIRMADO: ${legacyEmbarques.length} embarques encontrados en tabla LEGACY:`);
            legacyEmbarques.forEach(e => {
                console.log(`   • ${e.folio} - Creado: ${new Date(e.created_at).toLocaleString()}`);
            });
        } else {
            console.log('✅ No encontrados en tabla legacy');
        }
        
        // Buscar en tablas NORMALIZADAS (embarques_nuevo)  
        console.log('\n2. BUSCANDO EN TABLAS NORMALIZADAS (embarques_nuevo):');
        const { data: normalizadosEmbarques, error: errorNorm } = await supabase
            .from('embarques_nuevo')
            .select('folio, created_at, cliente_id, tipo_servicio_id')
            .or('folio.eq.TIM-2509-037,folio.eq.TIM-2509-038')
            .order('created_at', { ascending: false });
        
        if (errorNorm) {
            console.error('❌ Error consultando tablas normalizadas:', errorNorm);
        } else if (normalizadosEmbarques.length > 0) {
            console.log(`✅ CORRECTO: ${normalizadosEmbarques.length} embarques encontrados en tablas NORMALIZADAS:`);
            normalizadosEmbarques.forEach(e => {
                console.log(`   • ${e.folio} - Creado: ${new Date(e.created_at).toLocaleString()}`);
            });
        } else {
            console.log('❌ PROBLEMA: No encontrados en tablas normalizadas');
        }
        
        // Buscar otros embarques recientes en legacy
        console.log('\n3. EMBARQUES RECIENTES EN TABLA LEGACY:');
        const { data: recientesLegacy } = await supabase
            .from('embarques')
            .select('folio, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (recientesLegacy && recientesLegacy.length > 0) {
            console.log(`⚠️  Hay ${recientesLegacy.length} embarques recientes en tabla legacy:`);
            recientesLegacy.forEach(e => {
                console.log(`   • ${e.folio} - ${new Date(e.created_at).toLocaleString()}`);
            });
        }
        
        // Buscar embarques recientes en normalizadas
        console.log('\n4. EMBARQUES RECIENTES EN TABLAS NORMALIZADAS:');
        const { data: recientesNorm } = await supabase
            .from('embarques_nuevo')
            .select('folio, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (recientesNorm && recientesNorm.length > 0) {
            console.log(`✅ Hay ${recientesNorm.length} embarques recientes en tablas normalizadas:`);
            recientesNorm.forEach(e => {
                console.log(`   • ${e.folio} - ${new Date(e.created_at).toLocaleString()}`);
            });
        }
        
        // DIAGNÓSTICO
        console.log('\n🎯 DIAGNÓSTICO:');
        console.log('================');
        if (legacyEmbarques.length > 0 && normalizadosEmbarques.length === 0) {
            console.log('❌ PROBLEMA CONFIRMADO: Los embarques se están creando en tabla LEGACY');
            console.log('🔧 SOLUCIÓN: El código necesita cambiarse para usar crear_embarque_normalizado()');
        } else if (legacyEmbarques.length === 0 && normalizadosEmbarques.length > 0) {
            console.log('✅ CORRECTO: Los embarques se están creando en tablas NORMALIZADAS');
        } else {
            console.log('⚠️  SITUACIÓN MIXTA: Revisar el comportamiento');
        }
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

verificarEmbarquesProblema();