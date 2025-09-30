const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function probarFlujoCompleto() {
  try {
    console.log('🧪 Probando flujo completo: Crear → Completar → Cancelar');
    
    // 1. Crear embarque nuevo
    const folioTest = `FLOW-${new Date().getTime()}`;
    console.log(`\n📝 1. Creando embarque ${folioTest}...`);
    
    const { data: embarque, error: errorCrear } = await supabase
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
      console.error('❌ Error creando embarque:', errorCrear);
      return;
    }
    
    console.log(`✅ Embarque creado: ID=${embarque.id}, estado='${embarque.estado}'`);
    
    // 2. Cambiar estado a listo-para-asignar (simular "Completar y Enviar")
    console.log(`\n🔄 2. Cambiando estado a 'listo-para-asignar'...`);
    
    const { error: errorCompletar } = await supabase
      .from('embarques')
      .update({ estado: 'listo-para-asignar' })
      .eq('id', embarque.id);
    
    if (errorCompletar) {
      console.error('❌ Error completando:', errorCompletar);
      return;
    }
    
    // Verificar cambio
    const { data: embarqueCompletado } = await supabase
      .from('embarques')
      .select('estado')
      .eq('id', embarque.id)
      .single();
    
    console.log(`✅ Estado actualizado: '${embarqueCompletado.estado}'`);
    
    // 3. Cambiar estado a cancelado
    console.log(`\n❌ 3. Cambiando estado a 'cancelado'...`);
    
    const { error: errorCancelar } = await supabase
      .from('embarques')
      .update({ 
        estado: 'cancelado',
        motivo_cancelacion: 'Test de flujo completo'
      })
      .eq('id', embarque.id);
    
    if (errorCancelar) {
      console.error('❌ Error cancelando:', errorCancelar);
      return;
    }
    
    // Verificar cambio
    const { data: embarqueCancelado } = await supabase
      .from('embarques')
      .select('estado, motivo_cancelacion')
      .eq('id', embarque.id)
      .single();
    
    console.log(`✅ Estado final: '${embarqueCancelado.estado}'`);
    console.log(`📝 Motivo: ${embarqueCancelado.motivo_cancelacion || 'N/A'}`);
    
    console.log('\n🎯 Resultados esperados:');
    console.log(`1. Estado 'creado' → Botón "Completar y Enviar"`);
    console.log(`2. Estado 'listo-para-asignar' → Badge verde + Botón "Archivar"`);
    console.log(`3. Estado 'cancelado' → Badge rojo + Botón "Archivar"`);
    
    console.log(`\n🗑️ Limpiar: DELETE FROM embarques WHERE id = '${embarque.id}';`);
    
    return embarque.id;
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

probarFlujoCompleto();