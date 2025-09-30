const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificarProblemaCarga() {
  try {
    console.log('🔍 Verificando problema específico de carga de datos...');
    
    // Usar el embarque que sabemos que existe y está cancelado
    const folioTest = 'FLOW-1758831360353';
    
    // 1. Verificar estado directo en BD
    console.log(`\n📋 1. Estado directo en BD:`);
    const { data: directo } = await supabase
      .from('embarques')
      .select('folio, estado')
      .eq('folio', folioTest)
      .single();
    
    if (directo) {
      console.log(`${directo.folio}: estado='${directo.estado}'`);
    }
    
    // 2. Simular loadEmbarques completo (como hace el componente)
    console.log(`\n🔄 2. Simulando loadEmbarques() completo:`);
    
    // === SIMULACIÓN DE loadEmbarques() ===
    console.log("🔄 Cargando embarques desde tablas legacy Y normalizadas...");
    
    // Cargar embarques LEGACY
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from("embarques")
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*)
      `)
      .order("fecha_creacion", { ascending: false });

    if (errorLegacy) {
      console.error("Error loading embarques legacy:", errorLegacy);
      return;
    }

    // Cargar embarques NORMALIZADOS
    const { data: embarquesNormalizados } = await supabase
      .from("embarques_nuevo")
      .select(`
        *,
        cliente:clientes(*),
        operador:operadores(*),
        camion:camiones(*),
        remolque:remolques(*),
        ubicaciones:embarques_ubicaciones(*),
        financiero:embarques_financiero(*),
        estado:embarques_estado(*),
        documentos:embarques_documentos(*),
        adicional:embarques_adicional(*)
      `)
      .order("created_at", { ascending: false });

    console.log(`Legacy: ${embarquesLegacy?.length || 0}, Normalizados: ${embarquesNormalizados?.length || 0}`);

    // Marcar fuente
    const embarquesLegacyMarcados = (embarquesLegacy || []).map(e => ({ ...e, _fuente: 'legacy' }));
    const embarquesNormalizadosCompatibles = (embarquesNormalizados || []).map((embarque) => {
      const ubicacion = embarque.ubicaciones?.[0] || {};
      const financiero = embarque.financiero?.[0] || {};
      const estado = embarque.estado?.[0] || {};
      
      // LÓGICA DE MAPEO DE ESTADO CORREGIDA
      let estadoDerivado;
      if (estado.fecha_cancelacion) estadoDerivado = 'cancelado';
      else if (estado.fecha_archivado) estadoDerivado = 'archivado';  
      else if (estado.fecha_finalizacion) estadoDerivado = 'finalizado';
      else if (estado.fecha_pago && estado.pagado) estadoDerivado = 'entregado';
      else estadoDerivado = 'creado';

      return {
        ...embarque,
        origen: ubicacion.origen || 'Por definir',
        destino: ubicacion.destino || 'Por definir',
        precio_flete: embarque.tipo_servicio_precio || financiero.precio_flete || 0,
        estado: estadoDerivado, // ESTADO DERIVADO CORRECTO
        estado_facturacion: estado.estado_facturacion || 'pendiente_facturacion',
        fecha_creacion: estado.fecha_creacion || embarque.created_at,
        _fuente: 'normalizado'
      };
    });

    // Combinar
    const embarquesCombinados = [...embarquesLegacyMarcados, ...embarquesNormalizadosCompatibles];

    // Deduplicar con priorización
    const embarquesUnicos = new Map();
    embarquesCombinados.forEach(embarque => {
      const id = embarque.id;
      const existing = embarquesUnicos.get(id);
      
      if (!existing) {
        embarquesUnicos.set(id, embarque);
      } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
        // Priorizar versión normalizada sobre legacy
        embarquesUnicos.set(id, embarque);
        console.log(`🔄 Reemplazando ${embarque.folio || id} legacy con normalizado`);
      }
    });
    
    const todosLosEmbarques = Array.from(embarquesUnicos.values());
    
    // 3. Buscar nuestro embarque de prueba
    const nuestroEmbarque = todosLosEmbarques.find(e => e.folio === folioTest);
    
    if (nuestroEmbarque) {
      console.log(`\n✅ Embarque ${folioTest} encontrado en loadEmbarques():`);
      console.log(`   Estado: '${nuestroEmbarque.estado}'`);
      console.log(`   Fuente: ${nuestroEmbarque._fuente}`);
      
      // 4. Aplicar filtrado como lo hace el componente
      const filtroTodos = (
        nuestroEmbarque.estado !== "archivado" &&
        true // filtroEstado === "todos"
      );
      
      const filtroActivos = (
        nuestroEmbarque.estado !== "archivado" &&
        (nuestroEmbarque.estado !== "cancelado" && 
         nuestroEmbarque.estado !== "finalizado")
      );
      
      console.log(`   Visible con filtro "todos": ${filtroTodos ? '✅' : '❌'}`);
      console.log(`   Visible con filtro "activos": ${filtroActivos ? '✅' : '❌'}`);
      
    } else {
      console.log(`\n❌ Embarque ${folioTest} NO encontrado en loadEmbarques()`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

verificarProblemaCarga();