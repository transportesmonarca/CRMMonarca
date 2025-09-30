const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Verificando estado de la base de datos...\n');
  
  try {
    // Check embarques table
    const { data: embarquesData, error: embarquesError, count: embarquesCount } = await supabase
      .from('embarques')
      .select('folio', { count: 'exact' })
      .limit(1);
    
    console.log('📋 Tabla embarques:');
    console.log(`  Total registros: ${embarquesCount || 'Error obteniendo count'}`);
    console.log(`  Error: ${embarquesError ? embarquesError.message : 'Ninguno'}`);
    console.log(`  Sample: ${embarquesData?.[0]?.folio || 'No hay datos'}`);
    
    // Check embarques_nuevo table
    const { data: nuevosData, error: nuevosError, count: nuevosCount } = await supabase
      .from('embarques_nuevo')
      .select('folio', { count: 'exact' })
      .limit(1);
      
    console.log('\n📋 Tabla embarques_nuevo:');
    console.log(`  Total registros: ${nuevosCount || 'Error obteniendo count'}`);
    console.log(`  Error: ${nuevosError ? nuevosError.message : 'Ninguno'}`);
    console.log(`  Sample: ${nuevosData?.[0]?.folio || 'No hay datos'}`);
    
    // If we have data, get some samples
    if (embarquesCount > 0) {
      const { data: samples } = await supabase
        .from('embarques')
        .select('folio, estado')
        .limit(5);
      
      console.log('\n📋 Muestra de embarques:');
      samples?.forEach(e => console.log(`  ${e.folio} - ${e.estado}`));
    }
    
    if (nuevosCount > 0) {
      const { data: samplesnuevos } = await supabase
        .from('embarques_nuevo')
        .select('folio, estado')
        .limit(5);
      
      console.log('\n📋 Muestra de embarques_nuevo:');
      samplesnuevos?.forEach(e => console.log(`  ${e.folio} - ${e.estado}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase().catch(console.error);