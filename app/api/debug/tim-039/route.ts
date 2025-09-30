import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 API: Verificando TIM-2509-039 en ambas tablas...');

    // 1. Verificar en tabla legacy
    const { data: legacyData, error: legacyError } = await supabase
      .from('embarques')
      .select('id, fecha, cliente_id, precio_operador, created_at')
      .eq('id', 'TIM-2509-039')
      .maybeSingle();

    // 2. Verificar en tabla normalizada
    const { data: normData, error: normError } = await supabase
      .from('embarques_nuevo')
      .select(`
        id, 
        fecha, 
        cliente_id, 
        precio_operador_final, 
        tipo_servicio_precio, 
        tipo_servicio_nombre,
        created_at
      `)
      .eq('id', 'TIM-2509-039')
      .maybeSingle();

    // 3. Últimos embarques en cada tabla
    const { data: ultimosLegacy } = await supabase
      .from('embarques')
      .select('id, fecha, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const { data: ultimosNorm } = await supabase
      .from('embarques_nuevo')
      .select('id, fecha, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 4. Buscar todos los 2509
    const { data: legacy2509 } = await supabase
      .from('embarques')
      .select('id, created_at')
      .ilike('id', '%2509%')
      .order('created_at', { ascending: false });
    
    const { data: norm2509 } = await supabase
      .from('embarques_nuevo')
      .select('id, created_at')
      .ilike('id', '%2509%')
      .order('created_at', { ascending: false });

    const result = {
      tim2509039: {
        legacy: legacyData ? 'ENCONTRADO' : 'NO_ENCONTRADO',
        normalizado: normData ? 'ENCONTRADO' : 'NO_ENCONTRADO',
        legacyData,
        normalizadoData: normData
      },
      ultimosEmbarques: {
        legacy: ultimosLegacy,
        normalizado: ultimosNorm
      },
      todos2509: {
        legacy: legacy2509,
        normalizado: norm2509
      },
      errores: {
        legacy: legacyError,
        normalizado: normError
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}