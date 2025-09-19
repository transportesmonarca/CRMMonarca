import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
  );
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tipos TypeScript para las tablas
export interface Operador {
  id: string;
  nombre: string;
  apellidos: string;
  alias?: string;
  foto_url?: string; // URL pública de la fotografía (fotografia_operador)
  apoyo?: string; // Campo de apoyo (pago o tipo de apoyo al operador)
  telefono?: string;
  email?: string;
  licencia?: string;
  numero_apto_medico?: string;
  fecha_vencimiento_licencia?: string;
  fecha_vencimiento_apto_medico?: string;
  numero_visa?: string;
  fecha_vencimiento_visa?: string;
  numero_fast?: string;
  fecha_vencimiento_fast?: string;
  tipo_sangre?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  telefono_emergencia?: string;
  contactos_emergencia?: string; // JSON con hasta 4 contactos
  documentos?: string; // JSON para documentos
  observaciones?: string; // Campo de observaciones
  estado: string;
  fecha_registro: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rfc?: string;
  estado: string;
  fecha_registro: string;
  updated_at: string;
  // Campos adicionales usados en la UI
  forma_facturacion?: string;
  divisa_pago?: string;
  empresa_facturadora?: string;
  contacto_principal?: string;
}

export interface RepresentanteCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  puesto?: string;
  activo: boolean;
  fecha_creacion: string;
  updated_at: string;
}

export interface ContactoCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  puesto?: string;
  es_principal: boolean;
  activo: boolean;
  fecha_creacion: string;
  updated_at: string;
  // Campo adicional usado en la UI
  notas?: string;
}

export interface TipoServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_base?: number; // Este es el campo para el pago al operador
  es_flete_falso?: boolean;
  pago_operador_flete_falso?: number;
  categoria?: string;
  subcategoria?: string;
  activo: boolean;
  orden_visualizacion?: number;
  fecha_creacion?: string;
  updated_at: string;
}

export interface CreditoCliente {
  id: string;
  cliente_id: string;
  limite_credito_usd: number;
  activo: boolean;
  notas_tipo_cambio?: string;
  fecha_creacion: string;
  updated_at: string;
}

export interface Camion {
  id: string;
  numero_economico: string;
  marca?: string;
  modelo?: string;
  año?: number;
  placas?: string;
  kilometraje: number;
  estado: string;
  fecha_registro: string;
  updated_at: string;
  observaciones?: string;
}

export interface MarcaCamion {
  id: string;
  nombre: string;
  activa: boolean;
  fecha_creacion: string;
  updated_at: string;
}

export interface MarcaRemolque {
  id: string;
  nombre: string;
  activa: boolean;
  fecha_creacion: string;
  updated_at: string;
}

export interface Remolque {
  id: string;
  numero_economico: string;
  tipo?: string;
  // Algunos componentes usan 'tipo_remolque' en lugar de 'tipo'
  tipo_remolque?: string;
  marca?: string;
  modelo?: string;
  año?: number;
  numero_serie?: string;
  capacidad?: number;
  placas?: string;
  fecha_ultima_inspeccion?: string;
  proxima_inspeccion?: string;
  poliza_seguro?: string;
  vigencia_seguro?: string;
  estado: string;
  ubicacion?: string;
  comentarios?: string;
  activo?: boolean;
  fecha_registro: string;
  updated_at: string;
}

