/**
 * Script para verificar el timestamp exacto del cliente ROCAMADERA DE LAREDO
 * y probar la conversión con formatToParts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables de entorno no configuradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔍 DIAGNÓSTICO: ROCAMADERA DE LAREDO");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Buscar el cliente por RFC
const { data: cliente, error } = await supabase
  .from('clientes')
  .select('id, nombre, rfc, fecha_registro, created_at, updated_at')
  .eq('rfc', 'RCLS123342393')
  .single();

if (error) {
  console.error("❌ Error consultando cliente:", error);
  process.exit(1);
}

console.log("📋 DATOS DEL CLIENTE:");
console.log("   • Nombre:", cliente.nombre);
console.log("   • RFC:", cliente.rfc);
console.log("\n📅 TIMESTAMPS EN BASE DE DATOS (UTC):");
console.log("   • fecha_registro:", cliente.fecha_registro);
console.log("   • created_at:", cliente.created_at);
console.log("   • updated_at:", cliente.updated_at);

// Función de prueba: formatToParts
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

  return `${partsMap.day}/${partsMap.month}/${partsMap.year}`;
}

// Función alternativa: toLocaleString
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
  return match ? match[1] : formatted.split(',')[0].split(' ')[0];
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 PRUEBAS DE CONVERSIÓN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const timestampPrueba = cliente.fecha_registro;
const date = new Date(timestampPrueba);

console.log("📝 Timestamp a convertir:", timestampPrueba);
console.log("📅 Date object toString():", date.toString());
console.log("\n🔧 MÉTODO 1: formatToParts");
console.log("   Resultado:", testFormatToParts(timestampPrueba));

console.log("\n🔧 MÉTODO 2: toLocaleString con regex");
console.log("   Resultado:", testToLocaleString(timestampPrueba));

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("⏰ INFORMACIÓN DE ZONA HORARIA");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("   • Hora del sistema:", new Date().toString());
console.log("   • Offset del sistema:", new Date().getTimezoneOffset(), "minutos");
console.log("   • Hora UTC actual:", new Date().toISOString());

console.log("\n✅ Diagnóstico completado\n");
