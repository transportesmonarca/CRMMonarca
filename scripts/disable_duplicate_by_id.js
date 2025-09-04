#!/usr/bin/env node
// Safe, conservative script: marca activo=false para el id dado en documentos_operadores
// Uso: node scripts/disable_duplicate_by_id.js <id>

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
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/disable_duplicate_by_id.js <id>');
    process.exit(2);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE)');
    process.exit(3);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('Looking up id:', id);
  const { data: existing, error: selErr } = await supabase
    .from('documentos_operadores')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (selErr) {
    console.error('Error selecting row:', selErr);
    process.exit(4);
  }

  if (!existing || existing.length === 0) {
    console.log('No row found with id:', id);
    process.exit(0);
  }

  console.log('Existing row:', JSON.stringify(existing[0], null, 2));

  if (!existing[0].activo) {
    console.log('Row is already inactive. Nothing to do.');
    process.exit(0);
  }

  console.log('Marking id as inactive:', id);
  const { data, error } = await supabase
    .from('documentos_operadores')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('activo', true)
    .select('*');

  if (error) {
    console.error('Error updating:', error);
    process.exit(5);
  }

  console.log('Updated rows:', JSON.stringify(data, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
