import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// API para asignar números de operador a operadores existentes
// Nota: Las funciones SQL y triggers deben ejecutarse manualmente en Supabase
export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    console.log('🚀 Iniciando asignación de números de operador...')

    // Paso 1: Obtener operadores sin número
    console.log('📝 Paso 1: Obteniendo operadores sin número...')
    const { data: operadoresSinNumero, error: selectError } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, fecha_registro')
      .or('operator_number.is.null,operator_number.eq.')
      .order('fecha_registro', { ascending: true })

    if (selectError) {
      console.error('Error obteniendo operadores sin número:', selectError)
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo operadores existentes',
        details: selectError.message
      }, { status: 500 })
    }

    let numerosAsignados = 0
    const operadoresActualizados = []

    if (operadoresSinNumero && operadoresSinNumero.length > 0) {
      console.log(`📝 Paso 2: Asignando números a ${operadoresSinNumero.length} operadores...`)
      
      // Obtener el próximo número disponible
      let siguienteNumero = 1
      const { data: maxNumeroData } = await supabase
        .from('operadores')
        .select('operator_number')
        .not('operator_number', 'is', null)
        .neq('operator_number', '')
        .order('operator_number', { ascending: false })
        .limit(1)

      if (maxNumeroData && maxNumeroData.length > 0) {
        const ultimoNumero = maxNumeroData[0].operator_number
        const match = ultimoNumero?.match(/^OP-(\d+)$/)
        if (match) {
          siguienteNumero = parseInt(match[1]) + 1
        }
      }

      console.log(`📝 Comenzando numeración desde: OP-${siguienteNumero.toString().padStart(4, '0')}`)

      // Asignar números secuencialmente
      for (const operador of operadoresSinNumero) {
        const nuevoNumero = `OP-${siguienteNumero.toString().padStart(4, '0')}`
        
        const { error: updateError } = await supabase
          .from('operadores')
          .update({ 
            operator_number: nuevoNumero,
            updated_at: new Date().toISOString()
          })
          .eq('id', operador.id)

        if (!updateError) {
          numerosAsignados++
          operadoresActualizados.push({
            id: operador.id,
            nombre: `${operador.nombre} ${operador.apellidos}`,
            numero: nuevoNumero
          })
          siguienteNumero++
          console.log(`✅ Asignado ${nuevoNumero} a ${operador.nombre} ${operador.apellidos}`)
        } else {
          console.error(`❌ Error asignando número a operador ${operador.id}:`, updateError)
        }
      }
    } else {
      console.log('📝 No hay operadores sin número para procesar')
    }

    // Paso 3: Verificar implementación
    console.log('📝 Paso 3: Verificando implementación...')
    const { data: verificacion } = await supabase
      .from('operadores')
      .select('id, operator_number, nombre, apellidos')

    const totalOperadores = verificacion?.length || 0
    const operadoresConNumero = verificacion?.filter(op => op.operator_number && op.operator_number.trim()).length || 0
    const operadoresSinNumeroFinal = totalOperadores - operadoresConNumero

    console.log('✅ Implementación completada:', {
      totalOperadores,
      operadoresConNumero,
      operadoresSinNumeroFinal,
      numerosAsignados
    })

    return NextResponse.json({
      success: true,
      message: 'Números de operador asignados exitosamente',
      estadisticas: {
        totalOperadores,
        operadoresConNumero,
        operadoresSinNumeroFinal,
        numerosAsignados,
        operadoresActualizados: operadoresActualizados.slice(0, 15) // Primeros 15 para revisión
      },
      instrucciones: {
        paso1: 'Los números fueron asignados a operadores existentes',
        paso2: 'Para nuevos operadores, ejecuta manualmente el script SQL: scripts/add-operator-number-trigger.sql',
        paso3: 'Esto creará las funciones y triggers necesarios para asignación automática'
      }
    })

  } catch (error) {
    console.error('Error asignando números de operador:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}