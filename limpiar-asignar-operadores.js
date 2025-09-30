const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA COMPLETA DE REFERENCIAS NORMALIZADAS EN ASIGNAR-OPERADORES');
console.log('================================================================');

const filePath = './app/asignar-operadores/page.tsx';

// Verificar que el archivo existe
if (!fs.existsSync(filePath)) {
  console.error('❌ Archivo no encontrado:', filePath);
  process.exit(1);
}

// Crear backup
const backupPath = `${filePath}.backup-${Date.now()}`;
const originalContent = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, originalContent);
console.log('📋 Backup creado:', backupPath);

let content = originalContent;
let changes = 0;

// 1. Reemplazar lógica de tabla dinámica con tabla fija
const patterns = [
  {
    description: 'Reemplazar selección de tabla dinámica con tabla fija (embarques)',
    search: /const tabla = \(.*?\)\?\._fuente === 'normalizado' \? 'embarques_nuevo' : 'embarques';/g,
    replace: 'const tabla = "embarques"; // ✅ SIMPLIFICADO: Solo usar tabla legacy'
  },
  
  // 2. Simplificar función cargarEmbarquesFinalizados
  {
    description: 'Simplificar cargarEmbarquesFinalizados - eliminar query de embarques_nuevo',
    search: /\/\/ Cargar de tabla normalizada \(embarques_nuevo\)[\s\S]*?\.from\("embarques_nuevo"\)[\s\S]*?\);/g,
    replace: '// ✅ TABLA NORMALIZADA ELIMINADA - Solo usar legacy'
  },
  
  // 3. Eliminar conteos de embarques_nuevo
  {
    description: 'Eliminar conteos de tabla normalizada',
    search: /supabase\.from\("embarques_nuevo"\)\.select\("id", \{ count: "exact", head: true \}\)\.eq\("estado", "finalizado"\),?/g,
    replace: '// ✅ Conteo normalizado eliminado'
  },
  
  // 4. Limpiar queries SQL que referencien embarques_nuevo
  {
    description: 'Limpiar queries SQL con referencias normalizadas',
    search: /FROM embarques_nuevo en[\s\S]*?WHERE en\.estado = 'finalizado'/g,
    replace: 'FROM embarques e WHERE e.estado = \'finalizado\''
  }
];

patterns.forEach(({ description, search, replace }) => {
  const before = content;
  content = content.replace(search, replace);
  if (content !== before) {
    changes++;
    console.log(`✅ ${description}`);
  }
});

// 5. Eliminar mapeo complejo de tablas normalizadas
const complexMappingPattern = /const embarquesNuevosMapeados = \(embarquesNuevos \|\| \[\]\)\.map\(e => \{[\s\S]*?\}\);\s*todosLosEmbarques\.push\(\.\.\.embarquesNuevosMapeados\);/g;
if (complexMappingPattern.test(content)) {
  content = content.replace(complexMappingPattern, '// ✅ Mapeo de tablas normalizadas eliminado');
  changes++;
  console.log('✅ Eliminado mapeo complejo de tablas normalizadas');
}

// 6. Limpiar referencias a created_at que no existen en el tipo Embarque
content = content.replace(/a\.created_at/g, 'null'); 
content = content.replace(/b\.created_at/g, 'null');
content = content.replace(/estado\.fecha_creacion \|\| e\.created_at/g, 'estado.fecha_creacion || e.fecha_creacion');

// 7. Simplificar lógica de deduplicación
const deduplicationPattern = /\/\/ Deduplicar embarques por FOLIO[\s\S]*?const embarquesDeduplicated = Array\.from\(embarquesUnicos\.values\(\)\)/g;
if (deduplicationPattern.test(content)) {
  content = content.replace(deduplicationPattern, 
    `// ✅ SIMPLIFICADO: Sin deduplicación (solo tabla legacy)
      const embarquesDeduplicated = todosLosEmbarques`
  );
  changes++;
  console.log('✅ Simplificada lógica de deduplicación');
}

// Guardar cambios
if (changes > 0) {
  fs.writeFileSync(filePath, content);
  console.log(`\n🎉 Limpieza completada: ${changes} cambios realizados`);
  console.log(`📁 Archivo actualizado: ${filePath}`);
  console.log(`🔙 Backup disponible: ${backupPath}`);
} else {
  console.log('\n⚠️  No se realizaron cambios');
  // Eliminar backup innecesario
  fs.unlinkSync(backupPath);
}

console.log('\n📋 SIGUIENTE PASO: Revisar errores de compilación y probar la aplicación');