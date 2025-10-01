"use client";

import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Download,
  Edit,
  MapPin,
  Calendar,
  Truck,
  Trash,
  Eye,
  RefreshCw,
  Printer,
  Link,
  ImageIcon,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { agregarAuditLog } from "@/lib/audit";
import { formatDateMatamoros } from '@/lib/date-utils';
import { normalizeDate } from '@/lib/date-utils';
import { useRouter } from "next/navigation";
import {
  supabase,
  type Embarque,
  type Cliente,
  type Operador,
  type Camion,
  type Remolque,
  type ContactoCliente,
  type TipoServicio,
  type FotoEmbarque,
  obtenerContactosCliente,
  obtenerFotosEmbarque,
} from "@/lib/supabase";

const esTipoServicioFleteFalso = (tipo?: Partial<TipoServicio> | null): boolean => {
  if (!tipo) return false;
  if (typeof (tipo as any)?.es_flete_falso === "boolean") {
    return Boolean((tipo as any).es_flete_falso);
  }
  if (typeof (tipo as any)?.flete_en_falso === "boolean") {
    return Boolean((tipo as any).flete_en_falso);
  }
  const slug = String((tipo as any)?.slug || "").toLowerCase();
  const nombre = String((tipo as any)?.nombre || "").toLowerCase();
  return slug === "flete-en-falso" || nombre === "flete en falso";
};

const parseMonto = (valor: any): number | undefined => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const obtenerMontoTipoServicio = (tipo?: Partial<TipoServicio> | null, precioGlobalFleteFalso: number = 800, embarque?: any): number => {
  if (!tipo) return 0;
  
  // Solo usar precio global si el EMBARQUE específico está marcado como flete falso
  if (embarque?.flete_falso === true) {
    return precioGlobalFleteFalso;
  }

  // Para servicios normales o si el embarque no está marcado como flete falso, usar precio base
  const candidatos = [
    (tipo as any)?.precio_base,
    (tipo as any)?.pago_operador,
    (tipo as any)?.pagoOperador,
  ];

  for (const candidato of candidatos) {
    const parsed = parseMonto(candidato);
    if (parsed !== undefined) return parsed;
  }

  return 0;
};

