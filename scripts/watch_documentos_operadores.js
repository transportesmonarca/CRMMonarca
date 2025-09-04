#!/usr/bin/env node
// Watch for new/updated documentos_operadores rows matching a basename/url for a period (polling)
// Usage: node scripts/watch_documentos_operadores.js <basename-or-path> [duration_seconds]

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
  const duration = parseInt(process.argv[3] || '60', 10);
  if (!target) {
    console.error('Usage: node scripts/watch_documentos_operadores.js <basename-or-path> [duration_seconds]');
    process.exit(2);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE)');
    process.exit(3);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const basename = target.split('/').pop();
  console.log(`Watching for rows matching basename/url '%s' for %d seconds...`, basename, duration);

  const seenIds = new Set();
  const start = new Date();
  const endAt = Date.now() + duration * 1000;

  async function poll() {
    try {
      const { data, error } = await supabase
        .from('documentos_operadores')
        .select('*')
        .or(`pathname.ilike.%${basename}%,pathname_archivo.ilike.%${basename}%,url_blob.ilike.%${basename}%,url_archivo.ilike.%${basename}%`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Select error:', error);
        return;
      }

      for (const row of data || []) {
        const id = row.id;
        if (!seenIds.has(id)) {
          // only consider rows created after start
          const created = new Date(row.created_at);
          if (created >= start) {
            console.log('NEW ROW DETECTED:', JSON.stringify(row, null, 2));
            seenIds.add(id);
          }
        }
        // detect re-activation
        if (seenIds.has(id) && row.activo) {
          console.log('ROW ACTIVE (reactivation or active insert):', JSON.stringify(row, null, 2));
        }
      }
    } catch (e) {
      console.error('Polling error:', e && e.message ? e.message : e);
    }
  }

  // initial poll
  await poll();

  while (Date.now() < endAt) {
    await new Promise(r => setTimeout(r, 2000));
    await poll();
  }

  console.log('Done watching. Found ids:', Array.from(seenIds).join(', '));
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
