const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function limpiarYProbarDirecciones() {
  console.log('🧹 Limpiando y probando direcciones múltiples...');
  
  try {
    // 1. Obtener el embarque que modificamos anteriormente
    const { data: embarques, error: errorEmbarques } = await supabase
      .from('embarques')
      .select('*')
      .eq('folio', 'USER-1758831871411')
      .limit(1);
    
    if (errorEmbarques || !embarques || embarques.length === 0) {
      console.log('❌ No se encontró el embarque de prueba');
      return;
    }
    
    const embarque = embarques[0];
    console.log('📋 Limpiando embarque:', embarque.folio);
    
    // 2. Limpiar observaciones duplicadas
    let observacionesLimpias = (embarque.observaciones || "").replace(/--- DIRECCIONES MÚLTIPLES ---[\\s\\S]*$/g, '').trim();
    
    // 3. Crear nuevas direcciones múltiples de prueba
    const recolectasTest = [
      { direccion: "Almacén Principal - Av. Juárez 123, Col. Centro, Monterrey", fecha: "2024-12-01", hora: "08:00" },
      { direccion: "Bodega Norte - Calle Morelos 456, Col. Industrial, Guadalupe", fecha: "2024-12-01", hora: "10:00" }
    ];
    
    const entregasTest = [
      { direccion: "Cliente ABC - Av. Revolución 321, Col. Roma, CDMX", fecha: "2024-12-02", hora: "09:00" },
      { direccion: "Sucursal DEF - Insurgentes 654, Col. Condesa, CDMX", fecha: "2024-12-02", hora: "14:00" }
    ];
    
    // 4. Generar el formato correcto de direcciones múltiples
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
    
    const observacionesFinales = observacionesLimpias + direccionesData;
    
    console.log('\\n📝 Observaciones finales que se guardarán:');
    console.log('-------------------------------------------');
    console.log(observacionesFinales);
    console.log('-------------------------------------------');
    
    // 5. Actualizar el embarque
    const { error: errorUpdate } = await supabase
      .from('embarques')
      .update({
        observaciones: observacionesFinales,
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
    
    console.log('✅ Embarque actualizado correctamente');
    
    // 6. Probar la función de extracción (versión corregida)
    console.log('\\n🔍 Probando extracción de direcciones múltiples...');
    
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

        console.log('🔍 Líneas a procesar:', lineas);

        for (const linea of lineas) {
          console.log('📄 Procesando línea:', linea);
          
          if (linea === 'RECOLECCIONES:') {
            seccionActual = 'recolecciones';
            console.log('🟢 Cambiando a sección: recolecciones');
            continue;
          }
          if (linea === 'ENTREGAS:') {
            seccionActual = 'entregas';
            console.log('🟢 Cambiando a sección: entregas');
            continue;
          }

          // Parsear línea de dirección: "1. Dirección (fecha hora)"
          const match = linea.match(/^\\d+\\.\\s*(.+?)(\\s*\\(([^)]+)\\))?$/);
          if (match) {
            const direccion = match[1].trim();
            const fechaHora = match[3] || '';
            
            console.log(`  📍 Dirección: "${direccion}", FechaHora: "${fechaHora}"`);
            
            // Separar fecha y hora si están presentes
            const partesFechaHora = fechaHora.split(' ').filter(p => p);
            const fecha = partesFechaHora[0] || '';
            const hora = partesFechaHora[1] || '';

            const direccionObj = { direccion, fecha, hora };

            if (seccionActual === 'recolecciones') {
              recolectas.push(direccionObj);
              console.log(`  ➕ Agregado a recolecciones:`, direccionObj);
            } else if (seccionActual === 'entregas') {
              entregas.push(direccionObj);
              console.log(`  ➕ Agregado a entregas:`, direccionObj);
            }
          } else {
            console.log(`  ❌ No coincide el patrón para: "${linea}"`);
          }
        }
      } catch (e) {
        console.warn('Error parseando direcciones múltiples:', e);
      }

      return { recolectas, entregas, observacionesLimpias };
    };
    
    const resultado = extraerDireccionesMultiples(observacionesFinales);
    
    console.log('\\n📋 Resultado de la extracción:');
    console.log('===============================');
    console.log('🔄 Observaciones limpias:');
    console.log(`"${resultado.observacionesLimpias}"`);
    console.log(`\\n📍 Recolecciones extraídas: ${resultado.recolectas.length}`);
    resultado.recolectas.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.direccion} (${r.fecha} ${r.hora})`);
    });
    console.log(`\\n📦 Entregas extraídas: ${resultado.entregas.length}`);
    resultado.entregas.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.direccion} (${e.fecha} ${e.hora})`);
    });
    
    if (resultado.recolectas.length > 0 && resultado.entregas.length > 0) {
      console.log('\\n✅ ¡Función de extracción funcionando correctamente!');
    } else {
      console.log('\\n❌ La función de extracción no está funcionando');
    }
    
    console.log('\\n💡 Para probar en la interfaz:');
    console.log('   1. Ve a: http://localhost:3001/embarques');
    console.log('   2. Busca el folio:', embarque.folio);
    console.log('   3. Haz clic en "Ver detalles"');
    console.log('   4. Ve a la pestaña "Direcciones y Fechas"');
    console.log('   5. Edita el embarque para ver si cargan las direcciones múltiples');
    
  } catch (e) {
    console.error('❌ Error en la prueba:', e);
  }
}

limpiarYProbarDirecciones();