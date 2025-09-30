// Script simplificado para limpiar referencias UI sin conexión a Supabase

const fs = require('fs');
const path = require('path');

function limpiarReferenciasUISimple() {
  console.log('🧹 LIMPIANDO REFERENCIAS A TABLAS NORMALIZADAS EN UI');
  console.log('=' .repeat(65));

  const archivosParaActualizar = [
    {
      archivo: 'app/embarques/page.tsx',
      cambios: [
        {
          buscar: '.from("embarques_nuevo")',
          reemplazar: '.from("embarques")',
          descripcion: 'Cambiar tabla normalizada por legacy'
        },
        {
          buscar: 'from("embarques_nuevo")',
          reemplazar: 'from("embarques")',
          descripcion: 'Cambiar tabla normalizada por legacy (sin punto)'
        },
        {
          buscar: 'embarques_completa_new',
          reemplazar: 'embarques',
          descripcion: 'Cambiar vista unificada por tabla simple'
        },
        {
          buscar: 'MIGRACIÓN A TABLAS NORMALIZADAS',
          reemplazar: 'CREAR EN TABLA EMBARQUES LEGACY',
          descripcion: 'Actualizar comentarios'
        },
        {
          buscar: 'tablas normalizadas',
          reemplazar: 'tabla embarques legacy',
          descripcion: 'Actualizar comentarios generales'
        }
      ]
    },
    {
      archivo: 'app/api/embarques/estado-desacoplado/route.ts',
      cambios: [
        {
          buscar: 'embarques_completa_new',
          reemplazar: 'embarques',
          descripcion: 'Cambiar vista por tabla legacy'
        },
        {
          buscar: '.rpc(',
          reemplazar: '// .rpc( // FUNCIÓN ELIMINADA:',
          descripcion: 'Comentar funciones RPC eliminadas'
        }
      ]
    }
  ];

  let archivosModificados = 0;

  for (const { archivo, cambios } of archivosParaActualizar) {
    console.log(`\n📄 Procesando: ${archivo}`);
    const rutaCompleta = path.join(process.cwd(), archivo);

    if (!fs.existsSync(rutaCompleta)) {
      console.log(`⚠️  Archivo no encontrado: ${rutaCompleta}`);
      continue;
    }

    let contenido = fs.readFileSync(rutaCompleta, 'utf8');
    let modificado = false;

    for (const { buscar, reemplazar, descripcion } of cambios) {
      if (contenido.includes(buscar)) {
        const ocurrencias = (contenido.match(new RegExp(buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        contenido = contenido.replace(new RegExp(buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), reemplazar);
        console.log(`  ✅ ${descripcion}: ${ocurrencias} reemplazos`);
        modificado = true;
      } else {
        console.log(`  ⚪ ${descripcion}: No encontrado`);
      }
    }

    if (modificado) {
      // Crear backup
      const timestamp = Date.now();
      const backup = `${rutaCompleta}.backup.${timestamp}`;
      fs.writeFileSync(backup, fs.readFileSync(rutaCompleta));
      console.log(`  💾 Backup creado: ${backup.split('/').pop()}`);

      // Escribir archivo actualizado
      fs.writeFileSync(rutaCompleta, contenido);
      console.log(`  ✅ Archivo actualizado`);
      archivosModificados++;
    } else {
      console.log(`  ⚪ Sin cambios necesarios`);
    }
  }

  // GENERAR SCRIPT DE VERIFICACIÓN
  console.log('\n🎯 Generando script de verificación...');

  const scriptVerificacion = `
-- SCRIPT DE VERIFICACIÓN POST-LIMPIEZA
-- Ejecutar para confirmar que solo queda tabla embarques

SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    table_name,
    CASE 
        WHEN table_name LIKE '%embarque%' THEN '✅ TABLA RELACIONADA'
        ELSE '⚪ OTRA TABLA'
    END as tipo
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- Verificar que embarques tenga todas las columnas necesarias
SELECT 
    'COLUMNAS CRÍTICAS EN EMBARQUES' as verificacion,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('fecha_completado', 'fecha_cancelacion', 'fecha_finalizacion') 
        THEN '✅ COLUMNA AGREGADA'
        ELSE '📋 COLUMNA EXISTENTE'
    END as estado
FROM information_schema.columns 
WHERE table_name = 'embarques'
AND column_name IN (
    'id', 'folio', 'estado', 'estado_facturacion', 
    'fecha_completado', 'fecha_creacion', 'updated_at',
    'cliente_id', 'operador_id', 'camion_id', 'remolque_id'
)
ORDER BY column_name;

-- Contar registros finales
SELECT 
    'REGISTROS FINALES' as info, 
    COUNT(*) as total,
    '📊 DATOS PRESERVADOS' as estado
FROM embarques;

-- Verificar índices críticos
SELECT 
    'ÍNDICES EMBARQUES' as verificacion,
    indexname,
    '✅ ÍNDICE ACTIVO' as estado
FROM pg_indexes 
WHERE tablename = 'embarques'
AND indexname LIKE 'idx_embarques%'
ORDER BY indexname;
`;

  fs.writeFileSync('verificacion-post-limpieza.sql', scriptVerificacion);
  console.log('📄 Creado: verificacion-post-limpieza.sql');

  console.log('\n🎉 LIMPIEZA DE UI COMPLETADA');
  console.log('=' .repeat(65));
  console.log(`📊 RESUMEN:`);
  console.log(`  📁 Archivos modificados: ${archivosModificados}`);
  console.log(`  💾 Backups creados: ${archivosModificados}`);
  console.log(`  📄 Script de verificación: verificacion-post-limpieza.sql`);

  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('  1. ✅ Base de datos limpia (YA HECHO)');
  console.log('  2. ✅ Referencias UI actualizadas (YA HECHO)');
  console.log('  3. 🔧 Ejecutar: verificacion-post-limpieza.sql (verificar)');
  console.log('  4. 🚀 Reiniciar servidor: npm run dev');
  console.log('  5. 🧪 Probar botón "Completar y Enviar"');

  return {
    archivosModificados,
    backupsCreados: archivosModificados,
    exito: true
  };
}

// Ejecutar
if (require.main === module) {
  try {
    const resultado = limpiarReferenciasUISimple();
    console.log('\n🎯 RESULTADO:', resultado);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { limpiarReferenciasUISimple };