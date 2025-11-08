// Script de diagnóstico para verificar documentos de embarques
// Ejecutar con: node diagnostico-documentos.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticar() {
  console.log('🔍 Diagnóstico de Documentos de Embarques\n');
  
  // 1. Buscar el embarque TIM2511-03
  console.log('📦 Buscando embarque TIM2511-03...');
  const { data: embarques, error: embarqueError } = await supabase
    .from('embarques')
    .select('id, folio, created_at')
    .ilike('folio', '%TIM2511-03%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (embarqueError) {
    console.error('❌ Error buscando embarque:', embarqueError);
    return;
  }

  if (!embarques || embarques.length === 0) {
    console.log('❌ No se encontró el embarque TIM2511-03');
    return;
  }

  console.log(`✅ Encontrados ${embarques.length} embarque(s):`);
  embarques.forEach((e, i) => {
    console.log(`   ${i + 1}. ID: ${e.id}`);
    console.log(`      Folio: ${e.folio}`);
    console.log(`      Creado: ${e.created_at}\n`);
  });

  // 2. Buscar documentos para cada embarque
  for (const embarque of embarques) {
    console.log(`\n📄 Buscando documentos para embarque ${embarque.folio} (${embarque.id})...`);
    
    const { data: docs, error: docsError } = await supabase
      .from('documentos_embarques')
      .select('*')
      .eq('embarque_id', embarque.id)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('❌ Error buscando documentos:', docsError);
      continue;
    }

    if (!docs || docs.length === 0) {
      console.log('⚠️  No hay documentos asociados a este embarque');
      continue;
    }

    console.log(`✅ Encontrados ${docs.length} documento(s):`);
    docs.forEach((doc, i) => {
      console.log(`\n   ${i + 1}. ${doc.nombre_archivo}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Tipo: ${doc.tipo_archivo}`);
      console.log(`      Tamaño: ${doc.tamano_bytes ? (doc.tamano_bytes / 1024).toFixed(1) + ' KB' : 'N/A'}`);
      console.log(`      URL: ${doc.url_blob}`);
      console.log(`      Pathname: ${doc.pathname}`);
      console.log(`      Creado: ${doc.created_at}`);
    });
  }

  console.log('\n✅ Diagnóstico completado');
}

diagnosticar().catch(console.error);
