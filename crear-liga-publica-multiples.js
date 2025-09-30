const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function crearLigaPublicaDireccionesMultiples() {
  console.log('🔗 Creando liga pública para probar direcciones múltiples...\n');

  try {
    // 1. Buscar un embarque con direcciones múltiples existente
    console.log('🔍 Buscando embarques con direcciones múltiples...');
    
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('id, folio, recolectas_json, entregas_json')
      .or('recolectas_json.not.is.null,entregas_json.not.is.null')
      .limit(3);

    if (error) {
      console.error('❌ Error buscando embarques:', error);
      return;
    }

    let embarqueSeleccionado = null;
    
    // Buscar el primer embarque que tenga realmente múltiples direcciones
    for (const embarque of embarques || []) {
      try {
        const recolectas = embarque.recolectas_json ? JSON.parse(embarque.recolectas_json) : [];
        const entregas = embarque.entregas_json ? JSON.parse(embarque.entregas_json) : [];
        
        if (recolectas.length > 1 || entregas.length > 1) {
          embarqueSeleccionado = embarque;
          console.log(`✅ Embarque seleccionado: ${embarque.folio}`);
          console.log(`   - Recolectas: ${recolectas.length}`);
          console.log(`   - Entregas: ${entregas.length}`);
          break;
        }
      } catch (parseError) {
        continue;
      }
    }

    if (!embarqueSeleccionado) {
      console.log('⚠️ No se encontró embarque con direcciones múltiples. Usando el embarque de prueba JSON-MULTI...');
      
      // Buscar el embarque que creamos anteriormente
      const { data: jsonEmbarque } = await supabase
        .from('embarques')
        .select('id, folio, recolectas_json, entregas_json')
        .ilike('folio', 'JSON-MULTI-%')
        .limit(1)
        .single();

      if (jsonEmbarque) {
        embarqueSeleccionado = jsonEmbarque;
        console.log(`✅ Usando embarque de prueba: ${jsonEmbarque.folio}`);
      } else {
        console.error('❌ No se encontró ningún embarque con direcciones múltiples');
        return;
      }
    }

    // 2. Generar token único
    const token = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // 3. Crear enlace público con expiración de 24 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    console.log('\n📝 Creando enlace público...');
    
    const { data: publicLink, error: linkError } = await supabase
      .from('public_links')
      .insert([{
        token: token,
        embarque_id: embarqueSeleccionado.id,
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
    console.log(`   Token: ${token}`);
    console.log(`   Expira: ${expiresAt.toLocaleString()}`);

    // 4. Mostrar direcciones múltiples del embarque
    try {
      const recolectas = embarqueSeleccionado.recolectas_json ? JSON.parse(embarqueSeleccionado.recolectas_json) : [];
      const entregas = embarqueSeleccionado.entregas_json ? JSON.parse(embarqueSeleccionado.entregas_json) : [];
      
      console.log(`\n📍 DIRECCIONES MÚLTIPLES DEL EMBARQUE ${embarqueSeleccionado.folio}:`);
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
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://tu-dominio.com' : 'http://localhost:3000';
    const publicUrl = `${baseUrl}/embarque-public/${embarqueSeleccionado.id}?token=${token}`;

    console.log(`\n🌐 LIGA PÚBLICA GENERADA:`);
    console.log(`${publicUrl}`);
    
    console.log(`\n📋 PASOS PARA PROBAR:`);
    console.log(`1. 🚀 Inicia el servidor: npm run dev`);
    console.log(`2. 🌐 Abre la liga en tu navegador:`);
    console.log(`   ${publicUrl}`);
    console.log(`3. ✅ Verifica que se muestren TODAS las direcciones múltiples en:`);
    console.log(`   • Sección "Lugar Recolecta" (con fechas/horas)`);
    console.log(`   • Sección "Entrega" (con fechas/horas)`);
    console.log(`4. 📱 La vista es responsiva y funciona en móvil/tablet`);
    
    console.log(`\n📊 DATOS TÉCNICOS:`);
    console.log(`   • Embarque ID: ${embarqueSeleccionado.id}`);
    console.log(`   • Folio: ${embarqueSeleccionado.folio}`);
    console.log(`   • Token: ${token}`);
    console.log(`   • Expira: ${expiresAt.toISOString()}`);
    
    console.log(`\n🎉 ¡Liga pública lista para probar direcciones múltiples!`);

  } catch (error) {
    console.error('❌ Error durante la creación de liga pública:', error);
  }
}

// Ejecutar
crearLigaPublicaDireccionesMultiples().catch(console.error);