export interface Embarque {
  id: string;
  folio: string;
  cliente_id?: string;
  operador_id?: string;
  camion_id?: string;
  remolque_id?: string;
  origen: string;
  destino: string;
  lugar_recolecta?: string;
  fecha_recolecta?: string;
  hora_recolecta?: string;
  contenido?: string;
  peso?: number;
  estado: string;
  fecha_creacion: string;
  // Fecha cuando se archivó el embarque (si aplica)
  fecha_archivado?: string;
  fecha_entrega?: string;
  hora_entrega?: string;
  observaciones?: string;
  updated_at: string;
  // Nuevos campos
  direccion_recolecta?: string;
  direccion_entrega?: string;
  tiempo_entrega?: string;
  tiempo_recolecta?: string;
  load_number?: string;
  patente_agente_aduanal?: string;
  aduana_cruce?: string;
  dueno_mercancia?: string;
  representante_cliente?: string;
  info_representante?: any;
  carta_porte?: string;
  tipo_servicio_id?: string;
  precio_flete?: number;
  // Moneda del flete (el código usa 'moneda_flete')
  moneda_flete?: "MXN" | "USD";
  currency?: "MXN" | "USD";
  // QuickPaid y banderas relacionadas a modificaciones/contingencia
  quickpaid_enabled?: boolean;
  quickpaid_percent?: number;
  quickpaid_descuento?: number;
  precio_quickpaid?: number;
  modificado?: boolean;
  flete_falso?: boolean;
  // Facturación/envíos al cliente y referencias de pago
  fecha_envio_cliente?: string;
  referencia_pago?: string;
  fecha_envio_cliente_1?: string;
  fecha_envio_cliente_2?: string;
  fecha_envio_cliente_3?: string;
  fecha_envio_cliente_4?: string;
  fecha_pago_1?: string;
  fecha_pago_2?: string;
  fecha_pago_3?: string;
  fecha_pago_4?: string;
  referencia_pago_1?: string;
  referencia_pago_2?: string;
  referencia_pago_3?: string;
  referencia_pago_4?: string;
  fecha_finalizacion?: string;
  // Relaciones
  cliente?: Cliente;
  operador?: Operador;
  camion?: Camion;
  remolque?: Remolque;
  remolque_manual?: boolean;
  remolque_numero_economico?: string;
  remolque_placa?: string;
  // Cancelación
  fecha_cancelacion?: string;
  cancelado_por?: string;
  motivo_cancelacion?: string;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha_vencimiento: string;
  tipo?: string;
  prioridad: string;
  estado: string;
  operador_id?: string;
  camion_id?: string;
  fecha_creacion: string;
  updated_at: string;
  // Relaciones
  operador?: Operador;
  camion?: Camion;
}

export interface FotoEmbarque {
  id: string;
  embarque_id: string;
  nombre_archivo: string;
  url_blob: string;
  tamano_bytes?: number;
  tipo_mime?: string;
  fecha_subida: string;
  subido_por?: string;
  // Campos opcionales del uploader nuevo
  latitud?: number;
  longitud?: number;
  comentario?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OperadorPagoContingencia {
  id: string;
  embarque_id: string;
  operador_original_id?: string;
  operador_reemplazo_id?: string;
  monto_original: number;
  monto_reemplazo: number;
  fecha_registro: string;
  registrado_por?: string;
  updated_at: string;
}

export interface OperadorConfirmacionEmbarque {
  id: string;
  embarque_id: string;
  operador_nombre: string;
  fecha_confirmacion: string;
}

// Función para generar folio automático
export const generarFolioAutomatico = async (): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear();

    // Obtener o crear la secuencia para el año actual
    const { data: sequence, error: sequenceError } = await supabase
      .from("folio_sequence")
      .select("last_number")
      .eq("year", currentYear)
      .single();

    if (sequenceError) {
      // Si no existe, crear la secuencia para el año actual
      const { error: insertError } = await supabase
        .from("folio_sequence")
        .insert({ year: currentYear, last_number: 1 });

      if (insertError) {
        console.error("Error creando secuencia:", insertError);
        // Fallback al método anterior
        return generarFolioFallback();
      }

      return `EMB${currentYear}001`;
    }

    // Incrementar el número
    const newNumber = (sequence.last_number || 0) + 1;

    // Actualizar la secuencia
    const { error: updateError } = await supabase
      .from("folio_sequence")
      .update({ last_number: newNumber })
      .eq("year", currentYear);

    if (updateError) {
      console.error("Error actualizando secuencia:", updateError);
      return generarFolioFallback();
    }

    // Formatear el folio con ceros a la izquierda
    const folioNumber = newNumber.toString().padStart(3, "0");
    return `EMB${currentYear}${folioNumber}`;
  } catch (error) {
    console.error("Error generando folio:", error);
    return generarFolioFallback();
  }
};

// Función de respaldo para generar folio
const generarFolioFallback = (): string => {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const dia = fecha.getDate().toString().padStart(2, "0");
  const hora = fecha.getHours().toString().padStart(2, "0");
  const minuto = fecha.getMinutes().toString().padStart(2, "0");
  const segundo = fecha.getSeconds().toString().padStart(2, "0");

  return `EMB${año}${mes}${dia}${hora}${minuto}${segundo}`;
};

