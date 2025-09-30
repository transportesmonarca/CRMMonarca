const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function crearLigaPublicaUUID() {
  console.log('🔗 Creando liga pública con UUID...\n');

  try {
    // 1. Buscar embarque con direcciones múltiples
    const { data: embarque } = await supabase
      .from('embarques')
      .select('id, folio, recolectas_json, entregas_json')
      .ilike('folio', 'JSON-MULTI-%')
      .limit(1)
      .single();

    if (!embarque) {
      console.error('❌ No se encontró embarque de prueba');
      return;
    }

    console.log(`✅ Embarque encontrado: ${embarque.folio}`);

    // 2. Generar UUID para el token
    const tokenUUID = uuidv4();
    
    // 3. Crear enlace público con expiración de 24 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    console.log('📝 Creando enlace público...');
    
    const { data: publicLink, error: linkError } = await supabase
      .from('public_links')
      .insert([{
        token: tokenUUID,
        embarque_id: embarque.id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (linkError) {
      console.error('❌ Error creando enlace público:', linkError);
      return;
    }

    console.log(`✅ Enlace público creado exitosamente:`);
    console.log(`   Token UUID: ${tokenUUID}`);
    console.log(`   Expira: ${expiresAt.toLocaleString()}`);

    // 4. Mostrar direcciones múltiples
    try {
      const recolectas = embarque.recolectas_json ? JSON.parse(embarque.recolectas_json) : [];
      const entregas = embarque.entregas_json ? JSON.parse(embarque.entregas_json) : [];
      
      console.log(`\n📍 DIRECCIONES MÚLTIPLES DEL EMBARQUE ${embarque.folio}:`);
      console.log(`🚚 Recolectas (${recolectas.length}):`);
      recolectas.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.direccion}`);
        if (r.fecha || r.hora) console.log(`      📅 ${r.fecha || ''} ${r.hora || ''}`);
      });
      
      console.log(`🏭 Entregas (${entregas.length}):`);
      entregas.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.direccion}`);
        if (e.fecha || e.hora) console.log(`      📅 ${e.fecha || ''} ${e.hora || ''}`);
      });
    } catch (parseError) {
      console.warn('⚠️ Error parseando direcciones:', parseError);
    }

    // 5. Generar URL completa
    const publicUrl = `http://localhost:3000/embarque-public/${embarque.id}?token=${tokenUUID}`;

    console.log(`\n🌐 LIGA PÚBLICA GENERADA:`);
    console.log(`${publicUrl}`);
    
    console.log(`\n📋 PASOS PARA PROBAR:`);
    console.log(`1. 🚀 Inicia el servidor: npm run dev`);
    console.log(`2. 🌐 Abre la liga en tu navegador (copia y pega):`);
    console.log(`   ${publicUrl}`);
    console.log(`3. ✅ Verifica que se muestren TODAS las direcciones múltiples`);
    
    console.log(`\n🎉 ¡Liga pública lista para probar direcciones múltiples!`);

  } catch (error) {
    console.error('❌ Error durante la creación:', error);
  }
}

// Ejecutar
crearLigaPublicaUUID().catch(console.error);