const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probarDireccionesMultiplesJson() {
  console.log('🧪 Probando direcciones múltiples con campos JSON...\n');

  try {
    // 1. Crear embarque con direcciones múltiples en campos JSON
    const folioPrueba = `JSON-MULTI-${Date.now()}`;
    
    const recolectasMultiples = [
      { 
        direccion: "Av. Industria #123, Col. Industrial, Matamoros, TAM 87337",
        fecha: "2025-09-30",
        hora: "08:00"
      },
      { 
        direccion: "Parque Industrial Finsa, Nave 25, Matamoros, TAM 87337",
        fecha: "2025-09-30",
        hora: "10:30"
      },
      { 
        direccion: "Maquiladora Delta, Blvd. Lauro Villar #456, Matamoros, TAM",
        fecha: "2025-09-30",
        hora: "14:00"
      }
    ];

    const entregasMultiples = [
      { 
        direccion: "Port of Brownsville, Terminal A, Brownsville, TX 78521",
        fecha: "2025-10-01",
        hora: "09:00"
      },
      { 
        direccion: "Warehouse Complex, Industrial Blvd #789, Brownsville, TX",
        fecha: "2025-10-01",
        hora: "11:30"
      }
    ];

    console.log('📝 Creando embarque con direcciones múltiples en campos JSON...');
    console.log(`📋 Recolectas (${recolectasMultiples.length}):`, recolectasMultiples.map(r => r.direccion));
    console.log(`📋 Entregas (${entregasMultiples.length}):`, entregasMultiples.map(e => e.direccion));

    const { data: embarque, error } = await supabase
      .from('embarques')
      .insert([{
        folio: folioPrueba,
        estado: 'creado',
        origen: 'Matamoros, TAM',
        destino: 'Brownsville, TX',
        direccion_recolecta: recolectasMultiples[0].direccion,
        direccion_entrega: entregasMultiples[0].direccion,
        fecha_recolecta: recolectasMultiples[0].fecha,
        hora_recolecta: recolectasMultiples[0].hora,
        fecha_entrega: entregasMultiples[0].fecha,
        hora_entrega: entregasMultiples[0].hora,
        observaciones: 'Embarque creado con campos JSON para múltiples direcciones',
        fecha_creacion: new Date().toISOString(),
        load_number: 'JSON' + Math.floor(Math.random() * 10000),
        tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96',
        // ✅ CAMPOS JSON PARA DIRECCIONES MÚLTIPLES
        recolectas_json: JSON.stringify(recolectasMultiples),
        entregas_json: JSON.stringify(entregasMultiples)
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error al crear embarque:', error);
      return;
    }

    console.log(`\n✅ Embarque creado exitosamente:`);
    console.log(`   Folio: ${embarque.folio}`);
    console.log(`   ID: ${embarque.id}`);
    console.log(`   JSON Recolectas: ${embarque.recolectas_json ? 'SÍ' : 'NO'}`);
    console.log(`   JSON Entregas: ${embarque.entregas_json ? 'SÍ' : 'NO'}`);

    // 2. Probar la extracción de campos JSON
    console.log('\n🔍 Probando extracción desde campos JSON...');
    
    let recolectasExtraidas = [];
    let entregasExtraidas = [];
    
    try {
      if (embarque.recolectas_json) {
        recolectasExtraidas = JSON.parse(embarque.recolectas_json);
      }
      if (embarque.entregas_json) {
        entregasExtraidas = JSON.parse(embarque.entregas_json);
      }
      
      console.log(`📍 Recolectas extraídas (${recolectasExtraidas.length}):`);
      recolectasExtraidas.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.direccion} (${r.fecha} ${r.hora})`);
      });
      
      console.log(`📍 Entregas extraídas (${entregasExtraidas.length}):`);
      entregasExtraidas.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.direccion} (${e.fecha} ${e.hora})`);
      });

      // 3. Verificar detección de múltiples direcciones
      const tieneMultiples = (
        (recolectasExtraidas.length > 1 && recolectasExtraidas.some(r => (r.direccion || '').trim() !== '')) ||
        (entregasExtraidas.length > 1 && entregasExtraidas.some(e => (e.direccion || '').trim() !== ''))
      );
      
      console.log(`\n🎯 ¿Debería mostrar globo "D. Múltiples"?: ${tieneMultiples ? '✅ SÍ' : '❌ NO'}`);
      
      if (tieneMultiples) {
        console.log('🔵 El globo azul "D. Múltiples" debe aparecer junto al botón "Completar y Enviar"');
      }

    } catch (jsonError) {
      console.error('❌ Error al parsear campos JSON:', jsonError);
    }

    // 4. Instrucciones para probar en la UI
    console.log('\n🖥️ INSTRUCCIONES PARA PROBAR EN LA UI:');
    console.log('1. 🌐 Abre http://localhost:3002');
    console.log('2. 📦 Ve a la sección "Embarques"');
    console.log(`3. 🔍 Busca el embarque: ${embarque.folio}`);
    console.log('4. 🔵 Verifica que aparezca el globo "D. Múltiples" junto al botón "Completar y Enviar"');
    console.log('5. 👁️ Haz clic en "Ver detalles"');
    console.log('6. 📍 Ve a la pestaña "Direcciones y Fechas"');
    console.log('7. ✅ Verifica que se muestren TODAS las direcciones múltiples con fechas y horas');
    
    console.log('\n📊 DATOS DE PRUEBA CREADOS:');
    console.log(`   - Embarque: ${embarque.folio} (${embarque.id})`);
    console.log(`   - Recolectas: ${recolectasExtraidas.length} direcciones`);
    console.log(`   - Entregas: ${entregasExtraidas.length} direcciones`);
    console.log(`   - Estado: ${embarque.estado} (debe mostrar botón "Completar y Enviar")`);

    console.log('\n🎉 ¡Embarque con campos JSON listo para probar!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar
probarDireccionesMultiplesJson().catch(console.error);