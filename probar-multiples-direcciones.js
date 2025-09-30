const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function probarMultiplesDirecciones() {
  console.log('🧪 Probando funcionalidad de múltiples direcciones...');
  
  try {
    // 1. Obtener un embarque existente para modificar
    const { data: embarques, error: errorEmbarques } = await supabase
      .from('embarques')
      .select('*')
      .limit(1);
    
    if (errorEmbarques || !embarques || embarques.length === 0) {
      console.log('❌ No se encontraron embarques para probar');
      return;
    }
    
    const embarque = embarques[0];
    console.log('📋 Embarque de prueba:', embarque.folio);
    
    // 2. Simular múltiples direcciones como las captura el formulario
    const recolectasTest = [
      { direccion: "Almacén Central - Av. Juárez 123, Col. Centro", fecha: "2024-12-01", hora: "08:00" },
      { direccion: "Bodega Norte - Calle Morelos 456, Col. Industrial", fecha: "2024-12-01", hora: "10:00" },
      { direccion: "Centro de Distribución - Periférico Sur 789", fecha: "2024-12-01", hora: "12:00" }
    ];
    
    const entregasTest = [
      { direccion: "Cliente ABC - Av. Revolución 321, Col. Roma", fecha: "2024-12-02", hora: "09:00" },
      { direccion: "Sucursal DEF - Insurgentes 654, Col. Condesa", fecha: "2024-12-02", hora: "14:00" }
    ];
    
    // 3. Simular la lógica de guardado (igual que en handleSave)
    let observacionesOriginales = embarque.observaciones || "";
    
    // Agregar las múltiples direcciones al final de observaciones
    let observacionesFinales = observacionesOriginales;
    
    if (recolectasTest.length > 0 || entregasTest.length > 0) {
      let direccionesData = "\\n\\n--- DIRECCIONES MÚLTIPLES ---\\n";
      
      if (recolectasTest.length > 0) {
        direccionesData += "RECOLECCIONES:\\n";
        recolectasTest.forEach((r, i) => {
          direccionesData += `${i + 1}. ${r.direccion}`;
          if (r.fecha || r.hora) {
            direccionesData += ` (${r.fecha || ''} ${r.hora || ''}`.trim() + ')';
          }
          direccionesData += "\\n";
        });
      }
      
      if (entregasTest.length > 0) {
        direccionesData += "ENTREGAS:\\n";
        entregasTest.forEach((e, i) => {
          direccionesData += `${i + 1}. ${e.direccion}`;
          if (e.fecha || e.hora) {
            direccionesData += ` (${e.fecha || ''} ${e.hora || ''}`.trim() + ')';
          }
          direccionesData += "\\n";
        });
      }
      
      observacionesFinales += direccionesData;
    }
    
    console.log('\\n📝 Observaciones que se guardarían:');
    console.log(observacionesFinales);
    
    // 4. Actualizar el embarque con las observaciones que incluyen direcciones múltiples
    const { error: errorUpdate } = await supabase
      .from('embarques')
      .update({
        observaciones: observacionesFinales,
        // También actualizar los campos legacy con primera/última dirección
        direccion_recolecta: recolectasTest[0]?.direccion || null,
        direccion_entrega: entregasTest[entregasTest.length - 1]?.direccion || null,
        fecha_recolecta: recolectasTest[0]?.fecha || null,
        hora_recolecta: recolectasTest[0]?.hora || null,
        fecha_entrega: entregasTest[entregasTest.length - 1]?.fecha || null,
        hora_entrega: entregasTest[entregasTest.length - 1]?.hora || null
      })
      .eq('id', embarque.id);
    
    if (errorUpdate) {
      console.error('❌ Error actualizando embarque:', errorUpdate);
      return;
    }
    
    console.log('✅ Embarque actualizado con múltiples direcciones');
    
    // 5. Probar la función de extracción
    console.log('\\n🔍 Probando extracción de direcciones múltiples...');
    
    // Simular la función extraerDireccionesMultiples
    const extraerDireccionesMultiples = (observaciones) => {
      if (!observaciones) return { recolectas: [], entregas: [], observacionesLimpias: "" };

      const marcador = "--- DIRECCIONES MÚLTIPLES ---";
      const partes = observaciones.split(marcador);
      
      if (partes.length < 2) {
        return { recolectas: [], entregas: [], observacionesLimpias: observaciones };
      }

      const observacionesLimpias = partes[0].trim();
      const direccionesTexto = partes[1];

      const recolectas = [];
      const entregas = [];

      try {
        const lineas = direccionesTexto.split('\\n').map(l => l.trim()).filter(l => l);
        let seccionActual = '';

        for (const linea of lineas) {
          if (linea === 'RECOLECCIONES:') {
            seccionActual = 'recolecciones';
            continue;
          }
          if (linea === 'ENTREGAS:') {
            seccionActual = 'entregas';
            continue;
          }

          const match = linea.match(/^\\d+\\.\\s*(.+?)(\\s*\\(([^)]+)\\))?$/);
          if (match) {
            const direccion = match[1].trim();
            const fechaHora = match[3] || '';
            
            const partesFechaHora = fechaHora.split(' ').filter(p => p);
            const fecha = partesFechaHora[0] || '';
            const hora = partesFechaHora[1] || '';

            const direccionObj = { direccion, fecha, hora };

            if (seccionActual === 'recolecciones') {
              recolectas.push(direccionObj);
            } else if (seccionActual === 'entregas') {
              entregas.push(direccionObj);
            }
          }
        }
      } catch (e) {
        console.warn('Error parseando direcciones múltiples:', e);
      }

      return { recolectas, entregas, observacionesLimpias };
    };
    
    const resultado = extraerDireccionesMultiples(observacionesFinales);
    
    console.log('\\n📋 Resultado de la extracción:');
    console.log('🔄 Observaciones limpias:', resultado.observacionesLimpias);
    console.log('📍 Recolecciones extraídas:', resultado.recolectas.length);
    resultado.recolectas.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.direccion} (${r.fecha} ${r.hora})`);
    });
    console.log('📦 Entregas extraídas:', resultado.entregas.length);
    resultado.entregas.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.direccion} (${e.fecha} ${e.hora})`);
    });
    
    console.log('\\n✅ Prueba completada exitosamente');
    console.log('💡 Ahora puedes:');
    console.log('   1. Ir a /embarques en tu navegador');
    console.log('   2. Buscar el folio:', embarque.folio);
    console.log('   3. Ver detalles del embarque');
    console.log('   4. Verificar que se muestran las múltiples direcciones');
    console.log('   5. Editar el embarque para ver si se cargan las direcciones múltiples');
    
  } catch (e) {
    console.error('❌ Error en la prueba:', e);
  }
}

probarMultiplesDirecciones();