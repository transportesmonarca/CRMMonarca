// 🔍 Diagnóstico rápido: ¿Por qué no aparece el botón "Completar y Enviar"?
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarBotonCompletarYEnviar() {
  console.log('\n🔍 DIAGNÓSTICO: ¿Por qué no aparece el botón "Completar y Enviar"?');
  console.log('='.repeat(70));
  
  try {
    // 1. Verificar embarques que deberían mostrar el botón
    console.log('\n📋 1. Embarques que deberían tener botón "Completar y Enviar":');
    
    // Buscar embarques recientes
    const { data: embarquesRecientes } = await supabase
      .from('embarques')
      .select('id, folio, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (embarquesRecientes?.length) {
      console.log('   📊 Estados de embarques recientes:');
      embarquesRecientes.forEach(embarque => {
        const deberiaAparecerBoton = embarque.estado === 'creado';
        console.log(`      • ${embarque.folio}: "${embarque.estado}" → ${deberiaAparecerBoton ? '✅ SÍ debería mostrar botón' : '❌ NO muestra botón'}`);
      });
    } else {
      console.log('   ❌ No se encontraron embarques recientes');
    }
    
    // 2. Buscar específicamente embarques con estado "creado"
    console.log('\n📋 2. Embarques específicos con estado "creado":');
    
    const { data: embarquesCreado } = await supabase
      .from('embarques')
      .select('folio, estado, created_at')
      .eq('estado', 'creado')
      .limit(5);
    
    if (embarquesCreado?.length) {
      console.log(`   ✅ Encontrados ${embarquesCreado.length} embarques con estado "creado":`);
      embarquesCreado.forEach(embarque => {
        console.log(`      • ${embarque.folio} - ${embarque.created_at?.split('T')[0]}`);
      });
    } else {
      console.log('   ❌ No se encontraron embarques con estado "creado"');
      console.log('   🔍 POSIBLE PROBLEMA: Todos los embarques tienen otro estado');
    }
    
    // 3. Verificar si hay embarques que deberían estar "creado" pero están en otro estado
    console.log('\n📋 3. Análisis de estados de embarques recientes:');
    
    if (embarquesRecientes?.length) {
      const estadosCount = {};
      embarquesRecientes.forEach(embarque => {
        estadosCount[embarque.estado] = (estadosCount[embarque.estado] || 0) + 1;
      });
      
      console.log('   📊 Distribución de estados:');
      Object.entries(estadosCount).forEach(([estado, count]) => {
        console.log(`      • "${estado}": ${count} embarques`);
      });
      
      if (!estadosCount['creado']) {
        console.log('\n   ❌ PROBLEMA IDENTIFICADO: No hay embarques con estado "creado"');
        console.log('   🔧 POSIBLES CAUSAS:');
        console.log('      • Los embarques se crean con otro estado por defecto');
        console.log('      • La lógica de mapeo está cambiando "creado" a otro valor');
        console.log('      • Los embarques se están marcando automáticamente como otro estado');
      }
    }
    
    // 4. Simular la lógica de mapeo del frontend
    console.log('\n📋 4. Simulando mapeo de estado del frontend:');
    
    if (embarquesRecientes?.length) {
      const embarquePrueba = embarquesRecientes[0];
      console.log(`   🧪 Probando con: ${embarquePrueba.folio} (estado BD: "${embarquePrueba.estado}")`);
      
      // Simular la lógica exacta del frontend
      let estadoMapeado;
      
      // PRIORIDAD 1: Campo estado directo (esto es lo que probablemente está pasando)
      if (embarquePrueba.estado) {
        estadoMapeado = embarquePrueba.estado;
        console.log(`   📍 PRIORIDAD 1: Usando estado directo: "${estadoMapeado}"`);
      } else {
        estadoMapeado = 'creado';
        console.log(`   📍 FALLBACK: Usando estado por defecto: "${estadoMapeado}"`);
      }
      
      const mostraraBoton = estadoMapeado === 'creado';
      console.log(`   🎯 RESULTADO: Estado mapeado "${estadoMapeado}" → ${mostraraBoton ? '✅ BOTÓN VISIBLE' : '❌ BOTÓN OCULTO'}`);
    }
    
    console.log('\n🎯 CONCLUSIÓN:');
    console.log('   Si no aparece el botón "Completar y Enviar", es porque:');
    console.log('   1. No hay embarques con estado "creado" en la BD');
    console.log('   2. O la lógica de mapeo está devolviendo otro estado');
    console.log('   3. Verificar que los embarques nuevos se creen con estado "creado"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnosticarBotonCompletarYEnviar().catch(console.error);