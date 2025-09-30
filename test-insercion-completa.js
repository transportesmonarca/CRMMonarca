// Test de inserción replicando exactamente el código de la app
require('dotenv').config({ path: './env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsercionCompleta() {
  try {
    console.log('🔍 Probando inserción completa como en la app...');
    
    // Simular datos como los de la aplicación
    const embarqueData = {
      cliente_id: '625408ac-8b4e-437b-855b-4360f07e3922', // UUID válido del test anterior
      operador_id: null,
      camion_id: null,
      remolque_id: '008480ba-8834-4b6c-9505-fc71252c47ea', // UUID válido del test anterior
      tipo_servicio_id: '59815828-7576-4608-8c70-b7af8b1dbe96', // UUID válido del test anterior
      origen: 'Parque Industrial Norte #100, Col. Centro, Monterrey, NL',
      destino: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, MX',
      lugar_recolecta: null,
      direccion_recolecta: 'Parque Industrial Norte #100, Col. Centro, Monterrey, NL',
      direccion_entrega: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, MX',
      fecha_recolecta: '2025-09-27',
      hora_recolecta: '09:00',
      fecha_entrega: '2025-09-28',
      hora_entrega: '17:00',
      contenido: 'Tarimas con mercancía general',
      peso: 1250,
      observaciones: 'Entregar antes de las 17:00 horas. Requiere sello en recibo.',
      carta_porte: 'CP-202509-0001',
      load_number: 'LD-202509-001',
      patente_agente_aduanal: '1234',
      aduana_cruce: 'Nuevo Laredo, TAMPS',
      dueno_mercancia: 'Cliente Demo SA de CV',
      representante_cliente: '50c92215-59d4-4487-8973-fd1479e4040e', // UUID válido del test anterior
      info_representante: {
        id: '50c92215-59d4-4487-8973-fd1479e4040e',
        nombre: 'ISABEL LOPEZ',
        telefono: '8673054390',
        email: 'FACTURACIONYCOBRANZA@TMONARCA.COM.MX',
        puesto: 'EJECUTIVA',
        notas: null,
        es_principal: true
      },
      precio_flete: null,
      currency: 'MXN',
      remolque_manual: false,
      remolque_numero_economico: null,
      remolque_placa: null
    };

    const folio = 'TEST-APP-' + Date.now();

    // Replicar exactamente el código de la app
    const embarqueParaInsertar = {
      folio: folio,
      cliente_id: embarqueData.cliente_id === 'none' || embarqueData.cliente_id === '' ? null : embarqueData.cliente_id,
      operador_id: embarqueData.operador_id === 'none' || embarqueData.operador_id === '' ? null : embarqueData.operador_id,
      camion_id: embarqueData.camion_id === 'none' || embarqueData.camion_id === '' ? null : embarqueData.camion_id,
      remolque_id: embarqueData.remolque_id === 'none' || embarqueData.remolque_id === '' ? null : embarqueData.remolque_id,
      tipo_servicio_id: embarqueData.tipo_servicio_id === 'none' || embarqueData.tipo_servicio_id === '' ? null : embarqueData.tipo_servicio_id,
      origen: embarqueData.origen,
      destino: embarqueData.destino,
      lugar_recolecta: embarqueData.lugar_recolecta,
      direccion_recolecta: embarqueData.direccion_recolecta,
      direccion_entrega: embarqueData.direccion_entrega,
      fecha_recolecta: embarqueData.fecha_recolecta,
      hora_recolecta: embarqueData.hora_recolecta,
      fecha_entrega: embarqueData.fecha_entrega,
      hora_entrega: embarqueData.hora_entrega,
      contenido: embarqueData.contenido,
      peso: embarqueData.peso,
      estado: 'creado',
      estado_facturacion: 'pendiente_facturacion',
      observaciones: embarqueData.observaciones,
      carta_porte: embarqueData.carta_porte,
      load_number: embarqueData.load_number,
      patente_agente_aduanal: embarqueData.patente_agente_aduanal,
      aduana_cruce: embarqueData.aduana_cruce,
      dueno_mercancia: embarqueData.dueno_mercancia,
      representante_cliente: embarqueData.representante_cliente,
      info_representante: embarqueData.info_representante,
      precio_flete: embarqueData.precio_flete,
      moneda_flete: embarqueData.currency || 'MXN',
      remolque_manual: embarqueData.remolque_manual || null,
      remolque_numero_economico: embarqueData.remolque_numero_economico,
      remolque_placa: embarqueData.remolque_placa,
      fecha_creacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Datos para insertar:', JSON.stringify(embarqueParaInsertar, null, 2));

    const { data: nuevoEmbarque, error: errorCrear } = await supabase
      .from("embarques")
      .insert(embarqueParaInsertar)
      .select()
      .single();

    if (errorCrear) {
      console.error("❌ Error creando embarque:", errorCrear);
      console.error("❌ Error completo:", JSON.stringify(errorCrear, null, 2));
      console.error("❌ Error details:", errorCrear.details);
      console.error("❌ Error hint:", errorCrear.hint);
      console.error("❌ Error code:", errorCrear.code);
    } else {
      console.log("✅ Embarque creado exitosamente!");
      console.log("📋 ID:", nuevoEmbarque.id);
      console.log("📋 Folio:", nuevoEmbarque.folio);
      
      // Eliminar el registro de prueba
      console.log('🗑️ Eliminando registro de prueba...');
      const { error: deleteError } = await supabase
        .from('embarques')
        .delete()
        .eq('id', nuevoEmbarque.id);
        
      if (deleteError) {
        console.warn('⚠️ No se pudo eliminar registro de prueba:', deleteError);
      } else {
        console.log('✅ Registro de prueba eliminado');
      }
    }

  } catch (error) {
    console.error('💥 Error durante test completo:', error);
  }
}

// Ejecutar test
testInsercionCompleta();