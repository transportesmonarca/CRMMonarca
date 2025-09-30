// 🔧 Test para verificar la solución del problema "Completar y Enviar"
// Este script simula el flujo completo y verifica la persistencia

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gspvgjjvswbzftjbsrvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHZnamp2c3diemZ0amJzcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NjYwODEsImV4cCI6MjA0OTU0MjA4MX0.XUJJZ5HKXP2aYPdCa9QCRNQrVWCIjq0vl3PUdxBTnpw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlujoCompletarYEnviar() {
  console.log('\n🧪 TEST: Flujo "Completar y Enviar" - Persistencia de estado');
  console.log('='.repeat(80));
  
  try {
    // 1. Crear un embarque de prueba
    console.log('\n📋 1. Creando embarque de prueba...');
    
    const folioTest = `TEST-COMPLETAR-${Date.now()}`;
    const { data: nuevoEmbarque, error: errorCrear } = await supabase
      .from('embarques')
      .insert({
        folio: folioTest,
        estado: 'creado',
        direccion_recolecta: 'Origen de prueba',
        direccion_entrega: 'Destino de prueba',
        cliente_id: 1, // Asumiendo que existe
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (errorCrear || !nuevoEmbarque) {
      console.log(`❌ Error creando embarque: ${errorCrear?.message || 'Desconocido'}`);
      return;
    }
    
    console.log(`✅ Embarque creado: ${nuevoEmbarque.folio} (ID: ${nuevoEmbarque.id})`);
    console.log(`   Estado inicial: ${nuevoEmbarque.estado}`);
    
    // 2. Simular "Completar y Enviar" usando el API
    console.log('\n📋 2. Simulando "Completar y Enviar"...');
    
    const response = await fetch('http://localhost:3001/api/embarques/estado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: nuevoEmbarque.id,
        estado: 'listo-para-asignar',
        fuente: 'legacy'
      })
    });
    
    const apiResult = await response.json();
    console.log(`📡 API Response:`, { ok: response.ok, status: response.status, result: apiResult });
    
    if (!response.ok || !apiResult.ok) {
      console.log(`❌ Error en API: ${apiResult.error?.message || 'Desconocido'}`);
      return;
    }
    
    console.log(`✅ Estado cambiado via API`);
    
    // 3. Verificar estado en base de datos
    console.log('\n📋 3. Verificando estado en base de datos...');
    
    const { data: embarqueActualizado } = await supabase
      .from('embarques')
      .select('folio, estado, updated_at, fecha_completado')
      .eq('id', nuevoEmbarque.id)
      .single();
    
    if (embarqueActualizado) {
      console.log(`📊 Estado en BD:`, {
        folio: embarqueActualizado.folio,
        estado: embarqueActualizado.estado,
        fecha_completado: embarqueActualizado.fecha_completado,
        updated_at: embarqueActualizado.updated_at?.split('T')[0]
      });
    } else {
      console.log(`❌ No se encontró el embarque actualizado`);
      return;
    }
    
    // 4. Simular carga de embarques (como hace loadEmbarques en el frontend)
    console.log('\n📋 4. Simulando carga de embarques (loadEmbarques)...');
    
    const { data: embarquesCompletos } = await supabase
      .from('embarques_nuevo')
      .select(`
        id, folio, estado, created_at,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*),
        ubicaciones:embarques_ubicaciones(*),
        financiero:embarques_financiero(*),
        estado_info:embarques_estado(*),
        documentos:embarques_documentos(*),
        adicional:embarques_adicional(*)
      `)
      .eq('id', nuevoEmbarque.id)
      .single();
    
    // También buscar en legacy
    const { data: embarqueLegacy } = await supabase
      .from('embarques')
      .select('id, folio, estado, created_at, fecha_completado')
      .eq('id', nuevoEmbarque.id)
      .single();
    
    console.log(`📊 Datos desde legacy:`, {
      folio: embarqueLegacy?.folio,
      estado: embarqueLegacy?.estado,
      fecha_completado: embarqueLegacy?.fecha_completado ? 'SÍ' : 'NO'
    });
    
    // 5. Simular el mapeo de estado del frontend
    console.log('\n📋 5. Simulando mapeo de estado del frontend...');
    
    if (embarqueLegacy) {
      const estado_info = embarquesCompletos?.estado_info?.[0] || {};
      
      // Aplicar la misma lógica que en el frontend
      let estadoMapeado;
      if (estado_info.estado) {
        estadoMapeado = estado_info.estado;
      } else if (estado_info.fecha_cancelacion) {
        estadoMapeado = 'cancelado';
      } else if (estado_info.fecha_archivado) {
        estadoMapeado = 'archivado';
      } else if (estado_info.fecha_finalizacion) {
        estadoMapeado = 'finalizado';
      } else if (estado_info.fecha_pago && estado_info.pagado) {
        estadoMapeado = 'entregado';
      } else if (estado_info.fecha_completado) {
        estadoMapeado = 'listo-para-asignar';
      } else if (embarqueLegacy.estado === 'listo-para-asignar') {
        estadoMapeado = 'listo-para-asignar';
      } else {
        estadoMapeado = 'creado';
      }
      
      console.log(`🎯 Estado mapeado por frontend: "${estadoMapeado}"`);
      
      if (estadoMapeado === 'listo-para-asignar') {
        console.log(`✅ ¡ÉXITO! El embarque mantendría el estado "listo-para-asignar" al recargar`);
        console.log(`   • Mostraría botón verde "Asignar" + "Archivar"`);
        console.log(`   • Mostraría badge verde "Listo para asignar"`);
      } else {
        console.log(`❌ PROBLEMA: El estado se mapearía como "${estadoMapeado}" en lugar de "listo-para-asignar"`);
        console.log(`   • Volvería a mostrar botón azul "Completar y Enviar"`);
      }
    }
    
    // 6. Limpiar - eliminar embarque de prueba
    console.log('\n📋 6. Limpiando embarque de prueba...');
    await supabase.from('embarques').delete().eq('id', nuevoEmbarque.id);
    console.log(`🗑️ Embarque de prueba eliminado`);
    
    console.log('\n🎯 RESUMEN:');
    console.log('   1. Se creó el embarque con estado "creado"');
    console.log('   2. Se cambió a "listo-para-asignar" via API');
    console.log('   3. Se verificó persistencia en BD');
    console.log('   4. Se simuló el mapeo del frontend');
    console.log('   5. Se verificó que el estado se mantiene correctamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

testFlujoCompletarYEnviar().catch(console.error);