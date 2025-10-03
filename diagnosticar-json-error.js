#!/usr/bin/env node

// Script para diagnosticar el error de JSON.parse en operadores
// Busca todos los usos de JSON.parse que podrían fallar

const fs = require('fs');
const path = require('path');

const archivo = '/Users/ivanacuna/Documents/DESARROLLO DE PROYECTOS VSC/Monarca 8/CRMMonarca/app/operadores/page.tsx';

console.log('🔍 Diagnosticando error de JSON.parse en operadores...\n');

try {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const lineas = contenido.split('\n');
  
  console.log('📋 Buscando usos de JSON.parse:');
  
  lineas.forEach((linea, indice) => {
    if (linea.includes('JSON.parse') && !linea.includes('try') && !linea.includes('catch')) {
      const numeroLinea = indice + 1;
      console.log(`\n⚠️  Línea ${numeroLinea}: ${linea.trim()}`);
      
      // Mostrar contexto (3 líneas antes y después)
      const inicio = Math.max(0, indice - 3);
      const fin = Math.min(lineas.length - 1, indice + 3);
      
      console.log('📄 Contexto:');
      for (let i = inicio; i <= fin; i++) {
        const marca = i === indice ? '>>> ' : '    ';
        console.log(`${marca}${i + 1}: ${lineas[i]}`);
      }
      console.log('---');
    }
  });
  
  console.log('\n🔍 Buscando strings que contienen "Disponible":');
  lineas.forEach((linea, indice) => {
    if (linea.includes('Disponible') || linea.includes('disponible')) {
      console.log(`Línea ${indice + 1}: ${linea.trim()}`);
    }
  });
  
  console.log('\n✅ Diagnóstico completado');
  
} catch (error) {
  console.error('❌ Error leyendo archivo:', error.message);
}