// 🔍 Verificar qué columnas existen en las tablas de embarques
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEsquemaTablas() {
  console.log('\n🔍 VERIFICACIÓN: Esquema de tablas de embarques');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar esquema de embarques (legacy)
    console.log('\n📋 1. Tabla embarques (legacy):');
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select('*')
      .limit(1);
    
    if (errorLegacy) {
      console.log(`❌ Error accediendo embarques: ${errorLegacy.message}`);
    } else if (embarquesLegacy?.[0]) {
      console.log('   ✅ Columnas disponibles:');
      Object.keys(embarquesLegacy[0]).forEach(col => {
        if (col.includes('fecha') || col.includes('estado') || col.includes('completado')) {
          console.log(`      • ${col}: ${typeof embarquesLegacy[0][col]} (${embarquesLegacy[0][col] || 'null'})`);
        }
      });
      
      console.log('\n   📊 Todas las columnas:');
      Object.keys(embarquesLegacy[0]).forEach(col => {
        console.log(`      • ${col}`);
      });
    } else {
      console.log('   ❌ No hay datos en embarques');
    }
    
    // 2. Verificar esquema de embarques_nuevo
    console.log('\n📋 2. Tabla embarques_nuevo:');
    const { data: embarquesNuevo, error: errorNuevo } = await supabase
      .from('embarques_nuevo')
      .select('*')
      .limit(1);
    
    if (errorNuevo) {
      console.log(`❌ Error accediendo embarques_nuevo: ${errorNuevo.message}`);
    } else if (embarquesNuevo?.[0]) {
      console.log('   ✅ Columnas disponibles:');
      Object.keys(embarquesNuevo[0]).forEach(col => {
        if (col.includes('fecha') || col.includes('estado') || col.includes('completado')) {
          console.log(`      • ${col}: ${typeof embarquesNuevo[0][col]} (${embarquesNuevo[0][col] || 'null'})`);
        }
      });
      
      console.log('\n   📊 Todas las columnas:');
      Object.keys(embarquesNuevo[0]).forEach(col => {
        console.log(`      • ${col}`);
      });
    } else {
      console.log('   ❌ No hay datos en embarques_nuevo');
    }
    
    // 3. Verificar esquema de embarques_estado
    console.log('\n📋 3. Tabla embarques_estado:');
    const { data: embarquesEstado, error: errorEstado } = await supabase
      .from('embarques_estado')
      .select('*')
      .limit(1);
    
    if (errorEstado) {
      console.log(`❌ Error accediendo embarques_estado: ${errorEstado.message}`);
    } else if (embarquesEstado?.[0]) {
      console.log('   ✅ Columnas disponibles:');
      Object.keys(embarquesEstado[0]).forEach(col => {
        console.log(`      • ${col}: ${typeof embarquesEstado[0][col]} (${embarquesEstado[0][col] || 'null'})`);
      });
    } else {
      console.log('   ❌ No hay datos en embarques_estado');
    }
    
    // 4. Probar inserción de fecha_completado para confirmar error
    console.log('\n📋 4. Probando inserción de fecha_completado:');
    
    const testPayload = {
      estado: 'test',
      fecha_completado: new Date().toISOString()
    };
    
    console.log('   🧪 Probando en embarques (legacy)...');
    const { error: errorTestLegacy } = await supabase
      .from('embarques')
      .update(testPayload)
      .eq('id', -1); // ID que no existe para evitar cambios reales
    
    if (errorTestLegacy) {
      console.log(`   ❌ embarques: ${errorTestLegacy.message}`);
    } else {
      console.log(`   ✅ embarques: fecha_completado existe`);
    }
    
    console.log('   🧪 Probando en embarques_nuevo...');
    const { error: errorTestNuevo } = await supabase
      .from('embarques_nuevo')
      .update(testPayload)
      .eq('id', -1); // ID que no existe para evitar cambios reales
    
    if (errorTestNuevo) {
      console.log(`   ❌ embarques_nuevo: ${errorTestNuevo.message}`);
    } else {
      console.log(`   ✅ embarques_nuevo: fecha_completado existe`);
    }
    
    console.log('   🧪 Probando en embarques_estado...');
    const { error: errorTestEstado } = await supabase
      .from('embarques_estado')
      .update({fecha_completado: new Date().toISOString()})
      .eq('embarque_id', -1); // ID que no existe para evitar cambios reales
    
    if (errorTestEstado) {
      console.log(`   ❌ embarques_estado: ${errorTestEstado.message}`);
    } else {
      console.log(`   ✅ embarques_estado: fecha_completado existe`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

verificarEsquemaTablas().catch(console.error);