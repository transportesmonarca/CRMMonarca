#!/usr/bin/env node
// Disable all active rows matching a target (conservative-wide update)
// Usage: node scripts/disable_duplicates_by_target.js <pathname-or-url>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadDotEnv() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        if (line.includes(' node ') || line.includes(' export ') || line.includes('&&') || line.includes('|')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (v.includes(' ')) v = v.split(/\s+/)[0];
        if (k) process.env[k] = v;
      }
      console.log('Loaded .env.local');
    }
  } catch (e) {
    console.warn('Could not load .env.local:', e && e.message ? e.message : e);
  }
}

async function main() {
  loadDotEnv();
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/disable_duplicates_by_target.js <pathname-or-url>');
    process.exit(2);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE)');
    process.exit(3);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const encoded = encodeURIComponent(target);
  let basename = target;
  try {
    if (/^https?:\/\//i.test(target)) {
      const u = new URL(target);
      basename = (u.pathname.split('/').pop() || target);
    } else {
      basename = target.split('/').pop() || target;
    }
  } catch (e) {
    basename = target.split('/').pop() || target;
  }

  // Find matching rows
  const orParts = [];
  const cols = ['pathname','pathname_archivo','url_blob','url_archivo'];
  for (const c of cols) {
    orParts.push(`${c}.eq.${target}`);
    orParts.push(`${c}.eq.${encoded}`);
    orParts.push(`${c}.ilike.%${basename}%`);
  }
  const orQuery = orParts.join(',');
  console.log('Running SELECT with OR:', orQuery);

  const { data: found, error: selErr } = await supabase
    .from('documentos_operadores')
    .select('*')
    .or(orQuery)
    .order('fecha_subida', { ascending: false });

  if (selErr) {
    console.error('Error selecting rows:', selErr);
    process.exit(4);
  }

  console.log(`Found ${ (found||[]).length } matching rows:`);
  console.log(JSON.stringify(found, null, 2));

  if (!found || found.length === 0) {
    console.log('Nothing to update. Exiting.');
    process.exit(0);
  }

  const ids = found.map(r => r.id);
  console.log('Disabling ids:', ids.join(', '));

  const { data: updated, error: updErr } = await supabase
    .from('documentos_operadores')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('activo', true)
    .select('*');

  if (updErr) {
    console.error('Error updating rows:', updErr);
    process.exit(5);
  }

  console.log('Updated rows:', JSON.stringify(updated, null, 2));
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
