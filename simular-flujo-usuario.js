const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function simularFlujoCompletoUsuario() {
  try {
    console.log('🧪 Simulando flujo completo como usuario...');
    
    // 1. Crear embarque nuevo (como si el usuario lo hubiera creado)
    const folioTest = `USER-${new Date().getTime()}`;
    console.log(`\n📝 1. Creando embarque ${folioTest} (estado: creado)...`);
    
    const { data: embarqueNuevo, error: errorCrear } = await supabase
      .from('embarques')
      .insert({
        folio: folioTest,
        estado: 'creado',
        origen: 'TEST Origen',
        destino: 'TEST Destino',
        fecha_creacion: new Date().toISOString(),
        precio_flete: 1000
      })
      .select()
      .single();
    
    if (errorCrear) {
      console.error('❌ Error creando:', errorCrear);
      return;
    }
    
    console.log(`✅ Embarque creado: ${folioTest}`);
    
    // 2. Simular "Completar y Enviar"
    console.log(`\n🔄 2. Simulando "Completar y Enviar"...`);
    
    const { error: errorCompletar } = await supabase
      .from('embarques')
      .update({ estado: 'listo-para-asignar' })
      .eq('id', embarqueNuevo.id);
    
    if (errorCompletar) {
      console.error('❌ Error completando:', errorCompletar);
      return;
    }
    
    console.log(`✅ Estado cambiado a 'listo-para-asignar'`);
    
    // 3. Simular filtrado como lo hace embarquesFiltrados (filtro = "todos")
    console.log(`\n🔍 3. Simulando filtrado con filtroEstado = "todos"...`);
    
    const { data: todosEmbarques } = await supabase
      .from('embarques')
      .select('folio, estado')
      .order('fecha_creacion', { ascending: false })
      .limit(20);
    
    // Aplicar filtro como lo hace el componente
    const embarquesFiltrados = todosEmbarques.filter((embarque) => {
      if (embarque.estado === "archivado") return false;
      
      const filtroEstado = "todos"; // Valor por defecto
      const coincideEstado =
        filtroEstado === "todos" ||
        embarque.estado === filtroEstado ||
        (filtroEstado === "activos" &&
          embarque.estado !== "cancelado" &&
          embarque.estado !== "archivado" &&
          embarque.estado !== "finalizado");
      
      return coincideEstado;
    });
    
    const nuestroEmbarque = embarquesFiltrados.find(e => e.folio === folioTest);
    console.log(`${nuestroEmbarque ? '✅' : '❌'} Embarque ${folioTest} ${nuestroEmbarque ? 'VISIBLE' : 'OCULTO'} en filtro "todos"`);
    
    // 4. Simular cancelación
    console.log(`\n❌ 4. Simulando cancelación...`);
    
    const { error: errorCancelar } = await supabase
      .from('embarques')
      .update({ 
        estado: 'cancelado',
        motivo_cancelacion: 'Test de flujo usuario'
      })
      .eq('id', embarqueNuevo.id);
    
    if (errorCancelar) {
      console.error('❌ Error cancelando:', errorCancelar);
      return;
    }
    
    console.log(`✅ Estado cambiado a 'cancelado'`);
    
    // 5. Simular "cambio de página y regreso" (recargar datos)
    console.log(`\n🔄 5. Simulando "cambio de página y regreso"...`);
    
    const { data: todosEmbarquesReload } = await supabase
      .from('embarques')
      .select('folio, estado')
      .order('fecha_creacion', { ascending: false })
      .limit(20);
    
    // Aplicar filtro nuevamente
    const embarquesFiltradosReload = todosEmbarquesReload.filter((embarque) => {
      if (embarque.estado === "archivado") return false;
      
      const filtroEstado = "todos"; // Valor por defecto
      const coincideEstado =
        filtroEstado === "todos" ||
        embarque.estado === filtroEstado ||
        (filtroEstado === "activos" &&
          embarque.estado !== "cancelado" &&
          embarque.estado !== "archivado" &&
          embarque.estado !== "finalizado");
      
      return coincideEstado;
    });
    
    const nuestroEmbarqueReload = embarquesFiltradosReload.find(e => e.folio === folioTest);
    console.log(`${nuestroEmbarqueReload ? '✅' : '❌'} Embarque ${folioTest} ${nuestroEmbarqueReload ? 'VISIBLE' : 'OCULTO'} después de recargar`);
    
    if (nuestroEmbarqueReload) {
      console.log(`   Estado actual: '${nuestroEmbarqueReload.estado}'`);
      console.log(`   ✅ El embarque cancelado SÍ debería aparecer con badge rojo y botón Archivar`);
    }
    
    // 6. Probar con filtro "activos" para verificar si esa es la causa
    console.log(`\n🧪 6. Probando con filtro "activos" (posible causa del problema)...`);
    
    const embarquesFiltradosActivos = todosEmbarquesReload.filter((embarque) => {
      if (embarque.estado === "archivado") return false;
      
      const filtroEstado = "activos"; // ← POSIBLE CAUSA DEL PROBLEMA
      const coincideEstado =
        filtroEstado === "todos" ||
        embarque.estado === filtroEstado ||
        (filtroEstado === "activos" &&
          embarque.estado !== "cancelado" &&  // ← EXCLUYE CANCELADOS
          embarque.estado !== "archivado" &&
          embarque.estado !== "finalizado");
      
      return coincideEstado;
    });
    
    const nuestroEmbarqueActivos = embarquesFiltradosActivos.find(e => e.folio === folioTest);
    console.log(`${nuestroEmbarqueActivos ? '✅' : '❌'} Embarque ${folioTest} ${nuestroEmbarqueActivos ? 'VISIBLE' : 'OCULTO'} con filtro "activos"`);
    
    if (!nuestroEmbarqueActivos) {
      console.log(`   🎯 ¡AHÍ ESTÁ EL PROBLEMA! Si el filtro se queda en "activos", los cancelados se ocultan`);
    }
    
    console.log(`\n🗑️ Limpiar: DELETE FROM embarques WHERE id = '${embarqueNuevo.id}';`);
    
    return embarqueNuevo.id;
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

simularFlujoCompletoUsuario();