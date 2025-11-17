/**
 * Script para probar la conversión con formatToParts
 * Simula el caso del cliente ROCAMADERA DE LAREDO
 */

// Simular diferentes timestamps que podrían estar en la BD
const timestampsTest = [
  "2025-11-11T06:00:00.000Z", // 11 nov a las 00:00 local (medianoche)
  "2025-11-12T03:21:00.000Z", // 11 nov a las 21:21 local (9:21 PM)
  "2025-11-12T05:59:59.999Z", // 11 nov a las 23:59:59 local (casi medianoche)
  "2025-11-12T06:00:00.000Z", // 12 nov a las 00:00 local (medianoche del 12)
];

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 PRUEBA: formatToParts vs toLocaleString");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

function testFormatToParts(timestamp) {
  const date = new Date(timestamp);
  
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
  
  const partsMap = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      partsMap[part.type] = part.value;
    }
  });

  return {
    fecha: `${partsMap.day}/${partsMap.month}/${partsMap.year}`,
    hora: `${partsMap.hour}:${partsMap.minute}:${partsMap.second}`,
    parts: partsMap
  };
}

function testToLocaleString(timestamp) {
  const date = new Date(timestamp);
  
  const formatted = date.toLocaleString('es-MX', {
    timeZone: 'America/Matamoros',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const match = formatted.match(/^(\d{2}\/\d{2}\/\d{4})/);
  return {
    completo: formatted,
    fecha: match ? match[1] : formatted.split(',')[0].split(' ')[0]
  };
}

timestampsTest.forEach((timestamp, index) => {
  console.log(`\n📝 TEST ${index + 1}: ${timestamp}`);
  console.log("─".repeat(50));
  
  const date = new Date(timestamp);
  console.log("   toString():", date.toString());
  
  const resultToParts = testFormatToParts(timestamp);
  console.log("\n   🔧 formatToParts:");
  console.log("      Fecha:", resultToParts.fecha);
  console.log("      Hora:", resultToParts.hora);
  
  const resultToLocale = testToLocaleString(timestamp);
  console.log("\n   🔧 toLocaleString:");
  console.log("      Completo:", resultToLocale.completo);
  console.log("      Fecha:", resultToLocale.fecha);
  
  const match = resultToParts.fecha === resultToLocale.fecha;
  console.log("\n   ✓ Coinciden:", match ? "✅ SÍ" : "❌ NO");
});

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎯 CONCLUSIÓN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("Si ambos métodos coinciden, el problema puede ser:");
console.log("1. ⚠️  Caché del navegador");
console.log("2. ⚠️  El timestamp en BD es diferente al esperado");
console.log("3. ⚠️  La zona horaria del sistema no es UTC-6");

console.log("\n✅ Solución aplicada: Usar formatToParts (más confiable)");
console.log("📝 Recarga la página con Cmd+Shift+R para limpiar caché\n");
