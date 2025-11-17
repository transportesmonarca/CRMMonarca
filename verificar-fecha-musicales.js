import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env.local del directorio padre
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificarFecha() {
  console.log('🔍 Verificando fechas de todos los clientes de prueba...\n');

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nombre, fecha_registro, updated_at')
    .limit(15)
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!clientes || clientes.length === 0) {
    console.log('⚠️  No se encontraron clientes');
    return;
  }

  console.log(`📋 Encontrados ${clientes.length} clientes:\n`);
  
  for (const cliente of clientes) {
    console.log(`\nCliente: ${cliente.nombre}`);
    console.log(`  fecha_registro (raw): ${cliente.fecha_registro}`);
    console.log(`  updated_at (raw): ${cliente.updated_at}`);
  
    // Analizar el timestamp
    if (cliente.fecha_registro) {
      const date = new Date(cliente.fecha_registro);
      console.log('  🔬 Análisis de fecha_registro:');
      console.log('    - getDate() [UTC]:', date.getUTCDate());
      console.log('    - getMonth() [UTC]:', date.getUTCMonth() + 1);
      console.log('    - getFullYear() [UTC]:', date.getUTCFullYear());
      console.log('    - getHours() [UTC]:', date.getUTCHours());
      console.log('    - toLocaleString("es-MX", {timeZone: "America/Matamoros"}):', 
        date.toLocaleString('es-MX', {timeZone: 'America/Matamoros'}));
    }
  }

  console.log('\n✅ Verificación completa');
}

verificarFecha().catch(console.error);
