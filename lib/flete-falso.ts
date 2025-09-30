/**
 * FUNCIÓN PARA EL FRONTEND: Activar/Desactivar Flete Falso
 * Arquitectura Desacoplada - Actualiza solo columnas independientes
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface FleteFlalsoResult {
  success: boolean;
  message: string;
  embarque?: {
    folio: string;
    flete_falso: boolean;
    tipo_servicio_nombre: string;
    precio_operador_final: number;
  };
}

/**
 * Activa o desactiva el flete falso para un embarque específico
 * ARQUITECTURA DESACOPLADA: Solo actualiza columnas independientes
 * 
 * @param embarqueId - ID del embarque
 * @param esFletefalso - true para activar, false para desactivar
 * @param precioFletefalso - Precio cuando se activa (opcional, default 666)
 * @returns Resultado de la operación
 */
export async function actualizarFletefalso(
  embarqueId: string,
  esFletefalso: boolean,
  precioFletefalso: number = 666
): Promise<FleteFlalsoResult> {
  try {
    // 1. Obtener datos actuales del embarque
    const { data: embarqueActual, error: errorConsulta } = await supabase
      .from('embarques_completa')
      .select('folio, flete_falso, tipo_servicio_nombre, precio_operador_final, tipo_servicio_precio')
      .eq('id', embarqueId)
      .single();
    
    if (errorConsulta || !embarqueActual) {
      return {
        success: false,
        message: 'No se encontró el embarque especificado'
      };
    }

    // 2. Preparar valores para actualización (ARQUITECTURA DESACOPLADA)
    let nuevosValores: any = {
      flete_falso: esFletefalso,
      updated_at: new Date().toISOString()
    };

    if (esFletefalso) {
      // ACTIVAR: Usar valores de flete falso
      nuevosValores.tipo_servicio_nombre = 'Flete en Falso';
      nuevosValores.precio_operador_final = precioFletefalso;
    } else {
      // DESACTIVAR: Necesitamos restaurar valores originales
      
      // Intentar obtener el nombre original desde la tabla tipos_servicios
      const { data: embarqueConTipo } = await supabase
        .from('embarques_nuevo')
        .select(`
          tipo_servicio_id,
          tipos_servicios!inner (
            nombre,
            precio_operador
          )
        `)
        .eq('id', embarqueId)
        .single();
      
      if (embarqueConTipo?.tipos_servicios) {
        // Usar datos de la tabla maestra para restaurar (cast para evitar problemas de tipos)
        const tipoServicio = embarqueConTipo.tipos_servicios as any;
        nuevosValores.tipo_servicio_nombre = tipoServicio.nombre;
        
        // Para el precio, usar el precio guardado en tipo_servicio_precio como respaldo
        // o el precio de la tabla maestra
        nuevosValores.precio_operador_final = 
          embarqueActual.tipo_servicio_precio || 
          tipoServicio.precio_operador || 
          0;
      } else {
        // Si no se encuentra la relación, mantener lo que había antes
        // (esto no debería pasar si los datos están bien estructurados)
        return {
          success: false,
          message: 'No se pudo restaurar el tipo de servicio original'
        };
      }
    }

    // 3. Actualizar en embarques_financiero (SOLO COLUMNAS DESACOPLADAS)
    const { error: errorActualizacion } = await supabase
      .from('embarques_financiero')
      .update(nuevosValores)
      .eq('embarque_id', embarqueId);
    
    if (errorActualizacion) {
      return {
        success: false,
        message: `Error actualizando embarque: ${errorActualizacion.message}`
      };
    }

    // 4. Obtener estado final para confirmación
    const { data: embarqueActualizado, error: errorFinal } = await supabase
      .from('embarques_completa')
      .select('folio, flete_falso, tipo_servicio_nombre, precio_operador_final')
      .eq('id', embarqueId)
      .single();
    
    if (errorFinal || !embarqueActualizado) {
      return {
        success: false,
        message: 'Error verificando la actualización'
      };
    }

    // 5. Resultado exitoso
    return {
      success: true,
      message: esFletefalso 
        ? `Flete falso activado para ${embarqueActualizado.folio} con precio $${precioFletefalso}`
        : `Flete falso desactivado para ${embarqueActualizado.folio}`,
      embarque: embarqueActualizado
    };

  } catch (error) {
    console.error('Error en actualizarFletefalso:', error);
    return {
      success: false,
      message: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
}

/**
 * Hook para usar en componentes React
 * Ejemplo de uso:
 * 
 * const { actualizarFlete, loading } = useFletefalso();
 * 
 * const handleToggleFlete = async () => {
 *   const resultado = await actualizarFlete(embarqueId, !fletefalso, 777);
 *   if (resultado.success) {
 *     // Actualizar estado local
 *     setEmbarque(resultado.embarque);
 *   } else {
 *     // Mostrar error
 *     alert(resultado.message);
 *   }
 * };
 */
export function useFletefalso() {
  const [loading, setLoading] = useState(false);

  const actualizarFlete = async (
    embarqueId: string,
    esFletefalso: boolean,
    precio?: number
  ): Promise<FleteFlalsoResult> => {
    setLoading(true);
    try {
      const resultado = await actualizarFletefalso(embarqueId, esFletefalso, precio);
      return resultado;
    } finally {
      setLoading(false);
    }
  };

  return {
    actualizarFlete,
    loading
  };
}