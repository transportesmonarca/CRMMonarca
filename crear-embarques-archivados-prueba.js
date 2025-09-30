const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtuficayhiyzpfkvqgip.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWZpY2F5aGl5enBma3ZxZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM2OTYsImV4cCI6MjA3MTU0OTY5Nn0.kJQ3HB-7dRZwLNOXoe2zkx5CJs80mNehyXsd4iR7a1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function crearEmbarquesArchivadosPrueba() {
  console.log('📦 Creando embarques archivados de prueba para la paginación...\n');

  try {
    const totalEmbarques = 25; // Para probar paginación
    const embarquesCreados = [];

    console.log(`🔢 Creando ${totalEmbarques} embarques archivados...`);

    for (let i = 1; i <= totalEmbarques; i++) {
      const folioPrueba = `ARCH-${Date.now()}-${i.toString().padStart(3, '0')}`;
      
      // Variar fechas para probar filtros de período
      const fechaBase = new Date();
      let fechaCreacion;
      
      if (i <= 8) {
        // Mes actual
        fechaCreacion = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), i);
      } else if (i <= 16) {
        // Mes anterior
        fechaCreacion = new Date(fechaBase.getFullYear(), fechaBase.getMonth() - 1, i - 8);
      } else {
        // Meses anteriores
        fechaCreacion = new Date(fechaBase.getFullYear(), fechaBase.getMonth() - (i - 16) - 1, 15);
      }

      const embarque = {
        folio: folioPrueba,
        estado: 'archivado',
        origen: 'Matamoros, TAM',
        destino: 'Brownsville, TX',
        direccion_recolecta: `Dirección de prueba ${i}, Col. Industrial`,
        direccion_entrega: `Warehouse ${i}, Brownsville, TX`,
        observaciones: `Embarque archivado de prueba #${i}`,
        fecha_creacion: fechaCreacion.toISOString(),
        load_number: `LOAD${i.toString().padStart(4, '0')}`,
        tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96', // CARGAS/DESCARGAS
        contenido: `Contenido de prueba ${i}`,
        peso: Math.floor(Math.random() * 5000) + 1000
      };

      const { data, error } = await supabase
        .from('embarques')
        .insert([embarque])
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creando embarque ${i}:`, error);
        continue;
      }

      embarquesCreados.push(data);
      
      // Mostrar progreso cada 5 embarques
      if (i % 5 === 0) {
        console.log(`✅ Creados ${i}/${totalEmbarques} embarques...`);
      }
    }

    console.log(`\n✅ Embarques archivados creados exitosamente: ${embarquesCreados.length}`);
    
    // Mostrar resumen por período
    const ahora = new Date();
    const mesActual = embarquesCreados.filter(e => {
      const fecha = new Date(e.fecha_creacion);
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    }).length;
    
    const mesAnterior = embarquesCreados.filter(e => {
      const fecha = new Date(e.fecha_creacion);
      return fecha.getMonth() === (ahora.getMonth() - 1) && fecha.getFullYear() === ahora.getFullYear();
    }).length;

    console.log(`\n📊 DISTRIBUCIÓN DE EMBARQUES:`);
    console.log(`📅 Mes actual: ${mesActual} embarques`);
    console.log(`📅 Mes anterior: ${mesAnterior} embarques`);
    console.log(`📅 Otros períodos: ${embarquesCreados.length - mesActual - mesAnterior} embarques`);

    console.log(`\n📋 PASOS PARA PROBAR EL MODAL MEJORADO:`);
    console.log(`1. 🚀 Abre la aplicación: http://localhost:3000`);
    console.log(`2. 📦 Ve a la sección "Embarques"`);
    console.log(`3. 🗂️ Haz clic en "Ver Archivos" para abrir el modal`);
    console.log(`4. 🔵 VERIFICA botones con color azul cuando estén seleccionados:`);
    console.log(`   • "Todo" (debe estar azul por defecto)`);
    console.log(`   • "Mes actual" (debe tener ${mesActual} resultados)`);
    console.log(`   • "Mes anterior" (debe tener ${mesAnterior} resultados)`);
    console.log(`5. 📄 VERIFICA paginación mejorada:`);
    console.log(`   • Botones ⏮ ◀ ▶ ⏭ (primera, anterior, siguiente, última)`);
    console.log(`   • Números de página clickeables`);
    console.log(`   • Página actual resaltada en azul`);
    console.log(`   • Tamaño de página configurable (10, 25, 50, 100)`);

    console.log(`\n🎯 FUNCIONALIDADES A PROBAR:`);
    console.log(`✅ Botones de período con color azul cuando están activos`);
    console.log(`✅ Navegación por números de página`);
    console.log(`✅ Botones de primera/última página`);
    console.log(`✅ Indicador de página actual (azul)`);
    console.log(`✅ Cambio de tamaño de página`);
    console.log(`✅ Búsqueda y filtros funcionando con paginación`);

    console.log(`\n📄 Configuración de paginación:`);
    console.log(`   • Total embarques: ${embarquesCreados.length}`);
    console.log(`   • Tamaño página por defecto: 25`);
    console.log(`   • Páginas esperadas: ${Math.ceil(embarquesCreados.length / 25)}`);

    console.log(`\n🎉 ¡Modal de embarques archivados mejorado listo para probar!`);

  } catch (error) {
    console.error('❌ Error durante la creación de embarques de prueba:', error);
  }
}

// Ejecutar
crearEmbarquesArchivadosPrueba().catch(console.error);