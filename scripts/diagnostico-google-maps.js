#!/usr/bin/env node

/**
 * Script para diagnosticar problemas con Google Maps API
 * Ejecuta con: node scripts/diagnostico-google-maps.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

console.log('\n🔍 DIAGNÓSTICO DE GOOGLE MAPS API\n');
console.log('─'.repeat(60));

// 1. Verificar que la API key esté configurada
console.log('\n1️⃣ Verificando configuración local...\n');

if (!API_KEY) {
  console.log('❌ API Key NO encontrada en .env.local');
  console.log('   Solución: Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY a .env.local\n');
  process.exit(1);
}

console.log(`✅ API Key encontrada: ${API_KEY.substring(0, 20)}...`);
console.log(`   Longitud: ${API_KEY.length} caracteres`);

// 2. Validar formato de la API key
console.log('\n2️⃣ Validando formato de la API key...\n');

if (API_KEY.startsWith('AIza') && API_KEY.length === 39) {
  console.log('✅ Formato correcto de API key de Google');
} else {
  console.log('⚠️  Formato inusual de API key');
  console.log('   Las keys de Google suelen empezar con "AIza" y tener 39 caracteres');
}

// 3. Probar la API key con una petición real
console.log('\n3️⃣ Probando API key con Google Maps...\n');

const testUrl = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;

console.log('📡 Haciendo petición de prueba...\n');

https.get(testUrl, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`   Status Code: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('   ✅ API key es válida\n');
      
      // Verificar si la API está activada
      if (data.includes('Google Maps JavaScript API error')) {
        console.log('❌ ERROR: La API NO está activada\n');
        console.log('📋 SOLUCIÓN:');
        console.log('   1. Ve a: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com');
        console.log('   2. Haz clic en "HABILITAR"');
        console.log('   3. Espera 2-5 minutos');
        console.log('   4. Recarga tu página\n');
      } else {
        console.log('✅ La API parece estar activada correctamente\n');
      }
    } else if (res.statusCode === 403) {
      console.log('   ❌ API key rechazada (403 Forbidden)\n');
      console.log('📋 POSIBLES CAUSAS:');
      console.log('   1. La API key no es válida');
      console.log('   2. Restricciones de dominio configuradas');
      console.log('   3. La API no está activada\n');
    } else {
      console.log(`   ⚠️  Respuesta inesperada: ${res.statusCode}\n`);
    }

    // Resumen final
    console.log('─'.repeat(60));
    console.log('\n📊 RESUMEN:\n');
    console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
    console.log(`Status: ${res.statusCode === 200 ? '✅ Válida' : '❌ Problema detectado'}`);
    
    console.log('\n📖 SIGUIENTE PASO:\n');
    console.log('Ve a: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com');
    console.log('Y haz clic en "HABILITAR"\n');
  });

}).on('error', (err) => {
  console.log('❌ Error de conexión:', err.message);
  console.log('\n⚠️  No se pudo conectar con Google Maps API');
  console.log('   Verifica tu conexión a internet\n');
});
