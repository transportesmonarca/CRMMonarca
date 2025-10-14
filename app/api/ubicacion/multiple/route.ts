import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Forzar runtime dinámico
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { ubicaciones } = body;

    // Validar que sea un array
    if (!Array.isArray(ubicaciones) || ubicaciones.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de ubicaciones no vacío' }, 
        { status: 400 }
      );
    }

    // Validar límite máximo de ubicaciones por batch
    if (ubicaciones.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 ubicaciones por envío' }, 
        { status: 400 }
      );
    }

    // Validar cada ubicación
    for (const ubicacion of ubicaciones) {
      const { operator_number, latitude, longitude } = ubicacion;
      
      if (!operator_number || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return NextResponse.json(
          { error: 'Cada ubicación debe tener operator_number, latitude y longitude' }, 
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: `Coordenadas no válidas para operador ${operator_number}` }, 
          { status: 400 }
        );
      }
    }

    // Obtener todos los operadores únicos de las ubicaciones
    const operadores_numbers = [...new Set(ubicaciones.map(u => u.operator_number))];
    
    const { data: operadoresExistentes } = await supabase
      .from('operadores')
      .select('operator_number, nombre, apellidos')
      .in('operator_number', operadores_numbers);

    const operadoresValidos = new Set(operadoresExistentes?.map(o => o.operator_number) || []);

    // Filtrar solo ubicaciones con operadores válidos
    const ubicacionesValidas = ubicaciones.filter(u => operadoresValidos.has(u.operator_number));

    if (ubicacionesValidas.length === 0) {
      return NextResponse.json(
        { error: 'Ninguno de los operadores especificados existe' }, 
        { status: 404 }
      );
    }

    // Preparar datos para inserción
    const datosParaInsertar = ubicacionesValidas.map(u => ({
      operator_number: u.operator_number,
      latitude: u.latitude,
      longitude: u.longitude,
      device_id: u.device_id || null,
      captured_at: u.captured_at || new Date().toISOString()
    }));

    // Insertar todas las ubicaciones
    const { data, error } = await supabase
      .from('locations')
      .insert(datosParaInsertar)
      .select();

    if (error) {
      console.error('Error insertando ubicaciones múltiples:', error);
      return NextResponse.json(
        { error: 'Error insertando ubicaciones en base de datos' }, 
        { status: 500 }
      );
    }

    // Calcular estadísticas
    const operadoresRechazados = ubicaciones.length - ubicacionesValidas.length;
    
    return NextResponse.json({
      success: true,
      message: `${ubicacionesValidas.length} ubicaciones insertadas exitosamente`,
      stats: {
        total_enviadas: ubicaciones.length,
        insertadas_exitosamente: ubicacionesValidas.length,
        operadores_rechazados: operadoresRechazados,
        operadores_procesados: operadores_numbers.length
      },
      data: data
    });

  } catch (error) {
    console.error('Error en API ubicaciones múltiples:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// GET para obtener todas las ubicaciones recientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limit') || '50');
    const horas = parseInt(searchParams.get('horas') || '24');

    if (limite > 500) {
      return NextResponse.json(
        { error: 'Límite máximo de 500 registros' }, 
        { status: 400 }
      );
    }

    // Calcular timestamp de hace X horas
    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() - horas);

    // Obtener ubicaciones recientes con datos de operador
    const { data: ubicaciones, error } = await supabase
      .from('locations')
      .select(`
        *,
        operadores!inner(
          nombre,
          apellidos,
          telefono,
          operator_number
        )
      `)
      .gte('captured_at', fechaLimite.toISOString())
      .order('captured_at', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Error consultando ubicaciones:', error);
      return NextResponse.json(
        { error: 'Error consultando ubicaciones' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${ubicaciones?.length || 0} ubicaciones encontradas`,
      stats: {
        total_ubicaciones: ubicaciones?.length || 0,
        horas_consultadas: horas,
        operadores_unicos: [...new Set(ubicaciones?.map(u => u.operator_number) || [])].length
      },
      data: ubicaciones
    });

  } catch (error) {
    console.error('Error en GET ubicaciones múltiples:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}