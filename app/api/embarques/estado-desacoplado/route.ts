import { createClient } from '@supabase/supabase-js'import { createClient } from '@supabase/supabase-js'import { createClient } from '@supabase/supabase-js'

import { NextResponse } from 'next/server'

import { NextResponse } from 'next/server'import { NextResponse } from 'next/server'

// API Route para manejar transiciones de estado en arquitectura desacoplada

// GET: obtener estado actual, POST: cambiar estado



export async function GET(request: Request) {// API Route para manejar transiciones de estado en arquitectura desacoplada// API Route para manejar transiciones de estado en arquitectura desacoplada

  const { searchParams } = new URL(request.url)

  const folio = searchParams.get('folio')// GET: obtener estado actual, POST: cambiar estado// GET: obtener estado actual, POST: cambiar estado

  

  if (!folio) {

    return NextResponse.json({ error: 'Folio requerido' }, { status: 400 })

  }export async function GET(request: Request) {export async function GET(request: Request) {



  const supabase = createClient(  const { searchParams } = new URL(request.url)  const { searchParams } = new URL(request.url)

    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.SUPABASE_SERVICE_ROLE!  const folio = searchParams.get('folio')  const folio = searchParams.get('folio')

  )

    

  try {

    // Buscar en la tabla embarques  if (!folio) {  if (!folio) {

    const { data: embarque, error } = await supabase

      .from('embarques')    return NextResponse.json({ error: 'Folio requerido' }, { status: 400 })    return NextResponse.json({ error: 'Folio requerido' }, { status: 400 })

      .select('*')

      .eq('folio', folio)  }  }

      .single()



    if (error || !embarque) {

      return NextResponse.json({   const supabase = createClient(  const supabase = createClient(

        error: 'Embarque no encontrado',

        details: error?.message     process.env.NEXT_PUBLIC_SUPABASE_URL!,    process.env.NEXT_PUBLIC_SUPABASE_URL!,

      }, { status: 404 })

    }    process.env.SUPABASE_SERVICE_ROLE!    process.env.SUPABASE_SERVICE_ROLE!



    return NextResponse.json({  )  )

      success: true,

      embarque: {

        folio: embarque.folio,

        estado: embarque.estado,  try {  try {

        estado_facturacion: embarque.estado_facturacion,

        operador_asignado: embarque.operador_asignado,    // Buscar en la tabla embarques    // Buscar en la vista unificada para obtener estado actual

        fecha_asignacion: embarque.fecha_asignacion,

        fecha_inicio_transito: embarque.fecha_inicio_transito,    const { data: embarque, error } = await supabase    const { data: embarque, error } = await supabase

        fecha_finalizacion: embarque.fecha_finalizacion

      }      .from('embarques')      .from('embarques')

    })

      .select('*')      .select('*')

  } catch (error) {

    console.error('Error en GET /api/embarques/estado-desacoplado:', error)      .eq('folio', folio)      .eq('folio', folio)

    return NextResponse.json({ 

      error: 'Error interno del servidor'       .single()      .single()

    }, { status: 500 })

  }

}

    if (error || !embarque) {    if (error || !embarque) {

export async function POST(request: Request) {

  try {      return NextResponse.json({       return NextResponse.json({ 

    const body = await request.json()

    const { folio, accion, operador, motivo } = body        error: 'Embarque no encontrado',        error: 'Embarque no encontrado',



    if (!folio || !accion) {        details: error?.message         details: error?.message 

      return NextResponse.json({ 

        error: 'Folio y acción requeridos'       }, { status: 404 })      }, { status: 404 })

      }, { status: 400 })

    }    }    }



    const supabase = createClient(

      process.env.NEXT_PUBLIC_SUPABASE_URL!,

      process.env.SUPABASE_SERVICE_ROLE!    return NextResponse.json({    return NextResponse.json({

    )

      success: true,      success: true,

    // Por ahora, solo retornamos que la funcionalidad está deshabilitada

    // hasta que se restauren las funciones SQL necesarias      embarque: {      embarque: {

    

    return NextResponse.json({         folio: embarque.folio,        folio: embarque.folio,

      error: 'Funcionalidad temporalmente deshabilitada',

      message: 'Las funciones SQL fueron deshabilitadas. Usar endpoints alternativos.',        estado: embarque.estado,        estado: embarque.estado,

      accion_solicitada: accion,

      folio: folio        estado_facturacion: embarque.estado_facturacion,        estado_facturacion: embarque.estado_facturacion,

    }, { status: 503 })

        operador_asignado: embarque.operador_asignado,        tabla_origen: embarque.tabla_origen,

  } catch (error: any) {

    console.error('Error en POST /api/embarques/estado-desacoplado:', error)        fecha_asignacion: embarque.fecha_asignacion,        operador_asignado: embarque.operador_asignado,

    

    return NextResponse.json({         fecha_inicio_transito: embarque.fecha_inicio_transito,        fecha_asignacion: embarque.fecha_asignacion,

      error: 'Error interno del servidor',

      details: error.message || 'Error desconocido',        fecha_finalizacion: embarque.fecha_finalizacion        fecha_inicio_transito: embarque.fecha_inicio_transito,

      timestamp: new Date().toISOString()

    }, { status: 500 })      }        fecha_finalizacion: embarque.fecha_finalizacion

  }

}    })      }

    })

  } catch (error) {

    console.error('Error en GET /api/embarques/estado-desacoplado:', error)  } catch (error) {

    return NextResponse.json({     console.error('Error en GET /api/embarques/estado-desacoplado:', error)

      error: 'Error interno del servidor'     return NextResponse.json({ 

    }, { status: 500 })      error: 'Error interno del servidor' 

  }    }, { status: 500 })

}  }

}

