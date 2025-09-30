const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function obtenerTipoServicio() {
  try {
    console.log('🔍 Consultando tipos de servicio...');
    
    const { data: tipos, error } = await supabase
      .from('tipos_servicio')
      .select('id, nombre')
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('📋 Tipos de servicio disponibles:');
    tipos.forEach(tipo => {
      console.log(`   ID: ${tipo.id} - Nombre: ${tipo.nombre}`);
    });

    return tipos[0]?.id; // Retornar el primer ID

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

obtenerTipoServicio().then(tipoId => {
  console.log(`\n✅ Primer tipo_servicio_id encontrado: ${tipoId}`);
}).catch(console.error);