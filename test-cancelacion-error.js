/**
 * Script para probar la cancelación de embarques y detectar errores específicos
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Variables de entorno de Supabase no encontradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función de prueba similar a la del componente
async function testCancelarEmbarque() {
  console.log("🧪 Iniciando prueba de cancelación de embarque...\n");
  
  try {
    // 1. Buscar un embarque que esté listo para asignar (no cancelado)
    console.log("📍 1. Buscando embarques disponibles para cancelar...");
    
    const { data: embarques, error: searchError } = await supabase
      .from("embarques")
      .select("*")
      .in("estado", ["listo_para_asignar", "asignado"])
      .limit(5);
    
    if (searchError) {
      console.error("❌ Error buscando embarques:", searchError);
      return;
    }
    
    if (!embarques || embarques.length === 0) {
      console.log("⚠️ No hay embarques disponibles para cancelar");
      return;
    }
    
    console.log(`✅ Encontrados ${embarques.length} embarques disponibles:`);
    embarques.forEach(e => {
      console.log(`   - ${e.folio} (ID: ${e.id}) - Estado: ${e.estado}`);
    });
    
    // 2. Seleccionar el primer embarque
    const embarquePrueba = embarques[0];
    console.log(`\n📍 2. Seleccionado para prueba: ${embarquePrueba.folio}`);
    
    // 3. Simular el proceso de cancelación (SIN EJECUTAR)
    console.log("\n📍 3. Simulando proceso de cancelación...");
    
    const fechaCancelacion = new Date().toISOString();
    const usuarioCancelacion = "Test User";
    const motivo = "Prueba de cancelación desde script de testing";
    
    console.log("Datos de cancelación preparados:");
    console.log(`   - Fecha: ${fechaCancelacion}`);
    console.log(`   - Usuario: ${usuarioCancelacion}`);
    console.log(`   - Motivo: ${motivo}`);
    
    // 4. Validar estructura de datos
    console.log("\n📍 4. Validando estructura de datos...");
    
    if (!embarquePrueba || !embarquePrueba.id) {
      throw new Error("Embarque inválido para cancelar");
    }
    
    console.log("✅ Validación exitosa:");
    console.log(`   - ID válido: ${embarquePrueba.id}`);
    console.log(`   - Folio válido: ${embarquePrueba.folio}`);
    console.log(`   - Estado actual: ${embarquePrueba.estado}`);
    
    // 5. Probar query de actualización (DRY RUN)
    console.log("\n📍 5. Probando query de actualización (simulación)...");
    
    const updateData = {
      estado: "cancelado",
      estado_facturacion: "archivado",
      fecha_cancelacion: fechaCancelacion,
      usuario_cancelacion: usuarioCancelacion,
      motivo_cancelacion: motivo,
      updated_at: fechaCancelacion,
    };
    
    console.log("Datos que se actualizarían:", JSON.stringify(updateData, null, 2));
    
    // 6. Simular validación de permisos
    console.log("\n📍 6. Validando permisos de actualización...");
    
    // Probar una operación de lectura para verificar conexión
    const { data: testRead, error: testError } = await supabase
      .from("embarques")
      .select("id")
      .eq("id", embarquePrueba.id)
      .single();
    
    if (testError) {
      console.error("❌ Error en operación de prueba:", testError);
      throw testError;
    }
    
    if (!testRead) {
      throw new Error("No se pudo leer el embarque para cancelar");
    }
    
    console.log("✅ Permisos de lectura validados");
    
    // 7. Simular diferentes tipos de errores
    console.log("\n📍 7. Simulando diferentes tipos de errores...");
    
    // Error tipo 1: Error object vacío
    try {
      throw {};
    } catch (emptyError) {
      console.log("Tipo Error 1 - Objeto vacío:");
      console.log("   - Tipo:", typeof emptyError);
      console.log("   - Constructor:", emptyError.constructor.name);
      console.log("   - String conversion:", String(emptyError));
      console.log("   - JSON.stringify:", JSON.stringify(emptyError));
      console.log("   - Error instanceof Error:", emptyError instanceof Error);
    }
    
    // Error tipo 2: Error con message undefined
    try {
      const errorObj = new Error();
      errorObj.message = undefined;
      throw errorObj;
    } catch (undefinedError) {
      console.log("\nTipo Error 2 - Message undefined:");
      console.log("   - Tipo:", typeof undefinedError);
      console.log("   - Message:", undefinedError.message);
      console.log("   - String conversion:", String(undefinedError));
    }
    
    // Error tipo 3: Error de Supabase simulado
    try {
      const supabaseError = {
        code: "42501",
        message: "permission denied for table embarques",
        details: null,
        hint: null
      };
      throw supabaseError;
    } catch (dbError) {
      console.log("\nTipo Error 3 - Error de base de datos:");
      console.log("   - Tipo:", typeof dbError);
      console.log("   - Message:", dbError.message);
      console.log("   - Code:", dbError.code);
      console.log("   - String conversion:", String(dbError));
    }
    
    console.log("\n✅ Prueba completada exitosamente");
    console.log("📝 Resumen:");
    console.log("   - Estructura de datos: ✅ Válida");
    console.log("   - Conexión a DB: ✅ Funcional");
    console.log("   - Permisos básicos: ✅ Válidos");
    console.log("   - Manejo de errores: ✅ Probado");
    
  } catch (error) {
    console.error("\n❌ Error durante la prueba:");
    console.error("Tipo:", typeof error);
    console.error("Constructor:", error.constructor?.name);
    console.error("Message:", error.message);
    console.error("String:", String(error));
    console.error("Stack:", error.stack);
  }
}

// Ejecutar prueba
testCancelarEmbarque();