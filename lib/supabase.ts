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

// Cliente Supabase con service role para operaciones administrativas (solo servidor)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin solo debe usarse en el servidor');
  }
  
  if (!supabaseAdmin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE no está configurada');
    }
    
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
  }
  
  return supabaseAdmin;
}

// Tipos TypeScript para las tablas
export interface Operador {
  id: string;
  operator_number?: string; // Número consecutivo único del operador (OP-0001)
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

// ❌ RepresentanteCliente eliminado - usar ContactoCliente como única interfaz

export interface ContactoCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  puesto?: string;
  es_principal: boolean;
  activo: boolean;
  fecha_creacion: string;
  updated_at: string;
  notas?: string;
  tipo_contacto?: 'contacto' | 'representante' | 'principal'; // Nuevo campo para diferenciar tipos
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

export interface VerificacionCamion {
  id?: string;
  camion_id: string;
  fecha_verificacion: string;
  fecha_vencimiento?: string;
  tipo_verificacion: string;
  lugar_verificacion?: string;
  numero_certificado?: string;
  resultado: string;
  observaciones?: string;
  recordatorio_enviado?: boolean;
  activo?: boolean;
  creado_por?: string;
  created_at?: string;
  updated_at?: string;
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

export interface DocumentoRemolque {
  id: string;
  remolque_id: string;
  tipo_documento: string;
  numero_documento?: string;
  nombre_archivo: string;
  url_blob: string;
  pathname: string;
  tamano_bytes?: number;
  tipo_mime?: string;
  fecha_vencimiento?: string;
  notas?: string;
  activo: boolean;
  subido_por?: string;
  created_at: string;
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
  // Pagos al operador
  pago_operador?: number;
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
  // Nuevos campos JSON para facturación consolidada
  facturas_json?: FacturaData[];
  envios_cliente_json?: any[]; // deprecated
  pagos_cliente_json?: any[];  // deprecated
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

export interface FacturaData {
  numero: string;
  fecha_envio?: string | null;
  fecha_pago?: string | null;
  referencia?: string | null;
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

// 🎯 FUNCIONES PARA TIPOS DE CONTACTOS

// Obtener contactos por tipo específico
export const obtenerContactosPorTipo = async (
  clienteId: string,
  tipo: 'contacto' | 'representante' | 'principal'
): Promise<ContactoCliente[]> => {
  try {
    const { data, error } = await supabase
      .from("contactos_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("tipo_contacto", tipo)
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error(`Error obteniendo ${tipo}s:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error en obtenerContactosPorTipo(${tipo}):`, error);
    return [];
  }
};

// Obtener solo representantes de un cliente
export const obtenerRepresentantesCliente = async (
  clienteId: string
): Promise<ContactoCliente[]> => {
  return obtenerContactosPorTipo(clienteId, 'representante');
};

// Obtener contacto principal de un cliente
export const obtenerContactoPrincipal = async (
  clienteId: string
): Promise<ContactoCliente | null> => {
  const contactos = await obtenerContactosPorTipo(clienteId, 'principal');
  return contactos.length > 0 ? contactos[0] : null;
};

// Función para obtener contactos de un cliente
// Función simplificada para obtener contactos SOLO de tabla contactos_clientes
export const obtenerContactosClienteTabla = async (
  clienteId: string,
  reintentos: number = 3
): Promise<ContactoCliente[]> => {
  try {
    console.log("📋 [TABLA] Obteniendo contactos para cliente:", clienteId);
    
    if (!clienteId || clienteId.trim() === '') {
      console.error("❌ Cliente ID no válido:", clienteId);
      return [];
    }

    // Verificar que supabase esté disponible
    if (!supabase) {
      console.error("❌ Cliente Supabase no está disponible");
      return [];
    }
    
    const { data, error } = await supabase
      .from("contactos_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("tipo_contacto", { ascending: true }) // principal -> representante -> contacto
      .order("es_principal", { ascending: false })
      .order("nombre");

    if (error) {
      console.error("❌ Error obteniendo contactos:", error.message);
      return [];
    }

    console.log(`✅ [TABLA] ${data?.length || 0} contactos obtenidos`);
    return data || [];
  } catch (error: any) {
    console.error("💥 [TABLA] Error:", error);
    
    // Si es un error de red y tenemos reintentos disponibles, intentar de nuevo
    if (error?.message?.includes('Failed to fetch') && reintentos > 0) {
      console.log(`🔄 Reintentando... (${reintentos} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      return obtenerContactosClienteTabla(clienteId, reintentos - 1);
    }
    
    return [];
  }
};

export const obtenerContactosCliente = async (
  clienteId: string,
  reintentos: number = 3
): Promise<ContactoCliente[]> => {
  try {
    console.log("📋 Obteniendo contactos para cliente:", clienteId);
    
    // Validar que el clienteId sea válido
    if (!clienteId || clienteId.trim() === '') {
      console.error("❌ Cliente ID no válido:", clienteId);
      return [];
    }

    // Verificar que supabase esté disponible
    if (!supabase) {
      console.error("❌ Cliente Supabase no está disponible");
      return [];
    }
    
    // Primero intentar con JSON
    try {
      console.log("🔄 Intentando obtener desde campo JSON...");
      const { data: clienteData, error } = await supabase
        .from("clientes")
        .select("contactos_json")
        .eq("id", clienteId)
        .single();
        
      if (!error && clienteData?.contactos_json && Array.isArray(clienteData.contactos_json)) {
        console.log("✅ Contactos obtenidos desde JSON");
        const contactos = clienteData.contactos_json.map((c: any, index: number) => ({
          id: c.id || `json-${Date.now()}-${index}`,
          cliente_id: clienteId,
          nombre: c.nombre || "",
          apellidos: c.apellidos || "",
          telefono: c.telefono || "",
          email: c.email || "",
          puesto: c.puesto || "",
          es_principal: Boolean(c.es_principal),
          activo: true,
          fecha_creacion: c.fecha_creacion || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString(),
          notas: c.notas || ""
        }));
        
        console.log(`� Procesados ${contactos.length} contactos desde JSON`);
        return contactos;
      }
      
      if (error) {
        console.log("⚠️ Campo contactos_json no disponible, usando tabla contactos_clientes como fallback");
        console.log("Error JSON:", error.message);
      }
    } catch (jsonError) {
      console.log("⚠️ Error accediendo campo JSON, usando tabla contactos_clientes como fallback");
    }
    
    // Fallback: usar tabla contactos_clientes
    console.log("� Usando tabla contactos_clientes como fallback...");
    const { data, error } = await supabase
      .from("contactos_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("es_principal", { ascending: false })
      .order("nombre");

    if (error) {
      console.error("❌ Error obteniendo contactos de tabla:");
      console.error("- Error message:", error.message);
      console.error("- Error details:", error.details);
      console.error("- Error hint:", error.hint);
      console.error("- Error code:", error.code);
      console.error("- Cliente ID usado:", clienteId);
      return [];
    }

    console.log(`✅ Obtenidos ${data?.length || 0} contactos desde tabla contactos_clientes`);
    return data || [];
  } catch (error: any) {
    console.error("💥 Excepción obteniendo contactos:");
    console.error("- Error:", error);
    console.error("- Tipo:", typeof error);
    console.error("- Stack:", error?.stack);
    console.error("- Cliente ID:", clienteId);
    
    // Si es un error de red y tenemos reintentos disponibles, intentar de nuevo
    if (error?.message?.includes('Failed to fetch') && reintentos > 0) {
      console.log(`🔄 Reintentando... (${reintentos} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      return obtenerContactosCliente(clienteId, reintentos - 1);
    }
    
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

// Función para agregar columna contactos_json si no existe
export const agregarColumnaContactosJSON = async () => {
  try {
    console.log("🔧 Intentando agregar columna contactos_json...");
    
    // Nota: En Supabase, necesitas hacer esto desde el dashboard o SQL editor
    console.log("💡 Para agregar la columna contactos_json:");
    console.log("1. Ve al dashboard de Supabase");
    console.log("2. Abre el SQL Editor");
    console.log("3. Ejecuta: ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contactos_json JSONB;");
    console.log("4. Ejecuta: CREATE INDEX IF NOT EXISTS idx_clientes_contactos_json ON clientes USING GIN (contactos_json);");
    
    return false; // No podemos hacer ALTER TABLE desde el cliente JavaScript
  } catch (error) {
    console.error("💥 Error:", error);
    return false;
  }
};

// Función de diagnóstico para verificar la conexión a Supabase y estructura de tabla
export const diagnosticarConexionSupabase = async () => {
  try {
    console.log("🔧 Diagnóstico de conexión a Supabase...");
    
    // 1. Probar conexión básica
    const { data: basicData, error: basicError } = await supabase
      .from("clientes")
      .select("id, nombre")
      .limit(1);
      
    if (basicError) {
      console.error("❌ Error en conexión básica a Supabase:", {
        message: basicError.message,
        details: basicError.details,
        hint: basicError.hint,
        code: basicError.code
      });
      return false;
    }
    
    console.log("✅ Conexión básica exitosa:", basicData);
    
    // 2. Probar acceso al campo contactos_json
    console.log("🔍 Verificando campo contactos_json...");
    const { data: jsonData, error: jsonError } = await supabase
      .from("clientes")
      .select("id, nombre, contactos_json")
      .limit(1);
      
    if (jsonError) {
      console.error("❌ Error accediendo campo contactos_json:", {
        message: jsonError.message,
        details: jsonError.details,
        hint: jsonError.hint,
        code: jsonError.code
      });
      
      if (jsonError.message?.includes("column") && jsonError.message?.includes("does not exist")) {
        console.error("🚨 PROBLEMA: El campo 'contactos_json' no existe en la tabla 'clientes'");
        console.log("💡 SOLUCIÓN: Necesitas agregar la columna 'contactos_json' de tipo JSON a la tabla 'clientes' en Supabase");
      }
      
      return false;
    }
    
    console.log("✅ Campo contactos_json accesible:", jsonData);
    return true;
  } catch (error) {
    console.error("💥 Excepción en diagnóstico:", error);
    return false;
  }
};

// Función específica para diagnosticar la tabla contactos_clientes
export const diagnosticarTablaContactos = async () => {
  try {
    console.log("🔍 Diagnosticando tabla contactos_clientes...");
    
    // 1. Verificar si la tabla existe y obtener su estructura
    console.log("📊 Verificando estructura de tabla...");
    
    // 2. Probar inserción de prueba muy simple
    const contactoPrueba = {
      cliente_id: '00000000-0000-0000-0000-000000000000',
      nombre: 'Prueba Diagnóstico',
      telefono: '1234567890',
      email: 'prueba@test.com',
      puesto: 'Test',
      es_principal: false,
      activo: true
    };
    
    console.log("🧪 Probando inserción simple...");
    const { data: insertData, error: insertError } = await supabase
      .from("contactos_clientes")
      .insert([contactoPrueba])
      .select();
      
    if (insertError) {
      console.error("❌ Error en inserción de prueba:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      // Analizar tipos específicos de error
      if (insertError.message?.includes("column") && insertError.message?.includes("does not exist")) {
        console.error("🚨 PROBLEMA: Columna faltante en tabla contactos_clientes");
      } else if (insertError.message?.includes("violates") || insertError.message?.includes("constraint")) {
        console.error("🚨 PROBLEMA: Violación de constraint en tabla contactos_clientes");
      } else if (insertError.message?.includes("permission")) {
        console.error("🚨 PROBLEMA: Sin permisos para insertar en tabla contactos_clientes");
      }
      
      return false;
    } else {
      console.log("✅ Inserción de prueba exitosa:", insertData);
      
      // Limpiar el registro de prueba
      console.log("🧹 Limpiando registro de prueba...");
      await supabase
        .from("contactos_clientes")
        .delete()
        .eq("cliente_id", '00000000-0000-0000-0000-000000000000');
    }
    
    // 3. Verificar conteo actual
    const { count, error: countError } = await supabase
      .from("contactos_clientes")
      .select("*", { count: 'exact', head: true });
      
    if (countError) {
      console.error("❌ Error obteniendo conteo:", countError);
    } else {
      console.log("📈 Total de contactos en la tabla:", count);
    }
    
    // 4. Probar inserción múltiple pequeña
    const contactosPrueba = [
      {
        cliente_id: '00000000-0000-0000-0000-000000000001',
        nombre: 'Prueba Múltiple 1',
        telefono: '1111111111',
        email: 'prueba1@test.com',
        puesto: 'Test 1',
        es_principal: true,
        activo: true
      },
      {
        cliente_id: '00000000-0000-0000-0000-000000000001',
        nombre: 'Prueba Múltiple 2',
        telefono: '2222222222',
        email: 'prueba2@test.com',
        puesto: 'Test 2',
        es_principal: false,
        activo: true
      }
    ];
    
    console.log("🧪 Probando inserción múltiple...");
    const { data: multipleData, error: multipleError } = await supabase
      .from("contactos_clientes")
      .insert(contactosPrueba)
      .select();
      
    if (multipleError) {
      console.error("❌ Error en inserción múltiple:", {
        message: multipleError.message,
        details: multipleError.details,
        hint: multipleError.hint,
        code: multipleError.code
      });
    } else {
      console.log("✅ Inserción múltiple exitosa:", multipleData);
      
      // Limpiar registros de prueba
      console.log("🧹 Limpiando registros de prueba múltiple...");
      await supabase
        .from("contactos_clientes")
        .delete()
        .eq("cliente_id", '00000000-0000-0000-0000-000000000001');
    }
    
    return true;
  } catch (error) {
    console.error("💥 Excepción en diagnóstico de tabla:", error);
    return false;
  }
};

// Función auxiliar para garantizar que la columna contactos_json existe
const asegurarColumnaContactosJson = async (): Promise<boolean> => {
  try {
    console.log("🔍 Verificando existencia de columna contactos_json...");
    
    // Probar si la columna existe haciendo una consulta simple
    const { data, error } = await supabase
      .from("clientes")
      .select("contactos_json")
      .limit(1);
      
    if (error && error.message?.includes("column") && error.message?.includes("does not exist")) {
      console.log("❌ Columna contactos_json no existe, intentando crearla...");
      
      // Intentar crear la columna usando RPC si existe
      try {
        const { error: rpcError } = await supabase.rpc('crear_columna_contactos_json');
        if (!rpcError) {
          console.log("✅ Columna contactos_json creada exitosamente");
          return true;
        }
      } catch (rpcError) {
        console.log("⚠️ RPC no disponible, columna debe crearse manualmente");
      }
      
      console.log("📝 ACCIÓN REQUERIDA: Ejecutar en Supabase SQL Editor:");
      console.log("   ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contactos_json JSON;");
      return false;
    }
    
    console.log("✅ Columna contactos_json existe y es accesible");
    return true;
  } catch (error) {
    console.error("❌ Error verificando columna contactos_json:", error);
    return false;
  }
};

// Función auxiliar para guardar solo en tabla normalizada (fallback completo)
const guardarSoloEnTabla = async (clienteId: string, contactosJSON: any[]): Promise<boolean> => {
  try {
    console.log("🎯 FALLBACK: Guardando solo en tabla normalizada...");
    
    // Limpiar contactos existentes
    await supabase
      .from("contactos_clientes")
      .delete()
      .eq("cliente_id", clienteId);
    
    // Preparar contactos para tabla normalizada
    const contactosTabla = contactosJSON.map(contacto => ({
      cliente_id: clienteId,
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
      puesto: contacto.puesto,
      es_principal: contacto.es_principal,
      activo: true
    }));
    
    // Insertar en lotes pequeños
    const BATCH_SIZE = 10;
    let exitoso = 0;
    let errores = 0;
    
    for (let i = 0; i < contactosTabla.length; i += BATCH_SIZE) {
      const batch = contactosTabla.slice(i, i + BATCH_SIZE);
      
      const { error: batchError } = await supabase
        .from("contactos_clientes")
        .insert(batch);
        
      if (batchError) {
        console.error(`❌ Error en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError.message);
        errores += batch.length;
        
        // Intentar insertar uno por uno
        for (const contacto of batch) {
          const { error: individualError } = await supabase
            .from("contactos_clientes")
            .insert([contacto]);
            
          if (!individualError) {
            exitoso++;
          }
        }
      } else {
        exitoso += batch.length;
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado: ${batch.length} contactos`);
      }
    }
    
    console.log(`📊 Resultado final: ${exitoso} exitosos, ${errores} errores`);
    return exitoso > 0;
    
  } catch (error) {
    console.error("❌ Error en fallback de tabla:", error);
    return false;
  }
};

// Función auxiliar para guardar en tabla sin bloquear
const guardarEnTablaSinBloquear = async (clienteId: string, contactosJSON: any[]) => {
  try {
    // Limpiar contactos existentes
    await supabase
      .from("contactos_clientes")
      .delete()
      .eq("cliente_id", clienteId);
    
    // Preparar e insertar en lotes pequeños
    const contactosTabla = contactosJSON.map(contacto => ({
      cliente_id: clienteId,
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
      puesto: contacto.puesto,
      es_principal: contacto.es_principal,
      activo: true
    }));
    
    const BATCH_SIZE = 5; // Lotes muy pequeños para evitar errores
    for (let i = 0; i < contactosTabla.length; i += BATCH_SIZE) {
      const batch = contactosTabla.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from("contactos_clientes")
        .insert(batch);
      
      if (error) {
        console.log(`⚠️ Cache lote ${Math.floor(i/BATCH_SIZE) + 1} falló: ${error.message}`);
        break; // No continuar si hay errores en cache
      }
    }
    
    console.log("✅ Cache en tabla completado");
  } catch (error) {
    console.log("⚠️ Error en cache de tabla (no crítico):", error);
  }
};

// Función NUEVA Y ROBUSTA para guardar contactos - REEMPLAZA la anterior
export const guardarContactosClienteRobusto = async (
  clienteId: string,
  contactos: any[]
): Promise<boolean> => {
  try {
    console.log("💾 [TABLA] Guardando contactos en tabla contactos_clientes:", { 
      clienteId, 
      cantidad_original: contactos.length,
      timestamp: new Date().toISOString()
    });
    
    // 1. VALIDACIONES BÁSICAS
    if (!clienteId || clienteId.trim() === '') {
      console.error("❌ Cliente ID no válido:", clienteId);
      return false;
    }
    
    if (!contactos || contactos.length === 0) {
      console.log("ℹ️ No hay contactos para guardar");
      return true;
    }
    
    // 2. PREPARAR CONTACTOS VÁLIDOS PARA LA TABLA
    const contactosValidos = contactos
      .filter(c => c.nombre?.trim() || c.telefono?.trim() || c.email?.trim())
      .map((contacto, index) => {
        // Generar UUID válido si no existe o es temporal
        let contactoId = contacto.id;
        if (!contactoId || contactoId.startsWith('temp-') || contactoId.startsWith('contact-')) {
          // Generar UUID v4 simple
          contactoId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        
        const contactoData = {
          id: contactoId,
          cliente_id: clienteId,
          nombre: contacto.nombre?.trim() || "Sin nombre",
          telefono: contacto.telefono?.trim() || null,
          email: contacto.email?.trim() || null,
          puesto: contacto.puesto?.trim() || null,
          es_principal: contactos.length === 1 ? true : (contacto.es_principal || index === 0),
          activo: true,
          fecha_creacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return contactoData;
      });
    
    console.log(`✅ ${contactosValidos.length} contactos válidos preparados para tabla`);
    
    if (contactosValidos.length === 0) {
      console.log("ℹ️ No hay contactos válidos para guardar después del filtrado");
      return true;
    }
    
    // 3. VALIDAR QUE EL CLIENTE EXISTE ANTES DE INSERTAR CONTACTOS
    console.log("🔍 Verificando que el cliente existe...");
    const { data: clienteExiste, error: clienteError } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("id", clienteId)
      .single();
    
    if (clienteError || !clienteExiste) {
      console.error("❌ Cliente no encontrado:", clienteId);
      console.error("❌ Error:", clienteError);
      return false;
    }
    
    console.log("✅ Cliente encontrado:", clienteExiste.nombre);
    
    // 4. ESTRATEGIA ÚNICA: GUARDAR DIRECTAMENTE EN TABLA NORMALIZADA
    console.log("🎯 Guardando contactos en tabla contactos_clientes...");
    
    // Paso 1: Desactivar contactos existentes del cliente
    console.log("🔄 Desactivando contactos existentes...");
    const { error: updateError } = await supabase
      .from("contactos_clientes")
      .update({ 
        activo: false, 
        updated_at: new Date().toISOString() 
      })
      .eq("cliente_id", clienteId);

    if (updateError) {
      console.warn("⚠️ Error desactivando contactos existentes:", updateError.message);
    }
    
    // Paso 2: Insertar nuevos contactos en lotes optimizados
    const BATCH_SIZE = 20; // Lotes de 20 para mejor rendimiento
    let totalInsertados = 0;
    
    for (let i = 0; i < contactosValidos.length; i += BATCH_SIZE) {
      const batch = contactosValidos.slice(i, i + BATCH_SIZE);
      console.log(`� Insertando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(contactosValidos.length/BATCH_SIZE)} (${batch.length} contactos)`);
      
      const { data: insertData, error: insertError } = await supabase
        .from("contactos_clientes")
        .insert(batch)
        .select("id, nombre");
      
      if (insertError) {
        console.warn("⚠️ Error insertando lote completo:", insertError.message);
        
        // Intentar insertar uno por uno como fallback
        for (const contacto of batch) {
          try {
            const { error: individualError } = await supabase
              .from("contactos_clientes")
              .insert([contacto])
              .select("id");
            
            if (!individualError) {
              totalInsertados++;
            }
          } catch (e) {
            // Ignorar errores individuales silenciosamente
          }
        }
      } else {
        totalInsertados += batch.length;
        console.log(`✅ Lote insertado: ${batch.length} contactos`);
      }
    }
    
    console.log(`🎬 Completado: ${totalInsertados}/${contactosValidos.length} contactos guardados`);
    
    // Retornar true si al menos el 80% de contactos se guardaron exitosamente
    const porcentajeExito = (totalInsertados / contactosValidos.length) * 100;
    if (porcentajeExito >= 80) {
      console.log(`✅ Guardado exitoso (${porcentajeExito.toFixed(1)}%)`);
      return true;
    } else if (totalInsertados > 0) {
      console.warn(`⚠️ Guardado parcial (${porcentajeExito.toFixed(1)}%)`);
      return true; // Aún retornar true si al menos algunos se guardaron
    } else {
      console.error("❌ No se pudo guardar ningún contacto");
      return false;
    }
    
  } catch (error) {
    console.warn("⚠️ Error en guardarContactosClienteRobusto:", String(error));
    return false;
  }
};

// Función para guardar contactos de un cliente usando estrategia híbrida optimizada
export const guardarContactosCliente = async (
  clienteId: string,
  contactos: any[]
): Promise<boolean> => {
  try {
    console.log("💾 Guardando contactos para cliente:", { clienteId, cantidad: contactos.length });
    
    // Validar que clienteId no esté vacío
    if (!clienteId || clienteId.trim() === '') {
      console.error("❌ Cliente ID no válido:", clienteId);
      return false;
    }
    
    // Preparar contactos para guardar
    const contactosJSON = contactos
      .filter(c => c.nombre?.trim() || c.telefono?.trim() || c.email?.trim())
      .map((contacto, index) => ({
        id: contacto.id || `contact-${Date.now()}-${index}`,
        nombre: contacto.nombre?.trim() || "",
        apellidos: contacto.apellidos?.trim() || "",
        telefono: contacto.telefono?.trim() || "",
        email: contacto.email?.trim() || "",
        puesto: contacto.puesto?.trim() || "",
        es_principal: contactos.length === 1 ? true : (contacto.es_principal || index === 0),
        activo: true,
        notas: contacto.notas?.trim() || "",
        fecha_creacion: contacto.fecha_creacion || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    
    console.log(`📋 Preparando ${contactosJSON.length} contactos válidos para guardar`);
    
    // ESTRATEGIA 1: Guardar en JSON (PRIORITARIO - siempre funciona)
    console.log("🎯 PASO 1: Guardando en campo JSON (estrategia principal)...")
    try {
      console.log("🔄 Intentando guardar en campo JSON...");
      const { error } = await supabase
        .from("clientes")
        .update({ 
          contactos_json: contactosJSON,
          updated_at: new Date().toISOString()
        })
        .eq("id", clienteId);
      
      if (!error) {
        console.log("✅ Contactos guardados como JSON exitosamente");
        return true;
      }
      
      console.log("⚠️ Campo JSON no disponible, usando tabla contactos_clientes como fallback");
      console.log("Error JSON:", error.message);
    } catch (jsonError) {
      console.log("⚠️ Error guardando en JSON, usando tabla contactos_clientes como fallback");
    }
    
    // Fallback: usar tabla contactos_clientes
    console.log("🔄 Usando tabla contactos_clientes como fallback...");
    
    // Desactivar contactos existentes
    const { error: updateError } = await supabase
      .from("contactos_clientes")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("cliente_id", clienteId);

    if (updateError) {
      console.error("Error desactivando contactos:", updateError);
    }

    // Insertar nuevos contactos en tabla por lotes para evitar límites
    if (contactosJSON.length > 0) {
      const contactosParaTabla = contactosJSON.map((c, index) => ({
        cliente_id: clienteId,
        nombre: c.nombre || "Sin nombre",
        apellidos: c.apellidos || null,
        telefono: c.telefono || null,
        email: c.email || null,
        puesto: c.puesto || null,
        es_principal: index === 0, // Solo el primero es principal
        activo: true,
        fecha_creacion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      console.log(`📋 Insertando ${contactosParaTabla.length} contactos en tabla contactos_clientes`);
      console.log("Ejemplo de contacto:", JSON.stringify(contactosParaTabla[0], null, 2));
      
      // Insertar por lotes de 50 para evitar timeouts
      const BATCH_SIZE = 50;
      for (let i = 0; i < contactosParaTabla.length; i += BATCH_SIZE) {
        const batch = contactosParaTabla.slice(i, i + BATCH_SIZE);
        console.log(`🔄 Insertando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(contactosParaTabla.length/BATCH_SIZE)} (${batch.length} contactos)`);
        
        const { error: insertError } = await supabase
          .from("contactos_clientes")
          .insert(batch);
        
        if (insertError) {
          console.error("❌ Error insertando lote en tabla contactos_clientes:");
          console.error("- Message:", insertError.message);
          console.error("- Details:", insertError.details);
          console.error("- Hint:", insertError.hint);
          console.error("- Code:", insertError.code);
          console.error("- Lote fallido:", JSON.stringify(batch[0], null, 2));
          
          // Intentar diferentes estrategias según el tipo de error
          if (insertError.message?.includes("column") && insertError.message?.includes("does not exist")) {
            console.log("🔧 Error de columna faltante - intentando inserción con campos básicos...");
            
            const contactosBasicos = batch.map(c => ({
              cliente_id: c.cliente_id,
              nombre: c.nombre,
              telefono: c.telefono,
              email: c.email,
              puesto: c.puesto,
              es_principal: c.es_principal,
              activo: true
            }));
            
            const { error: basicError } = await supabase
              .from("contactos_clientes")
              .insert(contactosBasicos);
              
            if (basicError) {
              console.error("❌ Error con inserción básica también:", {
                message: basicError.message,
                details: basicError.details,
                hint: basicError.hint,
                code: basicError.code
              });
              return false;
            } else {
              console.log("✅ Inserción básica exitosa para este lote");
            }
          } else if (insertError.message?.includes("violates") || insertError.message?.includes("constraint")) {
            console.log("🔧 Error de constraint - intentando inserción uno por uno...");
            
            // Intentar insertar uno por uno para identificar el registro problemático
            for (let j = 0; j < batch.length; j++) {
              const contactoIndividual = batch[j];
              const { error: individualError } = await supabase
                .from("contactos_clientes")
                .insert([contactoIndividual]);
                
              if (individualError) {
                console.error(`❌ Error insertando contacto ${j + 1}:`, {
                  contacto: contactoIndividual,
                  error: individualError.message
                });
                // Continuar con los demás contactos
              } else {
                console.log(`✅ Contacto ${j + 1} insertado exitosamente`);
              }
            }
          } else {
            console.error("❌ Error no manejado en inserción de contactos");
            return false;
          }
        } else {
          console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado exitosamente`);
        }
      }
    }
    
    console.log("✅ Contactos guardados en tabla contactos_clientes exitosamente");
    return true;
  } catch (error) {
    console.error("💥 Error en guardarContactosCliente:", error);
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
      console.error("Error al obtener IDs de embarques modificados:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return [];
    }

    if (!data) {
      console.warn("No se encontraron datos en embarque_modificaciones");
      return [];
    }

    // Extraer y devolver IDs únicos
    const ids = data.map((row) => row.embarque_id);
    return Array.from(new Set(ids));
  } catch (error) {
    console.error("Excepción al obtener IDs de embarques modificados:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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

// =============================
// FUNCIÓN CENTRALIZADA PARA CALCULAR PAGO AL OPERADOR
// =============================

/**
 * Calcula el pago al operador siguiendo esta lógica de prioridades:
 * 1. Si tiene pago_operador (valor específico del embarque) → usar ese valor  
 * 2. Si es flete falso → buscar tipo de servicio "Flete en Falso" y usar su pago
 * 3. Si tiene tipo de servicio → calcular desde tipo de servicio
 * 4. Fallback → 0
 * 
 * NOTA: El campo pago_operador_flete_falso no existe en la tabla embarques,
 * solo en tipos_servicio. Cuando se marca un embarque como flete falso, 
 * el valor se guarda en embarques.pago_operador
 */
export const calcularPagoOperador = (
  embarque: Partial<Embarque>, 
  tipoServicio?: Partial<TipoServicio> | null,
  tiposServicio?: TipoServicio[]
): number => {
  try {
    console.log(`🔍 [DEBUG] Calculando pago para embarque:`, {
      folio: embarque.folio,
      flete_falso: embarque.flete_falso,
      pago_operador: embarque.pago_operador,
      tipo_servicio_id: embarque.tipo_servicio_id,
      tipoServicio: tipoServicio ? { id: tipoServicio.id, nombre: tipoServicio.nombre } : null,
      tiposServicioCount: tiposServicio?.length || 0
    });

    // 1. PRIORIDAD MÁXIMA: Pago específico del embarque (incluye fletes falsos)
    if (embarque.pago_operador != null) {
      const pago = Number(embarque.pago_operador);
      if (!isNaN(pago)) {
        console.log(`💰 [DEBUG] Pago calculado (específico embarque): ${pago}`);
        return pago;
      }
    }

    // 2. SEGUNDA PRIORIDAD: Si es flete falso, usar precio fallback (se recomienda usar calcularPagoOperadorAsync)
    if (embarque.flete_falso) {
      console.log(`� [DEBUG] Es flete falso, usando precio fallback 800`);
      return 800.00; // Precio fallback para función síncrona
    }

    // 3. TERCERA PRIORIDAD: Usar el tipo de servicio del embarque
    if (tipoServicio) {
      const pagoTipoServicio = calcularMontoTipoServicio(tipoServicio);
      console.log(`💰 [DEBUG] Pago calculado (tipo servicio): ${pagoTipoServicio}`);
      return pagoTipoServicio;
    }

    // 4. FALLBACK: 0
    console.log("💰 [DEBUG] Pago calculado (fallback): 0");
    return 0;

  } catch (error) {
    console.error("❌ [DEBUG] Error calculando pago operador:", error);
    return 0;
  }
};

/**
 * Versión asíncrona de calcularPagoOperador que maneja el precio global de flete falso
 */
export const calcularPagoOperadorAsync = async (
  embarque: Partial<Embarque>, 
  tipoServicio?: Partial<TipoServicio> | null,
  tiposServicio?: TipoServicio[]
): Promise<number> => {
  try {
    console.log(`🔍 [DEBUG] Calculando pago ASYNC para embarque (FUENTE ÚNICA):`, {
      folio: embarque.folio,
      pago_operador: embarque.pago_operador,
    });

    // 🎯 FUENTE ÚNICA: SIEMPRE usar embarques.pago_operador
    // Esta es la ÚNICA fuente de verdad para el pago del operador
    if (embarque.pago_operador != null) {
      const pago = Number(embarque.pago_operador);
      if (!isNaN(pago)) {
        console.log(`💰 [DEBUG] Pago calculado (desde embarques.pago_operador): ${pago}`);
        return pago;
      }
    }

    // Si no hay embarque.pago_operador definido, retornar 0
    console.log(`💰 [DEBUG] Embarque sin pago_operador definido, retornando 0`);
    return 0;
  } catch (error) {
    console.error(`❌ [ERROR] Error en calcularPagoOperadorAsync:`, error);
    return 0;
  }
};

/**
 * Función auxiliar para calcular el monto desde un tipo de servicio
 * Maneja los diferentes campos que puede tener un tipo de servicio
 */
const calcularMontoTipoServicio = (tipo: Partial<TipoServicio>): number => {
  if (!tipo) {
    console.log(`⚠️ [DEBUG] calcularMontoTipoServicio: tipo es null/undefined`);
    return 0;
  }

  console.log(`🔧 [DEBUG] calcularMontoTipoServicio para tipo:`, {
    nombre: tipo.nombre,
    es_flete_falso: tipo.es_flete_falso,
    pago_operador_flete_falso: tipo.pago_operador_flete_falso,
    pago_operador: (tipo as any).pago_operador,
    precio_base: (tipo as any).precio_base
  });

  // Para tipos de servicio que son flete falso, usar su campo específico
  if (tipo.es_flete_falso && tipo.pago_operador_flete_falso != null) {
    const pago = Number(tipo.pago_operador_flete_falso);
    if (!isNaN(pago)) {
      console.log(`💰 [DEBUG] Usando pago_operador_flete_falso: ${pago}`);
      return pago;
    }
  }

  // Buscar en los campos estándar por orden de prioridad
  const candidatos = [
    (tipo as any).pago_operador,
    (tipo as any).precio_base,
    (tipo as any).pagoOperador, // Campo legacy
  ];

  console.log(`🔍 [DEBUG] Candidatos de pago:`, candidatos);

  for (const candidato of candidatos) {
    if (candidato != null) {
      const parsed = Number(candidato);
      if (!isNaN(parsed)) {
        console.log(`💰 [DEBUG] Usando candidato: ${parsed}`);
        return parsed;
      }
    }
  }

  console.log(`💰 [DEBUG] Ningún candidato válido, retornando 0`);
  return 0;
};

// =======================
// CONFIGURACIÓN DEL SISTEMA
// =======================

// Interfaz para la configuración del sistema
export interface ConfiguracionSistema {
  id: string;
  clave: string;
  valor: string;
  descripcion?: string;
  tipo_dato: 'texto' | 'numero' | 'booleano' | 'json';
  categoria: string;
  activo: boolean;
  usuario_creacion?: string;
  usuario_modificacion?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtener una configuración específica del sistema por su clave
 */
export const obtenerConfiguracion = async (clave: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', clave)
      .eq('activo', true)
      .single();

    if (error) {
      // Si la tabla no existe, es normal al principio
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn(`Tabla configuracion_sistema no existe. Ejecutar script 107-crear-configuracion-sistema.sql`);
        return null;
      }
      console.error(`Error obteniendo configuración ${clave}:`, error);
      return null;
    }

    return data?.valor || null;
  } catch (error) {
    console.error(`Error obteniendo configuración ${clave}:`, error);
    return null;
  }
};

/**
 * Obtener el precio global único de flete falso
 * Versión temporal con fallback hasta que se ejecute el script SQL
 */
export const obtenerPrecioFleteFalso = async (): Promise<number> => {
  try {
    const valor = await obtenerConfiguracion('flete_falso_precio_global');
    if (valor) {
      const precio = Number(valor);
      if (!isNaN(precio)) {
        return precio;
      }
    }
    // Valor por defecto si no existe configuración
    return 800.00;
  } catch (error) {
    console.warn('Tabla configuracion_sistema no existe aún. Usando precio fallback 800.00');
    return 800.00;
  }
};

/**
 * Actualizar una configuración del sistema
 */
export const actualizarConfiguracion = async (
  clave: string, 
  valor: string, 
  usuario?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('configuracion_sistema')
      .update({
        valor,
        usuario_modificacion: usuario || 'sistema',
        updated_at: new Date().toISOString()
      })
      .eq('clave', clave);

    if (error) {
      console.error(`Error actualizando configuración ${clave}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error actualizando configuración ${clave}:`, error);
    return false;
  }
};

/**
 * Actualizar el precio global único de flete falso
 */
export const actualizarPrecioFleteFalso = async (
  nuevoPrecio: number, 
  usuario?: string
): Promise<boolean> => {
  return await actualizarConfiguracion(
    'flete_falso_precio_global', 
    nuevoPrecio.toString(), 
    usuario
  );
};

/**
 * Actualizar el estado de flete falso de un embarque en las tablas normalizadas
 * IMPORTANTE: Solo actualiza el PAGO DEL OPERADOR, no el precio del flete del embarque
 */
export const actualizarFleteFalsoEmbarque = async (
  embarqueId: string, 
  esFleteFalso: boolean, 
  precioFleteFalso?: number
): Promise<boolean> => {
  // Obtener el precio global si no se proporciona uno específico
  let precioFinal = precioFleteFalso;
  
  try {
    if (esFleteFalso && !precioFinal) {
      precioFinal = await obtenerPrecioFleteFalso();
    }

    // Verificar si la función RPC existe, si no, usar actualización directa
    console.log(`🔄 Actualizando flete falso para embarque ${embarqueId}:`, {
      esFleteFalso,
      precioFinal
    });

    // Intentar usar la función RPC primero
    const { data, error } = await supabase
      .rpc('actualizar_flete_falso', {
        p_embarque_id: embarqueId,
        p_es_flete_falso: esFleteFalso,
        p_precio_flete_falso: precioFinal
      });

    if (error) {
      console.warn('⚠️ Función RPC actualizar_flete_falso falló, usando fallback:', error?.message || 'Sin mensaje');
      console.log('📋 Detalles del error RPC:', {
        message: error?.message || 'Sin mensaje específico',
        details: error?.details || 'Sin detalles',
        hint: error?.hint || 'Sin hint',
        code: error?.code || 'Sin código',
        embarqueId: embarqueId,
        esFleteFalso: esFleteFalso,
        precioFinal: precioFinal
      });
      
      // SIEMPRE intentar actualización directa como fallback cuando RPC falla
      console.log('🔄 RPC falló, usando actualización directa como fallback...');
      
      try {
        // Actualizar directamente la tabla embarques
        const updateData: any = {
          flete_falso: esFleteFalso
        };
        
        if (esFleteFalso && precioFinal) {
          updateData.pago_operador = precioFinal;
        }
        
        const { error: updateError } = await supabase
          .from('embarques')
          .update(updateData)
          .eq('id', embarqueId);
          
        if (updateError) {
          console.warn('⚠️ Error en actualización directa también falló:', updateError?.message || updateError);
          return false;
        }
        
        console.log('✅ Flete falso actualizado mediante actualización directa (fallback)');
        return true;
        
      } catch (fallbackError) {
        console.warn('⚠️ Error crítico en fallback:', fallbackError);
        return false;
      }
    }

    console.log(`✅ Flete falso actualizado para embarque ${embarqueId}: ${esFleteFalso ? 'Pago operador = $' + precioFinal : 'Pago operador = precio original'}`);
    return true;

  } catch (error) {
    console.warn('⚠️ Error crítico en actualizarFleteFalsoEmbarque:', error instanceof Error ? error.message : String(error));
    console.log('📋 Stack trace completo:', error instanceof Error ? error.stack : undefined);
    return false;
  }
};

// ====================================
// FUNCIONES PARA CAMBIO DE NÚMERO DE EMBARQUE
// ====================================

/**
 * Valida el formato del número de embarque
 * Permite solo cambios en los 5 dígitos finales (XX-XXX)
 * Formato válido: TIM-25XX-XXX donde solo se pueden cambiar los últimos 5 dígitos
 */
export const validarFormatoNumeroEmbarque = (numeroEmbarque: string): { 
  esValido: boolean; 
  mensaje: string; 
  prefijo?: string;
  sufijo?: string;
} => {
  // Patrón para TIM-25XX-XXX
  const patron = /^TIM-25(\d{2})-(\d{3})$/;
  const match = numeroEmbarque.match(patron);
  
  if (!match) {
    return {
      esValido: false,
      mensaje: "El formato debe ser TIM-25XX-XXX donde XX-XXX son 5 dígitos que puedes cambiar"
    };
  }
  
  const mesAno = match[1]; // Los 2 dígitos después de TIM-25
  const consecutivo = match[2]; // Los 3 dígitos finales
  
  // Validar que el mes/año sea válido (01-12 para los primeros 2 dígitos)
  const mes = parseInt(mesAno.substring(0, 2));
  if (mes < 1 || mes > 12) {
    return {
      esValido: false,
      mensaje: "Los primeros 2 dígitos después de TIM-25 deben representar un mes válido (01-12)"
    };
  }
  
  return {
    esValido: true,
    mensaje: "Formato válido",
    prefijo: `TIM-25${mesAno}`,
    sufijo: consecutivo
  };
};

/**
 * Verifica si un número de embarque ya existe en cualquier estado
 * (activos, archivados, eliminados)
 */
export const verificarNumeroEmbarqueExiste = async (numeroEmbarque: string): Promise<{
  existe: boolean;
  mensaje: string;
  detalles?: {
    tabla: string;
    estado?: string;
    fechaCreacion?: string;
  };
}> => {
  try {
    console.log(`🔍 Verificando existencia del número de embarque: ${numeroEmbarque}`);
    
    // Buscar en tabla principal de embarques
    const { data: embarqueExistente, error: errorEmbarque } = await supabase
      .from('embarques')
      .select('folio, estado, fecha_creacion, created_at')
      .eq('folio', numeroEmbarque)
      .single();
    
    if (errorEmbarque && errorEmbarque.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error verificando embarque:', errorEmbarque);
      throw errorEmbarque;
    }
    
    if (embarqueExistente) {
      return {
        existe: true,
        mensaje: `El número ${numeroEmbarque} ya existe`,
        detalles: {
          tabla: 'embarques',
          estado: embarqueExistente.estado,
          fechaCreacion: embarqueExistente.fecha_creacion || embarqueExistente.created_at
        }
      };
    }
    
    // TODO: Aquí se pueden agregar verificaciones adicionales para otras tablas
    // si existieran tablas de embarques archivados o eliminados
    
    console.log(`✅ El número ${numeroEmbarque} está disponible`);
    return {
      existe: false,
      mensaje: `El número ${numeroEmbarque} está disponible`
    };
    
  } catch (error) {
    console.error('❌ Error verificando número de embarque:', error);
    return {
      existe: true,
      mensaje: `Error verificando el número ${numeroEmbarque}. Por seguridad, no se permite su uso.`
    };
  }
};

/**
 * Función completa para validar un número de embarque personalizado
 * Combina validación de formato y verificación de existencia
 */
export const validarNumeroEmbarqueCompleto = async (numeroEmbarque: string): Promise<{
  esValido: boolean;
  mensaje: string;
  detalles?: any;
}> => {
  // Primero validar formato
  const validacionFormato = validarFormatoNumeroEmbarque(numeroEmbarque);
  if (!validacionFormato.esValido) {
    return {
      esValido: false,
      mensaje: validacionFormato.mensaje,
    };
  }
  
  // Luego verificar existencia
  const verificacionExistencia = await verificarNumeroEmbarqueExiste(numeroEmbarque);
  if (verificacionExistencia.existe) {
    return {
      esValido: false,
      mensaje: verificacionExistencia.mensaje,
      detalles: verificacionExistencia.detalles
    };
  }
  
  return {
    esValido: true,
    mensaje: `El número ${numeroEmbarque} es válido y está disponible`
  };
};

/**
 * Actualiza el número de embarque en todas las tablas relacionadas
 * Incluye actualización en cascada de referencias
 */
export const actualizarNumeroEmbarqueEnCascada = async (
  embarqueId: string, 
  numeroAnterior: string, 
  numeroNuevo: string
): Promise<{
  exito: boolean;
  mensaje: string;
  detalles?: any;
}> => {
  try {
    console.log(`🔄 Iniciando actualización en cascada del número de embarque`);
    console.log(`   Embarque ID: ${embarqueId}`);
    console.log(`   Número anterior: ${numeroAnterior}`);
    console.log(`   Número nuevo: ${numeroNuevo}`);
    
    // 1. Validar que el número nuevo es válido y está disponible
    const validacionCompleta = await validarNumeroEmbarqueCompleto(numeroNuevo);
    if (!validacionCompleta.esValido) {
      return {
        exito: false,
        mensaje: `El número ${numeroNuevo} no es válido: ${validacionCompleta.mensaje}`,
        detalles: validacionCompleta.detalles
      };
    }
    
    // 2. Verificar que el embarque existe
    const { data: embarqueExistente, error: errorEmbarque } = await supabase
      .from('embarques')
      .select('folio, id')
      .eq('id', embarqueId)
      .single();
    
    if (errorEmbarque) {
      console.error('❌ Error verificando embarque existente:', errorEmbarque);
      return {
        exito: false,
        mensaje: `Error verificando el embarque: ${errorEmbarque.message}`
      };
    }
    
    if (!embarqueExistente) {
      return {
        exito: false,
        mensaje: `No se encontró el embarque con ID: ${embarqueId}`
      };
    }
    
    // 3. Verificar que el número anterior coincide
    if (embarqueExistente.folio !== numeroAnterior) {
      return {
        exito: false,
        mensaje: `El número actual del embarque (${embarqueExistente.folio}) no coincide con el esperado (${numeroAnterior})`
      };
    }
    
    // 4. Actualizar el número en la tabla principal de embarques
    const { error: errorActualizacion } = await supabase
      .from('embarques')
      .update({ folio: numeroNuevo })
      .eq('id', embarqueId);
    
    if (errorActualizacion) {
      console.error('❌ Error actualizando número de embarque:', errorActualizacion);
      return {
        exito: false,
        mensaje: `Error actualizando el número de embarque: ${errorActualizacion.message}`
      };
    }
    
    // 5. Actualizar referencias en otras tablas (fotos, documentos, etc.)
    const tablasReferencias = [
      { tabla: 'fotos_embarques', campoFolio: 'embarque_folio' },
      { tabla: 'documentos_embarques', campoFolio: 'embarque_folio' },
      // Se pueden agregar más tablas que tengan referencias al folio
    ];
    
    const actualizacionesReferencias = [];
    for (const { tabla, campoFolio } of tablasReferencias) {
      try {
        // Verificar si la tabla existe y tiene registros con el folio anterior
        const { data: registrosExistentes, error: errorConsulta } = await supabase
          .from(tabla)
          .select('id')
          .eq(campoFolio, numeroAnterior)
          .limit(1);
        
        if (errorConsulta) {
          console.warn(`⚠️ No se pudo consultar tabla ${tabla}:`, errorConsulta.message);
          continue;
        }
        
        if (registrosExistentes && registrosExistentes.length > 0) {
          const { error: errorActualizacionRef } = await supabase
            .from(tabla)
            .update({ [campoFolio]: numeroNuevo })
            .eq(campoFolio, numeroAnterior);
          
          if (errorActualizacionRef) {
            console.warn(`⚠️ Error actualizando referencias en ${tabla}:`, errorActualizacionRef.message);
          } else {
            actualizacionesReferencias.push(tabla);
            console.log(`✅ Referencias actualizadas en tabla: ${tabla}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando tabla ${tabla}:`, error);
      }
    }
    
    console.log(`✅ Número de embarque actualizado exitosamente`);
    console.log(`   Embarque ID: ${embarqueId}`);
    console.log(`   ${numeroAnterior} → ${numeroNuevo}`);
    console.log(`   Tablas de referencia actualizadas: ${actualizacionesReferencias.length}`);
    
    return {
      exito: true,
      mensaje: `Número de embarque actualizado correctamente: ${numeroAnterior} → ${numeroNuevo}`,
      detalles: {
        embarqueId,
        numeroAnterior,
        numeroNuevo,
        tablasActualizadas: actualizacionesReferencias
      }
    };
    
  } catch (error) {
    console.error('❌ Error crítico en actualización en cascada:', error);
    return {
      exito: false,
      mensaje: `Error crítico actualizando el número de embarque: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};
