const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probarGloboMultiplesDirecciones() {
  console.log('🧪 Probando detección de múltiples direcciones y globo en UI...\n');

  try {
    // 1. Buscar embarques con múltiples direcciones en observaciones
    console.log('📋 Buscando embarques existentes con múltiples direcciones...');
    
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('id, folio, observaciones, direccion_recolecta, direccion_entrega')
      .ilike('observaciones', '%RECOLECTA%ENTREGA%')
      .limit(5);

    if (error) {
      console.error('❌ Error al buscar embarques:', error);
      return;
    }

    if (!embarques || embarques.length === 0) {
      console.log('⚠️ No se encontraron embarques existentes con múltiples direcciones.');
      console.log('💡 Creando un embarque de prueba...');
      
      // Crear un embarque de prueba con múltiples direcciones
      const folioPrueba = `TEST-GLOBO-${Date.now()}`;
      const observacionesMultiples = `
RECOLECTA 1: Av. Principal #123, Col. Centro, 87300 Matamoros
RECOLECTA 2: Calle Secundaria #456, Col. Industrial, 87330 Matamoros  
RECOLECTA 3: Boulevard Norte #789, Col. Moderna, 87350 Matamoros
ENTREGA 1: Puerto de Brownsville, TX 78520
ENTREGA 2: Warehouse District #999, Brownsville, TX 78521
Embarque con múltiples puntos de recolecta y entrega para probar el globo "D. Múltiples"
      `.trim();

      const { data: nuevoEmbarque, error: errorCreacion } = await supabase
        .from('embarques')
        .insert([{
          folio: folioPrueba,
          estado: 'creado',
          direccion_recolecta: 'Av. Principal #123, Col. Centro, 87300 Matamoros',
          direccion_entrega: 'Puerto de Brownsville, TX 78520',
          observaciones: observacionesMultiples,
          fecha_creacion: new Date().toISOString(),
          usuario_creacion: 'test-user'
        }])
        .select()
        .single();

      if (errorCreacion) {
        console.error('❌ Error al crear embarque de prueba:', errorCreacion);
        return;
      }

      console.log(`✅ Embarque de prueba creado: ${nuevoEmbarque.folio} (ID: ${nuevoEmbarque.id})`);
      embarques.push(nuevoEmbarque);
    }

    // 2. Analizar cada embarque para mostrar si debería tener globo
    console.log('\n🔍 Analizando embarques para detección de múltiples direcciones:');
    
    embarques.forEach((embarque, index) => {
      console.log(`\n--- Embarque ${index + 1}: ${embarque.folio} ---`);
      console.log(`ID: ${embarque.id}`);
      
      // Simular la función extraerDireccionesMultiples
      const observaciones = embarque.observaciones || '';
      const recolectasMatch = observaciones.match(/RECOLECTA\s*\d*\s*:\s*([^\n\r]+)/gi) || [];
      const entregasMatch = observaciones.match(/ENTREGA\s*\d*\s*:\s*([^\n\r]+)/gi) || [];
      
      const recolectas = recolectasMatch.map(match => ({
        direccion: match.replace(/RECOLECTA\s*\d*\s*:\s*/i, '').trim()
      }));
      
      const entregas = entregasMatch.map(match => ({
        direccion: match.replace(/ENTREGA\s*\d*\s*:\s*/i, '').trim()
      }));
      
      // Si no hay múltiples, usar las direcciones principales
      const recolectasFinales = recolectas.length > 0 ? recolectas : [{ direccion: embarque.direccion_recolecta }];
      const entregasFinales = entregas.length > 0 ? entregas : [{ direccion: embarque.direccion_entrega }];
      
      console.log(`📍 Recolectas detectadas (${recolectasFinales.length}):`, 
        recolectasFinales.map(r => r.direccion).join(' | '));
      console.log(`📍 Entregas detectadas (${entregasFinales.length}):`, 
        entregasFinales.map(e => e.direccion).join(' | '));
      
      // Simular la función tieneMultiplesDirecciones
      const tieneMultiples = (
        (recolectasFinales.length > 1 && recolectasFinales.some(r => (r.direccion || '').trim() !== '')) ||
        (entregasFinales.length > 1 && entregasFinales.some(e => (e.direccion || '').trim() !== ''))
      );
      
      console.log(`🎯 ¿Debería mostrar globo "D. Múltiples"?: ${tieneMultiples ? '✅ SÍ' : '❌ NO'}`);
      
      if (tieneMultiples) {
        console.log('🔵 El globo azul "D. Múltiples" debería aparecer en la UI');
      }
    });
    
    // 3. Instrucciones para probar en UI
    console.log('\n🖥️ INSTRUCCIONES PARA PROBAR EN LA UI:');
    console.log('1. Abre la aplicación en http://localhost:3002');
    console.log('2. Ve a la sección de Embarques');
    console.log('3. Busca los embarques listados arriba');
    console.log('4. Verifica que los embarques con múltiples direcciones muestren el globo azul "D. Múltiples"');
    console.log('5. Haz clic en "Ver detalles" de un embarque con múltiples direcciones');
    console.log('6. Ve a la pestaña "Direcciones y Fechas" y verifica que se muestren todas las direcciones');
    
    console.log('\n✨ Prueba completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
probarGloboMultiplesDirecciones().catch(console.error);