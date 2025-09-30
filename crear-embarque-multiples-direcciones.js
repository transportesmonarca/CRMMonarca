const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function crearEmbarqueConMultiplesDirecciones() {
  console.log('🚀 Creando embarque con múltiples direcciones para probar el globo...\n');

  try {
    const folioPrueba = `MULTI-${Date.now()}`;
    
    // Crear observaciones con múltiples direcciones en el formato correcto
    const observacionesMultiples = `
RECOLECTA 1: Av. México #1250, Col. Jardin, Matamoros, Tamaulipas 87330
RECOLECTA 2: Parque Industrial Finsa, Nave 15, Matamoros, Tamaulipas 87337
RECOLECTA 3: Boulevard del Maestro #3456, Col. Moderna, Matamoros, Tamaulipas 87350

ENTREGA 1: 1450 Port Terminal Rd, Brownsville, TX 78521
ENTREGA 2: Warehouse District #999, Industrial Blvd, Brownsville, TX 78520
ENTREGA 3: Free Trade Bridge, Brownsville Port, TX 78521

Este embarque tiene múltiples puntos de recolecta y entrega para probar la funcionalidad del globo "D. Múltiples".
    `.trim();

    console.log('📝 Creando embarque con las siguientes direcciones múltiples:');
    console.log('RECOLECTAS:');
    console.log('  1. Av. México #1250, Col. Jardin, Matamoros, Tamaulipas 87330');
    console.log('  2. Parque Industrial Finsa, Nave 15, Matamoros, Tamaulipas 87337');
    console.log('  3. Boulevard del Maestro #3456, Col. Moderna, Matamoros, Tamaulipas 87350');
    console.log('\nENTREGAS:');
    console.log('  1. 1450 Port Terminal Rd, Brownsville, TX 78521');
    console.log('  2. Warehouse District #999, Industrial Blvd, Brownsville, TX 78520');
    console.log('  3. Free Trade Bridge, Brownsville Port, TX 78521');

    // Crear embarque
    const { data: embarque, error } = await supabase
      .from('embarques')
      .insert([{
        folio: folioPrueba,
        estado: 'creado',
        origen: 'Matamoros, TAM',
        destino: 'Brownsville, TX',
        direccion_recolecta: 'Av. México #1250, Col. Jardin, Matamoros, Tamaulipas 87330',
        direccion_entrega: '1450 Port Terminal Rd, Brownsville, TX 78521',
        observaciones: observacionesMultiples,
        fecha_creacion: new Date().toISOString(),
        load_number: 'ML' + Math.floor(Math.random() * 10000),
        tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96' // CARGAS/DESCARGAS
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
    
    // Probar la extracción de direcciones múltiples
    console.log('\n🔍 Probando extracción de direcciones múltiples...');
    
    const observaciones = embarque.observaciones || '';
    const recolectasMatch = observaciones.match(/RECOLECTA\s*\d*\s*:\s*([^\n\r]+)/gi) || [];
    const entregasMatch = observaciones.match(/ENTREGA\s*\d*\s*:\s*([^\n\r]+)/gi) || [];
    
    const recolectas = recolectasMatch.map(match => ({
      direccion: match.replace(/RECOLECTA\s*\d*\s*:\s*/i, '').trim()
    }));
    
    const entregas = entregasMatch.map(match => ({
      direccion: match.replace(/ENTREGA\s*\d*\s*:\s*/i, '').trim()
    }));
    
    console.log(`📍 Recolectas extraídas (${recolectas.length}):`);
    recolectas.forEach((r, i) => console.log(`   ${i + 1}. ${r.direccion}`));
    
    console.log(`📍 Entregas extraídas (${entregas.length}):`);
    entregas.forEach((e, i) => console.log(`   ${i + 1}. ${e.direccion}`));
    
    // Verificar si debe mostrar el globo
    const tieneMultiples = (
      (recolectas.length > 1 && recolectas.some(r => (r.direccion || '').trim() !== '')) ||
      (entregas.length > 1 && entregas.some(e => (e.direccion || '').trim() !== ''))
    );
    
    console.log(`\n🎯 ¿Debería mostrar globo "D. Múltiples"?: ${tieneMultiples ? '✅ SÍ' : '❌ NO'}`);
    
    if (tieneMultiples) {
      console.log('🔵 El globo azul "D. Múltiples" debería aparecer en la card de este embarque');
    }

    console.log('\n📋 PASOS PARA PROBAR EN LA UI:');
    console.log('1. ✅ Embarque creado exitosamente');
    console.log('2. 🌐 Abre http://localhost:3002');
    console.log('3. 📦 Ve a la sección "Embarques"');
    console.log(`4. 🔍 Busca el embarque con folio: ${embarque.folio}`);
    console.log('5. 🔵 Verifica que aparezca el globo azul "D. Múltiples" junto a "Recolecta"');
    console.log('6. 👁️ Haz clic en "Ver detalles"');
    console.log('7. 📍 Ve a la pestaña "Direcciones y Fechas"');
    console.log('8. ✅ Verifica que se muestren todas las direcciones múltiples organizadamente');
    
    console.log('\n🎉 ¡Embarque de prueba listo para verificar la funcionalidad!');

  } catch (error) {
    console.error('❌ Error durante la creación:', error);
  }
}

// Ejecutar
crearEmbarqueConMultiplesDirecciones().catch(console.error);