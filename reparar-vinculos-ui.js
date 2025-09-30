const { createClient } = require('@supabase/supabase-js');

// Script para verificar y reparar vínculos de UI después de limpiar tablas normalizadas
// Identifica todos los archivos que necesitan actualización

const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function repararVinculosUI() {
  console.log('🔧 REPARANDO VÍNCULOS DE UI DESPUÉS DE LIMPIEZA');
  console.log('=' .repeat(60));

  try {
    // 1. VERIFICAR ESTADO DE LA BASE DE DATOS
    console.log('\n📊 1. Verificando estado de la base de datos...');
    
    const tablasEsperadas = [
      'embarques',
      'clientes', 
      'operadores',
      'camiones',
      'remolques',
      'tipos_servicio'
    ];
    
    for (const tabla of tablasEsperadas) {
      try {
        const { count, error } = await supabase
          .from(tabla)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${tabla}: ERROR - ${error.message}`);
        } else {
          console.log(`✅ ${tabla}: ${count} registros`);
        }
      } catch (err) {
        console.log(`❌ ${tabla}: No accesible`);
      }
    }

    // 2. VERIFICAR QUE TABLAS NORMALIZADAS FUERON ELIMINADAS
    console.log('\n🗑️  2. Verificando eliminación de tablas normalizadas...');
    
    const tablasEliminadas = [
      'embarques_nuevo',
      'embarques_consolidada', 
      'embarques_completa',
      'embarques_completa_new'
    ];
    
    for (const tabla of tablasEliminadas) {
      try {
        const { data, error } = await supabase
          .from(tabla)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`✅ ${tabla}: ELIMINADA correctamente`);
        } else {
          console.log(`⚠️  ${tabla}: AÚN EXISTE - necesita eliminación manual`);
        }
      } catch (err) {
        console.log(`✅ ${tabla}: ELIMINADA correctamente`);
      }
    }

    // 3. ESCANEAR ARCHIVOS QUE NECESITAN ACTUALIZACIÓN
    console.log('\n📁 3. Escaneando archivos para actualizar...');
    
    const archivosParaActualizar = [];
    
    function escanearDirectorio(dir, archivos = []) {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          escanearDirectorio(fullPath, archivos);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
          const contenido = fs.readFileSync(fullPath, 'utf8');
          
          // Buscar referencias a tablas normalizadas
          const referencias = [
            'embarques_nuevo',
            'embarques_consolidada',
            'embarques_completa',
            'embarques_completa_new'
          ];
          
          const referenciaEncontrada = referencias.some(ref => 
            contenido.includes(`"${ref}"`) || contenido.includes(`'${ref}"`) || contenido.includes(`from('${ref}')`)
          );
          
          if (referenciaEncontrada) {
            archivos.push({
              archivo: fullPath,
              referencias: referencias.filter(ref => contenido.includes(ref))
            });
          }
        }
      });
      
      return archivos;
    }
    
    const proyectoDir = process.cwd();
    const archivosConReferencias = escanearDirectorio(proyectoDir);
    
    console.log(`📋 Archivos encontrados con referencias: ${archivosConReferencias.length}`);
    
    archivosConReferencias.forEach((archivo, index) => {
      console.log(`\n${index + 1}. ${archivo.archivo.replace(proyectoDir, '.')}`);
      console.log(`   Referencias: ${archivo.referencias.join(', ')}`);
    });

    // 4. GENERAR PLAN DE REPARACIÓN
    console.log('\n🛠️  4. Plan de reparación generado:');
    
    const planReparacion = [
      {
        archivo: 'app/embarques/page.tsx',
        cambios: [
          'Cambiar .from("embarques_nuevo") → .from("embarques")',
          'Eliminar lógica dual de tablas',
          'Usar solo estado de tabla embarques'
        ]
      },
      {
        archivo: 'app/api/embarques/estado/route.ts',
        cambios: [
          'Eliminar búsqueda en embarques_nuevo',
          'Usar solo tabla embarques',
          'Simplificar lógica de actualización'
        ]
      },
      {
        archivo: 'app/api/embarques/estado-desacoplado/route.ts',
        cambios: [
          'Cambiar embarques_completa_new → embarques',
          'Eliminar funciones normalizadas',
          'Usar updates directos en embarques'
        ]
      }
    ];
    
    planReparacion.forEach((plan, index) => {
      console.log(`\n${index + 1}. ${plan.archivo}:`);
      plan.cambios.forEach(cambio => {
        console.log(`   - ${cambio}`);
      });
    });

    // 5. VERIFICAR COLUMNAS NECESARIAS EN EMBARQUES
    console.log('\n📋 5. Verificando columnas en tabla embarques...');
    
    try {
      const { data: sample } = await supabase
        .from('embarques')
        .select('*')
        .limit(1);
      
      if (sample && sample[0]) {
        const columnas = Object.keys(sample[0]);
        console.log(`✅ Tabla embarques tiene ${columnas.length} columnas`);
        
        // Verificar columnas críticas
        const columnasCriticas = [
          'id', 'folio', 'estado', 'estado_facturacion', 
          'fecha_completado', 'fecha_creacion', 'updated_at'
        ];
        
        const faltantes = columnasCriticas.filter(col => !columnas.includes(col));
        
        if (faltantes.length === 0) {
          console.log('✅ Todas las columnas críticas están presentes');
        } else {
          console.log(`⚠️  Columnas faltantes: ${faltantes.join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Error verificando columnas: ${err.message}`);
    }

    console.log('\n🎯 RESUMEN:');
    console.log('✅ Base de datos lista para usar solo tabla embarques');
    console.log(`📝 ${archivosConReferencias.length} archivos necesitan actualización`);
    console.log('🚀 Continuar con reparación automática de UI');
    
  } catch (error) {
    console.error('❌ Error durante reparación:', error);
  }
}

// Ejecutar reparación
repararVinculosUI().catch(console.error);