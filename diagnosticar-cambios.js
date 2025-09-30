const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarCambios() {
  console.log('🔍 DIAGNÓSTICO DE CAMBIOS IMPLEMENTADOS\n');

  try {
    // 1. Verificar embarques con estado listo-para-asignar o asignado
    console.log('📋 1. VERIFICANDO EMBARQUES PARA ASIGNACIÓN...');
    
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('*')
      .in('estado', ['listo-para-asignar', 'asignado'])
      .limit(10);

    if (error) {
      console.error('❌ Error consultando embarques:', error);
      return;
    }

    console.log(`✅ Encontrados ${embarques.length} embarques con estado listo-para-asignar o asignado`);
    
    if (embarques.length === 0) {
      console.log('⚠️  NO HAY EMBARQUES con estado listo-para-asignar o asignado');
      console.log('   Esto explica por qué no ves los badges "D. Múltiples"');
      console.log('   Necesitas embarques en estos estados para ver el badge');
      
      // Crear un embarque de prueba
      console.log('\n🔧 Creando embarque de prueba para validar...');
      
      const folioTest = `TEST-BADGE-${Date.now()}`;
      const embarquePrueba = {
        folio: folioTest,
        estado: 'listo-para-asignar',
        observaciones: 'RECOLECTA: Dirección 1, Ciudad A - 10:00 AM\nRECOLECTA: Dirección 2, Ciudad B - 2:00 PM\nENTREGA: Warehouse Principal - 6:00 PM',
        origen: 'Ciudad A',
        destino: 'Ciudad B',
        cliente_id: '1d4b7c49-6b43-4e3a-9f2a-8d7c5b1a9e0f', // Un cliente existente
        tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96',
        fecha_creacion: new Date().toISOString()
      };

      const { data: nuevoEmbarque, error: errorCreacion } = await supabase
        .from('embarques')
        .insert([embarquePrueba])
        .select()
        .single();

      if (errorCreacion) {
        console.error('❌ Error creando embarque de prueba:', errorCreacion);
      } else {
        console.log(`✅ Embarque de prueba creado: ${nuevoEmbarque.folio}`);
        console.log('   📱 Este embarque DEBE mostrar el badge "D. Múltiples"');
        embarques.push(nuevoEmbarque);
      }
    }

    // 2. Analizar cada embarque para múltiples direcciones
    console.log('\n📋 2. ANALIZANDO DIRECCIONES MÚLTIPLES...');
    
    for (const embarque of embarques.slice(0, 5)) {
      console.log(`\n🔍 Embarque: ${embarque.folio} (${embarque.estado})`);
      
      // Verificar observaciones
      if (embarque.observaciones) {
        const obsText = embarque.observaciones.toUpperCase();
        const recolectas = (obsText.match(/RECOLECTA:/g) || []).length;
        const entregas = (obsText.match(/ENTREGA:/g) || []).length;
        
        console.log(`   📝 Observaciones: ${embarque.observaciones.substring(0, 100)}...`);
        console.log(`   🔢 Recolectas detectadas: ${recolectas}`);
        console.log(`   🔢 Entregas detectadas: ${entregas}`);
        
        if (recolectas > 1 || entregas > 1) {
          console.log('   ✅ DEBE MOSTRAR BADGE "D. Múltiples"');
        } else {
          console.log('   ❌ No tiene múltiples direcciones');
        }
      } else {
        console.log('   ⚠️  Sin observaciones');
      }

      // Verificar campos JSON
      if (embarque.recolectas_json) {
        console.log(`   📦 recolectas_json: ${JSON.stringify(embarque.recolectas_json).substring(0, 50)}...`);
      }
      if (embarque.entregas_json) {
        console.log(`   📦 entregas_json: ${JSON.stringify(embarque.entregas_json).substring(0, 50)}...`);
      }
    }

    console.log('\n📋 3. INSTRUCCIONES PARA VER LOS CAMBIOS...');
    console.log('');
    console.log('🔄 PARA VER EL BADGE "D. Múltiples":');
    console.log('1. 🚀 Abre: http://localhost:3000/embarques');
    console.log('2. 🔍 Busca embarques con estado "listo-para-asignar" o "asignado"');
    console.log('3. 💡 IMPORTANTE: Solo aparece si el embarque tiene múltiples direcciones');
    console.log('4. 🔵 El badge debe ser AZUL con texto "D. Múltiples"');
    console.log('5. 🖱️ Al hacer hover debe mostrar tooltip explicativo');
    console.log('');
    
    console.log('🔄 PARA VER EL PLACEHOLDER DEL DROPDOWN:');
    console.log('1. 🚀 Abre: http://localhost:3000/asignar-operadores');
    console.log('2. 🔍 Busca un embarque listo para asignar');
    console.log('3. 💰 Ve a la sección "Precio Flete"');
    console.log('4. 📱 El dropdown de moneda debe mostrar "Moneda" como placeholder');
    console.log('5. ✅ NO debe tener MXN seleccionado por defecto');
    console.log('');
    
    console.log('🔧 SI NO VES LOS CAMBIOS:');
    console.log('1. 🔄 Refresca la página (Ctrl+F5 o Cmd+Shift+R)');
    console.log('2. 🧹 Limpia caché del navegador');
    console.log('3. 🔍 Verifica que el servidor esté ejecutándose en http://localhost:3000');
    console.log('4. 📱 Abre herramientas de desarrollador (F12) para ver errores');

    console.log('\n🎯 EMBARQUES DISPONIBLES PARA PROBAR:');
    embarques.forEach(e => {
      console.log(`   • ${e.folio} - Estado: ${e.estado} - ID: ${e.id}`);
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarCambios().catch(console.error);