export async function POST(request: Request) {

  try {export async function POST(request: Request) {

    const body = await request.json()  try {

    const { folio, accion, operador, motivo } = body    const body = await request.json()

    const { folio, accion, operador, motivo } = body

    if (!folio || !accion) {

      return NextResponse.json({     if (!folio || !accion) {

        error: 'Folio y acción requeridos'       return NextResponse.json({ 

      }, { status: 400 })        error: 'Folio y acción requeridos' 

    }      }, { status: 400 })

    }

    const supabase = createClient(

      process.env.NEXT_PUBLIC_SUPABASE_URL!,    const supabase = createClient(

      process.env.SUPABASE_SERVICE_ROLE!      process.env.NEXT_PUBLIC_SUPABASE_URL!,

    )      process.env.SUPABASE_SERVICE_ROLE!

    )

    // Por ahora, solo retornamos que la funcionalidad está deshabilitada

    // hasta que se restauren las funciones SQL necesarias    let resultado: any

    

    return NextResponse.json({     // Ejecutar la acción correspondiente usando las funciones SQL

      error: 'Funcionalidad temporalmente deshabilitada',    switch (accion) {

      message: 'Las funciones SQL fueron deshabilitadas. Usar endpoints alternativos.',      case 'completar':

      accion_solicitada: accion,        // creado -> asignado

      folio: folio        const { data: completarData, error: completarError } = await supabase

    }, { status: 503 })          // .rpc( // FUNCIÓN ELIMINADA:'completar_embarque', { p_folio: folio })

        

  } catch (error: any) {        if (completarError) {

    console.error('Error en POST /api/embarques/estado-desacoplado:', error)          throw completarError

            }

    return NextResponse.json({         resultado = completarData

      error: 'Error interno del servidor',        break

      details: error.message || 'Error desconocido',

      timestamp: new Date().toISOString()      case 'asignar_operador':

    }, { status: 500 })        if (!operador) {

  }          return NextResponse.json({ 

}            error: 'Operador requerido para asignación' 
          }, { status: 400 })
        }
        
        // FUNCIÓN ELIMINADA: asignar_operador
        // const { data: asignarData, error: asignarError } = await supabase
        //   .rpc('asignar_operador', { 
        //     p_folio: folio, 
        //     p_operador: operador 
        //   })
        
        // Implementación temporal mientras se restaura la función
        const asignarData = null
        const asignarError = new Error("Función asignar_operador no disponible")
        
        if (asignarError) {
          throw asignarError
        }
        resultado = asignarData
        break

      case 'iniciar_transito':
        // asignado -> en_transito
        const { data: transitoData, error: transitoError } = await supabase
          // .rpc( // FUNCIÓN ELIMINADA:'iniciar_transito', { p_folio: folio })
        
        if (transitoError) {
          throw transitoError
        }
        resultado = transitoData
        break

      case 'finalizar':
        // en_transito -> finalizado
        const { data: finalizarData, error: finalizarError } = await supabase
          // .rpc( // FUNCIÓN ELIMINADA:'finalizar_embarque', { p_folio: folio })
        
        if (finalizarError) {
          throw finalizarError
        }
        resultado = finalizarData
        break

      case 'archivar':
        // finalizado -> archivado
        const { data: archivarData, error: archivarError } = await supabase
          // .rpc( // FUNCIÓN ELIMINADA:'archivar_embarque', { 
            p_folio: folio, 
            p_motivo: motivo || 'Archivado desde interfaz'
          })
        
        if (archivarError) {
          throw archivarError
        }
        resultado = archivarData
        break

      case 'cancelar':
        // cualquier_estado -> cancelado
        if (!motivo) {
          return NextResponse.json({ 
            error: 'Motivo requerido para cancelación' 
          }, { status: 400 })
        }
        
        // Obtener usuario actual para auditoría (simplificado)
        // En producción, implementar autenticación adecuada
        const userId = request.headers.get('user-id') // Ejemplo
        
        const { data: cancelarData, error: cancelarError } = await supabase
          // .rpc( // FUNCIÓN ELIMINADA:'cancelar_embarque', { 
            p_folio: folio, 
            p_motivo: motivo,
            p_cancelado_por: userId || null
          })
        
        if (cancelarError) {
          throw cancelarError
        }
        resultado = cancelarData
        break

      default:
        return NextResponse.json({ 
          error: `Acción no válida: ${accion}` 
        }, { status: 400 })
    }

    // Verificar si la función retornó error
    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error || 'Error en la operación',
        details: resultado 
      }, { status: 400 })
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: `Embarque ${folio} - ${accion} ejecutado correctamente`,
      data: resultado,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error en POST /api/embarques/estado-desacoplado:', error)
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}