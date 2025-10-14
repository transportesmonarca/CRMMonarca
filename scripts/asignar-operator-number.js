import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 ASIGNANDO OPERATOR_NUMBER A OPERADORES EXISTENTES\n');

async function asignarNumeros() {
  try {
    // 1. Obtener operadores sin operator_number
    const { data: operadores, error: opError } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number')
      .is('operator_number', null)
      .limit(5);

    if (opError) {
      console.error('❌ Error al obtener operadores:', opError);
      return;
    }

    if (!operadores || operadores.length === 0) {
      console.log('✅ Todos los operadores ya tienen operator_number asignado');
      return;
    }

    console.log(`📋 Operadores sin operator_number: ${operadores.length}\n`);

    // 2. Asignar números del 001 al 005
    const numerosDisponibles = ['001', '002', '003', '004', '005'];
    
    for (let i = 0; i < Math.min(operadores.length, numerosDisponibles.length); i++) {
      const operador = operadores[i];
      const numero = numerosDisponibles[i];

      console.log(`Asignando ${numero} a ${operador.nombre} ${operador.apellidos || ''}...`);

      const { error: updateError } = await supabase
        .from('operadores')
        .update({ operator_number: numero })
        .eq('id', operador.id);

      if (updateError) {
        console.error(`   ❌ Error:`, updateError.message);
      } else {
        console.log(`   ✅ Asignado correctamente`);
        
        // Actualizar también en la tabla embarques
        const { error: embError } = await supabase
          .from('embarques')
          .update({ operator_number: numero })
          .eq('operador_id', operador.id);
        
        if (!embError) {
          console.log(`   ✅ Actualizado en embarques también`);
        }
      }
    }

    console.log('\n✅ Proceso completado');
    
    // 3. Verificar resultado
    console.log('\n📊 Verificando resultado:');
    const { data: verificacion } = await supabase
      .from('operadores')
      .select('id, nombre, operator_number')
      .in('operator_number', numerosDisponibles);
    
    if (verificacion) {
      verificacion.forEach(op => {
        console.log(`   ${op.operator_number}: ${op.nombre}`);
      });
    }

    // 4. Verificar ubicaciones disponibles
    console.log('\n📍 Ubicaciones disponibles para estos operadores:');
    const { data: ubicaciones } = await supabase
      .from('locations')
      .select('operator_number, latitude, longitude')
      .in('operator_number', numerosDisponibles)
      .order('captured_at', { ascending: false });
    
    if (ubicaciones) {
      const ubicacionesPorOperador = {};
      ubicaciones.forEach(u => {
        if (!ubicacionesPorOperador[u.operator_number]) {
          ubicacionesPorOperador[u.operator_number] = u;
        }
      });
      
      Object.keys(ubicacionesPorOperador).forEach(num => {
        const ub = ubicacionesPorOperador[num];
        console.log(`   ${num}: Lat ${ub.latitude}, Lng ${ub.longitude}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

asignarNumeros();
