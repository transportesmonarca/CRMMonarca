// Probar lógica conservadora para globo modificado
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itzdpgpgqwsanxkrrqlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emRwZ3BncXdzYW54a3JycWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY1ODQ4NywiZXhwIjoyMDQ1MjM0NDg3fQ.yGBOIjmqZ97VR_c6FsaJLMxXm9jfbg4LM6KhO-a1fEI';

const supabase = createClient(supabaseUrl, supabaseKey);

const verificarModificacion = async (embarqueId) => {
    try {
        // Primero intentar con la columna tipo_modificacion
        let { data, error } = await supabase
            .from("embarque_modificaciones")
            .select("id, tipo_modificacion, razon")
            .eq("embarque_id", embarqueId)
            .limit(1);

        // Si hay error, probablemente la columna tipo_modificacion no existe
        if (error) {
            console.warn("Error consultando tipo_modificacion, usando fallback conservador:", error);
            
            // CAMBIO CRÍTICO: Cuando no existe tipo_modificacion, NO mostrar globo
            // Esto evita que "Completar y Enviar" genere globos incorrectamente
            // Solo mostrarán globo después de ejecutar mejora-globo-modificado.sql
            console.log(`Sin columna tipo_modificacion para embarque ${embarqueId} - Sin globo modificado`);
            return false;
        }

        // Solo considerar como "modificado" si hay registros del tipo "EDITAR_EMBARQUE"
        // Esto excluye cambios de estado como "Completar y Enviar"
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

const probar = async () => {
    console.log("🔧 Probando LÓGICA CONSERVADORA para globo modificado");
    console.log("Esta versión NO muestra globo si la columna tipo_modificacion no existe\n");

    // Probar con los embarques que sabemos tienen registros de modificación
    const embarquesTest = ["TIM-2509-021", "TIM-2509-003"];

    for (const embarqueId of embarquesTest) {
        console.log(`\n⚡ Probando ${embarqueId}:`);
        const tieneModificacion = await verificarModificacion(embarqueId);
        
        if (tieneModificacion) {
            console.log(`${embarqueId}: 🔴 GLOBO MODIFICADO (modificación real detectada)`);
        } else {
            console.log(`${embarqueId}: ✅ SIN GLOBO (sin modificaciones reales)`);
        }
    }

    // Verificar si existe la columna tipo_modificacion
    console.log("\n🔍 Verificando estructura de tabla...");
    try {
        const { data, error } = await supabase
            .from("embarque_modificaciones")
            .select("tipo_modificacion")
            .limit(1);
        
        if (error) {
            console.log("❌ La columna tipo_modificacion NO EXISTE");
            console.log("   Ejecutar: mejora-globo-modificado.sql para agregar la columna");
        } else {
            console.log("✅ La columna tipo_modificacion SÍ EXISTE");
        }
    } catch (err) {
        console.log("❌ Error verificando columna:", err.message);
    }

    console.log("\n💡 RESULTADO ESPERADO:");
    console.log("   Si no existe la columna: AMBOS embarques sin globo");
    console.log("   Si existe la columna: Solo mostrar globo para modificaciones EDITAR_EMBARQUE");
};

probar().catch(console.error);