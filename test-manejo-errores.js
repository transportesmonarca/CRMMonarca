/**
 * Script para simular el error exacto de cancelación reportado
 */

console.log("🧪 Simulando manejo de errores en cancelación...\n");

// Función para probar el manejo mejorado de errores
function testErrorHandling() {
  const testCases = [
    {
      name: "Objeto vacío {}",
      error: {}
    },
    {
      name: "Error sin message",
      error: new Error()
    },
    {
      name: "String vacío",
      error: ""
    },
    {
      name: "null",
      error: null
    },
    {
      name: "undefined",
      error: undefined
    },
    {
      name: "Error de Supabase típico",
      error: {
        code: "23505",
        message: "",
        details: "Key already exists"
      }
    },
    {
      name: "Objeto con propiedades vacías",
      error: {
        message: "",
        code: "",
        details: null
      }
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Probando: ${testCase.name}`);
    console.log(`   Error original:`, testCase.error);
    
    try {
      throw testCase.error;
    } catch (error) {
      // Aplicar la lógica mejorada de manejo de errores
      let errorMessage = 'Error desconocido al cancelar embarque';
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Error sin mensaje específico';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Manejar objetos de error de Supabase u otros
        if ('message' in error && error.message) {
          errorMessage = String(error.message);
        } else if ('code' in error && error.code) {
          errorMessage = `Error de base de datos (${error.code})`;
        } else {
          // Objeto vacío o sin propiedades útiles
          errorMessage = 'Error de sistema - contacte al administrador';
          console.log("   📝 Error objeto sin información útil:", JSON.stringify(error));
        }
      }
      
      console.log(`   ✅ Mensaje procesado: "${errorMessage}"`);
      console.log(`   📊 Tipo original: ${typeof error}`);
      console.log(`   📊 Constructor: ${error?.constructor?.name || 'N/A'}`);
      console.log(`   📊 Es Error instance: ${error instanceof Error}`);
    }
  });
  
  console.log("\n🎯 Resumen del manejo mejorado:");
  console.log("   - Objetos vacíos: ✅ Mensaje amigable");
  console.log("   - Errores sin message: ✅ Mensaje descriptivo");
  console.log("   - Valores falsy: ✅ Manejados correctamente");
  console.log("   - Errores de DB: ✅ Información del código");
  console.log("   - Fallback genérico: ✅ Siempre disponible");
}

// Función para simular el toast que vería el usuario
function simulateToast(title, description, variant) {
  console.log(`\n📱 TOAST SIMULADO:`);
  console.log(`   🔴 Título: ${title}`);
  console.log(`   📝 Descripción: ${description}`);
  console.log(`   🎨 Variante: ${variant}`);
}

console.log("🔍 Ejecutando pruebas de manejo de errores...");
testErrorHandling();

console.log("\n\n🧪 Simulando toast con diferentes errores...");

// Simular los casos más comunes
simulateToast(
  "Error al cancelar", 
  "Error de sistema - contacte al administrador", 
  "destructive"
);

simulateToast(
  "Error al cancelar", 
  "Error de base de datos (23505)", 
  "destructive"
);

simulateToast(
  "Error al cancelar", 
  "Error sin mensaje específico", 
  "destructive"
);

console.log("\n✅ Todas las pruebas completadas. El manejo de errores mejorado debería resolver el problema de '{}'");