// Probar flujo completo de "Completar y Enviar"
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itzdpgpgqwsanxkrrqlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emRwZ3BncXdzYW54a3JycWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY1ODQ4NywiZXhwIjoyMDQ1MjM0NDg3fQ.yGBOIjmqZ97VR_c6FsaJLMxXm9jfbg4LM6KhO-a1fEI';

const supabase = createClient(supabaseUrl, supabaseKey);

const probarFlujoCompleto = async () => {
    console.log("🔄 PROBANDO FLUJO COMPLETO: Completar y Enviar");
    console.log("===============================================\n");

    // 1. Buscar embarques en estado "creado"
    console.log("1. 🔍 Buscando embarques en estado 'creado'...");
    const { data: embarquesCreados, error: errorCreados } = await supabase
        .from("embarques")
        .select("id, folio, estado, fecha_creacion")
        .eq("estado", "creado")
        .limit(5);

    if (errorCreados) {
        console.log("   ❌ Error buscando embarques:", errorCreados.message);
        return;
    }

    console.log(`   ✅ Encontrados: ${embarquesCreados?.length || 0} embarques en estado 'creado'`);
    
    if (embarquesCreados && embarquesCreados.length > 0) {
        embarquesCreados.forEach(embarque => {
            console.log(`      📦 ${embarque.folio} (${embarque.id})`);
        });
    }

    // 2. Buscar embarques en estado "listo-para-asignar"
    console.log("\n2. 🔍 Buscando embarques en estado 'listo-para-asignar'...");
    const { data: embarquesListos, error: errorListos } = await supabase
        .from("embarques")
        .select("id, folio, estado, updated_at")
        .eq("estado", "listo-para-asignar")
        .limit(10)
        .order("updated_at", { ascending: false });

    if (errorListos) {
        console.log("   ❌ Error buscando embarques listos:", errorListos.message);
        return;
    }

    console.log(`   ✅ Encontrados: ${embarquesListos?.length || 0} embarques en estado 'listo-para-asignar'`);
    
    if (embarquesListos && embarquesListos.length > 0) {
        embarquesListos.forEach(embarque => {
            const fecha = new Date(embarque.updated_at).toLocaleString();
            console.log(`      🟢 ${embarque.folio} (actualizado: ${fecha})`);
        });
    }

    // 3. Probar API de cambio de estado con un embarque creado
    if (embarquesCreados && embarquesCreados.length > 0) {
        const embarquePrueba = embarquesCreados[0];
        console.log(`\n3. 🧪 SIMULANDO "Completar y Enviar" para ${embarquePrueba.folio}...`);
        
        try {
            // Simular la llamada que hace el frontend
            const response = await fetch('http://localhost:3000/api/embarques/estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: embarquePrueba.id, 
                    estado: 'listo-para-asignar', 
                    fuente: 'legacy' 
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log("   ✅ API respondió correctamente:", result);
                
                // Verificar que el estado cambió
                const { data: embarqueActualizado } = await supabase
                    .from("embarques")
                    .select("estado, updated_at")
                    .eq("id", embarquePrueba.id)
                    .single();
                    
                if (embarqueActualizado) {
                    console.log(`   🔄 Estado actualizado: ${embarqueActualizado.estado}`);
                    console.log(`   ⏰ Fecha actualización: ${embarqueActualizado.updated_at}`);
                }
            } else {
                console.log("   ❌ Error en API:", response.status, response.statusText);
            }
        } catch (error) {
            console.log("   ⚠️ No se pudo probar API (servidor puede estar offline):", error.message);
        }
    }

    console.log("\n📋 VERIFICACIÓN MANUAL:");
    console.log("   1. Ve a la página de Embarques");
    console.log("   2. Busca un embarque con estado 'creado'");
    console.log("   3. Haz clic en 'Completar y Enviar'");
    console.log("   4. Verifica que:");
    console.log("      ✅ Aparece toast 'Embarque marcado como Asignado'");
    console.log("      ✅ El botón cambia de 'Completar y Enviar' a 'Archivar'");
    console.log("      ✅ Aparece badge verde 'Listo para Asignar'");
    console.log("      ✅ El embarque aparece en la sección de Asignación");
    
    console.log("\n🎯 COMPORTAMIENTO ESPERADO:");
    console.log("   Estado 'creado': 🔵 Botón 'Completar y Enviar'");
    console.log("   Estado 'listo-para-asignar': 🟢 Badge verde + Botón 'Archivar'");
};

probarFlujoCompleto().catch(console.error);