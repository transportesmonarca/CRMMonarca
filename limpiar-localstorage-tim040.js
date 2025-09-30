// INSTRUCCIONES PARA LIMPIAR LOCALSTORAGE
// ==========================================
// Ejecutar estos comandos en la CONSOLA DEL NAVEGADOR
// (F12 > Console > pegar y ejecutar cada línea)

console.log("🧹 LIMPIEZA DE LOCALSTORAGE - TIM 2509-040");
console.log("==========================================");

// 1. Ver contenido actual
console.log("📋 Contenido actual de localStorage:");
console.log("embarquesCompletados:", localStorage.getItem("embarquesCompletados"));
console.log("embarquesAsignados:", localStorage.getItem("embarquesAsignados"));
console.log("embarquesCreados:", localStorage.getItem("embarquesCreados"));

// 2. Limpiar embarques completados
console.log("\n🧹 Limpiando embarquesCompletados...");
const completados = JSON.parse(localStorage.getItem("embarquesCompletados") || "[]");
const completadosLimpios = completados.filter(e => e.folio !== "TIM-2509-040");
localStorage.setItem("embarquesCompletados", JSON.stringify(completadosLimpios));
console.log(`✅ Eliminados ${completados.length - completadosLimpios.length} registros de completados`);

// 3. Limpiar embarques asignados
console.log("\n🧹 Limpiando embarquesAsignados...");
const asignados = JSON.parse(localStorage.getItem("embarquesAsignados") || "[]");
const asignadosLimpios = asignados.filter(e => e.folio !== "TIM-2509-040");
localStorage.setItem("embarquesAsignados", JSON.stringify(asignadosLimpios));
console.log(`✅ Eliminados ${asignados.length - asignadosLimpios.length} registros de asignados`);

// 4. Limpiar otras posibles ubicaciones
console.log("\n🧹 Limpiando otras ubicaciones...");
const keys = ["embarquesCreados", "embarquesBorrador", "embarquesPendientes"];
keys.forEach(key => {
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(items)) {
        const limpios = items.filter(e => e.folio !== "TIM-2509-040");
        localStorage.setItem(key, JSON.stringify(limpios));
        console.log(`✅ ${key}: Eliminados ${items.length - limpios.length} registros`);
    }
});

// 5. Verificar limpieza
console.log("\n📋 Estado final del localStorage:");
console.log("embarquesCompletados:", localStorage.getItem("embarquesCompletados"));
console.log("embarquesAsignados:", localStorage.getItem("embarquesAsignados"));

console.log("\n✅ LIMPIEZA COMPLETADA");
console.log("🔄 Recarga la página para ver los cambios");

// OPCIONAL: Limpiar TODO el localStorage relacionado con embarques
// CUIDADO: Esto borrará todos los embarques guardados localmente
// localStorage.removeItem("embarquesCompletados");
// localStorage.removeItem("embarquesAsignados");
// localStorage.removeItem("embarquesCreados");
// console.log("🧹 TODO el localStorage de embarques limpiado");