import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Forzar runtime dinámico
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { operator_number, latitude, longitude, device_id } = body;

    // Validar campos requeridos
    if (!operator_number || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { 
          error: 'Campos requeridos: operator_number, latitude, longitude',
          received: { operator_number, latitude, longitude, device_id }
        }, 
        { status: 400 }
      );
    }

    // Validar coordenadas
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordenadas no válidas' }, 
        { status: 400 }
      );
    }

    // Verificar que el operador existe
    const { data: operador, error: operadorError } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number')
      .eq('operator_number', operator_number)
      .single();

    if (operadorError || !operador) {
      return NextResponse.json(
        { error: `Operador ${operator_number} no encontrado` }, 
        { status: 404 }
      );
    }

    // Insertar nueva ubicación
    const { data, error } = await supabase
      .from('locations')
      .insert({
        operator_number,
        latitude,
        longitude,
        device_id: device_id || null,
        captured_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando ubicación:', error);
      return NextResponse.json(
        { error: 'Error insertando ubicación en base de datos' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Ubicación actualizada para ${operador.nombre} ${operador.apellidos} (${operator_number})`,
      data: {
        id: data.id,
        operator_number,
        latitude,
        longitude,
        captured_at: data.captured_at,
        operador: {
          nombre: operador.nombre,
          apellidos: operador.apellidos
        }
      }
    });

  } catch (error) {
    console.error('Error en API ubicacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// GET para obtener la última ubicación de un operador
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operator_number = searchParams.get('operator_number');

    if (!operator_number) {
      return NextResponse.json(
        { error: 'Parámetro operator_number requerido' }, 
        { status: 400 }
      );
    }

    // Obtener la última ubicación
    const { data: ubicacion, error } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_number', operator_number)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error consultando ubicación:', error);
      return NextResponse.json(
        { error: 'Error consultando ubicación' }, 
        { status: 500 }
      );
    }

    if (!ubicacion) {
      return NextResponse.json(
        { error: 'No se encontró ubicación para este operador' }, 
        { status: 404 }
      );
    }

    // Obtener datos del operador
    const { data: operador } = await supabase
      .from('operadores')
      .select('nombre, apellidos, operator_number, telefono')
      .eq('operator_number', operator_number)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        ...ubicacion,
        operador
      }
    });

  } catch (error) {
    console.error('Error en GET ubicacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}