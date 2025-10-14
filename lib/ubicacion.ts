import { supabase } from './supabase';

export interface UbicacionOperador {
  operator_number: string; // Número único del operador (OP001, OP002, etc.)
  latitude: number;
  longitude: number;
  captured_at: string;
  device_id?: string;
}

export interface UbicacionConOperador extends UbicacionOperador {
  operador?: {
    id: string;
    nombre: string;
    apellidos: string;
    operator_number?: string;
    telefono?: string;
  };
}

/**
 * Obtiene la última ubicación de un operador específico
 * Busca tanto por operator_id (UUID) como por operator_number (OP001, OP002, etc.)
 */
export async function obtenerUltimaUbicacionOperador(operatorNumber: string): Promise<UbicacionConOperador | null> {
  try {
    console.log('[UBICACION] 🔍 Consultando última ubicación para operador:', operatorNumber);
    
    // Primero, obtener el operador para tener su UUID
    const { data: operador, error: errorOperador } = await supabase
      .from('operadores')
      .select('id, nombre, apellidos, operator_number, telefono')
      .eq('operator_number', operatorNumber)
      .single();

    if (errorOperador) {
      console.error('[UBICACION] ❌ Error obteniendo operador:', errorOperador);
      throw new Error(`Error consultando operador: ${errorOperador.message}`);
    }

    if (!operador) {
      console.log('[UBICACION] ⚠️  No se encontró operador con número:', operatorNumber);
      return null;
    }

    console.log('[UBICACION] ✅ Operador encontrado:', operador.nombre, operador.apellidos);
    console.log('[UBICACION] 🔑 UUID del operador:', operador.id);

    // Buscar ubicación por operator_id (UUID) - método principal
    console.log('[UBICACION] 🔍 Buscando por operator_id (UUID)...');
    let { data: ubicacion, error } = await supabase
      .from('locations')
      .select('*')
      .eq('operator_id', operador.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Si no encuentra por UUID, buscar por operator_number en la columna correcta
    if (!ubicacion && !error) {
      console.log('[UBICACION] ⚠️  No encontrado por UUID, buscando por operator_number...');
      const result = await supabase
        .from('locations')
        .select('*')
        .eq('operator_number', operatorNumber)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      ubicacion = result.data;
      error = result.error;
    }

    // Si aún no encuentra, buscar en la columna operator_id por el operator_number 
    // (por si la app móvil lo envía mal)
    if (!ubicacion && !error) {
      console.log('[UBICACION] ⚠️  Buscando en operator_id por el número (fallback)...');
      const result = await supabase
        .from('locations')
        .select('*')
        .eq('operator_id', operatorNumber)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      ubicacion = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[UBICACION] ❌ Error consultando ubicación:', error);
      throw new Error(`Error consultando ubicación: ${error.message}`);
    }

    if (!ubicacion) {
      console.log('[UBICACION] ⚠️  No se encontró ubicación para el operador:', operatorNumber);
      return null;
    }

    const ubicacionCompleta: UbicacionConOperador = {
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude,
      captured_at: ubicacion.captured_at,
      device_id: ubicacion.device_id,
      operator_number: operatorNumber,
      operador: operador
    };

    console.log('[UBICACION] ✅ Ubicación encontrada!');
    console.log('[UBICACION] 📍 Coordenadas:', ubicacionCompleta.latitude, ubicacionCompleta.longitude);
    console.log('[UBICACION] 🕐 Capturada:', ubicacionCompleta.captured_at);
    
    return ubicacionCompleta;

  } catch (error) {
    console.error('[UBICACION] ❌ Error en obtenerUltimaUbicacionOperador:', error);
    throw error;
  }
}

/**
 * Formatea el timestamp de captura de ubicación
 */
export function formatearTiempoCaptura(captured_at: string): string {
  try {
    const fecha = new Date(captured_at);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 1) {
      return 'Hace menos de 1 minuto';
    } else if (minutos < 60) {
      return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    } else if (horas < 24) {
      return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    } else if (dias < 7) {
      return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    } else {
      return fecha.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('[UBICACION] Error formateando tiempo:', error);
    return 'Fecha no disponible';
  }
}

/**
 * Valida si las coordenadas son válidas
 */
export function validarCoordenadas(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' && 
    typeof longitude === 'number' &&
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180 &&
    !isNaN(latitude) && 
    !isNaN(longitude)
  );
}