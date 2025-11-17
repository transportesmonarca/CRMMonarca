/**
 * Script para verificar la conversión de fechas UTC a hora local de Matamoros
 * Prueba el escenario específico reportado: 9:21 PM del 11 de nov mostrando como 12 de nov
 */

// Simular el timestamp que estaría en la BD cuando el usuario crea un registro
// a las 9:21 PM hora local de Matamoros el 11 de noviembre
// Matamoros está en UTC-6, entonces 21:21 local = 03:21 UTC del día siguiente
const timestampUTC = "2025-11-12T03:21:00.000Z";

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 PRUEBA DE CONVERSIÓN DE FECHA UTC → LOCAL");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("📝 Contexto:");
console.log("   • Usuario en Matamoros (UTC-6)");
console.log("   • Crea registro el 11 de nov a las 21:21 (9:21 PM)");
console.log("   • Base de datos guarda en UTC: 12 de nov a las 03:21");
console.log("   • Debe mostrarse: 11/11/2025\n");

console.log("📅 Timestamp en BD (UTC):", timestampUTC);

const date = new Date(timestampUTC);
console.log("\n🔍 Date object creado:", date);
console.log("   • toISOString():", date.toISOString());
console.log("   • toString():", date.toString());

// Método actual: toLocaleString con timezone
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 MÉTODO: toLocaleString con timeZone");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const options = {
  timeZone: 'America/Matamoros',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

const formatted = date.toLocaleString('es-MX', options);
console.log("📤 Resultado completo:", formatted);

// Extraer solo la fecha
const match = formatted.match(/^(\d{2}\/\d{2}\/\d{4})/);
const soloFecha = match ? match[1] : formatted.split(',')[0].split(' ')[0];
console.log("📅 Solo fecha:", soloFecha);

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ VERIFICACIÓN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const esperado = "11/11/2025";
const correcto = soloFecha === esperado;

console.log("   Esperado: ", esperado);
console.log("   Obtenido: ", soloFecha);
console.log("   Estado:   ", correcto ? "✅ CORRECTO" : "❌ INCORRECTO");

// Prueba adicional con formatToParts para más detalles
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔬 DESGLOSE CON formatToParts");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const formatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Matamoros',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const parts = formatter.formatToParts(date);
console.log("Partes individuales:");
parts.forEach(part => {
  console.log(`   ${part.type.padEnd(10)}: ${part.value}`);
});

// Construir fecha manualmente desde las partes
const partsMap = {};
parts.forEach(part => {
  partsMap[part.type] = part.value;
});

const fechaDesdePartes = `${partsMap.day}/${partsMap.month}/${partsMap.year}`;
console.log("\n📅 Fecha desde partes:", fechaDesdePartes);
console.log("   Estado:", fechaDesdePartes === esperado ? "✅ CORRECTO" : "❌ INCORRECTO");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎯 CONCLUSIÓN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

if (correcto) {
  console.log("✅ La conversión funciona correctamente");
  console.log("   El timestamp UTC se convierte a hora local de Matamoros");
} else {
  console.log("❌ La conversión tiene problemas");
  console.log("   Considerar usar formatToParts o cálculo manual");
}

console.log("\n");
