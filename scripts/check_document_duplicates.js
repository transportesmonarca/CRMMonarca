#!/usr/bin/env node
// Diagnostic script: busca filas en documentos_operadores que coincidan con un target
// Uso: node scripts/check_document_duplicates.js <pathname-or-url>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Try to load .env.local automatically (best-effort, avoids adding dotenv dep)
try {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const keys = [];
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      // ignore lines that look like shell commands or combined commands
      if (line.includes(' node ') || line.includes(' export ') || line.includes('&&') || line.includes('|')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      // drop surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      // if value contains spaces (e.g. accidental trailing commands), keep only the first token
      if (v.includes(' ')) v = v.split(/\s+/)[0];
      if (k) {
        process.env[k] = v;
        keys.push(k);
      }
    }
    if (keys.length) console.log('Loaded env keys from .env.local:', keys.join(', '));
  }
} catch (e) {
  // non-fatal
  // eslint-disable-next-line no-console
  console.warn('Could not load .env.local automatically:', e && e.message ? e.message : e);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/check_document_duplicates.js <pathname-or-url>');
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

  const orParts = [];
  const cols = ['pathname','pathname_archivo','url_blob','url_archivo'];
  for (const c of cols) {
    orParts.push(`${c}.eq.${target}`);
    orParts.push(`${c}.eq.${encoded}`);
    orParts.push(`${c}.ilike.%${basename}%`);
  }

  const orQuery = orParts.join(',');

  console.log('Running query with OR:', orQuery);

  const { data, error } = await supabase
    .from('documentos_operadores')
    .select('*')
    .or(orQuery)
    .order('fecha_subida', { ascending: false });

  if (error) {
    console.error('Error querying supabase:', error);
    process.exit(4);
  }

  console.log(`Found ${ (data||[]).length } rows:`);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
