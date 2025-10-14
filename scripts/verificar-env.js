#!/usr/bin/env node

/**
 * Script para verificar la configuración de variables de entorno
 * Ejecuta con: node scripts/verificar-env.js
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Verificando configuración de variables de entorno...\n');

const checks = [
  {
    name: 'Supabase URL',
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
  },
  {
    name: 'Supabase Anon Key',
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
  },
  {
    name: 'Google Maps API Key',
    key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    required: false,
    warning: 'El mapa de Google Maps no funcionará sin esta key',
  },
  {
    name: 'Supabase Service Role',
    key: 'SUPABASE_SERVICE_ROLE',
    required: false,
  },
  {
    name: 'Vercel Blob Token',
    key: 'BLOB_READ_WRITE_TOKEN',
    required: false,
  },
];

let allOk = true;
let warnings = [];

checks.forEach((check) => {
  const value = process.env[check.key];
  const exists = value && value.trim() !== '';

  if (check.required && !exists) {
    console.log(`❌ ${check.name} (${check.key})`);
    console.log(`   ⚠️  Esta variable es REQUERIDA\n`);
    allOk = false;
  } else if (!exists) {
    console.log(`⚠️  ${check.name} (${check.key})`);
    console.log(`   📝 Opcional, pero recomendada`);
    if (check.warning) {
      console.log(`   ⚠️  ${check.warning}`);
      warnings.push(check.warning);
    }
    console.log('');
  } else {
    const preview = value.substring(0, 20) + '...';
    console.log(`✅ ${check.name} (${check.key})`);
    console.log(`   ${preview}\n`);
  }
});

console.log('─'.repeat(60));

if (allOk && warnings.length === 0) {
  console.log('\n✅ ¡Configuración completa! Todo está listo.\n');
} else if (allOk) {
  console.log('\n⚠️  Configuración básica OK, pero hay advertencias:\n');
  warnings.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w}`);
  });
  console.log('');
} else {
  console.log('\n❌ Configuración incompleta. Revisa las variables faltantes.\n');
  console.log('📖 Consulta: INSTRUCCIONES-GOOGLE-MAPS.md\n');
  process.exit(1);
}
