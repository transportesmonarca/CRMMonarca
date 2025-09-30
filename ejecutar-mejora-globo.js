// Ejecutar SQL para agregar columna tipo_modificacion
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://itzdpgpgqwsanxkrrqlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0emRwZ3BncXdzYW54a3JycWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY1ODQ4NywiZXhwIjoyMDQ1MjM0NDg3fQ.yGBOIjmqZ97VR_c6FsaJLMxXm9jfbg4LM6KhO-a1fEI';

const supabase = createClient(supabaseUrl, supabaseKey);

const ejecutarMejora = async () => {
    console.log("🛠️  EJECUTANDO mejora-globo-modificado.sql");
    console.log("=====================================\n");

    try {
        // 1. AGREGAR COLUMNA tipo_modificacion
        console.log("1. Agregando columna tipo_modificacion...");
        const { error: addColumnError } = await supabase.rpc('sql', {
            query: `ALTER TABLE embarque_modificaciones ADD COLUMN tipo_modificacion TEXT;`
        });

        if (addColumnError && !addColumnError.message.includes('already exists')) {
            throw addColumnError;
        }
        
        if (addColumnError?.message.includes('already exists')) {
            console.log("   ⚠️  Columna ya existe, continuando...");
        } else {
            console.log("   ✅ Columna agregada exitosamente");
        }

        // 2. ACTUALIZAR REGISTROS EXISTENTES
        console.log("\n2. Actualizando registros existentes...");
        const { data: updateResult, error: updateError } = await supabase
            .from('embarque_modificaciones')
            .update({ tipo_modificacion: 'EDITAR_EMBARQUE' })
            .is('tipo_modificacion', null)
            .select('id');

        if (updateError) {
            throw updateError;
        }

        console.log(`   ✅ ${updateResult?.length || 0} registros actualizados como EDITAR_EMBARQUE`);

        // 3. VERIFICAR ESTRUCTURA
        console.log("\n3. Verificando estructura...");
        const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'embarque_modificaciones')
            .eq('column_name', 'tipo_modificacion');

        if (columnError) {
            console.log("   ⚠️  No se pudo verificar la estructura:", columnError.message);
        } else if (columns && columns.length > 0) {
            console.log("   ✅ Columna verificada:", columns[0]);
        }

        // 4. CONTAR REGISTROS POR TIPO
        console.log("\n4. Contando registros por tipo...");
        const { data: stats, error: statsError } = await supabase
            .from('embarque_modificaciones')
            .select('tipo_modificacion')
            .not('tipo_modificacion', 'is', null);

        if (statsError) {
            throw statsError;
        }

        const counts = {};
        stats?.forEach(record => {
            counts[record.tipo_modificacion] = (counts[record.tipo_modificacion] || 0) + 1;
        });

        console.log("   Registros por tipo:", counts);

        console.log("\n✅ MEJORA COMPLETADA EXITOSAMENTE");
        console.log("=====================================");
        console.log("🔄 Ahora refrescar la página de asignación");
        console.log("🎯 Solo aparecerán globos para modificaciones reales");

    } catch (error) {
        console.error("❌ Error ejecutando mejora:", error);
        console.log("\n📋 ALTERNATIVA: Ejecutar manualmente en Supabase SQL Editor:");
        console.log("ALTER TABLE embarque_modificaciones ADD COLUMN tipo_modificacion TEXT;");
        console.log("UPDATE embarque_modificaciones SET tipo_modificacion = 'EDITAR_EMBARQUE' WHERE tipo_modificacion IS NULL;");
    }
};

ejecutarMejora();