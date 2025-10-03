import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: obtener estado actual por folio
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folio = searchParams.get('folio');

    if (!folio) {
      return NextResponse.json({ error: 'Folio requerido' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { error: 'Variables de entorno de Supabase faltantes' },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Ajusta los campos seleccionados a tus columnas reales
    const { data: embarque, error } = await supabase
      .from('embarques')
      .select(
        `
        id,
        folio,
        estado,
        estado_facturacion,
        operador_asignado,
        fecha_asignacion,
        fecha_inicio_transito,
        fecha_finalizacion
      `,
      )
      .eq('folio', folio)
      .single();

    if (error || !embarque) {
      return NextResponse.json(
        {
          error: 'Embarque no encontrado',
          details: error?.message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      embarque: {
        folio: embarque.folio,
        estado: embarque.estado,
        estado_facturacion: embarque.estado_facturacion,
        operador_asignado: embarque.operador_asignado,
        fecha_asignacion: embarque.fecha_asignacion,
        fecha_inicio_transito: embarque.fecha_inicio_transito,
        fecha_finalizacion: embarque.fecha_finalizacion,
      },
    });
  } catch (err) {
    console.error('Error en GET /api/embarques/estado-desacoplado:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// POST: cambiar estado (deshabilitado temporalmente)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { folio, accion, operador, motivo } = body as {
      folio?: string;
      accion?: string;
      operador?: string;
      motivo?: string;
    };

    if (!folio || !accion) {
      return NextResponse.json(
        { error: 'Folio y acción requeridos' },
        { status: 400 },
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { error: 'Variables de entorno de Supabase faltantes' },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 🔒 Mientras las funciones SQL estén deshabilitadas, respondemos 503.
    // Cuando restaures tus RPC, descomenta el switch y elimina el return 503.
    return NextResponse.json(
      {
        error: 'Funcionalidad temporalmente deshabilitada',
        message:
          'Las funciones SQL fueron deshabilitadas. Usa endpoints alternativos o restaura las RPC.',
        accion_solicitada: accion,
        folio,
      },
      { status: 503 },
    );

    /*  >>> DESCOMENTAR CUANDO RESTAURES LAS RPC EN SUPABASE <<<
    let resultado: any;

    switch (accion) {
      case 'completar': {
        const { data, error } = await supabase
          .rpc('completar_embarque', { p_folio: folio });
        if (error) throw error;
        resultado = data;
        break;
      }

      case 'asignar_operador': {
        if (!operador) {
          return NextResponse.json(
            { error: 'Operador requerido para asignación' },
            { status: 400 },
          );
        }
        const { data, error } = await supabase
          .rpc('asignar_operador', { p_folio: folio, p_operador: operador });
        if (error) throw error;
        resultado = data;
        break;
      }

      case 'iniciar_transito': {
        const { data, error } = await supabase
          .rpc('iniciar_transito', { p_folio: folio });
        if (error) throw error;
        resultado = data;
        break;
      }

      case 'finalizar': {
        const { data, error } = await supabase
          .rpc('finalizar_embarque', { p_folio: folio });
        if (error) throw error;
        resultado = data;
        break;
      }

      case 'archivar': {
        const { data, error } = await supabase
          .rpc('archivar_embarque', {
            p_folio: folio,
            p_motivo: motivo || 'Archivado desde interfaz',
          });
        if (error) throw error;
        resultado = data;
        break;
      }

      case 'cancelar': {
        if (!motivo) {
          return NextResponse.json(
            { error: 'Motivo requerido para cancelación' },
            { status: 400 },
          );
        }
        const userId = request.headers.get('user-id'); // o tu auth real
        const { data, error } = await supabase
          .rpc('cancelar_embarque', {
            p_folio: folio,
            p_motivo: motivo,
            p_cancelado_por: userId || null,
          });
        if (error) throw error;
        resultado = data;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${accion}` },
          { status: 400 },
        );
    }

    if (!resultado?.success) {
      return NextResponse.json(
        {
          error: resultado?.error || 'Error en la operación',
          details: resultado,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Embarque ${folio} - ${accion} ejecutado correctamente`,
      data: resultado,
      timestamp: new Date().toISOString(),
    });
    */
  } catch (error: any) {
    console.error('Error en POST /api/embarques/estado-desacoplado:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error?.message || 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
