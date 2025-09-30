// Verificar que el globo modificado se eliminó correctamente de embarques
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itzdpgpgqwsanxkrrqlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emRwZ3BncXdzYW54a3JycWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY1ODQ4NywiZXhwIjoyMDQ1MjM0NDg3fQ.yGBOIjmqZ97VR_c6FsaJLMxXm9jfbg4LM6KhO-a1fEI';

const supabase = createClient(supabaseUrl, supabaseKey);

const probarCambios = async () => {
    console.log("🔧 VERIFICANDO FIX DEL GLOBO MODIFICADO");
    console.log("=====================================\n");

    console.log("✅ CAMBIOS REALIZADOS:");
    console.log("   1. Página Asignación (/app/asignar-operadores): Lógica conservadora con verificarModificacion()");
    console.log("   2. Página Embarques (/app/embarques): Eliminada lógica del globo modificado");
    console.log("   3. API /api/embarques/estado: No crea registros de modificación");
    console.log("   4. SQL ejecutado: Columna tipo_modificacion agregada\n");

    console.log("🎯 RESULTADO ESPERADO:");
    console.log("   ❌ Página Embarques: NO mostrar globos modificados");
    console.log("   ✅ Página Asignación: Solo globos para modificaciones reales");
    console.log("   ✅ Completar y Enviar: NO genera globos modificados\n");

    // Verificar algunos embarques de prueba
    console.log("🔍 VERIFICANDO EMBARQUES DE PRUEBA:");
    const embarquesTest = ["TIM-2509-021", "TIM-2509-003"];
    
    for (const folio of embarquesTest) {
        // Buscar el embarque
        const { data: embarques, error } = await supabase
            .from("embarques")
            .select("id, folio, estado, fecha_creacion, updated_at")
            .eq("folio", folio)
            .limit(1);

        if (error || !embarques || embarques.length === 0) {
            console.log(`   ${folio}: ❌ No encontrado`);
            continue;
        }

        const embarque = embarques[0];
        
        // Verificar registros de modificación
        const { data: modificaciones } = await supabase
            .from("embarque_modificaciones")
            .select("id, tipo_modificacion, razon")
            .eq("embarque_id", embarque.id);

        console.log(`\n   📋 ${folio}:`);
        console.log(`      ID: ${embarque.id}`);
        console.log(`      Estado: ${embarque.estado}`);
        console.log(`      Creado: ${embarque.fecha_creacion}`);
        console.log(`      Actualizado: ${embarque.updated_at}`);
        console.log(`      Modificaciones en DB: ${modificaciones?.length || 0}`);
        
        if (modificaciones && modificaciones.length > 0) {
            modificaciones.forEach((mod, idx) => {
                console.log(`         ${idx + 1}. Tipo: ${mod.tipo_modificacion || 'NULL'}, Razón: ${mod.razon || 'Sin razón'}`);
            });
        }
    }

    console.log("\n📋 INSTRUCCIONES PARA PROBAR:");
    console.log("   1. Refrescar página de Embarques");
    console.log("   2. Crear un embarque nuevo");
    console.log("   3. Hacer clic en 'Completar y Enviar'");
    console.log("   4. Verificar que NO aparece globo 'Modificado'");
    console.log("   5. Ir a Asignación y verificar que SÍ aparece el embarque");

    console.log("\n✅ FIX IMPLEMENTADO - LISTO PARA PRUEBAS");
};

probarCambios().catch(console.error);