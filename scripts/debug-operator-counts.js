// Temporary debug script: list embarques for an operator and flags
(async () => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const path = require('path');
    // Load env from process (this repo likely uses NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env)
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NX_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NX_SUPABASE_ANON;
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      console.error('Missing Supabase URL / anon key in env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      process.exit(2);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const operatorName = process.argv[2] || 'ALAN BRITO';
    console.log('Searching embarques for operator name:', operatorName);

    // Fetch embarque_modificaciones ids
    const { data: mods, error: modsErr } = await supabase.from('embarque_modificaciones').select('embarque_id');
    if (modsErr) {
      console.error('Error fetching modificaciones ids:', modsErr);
      process.exit(3);
    }
    const modsSet = new Set((mods || []).map(r => r.embarque_id));

    // Fetch embarques that match operator in operadorAsignado or operadorOriginalNombre or operadorOriginal
    const q = await supabase.from('embarques').select('*').or(
      `operadorAsignado->>nombre.ilike.%25${operatorName}%25,operadorOriginalNombre.ilike.%25${operatorName}%25,operadorOriginal.ilike.%25${operatorName}%25`
    ).limit(500);
    if (q.error) {
      console.error('Error fetching embarques:', q.error);
      process.exit(4);
    }
    const rows = q.data || [];
    console.log('Found', rows.length, 'embarques matching operator (fetched up to 500).');
    const esCancelado = (emb) => {
      if (!emb) return false;
      const estado = (emb.estado || emb.estado_facturacion || '').toString().toLowerCase();
      const obsCandidates = [emb.observaciones, emb.observaciones_facturacion, emb.observacionesFacturacion, emb.motivo_cancelacion, emb.motivoCancelacion]
        .filter(Boolean).map(s => (s && s.toString) ? s.toString() : '').join(' ').toUpperCase();
      const hasCancelDate = Boolean(emb.fecha_cancelacion || emb.fechaCancelacion || emb.cancelado_en);
      const hasCancelBy = Boolean(emb.cancelado_por || emb.canceladoPor || emb.cancelado_por_nombre);
      const containsCancelKeyword = /CANCELA|CANCELADO|CANCELACIÓN|CANCELLED|CANCEL/.test(obsCandidates);
      return Boolean(
        estado.includes('cancel') ||
        estado === 'cancelado' ||
        hasCancelDate ||
        hasCancelBy ||
        containsCancelKeyword
      );
    }

    const list = rows.map(r => ({
      id: r.id,
      folio: r.folio || null,
      estado: r.estado || null,
      estado_facturacion: r.estado_facturacion || null,
      operadorAsignado: r.operadorAsignado || null,
      operadorOriginalNombre: r.operadorOriginalNombre || r.operadorOriginal || null,
      esCancelado: esCancelado(r),
      enContingencia: modsSet.has(r.id)
    }));

    // Print rows
    for (const r of list) {
      console.log(`- ${r.folio || r.id} | cancelado:${r.esCancelado ? 'YES' : 'NO'} | contingencia:${r.enContingencia ? 'YES' : 'NO'} | estado:${r.estado} | estado_fact:${r.estado_facturacion}`);
    }

    // Summary counts
    const total = list.length;
    const cancelados = list.filter(l => l.esCancelado).length;
    const conting = list.filter(l => l.enContingencia).length;
    const correctos = list.filter(l => !l.esCancelado && !l.enContingencia).length;
    console.log('\nSUMMARY: total=', total, ' cancelados=', cancelados, ' conting=', conting, ' correctos=', correctos, ' sum=', (cancelados + conting + correctos));

    process.exit(0);
  } catch (e) {
    console.error('Exception', e);
    process.exit(1);
  }
})();
