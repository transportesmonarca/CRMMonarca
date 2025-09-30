// 🔧 Diagnóstico: Verificar cómo se almacena "listo-para-asignar" en las tablas
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarEstadoListoParaAsignar() {
  console.log('\n🔍 DIAGNÓSTICO: Estado "listo-para-asignar"');
  console.log('='.repeat(60));
  
  try {
    // 1. Buscar embarques con estado "listo-para-asignar" en tabla legacy
    console.log('\n📋 1. Tabla embarques (legacy):');
    const { data: embarquesLegacy } = await supabase
      .from('embarques')
      .select('folio, estado, created_at')
      .eq('estado', 'listo-para-asignar')
      .limit(5);
    
    if (embarquesLegacy?.length) {
      console.log(`   ✅ Encontrados ${embarquesLegacy.length} embarques "listo-para-asignar"`);
      embarquesLegacy.forEach(e => {
        console.log(`      • ${e.folio} - ${e.estado} (${e.created_at?.split('T')[0]})`);
      });
    } else {
      console.log('   ❌ No se encontraron embarques "listo-para-asignar" en legacy');
    }
    
    // 2. Verificar qué campos de fecha existen en embarques_estado
    console.log('\n📋 2. Esquema de embarques_estado:');
    const { data: schemaInfo } = await supabase
      .from('embarques_estado')
      .select('*')
      .limit(1);
    
    if (schemaInfo?.[0]) {
      console.log('   📊 Campos disponibles:');
      Object.keys(schemaInfo[0]).forEach(key => {
        if (key.includes('fecha')) {
          console.log(`      • ${key}: ${schemaInfo[0][key] || 'null'}`);
        }
      });
    }
    
    // 3. Buscar registros en embarques_estado con fechas de asignación o similares
    console.log('\n📋 3. Análisis de fechas en embarques_estado:');
    const { data: estadosInfo } = await supabase
      .from('embarques_estado')
      .select('embarque_id, fecha_creacion, fecha_finalizacion, fecha_cancelacion, fecha_archivado')
      .limit(10);
    
    if (estadosInfo?.length) {
      console.log(`   📊 Muestra de ${estadosInfo.length} registros de estado:`);
      estadosInfo.forEach((estado, index) => {
        console.log(`      ${index + 1}. ID: ${estado.embarque_id}`);
        console.log(`         - Creación: ${estado.fecha_creacion?.split('T')[0] || 'null'}`);
        console.log(`         - Finalización: ${estado.fecha_finalizacion?.split('T')[0] || 'null'}`);
        console.log(`         - Cancelación: ${estado.fecha_cancelacion?.split('T')[0] || 'null'}`);
        console.log(`         - Archivado: ${estado.fecha_archivado?.split('T')[0] || 'null'}`);
      });
    }
    
    // 4. Buscar un embarque específico que sepamos que está "listo-para-asignar"
    console.log('\n📋 4. Buscar embarque de prueba reciente:');
    const { data: embarqueReciente } = await supabase
      .from('embarques')
      .select('folio, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (embarqueReciente?.[0]) {
      const folio = embarqueReciente[0].folio;
      console.log(`   🎯 Embarque más reciente: ${folio} (${embarqueReciente[0].estado})`);
      
      // Buscar su registro en embarques_estado
      const { data: estadoEmbarque } = await supabase
        .from('embarques_estado')
        .select('*')
        .eq('embarque_id', embarqueReciente[0].id || 999999)
        .single();
      
      if (estadoEmbarque) {
        console.log('   📋 Estado normalizado correspondiente:');
        Object.keys(estadoEmbarque).forEach(key => {
          if (estadoEmbarque[key] !== null) {
            console.log(`      • ${key}: ${estadoEmbarque[key]}`);
          }
        });
      } else {
        console.log('   ❌ No se encontró registro correspondiente en embarques_estado');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnosticarEstadoListoParaAsignar().catch(console.error);