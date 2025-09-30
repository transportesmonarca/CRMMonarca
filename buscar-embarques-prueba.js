const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTestEmbarques() {
  console.log('🔍 Buscando embarques de prueba disponibles...\n');
  
  const { data: recent } = await supabase
    .from('embarques')
    .select('folio, estado, fecha_cancelacion')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('📋 Últimos 10 embarques:');
  recent?.forEach(e => {
    console.log(`  ${e.folio} - ${e.estado} - ${e.fecha_cancelacion ? 'cancelado el ' + e.fecha_cancelacion.split('T')[0] : 'no cancelado'}`);
  });
  
  const { data: cancelled } = await supabase
    .from('embarques')
    .select('folio, estado, fecha_cancelacion')
    .eq('estado', 'cancelado')
    .limit(10);
    
  console.log('\n📋 Embarques cancelados disponibles:');
  if (cancelled?.length) {
    cancelled.forEach(e => {
      console.log(`  ${e.folio} - ${e.estado} - cancelado el ${e.fecha_cancelacion?.split('T')[0] || 'fecha desconocida'}`);
    });
  } else {
    console.log('  ❌ No se encontraron embarques cancelados');
  }
  
  // Buscar cualquier embarque que podamos usar para pruebas
  const { data: active } = await supabase
    .from('embarques')
    .select('folio, estado, fecha_cancelacion')
    .in('estado', ['listo-para-asignar', 'asignado', 'en-transito'])
    .limit(5);
    
  console.log('\n📋 Embarques activos que podríamos usar para prueba:');
  if (active?.length) {
    active.forEach(e => {
      console.log(`  ${e.folio} - ${e.estado}`);
    });
  } else {
    console.log('  ❌ No se encontraron embarques activos');
  }
}

findTestEmbarques().catch(console.error);