export default function EmbarquesPage() {
  const router = useRouter();
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [remolques, setRemolques] = useState<Remolque[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [precioGlobalFleteFalso, setPrecioGlobalFleteFalso] = useState(800);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Estados para filtros y búsqueda con persistencia
  const [filtroEstado, setFiltroEstado] = useState(() => {
    // 🔧 Cargar filtro desde localStorage o usar "todos" por defecto
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('embarques-filtro-estado');
      console.log(`🔧 [FILTRO] Cargando filtro desde localStorage: '${savedFilter}' → usando: '${savedFilter || 'todos'}'`);
      return savedFilter || "todos";
    }
    return "todos";
  });

  // 🔧 Función para cambiar filtro con persistencia
  const cambiarFiltroEstado = (nuevoFiltro: string) => {
    console.log(`🔧 [FILTRO] Cambiando filtro de '${filtroEstado}' → '${nuevoFiltro}'`);
    setFiltroEstado(nuevoFiltro);
    if (typeof window !== 'undefined') {
      localStorage.setItem('embarques-filtro-estado', nuevoFiltro);
      console.log(`🔧 [FILTRO] Guardado en localStorage: '${nuevoFiltro}'`);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [embarqueEditando, setEmbarqueEditando] = useState<Embarque | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Contacto detallado para el modal (asegura que "puesto" venga de contactos_clientes y permite mostrar notas)
  const [detalleContacto, setDetalleContacto] = useState<any | null>(null);
  const [embarqueDetalle, setEmbarqueDetalle] = useState<Embarque | null>(null);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const [showEliminarArchivadoDialog, setShowEliminarArchivadoDialog] = useState(false);
  const [embarqueAEliminar, setEmbarqueAEliminar] = useState<Embarque | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingEmbarque, setCancelingEmbarque] = useState<Embarque | null>(
    null
  );
  const [showArchivarDialog, setShowArchivarDialog] = useState(false);
  const [embarqueAArchivar, setEmbarqueAArchivar] = useState<Embarque | null>(null);
  const [showCompletarDialog, setShowCompletarDialog] = useState(false);
  const [embarqueACompletar, setEmbarqueACompletar] = useState<Embarque | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [proximoFolio, setProximoFolio] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [publicGeneratedLink, setPublicGeneratedLink] = useState("");
  const [publicLinkExpiresAt, setPublicLinkExpiresAt] = useState<string | null>(null);
  const [publicExpirationInput, setPublicExpirationInput] = useState<string | null>(null);
  const [publicForEmbarqueId, setPublicForEmbarqueId] = useState<string | null>(null);
  const [embarqueFotos, setEmbarqueFotos] = useState<FotoEmbarque[]>([]);

  // Persistencia local (client-side) para marcar embarques que el usuario completó
  // Esto evita que el botón "Completar y Enviar" reaparezca después de recargar
  const LOCAL_KEY_COMPLETADOS = 'embarques_completados_local_v1';
  const getCompletedLocal = (): string[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY_COMPLETADOS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };
  const addCompletedLocal = (id: string) => {
    try {
      const arr = new Set(getCompletedLocal());
      arr.add(String(id));
      localStorage.setItem(LOCAL_KEY_COMPLETADOS, JSON.stringify(Array.from(arr)));
    } catch (e) {}
  };
  const removeCompletedLocal = (id: string) => {
    try {
      const arr = new Set(getCompletedLocal());
      arr.delete(String(id));
      localStorage.setItem(LOCAL_KEY_COMPLETADOS, JSON.stringify(Array.from(arr)));
    } catch (e) {}
  };

  const { toast } = useToast();

  // Parse a date-only string (YYYY-MM-DD) into a local Date at midnight
  const parseDateOnlyLocal = (value?: string | null) => {
    if (!value) return null;
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split("-");
        return new Date(Number(y), Number(m) - 1, Number(d));
      }
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return null;
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    } catch (e) {
      return null;
    }
  };

  // Estado para el formulario
  const [formData, setFormData] = useState({
    folio: "",
    cliente_id: "",
    camion_id: "",
    remolque_id: "",
    contenido: "",
    peso: "",
    observaciones: "",
    // New: support multiple recolecta/entrega points. Each item: { direccion, fecha, hora }
    recolectas: [
      { direccion: "", fecha: "", hora: "" },
    ],
    entregas: [{ direccion: "", fecha: "", hora: "" }],
    load_number: "",
    patente_agente_aduanal: "",
    aduana_cruce: "",
    dueno_mercancia: "",
    representante_cliente: "",
    carta_porte: "",
    tipo_servicio_id: "",
  camion_manual: false,
  camion_numero_economico: "",
  camion_placa: "",
    remolque_manual: false,
    remolque_numero_economico: "",
    remolque_placa: "",
  // remolque_sello_fiscal removido (no se usa)
  });

  // Validaciones para "Nuevo Embarque"
  const isClienteSelected = !!formData.cliente_id && formData.cliente_id !== "none";
  const isTipoServicioSelected = !!formData.tipo_servicio_id && formData.tipo_servicio_id !== "none";
  const isRemolqueValid = formData.remolque_manual
    ? (formData.remolque_numero_economico.trim() !== "" || formData.remolque_placa.trim() !== "")
    : (!!formData.remolque_id && formData.remolque_id !== "none");
  const isNuevoEmbarqueValid = isClienteSelected && isRemolqueValid && isTipoServicioSelected;

  // Cargar datos iniciales
  useEffect(() => {
    console.log(`🔧 [MOUNT] Componente montado, filtro inicial: '${filtroEstado}'`);
    loadData();
    cargarProximoFolio();
    cargarPrecioGlobalFleteFalso();
  }, []);

  const cargarPrecioGlobalFleteFalso = async () => {
    try {
      const res = await fetch('/api/config/flete-falso');
      if (res.ok) {
        const data = await res.json();
        const precio = Number(data.precio);
        if (!isNaN(precio)) {
          setPrecioGlobalFleteFalso(precio);
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar precio global de flete falso, usando 800.00');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEmbarques(),
        loadClientes(),
        loadOperadores(),
        loadCamiones(),
        loadRemolques(),
        loadTiposServicio(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmbarques = async () => {
    try {
      console.log("🔄 Cargando embarques desde tablas legacy Y normalizadas...");
      
      // 1. Cargar embarques LEGACY
      const { data: embarquesLegacy, error: errorLegacy } = await supabase
        .from("embarques")
        .select(
          `
          *,
          cliente:clientes(*),
          operador:operadores(*),
          camion:camiones(*),
          remolque:remolques(*)
        `
        )
        .order("fecha_creacion", { ascending: false });

      if (errorLegacy) {
        console.error("Error loading embarques legacy:", errorLegacy);
      }

      // 2. ELIMINADO: Ya no usamos tabla normalizada embarques_nuevo
      // Todos los datos vienen de la tabla embarques legacy
      const embarquesNormalizados: any[] = [];
      const errorNormalizado = null;

      if (errorNormalizado) {
        console.error("Error loading embarques normalizados:", errorNormalizado);
      }

      // 3. Combinar y transformar embarques normalizados al formato legacy para compatibilidad
      const embarquesNormalizadosCompatibles = (embarquesNormalizados || []).map((embarque: any) => {
        const ubicacion = embarque.ubicaciones?.[0] || {};
        const financiero = embarque.financiero?.[0] || {};
        const estado = embarque.estado?.[0] || {};
        const documento = embarque.documentos?.[0] || {};
        const adicional = embarque.adicional?.[0] || {};

        return {
          ...embarque,
          // Mapear campos de ubicaciones
          origen: ubicacion.origen || 'Por definir',
          destino: ubicacion.destino || 'Por definir',
          direccion_recolecta: ubicacion.direccion_recolecta,
          direccion_entrega: ubicacion.direccion_entrega,
          fecha_recolecta: ubicacion.fecha_recolecta,
          hora_recolecta: ubicacion.hora_recolecta,
          fecha_entrega: ubicacion.fecha_entrega,
          hora_entrega: ubicacion.hora_entrega,
          aduana_cruce: ubicacion.aduana_cruce,
          patente_agente_aduanal: ubicacion.patente_agente_aduanal,
          
          // Mapear campos financieros (usar arquitectura desacoplada)
          precio_flete: embarque.tipo_servicio_precio || financiero.precio_flete || 0,
          precio_operador: embarque.precio_operador_final || financiero.precio_operador || 0,
          tipo_servicio_nombre: embarque.tipo_servicio_nombre || financiero.tipo_servicio_nombre,
          flete_falso: financiero.flete_falso || false,
          
          // Mapear campos de estado (derivar desde fechas para arquitectura normalizada)
          estado: (() => {
            const folio = embarque.folio;
            const estadoOriginal = embarque.estado;
            const estadoNormalizado = estado.estado;
            
            // 🔧 DEBUG: Logging para diagnóstico
            if (folio) {
              console.log(`🔧 [MAPEO] ${folio}: estadoLegacy='${estadoOriginal}', estadoNorm='${estadoNormalizado}'`);
            }
            
            // 🔧 PRIORIDAD 1: Si existe el campo estado en la tabla embarques_estado (arquitectura normalizada)
            if (estado.estado) {
              console.log(`🔧 [MAPEO] ${folio}: Usando estado normalizado '${estado.estado}'`);
              return estado.estado;
            }
            
            // 🔧 PRIORIDAD 2: Derivar desde fechas específicas (arquitectura normalizada)
            if (estado.fecha_cancelacion) {
              console.log(`🔧 [MAPEO] ${folio}: Derivado 'cancelado' por fecha_cancelacion`);
              return 'cancelado';
            }
            if (estado.fecha_archivado) {
              console.log(`🔧 [MAPEO] ${folio}: Derivado 'archivado' por fecha_archivado`);
              return 'archivado';
            }
            if (estado.fecha_finalizacion) {
              console.log(`🔧 [MAPEO] ${folio}: Derivado 'finalizado' por fecha_finalizacion`);
              return 'finalizado';
            }
            if (estado.fecha_pago && estado.pagado) {
              console.log(`🔧 [MAPEO] ${folio}: Derivado 'entregado' por fecha_pago+pagado`);
              return 'entregado';
            }
            if (estado.fecha_completado) {
              console.log(`🔧 [MAPEO] ${folio}: Derivado 'listo-para-asignar' por fecha_completado`);
              return 'listo-para-asignar';
            }
            
            // 🔧 PRIORIDAD 3: Si no hay info en tabla normalizada, usar estado legacy
            // PERO con lógica inteligente para mantener funcionalidad del botón
            if (embarque.estado) {
              // Normalizar distintos formatos que puedan venir (array, objeto, string)
              try {
                // Caso: arquitectura normalizada embebe un array en `embarque.estado`
                if (Array.isArray(embarque.estado) && embarque.estado[0]) {
                  const posible = (embarque.estado[0] as any).estado || (embarque.estado[0] as any).nombre || null;
                  if (posible === 'creado') {
                    console.log(`🔧 [MAPEO] ${folio}: Conservando 'creado' desde array → BOTÓN VISIBLE`);
                    return 'creado';
                  }
                  if (typeof posible === 'string' && posible) {
                    console.log(`🔧 [MAPEO] ${folio}: Usando estado legacy desde array '${posible}'`);
                    return posible;
                  }
                }

                // Caso: puede venir como objeto con campo `estado`
                if (typeof embarque.estado === 'object' && embarque.estado !== null) {
                  const posibleObj = (embarque.estado as any).estado || (embarque.estado as any).nombre || null;
                  if (posibleObj === 'creado') {
                    console.log(`🔧 [MAPEO] ${folio}: Conservando 'creado' desde objeto → BOTÓN VISIBLE`);
                    return 'creado';
                  }
                  if (typeof posibleObj === 'string' && posibleObj) {
                    console.log(`🔧 [MAPEO] ${folio}: Usando estado legacy desde objeto '${posibleObj}'`);
                    return posibleObj;
                  }
                }

                // Caso: valor primitivo (string)
                if (typeof embarque.estado === 'string') {
                  if (embarque.estado === 'creado') {
                    console.log(`🔧 [MAPEO] ${folio}: Conservando 'creado' → BOTÓN VISIBLE`);
                    return 'creado';
                  }
                  console.log(`🔧 [MAPEO] ${folio}: Usando estado legacy '${embarque.estado}'`);
                  return embarque.estado;
                }
              } catch (e) {
                console.warn(`⚠️ [MAPEO] ${folio}: Error normalizando estado legacy`, e);
              }
            }
            
            // 🔧 FALLBACK: Estado por defecto para nuevos embarques
            console.log(`🔧 [MAPEO] ${folio}: Usando estado por defecto 'creado'`);
            return 'creado';
          })(),
          estado_facturacion: estado.estado_facturacion || 'pendiente_facturacion',
          pagado: estado.pagado || false,
          fecha_creacion: estado.fecha_creacion || embarque.created_at,
          
          // Mapear documentos
          carta_porte: documento.carta_porte,
          
          // Mapear campos adicionales
          dueno_mercancia: adicional.dueno_mercancia,
          representante_cliente: adicional.representante_cliente,
          info_representante: adicional.info_representante,
          observaciones: adicional.observaciones,
          
          // Marcar como normalizado para distinguir
          _fuente: 'normalizado'
        };
      });

      // 4. Combinar ambas fuentes
      const embarquesCombinados = [
        ...(embarquesNormalizadosCompatibles || []),
        ...(embarquesLegacy || []).map((e: any) => ({ ...e, _fuente: 'legacy' }))
      ];

      // 4.1. Deduplicar embarques (priorizar normalizados sobre legacy)
      const embarquesUnicos = new Map();
      
      embarquesCombinados.forEach(embarque => {
        const id = embarque.id;
        const existing = embarquesUnicos.get(id);
        
        if (!existing) {
          embarquesUnicos.set(id, embarque);
        } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
          // Priorizar versión normalizada sobre legacy
          embarquesUnicos.set(id, embarque);
          console.log(`🔄 Reemplazando ${id} legacy con normalizado`);
        } else if (embarque._fuente === 'legacy' && existing._fuente === 'normalizado') {
          // Mantener versión normalizada, ignorar legacy
          console.log(`⚠️ Ignorando ${id} legacy (ya existe normalizado)`);
        }
      });
      
  let todosLosEmbarques = Array.from(embarquesUnicos.values());
      console.log(`🔀 Deduplicación: ${embarquesCombinados.length} → ${todosLosEmbarques.length} embarques únicos`);

      // 5. Ordenar por fecha de creación
      todosLosEmbarques.sort((a, b) => {
        const fechaA = new Date(a.fecha_creacion || a.created_at).getTime();
        const fechaB = new Date(b.fecha_creacion || b.created_at).getTime();
        return fechaB - fechaA; // Más reciente primero
      });

      // Log específico para TIM-2509-039
      const tim039Legacy = embarquesLegacy?.find(e => e.id === 'TIM-2509-039');
      const tim039Norm = embarquesNormalizados?.find(e => e.id === 'TIM-2509-039');
      const tim039Final = todosLosEmbarques.find(e => e.id === 'TIM-2509-039');
      
      console.log(`🔍 TIM-2509-039 - Legacy: ${tim039Legacy ? '✅' : '❌'}, Normalizado: ${tim039Norm ? '✅' : '❌'}, Final: ${tim039Final ? '✅' : '❌'}`);
      
      if (tim039Norm) {
        console.log('📋 TIM-2509-039 detalles normalizados:', {
          id: tim039Norm.id,
          tipo_servicio_precio: tim039Norm.tipo_servicio_precio,
          precio_operador_final: tim039Norm.precio_operador_final,
          tipo_servicio_nombre: tim039Norm.tipo_servicio_nombre
        });
      }

      console.log(`✅ Embarques cargados: ${embarquesLegacy?.length || 0} legacy + ${embarquesNormalizados?.length || 0} normalizados = ${todosLosEmbarques.length} total`);
      
      // 🔧 DIAGNÓSTICO: Verificar estados después de cargar
      const estadosUnicos = new Set(todosLosEmbarques.map(e => e.estado));
      console.log(`📊 Estados presentes: ${Array.from(estadosUnicos).join(', ')}`);
      
      const listos = todosLosEmbarques.filter(e => e.estado === 'listo-para-asignar');
      if (listos.length > 0) {
        console.log(`🟢 Embarques listo-para-asignar: ${listos.map(e => e.folio).join(', ')}`);
      }

      // 🔧 Tracking del embarque de prueba
      const embarquePrueba = todosLosEmbarques.find(e => e.folio?.includes('FLOW-1758831360353'));
      if (embarquePrueba) {
        console.log(`🔧 [CARGA] Embarque de prueba cargado:`, {
          folio: embarquePrueba.folio,
          estado: embarquePrueba.estado,
          fecha_cancelacion: embarquePrueba.fecha_cancelacion,
          fecha_archivado: embarquePrueba.fecha_archivado,
          _fuente: embarquePrueba._fuente
        });
      }
      
      // Aplicar marcas locales de completado (persistidas en localStorage)
      try {
        const completados = getCompletedLocal();
        if (completados.length > 0) {
          todosLosEmbarques = todosLosEmbarques.map((e: any) => {
            if (completados.includes(String(e.id))) {
              return { ...e, estado: 'listo-para-asignar', _completadoLocal: true };
            }
            return e;
          });
        }
      } catch (e) {
        console.warn('No se pudo aplicar completados locales', e);
      }

      setEmbarques(todosLosEmbarques);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("estado", "activo")
        .order("nombre");

      if (error) {
        console.error("Error loading clientes:", error);
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadOperadores = async () => {
    try {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .eq("estado", "activo")
        .order("nombre");

      if (error) {
        console.error("Error loading operadores:", error);
        return;
      }

      setOperadores(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadCamiones = async () => {
    try {
      const { data, error } = await supabase
        .from("camiones")
        .select("*")
        .order("numero_economico");

      if (error) {
        console.error("Error loading camiones:", error);
        return;
      }

      setCamiones(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadRemolques = async () => {
    try {
      const { data, error } = await supabase
        .from("remolques")
        .select("*")
        .order("numero_economico");

      if (error) {
        console.error("Error loading remolques:", error);
        return;
      }

      setRemolques(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadTiposServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("tipos_servicio")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) {
        console.warn("Tabla tipos_servicio no existe aún:", error);
        setTiposServicio([]);
        return;
      }

      setTiposServicio(data || []);
    } catch (error) {
      console.warn(
        "Error loading tipos servicio (tabla puede no existir):",
        error
      );
      setTiposServicio([]);
    }
  };

  const generarFolioEspecifico = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");

      const baseFormat = `TIM-${year}${month}`;

      // Consultar último folio solo en tabla embarques
      const { data: ultimoFolio, error: folioError } = await supabase
        .from("embarques")
        .select("folio")
        .like("folio", `${baseFormat}-%`)
        .order("folio", { ascending: false })
        .limit(1);

      if (folioError || !ultimoFolio || ultimoFolio.length === 0) {
        return `${baseFormat}-001`;
      }

      const ultimoNumero = ultimoFolio[0].folio;
      
      // Extraer el número secuencial del folio
      const match = /-(\d{3})$/.exec(ultimoNumero);
      const numeroActual = match ? parseInt(match[1], 10) : 0;
      const siguienteNumero = numeroActual + 1;

      const siguiente = String(siguienteNumero).padStart(3, "0");
      return `${baseFormat}-${siguiente}`;
    } catch (error) {
      console.error("Error generating folio:", error);
      return "Error al generar";
    }
  };

  const cargarProximoFolio = async () => {
    try {
      const folio = await generarFolioEspecifico();
      setProximoFolio(folio);
    } catch (error) {
      console.error("Error generando folio:", error);
      setProximoFolio("Error al generar");
    }
  };

  const cargarContactos = async (clienteId: string) => {
    if (!clienteId || clienteId === "none") {
      setContactos([]);
      return;
    }

    try {
      console.log("Cargando contactos para cliente:", clienteId);
      const contactosData = await obtenerContactosCliente(clienteId);
      console.log("Contactos cargados:", contactosData);
      setContactos(contactosData);
    } catch (error) {
      console.error("Error cargando contactos:", error);
      setContactos([]);
    }
  };

  // Carga el contacto seleccionado para el embarque al abrir el modal de detalles
  useEffect(() => {
    const cargarContactoDetalle = async () => {
      try {
        if (!showDetailModal || !embarqueDetalle) {
          setDetalleContacto(null);
          return;
        }

        // Asegura tener la lista de contactos del cliente disponible (recarga siempre para evitar desface)
        try {
          if ((embarqueDetalle as any)?.cliente_id) {
            await cargarContactos((embarqueDetalle as any).cliente_id);
          }
        } catch {}

        const infoRep: any = (embarqueDetalle as any)?.info_representante || {};
        const contactoId = infoRep?.id || (embarqueDetalle as any)?.representante_cliente;

        // Intento 1: buscar por id directo en la tabla
        if (contactoId) {
          const { data, error } = await supabase
            .from("contactos_clientes")
            .select("id,nombre,apellidos,telefono,email,puesto,notas,es_principal")
            .eq("id", contactoId)
            .single();
          if (!error && data) {
            setDetalleContacto(data);
            return;
          }
        }

        // Intento 2: fallback con la lista en memoria
        const matchLocal = contactos?.find((c) =>
          (contactoId && c.id === contactoId) ||
          (infoRep?.email && c.email === infoRep.email) ||
          (infoRep?.telefono && c.telefono === infoRep.telefono)
        );
        if (matchLocal) {
          setDetalleContacto(matchLocal as any);
          return;
        }

        // Intento 3: si tenemos email/telefono, probar una búsqueda por esos campos (misma tabla)
        if ((embarqueDetalle as any)?.cliente_id && (infoRep?.email || infoRep?.telefono)) {
          let q = supabase
            .from("contactos_clientes")
            .select("id,nombre,apellidos,telefono,email,puesto,notas,es_principal")
            .eq("cliente_id", (embarqueDetalle as any).cliente_id);
          if (infoRep?.email) q = q.eq("email", infoRep.email);
          else if (infoRep?.telefono) q = q.eq("telefono", infoRep.telefono);
          const { data, error } = await q.maybeSingle();
          if (!error && data) {
            setDetalleContacto(data);
            return;
          }
        }

        // Intento 3b: búsqueda por nombre y apellidos en la lista local si existen
        const norm = (s: any) => (s ? String(s).trim().toLowerCase() : "");
        if (infoRep?.nombre || infoRep?.apellidos) {
          const byName = contactos?.find(
            (c) => norm(c.nombre) === norm(infoRep.nombre) && norm((c as any).apellidos) === norm(infoRep.apellidos)
          );
          if (byName) {
            setDetalleContacto(byName as any);
            return;
          }
        }

        // Intento 4: tomar el contacto principal del cliente si existe
        if ((embarqueDetalle as any)?.cliente_id) {
          const { data: principal, error: errPrincipal } = await supabase
            .from("contactos_clientes")
            .select("id,nombre,apellidos,telefono,email,puesto,notas,es_principal")
            .eq("cliente_id", (embarqueDetalle as any).cliente_id)
            .eq("es_principal", true)
            .maybeSingle();
          if (!errPrincipal && principal) {
            setDetalleContacto(principal);
            return;
          }
          // En última instancia, traer uno cualquiera (el primero)
          const { data: alguno, error: errUno } = await supabase
            .from("contactos_clientes")
            .select("id,nombre,apellidos,telefono,email,puesto,notas,es_principal")
            .eq("cliente_id", (embarqueDetalle as any).cliente_id)
            .limit(1)
            .maybeSingle();
          if (!errUno && alguno) {
            setDetalleContacto(alguno);
            return;
          }
        }

        // Si no se encontró nada, dejar null para caer en los valores del info_representante
        setDetalleContacto(null);
      } catch (e) {
        console.warn("Error cargando contacto del detalle:", (e as any)?.message || e);
        setDetalleContacto(null);
      }
    };
    cargarContactoDetalle();
  }, [showDetailModal, embarqueDetalle, contactos]);

  const resetForm = () => {
    setFormData({
      folio: "",
      cliente_id: "",
      camion_id: "",
      remolque_id: "",
      contenido: "",
      peso: "",
      observaciones: "",
  recolectas: [{ direccion: "", fecha: "", hora: "" }],
  entregas: [{ direccion: "", fecha: "", hora: "" }],
      load_number: "",
      patente_agente_aduanal: "",
      aduana_cruce: "",
      dueno_mercancia: "",
      representante_cliente: "",
      carta_porte: "",
      tipo_servicio_id: "",
  camion_manual: false,
  camion_numero_economico: "",
  camion_placa: "",
      remolque_manual: false,
      remolque_numero_economico: "",
      remolque_placa: "",
  // remolque_sello_fiscal removido (no se usa)
    });
    setEmbarqueEditando(null);
    setContactos([]);
    if (!embarqueEditando) {
      cargarProximoFolio();
    }
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Llena todos los campos del formulario con valores de ejemplo/sensatos
  const handleFillAllFields = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const addDays = (d: Date, days: number) =>
      new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const sampleClienteId = clientes[0]?.id || "none";
    const sampleTipoServicioId = tiposServicio[0]?.id || "";
    const sampleRemolqueId = remolques[0]?.id || "";
    const useManualRemolque = remolques.length === 0;

    // Prellenar campos principales
    setFormData((prev) => ({
      ...prev,
      cliente_id: sampleClienteId,
      tipo_servicio_id: sampleTipoServicioId,
      representante_cliente: "",
      recolectas: [
        {
          direccion: "Parque Industrial Norte #100, Col. Centro, Monterrey, NL",
          fecha: formatDate(now),
          hora: formatTime(9, 0),
        },
      ],
      entregas: [
        {
          direccion: "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, MX",
          fecha: formatDate(addDays(now, 1)),
          hora: formatTime(17, 0),
        },
      ],
      contenido: "Tarimas con mercancía general",
      peso: "1250",
      observaciones:
        "Entregar antes de las 17:00 horas. Requiere sello en recibo.",
      load_number: `LD-${year}${month}-001`,
      patente_agente_aduanal: "1234",
      aduana_cruce: "Nuevo Laredo, TAMPS",
      dueno_mercancia: "Cliente Demo SA de CV",
      carta_porte: `CP-${year}${month}-0001`,
      remolque_manual: useManualRemolque,
      remolque_id: useManualRemolque ? "" : sampleRemolqueId,
      remolque_numero_economico: useManualRemolque ? "RM-001" : "",
  remolque_placa: useManualRemolque ? "XYZ-123-45" : "",
    }));

    // Si hay cliente, intenta preseleccionar el primer contacto disponible
    if (sampleClienteId && sampleClienteId !== "none") {
      try {
        const lista = await obtenerContactosCliente(sampleClienteId);
        const contactId = lista[0]?.id || "none";
        setContactos(lista);
        setFormData((prev) => ({
          ...prev,
          representante_cliente: contactId,
        }));
      } catch (e) {
        // Ignorar errores silenciosamente para no bloquear el autofill
      }
    }
  };

  // Función helper para detectar si un embarque tiene múltiples direcciones
  const tieneMultiplesDirecciones = (recolectas: any[], entregas: any[]) => {
    const recolectasValidas = recolectas.filter((r: any) => r.direccion?.trim());
    const entregasValidas = entregas.filter((e: any) => e.direccion?.trim());
    return recolectasValidas.length > 1 || entregasValidas.length > 1;
  };

  // Función helper para detectar si un embarque es flete falso (contingencia FF)
  const embarqueEsFleteFalso = (embarque: any) => {
    // Solo mostrar F. Falso cuando el embarque tiene estado modificado FF (contingencia)
    return embarque?.estado?.includes('_contingencia_FF') || false;
  };

  // Función para extraer múltiples direcciones de las observaciones
  const extraerDireccionesMultiples = (observaciones: string | null) => {
    if (!observaciones) return { recolectas: [], entregas: [], observacionesLimpias: "" };

    const marcador = "--- DIRECCIONES MÚLTIPLES ---";
    const partes = observaciones.split(marcador);
    
    if (partes.length < 2) {
      // No hay direcciones múltiples guardadas
      return { recolectas: [], entregas: [], observacionesLimpias: observaciones };
    }

    const observacionesLimpias = partes[0].trim();
    const direccionesTexto = partes[1];

    const recolectas: Array<{direccion: string, fecha: string, hora: string}> = [];
    const entregas: Array<{direccion: string, fecha: string, hora: string}> = [];

    try {
      const lineas = direccionesTexto.split('\n').map(l => l.trim()).filter(l => l);
      let seccionActual = '';

      for (const linea of lineas) {
        if (linea === 'RECOLECCIONES:') {
          seccionActual = 'recolecciones';
          continue;
        }
        if (linea === 'ENTREGAS:') {
          seccionActual = 'entregas';
          continue;
        }

        // Parsear línea de dirección: "1. Dirección (fecha hora)"
        const match = linea.match(/^\d+\.\s*(.+?)(\s*\(([^)]+)\))?$/);
        if (match) {
          const direccion = match[1].trim();
          const fechaHora = match[3] || '';
          
          // Separar fecha y hora si están presentes
          const partesFechaHora = fechaHora.split(' ').filter(p => p);
          const fecha = partesFechaHora[0] || '';
          const hora = partesFechaHora[1] || '';

          const direccionObj = { direccion, fecha, hora };

          if (seccionActual === 'recolecciones') {
            recolectas.push(direccionObj);
          } else if (seccionActual === 'entregas') {
            entregas.push(direccionObj);
          }
        }
      }
    } catch (e) {
      console.warn('Error parseando direcciones múltiples:', e);
    }

    return { recolectas, entregas, observacionesLimpias };
  };

  const handleEdit = async (embarque: Embarque) => {
    // Extraer direcciones múltiples de observaciones si existen
    const { recolectas, entregas, observacionesLimpias } = extraerDireccionesMultiples(embarque.observaciones || null);

    // Si no se encontraron direcciones múltiples, usar los campos legacy
    const recolectasFinales = recolectas.length > 0 ? recolectas : [
      {
        direccion: (embarque as any).direccion_recolecta || "",
        fecha: (embarque as any).fecha_recolecta || "",
        hora: (embarque as any).hora_recolecta || "",
      },
    ];

    const entregasFinales = entregas.length > 0 ? entregas : [
      {
        direccion: (embarque as any).direccion_entrega || "",
        fecha: (embarque as any).fecha_entrega || "",
        hora: (embarque as any).hora_entrega || "",
      },
    ];

    setFormData({
      folio: embarque.folio,
      cliente_id: embarque.cliente_id || "",
      camion_id: embarque.camion_id || "",
      remolque_id: embarque.remolque_id || "",
      // Usar las direcciones múltiples extraídas o las legacy
      recolectas: recolectasFinales,
      entregas: entregasFinales,
      contenido: embarque.contenido || "",
      peso: embarque.peso?.toString() || "",
      observaciones: observacionesLimpias || "", // Usar las observaciones limpias sin las direcciones
      load_number: embarque.load_number || "",
      patente_agente_aduanal: embarque.patente_agente_aduanal || "",
      aduana_cruce: embarque.aduana_cruce || "",
      dueno_mercancia: embarque.dueno_mercancia || "",
      representante_cliente: embarque.representante_cliente || "",
      carta_porte: embarque.carta_porte || "",
      tipo_servicio_id: embarque.tipo_servicio_id || "",
      remolque_manual:
        !embarque.remolque_id &&
        (embarque.remolque_numero_economico || embarque.remolque_placa)
          ? true
          : false,
      remolque_numero_economico: embarque.remolque_numero_economico || "",
      remolque_placa: embarque.remolque_placa || "",
      camion_manual: !(embarque as any).camion_id && ((embarque as any).camion_numero_economico || (embarque as any).camion_placa) ? true : false,
      camion_numero_economico: (embarque as any).camion_numero_economico || "",
      camion_placa: (embarque as any).camion_placa || "",
  // remolque_sello_fiscal removido (no se usa)
    });

    if (embarque.cliente_id) {
      await cargarContactos(embarque.cliente_id);
    }

    setEmbarqueEditando(embarque);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    // Validación: fecha_recolecta no puede ser después de fecha_entrega
    // Helper: consider a direccion valid only if it's non-empty and not a placeholder
    const isValidDireccion = (d: any) => {
      const dir = String(d ?? "").trim();
      if (!dir) return false;

      const s = dir.toLowerCase();

      // Reject single-letter values (e.g. 'S') and extremely short values
      if (s.length <= 1) return false;

      // Common placeholder values to ignore
      const placeholders = new Set([
        "s",
        "-",
        "--",
        "---",
        "placeholder",
        "sin direccion",
        "sin dirección",
        "n/a",
        "na",
        "none",
      ]);
      if (placeholders.has(s)) return false;

      // Reject values that are only punctuation (e.g. '---', '...')
      if (/^[^\w\d]+$/.test(s)) return false;

      // Looks reasonable
      return true;
    };

    try {
      // Compare first recolecta date vs last entrega date (if present)
      // For origin/destination display, choose the first/last non-empty raw direccion as fallback
      const firstReco = (formData.recolectas || []).find((r: any) => (r.direccion || "").trim() !== "") || (formData.recolectas || [])[0];
      const lastEntrega = (formData.entregas || []).slice().reverse().find((e: any) => (e.direccion || "").trim() !== "") || (formData.entregas || [])[0];
      if (firstReco?.fecha && lastEntrega?.fecha) {
        const fr = parseDateOnlyLocal(firstReco.fecha) ?? new Date(firstReco.fecha);
        const fe = parseDateOnlyLocal(lastEntrega.fecha) ?? new Date(lastEntrega.fecha);
        if (fr && fe && fr.getTime() > fe.getTime()) {
          toast({
            title: "Fechas inconsistentes",
            description: "La fecha de recolecta no puede ser posterior a la fecha de entrega.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (e) {
      // si el parse falla, dejar que las validaciones posteriores manejen el caso
    }
    // Require at least one recolecta and one entrega with direccion
    const hasReco = (formData.recolectas || []).some((r: any) => (r.direccion || "").trim() !== "");
    const hasEnt = (formData.entregas || []).some((e: any) => (e.direccion || "").trim() !== "");
    if (!hasReco || !hasEnt) {
      toast({
        title: "Campos obligatorios",
        description: "Agrega al menos una dirección de recolecta y una de entrega",
        variant: "destructive",
      });
      return;
    }

    // Validación específica para creación: requiere Cliente y Remolque (o captura manual)
    if (!embarqueEditando) {
      if (!isClienteSelected || !isRemolqueValid) {
        toast({
          title: "Datos incompletos",
          description: "Selecciona cliente y remolque (o captura remolque manual)",
          variant: "destructive",
        });
        return;
      }
      // Nuevo: exigir tipo de servicio seleccionado al crear embarque
      if (!isTipoServicioSelected) {
        toast({
          title: "Tipo de servicio requerido",
          description: "Selecciona un tipo de servicio antes de crear el embarque",
          variant: "destructive",
        });
        return;
      }
    }

    // Validación para remolque manual: capturar al menos número económico o placa
    if (
      formData.remolque_manual &&
      !formData.remolque_numero_economico.trim() &&
      !formData.remolque_placa.trim()
    ) {
      toast({
        title: "Remolque incompleto",
        description: "Captura número económico o placa para remolque no registrado",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      let folio = formData.folio;

      if (!embarqueEditando) {
        folio = await generarFolioEspecifico();
      }

      let infoContacto = null;
      if (
        formData.representante_cliente &&
        formData.representante_cliente !== "none"
      ) {
        const contacto = contactos.find(
          (c) => c.id === formData.representante_cliente
        );
        if (contacto) {
          infoContacto = {
            id: contacto.id,
            nombre: contacto.nombre,
            telefono: contacto.telefono,
            email: contacto.email,
            puesto: contacto.puesto,
            notas: (contacto as any)?.notas || null,
            es_principal: contacto.es_principal,
          };
        }
      }

  const firstReco = (formData.recolectas || []).find((r: any) => (r.direccion || "").trim() !== "") || (formData.recolectas || [])[0];
  const lastEntrega = (formData.entregas || []).slice().reverse().find((e: any) => (e.direccion || "").trim() !== "") || (formData.entregas || [])[0];

  const embarqueData: any = {
        folio,
        cliente_id:
          formData.cliente_id && formData.cliente_id !== "none"
            ? formData.cliente_id
            : null,
        operador_id: null,
        camion_id:
          formData.camion_id && formData.camion_id !== "none"
            ? formData.camion_id
            : null,
        remolque_id:
          formData.remolque_id && formData.remolque_id !== "none"
            ? formData.remolque_id
            : null,
        origen: (firstReco && firstReco.direccion) || "Por definir",
        destino: (lastEntrega && lastEntrega.direccion) || "Por definir",
        // keep legacy single fields for compatibility
        direccion_recolecta: firstReco?.direccion || null,
        direccion_entrega: lastEntrega?.direccion || null,
        fecha_recolecta: firstReco?.fecha ? normalizeDate(firstReco.fecha) : null,
        hora_recolecta: firstReco?.hora || null,
        fecha_entrega: lastEntrega?.fecha ? normalizeDate(lastEntrega.fecha) : null,
        hora_entrega: lastEntrega?.hora || null,
  // we'll merge the full arrays into observaciones below to avoid DB migrations
        contenido: formData.contenido || null,
        peso: formData.peso ? Number.parseFloat(formData.peso) : null,
        estado: embarqueEditando ? embarqueEditando.estado : "creado",
        load_number: formData.load_number || null,
        patente_agente_aduanal: formData.patente_agente_aduanal || null,
        aduana_cruce: formData.aduana_cruce || null,
        dueno_mercancia: formData.dueno_mercancia || null,
        representante_cliente:
          formData.representante_cliente &&
          formData.representante_cliente !== "none"
            ? formData.representante_cliente
            : null,
        info_representante: infoContacto,
        carta_porte: formData.carta_porte || null,
        tipo_servicio_id:
          formData.tipo_servicio_id && formData.tipo_servicio_id !== "none"
            ? formData.tipo_servicio_id
            : null,
        updated_at: new Date().toISOString(),
        // camion manual fields
        camion_numero_economico: formData.camion_manual
          ? formData.camion_numero_economico
          : null,
        camion_placa: formData.camion_manual
          ? formData.camion_placa
          : null,
        // remolque manual fields
        remolque_numero_economico: formData.remolque_manual
          ? formData.remolque_numero_economico
          : null,
        remolque_placa: formData.remolque_manual
          ? formData.remolque_placa
          : null,
        // Si el embarque está siendo editado, marcamos como modificado
        modificado: !!embarqueEditando,
      };

      try {
        // Mantener las observaciones del usuario tal como están
        embarqueData.observaciones = formData.observaciones || null;
        
        // Guardar direcciones múltiples en campos JSON
        embarqueData.recolectas_json = (formData.recolectas || []).length > 1 ? JSON.stringify(formData.recolectas || []) : null;
        embarqueData.entregas_json = (formData.entregas || []).length > 1 ? JSON.stringify(formData.entregas || []) : null;
        
      } catch (error) {
        console.warn("Campo observaciones no disponible en el esquema actual");
      }

  // Sello fiscal del remolque eliminado del flujo

      console.log("Datos a guardar:", embarqueData);

      // Clean payload: some deployments may not have legacy columns (e.g. camion_numero_economico)
      const payloadToSend: any = { ...embarqueData };
      // Remove camion manual legacy columns if present on payload to avoid PGRST204 errors
      if (payloadToSend.hasOwnProperty("camion_numero_economico")) {
        try { delete payloadToSend.camion_numero_economico; console.log('Removed payload field: camion_numero_economico'); } catch {}
      }
      if (payloadToSend.hasOwnProperty("camion_placa")) {
        try { delete payloadToSend.camion_placa; console.log('Removed payload field: camion_placa'); } catch {}
      }

      if (embarqueEditando) {
        const { data: updateData, error } = await supabase
          .from("embarques")
          .update(payloadToSend)
          .eq("id", embarqueEditando.id)
          .select();
        if (error) {
          console.error("Error actualizando embarque:", error);
          console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
          toast({ title: "Error al actualizar embarque", description: (error as any)?.message || (error as any)?.details || "Revisa la consola para más detalles", variant: "destructive" });
          return;
        }
        try { agregarAuditLog("ACTUALIZAR", "Embarques", `Folio: ${folio} | Usuario: ${getCurrentUser()?.nombre || ''}`); } catch {}
      } else {
        // ✅ CREAR EMBARQUE SOLO EN TABLA EMBARQUES LEGACY
        console.log("🔧 Creando embarque en tabla embarques...", {folio, embarqueData});
        
        // Validación de campos críticos antes de insertar
        if (!folio || folio.trim() === '') {
          console.error("❌ Error: Folio vacío o undefined", folio);
          toast({
            title: "Error de validación",
            description: "Folio es requerido",
            variant: "destructive",
          });
          return;
        }
        
        // Función para validar UUIDs
        const isValidUUID = (uuid: string | null | undefined): boolean => {
          if (!uuid || uuid === 'none' || uuid === '') return true; // null/empty es válido
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(uuid);
        };
        
        // Validar UUIDs críticos
        const uuidsToValidate = [
          { name: 'cliente_id', value: embarqueData.cliente_id },
          { name: 'tipo_servicio_id', value: embarqueData.tipo_servicio_id },
          { name: 'camion_id', value: embarqueData.camion_id },
          { name: 'remolque_id', value: embarqueData.remolque_id },
          { name: 'representante_cliente', value: embarqueData.representante_cliente }
        ];
        
        for (const uuid of uuidsToValidate) {
          if (!isValidUUID(uuid.value)) {
            console.error(`❌ UUID inválido para ${uuid.name}:`, uuid.value);
            toast({
              title: "Error de validación",
              description: `ID inválido para ${uuid.name}`,
              variant: "destructive",
            });
            return;
          }
        }
        
        console.log("📋 Payload para crear_embarque_normalizado:", {
          p_folio: folio,
          p_cliente_id: embarqueData.cliente_id,
          p_tipo_servicio_id: embarqueData.tipo_servicio_id,
          p_contenido: embarqueData.contenido,
          p_peso: embarqueData.peso,
          p_load_number: embarqueData.load_number,
          p_origen: embarqueData.origen,
          p_destino: embarqueData.destino,
          p_direccion_recolecta: embarqueData.direccion_recolecta,
          p_direccion_entrega: embarqueData.direccion_entrega,
          p_fecha_recolecta: embarqueData.fecha_recolecta,
          p_hora_recolecta: embarqueData.hora_recolecta,
          p_fecha_entrega: embarqueData.fecha_entrega,
          p_hora_entrega: embarqueData.hora_entrega,
          p_camion_id: embarqueData.camion_id,
          p_remolque_id: embarqueData.remolque_id,
          p_camion_numero_economico: embarqueData.camion_numero_economico,
          p_camion_placa: embarqueData.camion_placa,
          p_remolque_numero_economico: embarqueData.remolque_numero_economico,
          p_remolque_placa: embarqueData.remolque_placa,
          p_carta_porte: embarqueData.carta_porte,
          p_patente_agente_aduanal: embarqueData.patente_agente_aduanal,
          p_aduana_cruce: embarqueData.aduana_cruce,
          p_dueno_mercancia: embarqueData.dueno_mercancia,
          p_representante_cliente: embarqueData.representante_cliente,
          p_info_representante: embarqueData.info_representante,
          p_observaciones: embarqueData.observaciones
        });
        
        // ✅ INSERCIÓN DIRECTA EN TABLA EMBARQUES (SIN API COMPLEJA)
        console.log("🔧 Insertando embarque directamente en tabla embarques...");
        
        // Limpiar payload para inserción directa - SOLO COLUMNAS CONFIRMADAS
        const embarqueParaInsertar = {
          folio: folio,
          cliente_id: embarqueData.cliente_id === 'none' || embarqueData.cliente_id === '' ? null : embarqueData.cliente_id,
          operador_id: embarqueData.operador_id === 'none' || embarqueData.operador_id === '' ? null : embarqueData.operador_id,
          camion_id: embarqueData.camion_id === 'none' || embarqueData.camion_id === '' ? null : embarqueData.camion_id,
          remolque_id: embarqueData.remolque_id === 'none' || embarqueData.remolque_id === '' ? null : embarqueData.remolque_id,
          tipo_servicio_id: embarqueData.tipo_servicio_id === 'none' || embarqueData.tipo_servicio_id === '' ? null : embarqueData.tipo_servicio_id,
          origen: embarqueData.origen,
          destino: embarqueData.destino,
          lugar_recolecta: embarqueData.lugar_recolecta,
          direccion_recolecta: embarqueData.direccion_recolecta,
          direccion_entrega: embarqueData.direccion_entrega,
          fecha_recolecta: embarqueData.fecha_recolecta,
          hora_recolecta: embarqueData.hora_recolecta,
          fecha_entrega: embarqueData.fecha_entrega,
          hora_entrega: embarqueData.hora_entrega,
          contenido: embarqueData.contenido,
          peso: embarqueData.peso,
          estado: 'creado',
          estado_facturacion: 'pendiente_facturacion',
          observaciones: embarqueData.observaciones,
          carta_porte: embarqueData.carta_porte,
          load_number: embarqueData.load_number,
          patente_agente_aduanal: embarqueData.patente_agente_aduanal,
          aduana_cruce: embarqueData.aduana_cruce,
          dueno_mercancia: embarqueData.dueno_mercancia,
          representante_cliente: embarqueData.representante_cliente,
          info_representante: embarqueData.info_representante,
          precio_flete: embarqueData.precio_flete,
          moneda_flete: embarqueData.currency || 'MXN',
          remolque_manual: embarqueData.remolque_manual || null,
          remolque_numero_economico: embarqueData.remolque_numero_economico,
          remolque_placa: embarqueData.remolque_placa,
          fecha_creacion: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Guardar direcciones múltiples en campos JSON
          recolectas_json: (formData.recolectas || []).length > 1 ? JSON.stringify(formData.recolectas || []) : null,
          entregas_json: (formData.entregas || []).length > 1 ? JSON.stringify(formData.entregas || []) : null
        };

        console.log("📋 Datos para insertar:", embarqueParaInsertar);
        console.log("🔍 Verificando conexión a Supabase...");
        console.log("🔍 Cliente Supabase:", !!supabase);
        console.log("🔍 Tabla destino: embarques");

        const { data: nuevoEmbarque, error: errorCrear } = await supabase
          .from("embarques")
          .insert(embarqueParaInsertar)
          .select()
          .single();

        if (errorCrear) {
          console.error("❌ Error creando embarque:", errorCrear);
          console.error("❌ Error completo:", JSON.stringify(errorCrear, null, 2));
          console.error("❌ Error details:", errorCrear.details);
          console.error("❌ Error hint:", errorCrear.hint);
          console.error("❌ Error code:", errorCrear.code);
          
          const errorMessage = errorCrear.message || errorCrear.details || errorCrear.hint || 'Error desconocido al crear embarque';
          
          toast({
            title: "Error al crear embarque",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        console.log("✅ Embarque creado exitosamente:", nuevoEmbarque);
        
        // Datos del embarque recién creado
        const nuevoEmbarqueId = nuevoEmbarque.id;
        const folioFinal = nuevoEmbarque.folio;
        
        console.log("✅ Embarque registrado:", { id: nuevoEmbarqueId, folio: folioFinal });
        
        // Simular insertData para compatibilidad con el código existente
        const insertData = [{ id: nuevoEmbarqueId, folio: folioFinal }];
        
        // Actualizar folio si fuera necesario
        folio = folioFinal;
        
        try { 
          agregarAuditLog("CREAR", "Embarques", `Folio: ${folioFinal} | Usuario: ${getCurrentUser()?.nombre || ''} | Sistema: LEGACY`); 
        } catch {}
      }
      
      // ✅ COMPLETAR GUARDADO
      if (embarqueEditando) {
        toast({ title: "Embarque actualizado", description: `Folio actualizado` });
      } else {
        toast({ title: "Embarque creado exitosamente", description: `Embarque registrado correctamente`, variant: "success" });
      }
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
      await loadEmbarques();
    } catch (error) {
      console.error("Error guardando embarque:", error);
      const msg = (error as any)?.message || String(error);
      toast({ title: "Error al guardar embarque", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (embarque: Embarque) => {
    try {
      const { error } = await supabase
        .from("embarques")
        .delete()
        .eq("id", embarque.id);

      if (error) {
        console.error("Error eliminando embarque:", error);
        toast({ title: "Error al eliminar embarque", variant: "destructive" });
        return;
      }

      toast({ title: "Embarque eliminado exitosamente", variant: "success" });
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Embarques",
          `Eliminó embarque ${embarque.folio}`
        );
      } catch {}
      await loadEmbarques();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error al eliminar embarque", variant: "destructive" });
    }
  };

  const handleGenerateLink = (embarqueId: string) => {
    // Asume que tu aplicación está desplegada en un dominio.
    // En desarrollo, será algo como http://localhost:3000
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/subir-fotos-embarque/${embarqueId}`;
    setGeneratedLink(link);
    setShowLinkModal(true);
  };

  const handleViewDetails = async (embarque: Embarque) => {
    setEmbarqueDetalle(embarque);
    setShowDetailModal(true);

    // Diagnostics: if this is the problematic folio, log more info
    const isTargetFolio = String(embarque.folio || "").includes("2509-015") || String(embarque.folio || "").includes("TIM-2509-015");

    // If the embedded cliente object is missing billing fields
    // (forma_facturacion, divisa_pago, empresa_facturadora), try fetching
    // the full cliente record so the General tab can show accurate data.
    try {
      const clienteObj = (embarque as any).cliente;
      const clienteIdFromEmbed = clienteObj?.id;
      const clienteIdFromRoot = (embarque as any).cliente_id;
      const clienteId = clienteIdFromEmbed || clienteIdFromRoot;

      const hasBillingFields = !!((clienteObj as any)?.forma_facturacion || (clienteObj as any)?.divisa_pago || (clienteObj as any)?.empresa_facturadora || (clienteObj as any)?.razon_social);

      if (isTargetFolio) console.debug("handleViewDetails called for folio", embarque.folio, "embedded cliente:", clienteObj, "cliente_id:", clienteId);

      if (clienteId && !hasBillingFields) {
        const { data: clienteData, error: clienteError } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", clienteId)
          .single();

        if (!clienteError && clienteData) {
          // merge the fresh cliente into the detalle so the UI reads it
          setEmbarqueDetalle((prev) => ({ ...(prev as any), cliente: clienteData }));
          if (isTargetFolio) console.debug("Fetched cliente for details view (supabase):", clienteData);
        } else {
          if (isTargetFolio) console.debug("Cliente fetch returned no data or error:", clienteId, clienteError);
          // fallback: try to find the cliente in the in-memory `clientes` list
          try {
            const local = clientes.find((c) => c.id === clienteId);
            if (local) {
              setEmbarqueDetalle((prev) => ({ ...(prev as any), cliente: local }));
              if (isTargetFolio) console.debug("Used cliente from in-memory clientes:", local);
            } else if (isTargetFolio) {
              console.debug("No cliente found in in-memory clientes for id:", clienteId);
            }
          } catch (eLocal) {
            if (isTargetFolio) console.warn("Error looking up local cliente:", eLocal);
          }
        }
      } else if (isTargetFolio) {
        console.debug("No fetch needed; cliente already has billing fields:", clienteObj);
      }
    } catch (e) {
      console.warn("Error fetching cliente for details view:", e);
    }

    if (embarque.id) {
      const fotos = await obtenerFotosEmbarque(embarque.id); // Fetch photos
      setEmbarqueFotos(fotos); // Set photos in state
    } else {
      setEmbarqueFotos([]); // Clear if no embarque ID
    }

    // Extraer direcciones múltiples desde campos JSON o observaciones para el modal de detalles
    if (embarque.id) {
      try {
        let recolectas: any[] = [];
        let entregas: any[] = [];
        
        // Prioridad 1: Obtener desde campos JSON
        try {
          if ((embarque as any).recolectas_json) {
            recolectas = JSON.parse((embarque as any).recolectas_json);
          }
          if ((embarque as any).entregas_json) {
            entregas = JSON.parse((embarque as any).entregas_json);
          }
        } catch (jsonError) {
          console.warn("Error parsing JSON direcciones:", jsonError);
        }
        
        // Prioridad 2: Si no hay datos JSON, extraer de observaciones (fallback)
        if (recolectas.length === 0 && entregas.length === 0) {
          const extracted = extraerDireccionesMultiples(embarque.observaciones || null);
          recolectas = extracted.recolectas;
          entregas = extracted.entregas;
        }
        
        // Si se encontraron direcciones múltiples, usarlas
        if (recolectas.length > 0 || entregas.length > 0) {
          // Usar las direcciones múltiples extraídas
          const recolectasFinales = recolectas.length > 0 ? recolectas : [
            { direccion: (embarque as any).direccion_recolecta || "", fecha: (embarque as any).fecha_recolecta || "", hora: (embarque as any).hora_recolecta || "" }
          ];
          
          const entregasFinales = entregas.length > 0 ? entregas : [
            { direccion: (embarque as any).direccion_entrega || "", fecha: (embarque as any).fecha_entrega || "", hora: (embarque as any).hora_entrega || "" }
          ];

          setEmbarqueDetalle((prev) => ({ ...(prev as any), recolectas: recolectasFinales, entregas: entregasFinales }));
        } else {
          // Usar direcciones legacy como fallback
          const recolectasLegacy = [
            { direccion: (embarque as any).direccion_recolecta || "", fecha: (embarque as any).fecha_recolecta || "", hora: (embarque as any).hora_recolecta || "" }
          ].filter(r => r.direccion.trim());
          
          const entregasLegacy = [
            { direccion: (embarque as any).direccion_entrega || "", fecha: (embarque as any).fecha_entrega || "", hora: (embarque as any).hora_entrega || "" }
          ].filter(e => e.direccion.trim());

          setEmbarqueDetalle((prev) => ({ ...(prev as any), recolectas: recolectasLegacy, entregas: entregasLegacy }));
        }
      } catch (e) {
        console.warn("Error consultando direcciones múltiples:", e);
      }
    }
  };

  const cancelarEmbarque = async () => {
  if (cancelingEmbarque) {
    console.log(`🔧 [CANCEL] Iniciando cancelación de embarque:`, {
      folio: cancelingEmbarque.folio,
      estadoActual: cancelingEmbarque.estado,
      filtroActual: filtroEstado
    });
    
    agregarAuditLog(
      "ELIMINAR",
      "Embarques",
      `Folio: ${cancelingEmbarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`
    );
  }
    if (!cancelingEmbarque || !cancelReason.trim()) {
      toast({ title: "Justificación requerida", description: "Por favor ingresa una justificación para la cancelación", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Paso 1: asegurar cancelación aunque el esquema no tenga las nuevas columnas
      const baseUpdate: any = {
        estado: "cancelado",
        updated_at: new Date().toISOString(),
      };

  try {
    baseUpdate.observaciones = `${cancelingEmbarque.observaciones || ""}

[CANCELADO] ${cancelReason}`.trim();
  } catch (error) {
        console.warn(
          "Campo observaciones no disponible, guardando justificación en campo alternativo"
        );
      }

      const { error: baseError } = await supabase
        .from("embarques")
        .update(baseUpdate)
        .eq("id", cancelingEmbarque.id);

      if (baseError) {
        console.error("Error cancelando embarque (base):", baseError);
        toast({ title: "Error al cancelar embarque", description: (baseError as any)?.message || JSON.stringify(baseError) || "Desconocido", variant: "destructive" });
        return;
      }

      // Paso 2: intento best-effort para guardar metadata de cancelación (puede fallar si columnas no existen)
      try {
        const metaUpdate = {
          fecha_cancelacion: new Date().toISOString(),
          cancelado_por: getCurrentUser()?.nombre || "Usuario",
          motivo_cancelacion: cancelReason.trim(),
        } as any;

        const { error: metaError } = await supabase
          .from("embarques")
          .update(metaUpdate)
          .eq("id", cancelingEmbarque.id);

        if (metaError) {
          // No bloquear al usuario, solo advertir en consola
          console.warn(
            "No se pudo guardar metadata de cancelación (ejecuta el script 58-add-cancelacion-fields.sql):",
            metaError
          );
        }
      } catch (e) {
        console.warn("Excepción guardando metadata de cancelación:", e);
      }

  // 🔧 FIX CRÍTICO: Actualizar estado local inmediatamente para reflejar cambios visuales
  console.log(`� [CANCEL] Actualizando estado local de ${cancelingEmbarque.folio} a cancelado...`);
  console.log(`🔧 [CANCEL] Filtro actual: '${filtroEstado}' - El embarque ${filtroEstado === 'activos' ? 'SE OCULTARÁ' : 'PERMANECERÁ VISIBLE'}`);
  
  setEmbarques(prevEmbarques => {
    const updated = prevEmbarques.map(e => 
      e.id === cancelingEmbarque.id 
        ? { 
            ...e, 
            estado: 'cancelado', 
            updated_at: new Date().toISOString(),
            observaciones: `${e.observaciones || ""}

[CANCELADO] ${cancelReason}`.trim(),
            fecha_cancelacion: new Date().toISOString(),
            cancelado_por: getCurrentUser()?.nombre || "Usuario",
            motivo_cancelacion: cancelReason.trim()
          }
        : e
    );
    
    const embarqueActualizado = updated.find(e => e.id === cancelingEmbarque.id);
    console.log(`🔧 [CANCEL] Estado local actualizado:`, {
      folio: embarqueActualizado?.folio,
      nuevoEstado: embarqueActualizado?.estado,
      fecha_cancelacion: embarqueActualizado?.fecha_cancelacion
    });
    
    return updated;
  });

  toast({ title: "Embarque cancelado exitosamente", variant: "destructive", className: "bg-red-600 text-white" });
      setShowCancelModal(false);
      setCancelingEmbarque(null);
      setCancelReason("");
  
  // 🔧 DIAGNÓSTICO: Verificar que la actualización local funcionó
  console.log(`✅ [CANCELAR] Estado local actualizado. El embarque ${cancelingEmbarque.folio} ahora debería mostrar badge Cancelado y botón Archivar.`);
  
  // ❌ REMOVIDO: loadEmbarques() que causaba problemas de sincronización
  // await loadEmbarques();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error al cancelar embarque", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreEmbarque = async (embarque: Embarque) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("embarques")
        .update({
          estado: "listo-para-asignar", // Restaurar a 'listo-para-asignar'
          updated_at: new Date().toISOString(),
        })
        .eq("id", embarque.id);

      if (error) {
        console.error("Error restaurando embarque:", error);
        toast({
          title: "Error al restaurar",
          description: `No se pudo restaurar el embarque: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Embarque restaurado",
        description: `El embarque ${embarque.folio} ha sido restaurado a la lista de embarques activos.`,
      });
      setShowArchivosModal(false); // Cerrar el modal después de restaurar
      await loadEmbarques(); // Recargar todos los embarques para reflejar los cambios
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al intentar restaurar el embarque.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  // Restaurar quedó deshabilitado por requerimiento. Mantener función por compatibilidad, pero no se usa en UI.

  const updateEstado = async (embarque: Embarque, nuevoEstado: string) => {
    try {
      const nowIso = new Date().toISOString();
      const updatePayload: any = {
        estado: nuevoEstado,
        updated_at: nowIso,
      };
      if (nuevoEstado === "archivado") {
        updatePayload.fecha_archivado = nowIso;
      }
      const { error } = await supabase
        .from("embarques")
        .update(updatePayload)
        .eq("id", embarque.id);

      if (error) {
        console.error("Error updating estado:", error);
        toast({ title: "Error al actualizar el estado", description: error.message, variant: "destructive" });
        return;
      }

      await loadEmbarques();
      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Embarques",
          `Cambió estado de ${embarque.folio} de ${embarque.estado} a ${nuevoEstado}`
        );
      } catch {}
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error al actualizar el estado", variant: "destructive" });
    }
  };

  // Abre diálogo de confirmación para completar y enviar el embarque a asignación
  const marcarComoCompletado = (embarque: Embarque) => {
    setEmbarqueACompletar(embarque);
    setShowCompletarDialog(true);
  };

  // Ejecuta la acción cuando el usuario confirma en el diálogo
  const confirmarCompletar = async () => {
    const embarque = embarqueACompletar;
    if (!embarque) return;
    try {
      setSaving(true);
      setShowCompletarDialog(false);
      // OPTIMISTIC UPDATE: marcar localmente como listo-para-asignar
      // antes de llamar al servidor para evitar que la UI vuelva a mostrar
      // el botón "Completar y Enviar" si la sincronización tarda o falla.
      setEmbarques(prevEmbarques =>
        prevEmbarques.map(e =>
          e.id === embarque.id
            ? { ...e, estado: 'listo-para-asignar', _completadoLocal: true, updated_at: new Date().toISOString() }
            : e
        )
      );
      // Persistir en localStorage para que sobreviva a recargas
      try {
        addCompletedLocal(String(embarque.id));
      } catch (e) {
        console.warn('No se pudo persistir completado localmente', e);
      }
      agregarAuditLog("ACTUALIZAR", "Embarques", `Folio: ${embarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      // Usar API para centralizar lógica del servidor y permisos
      const fuente = (embarque as any)?._fuente || 'legacy';
      console.log(`🔧 [COMPLETAR] Cambiando estado de ${embarque.folio} (${embarque.id}) de ${embarque.estado} a listo-para-asignar`);
      console.log(`📋 [COMPLETAR] Fuente detectada: ${fuente}`);
      
      // Llamada a API con manejo robusto de errores y 1 reintento
      const callApi = async () => {
        const r = await fetch('/api/embarques/estado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: embarque.id, estado: 'listo-para-asignar', fuente })
        });
        let parsed: any = null;
        try { parsed = await r.json(); } catch (e) {}
        return { resp: r, body: parsed };
      };

      let apiResult: any = null;
      try {
        apiResult = await callApi();
      } catch (e) {
        console.warn('Fetch /api/embarques/estado fallo en primer intento:', e);
        // Reintentar una vez
        try {
          apiResult = await callApi();
        } catch (e2) {
          console.error('Fetch /api/embarques/estado fallo en reintento:', e2);
          // Revertir la actualización optimista
          try { removeCompletedLocal(String(embarque.id)); } catch (ee) {}
          setEmbarques(prev => prev.map((p: any) => p.id === embarque.id ? { ...p, estado: embarque.estado, _completadoLocal: undefined } : p));
          toast({ title: 'Error al marcar como completado', description: String(e2 || 'Error de red al contactar al servidor'), variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      const { resp, body: js } = apiResult || {};
      console.log(`📡 [COMPLETAR] API Response:`, { ok: resp?.ok, status: resp?.status, body: js });

      if (!resp || !resp.ok || !(js?.ok)) {
        const errMsg = String(js?.error?.message || 'Fallo actualizando estado');
        console.warn('Error actualizando estado (API):', errMsg);
        // Revertir la marca local
        try { removeCompletedLocal(String(embarque.id)); } catch (e) {}
        setEmbarques(prev => prev.map((p: any) => p.id === embarque.id ? { ...p, estado: embarque.estado, _completadoLocal: undefined } : p));
        toast({ title: 'Error al marcar como completado', description: errMsg, variant: 'destructive' });
        return;
      }

      // Nota: la actualización optimista ya marcó el embarque localmente.
      console.log(`🔄 [COMPLETAR] Estado local (optimista) aplicado para ${embarque.folio}.`);

      toast({ title: "Embarque marcado como Listo para Asignar", description: `Folio: ${embarque.folio} ahora visible en Asignación de Embarques`, variant: "success" });
      setEmbarqueACompletar(null);
      
      // Limpiar la marca local ya que se persistió en servidor
      try { removeCompletedLocal(String(embarque.id)); } catch (e) {}
      
      // Actualizar el estado basado en la respuesta del servidor
      setEmbarques(prev => prev.map((p: any) => 
        p.id === embarque.id 
          ? { ...p, estado: 'listo-para-asignar', _completadoLocal: undefined, updated_at: new Date().toISOString() }
          : p
      ));
      
      console.log(`✅ [COMPLETAR] Estado persistido en servidor. El embarque ${embarque.folio} ahora debería mostrar botón Archivar y badge verde.`);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error al marcar como completado", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getServiceDisplayName = (serviceId: string) => {
    // Primero buscar en la base de datos
    const tipoFromDB = tiposServicio.find((tipo) => tipo.id === serviceId);
    if (tipoFromDB) {
      return tipoFromDB.nombre;
    }

    // Fallback a nombres hardcodeados
    const serviceNames = {
      "exportacion-cargada-caja-seca-240":
        "EXPORTACIÓN CARGADA - CAJA SECA 240",
      "exportacion-cargada-larmex-240":
        "EXPORTACIÓN CARGADA - CAJA SECA (LARMEX) 240",
      "exportacion-cargada-thermo-agricultura-240":
        "EXPORTACIÓN CARGADA - THERMO (AGRICULTURA) 240",
      "exportacion-cargada-plataforma-240":
        "EXPORTACIÓN CARGADA - PLATAFORMA 240",
      "importacion-cargada-caja-seca-240":
        "IMPORTACIÓN CARGADA - CAJA SECA 240",
      "importacion-cargada-plataforma-240":
        "IMPORTACIÓN CARGADA - PLATAFORMA 240",
      "importacion-vacia-caja-seca-thermo-240":
        "IMPORTACIÓN VACÍA - CAJA SECA/THERMO 240",
      "importacion-cargada-plataforma-amarre-240":
        "IMPORTACIÓN CARGADA - PLATAFORMA CON AMARRE 240",
      "importacion-en-tractor-240": "IMPORTACIÓN - EN TRACTOR 240",
      "exportacion-cargada-caja-seca-800":
        "EXPORTACIÓN CARGADA - CAJA SECA 800",
      "exportacion-vacia-caja-seca-800": "EXPORTACIÓN VACÍA - CAJA SECA 800",
      "exportacion-en-tractor-800": "EXPORTACIÓN - EN TRACTOR 800",
      "exportacion-cargada-plataforma-800":
        "EXPORTACIÓN CARGADA - PLATAFORMA 800",
      "importacion-cargada-caja-seca-800":
        "IMPORTACIÓN CARGADA - CAJA SECA 800",
      "importacion-vacia-plataforma-800": "IMPORTACIÓN VACÍA - PLATAFORMA 800",
      "pagos-extras": "PAGOS EXTRAS",
      "horas-rojo-amarillo": "HORAS ROJO/AMARILLO",
      "cargas-descargas": "CARGAS/DESCARGAS",
      "movimientos-en-falso": "MOVIMIENTOS EN FALSO",
      "movimientos-locales": "MOVIMIENTOS LOCALES",
      otro: "OTRO",
    };
  return (serviceNames as Record<string, string>)[serviceId] || serviceId;
  };

  // Render readable observaciones: support plain string or JSON that may include comentarios/observaciones fields
  // Returns either a plain string for raw text observations, or an object { comentarios?, puntos? }
  const renderObservacionesContent = (obs: any) => {
    if (!obs && obs !== "") return null;
    const raw = String(obs ?? "");
    try {
      // If the raw contains free text followed by a JSON object, extract prefix and parse suffix
      const firstBrace = raw.indexOf("{");
      if (firstBrace > 0) {
        const prefix = raw.slice(0, firstBrace).trim();
        const suffix = raw.slice(firstBrace);
        try {
          const parsedSuffix = JSON.parse(suffix);
          const textoFromParsed = parsedSuffix?.comentarios || parsedSuffix?.comentario || parsedSuffix?.observaciones || parsedSuffix?.nota || parsedSuffix?.notes;
          const puntosFromParsed = parsedSuffix?.puntos;
          const result: any = {};
          if (prefix) result.comentarios = prefix;
          if (textoFromParsed && !result.comentarios) result.comentarios = textoFromParsed;
          if (puntosFromParsed) result.puntos = puntosFromParsed;
          // include other parsed fields if present
          Object.keys(parsedSuffix || {}).forEach((k) => {
            if (k !== "puntos" && k !== "comentarios" && !(k in result)) result[k] = (parsedSuffix as any)[k];
          });
          return result;
        } catch (e) {
          // Fall through to try full-parse below
        }
      }

      // Try parse entire raw as JSON
      const parsed = JSON.parse(raw);
      // If parsing yields a string, it may be a double-encoded JSON ("{...}")
      if (typeof parsed === "string") {
        const inner = parsed;
        try {
          const parsedInner = JSON.parse(inner);
          if (parsedInner && typeof parsedInner === "object") {
            const texto2 = parsedInner?.comentarios || parsedInner?.comentario || parsedInner?.observaciones || parsedInner?.nota || parsedInner?.notes;
            const puntos2 = parsedInner?.puntos;
            if (texto2 && puntos2) return { comentarios: texto2, puntos: puntos2 };
            if (texto2) return texto2;
            if (puntos2) return { puntos: puntos2 };
            const otherKeysInner = Object.keys(parsedInner || {}).filter((k) => k !== "puntos");
            if (otherKeysInner.length > 0) {
              const summaryInner: any = {};
              otherKeysInner.forEach((k) => (summaryInner[k] = (parsedInner as any)[k]));
              return summaryInner;
            }
            return parsedInner;
          }
        } catch (e) {
          // not double-encoded, fall through to return the string
        }
        return parsed;
      }
      const texto = parsed?.comentarios || parsed?.comentario || parsed?.observaciones || parsed?.nota || parsed?.notes;
      const puntos = parsed?.puntos;
      if (texto && puntos) return { comentarios: texto, puntos };
      if (texto) return texto;
      if (puntos) return { puntos };
      const otherKeys = Object.keys(parsed || {}).filter((k) => k !== "puntos");
      if (otherKeys.length > 0) {
        const summary: any = {};
        otherKeys.forEach((k) => (summary[k] = (parsed as any)[k]));
        return summary;
      }
      return parsed;
    } catch (e) {
      // Not JSON — show raw text
      return raw;
    }
  };

  // Extract only the user-entered comentario text from observaciones.
  // Prefer explicit fields (comentarios, comentario, observaciones, nota, notes).
  // If the stored value is plain text, return it. If it's JSON, unwrap and return the comentarios field when present.
  const extractObservacionesComentario = (obs: any) => {
    if (obs === null || obs === undefined || obs === "") return null;
    const raw = String(obs ?? "");
    // Try parse JSON / double-encoded JSON to find a comentarios-like field
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        // If not JSON, return raw text
        return raw;
      }

      if (typeof parsed === "string") {
        // double-encoded JSON -> try parse inner
        try {
          const inner = JSON.parse(parsed);
          if (inner && typeof inner === "object") parsed = inner;
        } catch (e) {
          // inner not JSON, return the string
          return parsed;
        }
      }

      if (parsed && typeof parsed === "object") {
        return (
          parsed.comentarios ||
          parsed.comentario ||
          parsed.observaciones ||
          parsed.nota ||
          parsed.notes ||
          null
        );
      }

      // Fallback: return raw
      return raw;
    } catch (e) {
      return raw;
    }
  };

  const imprimirFormulario = () => {
  const firstReco = (formData.recolectas || []).find((r: any) => (r.direccion || "").trim() !== "") || (formData.recolectas || [])[0];
  const lastEntrega = (formData.entregas || []).slice().reverse().find((e: any) => (e.direccion || "").trim() !== "") || (formData.entregas || [])[0];

  const printContent = `
      <html>
        <head>
          <title>Formulario de Embarque - ${
            embarqueEditando ? formData.folio : proximoFolio
          }</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { width: 210mm; height: 297mm; }
            body { font-family: Arial, sans-serif; margin: 0; font-size: 11px; line-height: 1.25; }
            .container { padding: 6mm 8mm; }
            .header { text-align: center; margin-bottom: 8mm; }
            .section { margin-bottom: 5mm; }
            .field { margin-bottom: 2mm; }
            .label { font-weight: bold; margin-right: 4px; }
            .value { border-bottom: 1px solid #000; display: inline-block; min-width: 120px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
            .full-width { grid-column: 1 / -1; }
            h1 { font-size: 16px; margin: 0 0 2mm; }
            h2 { font-size: 14px; margin: 0 0 2mm; }
            h3 { font-size: 12px; margin: 0 0 2mm; }
            .sig { margin-top: 6mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
            .sig div { text-align: center; }
            .sig-line { border-top: 1px solid #000; margin-top: 6mm; padding-top: 2mm; }
          </style>
        </head>
        <body>
          <div class="container">
          <div class="header">
            <h1>TRANSPORTES MONARCA</h1>
            <h2>FORMULARIO DE EMBARQUE</h2>
            <p>Folio: <span class="value">${
              embarqueEditando ? formData.folio : proximoFolio
            }</span></p>
          </div>
          
          <div class="section">
            <h3>INFORMACIÓN BÁSICA</h3>
            <div class="grid">
              <div class="field">
                <span class="label">Carta Porte:</span> <span class="value">${
                  formData.carta_porte
                }</span>
              </div>
              <div class="field">
                <span class="label">Cliente:</span> <span class="value">${
                  clientes.find((c) => c.id === formData.cliente_id)?.nombre ||
                  ""
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>DIRECCIONES</h3>
            <div class="field full-width">
              <span class="label">Direcciones de Recolecta:</span><br>
              <span class="value" style="width: 100%; min-height: 24px; display: block;">${
                (formData.recolectas || []).map((r: any, i: number) => `(${i === 0 ? 'original' : i}) ${r.direccion || ''}`).join(' \n')
              }</span>
            </div>
            <div class="field full-width">
              <span class="label">Direcciones de Entrega:</span><br>
              <span class="value" style="width: 100%; min-height: 24px; display: block;">${
                (formData.entregas || []).map((r: any, i: number, arr: any) => `(${i === arr.length - 1 ? 'final' : i}) ${r.direccion || ''}`).join(' \n')
              }</span>
            </div>
          </div>

          <div class="section">
            <h3>FECHAS Y HORARIOS</h3>
            <div class="grid">
              <div class="field">
                <span class="label">Fecha Recolecta:</span> <span class="value">${
                  firstReco?.fecha || ''
                }</span>
              </div>
              <div class="field">
                <span class="label">Hora Recolecta:</span> <span class="value">${
                  firstReco?.hora || ''
                }</span>
              </div>
              <div class="field">
                <span class="label">Fecha Entrega:</span> <span class="value">${
                  lastEntrega?.fecha || ''
                }</span>
              </div>
              <div class="field">
                <span class="label">Hora Entrega:</span> <span class="value">${
                  lastEntrega?.hora || ''
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>VEHÍCULOS</h3>
            <div class="grid">
              <div class="field">
                <span class="label">Tractocamión:</span> <span class="value">${
                  camiones.find((c) => c.id === formData.camion_id)
                    ?.numero_economico || ""
                }</span>
              </div>
              <div class="field">
                <span class="label">Remolque:</span> <span class="value">${
                  remolques.find((r) => r.id === formData.remolque_id)
                    ?.numero_economico || ""
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>DETALLES DE CARGA</h3>
            <div class="grid">
              <div class="field">
                <span class="label">Contenido:</span> <span class="value">${
                  formData.contenido
                }</span>
              </div>
              <div class="field">
                <span class="label">Peso (kg):</span> <span class="value">${
                  formData.peso
                }</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>OBSERVACIONES</h3>
            <div class="field full-width">
              <span class="value" style="width: 100%; min-height: 30px; display: block;">${
                formData.observaciones
              }</span>
            </div>
          </div>

          <div class="sig">
            <div>
              <div class="sig-line">FIRMA AUTORIZADA</div>
            </div>
            <div>
              <div class="sig-line">FECHA: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Embarques",
        `Imprimió formulario ${(embarqueEditando ? formData.folio : proximoFolio) || "(sin folio)"}`
      );
    } catch {}
  };

  const imprimirDetalle = () => {
    if (!embarqueDetalle) return;
  const clienteNombre = embarqueDetalle.cliente?.nombre || "";
  // Tractocamión: soportar tanto objeto anidado como campos legacy
  const camionNumero = embarqueDetalle.camion?.numero_economico || (embarqueDetalle as any).camion_numero_economico || "";
  const camionMarca = embarqueDetalle.camion?.marca || (embarqueDetalle as any).camion_marca || "";
  const camionPlacas = embarqueDetalle.camion?.placas || (embarqueDetalle as any).camion_placas || "";
  const camionTexto = `${camionNumero}${camionMarca ? ` | Marca: ${camionMarca}` : ""}${camionPlacas ? ` | Placas: ${camionPlacas}` : ""}`;

  // Remolque: soportar objeto anidado y campos legacy
  const remolqueNumero = embarqueDetalle.remolque?.numero_economico || embarqueDetalle.remolque_numero_economico || "";
  const remolqueMarca = embarqueDetalle.remolque?.marca || (embarqueDetalle as any).remolque_marca || "";
  const remolquePlacas = embarqueDetalle.remolque?.placas || embarqueDetalle.remolque_placa || "";
  const remolqueTexto = `${remolqueNumero ? remolqueNumero : "Sin económico"}${remolqueMarca ? ` | Marca: ${remolqueMarca}` : ""}${remolquePlacas ? ` | Placas: ${remolquePlacas}` : ""}`;

    const printContent = `
      <html>
        <head>
          <title>Embarque ${embarqueDetalle.folio}</title>
          <style>
            /* Target A4 and make content larger and more spaced so it occupies ~half page */
            @page { size: A4 portrait; margin: 12mm; }
            html, body { width: 210mm; height: 297mm; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; font-size: 14px; line-height: 1.4; color: #000; }
            img { display: none !important; }
            .container { padding: 12mm 14mm; box-sizing: border-box; }
            .header { text-align: center; margin-bottom: 12px; }
            .company { font-weight:700; font-size:22px; letter-spacing:0.6px; }
            .title { font-size:18px; margin-top:8px; font-weight:600; }
            .folio { font-weight:700; font-size:20px; margin-top:8px; }
            /* Use single column for print to increase vertical space and readability */
            .grid { display: block; }
            .section { margin-bottom:12px; }
            .label { font-weight:700; display:block; font-size:14px; margin-bottom:6px; }
            .value { font-size:15px; display:block; margin-bottom:8px; }
            .value.inline { display:inline-block; border-bottom:1px solid #000; padding-bottom:4px; min-width:140px; }
            .obs { max-height:160px; overflow:auto; font-size:14px; }
            .sig { margin-top:22px; display:flex; justify-content:space-between; gap:24px; font-size:14px; }
            .sig div { width:48%; text-align:center; }
            .sig-line { border-top:1px solid #000; margin-top:28px; padding-top:8px; }
            /* Make helper spacing for groups */
            .meta-row { margin-bottom:10px; }
            /* Force a comfortable column width so content uses more vertical space (~half page) */
            .half { max-width: 160mm; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container half">
              <div class="header">
                  <div class="company">TRANSPORTES INTERNACIONALES MONARCA</div>
                  <div class="title">DETALLE COMPLETO DEL EMBARQUE</div>
                  <div style="margin-top:6px; display:flex; justify-content:center; gap:12px; font-size:14px;">
                    <div><strong>Folio:</strong> ${embarqueDetalle.folio}</div>
                    <div><strong>Estado:</strong> ${embarqueDetalle.estado || ''}</div>
                    <div><strong>Fecha:</strong> ${embarqueDetalle.fecha_creacion ? new Date(embarqueDetalle.fecha_creacion).toLocaleDateString() : ''}</div>
                  </div>
                </div>

            <div class="grid">
              <div class="section meta-row">
                <div class="label">Carta Porte</div>
                <div class="value">${embarqueDetalle.carta_porte || ""}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Cliente</div>
                <div class="value">${clienteNombre}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Recolecta</div>
                <div class="value">${embarqueDetalle.fecha_recolecta ? formatDateMatamoros(embarqueDetalle.fecha_recolecta) : ''} ${embarqueDetalle.hora_recolecta || ''}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Dirección Recolecta</div>
                <div class="value">${(embarqueDetalle.direccion_recolecta || "").replace(/\n/g, ' ')}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Entrega</div>
                <div class="value">${embarqueDetalle.fecha_entrega ? formatDateMatamoros(embarqueDetalle.fecha_entrega) : ''} ${embarqueDetalle.hora_entrega || ''}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Dirección Entrega</div>
                <div class="value">${(embarqueDetalle.direccion_entrega || "").replace(/\n/g, ' ')}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Remolque</div>
                <div class="value">${remolqueTexto}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Marca del Remolque</div>
                <div class="value">${remolqueMarca || ''}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Tractocamión</div>
                <div class="value">${camionTexto}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Marca del Tractocamión</div>
                <div class="value">${camionMarca || ''}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Contenido</div>
                <div class="value">${embarqueDetalle.contenido || ""}</div>
              </div>

              <div class="section meta-row">
                <div class="label">Peso (kg)</div>
                <div class="value">${(embarqueDetalle as any).peso || ""}</div>
              </div>

              <div class="section" style="margin-bottom:8px;">
                <div class="label">Observaciones</div>
                <div class="value obs">${(embarqueDetalle.observaciones || "").replace(/\n/g, '<br/>')}</div>
              </div>
            </div>

            <div style="margin-top:14px;">
              <div style="border-top:1px solid #000; padding-top:6px; margin-bottom:6px; font-weight:700;">Firma de autorizado: ________________________________</div>
              <div style="font-weight:700;">Fecha: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Embarques",
        `Imprimió detalle del embarque ${embarqueDetalle.folio}`
      );
    } catch {}
  };

  // Paginación para la lista principal de embarques (similar a Gestión de Operadores)
  const [listaPage, setListaPage] = useState(1);
  const [listaPageSize, setListaPageSize] = useState(12);

  // Filtrar embarques
  const embarquesFiltrados = embarques.filter((embarque) => {
    // 🔧 Log detallado para debugging
    const esEmbarquePrueba = embarque.folio?.includes('FLOW-1758831360353');
    
    if (esEmbarquePrueba) {
      console.log(`🔧 [FILTRO] Evaluando embarque de prueba:`, {
        folio: embarque.folio,
        estado: embarque.estado,
        filtroActual: filtroEstado,
        fecha_cancelacion: embarque.fecha_cancelacion,
        fecha_archivado: embarque.fecha_archivado
      });
    }
    
    if (embarque.estado === "archivado") {
      if (esEmbarquePrueba) console.log(`🔧 [FILTRO] Embarque archivado → EXCLUIDO`);
      return false;
    }
    
    const coincideBusqueda =
      embarque.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (embarque.load_number &&
        embarque.load_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (embarque.cliente?.nombre &&
        embarque.cliente.nombre
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (embarque.direccion_recolecta &&
        embarque.direccion_recolecta
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (embarque.direccion_entrega &&
        embarque.direccion_entrega
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const coincideEstado =
      filtroEstado === "todos" ||
      embarque.estado === filtroEstado ||
      (filtroEstado === "activos" &&
        embarque.estado !== "cancelado" &&
        embarque.estado !== "archivado" &&
        embarque.estado !== "finalizado");

    const resultado = coincideBusqueda && coincideEstado;
    
    if (esEmbarquePrueba) {
      console.log(`🔧 [FILTRO] Resultado filtrado:`, {
        coincideBusqueda,
        coincideEstado,
        resultado: resultado ? 'INCLUIDO' : 'EXCLUIDO',
        razon: !coincideEstado ? `estado '${embarque.estado}' no coincide con filtro '${filtroEstado}'` : 'OK'
      });
    }

    return resultado;
  });

    // Derivados de paginación para la lista principal
    const totalListaPages = Math.max(
      1,
      Math.ceil(embarquesFiltrados.length / Math.max(1, listaPageSize))
    );
    useEffect(() => {
      if (listaPage > totalListaPages) setListaPage(totalListaPages);
    }, [totalListaPages]);
    useEffect(() => {
      setListaPage(1);
    }, [filtroEstado]);
    const listaStart = (listaPage - 1) * listaPageSize;
    const listaEnd = listaStart + listaPageSize;
    const embarquesPaginados = embarquesFiltrados.slice(listaStart, listaEnd);

  // Embarques archivados para el modal
  // Estado y lógica para búsqueda y filtrado en el modal de archivos
  const [archivosSearch, setArchivosSearch] = useState("");
  const [archivosTipoServicio, setArchivosTipoServicio] = useState("todos");
  const [archivosPeriodo, setArchivosPeriodo] = useState<
    "todo" | "mes_actual" | "mes_anterior" | "ultimos_3" | "ultimos_6" | "este_anio"
  >("todo");
  const [archivosPage, setArchivosPage] = useState(1);
  const [archivosPageSize, setArchivosPageSize] = useState(25);
  const [archivosSortKey, setArchivosSortKey] = useState<
    "folio" | "cliente" | "load" | "estatus" | "tipo" | "fecha"
  >("fecha");
  const [archivosSortDir, setArchivosSortDir] = useState<"asc" | "desc">("desc");
  const embarquesArchivados = embarques.filter(
    (embarque) => embarque.estado === "archivado"
  )
  // Mostrar primero los más antiguos para que el más viejo tenga la opción de eliminar habilitada
  .sort((a, b) => {
    const da = a.fecha_archivado ? new Date(a.fecha_archivado) : (a.fecha_creacion ? new Date(a.fecha_creacion) : new Date(8640000000000000));
    const db = b.fecha_archivado ? new Date(b.fecha_archivado) : (b.fecha_creacion ? new Date(b.fecha_creacion) : new Date(8640000000000000));
    return da.getTime() - db.getTime();
  });

  // ID del más viejo archivado (primero en la lista ascendente): tendrá el botón Eliminar habilitado
  const masViejoArchivadoId = embarquesArchivados[0]?.id || null;
  const tiposServicioArchivados = [
    ...new Set(
      embarquesArchivados
        .map((e) => e.tipo_servicio_id)
        .filter((v): v is string => Boolean(v))
    ),
  ];
  // Límites de periodo
  let desde: Date | null = null;
  let hasta: Date | null = null;
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  switch (archivosPeriodo) {
    case "mes_actual":
      desde = new Date(year, month, 1, 0, 0, 0, 0);
      hasta = new Date(year, month + 1, 0, 23, 59, 59, 999);
      break;
    case "mes_anterior": {
      const m = month - 1;
      const y = m < 0 ? year - 1 : year;
      const realM = (m + 12) % 12;
      desde = new Date(y, realM, 1, 0, 0, 0, 0);
      hasta = new Date(y, realM + 1, 0, 23, 59, 59, 999);
      break;
    }
    case "ultimos_3":
      desde = new Date(hoy);
      desde.setMonth(desde.getMonth() - 3);
      hasta = hoy;
      break;
    case "ultimos_6":
      desde = new Date(hoy);
      desde.setMonth(desde.getMonth() - 6);
      hasta = hoy;
      break;
    case "este_anio":
      desde = new Date(year, 0, 1, 0, 0, 0, 0);
      hasta = new Date(year, 11, 31, 23, 59, 59, 999);
      break;
    default:
      desde = null;
      hasta = null;
  }

  const embarquesArchivadosFiltrados = embarquesArchivados.filter((embarque) => {
    const coincideBusqueda =
      archivosSearch.trim() === "" ||
      embarque.folio.toLowerCase().includes(archivosSearch.toLowerCase()) ||
      (embarque.cliente?.nombre &&
        embarque.cliente.nombre
          .toLowerCase()
          .includes(archivosSearch.toLowerCase())) ||
      (embarque.load_number &&
        embarque.load_number
          .toLowerCase()
          .includes(archivosSearch.toLowerCase()));
    const coincideTipo =
      archivosTipoServicio === "todos" ||
      embarque.tipo_servicio_id === archivosTipoServicio;
    let coincidePeriodo = true;
    if (desde || hasta) {
      const fc = embarque.fecha_creacion ? new Date(embarque.fecha_creacion) : null;
      if (!fc || isNaN(fc.getTime())) {
        coincidePeriodo = false;
      } else {
        if (desde && fc < desde) coincidePeriodo = false;
        if (hasta && fc > hasta) coincidePeriodo = false;
      }
    }
    return coincideBusqueda && coincideTipo && coincidePeriodo;
  });

  // Ordenamiento
  const valueForSort = (e: Embarque, key: typeof archivosSortKey): string | number => {
    switch (key) {
      case "folio":
        return e.folio || "";
      case "cliente":
        return e.cliente?.nombre || "";
      case "load":
        return e.load_number || "";
      case "estatus": {
        const cancel = e.cancelado_por || e.motivo_cancelacion || e.fecha_cancelacion || e.observaciones?.toUpperCase().includes("[CANCELADO]");
        return cancel ? "Cancelado" : "Finalizado";
      }
      case "tipo":
        return e.tipo_servicio_id ? getServiceDisplayName(e.tipo_servicio_id) : "";
      case "fecha": {
        const d = e.fecha_archivado
          ? new Date(e.fecha_archivado)
          : (e.fecha_creacion ? new Date(e.fecha_creacion) : new Date(0));
        return d.getTime();
      }
      default:
        return "";
    }
  };

  const embarquesArchivadosOrdenados = [...embarquesArchivadosFiltrados].sort((a, b) => {
    const va = valueForSort(a, archivosSortKey);
    const vb = valueForSort(b, archivosSortKey);
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), "es", { sensitivity: "base" });
    }
    return archivosSortDir === "asc" ? cmp : -cmp;
  });

  // Paginación derivada
  const totalArchivadosFiltrados = embarquesArchivadosFiltrados.length;
  const totalArchivadosPaginas = Math.max(
    1,
    Math.ceil(totalArchivadosFiltrados / archivosPageSize)
  );
  const firstIdx = (archivosPage - 1) * archivosPageSize;
  const lastIdx = Math.min(firstIdx + archivosPageSize, totalArchivadosFiltrados);
  const embarquesArchivadosPaginados = embarquesArchivadosOrdenados.slice(
    firstIdx,
    lastIdx
  );

  // Resetear página cuando cambian filtros/búsqueda o tamaño de página
  useEffect(() => {
    setArchivosPage(1);
  }, [archivosSearch, archivosTipoServicio, archivosPageSize, archivosPeriodo]);

  // Exportación CSV (compatible con Excel)
  const exportarArchivadosAExcel = () => {
    const header = [
      "Folio",
      "Cliente",
      "Load",
      "Estatus",
      "Tipo de Servicio",
      "Fecha Creación",
    ];
  const toStatus = (e: any) =>
      e.cancelado_por || e.motivo_cancelacion || e.fecha_cancelacion || e.observaciones?.toUpperCase().includes("[CANCELADO]")
        ? "Cancelado"
        : "Finalizado";

    const rows = embarquesArchivadosFiltrados.map((e) => [
      e.folio || "",
      e.cliente?.nombre || "",
      e.load_number || "",
      toStatus(e),
      e.tipo_servicio_id ? getServiceDisplayName(e.tipo_servicio_id) : "",
      e.fecha_creacion ? new Date(e.fecha_creacion).toLocaleString() : "",
    ]);

    const csvContent = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const str = String(cell ?? "");
            // Escapar comillas y envolver en comillas si contiene separadores o saltos
            const escaped = '"' + str.replace(/"/g, '""') + '"';
            return escaped;
          })
          .join(",")
      )
      .join("\n");

    // BOM para Excel y compatibilidad UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `embarques_archivados_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Embarques (Archivados)",
        `Exportó ${embarquesArchivadosFiltrados.length} embarques archivados a CSV`
      );
    } catch {}
  };

  // Helper: construir texto de camión y remolque
  const getCamionTexto = (e: Embarque) =>
    e.camion?.numero_economico || (e as any).camion_numero_economico || "";
  // Prefer explicit/manual remolque fields (remolque_numero_economico / remolque_placa)
  // so that when a user captures a remolque manually it is shown in exports.
  const getRemolqueTexto = (e: Embarque) => {
    const manualNum = (e as any).remolque_numero_economico;
    const manualPlaca = (e as any).remolque_placa;
    if (manualNum && manualNum.toString().trim() !== "") {
      return `${manualNum}${manualPlaca ? ` | Placas: ${manualPlaca}` : ""}`;
    }
    if (e.remolque) {
      return `${e.remolque.numero_economico || "Sin económico"} | ${e.remolque.marca || "Sin marca"} | Placas: ${e.remolque.placas || "Sin placas"}`;
    }
    return "";
  };

  // Exportar todos los embarques no archivados (activos)
  const exportarEmbarquesActivosAExcel = () => {
    const activos = embarques.filter((e) => e.estado !== "archivado");
  const header = [
      "Folio",
      "Estado",
      "Cliente",
      "Load",
      "Carta Porte",
      "Tipo de Servicio",
      "Dirección Recolecta",
      "Fecha Recolecta",
      "Hora Recolecta",
      "Dirección Entrega",
      "Fecha Entrega",
      "Hora Entrega",
      "Tractocamión",
      "Remolque",
      "Contenido",
      "Peso (kg)",
      "Observaciones",
      "Creado",
      "Actualizado",
      "Patente Agente Aduanal",
      "Aduana Cruce",
  "Cliente del Embarque",
      "Contacto Nombre",
      "Contacto Puesto",
      "Contacto Teléfono",
      "Contacto Email",
      // campos de facturación (pestaña Facturación)
      "Empresa Facturadora",
      "Divisa de Pago",
      "Forma de Facturación",
      "RFC",
      "Razón Social",
      "Dirección Fiscal",
    ];

    const rows = activos.map((e) => {
      const contacto = (e as any).info_representante || {};
  return [
        e.folio || "",
        e.estado || "",
        e.cliente?.nombre || "",
        e.load_number || "",
        e.carta_porte || "",
        e.tipo_servicio_id ? getServiceDisplayName(e.tipo_servicio_id) : "",
        e.direccion_recolecta || "",
        e.fecha_recolecta || "",
        e.hora_recolecta || "",
        e.direccion_entrega || "",
        e.fecha_entrega || "",
        e.hora_entrega || "",
        getCamionTexto(e),
        getRemolqueTexto(e),
        e.contenido || "",
        (e as any).peso ?? "",
        e.observaciones || "",
        e.fecha_creacion ? new Date(e.fecha_creacion).toISOString() : "",
        e.updated_at ? new Date(e.updated_at).toISOString() : "",
        e.patente_agente_aduanal || "",
        e.aduana_cruce || "",
        e.dueno_mercancia || "",
        `${contacto.nombre || ""} ${contacto.apellidos || ""}`.trim(),
        contacto.puesto || "",
        contacto.telefono || "",
        contacto.email || "",
        // valores de facturación
        renderEmpresaFacturadora(
          (e.cliente as any)?.empresa_facturadora ||
            (e.cliente as any)?.razon_social ||
            (e.cliente as any)?.nombre_comercial ||
            e.cliente?.nombre
        ),
        renderDivisaPago(
          (e.cliente as any)?.divsa_pago ||
            (e.cliente as any)?.divisa_pago ||
            (e.cliente as any)?.moneda_preferida
        ),
        renderFormaFacturacion(
          (e.cliente as any)?.forma_facturacion ||
            (e.cliente as any)?.forma_pago ||
            (e.cliente as any)?.metodo_pago
        ),
        (e.cliente as any)?.rfc || "",
        (e.cliente as any)?.razon_social || e.cliente?.nombre || "",
        (e.cliente as any)?.direccion_fiscal || "",
      ];
    });

    // Generar XLSX con SheetJS
    try {
      const aoa = [header, ...rows];
      const ws = (XLSX as any).utils.aoa_to_sheet(aoa);
      // Autofilter y freeze
      try {
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) } as any;
      } catch {}
      (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };

      // Intento estilo encabezado (mejor esfuerzo)
      for (let c = 0; c < header.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[addr]) continue;
        try {
          ws[addr].s = ws[addr].s || {};
          ws[addr].s.font = { bold: true, sz: 12 };
        } catch (e) {}
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Embarques Activos");
      XLSX.writeFile(wb, `embarques_activos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      try {
        agregarAuditLog(
          "EXPORTAR",
          "Embarques",
          `Exportó ${activos.length} embarques activos a XLSX`
        );
      } catch {}
    } catch (e) {
      console.error("Error generando XLSX:", e);
      toast({ title: "Error exportando", description: "No se pudo generar el archivo Excel", variant: "destructive" });
    }
  };

  // Exportar un solo registro (detalle actual) a Excel (CSV)
  const exportarDetalleAExcel = (e: Embarque) => {
    const contacto = (e as any).info_representante || {};
    const header = [
      "Folio",
      "Estado",
      "Cliente",
      "Load",
      "Carta Porte",
      "Tipo de Servicio",
      "Dirección Recolecta",
      "Fecha Recolecta",
      "Hora Recolecta",
      "Dirección Entrega",
      "Fecha Entrega",
      "Hora Entrega",
      "Tractocamión",
      "Remolque",
      "Contenido",
      "Peso (kg)",
      "Observaciones",
      "Creado",
      "Actualizado",
      "Patente Agente Aduanal",
      "Aduana Cruce",
  "Cliente del Embarque",
      "Contacto Nombre",
      "Contacto Puesto",
      "Contacto Teléfono",
      "Contacto Email",
  // facturación
  "Empresa Facturadora",
  "Divisa de Pago",
  "Forma de Facturación",
  "RFC",
  "Razón Social",
  "Dirección Fiscal",
    ];
    const row = [
      e.folio || "",
      e.estado || "",
      e.cliente?.nombre || "",
      e.load_number || "",
      e.carta_porte || "",
      e.tipo_servicio_id ? getServiceDisplayName(e.tipo_servicio_id) : "",
      e.direccion_recolecta || "",
      e.fecha_recolecta || "",
      e.hora_recolecta || "",
      e.direccion_entrega || "",
      e.fecha_entrega || "",
      e.hora_entrega || "",
      getCamionTexto(e),
      getRemolqueTexto(e),
      e.contenido || "",
      (e as any).peso ?? "",
      e.observaciones || "",
      e.fecha_creacion ? new Date(e.fecha_creacion).toLocaleString() : "",
      e.updated_at ? new Date(e.updated_at).toLocaleString() : "",
      e.patente_agente_aduanal || "",
      e.aduana_cruce || "",
      e.dueno_mercancia || "",
      `${contacto.nombre || ""} ${contacto.apellidos || ""}`.trim(),
      contacto.puesto || "",
      contacto.telefono || "",
      contacto.email || "",
      // facturación
      renderEmpresaFacturadora(
        (e.cliente as any)?.empresa_facturadora ||
          (e.cliente as any)?.razon_social ||
          (e.cliente as any)?.nombre_comercial ||
          e.cliente?.nombre
      ),
      renderDivisaPago(
        (e.cliente as any)?.divsa_pago ||
          (e.cliente as any)?.divisa_pago ||
          (e.cliente as any)?.moneda_preferida
      ),
      renderFormaFacturacion(
        (e.cliente as any)?.forma_facturacion ||
          (e.cliente as any)?.forma_pago ||
          (e.cliente as any)?.metodo_pago
      ),
      (e.cliente as any)?.rfc || "",
      (e.cliente as any)?.razon_social || e.cliente?.nombre || "",
      (e.cliente as any)?.direccion_fiscal || "",
    ];

    try {
      const aoa = [header, row];
      const ws = (XLSX as any).utils.aoa_to_sheet(aoa);
      try {
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }) } as any;
      } catch {}
      (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Embarque_${e.folio}`);
      XLSX.writeFile(wb, `embarque_${e.folio}.xlsx`);
      try {
        agregarAuditLog(
          "EXPORTAR",
          "Embarques",
          `Exportó detalle del embarque ${e.folio} a XLSX`
        );
      } catch {}
    } catch (err) {
      console.error("Error generando XLSX detalle:", err);
      toast({ title: "Error exportando", description: "No se pudo generar el archivo Excel", variant: "destructive" });
    }
  };

  const handleSort = (key: typeof archivosSortKey) => {
    if (archivosSortKey === key) {
      setArchivosSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setArchivosSortKey(key);
      setArchivosSortDir("asc");
    }
  };

  const sortIndicator = (key: typeof archivosSortKey) =>
    archivosSortKey === key ? (archivosSortDir === "asc" ? " ▲" : " ▼") : "";

  // Utilidad: ¿han pasado 12 meses desde que se archivó?
  const puedeEliminarArchivado = (e: Embarque) => {
    // Regla de un año basada en la fecha de creación
    const base = e.fecha_creacion;
    if (!base) return false;
    const fecha = new Date(base);
    if (isNaN(fecha.getTime())) return false;
    const ahora = new Date();
    const haceUnAnio = new Date(ahora);
    haceUnAnio.setFullYear(ahora.getFullYear() - 1);
  // Habilitar si: es el más viejo archivado (siempre) O ya cumplió ≥ 1 año desde creación
  return (masViejoArchivadoId && e.id === masViejoArchivadoId) || fecha <= haceUnAnio;
  };

  // Abre el diálogo de confirmación para eliminación definitiva de un embarque archivado
  const eliminarArchivadoDefinitivo = (embarque: Embarque) => {
    setEmbarqueAEliminar(embarque);
    setShowEliminarArchivadoDialog(true);
  };

  // Ejecuta la eliminación una vez el usuario confirma en el diálogo
  const confirmarEliminarArchivado = async () => {
    const embarque = embarqueAEliminar;
    if (!embarque) return;
    try {
      setSaving(true);
      setShowEliminarArchivadoDialog(false);
      agregarAuditLog("ELIMINAR", "Embarques (Archivados)", `Folio: ${embarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      const { error } = await supabase.from("embarques").delete().eq("id", embarque.id);
      if (error) {
        console.error("Error eliminando embarque archivado:", error);
        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
        return;
      }
  toast({ title: "Eliminado", description: `Se eliminó el embarque ${embarque.folio}.`, variant: "destructive" });
      setEmbarqueAEliminar(null);
      await loadEmbarques();
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Error inesperado", description: "No se pudo eliminar el embarque.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getEstadoBadge = (estado: string | any, embarque?: Embarque) => {
    // Validación defensiva: si estado es un objeto, extraer el campo correcto
    let estadoValue: string;
    if (typeof estado === 'object' && estado !== null) {
      console.warn('⚠️ Estado es objeto, extrayendo valor:', estado);
      estadoValue = estado.estado || estado.estado_facturacion || 'creado';
    } else {
      estadoValue = String(estado || 'creado');
    }
    
    // 🔧 DEBUG: Logging para diagnosticar el badge
    if (embarque?.folio) {
      console.log(`🎯 [BADGE] ${embarque.folio}: estado='${estadoValue}' (tipo: ${typeof estado})`);
    }
    
    // ❌ REMOVIDO: Lógica de globo "modificado" por generar falsos positivos
    // Solo mostrar badges para estados que requieren atención o acción
    
    // No mostrar badge para estado 'creado' inicial - solo cuando hay cambios de estado
    if (estadoValue === "creado") {
      console.log(`🎯 [BADGE] ${embarque?.folio || 'unknown'}: Sin badge (estado creado)`);
      return null;
    }

    const estados = {
      "listo-para-asignar": {
        color: "bg-green-100 text-green-800",
        label: "Listo para Asignar",
      },
      asignado: { color: "bg-yellow-100 text-yellow-800", label: "Asignado" },
      "en-transito": {
        color: "bg-orange-100 text-orange-800",
        label: "En Tránsito",
      },
      finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
      entregado: { color: "bg-green-100 text-green-800", label: "Entregado" },
      cancelado: { color: "bg-red-100 text-red-800", label: "Cancelado" },
      archivado: { color: "bg-purple-100 text-purple-800", label: "Archivado" },
    };

    const estadoInfo = estados[estadoValue as keyof typeof estados] || {
      color: "bg-gray-100 text-gray-800",
      label: estadoValue,
    };

    console.log(`🎯 [BADGE] ${embarque?.folio || 'unknown'}: Mostrando badge '${estadoInfo.label}' con color '${estadoInfo.color}'`);

    return (
      <Badge className={`${estadoInfo.color} hover:${estadoInfo.color}`}>
        {estadoInfo.label}
      </Badge>
    );
  };

  const getVehicleStatusBadge = (estado: string) => {
    return estado === "disponible" || estado === "activo" ? (
      <Badge className="bg-green-100 text-green-800 text-xs ml-2">Activo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 text-xs ml-2">Inactivo</Badge>
    );
  };

  // Normalizadores para etiquetas de Facturación
  const renderEmpresaFacturadora = (value?: string | null) => {
    if (!value) return "Por definir";
    const v = String(value).toLowerCase().replace(/\s|_/g, "");
    if (v.includes("fernandocarbajo") || v.includes("josefernandocabarjo") || v.includes("cabarjo")) {
      return "Fernando Carbajo Transportes";
    }
    if (v.includes("monarca")) {
      return "Transportes Monarca";
    }
    return value;
  };

  const renderDivisaPago = (value?: string | null) => {
    if (!value) return "No especificada";
    const v = String(value).toUpperCase();
    if (v === "USD") return "Dólares Americanos (USD)";
    if (v === "MXN") return "Pesos Mexicanos (MXN)";
    return value;
  };

  const renderFormaFacturacion = (value?: string | null) => {
    if (!value) return "No especificada";
    const v = String(value).toLowerCase().trim();
    // PUE
    if (
      v === "pue" ||
      v.includes("una sola") ||
      v.includes("exhibici") ||
      v.includes("contado")
    ) {
      return "Pago en una sola exhibición (PUE)";
    }
    // PPD
    if (v === "ppd" || v.includes("parcial") || v.includes("diferid")) {
      return "Pago en parcialidades o diferido (PPD)";
    }
    // Valor crudo si no coincide con nuestros mapeos
    return value;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Cargando embarques...</span>
        </div>
      </MainLayout>
    );
  }

  // Botón de "Llenar Datos de Prueba" removido por requerimiento (se elimina helper)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Crear Embarques
            </h1>
            <p className="text-gray-600 mt-2">
              Administrar embarques y asignaciones
            </p>
          </div>
          <div className="flex space-x-2">
            {/* Botón Archivos blanco y negro (outline clásico) */}
            <Button
              variant="outline"
              className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
              onClick={() => setShowArchivosModal(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              Archivos
            </Button>
            {/* Botón Exportar (activos no archivados) */}
            <Button variant="outline" onClick={exportarEmbarquesActivosAExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            {/* Botón Nuevo Embarque en verde */}
            <Button
              onClick={handleCreate}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Embarque
            </Button>
          </div>
        </div>
        {/* Modal de Archivos (Embarques Archivados) */}
    <Dialog open={showArchivosModal} onOpenChange={setShowArchivosModal}>
  <DialogContent className="w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Consulta de Embarques Archivados</DialogTitle>
              <DialogDescription>
                Aquí puedes buscar y consultar los embarques que han sido
                archivados. Usa los filtros para encontrar un registro
                específico.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4 flex flex-col md:flex-row md:items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="archivos-search">Buscar</Label>
                <Input
                  id="archivos-search"
                  placeholder="Buscar por folio, cliente o load..."
                  value={archivosSearch}
                  onChange={(e) => setArchivosSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Label htmlFor="archivos-tipo-servicio">Tipo de Servicio</Label>
                <Select
                  value={archivosTipoServicio}
                  onValueChange={setArchivosTipoServicio}
                >
                  <SelectTrigger id="archivos-tipo-servicio">
                    <SelectValue placeholder="Filtrar por tipo de servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tiposServicioArchivados.map((tipoId) => (
                      <SelectItem key={tipoId} value={tipoId}>
                        {getServiceDisplayName(tipoId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-2 mb-3 flex flex-wrap gap-2">
              <Button
                variant={archivosPeriodo === "todo" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "todo" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("todo")}
              >
                Todo
              </Button>
              <Button
                variant={archivosPeriodo === "mes_actual" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "mes_actual" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("mes_actual")}
              >
                Mes actual
              </Button>
              <Button
                variant={archivosPeriodo === "mes_anterior" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "mes_anterior" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("mes_anterior")}
              >
                Mes anterior
              </Button>
              <Button
                variant={archivosPeriodo === "ultimos_3" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "ultimos_3" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("ultimos_3")}
              >
                Últ. 3 meses
              </Button>
              <Button
                variant={archivosPeriodo === "ultimos_6" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "ultimos_6" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("ultimos_6")}
              >
                Últ. 6 meses
              </Button>
              <Button
                variant={archivosPeriodo === "este_anio" ? "default" : "outline"}
                size="sm"
                className={archivosPeriodo === "este_anio" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                onClick={() => setArchivosPeriodo("este_anio")}
              >
                Este año
              </Button>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                Mostrando {totalArchivadosFiltrados === 0 ? 0 : firstIdx + 1}
                –{lastIdx} de {totalArchivadosFiltrados}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span>Tamaño página</span>
                  <Select
                    value={String(archivosPageSize)}
                    onValueChange={(v) => setArchivosPageSize(Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {totalArchivadosPaginas > 1 && (
                    <div className="flex items-center gap-1">
                      {/* Botón Primera página */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setArchivosPage(1)}
                        disabled={archivosPage <= 1}
                        className="px-2"
                      >
                        ⏮
                      </Button>
                      {/* Botón Anterior */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setArchivosPage((p) => Math.max(1, p - 1))}
                        disabled={archivosPage <= 1}
                        className="px-2"
                      >
                        ◀
                      </Button>
                      
                      {/* Números de página */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const current = archivosPage;
                          const total = totalArchivadosPaginas;
                          const showPages = [];
                          
                          if (total <= 7) {
                            // Mostrar todas las páginas si son pocas
                            for (let i = 1; i <= total; i++) {
                              showPages.push(i);
                            }
                          } else {
                            // Lógica compleja para muchas páginas
                            const pages = new Set<number>();
                            
                            // Siempre página 1
                            pages.add(1);
                            
                            // Páginas alrededor de la actual
                            for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
                              pages.add(i);
                            }
                            
                            // Siempre última página
                            pages.add(total);
                            
                            // Convertir a array ordenado
                            const sortedPages = Array.from(pages).sort((a, b) => a - b);
                            
                            // Agregar elipsis donde haya gaps
                            for (let i = 0; i < sortedPages.length; i++) {
                              if (i > 0 && sortedPages[i] - sortedPages[i - 1] > 1) {
                                showPages.push('...');
                              }
                              showPages.push(sortedPages[i]);
                            }
                          }
                          
                          return showPages.map((page, idx) => 
                            page === '...' ? (
                              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-xs">...</span>
                            ) : (
                              <Button
                                key={`page-${page}`}
                                variant={page === current ? "default" : "outline"}
                                size="sm"
                                className={`px-2 min-w-8 text-xs ${page === current ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                onClick={() => setArchivosPage(Number(page))}
                              >
                                {page}
                              </Button>
                            )
                          );
                        })()}
                      </div>
                      
                      {/* Botón Siguiente */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setArchivosPage((p) => Math.min(totalArchivadosPaginas, p + 1))
                        }
                        disabled={archivosPage >= totalArchivadosPaginas}
                        className="px-2"
                      >
                        ▶
                      </Button>
                      {/* Botón Última página */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setArchivosPage(totalArchivadosPaginas)}
                        disabled={archivosPage >= totalArchivadosPaginas}
                        className="px-2"
                      >
                        ⏭
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                    onClick={exportarArchivadosAExcel}
                  >
                    Descargar Excel
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-[150px] md:w-[182px] cursor-pointer select-none" onClick={() => handleSort("folio")}>Folio{sortIndicator("folio")}</th>
                    <th className="px-3 py-2 text-left font-semibold w-44 md:w-64 cursor-pointer select-none" onClick={() => handleSort("cliente")}>
                      Cliente{sortIndicator("cliente")}
                    </th>
                    <th className="px-3 py-2 text-center font-semibold w-14 md:w-16 cursor-pointer select-none" onClick={() => handleSort("load")}>Load{sortIndicator("load")}</th>
                    <th className="px-3 py-2 text-center font-semibold w-16 md:w-20 cursor-pointer select-none" onClick={() => handleSort("estatus")}>Estatus{sortIndicator("estatus")}</th>
                    <th className="px-3 py-2 text-left font-semibold w-[132px] md:w-[196px] cursor-pointer select-none min-w-[232px] md:min-w-[296px]" onClick={() => handleSort("tipo")}>
                      Tipo de Servicio{sortIndicator("tipo")}
                    </th>
                    <th className="px-3 py-2 text-left font-semibold w-32 cursor-pointer select-none" onClick={() => handleSort("fecha")}>Fecha de creación{sortIndicator("fecha")}</th>
                    <th className="px-3 py-2 text-center font-semibold w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {embarquesArchivadosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        <Package className="h-10 w-10 mx-auto mb-2 text-purple-400" />
                        No hay embarques archivados que coincidan
                      </td>
                    </tr>
                  ) : (
                    embarquesArchivadosPaginados.map((embarque) => (
                      <tr
                        key={`${(embarque as any)._fuente || 'unknown'}-${embarque.id}`}
                        className="border-b hover:bg-purple-50"
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap w-[150px] md:w-[182px]">
                          {embarque.folio}
                        </td>
                        <td className="px-3 py-2 w-44 md:w-64 truncate">
                          {embarque.cliente?.nombre || ""}
                        </td>
                        <td className="px-3 py-2 w-14 md:w-16 truncate text-center font-mono">
                          {embarque.load_number || ""}
                        </td>
                        <td className="px-3 py-2 w-16 md:w-20 text-center">
                          {embarque.cancelado_por || embarque.motivo_cancelacion || embarque.fecha_cancelacion || (embarque.observaciones?.toUpperCase().includes("[CANCELADO]")) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                              Cancelado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                              Finalizado
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[132px] md:w-[196px] min-w-[232px] md:min-w-[296px] truncate">
                          {getServiceDisplayName(embarque.tipo_servicio_id || "")}
                        </td>
                        <td className="px-3 py-2 w-32 whitespace-nowrap">
                          {embarque.fecha_creacion
                            ? new Date(embarque.fecha_creacion).toLocaleDateString("es-MX")
                            : ""}
                        </td>
                        <td className="px-3 py-2 text-center w-20">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(embarque)}
                              aria-label="Ver detalles"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarArchivadoDefinitivo(embarque)}
                              disabled={!puedeEliminarArchivado(embarque)}
                              className={`text-red-600 hover:bg-red-50${
                                !puedeEliminarArchivado(embarque) ? " opacity-50 cursor-not-allowed text-gray-400 hover:bg-transparent" : ""
                              }`}
                              aria-label="Eliminar definitivamente"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Pagination moved to header next to 'Descargar Excel' */}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar eliminación definitiva de embarques archivados */}
        <Dialog open={showEliminarArchivadoDialog} onOpenChange={setShowEliminarArchivadoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar embarque archivado</DialogTitle>
              <DialogDescription>
                ¿Estás seguro que deseas eliminar definitivamente el embarque {embarqueAEliminar?.folio}? Esta acción no se puede deshacer y eliminará el registro de forma permanente.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowEliminarArchivadoDialog(false)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmarEliminarArchivado} disabled={saving}>
                Eliminar definitivamente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar archivado de un embarque */}
        <Dialog open={showArchivarDialog} onOpenChange={setShowArchivarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archivar embarque</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas archivar el embarque {embarqueAArchivar?.folio}? Se moverá al historial de archivados.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowArchivarDialog(false)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={async () => {
                if (!embarqueAArchivar) return;
                setShowArchivarDialog(false);
                try {
                  await updateEstado(embarqueAArchivar, "archivado");
                  // mostrar toast de confirmación (azul con texto blanco solo para este toast)
                  toast({ title: "Embarque archivado exitosamente", description: `Folio: ${embarqueAArchivar.folio}`, className: "bg-blue-600 text-white" });
                } catch (e) {
                  // si updateEstado lanza, mostrar error
                  toast({ title: "Error al archivar", description: "No se pudo archivar el embarque.", variant: "destructive" });
                }
                setEmbarqueAArchivar(null);
              }}>Archivar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar completar y enviar el embarque a Asignación */}
        <Dialog open={showCompletarDialog} onOpenChange={setShowCompletarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Completar y enviar embarque</DialogTitle>
              <DialogDescription>
                ¿Deseas completar y enviar el embarque {embarqueACompletar?.folio} a Asignación? Esta acción cambiará su estado a "listo-para-asignar".
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCompletarDialog(false)}>Cancelar</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmarCompletar} disabled={saving}>Confirmar</Button>
            </div>
          </DialogContent>
        </Dialog>

  {/* Estadísticas */}
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Embarques creados en el año */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Creados este año
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      embarques.filter(
                        (e) =>
                          new Date(e.fecha_creacion).getFullYear() ===
                          new Date().getFullYear()
                      ).length
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Total del año en curso</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          {/* Listos para completar y enviar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Listos para completar y enviar
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {embarques.filter((e) => e.estado === "creado").length}
                  </p>
                  <p className="text-xs text-gray-500">Con botón "Completar y Enviar"</p>
                </div>
                <RefreshCw className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          {/* (removido) Tarjeta de embarques cancelados, no es necesaria */}
          {/* Top cliente del año */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Top cliente (año)
                  </p>
                  <p className="text-sm font-bold text-purple-600 break-words">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const counts: Record<string, number> = {};
                      embarques.forEach((e) => {
                        if (
                          e.cliente?.nombre &&
                          new Date(e.fecha_creacion).getFullYear() ===
                            currentYear
                        ) {
                          counts[e.cliente.nombre] =
                            (counts[e.cliente.nombre] || 0) + 1;
                        }
                      });
                      const top = Object.entries(counts).sort(
                        (a, b) => b[1] - a[1]
                      )[0];
                      return top ? `${top[0]} (${top[1]})` : "Sin datos";
                    })()}
                  </p>
                  <p className="text-xs text-gray-500">Cliente con más embarques</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          {/* Servicio más solicitado */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Servicio más solicitado (año)
                  </p>
                  <p className="text-sm font-bold text-green-600 break-words">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const counts: Record<string, number> = {};
                      embarques.forEach((e) => {
                        if (
                          e.tipo_servicio_id &&
                          new Date(e.fecha_creacion).getFullYear() ===
                            currentYear
                        ) {
                          counts[e.tipo_servicio_id] =
                            (counts[e.tipo_servicio_id] || 0) + 1;
                        }
                      });
                      const top = Object.entries(counts).sort(
                        (a, b) => b[1] - a[1]
                      )[0];
                      return top
                        ? getServiceDisplayName(top[0]) + ` (${top[1]})`
                        : "Sin datos";
                    })()}
                  </p>
                  <p className="text-xs text-gray-500">Tipo de servicio más frecuente</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          {/* Total de clientes activos */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Clientes totales
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clientes.length}
                  </p>
                  <p className="text-xs text-gray-500">Total de clientes</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y paginación superior */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex-1 max-w-xl md:max-w-2xl">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por folio, dirección o cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setListaPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-700">
              Página {listaPage} de {totalListaPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setListaPage((p) => Math.max(1, p - 1))}
                disabled={listaPage <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setListaPage((p) => Math.min(totalListaPages, p + 1))}
                disabled={listaPage >= totalListaPages}
              >
                Siguiente
              </Button>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Por página:</span>
              <Select
                value={String(listaPageSize)}
                onValueChange={(v) => {
                  const newSize = Number.parseInt(v, 10);
                  setListaPageSize(newSize);
                  setListaPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 por página</SelectItem>
                  <SelectItem value="12">12 por página</SelectItem>
                  <SelectItem value="18">18 por página</SelectItem>
                  <SelectItem value="24">24 por página</SelectItem>
                  <SelectItem value="48">48 por página</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
              <Select
                value={filtroEstado}
                onValueChange={(v) => {
                  cambiarFiltroEstado(v);
                  setListaPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="creado">Por completar y enviar</SelectItem>
                  <SelectItem value="listo-para-asignar">Listos para asignar</SelectItem>
                  <SelectItem value="asignado">Asignados</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Lista de embarques */}
        <div className="grid grid-cols-1 gap-4">
          {embarquesPaginados.map((embarque) => (
            <Card
              key={`${(embarque as any)._fuente || 'unknown'}-${embarque.id}`}
              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                embarque.estado === "contingencia"
                  ? "border-red-500 bg-red-50"
                  : ""
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <CardTitle className="text-lg">
                        <span className="inline-flex items-center text-blue-600">
                          <Package className="h-5 w-5 text-blue-600 mr-1" />
                          Folio: {embarque.folio}
                        </span>
                        {embarque.estado === "contingencia" && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold shadow-lg ml-1"
                            title="Contingencia"
                          >
                            Contingencia
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {embarque.cliente?.nombre &&
                        `Cliente: ${embarque.cliente.nombre}`}
                      {embarque.operador &&
                        ` • Operador: ${embarque.operador.nombre} ${embarque.operador.apellidos}`}
                      {embarque.info_representante &&
                        ` • Representante: ${
                          embarque.info_representante.nombre
                        } ${embarque.info_representante.apellidos || ""}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getEstadoBadge(embarque.estado, embarque)}
                    {embarque.estado === "contingencia" && (
                      <div className="relative group flex items-center">
                        <span className="bg-red-100 text-red-800 border border-red-300 rounded px-2 py-1 text-xs font-semibold mr-2 cursor-pointer">
                          Contingencia
                        </span>
                        <span className="absolute left-0 -top-7 z-10 px-2 py-1 text-xs rounded bg-red-700 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Este embarque fue marcado como contingencia en
                          asignación y requiere atención especial.
                        </span>
                      </div>
                    )}
                    <div className="flex space-x-1 items-center">
                      {(() => {
                        // Detectar múltiples direcciones para mostrar globo a la izquierda de "Ver detalles"
                        const editandoEsteEmbarque = embarqueEditando?.id === embarque.id;
                        let recolectasArray, entregasArray;
                        
                        if (editandoEsteEmbarque) {
                          recolectasArray = formData.recolectas;
                          entregasArray = formData.entregas;
                        } else {
                          // Prioridad 1: Obtener desde campos JSON
                          try {
                            recolectasArray = (embarque as any).recolectas_json ? JSON.parse((embarque as any).recolectas_json) : [];
                            entregasArray = (embarque as any).entregas_json ? JSON.parse((embarque as any).entregas_json) : [];
                          } catch (jsonError) {
                            recolectasArray = [];
                            entregasArray = [];
                          }
                          
                          // Prioridad 2: Si no hay datos JSON, extraer de observaciones (fallback)
                          if (recolectasArray.length === 0 && entregasArray.length === 0) {
                            const { recolectas, entregas } = extraerDireccionesMultiples(embarque.observaciones || null);
                            recolectasArray = recolectas.length > 0 ? recolectas : [{ direccion: embarque.direccion_recolecta }];
                            entregasArray = entregas.length > 0 ? entregas : [{ direccion: embarque.direccion_entrega }];
                          } else {
                            // Si tenemos datos JSON pero están vacíos, usar datos principales
                            if (recolectasArray.length === 0) recolectasArray = [{ direccion: embarque.direccion_recolecta }];
                            if (entregasArray.length === 0) entregasArray = [{ direccion: embarque.direccion_entrega }];
                          }
                        }
                        
                        if (tieneMultiplesDirecciones(recolectasArray, entregasArray)) {
                          return (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help"
                              title="Este embarque tiene múltiples direcciones de recolección o entrega"
                            >
                              D. Múltiples
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* Badge F. Falso */}
                      {embarqueEsFleteFalso(embarque) && (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                          title="Este embarque está marcado como flete en falso (contingencia)"
                        >
                          F. Falso
                        </span>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(embarque)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {embarque.estado === "archivado"
                          ? "Ver Archivo"
                          : "Ver Detalles"}
                      </Button>

                      {/* Botón Publicacion: generar liga pública para este embarque */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!embarque.id) {
                            toast({ title: "ID no disponible", description: "No se pudo obtener el ID del embarque.", variant: "destructive" });
                            return;
                          }
                          // Open modal so user can pick an expiration before generating
                          setPublicGeneratedLink("");
                          setPublicLinkExpiresAt(null);
                          setPublicExpirationInput(null);
                          setPublicForEmbarqueId(embarque.id || null);
                          setShowPublicLinkModal(true);
                        }}
                        disabled={saving}
                        title="Generar publicación pública"
                      >
                        <Link className="h-4 w-4 mr-1" />
                        Publicacion
                      </Button>

                      {/* 🔧 Renderizado condicional de botones según estado */}
                      {(() => {
                        // Debug logging para diagnosticar renderizado
                        console.log(`🎯 [RENDER] ${embarque.folio}: estado='${embarque.estado}' → ${
                          embarque.estado === "creado" ? "Botón Completar y Enviar" :
                          embarque.estado === "listo-para-asignar" ? "Badge Verde + Botón Archivar" :
                          embarque.estado === "cancelado" ? "Badge Rojo + Botón Archivar" :
                          "Otro estado: " + embarque.estado
                        }`);
                        
                        if (embarque.estado === "creado" && !(embarque as any)._completadoLocal) {
                          return (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => marcarComoCompletado(embarque)}
                              disabled={saving || (embarque as any)._completadoLocal}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Completar y Enviar
                            </Button>
                          );
                        }
                        
                        return null;
                      })()}

                      {/* Embarques listos para asignar (incluyendo los cancelados en esta fase) */}
                      {(embarque.estado === "listo-para-asignar" || 
                        (embarque.estado === "cancelado" && (embarque.cancelado_por || embarque.motivo_cancelacion || embarque.fecha_cancelacion))) && (() => {
                        console.log(`🎯 [RENDER] ${embarque.folio}: Renderizando estado ${embarque.estado} en sección de asignación`);
                        
                        const esCancelado = embarque.estado === "cancelado" || 
                                           embarque.cancelado_por || 
                                           embarque.motivo_cancelacion || 
                                           embarque.fecha_cancelacion;
                        
                        return (
                          <div className="flex items-center gap-2">
                            {/* Badge D. Múltiples para embarques listos para asignar */}
                            {(() => {
                              const { recolectas, entregas } = extraerDireccionesMultiples(embarque.observaciones || null);
                              
                              if (tieneMultiplesDirecciones(recolectas, entregas)) {
                                return (
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help"
                                    title="Este embarque tiene múltiples direcciones de recolección o entrega"
                                  >
                                    D. Múltiples
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {/* Badge F. Falso para embarques listos para asignar */}
                            {embarqueEsFleteFalso(embarque) && (
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                                title="Este embarque está marcado como flete en falso (contingencia)"
                              >
                                F. Falso
                              </span>
                            )}
                            
                            {/* Solo mostrar botón Archivar para embarques cancelados, otros botones para embarques normales */}
                            {esCancelado ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEmbarqueAArchivar(embarque);
                                  setShowArchivarDialog(true);
                                }}
                              >
                                Archivar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEmbarqueAArchivar(embarque);
                                  setShowArchivarDialog(true);
                                }}
                              >
                                Archivar
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                      {/* Embarques asignados (incluyendo los cancelados en esta fase) */}
                      {(embarque.estado === "asignado" || 
                        (embarque.estado === "cancelado" && (embarque.cancelado_por || embarque.motivo_cancelacion) && (embarque.operador_id || embarque.camion_id))) && (() => {
                        
                        const esCancelado = embarque.estado === "cancelado" || 
                                           embarque.cancelado_por || 
                                           embarque.motivo_cancelacion || 
                                           embarque.fecha_cancelacion;
                        
                        return (
                          <div className="flex items-center gap-2">
                            {/* Badge D. Múltiples para embarques asignados */}
                            {(() => {
                              const { recolectas, entregas } = extraerDireccionesMultiples(embarque.observaciones || null);
                              
                              if (tieneMultiplesDirecciones(recolectas, entregas)) {
                                return (
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help"
                                    title="Este embarque tiene múltiples direcciones de recolección o entrega"
                                  >
                                    D. Múltiples
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {/* Badge F. Falso para embarques asignados */}
                            {embarqueEsFleteFalso(embarque) && (
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                                title="Este embarque está marcado como flete en falso (contingencia)"
                              >
                                F. Falso
                              </span>
                            )}
                            
                            {/* Solo mostrar botón Archivar para embarques cancelados */}
                            {esCancelado ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEmbarqueAArchivar(embarque);
                                  setShowArchivarDialog(true);
                                }}
                              >
                                Archivar
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEmbarqueAArchivar(embarque);
                                  setShowArchivarDialog(true);
                                }}
                              >
                                Archivar
                              </Button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Botón Enviar Link oculto por requerimiento */}

                      {(embarque.estado === "finalizado" ||
                        embarque.estado === "cancelado") && (() => {
                        console.log(`🎯 [RENDER] ${embarque.folio}: Renderizando botón Archivar para estado ${embarque.estado}`);
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmbarqueAArchivar(embarque);
                              setShowArchivarDialog(true);
                            }}
                          >
                            Archivar
                          </Button>
                        );
                      })()}

                      {/* Botón Cancelar: oculto si el embarque ya fue cancelado */}
                      {embarque.estado !== "cancelado" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCancelingEmbarque(embarque);
                            setShowCancelModal(true);
                          }}
                          disabled={embarque.estado === "listo-para-asignar"}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">Recolecta</p>
                      </div>
                      {embarque.direccion_recolecta && (
                        <p className="text-xs text-gray-500">
                          {embarque.direccion_recolecta}
                        </p>
                      )}
                    </div>
                  </div>
                  {embarque.fecha_recolecta && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">Fecha Recolecta</p>
                        <p className="text-gray-600">
                          {formatDateMatamoros(normalizeDate(embarque.fecha_recolecta) || embarque.fecha_recolecta)}
                          {embarque.hora_recolecta && ` ${embarque.hora_recolecta}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Entrega</p>
                      {embarque.direccion_entrega && (
                        <p className="text-xs text-gray-500">
                          {embarque.direccion_entrega}
                        </p>
                      )}
                    </div>
                  </div>
                  {embarque.fecha_entrega && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">Fecha Entrega</p>
                        <p className="text-gray-600">
                          {formatDateMatamoros(normalizeDate(embarque.fecha_entrega) || embarque.fecha_entrega)}
                          {embarque.hora_entrega && ` ${embarque.hora_entrega}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm border-t pt-3">
                  {embarque.camion && (
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">Camión</p>
                        <p className="text-xs text-gray-500">
                          {embarque.camion.numero_economico}
                        </p>
                      </div>
                    </div>
                  )}

                  {(embarque.tipo_servicio_id ||
                    (embarque.cliente &&
                      ((embarque.cliente as any).divisa_pago ||
                        (embarque.cliente as any).moneda_preferida))) && (
                    <div className="flex flex-col md:flex-row md:space-x-8 space-y-3 md:space-y-0 lg:col-span-3">
                      {embarque.tipo_servicio_id && (
                        <div className="flex-1 min-w-0 flex items-start space-x-3">
                          <Package className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium">Tipo de Servicio</p>
                            <p className="text-xs text-gray-600">
                              {getServiceDisplayName(embarque.tipo_servicio_id)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const t = tiposServicio.find((x) => x.id === (embarque.tipo_servicio_id as any));
                                if (!t) return null;
                                const monto = obtenerMontoTipoServicio(t, precioGlobalFleteFalso, embarque);
                                
                                // Mostrar contexto adicional si es flete falso
                                const esFleteFalso = embarque?.flete_falso === true;
                                const sufijo = esFleteFalso ? " (flete falso)" : "";
                                
                                return `Pago operador: $${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${sufijo}`;
                              })()}
                            </p>
                          </div>
                        </div>
                      )}

                      {getRemolqueTexto(embarque) && (
                        <div className="flex-1 min-w-0 flex items-start space-x-3">
                          <Truck className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium">Remolque</p>
                            {embarque.remolque ? (
                              <div className="text-xs text-gray-600">
                                <div>
                                  {embarque.remolque.numero_economico || "-"}
                                  {embarque.remolque.marca ? ` • ${embarque.remolque.marca}` : ''}
                                </div>
                                {/* modelo y año removidos por requerimiento de UI */}
                                <div>{embarque.remolque.placas ? `Placas: ${embarque.remolque.placas}` : ''}</div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">{(embarque as any).remolque_numero_economico || (embarque as any).remolque_placa || getRemolqueTexto(embarque)}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(embarque.cliente && (((embarque.cliente as any).divisa_pago || (embarque.cliente as any).moneda_preferida))) && (
                        <div className="flex-1 min-w-0 flex items-start space-x-3">
                          <span className="font-medium">Divisa de Pago:</span>
                          <span className="text-xs text-gray-500">
                            {((embarque.cliente as any).divisa_pago || (embarque.cliente as any).moneda_preferida)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                </div>

                {(embarque.load_number ||
                  embarque.patente_agente_aduanal ||
                  embarque.aduana_cruce ||
                  embarque.dueno_mercancia) && (
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-2 text-gray-700">
                      Información Aduanal
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {embarque.load_number && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Load:</span>{" "}
                          {embarque.load_number}
                        </div>
                      )}
                      {embarque.patente_agente_aduanal && (
                        <div className="text-sm">
                          <span className="font-medium">Patente:</span>{" "}
                          {embarque.patente_agente_aduanal}
                        </div>
                      )}
                      {embarque.aduana_cruce && (
                        <div className="text-sm">
                          <span className="font-medium">Aduana:</span>{" "}
                          {embarque.aduana_cruce}
                        </div>
                      )}
                      {embarque.dueno_mercancia && (
                        <div className="text-sm">
                          <span className="font-medium">Cliente del Embarque:</span>{" "}
                          {embarque.dueno_mercancia}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(embarque.contenido || embarque.observaciones) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {embarque.contenido && (
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Contenido:</strong> {embarque.contenido}
                        </p>
                      </div>
                    )}
                    {embarque.observaciones && (
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Observaciones:</strong>{" "}
                          {embarque.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Creado:{" "}
                  {new Date(embarque.fecha_creacion).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {embarquesFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron embarques</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Controles de paginación inferior (lista de embarques) */}
        {embarquesFiltrados.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-600">
              Mostrando {embarquesPaginados.length} de {embarquesFiltrados.length}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-700">
                Página {listaPage} de {totalListaPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListaPage((p) => Math.max(1, p - 1))}
                  disabled={listaPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setListaPage((p) => Math.min(totalListaPages, p + 1))}
                  disabled={listaPage >= totalListaPages}
                >
                  Siguiente
                </Button>
              </div>
              <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Por página:</span>
                <Select
                  value={String(listaPageSize)}
                  onValueChange={(v) => {
                    const newSize = Number.parseInt(v, 10);
                    setListaPageSize(newSize);
                    setListaPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Por página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 por página</SelectItem>
                    <SelectItem value="12">12 por página</SelectItem>
                    <SelectItem value="18">18 por página</SelectItem>
                    <SelectItem value="24">24 por página</SelectItem>
                    <SelectItem value="48">48 por página</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
                <Select
                  value={filtroEstado}
                  onValueChange={(v) => {
                    cambiarFiltroEstado(v);
                    setListaPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="creado">Por completar y enviar</SelectItem>
                    <SelectItem value="listo-para-asignar">Listos para asignar</SelectItem>
                    <SelectItem value="asignado">Asignados</SelectItem>
                    <SelectItem value="finalizado">Finalizados</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Modal para crear/editar embarque */}
        <Dialog
          open={showCreateModal || showEditModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEmbarqueEditando(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {embarqueEditando ? "Modificar Embarque" : "Nuevo Embarque"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del embarque
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Información Básica</CardTitle>
                      {/* Autocompletar solo cuando se crea un embarque (no al editar) */}
                      {!embarqueEditando && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFillAllFields}
                          disabled={saving}
                          title="Autocompletar campos con datos de ejemplo"
                        >
                          Autocompletar
                        </Button>
                      )}
                      {/* Generar liga pública: (oculto por ahora) */}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="basica" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basica">
                        Información Básica
                      </TabsTrigger>
                      <TabsTrigger value="direcciones">Direcciones</TabsTrigger>
                      <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
                      <TabsTrigger value="detalles">Detalles</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basica" className="space-y-4 mt-6">
                      {/* Row 1: Folio and Cliente */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="folio">Folio</Label>
                          <Input
                            id="folio"
                            value={
                              embarqueEditando ? formData.folio : proximoFolio
                            }
                            disabled
                            className="bg-gray-50 font-mono"
                            placeholder="Generando folio..."
                          />
                          <p className="text-xs text-gray-500">
                            {embarqueEditando
                              ? "Folio asignado"
                              : "Folio que se asignará automáticamente"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cliente_id">Cliente</Label>
                          <Select
                            value={formData.cliente_id}
                            onValueChange={(value) => {
                              setFormData({
                                ...formData,
                                cliente_id: value,
                                representante_cliente: "",
                              });
                              cargarContactos(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {clientes.map((cliente) => (
                                <SelectItem key={cliente.id} value={cliente.id}>
                                  {cliente.nombre}{" "}
                                  {cliente.empresa && `- ${cliente.empresa}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 2: Tipo de Servicio and Contacto de Cliente */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_servicio_id">
                            Tipo de Servicio
                          </Label>
                          <Select
                            value={formData.tipo_servicio_id || "none"}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                tipo_servicio_id: value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  formData.tipo_servicio_id
                                    ? getServiceDisplayName(
                                        formData.tipo_servicio_id
                                      )
                                    : "Seleccionar tipo de servicio"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {tiposServicio.length > 0 ? (
                                tiposServicio.map((tipo) => (
                                  <SelectItem key={tipo.id} value={tipo.id}>
                                    {tipo.nombre}
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  {/* Fallback a valores hardcodeados si no hay datos en BD */}
                                  <SelectItem value="exportacion-cargada-caja-seca-240">
                                    EXPORTACIÓN CARGADA - CAJA SECA 240
                                  </SelectItem>
                                  <SelectItem value="exportacion-cargada-larmex-240">
                                    EXPORTACIÓN CARGADA - CAJA SECA (LARMEX) 240
                                  </SelectItem>
                                  <SelectItem value="exportacion-cargada-thermo-agricultura-240">
                                    EXPORTACIÓN CARGADA - THERMO (AGRICULTURA)
                                    240
                                  </SelectItem>
                                  <SelectItem value="exportacion-cargada-plataforma-240">
                                    EXPORTACIÓN CARGADA - PLATAFORMA 240
                                  </SelectItem>
                                  <SelectItem value="importacion-cargada-caja-seca-240">
                                    IMPORTACIÓN CARGADA - CAJA SECA 240
                                  </SelectItem>
                                  <SelectItem value="importacion-cargada-plataforma-240">
                                    IMPORTACIÓN CARGADA - PLATAFORMA 240
                                  </SelectItem>
                                  <SelectItem value="importacion-vacia-caja-seca-thermo-240">
                                    IMPORTACIÓN VACÍA - CAJA SECA/THERMO 240
                                  </SelectItem>
                                  <SelectItem value="importacion-cargada-plataforma-amarre-240">
                                    IMPORTACIÓN CARGADA - PLATAFORMA CON AMARRE
                                    240
                                  </SelectItem>
                                  <SelectItem value="importacion-en-tractor-240">
                                    IMPORTACIÓN - EN TRACTOR 240
                                  </SelectItem>
                                  <SelectItem value="exportacion-cargada-caja-seca-800">
                                    EXPORTACIÓN CARGADA - CAJA SECA 800
                                  </SelectItem>
                                  <SelectItem value="exportacion-vacia-caja-seca-800">
                                    EXPORTACIÓN VACÍA - CAJA SECA 800
                                  </SelectItem>
                                  <SelectItem value="exportacion-en-tractor-800">
                                    EXPORTACIÓN - EN TRACTOR 800
                                  </SelectItem>
                                  <SelectItem value="exportacion-cargada-plataforma-800">
                                    EXPORTACIÓN CARGADA - PLATAFORMA 800
                                  </SelectItem>
                                  <SelectItem value="importacion-cargada-caja-seca-800">
                                    IMPORTACIÓN CARGADA - CAJA SECA 800
                                  </SelectItem>
                                  <SelectItem value="importacion-vacia-plataforma-800">
                                    IMPORTACIÓN VACÍA - PLATAFORMA 800
                                  </SelectItem>
                                  <SelectItem value="pagos-extras">
                                    PAGOS EXTRAS
                                  </SelectItem>
                                  <SelectItem value="horas-rojo-amarillo">
                                    HORAS ROJO/AMARILLO
                                  </SelectItem>
                                  <SelectItem value="cargas-descargas">
                                    CARGAS/DESCARGAS
                                  </SelectItem>
                                  <SelectItem value="movimientos-en-falso">
                                    MOVIMIENTOS EN FALSO
                                  </SelectItem>
                                  <SelectItem value="movimientos-locales">
                                    MOVIMIENTOS LOCALES
                                  </SelectItem>
                                  <SelectItem value="otro">OTRO</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="representante_cliente">
                            Contacto de Cliente
                          </Label>
                          <Select
                            value={formData.representante_cliente}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                representante_cliente: value,
                              }))
                            }
                            disabled={
                              !formData.cliente_id || contactos.length === 0
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  contactos.length === 0
                                    ? "Selecciona un cliente primero"
                                    : "Selecciona un contacto"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin contacto</SelectItem>
                              {contactos.map((contacto) => {
                                const nombreCompleto = `${contacto.nombre || ""} ${(
                                  contacto as any
                                ).apellidos || ""}`
                                  .replace(/\s+/g, " ")
                                  .trim();
                                const telefono = (contacto as any).telefono || "";
                                const label = telefono
                                  ? `${nombreCompleto} - ${telefono}`
                                  : nombreCompleto;
                                return (
                                  <SelectItem key={contacto.id} value={contacto.id}>
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Carta Porte and Load Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="carta_porte">
                            Número de Carta Porte
                          </Label>
                          <Input
                            id="carta_porte"
                            value={formData.carta_porte}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                carta_porte: e.target.value,
                              })
                            }
                            placeholder="Número de carta porte"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="load_number">Load Number</Label>
                          <Input
                            id="load_number"
                            value={formData.load_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                load_number: e.target.value,
                              })
                            }
                            placeholder="Número de load"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="direcciones" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Información de Recolecta</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              className="rounded-none w-8 h-8 flex items-center justify-center"
                              onClick={() => {
                                // Remove last recolecta (but keep at least one)
                                const next = (formData.recolectas || []).slice(0, -1);
                                setFormData({ ...formData, recolectas: next.length ? next : [{ direccion: "", fecha: "", hora: "" }] });
                              }}
                            >
                              -
                            </Button>
                            <Button
                              className="w-8 h-8 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setFormData({ ...formData, recolectas: [...(formData.recolectas || []), { direccion: "", fecha: "", hora: "" }] });
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        {(formData.recolectas || []).map((r: any, idx: number) => (
                          <div key={`reco-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start bg-green-50 border-l-4 border-green-400 p-2 rounded-md">
                            <div className="space-y-1 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-green-600 text-white">{idx + 1}</span>
                                  <Label>
                                    {idx === 0 ? "Recolecta original" : `Recolecta ${idx}`}
                                  </Label>
                                </div>
                                {/* removed incluir checkbox per requirements */}
                              </div>
                              <Textarea
                                value={r.direccion}
                                onChange={(e) => {
                                  const next = [...(formData.recolectas || [])];
                                  next[idx] = { ...next[idx], direccion: e.target.value };
                                  setFormData({ ...formData, recolectas: next });
                                }}
                                placeholder="Dirección completa de recolecta"
                                rows={1}
                                className={"flex h-10 min-h-0 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm leading-tight box-border appearance-none resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <Label>Fecha</Label>
                              <Input
                                type="date"
                                value={r.fecha}
                                onChange={(e) => {
                                  const next = [...(formData.recolectas || [])];
                                  next[idx] = { ...next[idx], fecha: e.target.value };
                                  setFormData({ ...formData, recolectas: next });
                                }}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <Label>Hora</Label>
                              <Input
                                type="time"
                                value={r.hora}
                                onChange={(e) => {
                                  const next = [...(formData.recolectas || [])];
                                  next[idx] = { ...next[idx], hora: e.target.value };
                                  setFormData({ ...formData, recolectas: next });
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Información de Entrega</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              className="rounded-none w-8 h-8 flex items-center justify-center"
                              onClick={() => {
                                const next = (formData.entregas || []).slice(0, -1);
                                setFormData({ ...formData, entregas: next.length ? next : [{ direccion: "", fecha: "", hora: "" }] });
                              }}
                            >
                              -
                            </Button>
                            <Button
                              className="w-8 h-8 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setFormData({ ...formData, entregas: [...(formData.entregas || []), { direccion: "", fecha: "", hora: "" }] });
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        {(formData.entregas || []).map((r: any, idx: number) => (
                          <div key={`ent-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start bg-sky-50 border-l-4 border-sky-400 p-2 rounded-md">
                            <div className="space-y-1 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-sky-600 text-white">{idx + 1}</span>
                                  <Label>
                                    {idx === (formData.entregas || []).length - 1 ? "Entrega final" : `Entrega ${idx}`}
                                  </Label>
                                </div>
                                {/* removed incluir checkbox per requirements */}
                              </div>
                              <Textarea
                                value={r.direccion}
                                onChange={(e) => {
                                  const next = [...(formData.entregas || [])];
                                  next[idx] = { ...next[idx], direccion: e.target.value };
                                  setFormData({ ...formData, entregas: next });
                                }}
                                placeholder="Dirección completa de entrega"
                                rows={1}
                                className={"flex h-10 min-h-0 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm leading-tight box-border appearance-none resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <Label>Fecha</Label>
                              <Input
                                type="date"
                                value={r.fecha}
                                onChange={(e) => {
                                  const next = [...(formData.entregas || [])];
                                  next[idx] = { ...next[idx], fecha: e.target.value };
                                  setFormData({ ...formData, entregas: next });
                                }}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <Label>Hora</Label>
                              <Input
                                type="time"
                                value={r.hora}
                                onChange={(e) => {
                                  const next = [...(formData.entregas || [])];
                                  next[idx] = { ...next[idx], hora: e.target.value };
                                  setFormData({ ...formData, entregas: next });
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="vehiculos" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="remolque_id">Remolque</Label>
                          <Select
                            value={
                              formData.remolque_manual
                                ? "manual"
                                : formData.remolque_id || "none"
                            }
                            onValueChange={(value) => {
                              if (value === "manual") {
                                setFormData({
                                  ...formData,
                                  remolque_manual: true,
                                  remolque_id: "",
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  remolque_manual: false,
                                  remolque_id: value === "none" ? "" : value,
                                  remolque_numero_economico: "",
                                  remolque_placa: "",
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar remolque" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {remolques.map((remolque) => (
                                <SelectItem
                                  key={remolque.id}
                                  value={remolque.id}
                                >
                                  {[
                                    remolque.numero_economico,
                                    remolque.marca,
                                    remolque.placas,
                                  ]
                                    .filter(Boolean)
                                    .join(" - ")}
                                </SelectItem>
                              ))}
                              <SelectItem value="manual">
                                Capturar remolque no registrado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.remolque_manual && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="remolque_numero_economico">
                                Número Económico
                              </Label>
                              <Input
                                id="remolque_numero_economico"
                                value={formData.remolque_numero_economico}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    remolque_numero_economico: e.target.value,
                                  })
                                }
                                placeholder="Número económico del remolque"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="remolque_placa">Placa</Label>
                              <Input
                                id="remolque_placa"
                                value={formData.remolque_placa}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    remolque_placa: e.target.value,
                                  })
                                }
                                placeholder="Placa del remolque"
                              />
                            </div>
                            {/* Sello Fiscal removido */}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          El tractocamión y operador se asignarán posteriormente
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="detalles" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          Información Aduanal (Opcional)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="patente_agente_aduanal">
                              Patente Agente Aduanal
                            </Label>
                            <Input
                              id="patente_agente_aduanal"
                              value={formData.patente_agente_aduanal}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  patente_agente_aduanal: e.target.value,
                                })
                              }
                              placeholder="Patente del agente"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="aduana_cruce">
                              Aduana de Cruce
                            </Label>
                            <Input
                              id="aduana_cruce"
                              value={formData.aduana_cruce}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  aduana_cruce: e.target.value,
                                })
                              }
                              placeholder="Aduana de cruce fronterizo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dueno_mercancia">
                              Cliente del Embarque
                            </Label>
                            <Input
                              id="dueno_mercancia"
                              value={formData.dueno_mercancia}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  dueno_mercancia: e.target.value,
                                })
                              }
                              placeholder="Nombre del cliente del embarque"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900">
                          Detalles del Embarque
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contenido">Contenido</Label>
                            <Input
                              id="contenido"
                              value={formData.contenido}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  contenido: e.target.value,
                                })
                              }
                              placeholder="Descripción de la carga"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="peso">Peso (kg)</Label>
                            <Input
                              id="peso"
                              type="number"
                              step="0.01"
                              value={formData.peso}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  peso: e.target.value,
                                })
                              }
                              placeholder="Peso en kilogramos"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="observaciones">Observaciones</Label>
                          <Textarea
                            id="observaciones"
                            value={formData.observaciones}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                observaciones: e.target.value,
                              })
                            }
                            placeholder="Observaciones adicionales"
                            rows={3}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

        <div className="w-full flex flex-row items-center justify-start gap-2">
          <Button
            variant="outline"
            className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEmbarqueEditando(null);
              resetForm();
            }}
            disabled={saving}
          >
            Cerrar
          </Button>
          <Button
            variant="outline"
            className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
            onClick={imprimirFormulario}
          >
            Imprimir
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || (!embarqueEditando && !isNuevoEmbarqueValid)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : embarqueEditando ? (
              "Actualizar Embarque"
            ) : (
              "Crear Embarque"
            )}
          </Button>
        </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para cancelar embarque */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar Embarque</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas cancelar el embarque{" "}
                {cancelingEmbarque?.folio}?
                <br />
                <strong>Esta acción no se puede deshacer.</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">
                  Justificación de la cancelación *
                </Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ingresa la razón por la cual se cancela este embarque..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelingEmbarque(null);
                  setCancelReason("");
                }}
                disabled={saving}
              >
                Cerrar
              </Button>
              <Button
                onClick={cancelarEmbarque}
                disabled={saving || !cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelando...
                  </>
                ) : (
                  "Confirmar Cancelación"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de detalles */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalles del Embarque {embarqueDetalle?.folio}
              </DialogTitle>
              <DialogDescription>
                Información completa del embarque
              </DialogDescription>
            </DialogHeader>

            {embarqueDetalle && (
              <div className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="direcciones">
                      Direcciones y Fechas
                    </TabsTrigger>
                    <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
                    <TabsTrigger value="facturacion">Facturación</TabsTrigger>
                    <TabsTrigger value="contacto">
                      Contacto del Cliente
                    </TabsTrigger>
                    <TabsTrigger value="archivos">Fotos y Ubicación</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Folio
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {embarqueDetalle.folio}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Load Number
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {embarqueDetalle.load_number || "Sin asignar"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Estado
                        </Label>
                        <div className="mt-1">
                          {getEstadoBadge(embarqueDetalle.estado)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Cliente
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {embarqueDetalle.cliente?.nombre || "Sin asignar"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Carta Porte
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {embarqueDetalle.carta_porte || "Sin asignar"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Tipo de Servicio
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {embarqueDetalle.tipo_servicio_id
                            ? getServiceDisplayName(
                                embarqueDetalle.tipo_servicio_id
                              )
                            : "Sin asignar"}
                        </p>
                      </div>
                    </div>

                    {embarqueDetalle.contenido && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Contenido
                        </Label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                          {embarqueDetalle.contenido}
                        </p>
                      </div>
                    )}

                    {embarqueDetalle.observaciones && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Observaciones
                        </Label>
                        <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                          {(() => {
                            const comentario = extractObservacionesComentario(embarqueDetalle.observaciones);
                            if (!comentario) return <span>Sin observaciones</span>;
                            return <pre className="whitespace-pre-wrap text-sm">{String(comentario)}</pre>;
                          })()}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="direcciones" className="space-y-4 mt-6">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          Información de Recolecta
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Dirección de Recolecta
                            </Label>
                            {((embarqueDetalle as any)?.recolectas && (embarqueDetalle as any).recolectas.length > 0 && (embarqueDetalle as any).recolectas.some((r: any) => (r.direccion || "").trim() !== "")) ? (
                              <div className="space-y-2 mt-1">
                                {(embarqueDetalle as any).recolectas.map((r: any, i: number) => (
                                  <div key={i} className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                                    <div className="font-medium text-xs text-gray-700">
                                      {i === 0 ? "Original" : `Recolecta ${i + 1}`}
                                    </div>
                                    <div className="whitespace-pre-wrap mt-1">{r.direccion || "Sin especificar"}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                                {embarqueDetalle.direccion_recolecta || "Sin especificar"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-gray-700">
                                Fecha de Recolecta
                              </Label>
                              {(() => {
                                const reco = ((embarqueDetalle as any)?.recolectas || []).find((r: any) => (r.direccion || "").trim() !== "") || ((embarqueDetalle as any)?.recolectas || [])[0];
                                const fecha = reco?.fecha || (embarqueDetalle as any).fecha_recolecta;
                                return (
                                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                    {fecha ? formatDateMatamoros(normalizeDate(fecha) || fecha) : "Sin especificar"}
                                  </p>
                                );
                              })()}
                            </div>
                            <div className="w-40 shrink-0">
                              <Label className="text-sm font-medium text-gray-700">
                                Hora de Recolecta
                              </Label>
                              {(() => {
                                const reco = ((embarqueDetalle as any)?.recolectas || []).find((r: any) => (r.direccion || "").trim() !== "") || ((embarqueDetalle as any)?.recolectas || [])[0];
                                const hora = reco?.hora || (embarqueDetalle as any).hora_recolecta;
                                return (
                                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                    {hora || "Sin especificar"}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900">
                          Información de Entrega
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Dirección de Entrega
                            </Label>
                            {((embarqueDetalle as any)?.entregas && (embarqueDetalle as any).entregas.length > 0 && (embarqueDetalle as any).entregas.some((r: any) => (r.direccion || "").trim() !== "")) ? (
                              <div className="space-y-2 mt-1">
                                {(embarqueDetalle as any).entregas.map((r: any, i: number) => (
                                  <div key={i} className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                                    <div className="font-medium text-xs text-gray-700">
                                      {i === ((embarqueDetalle as any).entregas.length - 1) ? "Final" : `Entrega ${i + 1}`}
                                    </div>
                                    <div className="whitespace-pre-wrap mt-1">{r.direccion || "Sin especificar"}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                                {embarqueDetalle.direccion_entrega || "Sin especificar"}
                              </p>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <Label className="text-sm font-medium text-gray-700">
                                  Fecha de Entrega
                                </Label>
                                {(() => {
                                  const ents = (embarqueDetalle as any)?.entregas || [];
                                  const lastEnt = ents.slice().reverse().find((r: any) => (r.direccion || "").trim() !== "") || ents[ents.length - 1];
                                  const fecha = lastEnt?.fecha || (embarqueDetalle as any).fecha_entrega;
                                  return (
                                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                      {fecha ? formatDateMatamoros(normalizeDate(fecha) || fecha) : "Sin especificar"}
                                    </p>
                                  );
                                })()}
                              </div>
                              <div className="w-40 shrink-0">
                                <Label className="text-sm font-medium text-gray-700">
                                  Hora de Entrega
                                </Label>
                                {(() => {
                                  const ents = (embarqueDetalle as any)?.entregas || [];
                                  const lastEnt = ents.slice().reverse().find((r: any) => (r.direccion || "").trim() !== "") || ents[ents.length - 1];
                                  const hora = lastEnt?.hora || (embarqueDetalle as any).hora_entrega;
                                  return (
                                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                      {hora || "Sin especificar"}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="vehiculos" className="space-y-4 mt-6">
                    {embarqueDetalle.operador ||
                    embarqueDetalle.camion ||
                    embarqueDetalle.remolque ||
                    embarqueDetalle.remolque_numero_economico ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {embarqueDetalle.operador && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Operador
                              </Label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.operador.nombre}{" "}
                                {embarqueDetalle.operador.apellidos}
                              </p>
                              {embarqueDetalle.operador.telefono && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Tel: {embarqueDetalle.operador.telefono}
                                </p>
                              )}
                            </div>
                          )}
                          {embarqueDetalle.camion && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Camión
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.camion.marca}{" "}
                                {embarqueDetalle.camion.modelo}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Económico:{" "}
                                {embarqueDetalle.camion.numero_economico} |
                                Placas: {embarqueDetalle.camion.placas}
                              </p>
                            </div>
                          )}
                          {embarqueDetalle.remolque_numero_economico &&
                          !embarqueDetalle.remolque ? (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Remolque (Manual)
                              </Label>
                              <p className="text-sm text-gray-900 bg-yellow-50 p-2 rounded mt-1 border border-yellow-200">
                                {embarqueDetalle.remolque_numero_economico}
                                {embarqueDetalle.remolque_placa
                                  ? ` | Placas: ${embarqueDetalle.remolque_placa}`
                                  : ""}
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Captura manual
                              </p>
                            </div>
                          ) : (
                            embarqueDetalle.remolque && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  Remolque
                                </Label>
                                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                  {`${embarqueDetalle.remolque.numero_economico || "Sin económico"} | ${embarqueDetalle.remolque.marca || "Sin marca"} | Placas: ${embarqueDetalle.remolque.placas || "Sin placas"}`}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">
                          No hay vehículos asignados
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Los vehículos se asignarán en la fase de asignación
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="facturacion" className="space-y-4 mt-6">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Empresa Facturadora
                            </Label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                              {renderEmpresaFacturadora(
                                embarqueDetalle.cliente?.empresa_facturadora ||
                                  (embarqueDetalle.cliente as any)?.razon_social ||
                                  (embarqueDetalle.cliente as any)?.nombre_comercial ||
                                  embarqueDetalle.cliente?.nombre
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Forma de Facturación
                            </Label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                              {embarqueDetalle.cliente?.forma_facturacion ||
                                (embarqueDetalle.cliente as any)?.tipo_facturacion ||
                                "No especificado"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Divisa de Pago
                            </Label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                              {renderDivisaPago(
                                (embarqueDetalle.cliente as any)?.divsa_pago ||
                                  (embarqueDetalle.cliente as any)?.divisa_pago ||
                                  (embarqueDetalle.cliente as any)?.moneda_preferida
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Forma de Facturación
                            </Label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                              {renderFormaFacturacion(
                                (embarqueDetalle.cliente as any)?.forma_facturacion ||
                                  (embarqueDetalle.cliente as any)?.forma_pago ||
                                  (embarqueDetalle.cliente as any)?.metodo_pago
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {embarqueDetalle.cliente?.rfc && (
                        <div className="space-y-4 border-t pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                RFC
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1 font-mono">
                                {embarqueDetalle.cliente.rfc}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Razón Social
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {(embarqueDetalle.cliente as any).razon_social ||
                                  embarqueDetalle.cliente.nombre}
                              </p>
                            </div>
                          </div>
                          {(embarqueDetalle.cliente as any).direccion_fiscal && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Dirección Fiscal
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                                {(embarqueDetalle.cliente as any).direccion_fiscal}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="contacto" className="space-y-4 mt-6">
                    {embarqueDetalle.info_representante || detalleContacto ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Nombre del Contacto
                            </Label>
                            <div className="mt-1">
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                {detalleContacto
                                  ? `${detalleContacto?.nombre || ""} ${detalleContacto?.apellidos || ""}`.trim()
                                  : `${embarqueDetalle.info_representante?.nombre || ""} ${embarqueDetalle.info_representante?.apellidos || ""}`.trim()}
                              </p>
                              {(detalleContacto?.es_principal || embarqueDetalle.info_representante?.es_principal) && (
                                <div className="mt-1">
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Principal
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Puesto
                            </Label>
                            <Input
                              readOnly
                              title={detalleContacto?.puesto || embarqueDetalle.info_representante?.puesto || "No especificado"}
                              value={detalleContacto?.puesto || embarqueDetalle.info_representante?.puesto || "No especificado"}
                              className="text-sm bg-gray-50 mt-1"
                            />
                          </div>
                          {(detalleContacto?.telefono || embarqueDetalle.info_representante?.telefono) && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Teléfono
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {detalleContacto?.telefono || embarqueDetalle.info_representante?.telefono}
                              </p>
                            </div>
                          )}
                          {(detalleContacto?.email || embarqueDetalle.info_representante?.email) && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Email
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {detalleContacto?.email || embarqueDetalle.info_representante?.email}
                              </p>
                            </div>
                          )}
                          {(detalleContacto?.notas || (embarqueDetalle.info_representante as any)?.notas) && (
                            <div className="md:col-span-2">
                              <Label className="text-sm font-medium text-gray-700">Notas</Label>
                              <Input
                                readOnly
                                title={detalleContacto?.notas || (embarqueDetalle.info_representante as any)?.notas}
                                value={detalleContacto?.notas || (embarqueDetalle.info_representante as any)?.notas}
                                className="text-sm bg-gray-50 mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">
                          No hay información de contacto para este cliente.
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Asegúrate de que el cliente tenga contactos
                          registrados o asigna uno al embarque.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="archivos" className="space-y-2 mt-4">
                    <h4 className="font-medium text-gray-900">Fotos y Ubicaciones</h4>

                    {/* Removed redundant top list of locations; individual photos show 'Abrir en Maps' below each image */}

                    {embarqueFotos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {embarqueFotos.map((foto) => {
                          const hasGeo = typeof (foto as any).latitud === "number" && typeof (foto as any).longitud === "number";
                          const mapsLink = hasGeo
                            ? `https://maps.google.com/?q=${(foto as any).latitud},${(foto as any).longitud}`
                            : undefined;
                          return (
                            <div
                              key={foto.id}
                              className="relative group overflow-hidden rounded-lg border"
                            >
                              <img
                                src={foto.url_blob || "/placeholder.svg"}
                                alt={foto.nombre_archivo}
                                width={200}
                                height={200}
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-2 text-xs space-y-1">
                                <p className="font-medium truncate">{foto.nombre_archivo}</p>
                                <p className="text-gray-500">Subido por: {foto.subido_por || "Desconocido"}</p>
                                <p className="text-gray-500">{new Date(foto.fecha_subida).toLocaleDateString()}</p>
                                <div className="pt-1">
                                  {hasGeo ? (
                                    <a
                                      className="text-blue-600 hover:underline flex items-center gap-1"
                                      href={mapsLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin className="h-3 w-3" />
                                      Abrir en Maps
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">Sin ubicación</span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={foto.url_blob}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-x-0 top-0 h-32 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Ver imagen ${foto.nombre_archivo}`}
                              >
                                <ImageIcon className="h-6 w-6" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No hay imágenes adjuntas para este embarque.</p>
                        <p className="text-sm text-gray-400 mt-1">
                          El operador puede subir fotos a través del enlace de subida.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            <DialogFooter className="w-full flex flex-row items-center justify-start sm:justify-start gap-2 sm:space-x-2">
              <Button
                variant="outline"
                className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                onClick={() => setShowDetailModal(false)}
              >
                Cerrar
              </Button>
              {embarqueDetalle && (
                <Button
                  variant="outline"
                  className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                  onClick={imprimirDetalle}
                >
                  Imprimir
                </Button>
              )}
              {embarqueDetalle && (
                <Button
                  variant="outline"
                  className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                  onClick={() => exportarDetalleAExcel(embarqueDetalle)}
                >
                  Descargar Excel
                </Button>
              )}
              {embarqueDetalle && (
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    handleEdit(embarqueDetalle);
                    setShowDetailModal(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar Embarque
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para mostrar el enlace generado */}
        <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enlace para Subir Fotos</DialogTitle>
              <DialogDescription>
                Copia este enlace y envíaselo al operador para que suba las
                fotos del embarque.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Label htmlFor="generated-link">Enlace</Label>
              <div className="flex space-x-2">
                <Input id="generated-link" value={generatedLink} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    toast({
                      title: "Enlace copiado",
                      description: "El enlace ha sido copiado al portapapeles.",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Asegúrate de que este enlace sea accesible desde el dispositivo
                del operador.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowLinkModal(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para mostrar la liga pública (compartible) */}
        <Dialog open={showPublicLinkModal} onOpenChange={setShowPublicLinkModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Liga pública para compartir</DialogTitle>
              <DialogDescription>
                Copia la liga pública y compártela con usuarios externos. La liga expira automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Label htmlFor="public-link">Enlace público</Label>
              <div className="flex space-x-2">
                <Input id="public-link" value={publicGeneratedLink} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!publicGeneratedLink) return;
                    navigator.clipboard.writeText(publicGeneratedLink);
                    toast({ title: "Liga copiada", description: "La liga pública ha sido copiada al portapapeles." });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!publicGeneratedLink) return;
                    // Open in a new browser tab
                    window.open(publicGeneratedLink, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {/* New: expiration input so user can set custom expiry for the public link */}
              <div>
                <Label htmlFor="public-expiration">Fecha de expiración (opcional)</Label>
                <Input
                  id="public-expiration"
                  type="datetime-local"
                  className="mt-1"
                  value={publicExpirationInput || ''}
                  onChange={(e: any) => setPublicExpirationInput(e.target.value || null)}
                />
                <p className="text-xs text-gray-500 mt-1">Si no se especifica, se usará el tiempo por defecto del sistema (ej. 72 horas).</p>
              </div>

              {publicLinkExpiresAt && (
                <p className="text-xs text-gray-500">Expira: {new Date(publicLinkExpiresAt).toLocaleString()}</p>
              )}
            </div>

            <DialogFooter>
              <div className="flex items-center space-x-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    // Generate the public link for the selected embarque
                    if (!publicForEmbarqueId) {
                      toast({ title: 'Error', description: 'No hay embarque seleccionado para generar la liga.', variant: 'destructive' });
                      return;
                    }

                    try {
                      const payload: any = { embarqueId: publicForEmbarqueId };
                      if (publicExpirationInput) {
                        const dt = new Date(publicExpirationInput);
                        if (!isNaN(dt.getTime())) payload.expiresAt = dt.toISOString();
                      } else {
                        payload.hours = 72;
                      }

                      const resp = await fetch('/api/public-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      const json = await resp.json();
                      if (!resp.ok || json.error) {
                        console.error('Error generando public link:', json);
                        toast({ title: 'Error', description: json?.error || 'No se pudo generar la liga pública', variant: 'destructive' });
                        return;
                      }
                      const full = `${window.location.origin}${json.url}`;
                      setPublicGeneratedLink(full);
                      setPublicLinkExpiresAt(json.expiresAt || null);
                      // clear the selected embarque id after generating
                      setPublicForEmbarqueId(null);
                      toast({ title: 'Liga generada', description: 'La liga pública fue generada correctamente.' });
                    } catch (e) {
                      console.error('Exception generando public link:', e);
                      toast({ title: 'Error', description: 'Excepción generando la liga pública', variant: 'destructive' });
                    }
                  }}
                >
                  Generar enlace
                </Button>

                <Button onClick={() => setShowPublicLinkModal(false)}>Cerrar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
