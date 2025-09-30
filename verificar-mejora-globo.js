// Verificar que la mejora del globo modificado funcione correctamente
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itzdpgpgqwsanxkrrqlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emRwZ3BncXdzYW54a3JycWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY1ODQ4NywiZXhwIjoyMDQ1MjM0NDg3fQ.yGBOIjmqZ97VR_c6FsaJLMxXm9jfbg4LM6KhO-a1fEI';

const supabase = createClient(supabaseUrl, supabaseKey);

const verificarModificacion = async (embarqueId) => {
    try {
        // Intentar con la columna tipo_modificacion
        let { data, error } = await supabase
            .from("embarque_modificaciones")
            .select("id, tipo_modificacion, razon")
            .eq("embarque_id", embarqueId)
            .limit(1);

        if (error) {
            console.warn("Error consultando tipo_modificacion:", error);
            return false;
        }

        // Solo considerar como "modificado" si hay registros del tipo "EDITAR_EMBARQUE"
        if (data && data.length > 0) {
            const modificacionReal = data.some(registro => 
                registro.tipo_modificacion === "EDITAR_EMBARQUE" ||
                (!registro.tipo_modificacion && registro.razon) // Compatibilidad: registros legacy con razón
            );
            return modificacionReal;
        }

        return false;
    } catch (error) {
        console.error("Error inesperado verificando modificaciones:", error);
        return false;
    }
};

const verificarMejora = async () => {
    console.log("🔍 VERIFICANDO MEJORA GLOBO MODIFICADO");
    console.log("=====================================\n");

    // 1. Verificar que la columna tipo_modificacion existe
    console.log("1. Verificando estructura de tabla...");
    try {
        const { data, error } = await supabase
            .from("embarque_modificaciones")
            .select("tipo_modificacion")
            .limit(1);
        
        if (error) {
            console.log("❌ La columna tipo_modificacion NO EXISTE");
            console.log("   Error:", error.message);
            return;
        } else {
            console.log("✅ La columna tipo_modificacion SÍ EXISTE");
        }
    } catch (err) {
        console.log("❌ Error verificando columna:", err.message);
        return;
    }

    // 2. Contar registros por tipo
    console.log("\n2. Contando registros por tipo...");
    try {
        const { data: allRecords, error } = await supabase
            .from("embarque_modificaciones")
            .select("tipo_modificacion, embarque_id");

        if (error) {
            console.log("❌ Error consultando registros:", error.message);
            return;
        }

        const counts = {
            'EDITAR_EMBARQUE': 0,
            'COMPLETAR_ENVIAR': 0,
            'null': 0
        };

        allRecords?.forEach(record => {
            if (record.tipo_modificacion === 'EDITAR_EMBARQUE') {
                counts['EDITAR_EMBARQUE']++;
            } else if (record.tipo_modificacion === 'COMPLETAR_ENVIAR') {
                counts['COMPLETAR_ENVIAR']++;
            } else {
                counts['null']++;
            }
        });

        console.log("   Registros EDITAR_EMBARQUE:", counts['EDITAR_EMBARQUE']);
        console.log("   Registros COMPLETAR_ENVIAR:", counts['COMPLETAR_ENVIAR']); 
        console.log("   Registros sin tipo:", counts['null']);

        if (counts['null'] > 0) {
            console.log("   ⚠️  Hay registros sin tipo_modificacion");
        }
    } catch (err) {
        console.log("❌ Error contando registros:", err.message);
    }

    // 3. Probar lógica con embarques específicos
    console.log("\n3. Probando lógica con embarques específicos...");
    const embarquesTest = ["TIM-2509-021", "TIM-2509-003"];

    for (const embarqueId of embarquesTest) {
        console.log(`\n   Probando ${embarqueId}:`);
        
        // Mostrar registros de modificación para este embarque
        const { data: registros } = await supabase
            .from("embarque_modificaciones")
            .select("id, tipo_modificacion, razon, fecha_modificacion")
            .eq("embarque_id", embarqueId)
            .order("fecha_modificacion", { ascending: false });

        if (registros && registros.length > 0) {
            console.log(`   📋 Registros encontrados: ${registros.length}`);
            registros.forEach((reg, idx) => {
                console.log(`      ${idx + 1}. Tipo: ${reg.tipo_modificacion || 'NULL'}, Razón: ${reg.razon || 'Sin razón'}`);
            });
        } else {
            console.log("   📋 Sin registros de modificación");
        }

        // Probar la función verificarModificacion
        const tieneModificacion = await verificarModificacion(embarqueId);
        
        if (tieneModificacion) {
            console.log(`   🔴 GLOBO MODIFICADO: ${embarqueId}`);
        } else {
            console.log(`   ✅ SIN GLOBO: ${embarqueId}`);
        }
    }

    console.log("\n✅ VERIFICACIÓN COMPLETADA");
    console.log("=====================================");
    console.log("🔄 Refrescar la página de asignación para ver cambios");
    console.log("🎯 Solo deben aparecer globos para registros EDITAR_EMBARQUE");
};

verificarMejora().catch(console.error);