const { createClient } = require('@supabase/supabase-js');

// Script para auditar el estado actual de las tablas de embarques
// Identifica diferencias, duplicados y estructura

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function auditarTablasEmbarques() {
  console.log('🔍 AUDITORÍA COMPLETA DE TABLAS EMBARQUES');
  console.log('=' .repeat(60));

  try {
    // 1. CONTAR REGISTROS EN CADA TABLA
    console.log('\n📊 1. CONTEO DE REGISTROS:');
    
    const tablas = ['embarques', 'embarques_nuevo', 'embarques_import', 'embarque_modificaciones'];
    const conteos = {};
    
    for (const tabla of tablas) {
      try {
        const { count, error } = await supabase
          .from(tabla)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${tabla}: ERROR - ${error.message}`);
          conteos[tabla] = 0;
        } else {
          console.log(`✅ ${tabla}: ${count} registros`);
          conteos[tabla] = count;
        }
      } catch (err) {
        console.log(`❌ ${tabla}: ERROR - Tabla no existe o no accesible`);
        conteos[tabla] = 0;
      }
    }

    // 2. ANALIZAR ESTRUCTURA DE COLUMNAS
    console.log('\n🏗️  2. ESTRUCTURA DE COLUMNAS:');
    
    for (const tabla of ['embarques', 'embarques_nuevo']) {
      if (conteos[tabla] > 0) {
        try {
          const { data: sample } = await supabase
            .from(tabla)
            .select('*')
            .limit(1);
          
          if (sample && sample[0]) {
            const columnas = Object.keys(sample[0]);
            console.log(`\n📋 ${tabla} (${columnas.length} columnas):`);
            console.log(columnas.sort().join(', '));
          }
        } catch (err) {
          console.log(`❌ Error obteniendo estructura de ${tabla}: ${err.message}`);
        }
      }
    }

    // 3. IDENTIFICAR FOLIOS DUPLICADOS
    console.log('\n🔄 3. ANÁLISIS DE DUPLICADOS:');
    
    if (conteos.embarques > 0 && conteos.embarques_nuevo > 0) {
      // Obtener folios de ambas tablas
      const { data: foliosLegacy } = await supabase
        .from('embarques')
        .select('folio')
        .not('folio', 'is', null);
      
      const { data: foliosNuevo } = await supabase
        .from('embarques_nuevo')
        .select('folio')
        .not('folio', 'is', null);
      
      if (foliosLegacy && foliosNuevo) {
        const setLegacy = new Set(foliosLegacy.map(f => f.folio));
        const setNuevo = new Set(foliosNuevo.map(f => f.folio));
        
        const duplicados = [...setLegacy].filter(f => setNuevo.has(f));
        const soloLegacy = [...setLegacy].filter(f => !setNuevo.has(f));
        const soloNuevo = [...setNuevo].filter(f => !setLegacy.has(f));
        
        console.log(`🔄 Folios duplicados: ${duplicados.length}`);
        console.log(`📦 Solo en embarques: ${soloLegacy.length}`);
        console.log(`🆕 Solo en embarques_nuevo: ${soloNuevo.length}`);
        
        if (duplicados.length > 0) {
          console.log(`⚠️  Ejemplos de duplicados: ${duplicados.slice(0, 5).join(', ')}`);
        }
      }
    }

    // 4. ANALIZAR ESTADOS
    console.log('\n📋 4. ANÁLISIS DE ESTADOS:');
    
    for (const tabla of ['embarques', 'embarques_nuevo']) {
      if (conteos[tabla] > 0) {
        try {
          const { data: estados } = await supabase
            .from(tabla)
            .select('estado')
            .not('estado', 'is', null);
          
          if (estados) {
            const conteoEstados = {};
            estados.forEach(e => {
              conteoEstados[e.estado] = (conteoEstados[e.estado] || 0) + 1;
            });
            
            console.log(`\n📊 Estados en ${tabla}:`);
            Object.entries(conteoEstados)
              .sort(([,a], [,b]) => b - a)
              .forEach(([estado, count]) => {
                console.log(`  ${estado}: ${count}`);
              });
          }
        } catch (err) {
          console.log(`❌ Error analizando estados en ${tabla}: ${err.message}`);
        }
      }
    }

    // 5. VERIFICAR INTEGRIDAD REFERENCIAL
    console.log('\n🔗 5. INTEGRIDAD REFERENCIAL:');
    
    // Verificar referencias a operadores, clientes, etc.
    if (conteos.embarques > 0) {
      const { data: refCheck } = await supabase
        .from('embarques')
        .select('cliente_id, operador_id, camion_id')
        .not('cliente_id', 'is', null)
        .limit(5);
      
      if (refCheck) {
        console.log(`✅ Referencias en embarques: ${refCheck.length} ejemplos con FK válidas`);
      }
    }

    // 6. RECOMENDACIONES
    console.log('\n💡 6. RECOMENDACIONES:');
    
    const totalRegistros = Object.values(conteos).reduce((sum, count) => sum + count, 0);
    
    if (totalRegistros === 0) {
      console.log('⚠️  No hay datos en ninguna tabla de embarques');
    } else if (conteos.embarques > 0 && conteos.embarques_nuevo > 0) {
      console.log('🔄 CONSOLIDACIÓN NECESARIA: Existen datos en ambos sistemas');
      console.log('📋 Próximos pasos:');
      console.log('   1. Migrar datos a tabla unificada');
      console.log('   2. Resolver duplicados por folio');
      console.log('   3. Actualizar UI para usar tabla única');
      console.log('   4. Eliminar tablas obsoletas');
    } else if (conteos.embarques > 0) {
      console.log('📦 MIGRACIÓN A NORMALIZADO: Solo existe tabla legacy');
      console.log('📋 Próximos pasos:');
      console.log('   1. Crear estructura normalizada');
      console.log('   2. Migrar datos existentes');
      console.log('   3. Actualizar UI');
    } else if (conteos.embarques_nuevo > 0) {
      console.log('🆕 RENOMBRAR TABLA: Solo existe tabla normalizada');
      console.log('📋 Próximos pasos:');
      console.log('   1. Renombrar embarques_nuevo → embarques');
      console.log('   2. Actualizar referencias en código');
    }

    console.log('\n✅ AUDITORÍA COMPLETADA');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Error durante auditoría:', error);
    process.exit(1);
  }
}

// Ejecutar auditoría
auditarTablasEmbarques().catch(console.error);