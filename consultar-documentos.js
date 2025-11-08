import { supabase } from './lib/supabase.js';

console.log('🔍 Consultando todos los documentos en la base de datos...');

const { data, error } = await supabase
  .from('documentos_embarques')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('📄 Documentos encontrados:', data?.length || 0);
  if (data && data.length > 0) {
    data.forEach((doc, index) => {
      console.log(`📄 Documento ${index + 1}:`, {
        id: doc.id,
        embarque_id: doc.embarque_id,
        nombre_archivo: doc.nombre_archivo,
        url: doc.url?.substring(0, 50) + '...',
        created_at: doc.created_at
      });
    });
  } else {
    console.log('⚠️ No se encontraron documentos en la base de datos');
  }
}
