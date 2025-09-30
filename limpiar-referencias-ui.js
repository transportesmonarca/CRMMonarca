const { createClient } = require('@supabase/supabase-js');

// Script para limpiar referencias a tablas normalizadas en UI
// Actualiza automáticamente el código para usar solo tabla embarques

const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function limpiarReferenciasUI() {
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
          buscar: 'embarques_completa_new',
          reemplazar: 'embarques',
          descripcion: 'Cambiar vista unificada por tabla simple'
        },
        {
          buscar: 'MIGRACIÓN A TABLAS NORMALIZADAS',
          reemplazar: 'CREACIÓN EN TABLA EMBARQUES LEGACY',
          descripcion: 'Actualizar comentarios'
        }
      ]
    },
    {
      archivo: 'app/api/embarques/estado/route.ts',
      cambios: [
        {
          buscar: 'embarques_nuevo',
          reemplazar: 'embarques',
          descripcion: 'Unificar en tabla legacy'
        },
        {
          buscar: 'tabla = \'embarques_nuevo\'',
          reemplazar: 'tabla = \'embarques\'',
          descripcion: 'Usar solo tabla legacy'
        }
      ]
    }
  ];

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
        const ocurrencias = (contenido.match(new RegExp(buscar, 'g')) || []).length;
        contenido = contenido.replace(new RegExp(buscar, 'g'), reemplazar);
        console.log(`  ✅ ${descripcion}: ${ocurrencias} reemplazos`);
        modificado = true;
      } else {
        console.log(`  ⚪ ${descripcion}: No encontrado`);
      }
    }

    if (modificado) {
      // Crear backup
      const backup = `${rutaCompleta}.backup.${Date.now()}`;
      fs.writeFileSync(backup, fs.readFileSync(rutaCompleta));
      console.log(`  💾 Backup creado: ${backup.split('/').pop()}`);

      // Escribir archivo actualizado
      fs.writeFileSync(rutaCompleta, contenido);
      console.log(`  ✅ Archivo actualizado`);
    } else {
      console.log(`  ⚪ Sin cambios necesarios`);
    }
  }

  // PASO 2: VERIFICAR QUE API ROUTES FUNCIONEN CON TABLA ÚNICA
  console.log('\n🔌 2. Verificando APIs...');

  try {
    // Verificar API estado
    const estadoResp = await fetch('http://localhost:3000/api/embarques/estado?folio=TEST-001');
    if (estadoResp.ok) {
      console.log('✅ API /api/embarques/estado: Accesible');
    } else {
      console.log('⚠️  API /api/embarques/estado: Puede necesitar ajustes');
    }
  } catch (err) {
    console.log('ℹ️  Servidor no corriendo - no se pueden verificar APIs');
  }

  // PASO 3: GENERAR SCRIPT DE VERIFICACIÓN FINAL
  console.log('\n🎯 3. Generando script de verificación...');

  const scriptVerificacion = `
-- SCRIPT DE VERIFICACIÓN POST-LIMPIEZA
-- Ejecutar para confirmar que solo queda tabla embarques

SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    table_name,
    table_rows
FROM information_schema.tables t
LEFT JOIN (
    SELECT 
        schemaname,
        tablename,
        n_tup_ins - n_tup_del as table_rows
    FROM pg_stat_user_tables
) s ON t.table_name = s.tablename
WHERE t.table_schema = 'public' 
AND t.table_name LIKE '%embarque%'
ORDER BY t.table_name;

-- Verificar que embarques tenga todas las columnas necesarias
SELECT 
    'COLUMNAS EMBARQUES' as verificacion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'embarques'
AND column_name IN (
    'id', 'folio', 'estado', 'estado_facturacion', 
    'fecha_completado', 'fecha_creacion', 'updated_at',
    'cliente_id', 'operador_id', 'camion_id', 'remolque_id'
)
ORDER BY column_name;

-- Contar registros finales
SELECT 'REGISTROS FINALES' as info, COUNT(*) as total FROM embarques;
`;

  fs.writeFileSync('verificacion-post-limpieza.sql', scriptVerificacion);
  console.log('📄 Creado: verificacion-post-limpieza.sql');

  console.log('\n🎉 LIMPIEZA DE UI COMPLETADA');
  console.log('=' .repeat(65));
  console.log('📋 PRÓXIMOS PASOS:');
  console.log('  1. Ejecutar: limpiar-tablas-normalizadas.sql (en Supabase)');
  console.log('  2. Ejecutar: verificacion-post-limpieza.sql (verificar)');
  console.log('  3. Reiniciar servidor: npm run dev');
  console.log('  4. Probar funcionalidad completa');

  return {
    archivosModificados: archivosParaActualizar.length,
    backupsCreados: archivosParaActualizar.length,
    scriptCreado: 'verificacion-post-limpieza.sql'
  };
}

// Ejecutar limpieza
if (require.main === module) {
  limpiarReferenciasUI().catch(console.error);
}

module.exports = { limpiarReferenciasUI };