// Función para obtener representantes de un cliente
export const obtenerRepresentantesCliente = async (
  clienteId: string
): Promise<RepresentanteCliente[]> => {
  try {
    const { data, error } = await supabase
      .from("representantes_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error("Error obteniendo representantes:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Función para obtener contactos de un cliente
export const obtenerContactosCliente = async (
  clienteId: string
): Promise<ContactoCliente[]> => {
  try {
    const { data, error } = await supabase
      .from("contactos_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("es_principal", { ascending: false })
      .order("nombre");

    if (error) {
      console.error("Error obteniendo contactos:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Función para obtener tipos de servicio activos
export const obtenerTiposServicio = async (): Promise<TipoServicio[]> => {
  try {
    const { data, error } = await supabase
      .from("tipos_servicio")
      .select("*")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      // Si la tabla no existe, devolver array vacío en lugar de error
      if (
        error.message.includes(
          'relation "public.tipos_servicio" does not exist'
        )
      ) {
        console.warn(
          "Tabla tipos_servicio no existe aún. Ejecuta el script SQL correspondiente."
        );
        return [];
      }
      console.error("Error obteniendo tipos de servicio:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Tipos para formas de facturación
export interface FormaFacturacion {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion?: string;
  updated_at?: string;
  activo?: boolean;
}

// Obtener formas de facturación desde la tabla "formas_facturacion"
export const obtenerFormasFacturacion = async (): Promise<FormaFacturacion[]> => {
  try {
    const { data, error } = await supabase
      .from("formas_facturacion")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      // Si la tabla no existe, devolver array vacío en lugar de fallar
      if (error.message && error.message.includes('relation "public.formas_facturacion" does not exist')) {
        console.warn("Tabla formas_facturacion no existe aún. Ejecuta el script SQL correspondiente si quieres persistirlas.");
        return [];
      }
      console.error("Error obteniendo formas de facturación:", error);
      return [];
    }

    return (data as FormaFacturacion[]) || [];
  } catch (error) {
    console.error("Excepción obteniendo formas de facturación:", error);
    return [];
  }
};

// Guardar (upsert) formas de facturación y eliminar las que ya no están
export const guardarFormasFacturacion = async (
  formas: Partial<FormaFacturacion>[]
): Promise<boolean> => {
  try {
    // Upsert de las formas (mantener id si existe)
    const payload = formas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion || null,
      updated_at: new Date().toISOString(),
    }));

    if (payload.length > 0) {
      const { error: upsertError } = await supabase
        .from("formas_facturacion")
        .upsert(payload);

      if (upsertError) {
        console.error("Error al upsertear formas de facturación:", upsertError);
        return false;
      }
    }

    // Borrar las formas que ya no están en la lista (si la tabla existe)
    const { data: existentes, error: existingError } = await supabase
      .from("formas_facturacion")
      .select("id");

    if (existingError) {
      if (existingError.message && existingError.message.includes('relation "public.formas_facturacion" does not exist')) {
        // Tabla no existe; nada que eliminar
        return true;
      }
      console.error("Error obteniendo existentes para limpieza:", existingError);
      return false;
    }

    const existingIds: string[] = (existentes || []).map((r: any) => r.id);
    const incomingIds = formas.map((f) => f.id).filter(Boolean) as string[];
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("formas_facturacion")
        .delete()
        .in("id", toDelete);

      if (deleteError) {
        console.error("Error eliminando formas obsoletas:", deleteError);
        // No devolvemos false necesariamente, pero reportamos
      }
    }

    return true;
  } catch (error) {
    console.error("Excepción guardando formas de facturación:", error);
    return false;
  }
};

// Función para guardar contactos de un cliente
export const guardarContactosCliente = async (
  clienteId: string,
  contactos: any[]
): Promise<boolean> => {
  try {
    // Primero, desactivar todos los contactos existentes
    const { error: updateError } = await supabase
      .from("contactos_clientes")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("cliente_id", clienteId);

    if (updateError) {
      console.error("Error desactivando contactos:", updateError);
      return false;
    }

    // Luego, insertar los nuevos contactos
    // Considerar puesto y notas como datos válidos para insertar
    const contactosParaInsertar = contactos
      .filter(
        (c) =>
          c.nombre.trim() ||
          c.telefono.trim() ||
          c.email.trim() ||
          (c.puesto && c.puesto.trim()) ||
          (c.notas && c.notas.trim())
      )
      .map((contacto, index) => ({
        cliente_id: clienteId,
        nombre: contacto.nombre.trim(),
        telefono: contacto.telefono.trim() || null,
        email: contacto.email.trim() || null,
        puesto: contacto.puesto?.trim() || null,
        notas: contacto.notas?.trim() || null,
        es_principal: index === 0, // El primer contacto es principal
        activo: true,
      }));

    if (contactosParaInsertar.length > 0) {
      const { error: insertError } = await supabase
        .from("contactos_clientes")
        .insert(contactosParaInsertar);

      if (insertError) {
        console.error("Error insertando contactos:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error guardando contactos:", error);
    return false;
  }
};

// Función para crear recordatorios de cumpleaños
export const crearRecordatoriosCumpleanos = async (
  diasAnticipacion = 2
): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc(
      "crear_recordatorios_cumpleanos",
      {
        dias_anticipacion: diasAnticipacion,
      }
    );

    if (error) {
      console.error("Error creando recordatorios de cumpleaños:", error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error("Error:", error);
    return 0;
  }
};

// Función para obtener notificaciones: total de recordatorios pendientes (sin filtrar por fecha)
export const obtenerNotificaciones = async () => {
  try {
    // Contar todos los recordatorios con estado pendiente (incluye vencidos y próximos)
    const { count, error: countError } = await supabase
      .from("recordatorios")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");

    if (countError) {
      // Evitar pasar objetos crudos a console.error en el cliente (Next puede elevarlo a un error no manejado)
    const countErr: any = countError;
    const msg = (countErr && (countErr.message || JSON.stringify(countErr))) || String(countErr);
      console.warn(`Error contando recordatorios: ${msg}`);
      return { recordatorios: [], total: 0 };
    }

    // Opcional: obtener un pequeño listado para vistas futuras (no usado por el header)
    const { data: lista, error: listError } = await supabase
      .from("recordatorios")
      .select("*")
      .eq("estado", "pendiente")
      .order("fecha_vencimiento", { ascending: true })
      .limit(10);

    if (listError) {
      // Si falla la lista, al menos devolvemos el total
  const listErr: any = listError;
  const msg = (listErr && (listErr.message || JSON.stringify(listErr))) || String(listErr);
      console.warn(`Error obteniendo lista de recordatorios: ${msg}`);
      return { recordatorios: [], total: count || 0 };
    }

    // Enriquecer de forma ligera cuando existan relaciones
    const recordatoriosConInfo = await Promise.all(
      (lista || []).map(async (recordatorio) => {
        let operador = null as any;
        let camion = null as any;

        if (recordatorio.operador_id) {
          const { data: operadorData } = await supabase
            .from("operadores")
            .select("id, nombre, apellidos")
            .eq("id", recordatorio.operador_id)
            .single();
          operador = operadorData || null;
        }

        if (recordatorio.camion_id) {
          const { data: camionData } = await supabase
            .from("camiones")
            .select("id, numero_economico")
            .eq("id", recordatorio.camion_id)
            .single();
          camion = camionData || null;
        }

        return { ...recordatorio, operador, camion };
      })
    );

    return { recordatorios: recordatoriosConInfo, total: count || 0 };
  } catch (error) {
  const err: any = error;
  const msg = (err && (err.message || JSON.stringify(err))) || String(err);
    console.warn(`Excepción en obtenerNotificaciones: ${msg}`);
    return { recordatorios: [], total: 0 };
  }
};

// Función para marcar recordatorio como completado
export const completarRecordatorio = async (id: string) => {
  try {
    const { error } = await supabase
      .from("recordatorios")
      .update({
        estado: "completado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error completando recordatorio:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error en completarRecordatorio:", error);
    return false;
  }
};

// Función para obtener estadísticas del dashboard
export const obtenerEstadisticasDashboard = async () => {
  try {
    // Obtener conteos de cada tabla
    const [
      { count: totalCamiones },
      { count: totalOperadores },
      { count: totalClientes },
      { count: recordatoriosPendientes },
    ] = await Promise.all([
      supabase.from("camiones").select("*", { count: "exact", head: true }),
      supabase.from("operadores").select("*", { count: "exact", head: true }),
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase
        .from("recordatorios")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente"),
    ]);

    return {
      totalCamiones: totalCamiones || 0,
      totalOperadores: totalOperadores || 0,
      totalClientes: totalClientes || 0,
      recordatoriosPendientes: recordatoriosPendientes || 0,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return {
      totalCamiones: 0,
      totalOperadores: 0,
      totalClientes: 0,
      recordatoriosPendientes: 0,
    };
  }
};

// Función para obtener embarques
export const obtenerEmbarques = async () => {
  try {
    const { data, error } = await supabase
      .from("embarques")
      .select(
        `
      *,
      cliente:clientes(nombre),
      operador:operadores(nombre, apellidos),
      camion:camiones(numero_economico),
      remolque:remolques(numero_economico)
    `
      )
      .order("fecha_creacion", { ascending: false });

    if (error) {
      console.error("Error obteniendo embarques:", error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error:", error);
    return { data: [], error };
  }
};

// Función para obtener recordatorios
export const obtenerRecordatorios = async () => {
  try {
    const { data, error } = await supabase
      .from("recordatorios")
      .select(
        `
      *,
      operador:operadores(nombre, apellidos),
      camion:camiones(numero_economico)
    `
      )
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      console.error("Error obteniendo recordatorios:", error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error:", error);
    // Mantener la misma forma de retorno en caso de excepción
    return { data: [], error } as any;
  }
};

// Función para obtener operadores
export const obtenerOperadores = async () => {
  try {
    const { data, error } = await supabase
      .from("operadores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error obteniendo operadores:", error);
      return { data: [], error };
    }

    return { data: (data as Operador[]) || [], error: null };
  } catch (error) {
    console.error("Error:", error);
    return { data: [], error } as any;
  }
};

// Función para obtener camiones
export const obtenerCamiones = async () => {
  try {
    const { data, error } = await supabase
      .from("camiones")
      .select("*")
      .order("numero_economico", { ascending: true });

    if (error) {
      console.error("Error obteniendo camiones:", error);
      return { data: [], error };
    }

    return { data: (data as Camion[]) || [], error: null };
  } catch (error) {
    console.error("Error:", error);
    return { data: [], error } as any;
  }
};

// Función para obtener remolques
export const obtenerRemolques = async () => {
  try {
    const { data, error } = await supabase
      .from("remolques")
      .select("*")
      .order("numero_economico", { ascending: true });

    if (error) {
      console.error("Error obteniendo remolques:", error);
      return { data: [], error };
    }

    return { data: (data as Remolque[]) || [], error: null };
  } catch (error) {
    console.error("Error:", error);
    return { data: [], error } as any;
  }
};

// Función para obtener IDs de embarques modificados
export const obtenerEmbarquesModificadosIds = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("embarque_modificaciones")
      .select("embarque_id");

    if (error) {
      console.error("Error al obtener IDs de embarques modificados:", error);
      return [];
    }

    // Extraer y devolver IDs únicos
    const ids = data.map((row) => row.embarque_id);
    return Array.from(new Set(ids));
  } catch (error) {
    console.error("Excepción al obtener IDs de embarques modificados:", error);
    return [];
  }
};

// Nuevas funciones para fotos de embarques
export const obtenerFotosEmbarque = async (
  embarqueId: string
): Promise<FotoEmbarque[]> => {
  try {
    console.log("Obteniendo fotos para embarque:", embarqueId);

    const { data, error } = await supabase
      .from("fotos_embarques")
      .select("*")
      .eq("embarque_id", embarqueId)
      .order("fecha_subida", { ascending: false });

    if (error) {
      console.error("Error obteniendo fotos del embarque:", error);
      return [];
    }

    console.log("Fotos encontradas:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("Excepción al obtener fotos del embarque:", error);
    return [];
  }
};

export const guardarFotoEmbarque = async (
  foto: Omit<FotoEmbarque, "id" | "created_at" | "updated_at" | "fecha_subida">
): Promise<FotoEmbarque | null> => {
  try {
    console.log("📦 Enviando metadata a Supabase:", foto);

    // Construir payload usando nombres EXACTOS de columnas en la BD.
    // Nota: la columna en BD es "tamaño_bytes" (con ñ), por lo que mapeamos desde foto.tamano_bytes.
    const payload: any = {
      embarque_id: (foto as any).embarque_id,
      nombre_archivo: (foto as any).nombre_archivo,
      url_blob: (foto as any).url_blob,
      tipo_mime: (foto as any).tipo_mime ?? null,
      subido_por: (foto as any).subido_por ?? null,
      fecha_subida: new Date().toISOString(),
    };

    if (typeof (foto as any).tamano_bytes === "number") {
      payload["tamaño_bytes"] = (foto as any).tamano_bytes;
    }
    if (typeof (foto as any).latitud === "number") {
      payload.latitud = (foto as any).latitud;
    }
    if (typeof (foto as any).longitud === "number") {
      payload.longitud = (foto as any).longitud;
    }
    if (typeof (foto as any).comentario === "string") {
      payload.comentario = (foto as any).comentario;
    }

    const { data, error } = await supabase
      .from("fotos_embarques")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("❌ Error al guardar metadata:", error);
      return null;
    }

    console.log("✅ Metadata guardada:", data);
    return data;
  } catch (error) {
    console.error("❌ Excepción en guardarFotoEmbarque:", error);
    return null;
  }
};

export const guardarConfirmacionOperador = async (
  embarqueId: string,
  operadorNombre: string
): Promise<boolean> => {
  try {
    console.log("Guardando confirmación operador:", {
      embarqueId,
      operadorNombre,
    });

    const { error } = await supabase
      .from("operador_confirmaciones_embarque")
      .insert({
        embarque_id: embarqueId,
        operador_nombre: operadorNombre,
        fecha_confirmacion: new Date().toISOString(),
      });

    if (error) {
      console.error("Error guardando confirmación:", error);
      return false;
    }

    console.log("Confirmación guardada exitosamente");
    return true;
  } catch (error) {
    console.error("Excepción al guardar confirmación:", error);
    return false;
  }
};

export const obtenerConfirmacionOperador = async (
  embarqueId: string
): Promise<OperadorConfirmacionEmbarque | null> => {
  try {
    console.log("Obteniendo confirmación para embarque:", embarqueId);

    const { data, error } = await supabase
      .from("operador_confirmaciones_embarque")
      .select("*")
      .eq("embarque_id", embarqueId)
      .order("fecha_confirmacion", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // Ignorar el error "No rows found" que es esperado si no hay confirmación
        console.error("Error obteniendo confirmación:", error);
      }
      return null;
    }

    console.log("Confirmación encontrada:", data);
    return data;
  } catch (error) {
    console.error("Excepción al obtener confirmación:", error);
    return null;
  }
};

// Función para buscar embarque por folio
export const buscarEmbarquePorFolio = async (
  folio: string
): Promise<Embarque | null> => {
  try {
    console.log("Buscando embarque por folio:", folio);

    const { data, error } = await supabase
      .from("embarques")
      .select(
        `
        *,
        cliente:clientes(nombre),
        operador:operadores(nombre, apellidos),
        remolque:remolques(numero_economico, placas)
      `
      )
      .eq("folio", folio)
      .single();

    if (error) {
      console.error("Error buscando embarque por folio:", error);
      return null;
    }

    console.log("Embarque encontrado:", data);
    return data;
  } catch (error) {
    console.error("Excepción al buscar embarque por folio:", error);
    return null;
  }
};

// Función para corregir fotos huérfanas
export const corregirFotosHuerfanas = async (
  folio: string
): Promise<boolean> => {
  try {
    console.log("Corrigiendo fotos huérfanas para folio:", folio);

    // Primero buscar el embarque
    const embarque = await buscarEmbarquePorFolio(folio);
    if (!embarque) {
      console.error("No se encontró embarque con folio:", folio);
      return false;
    }

    // Buscar fotos que contengan el folio en el nombre o URL
    const { data: fotosHuerfanas, error: errorFotos } = await supabase
      .from("fotos_embarques")
      .select("*")
      .or(`nombre_archivo.ilike.%${folio}%,url_blob.ilike.%${folio}%`);

    if (errorFotos) {
      console.error("Error buscando fotos huérfanas:", errorFotos);
      return false;
    }

    if (!fotosHuerfanas || fotosHuerfanas.length === 0) {
      console.log("No se encontraron fotos huérfanas para el folio:", folio);
      return true;
    }

    console.log("Fotos huérfanas encontradas:", fotosHuerfanas.length);

    // Actualizar las fotos huérfanas con el ID correcto del embarque
    const { error: errorUpdate } = await supabase
      .from("fotos_embarques")
      .update({ embarque_id: embarque.id })
      .or(`nombre_archivo.ilike.%${folio}%,url_blob.ilike.%${folio}%`);

    if (errorUpdate) {
      console.error("Error actualizando fotos huérfanas:", errorUpdate);
      return false;
    }

    console.log("Fotos huérfanas corregidas exitosamente");
    return true;
  } catch (error) {
    console.error("Excepción al corregir fotos huérfanas:", error);
    return false;
  }
};
