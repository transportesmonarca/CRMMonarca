const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarRapido() {
    console.log('🔍 VERIFICACIÓN RÁPIDA: TIM-2509-037 y TIM-2509-038\n');
    
    try {
        // Tabla LEGACY (embarques) - usar updated_at en lugar de created_at
        const { data: legacy } = await supabase
            .from('embarques')
            .select('folio, updated_at')
            .or('folio.eq.TIM-2509-037,folio.eq.TIM-2509-038');
        
        // Tabla NORMALIZADA (embarques_nuevo) 
        const { data: normalizada } = await supabase
            .from('embarques_nuevo')
            .select('folio, created_at')
            .or('folio.eq.TIM-2509-037,folio.eq.TIM-2509-038');
        
        console.log('📊 RESULTADOS:');
        console.log(`   • En tabla LEGACY (embarques): ${legacy?.length || 0}`);
        console.log(`   • En tabla NORMALIZADA (embarques_nuevo): ${normalizada?.length || 0}`);
        
        if (legacy && legacy.length > 0) {
            console.log('\n❌ ENCONTRADOS EN TABLA LEGACY:');
            legacy.forEach(e => console.log(`   • ${e.folio}`));
        }
        
        if (normalizada && normalizada.length > 0) {
            console.log('\n✅ ENCONTRADOS EN TABLA NORMALIZADA:');
            normalizada.forEach(e => console.log(`   • ${e.folio}`));
        }
        
        // Contar totales en cada tabla
        const [legacyTotal, normalizadaTotal] = await Promise.all([
            supabase.from('embarques').select('*', { count: 'exact', head: true }),
            supabase.from('embarques_nuevo').select('*', { count: 'exact', head: true })
        ]);
        
        console.log('\n📊 TOTALES GENERALES:');
        console.log(`   • Total en LEGACY: ${legacyTotal.count}`);  
        console.log(`   • Total en NORMALIZADA: ${normalizadaTotal.count}`);
        
        // DIAGNÓSTICO
        if (legacy && legacy.length > 0) {
            console.log('\n🚨 PROBLEMA CONFIRMADO:');
            console.log('   Los embarques TIM-2509-037 y 038 están en tabla LEGACY');
            console.log('   El sistema sigue usando la inserción directa en "embarques"');
            console.log('   ✅ SOLUCIÓN: Código modificado para usar función normalizada');
        } else {
            console.log('\n✅ Los embarques no están en tabla legacy - Verificar si ya se migraron');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verificarRapido();