#!/usr/bin/env node

/**
 * Script para limpiar localStorage del navegador y verificar datos inconsistentes
 * 
 * Este script genera comandos JavaScript que puedes ejecutar en la consola del navegador
 * para limpiar datos de localStorage que pueden estar causando inconsistencias.
 */

console.log('🧹 SCRIPT PARA LIMPIAR LOCALSTORAGE\n');

console.log('Copia y pega estos comandos en la consola del navegador (F12 → Console):\n');

console.log('// 1. Ver qué hay en localStorage actualmente');
console.log('console.log("Embarques Completados:", JSON.parse(localStorage.getItem("embarquesCompletados") || "[]"));');
console.log('console.log("Embarques Asignados:", JSON.parse(localStorage.getItem("embarquesAsignados") || "[]"));');
console.log('');

console.log('// 2. Buscar específicamente TIM 2509-040');
console.log('const completados = JSON.parse(localStorage.getItem("embarquesCompletados") || "[]");');
console.log('const tim040 = completados.find(e => e.folio && e.folio.includes("2509-040"));');
console.log('if (tim040) {');
console.log('  console.log("🔍 Encontrado TIM 2509-040 en localStorage:", tim040);');
console.log('} else {');
console.log('  console.log("❌ TIM 2509-040 NO encontrado en localStorage");');
console.log('}');
console.log('');

console.log('// 3. Limpiar localStorage completamente');
console.log('localStorage.removeItem("embarquesCompletados");');
console.log('localStorage.removeItem("embarquesAsignados");');
console.log('localStorage.removeItem("embarquesCreados");');
console.log('localStorage.removeItem("embarquesArchivados");');
console.log('console.log("✅ localStorage limpiado");');
console.log('');

console.log('// 4. Recargar la página después de limpiar');
console.log('setTimeout(() => window.location.reload(), 1000);');
console.log('');

console.log('📝 PASOS A SEGUIR:');
console.log('');
console.log('1. Abre el navegador en http://localhost:3000');
console.log('2. Presiona F12 para abrir DevTools');
console.log('3. Ve a la pestaña "Console"');
console.log('4. Copia y pega los comandos de arriba uno por uno');
console.log('5. Ejecuta primero los comandos 1 y 2 para verificar');
console.log('6. Si encuentras datos inconsistentes, ejecuta los comandos 3 y 4');
console.log('');

console.log('🎯 También puedes ejecutar en una sola línea:');
console.log('');
console.log('localStorage.clear(); setTimeout(() => window.location.reload(), 1000);');
console.log('');

console.log('✅ Después de limpiar, ve a "Asignar Operadores" → "Registros Completados"');
console.log('   y verifica si TIM 2509-040 ya no aparece ahí.');