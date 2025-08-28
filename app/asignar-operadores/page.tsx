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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck,
  Users,
  Search,
  Eye,
  UserCheck,
  AlertTriangle,
  Settings,
  Link,
  Check,
  Camera,
  Coins,
  Package,
  MapPin,
  FileText,
} from "lucide-react";
import { Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  supabase,
  obtenerTiposServicio,
  type Embarque,
  type Operador,
  type Camion,
  type Remolque,
  type FotoEmbarque,
  type ContactoCliente,
  type TipoServicio,
} from "@/lib/supabase";
import { getAlertThresholds, calcularNivelAlerta } from "@/lib/alert-thresholds";
import { agregarAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

export default function AsignarOperadoresPage() {
  const searchParams = useSearchParams();
  const v2Param = (searchParams?.get("v2") ?? "").toLowerCase();
  const isV2 = v2Param === "1" || v2Param === "true";
  // Estados para los datos (debe ir antes de cualquier uso)
  const [operadores, setOperadores] = useState<Operador[]>([]);

  // Alerta de vencimiento de visa de operador
  const [visaAlertas, setVisaAlertas] = useState<{ [operadorId: string]: "alta"|"media"|"baja"|"ninguna" }>({});

  useEffect(() => {
    async function calcularAlertasVisa() {
      const umbral = await getAlertThresholds("operadores", "visa_vencimiento");
      if (!umbral) return;
      const alertas: { [operadorId: string]: "alta"|"media"|"baja"|"ninguna" } = {};
      operadores.forEach(op => {
        if (op.fecha_vencimiento_visa) {
          alertas[op.id] = calcularNivelAlerta(op.fecha_vencimiento_visa, umbral);
        }
      });
      setVisaAlertas(alertas);
    }
    if (operadores.length > 0) calcularAlertasVisa();
  }, [operadores]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  // Cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingEmbarque, setCancelingEmbarque] = useState<Embarque | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState("");
  const [embarqueDetalle, setEmbarqueDetalle] = useState<Embarque | null>(null);
  const [embarqueAModificar, setEmbarqueAModificar] = useState<Embarque | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("general");

  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [embarquesFinalizados, setEmbarquesFinalizados] = useState<Embarque[]>(
    []
  );
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  // Contadores para verificación
  const [totalFinalizadosDB, setTotalFinalizadosDB] = useState<number | null>(null);
  const [totalCanceladosArchivadosDB, setTotalCanceladosArchivadosDB] = useState<number | null>(null);

  // Estado y utilidades para filtros/sort/paginación de Registros Completados
  const [completadosSearch, setCompletadosSearch] = useState("");
  const [completadosTipoServicio, setCompletadosTipoServicio] = useState("todos");
  const [completadosPeriodo, setCompletadosPeriodo] = useState<
    "todo" | "mes_actual" | "mes_anterior" | "ultimos_3" | "ultimos_6" | "este_anio"
  >("todo");
  const [completadosSortField, setCompletadosSortField] = useState<
    "folio" | "cliente" | "load" | "fecha" | "tipo"
  >("folio");
  const [completadosSortDir, setCompletadosSortDir] = useState<"asc" | "desc">(
    "desc"
  );
  const [completadosPage, setCompletadosPage] = useState(1);
  const [completadosPageSize, setCompletadosPageSize] = useState(25);

  // Determinar el ID más antiguo con estado archivado (para habilitar eliminación siempre en el más viejo)
  const masViejoArchivadoId = useMemo(() => {
    const archivados = (embarquesFinalizados || []).filter((e) => e.estado === "archivado");
    if (archivados.length === 0) return null as string | null;
    const ordenados = [...archivados].sort((a, b) => {
      const ad = new Date(a.fecha_creacion || a.updated_at || 0).getTime();
      const bd = new Date(b.fecha_creacion || b.updated_at || 0).getTime();
      return ad - bd;
    });
    return ordenados[0]?.id || null;
  }, [embarquesFinalizados]);

  // Regla de 1 año para activar el botón Eliminar en registros archivados
  const puedeEliminarCompletado = (e: Embarque) => {
    if (e.estado !== "archivado") return false; // solo eliminar si está archivado
    const baseIso = e.fecha_creacion || e.updated_at || e.fecha_finalizacion;
    if (!baseIso) return false;
    const base = new Date(baseIso);
    if (isNaN(base.getTime())) return false;
    const ahora = new Date();
    const haceUnAnio = new Date(ahora);
    haceUnAnio.setFullYear(ahora.getFullYear() - 1);
    return (masViejoArchivadoId && e.id === masViejoArchivadoId) || base <= haceUnAnio;
  };

  const eliminarCompletado = async (embarque: Embarque) => {
    // Si no es archivado, sólo lo oculta del modal (seguridad extra)
    if (embarque.estado !== "archivado") {
      setEmbarquesFinalizados((prev) => prev.filter((x) => x.id !== embarque.id));
      return;
    }
    const confirmado = window.confirm(
      `¿Eliminar definitivamente el embarque ${embarque.folio}?\n\nEsta acción no se puede deshacer y eliminará el registro de forma permanente.`
    );
    if (!confirmado) return;
    try {
      setSaving(true);
      await agregarAuditLog("ELIMINAR", "Asignación → Registros Completados", `Folio: ${embarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      const { error } = await supabase.from("embarques").delete().eq("id", embarque.id);
      if (error) {
        console.error("Error eliminando embarque:", error);
        alert("Error al eliminar: " + error.message);
        return;
      }
      // Refrescar listas
      await cargarEmbarquesFinalizados();
      await cargarDatos();
    } catch (err) {
      console.error("Error inesperado al eliminar:", err);
      alert("No se pudo eliminar el embarque.");
    } finally {
      setSaving(false);
    }
  };

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setCompletadosPage(1);
  }, [completadosSearch, completadosTipoServicio, completadosPeriodo, completadosPageSize]);

  const getServiceDisplayName = (id: string) => {
    // Intentar resolver desde la lista cargada de tipos de servicio (soporta UUID o slug)
    try {
      const found = (tiposServicio || []).find((t: TipoServicio | any) => {
        if (!t) return false;
        if (t.id === id) return true; // UUID match
        // Algunos registros usan slug/clave en el campo tipo_servicio_id
        if ((t as any).slug && (t as any).slug === id) return true;
        // También intentar normalizar nombre al slug por seguridad
        return false;
      });
      if (found) return found.nombre || String(id);
    } catch (e) {
      // ignore and fallback
    }

    // Fallback a nombres hardcodeados (slugs legibles antiguos)
    switch (id) {
      case "exportacion-cargada-caja-seca-240":
        return "EXP. CARGADA - CAJA SECA 240";
      case "exportacion-cargada-larmex-240":
        return "EXP. CARGADA - CAJA SECA (LARMEX) 240";
      case "exportacion-cargada-thermo-agricultura-240":
        return "EXP. CARGADA - THERMO (AGRICULTURA) 240";
      case "exportacion-cargada-plataforma-240":
        return "EXP. CARGADA - PLATAFORMA 240";
      case "importacion-cargada-caja-seca-240":
        return "IMP. CARGADA - CAJA SECA 240";
      case "importacion-cargada-plataforma-240":
        return "IMP. CARGADA - PLATAFORMA 240";
      case "importacion-vacia-caja-seca-thermo-240":
        return "IMP. VACÍA - CAJA SECA/THERMO 240";
      case "importacion-cargada-plataforma-amarre-240":
        return "IMP. CARGADA - PLATAFORMA CON AMARRE 240";
      case "importacion-en-tractor-240":
        return "IMP. - EN TRACTOR 240";
      case "exportacion-cargada-caja-seca-800":
        return "EXP. CARGADA - CAJA SECA 800";
      case "exportacion-vacia-caja-seca-800":
        return "EXP. VACÍA - CAJA SECA 800";
      case "exportacion-en-tractor-800":
        return "EXP. - EN TRACTOR 800";
      case "exportacion-cargada-plataforma-800":
        return "EXP. CARGADA - PLATAFORMA 800";
      case "importacion-cargada-caja-seca-800":
        return "IMP. CARGADA - CAJA SECA 800";
      case "importacion-vacia-plataforma-800":
        return "IMP. VACÍA - PLATAFORMA 800";
      case "pagos-extras":
        return "PAGOS EXTRAS";
      case "horas-rojo-amarillo":
        return "HORAS ROJO/AMARILLO";
      case "cargas-descargas":
        return "CARGAS/DESCARGAS";
      case "movimientos-en-falso":
        return "MOVIMIENTOS EN FALSO";
      case "movimientos-locales":
        return "MOVIMIENTOS LOCALES";
      case "otro":
        return "OTRO";
      default:
        return id || "No especificado";
    }
  };

  const sortIndicatorCompletados = (field: typeof completadosSortField) => {
    if (completadosSortField !== field) return "";
    return completadosSortDir === "asc" ? " ▲" : " ▼";
  };

  const handleSortCompletados = (field: typeof completadosSortField) => {
    if (completadosSortField === field) {
      setCompletadosSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCompletadosSortField(field);
      setCompletadosSortDir("asc");
    }
  };

  const tiposServicioCompletados = Array.from(
    new Set((embarquesFinalizados || []).map((e) => e.tipo_servicio_id).filter(Boolean))
  ) as string[];

  const fechaDentroDePeriodo = (fechaIso?: string | null) => {
    if (!fechaIso) return false;
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();
    if (completadosPeriodo === "todo") return true;
    if (completadosPeriodo === "mes_actual") {
      return fecha.getFullYear() === anioActual && fecha.getMonth() === mesActual;
    }
    if (completadosPeriodo === "mes_anterior") {
      const mesAnterior = new Date(anioActual, mesActual - 1, 1);
      return (
        fecha.getFullYear() === mesAnterior.getFullYear() &&
        fecha.getMonth() === mesAnterior.getMonth()
      );
    }
    if (completadosPeriodo === "ultimos_3") {
      const limite = new Date();
      limite.setMonth(limite.getMonth() - 3);
      return fecha >= limite;
    }
    if (completadosPeriodo === "ultimos_6") {
      const limite = new Date();
      limite.setMonth(limite.getMonth() - 6);
      return fecha >= limite;
    }
    if (completadosPeriodo === "este_anio") {
      return fecha.getFullYear() === anioActual;
    }
    return true;
  };

  const embarquesFinalizadosFiltrados = (embarquesFinalizados || [])
    .filter((e) => {
      const term = completadosSearch.toLowerCase();
      const matchesTerm =
        !term ||
        e.folio?.toLowerCase().includes(term) ||
        (e.cliente?.nombre || "").toLowerCase().includes(term) ||
        (e.load_number || "").toLowerCase().includes(term);
      const matchesTipo =
        completadosTipoServicio === "todos" || e.tipo_servicio_id === completadosTipoServicio;
      const fechaRef = e.fecha_finalizacion || e.updated_at || e.fecha_creacion;
      const matchesPeriodo = fechaDentroDePeriodo(fechaRef || undefined);
      return matchesTerm && matchesTipo && matchesPeriodo;
    })
    .sort((a, b) => {
      const dir = completadosSortDir === "asc" ? 1 : -1;
      const val = (f: typeof completadosSortField, x: any) => {
        switch (f) {
          case "folio":
            return x.folio || "";
          case "cliente":
            return (x.cliente?.nombre || "");
          case "load":
            return x.load_number || "";
          case "tipo":
            return getServiceDisplayName(x.tipo_servicio_id || "");
          case "fecha":
          default:
            return new Date(x.fecha_finalizacion || x.updated_at || x.fecha_creacion || 0).getTime();
        }
      };
      const av = val(completadosSortField, a);
      const bv = val(completadosSortField, b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

  const totalCompletadosFiltrados = embarquesFinalizadosFiltrados.length;
  const totalCompletadosPaginas = Math.max(
    1,
    Math.ceil(totalCompletadosFiltrados / completadosPageSize)
  );
  const firstIdxComp = totalCompletadosFiltrados === 0 ? 0 : (completadosPage - 1) * completadosPageSize;
  const lastIdxComp = Math.min(
    totalCompletadosFiltrados,
    firstIdxComp + completadosPageSize
  );
  const embarquesFinalizadosPaginados = embarquesFinalizadosFiltrados.slice(
    firstIdxComp,
    lastIdxComp
  );

  // Estados para los datos
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [remolques, setRemolques] = useState<Remolque[]>([]);
  const [contactosClientes, setContactosClientes] = useState<ContactoCliente[]>(
    []
  );

  // Estados para asignación y quickpaid
  const [asignaciones, setAsignaciones] = useState<{
    [key: string]: {
      operador_id: string;
      camion_id: string;
      precio_flete: string;
      moneda_flete: string;
      quickpaid?: string; // porcentaje seleccionado como string
      quickpaidEnabled?: boolean; // si el checkbox está activo
    };
  }>({});

  // Estados para modificación
  const [modificacionData, setModificacionData] = useState({
    razon: "",
    cambiar_operador: false,
    cambiar_camion: false,
    cambiar_remolque: false,
    cambiar_flete: false,
    nuevo_operador_id: "no-change",
    sueldo_operador_original: "",
    moneda_sueldo_operador_original: "MXN",
    sueldo_operador_nuevo: "",
    moneda_sueldo_operador_nuevo: "MXN",
    nuevo_camion_id: "no-change",
    nuevo_remolque_id: "no-change",
    remolque_numero_economico: "", // Corrected from remolque_manual_numero
    remolque_placa: "", // Corrected from remolque_manual_placas
    nuevo_precio_flete: "",
    nueva_moneda_flete: "MXN",
    flete_en_falso: false,
  });

  const [activeModifyTab, setActiveModifyTab] = useState("justificacion");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [fotosEmbarque, setFotosEmbarque] = useState<FotoEmbarque[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [fotosCount, setFotosCount] = useState<{[embarqueId: string]: number}>({});
  const [loadingFotosCount, setLoadingFotosCount] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const cancelarEmbarque = async () => {
    if (!cancelingEmbarque || !cancelReason.trim()) {
      alert("Por favor ingresa una justificación para la cancelación");
      return;
    }
    try {
      setSaving(true);
      const baseUpdate: any = {
        estado: "cancelado",
        updated_at: new Date().toISOString(),
      };
      try {
        baseUpdate.observaciones = `${
          (cancelingEmbarque as any).observaciones || ""
        }\n\n[CANCELADO] ${cancelReason}`.trim();
      } catch {}

      const { error: baseError } = await supabase
        .from("embarques")
        .update(baseUpdate)
        .eq("id", cancelingEmbarque.id);
      if (baseError) {
        alert(`Error al cancelar embarque: ${baseError.message}`);
        return;
      }
      // Metadata best-effort
      try {
        const metaUpdate: any = {
          fecha_cancelacion: new Date().toISOString(),
          cancelado_por: getCurrentUser()?.nombre || "Usuario",
          motivo_cancelacion: cancelReason.trim(),
        };
        await supabase.from("embarques").update(metaUpdate).eq("id", cancelingEmbarque.id);
      } catch (e) {
        console.warn("No se pudo guardar metadata de cancelación", e);
      }
      try {
        await agregarAuditLog(
          "ACTUALIZAR",
          "Embarques",
          `Folio: ${cancelingEmbarque.folio} | Motivo: ${cancelReason}`
        );
      } catch {}

      setShowCancelModal(false);
      setCancelingEmbarque(null);
      setCancelReason("");
      await cargarDatos();
    } catch (e) {
      console.error(e);
      alert("Error al cancelar embarque");
    } finally {
      setSaving(false);
    }
  };

  // Cargar datos desde Supabase
  const cargarDatos = async () => {
    try {
      setLoading(true);

    const { data: embarquesData, error: embarquesError } = await supabase
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
  .in("estado", ["listo-para-asignar", "asignado", "en-transito", "cancelado", "archivado"]) // incluir cancelados y archivados para lógica de doble archivado
        .order("fecha_creacion", { ascending: false });

      if (embarquesError) {
        console.error("Error cargando embarques:", embarquesError);
        setEmbarques([]);
      } else {
        const embarquesConModificaciones = await Promise.all(
          (embarquesData || []).map(async (embarque) => {
            const modificado = await verificarModificacion(embarque.id);
            return { ...embarque, modificado };
          })
        );
        setEmbarques(embarquesConModificaciones);
      }

      const { data: operadoresData, error: operadoresError } = await supabase
        .from("operadores")
        .select("*")
        .eq("estado", "activo")
        .order("nombre");

      if (operadoresError) {
        console.error("Error cargando operadores:", operadoresError);
        setOperadores([]);
      } else {
        setOperadores(operadoresData || []);
      }

      const { data: camionesData, error: camionesError } = await supabase
        .from("camiones")
        .select("*")
        .neq("estado", "fuera-de-servicio")
        .order("numero_economico");

      if (camionesError) {
        console.error("Error cargando camiones:", camionesError);
        setCamiones([]);
      } else {
        setCamiones(camionesData || []);
      }

      const { data: remolquesData, error: remolquesError } = await supabase
        .from("remolques")
        .select("*")
        .order("numero_economico");

      if (remolquesError) {
        console.error("Error cargando remolques:", remolquesError);
        setRemolques([]);
      } else {
        setRemolques(remolquesData || []);
      }

      const { data: contactosData, error: contactosError } = await supabase
        .from("contactos_clientes")
        .select("*")
        .order("nombre");

      if (contactosError) {
        console.error("Error cargando contactos:", contactosError);
        setContactosClientes([]);
      } else {
        setContactosClientes(contactosData || []);
      }
      // Cargar tipos de servicio activos (no crítico si falla)
      try {
        const tipos = await obtenerTiposServicio();
        setTiposServicio(tipos || []);
      } catch (e) {
        console.warn("No se pudieron cargar tipos de servicio:", e);
        setTiposServicio([]);
      }
    } catch (error) {
      console.error("Error general:", error);
      setEmbarques([]);
      setOperadores([]);
      setCamiones([]);
      setRemolques([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEmbarquesFinalizados = async () => {
    try {
      setLoadingCompleted(true);

      let { data: embarquesData, error: embarquesError } = await supabase
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
        .in("estado", ["finalizado", "cancelado", "archivado"]) // incluir archivados si fueron archivados en Asignación
        .order("updated_at", { ascending: false });

      if (
        embarquesError &&
        embarquesError.message.includes("fecha_finalizacion")
      ) {
        console.warn(
          "fecha_finalizacion column not found, using updated_at for ordering"
        );

        const { data: fallbackData, error: fallbackError } = await supabase
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
          .in("estado", ["finalizado", "cancelado", "archivado"]) // incluir archivados si fueron archivados en Asignación
          .order("updated_at", { ascending: false });

        if (fallbackError) {
          console.error(
            "Error cargando embarques finalizados (fallback):",
            fallbackError
          );
          setEmbarquesFinalizados([]);
          return;
        }

        embarquesData = fallbackData;
      } else if (embarquesError) {
        console.error("Error cargando embarques finalizados:", embarquesError);
        setEmbarquesFinalizados([]);
        return;
      }

      // Mostrar todos los FINALIZADOS.
      // Mostrar CANCELADOS solo si fueron archivados desde Asignación (tag en observaciones).
      // Mostrar ARCHIVADOS si:
      //   - Fueron previamente FINALIZADOS (tienen fecha_finalizacion), o
      //   - Fueron archivados desde Asignación (tienen el tag en observaciones).
      const withArchFilter = (embarquesData || []).filter((e) => {
        if (e.estado === "finalizado") return true;
        if (e.estado === "cancelado") {
          const obs = (e.observaciones || "").toUpperCase();
          return obs.includes("[ARCHIVADO-ASIGNACION]");
        }
        if (e.estado === "archivado") {
          const obs = (e.observaciones || "").toUpperCase();
          const archivadoAsignacion = obs.includes("[ARCHIVADO-ASIGNACION]");
          const fueFinalizado = Boolean(e.fecha_finalizacion);
          return fueFinalizado || archivadoAsignacion;
        }
        return false;
      });
      setEmbarquesFinalizados(withArchFilter);
      // Actualizar contadores globales desde la BD
      await contarCompletadosDB();
    } catch (error) {
      console.error("Error general:", error);
      setEmbarquesFinalizados([]);
    } finally {
      setLoadingCompleted(false);
    }
  };

  const contarCompletadosDB = async () => {
    try {
      const [{ count: countFinalizados }, { count: countCanceladosArch } ] = await Promise.all([
        supabase.from("embarques").select("id", { count: "exact", head: true }).eq("estado", "finalizado"),
        supabase
          .from("embarques")
          .select("id", { count: "exact", head: true })
          .eq("estado", "cancelado")
          .ilike("observaciones", "%[ARCHIVADO-ASIGNACION]%"),
      ]);
      setTotalFinalizadosDB(typeof countFinalizados === "number" ? countFinalizados : null);
      setTotalCanceladosArchivadosDB(typeof countCanceladosArch === "number" ? countCanceladosArch : null);
    } catch (err) {
      console.error("Error contando completados:", err);
      setTotalFinalizadosDB(null);
      setTotalCanceladosArchivadosDB(null);
    }
  };

  const handleCopyLink = (embarqueId: string) => {
    const link = `${window.location.origin}/subir-fotos-embarque/${embarqueId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(embarqueId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const cargarFotosEmbarque = async (embarqueId: string) => {
    if (!embarqueId) return;
    setLoadingFotos(true);
    try {
      const { data, error } = await supabase
        .from("fotos_embarques")
        .select("*")
        .eq("embarque_id", embarqueId)
        .order("fecha_subida", { ascending: false });

      if (error) {
        console.error("Error cargando fotos:", error);
        setFotosEmbarque([]);
      } else {
        setFotosEmbarque(data || []);
      }
    } catch (error) {
      console.error("Error general cargando fotos:", error);
      setFotosEmbarque([]);
    } finally {
      setLoadingFotos(false);
    }
  };

  const contarFotosEmbarque = async (embarqueId: string) => {
    if (!embarqueId) return;
    setLoadingFotosCount(prev => new Set(prev).add(embarqueId));
    try {
      const { count, error } = await supabase
        .from("fotos_embarques")
        .select("*", { count: "exact", head: true })
        .eq("embarque_id", embarqueId);

      if (error) {
        console.error("Error contando fotos:", error);
        setFotosCount(prev => ({ ...prev, [embarqueId]: 0 }));
      } else {
        setFotosCount(prev => ({ ...prev, [embarqueId]: count || 0 }));
      }
    } catch (error) {
      console.error("Error general contando fotos:", error);
      setFotosCount(prev => ({ ...prev, [embarqueId]: 0 }));
    } finally {
      setLoadingFotosCount(prev => {
        const newSet = new Set(prev);
        newSet.delete(embarqueId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    // Contar fotos para todos los embarques cuando se cargan
    if (embarques.length > 0) {
      embarques.forEach(embarque => {
        if ((embarque.estado === "asignado" || embarque.modificado) && !(embarque.id in fotosCount)) {
          contarFotosEmbarque(embarque.id);
        }
      });
    }
  }, [embarques]);

  const asignarRecursos = async (embarqueId: string) => {
    const asignacion = asignaciones[embarqueId];
    if (!asignacion || !asignacion.operador_id || !asignacion.camion_id) {
      alert("Por favor selecciona operador y camión");
      return;
    }

    try {
      setSaving(true);
      // QuickPaid logic
      let quickpaid_percent: number | null = null;
      let quickpaid_descuento: number | null = null;
      let precio_quickpaid: number | null = null;
      if (
        asignacion.quickpaidEnabled &&
        asignacion.quickpaid &&
        asignacion.precio_flete
      ) {
        quickpaid_percent = parseFloat(asignacion.quickpaid);
        const precioFlete = parseFloat(asignacion.precio_flete);
        quickpaid_descuento = precioFlete * quickpaid_percent;
        precio_quickpaid = precioFlete - quickpaid_descuento;
      }
      const { error } = await supabase
        .from("embarques")
        .update({
          operador_id: asignacion.operador_id,
          camion_id: asignacion.camion_id,
          precio_flete: asignacion.precio_flete
            ? Number.parseFloat(asignacion.precio_flete)
            : null,
          moneda_flete:
            asignacion.moneda_flete ||
            embarques.find((e) => e.id === embarqueId)?.moneda_flete ||
            "MXN",
          estado: "asignado",
          updated_at: new Date().toISOString(),
          quickpaid_enabled: asignacion.quickpaidEnabled || false, // Corrected column name
          quickpaid_percent: quickpaid_percent,
          quickpaid_descuento: quickpaid_descuento,
          precio_quickpaid: precio_quickpaid,
        })
        .eq("id", embarqueId);
      if (error) {
        console.error("Error asignando recursos:", error);
        alert("Error al asignar recursos");
        return;
      }
      // Audit log: asignación
      const embarque = embarques.find((e) => e.id === embarqueId);
      agregarAuditLog(
        "ACTUALIZAR",
        "Asignación Embarques",
        `Folio: ${embarque?.folio || ""}`
      );
      alert("Recursos asignados exitosamente");
      await cargarDatos();
      setAsignaciones((prev) => {
        const newAsignaciones = { ...prev };
        delete newAsignaciones[embarqueId];
        return newAsignaciones;
      });
      // Actualizar conteo de fotos para el embarque asignado
      contarFotosEmbarque(embarqueId);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al asignar recursos");
    } finally {
      setSaving(false);
    }
  };

  const guardarModificacion = async () => {
    // Audit log: modificación
    if (embarqueAModificar)
      agregarAuditLog(
        "ACTUALIZAR",
        "Asignación Embarques",
        `Folio: ${embarqueAModificar.folio}`
      );
    if (!embarqueAModificar || !modificacionData.razon.trim()) {
      alert("Por favor ingresa una justificación para la modificación");
      return;
    }

    if (
      !modificacionData.cambiar_operador &&
      !modificacionData.cambiar_camion &&
      !modificacionData.cambiar_remolque &&
      !modificacionData.cambiar_flete
    ) {
      alert("Por favor selecciona al menos un elemento a modificar");
      return;
    }

    try {
      setSaving(true);

      // Validación específica: si se eligió capturar remolque manual, requerir ambos campos
      if (
        modificacionData.cambiar_remolque &&
        modificacionData.nuevo_remolque_id === "manual"
      ) {
        const placa = (modificacionData.remolque_placa || "").trim();
        const numero = (modificacionData.remolque_numero_economico || "").trim();
        if (!numero || !placa) {
          alert(
            "Para remolque manual, captura el Número Económico y la Placa."
          );
          setSaving(false);
          return;
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (
        modificacionData.cambiar_operador &&
        modificacionData.nuevo_operador_id &&
        modificacionData.nuevo_operador_id !== "no-change"
      ) {
        updateData.operador_id = modificacionData.nuevo_operador_id;
      }

      if (
        modificacionData.cambiar_camion &&
        modificacionData.nuevo_camion_id &&
        modificacionData.nuevo_camion_id !== "no-change"
      ) {
        updateData.camion_id = modificacionData.nuevo_camion_id;
      }

      if (modificacionData.cambiar_remolque) {
        if (modificacionData.nuevo_remolque_id === "sin-remolque") {
          updateData.remolque_id = null;
          updateData.remolque_placa = null; // Corrected column name
          updateData.remolque_numero_economico = null; // Corrected column name
        } else if (modificacionData.nuevo_remolque_id === "manual") {
          updateData.remolque_id = null; // Set remolque_id to null for manual entry
          updateData.remolque_placa = modificacionData.remolque_placa || null; // Corrected column name
          updateData.remolque_numero_economico =
            modificacionData.remolque_numero_economico || null; // Corrected column name
        } else if (modificacionData.nuevo_remolque_id !== "no-change") {
          updateData.remolque_id = modificacionData.nuevo_remolque_id; // This is a UUID
          updateData.remolque_placa = null; // Clear manual fields if linking to an existing remolque
          updateData.remolque_numero_economico = null; // Clear manual fields if linking to an existing remolque
        }
      }

      if (modificacionData.cambiar_flete) {
        if (modificacionData.nuevo_precio_flete) {
          updateData.precio_flete = Number.parseFloat(
            modificacionData.nuevo_precio_flete
          );
          updateData.moneda_flete = modificacionData.nueva_moneda_flete;
        }
        updateData.flete_falso = modificacionData.flete_en_falso;
  // Al modificar el flete en contingencia, cualquier QuickPaid previo deja de aplicar.
  // Convertimos el nuevo precio en el precio regular a mostrar en tarjetas.
  updateData.quickpaid_enabled = false;
  updateData.quickpaid_percent = null;
  updateData.quickpaid_descuento = null;
  updateData.precio_quickpaid = null;
      }

      const { error: updateError } = await supabase
        .from("embarques")
        .update(updateData)
        .eq("id", embarqueAModificar.id);

      if (updateError) {
        // Mostrar más detalles si existen (mensaje, detalles, hint)
        const detailedMsg =
          (updateError as any)?.message ||
          (updateError as any)?.details ||
          (updateError as any)?.hint ||
          JSON.stringify(updateError);
        console.error("Error actualizando embarque:", updateError);
        alert("Error al actualizar embarque: " + detailedMsg);
        return;
      }

      const operadorOriginal = operadores.find(
        (op) => op.id === embarqueAModificar.operador_id
      );
      const operadorNuevo = operadores.find(
        (op) => op.id === modificacionData.nuevo_operador_id
      );
      const camionOriginal = camiones.find(
        (cam) => cam.id === embarqueAModificar.camion_id
      );
      const camionNuevo = camiones.find(
        (cam) => cam.id === modificacionData.nuevo_camion_id
      );
      const remolqueOriginal = remolques.find(
        (rem) => rem.id === embarqueAModificar.remolque_id
      );
      const remolqueNuevo = remolques.find(
        (rem) => rem.id === modificacionData.nuevo_remolque_id
      );

      const auditData: any = {
        embarque_id: embarqueAModificar.id,
        razon: modificacionData.razon,
        usuario_modificacion: "Sistema",
        fecha_modificacion: new Date().toISOString(),
      };

      if (embarqueAModificar.operador_id) {
        auditData.operador_original_id = embarqueAModificar.operador_id;
      }
      if (operadorOriginal) {
        auditData.operador_original_nombre = `${operadorOriginal.nombre} ${operadorOriginal.apellidos}`;
      }
      if (
        modificacionData.sueldo_operador_original &&
        !isNaN(Number.parseFloat(modificacionData.sueldo_operador_original))
      ) {
        auditData.sueldo_operador_original = Number.parseFloat(
          modificacionData.sueldo_operador_original
        );
        auditData.moneda_sueldo_operador_original =
          modificacionData.moneda_sueldo_operador_original;
      }

      if (
        modificacionData.cambiar_operador &&
        modificacionData.nuevo_operador_id !== "no-change"
      ) {
        auditData.operador_nuevo_id = modificacionData.nuevo_operador_id;
        if (operadorNuevo) {
          auditData.operador_nuevo_nombre = `${operadorNuevo.nombre} ${operadorNuevo.apellidos}`;
        }
        if (
          modificacionData.sueldo_operador_nuevo &&
          !isNaN(Number.parseFloat(modificacionData.sueldo_operador_nuevo))
        ) {
          auditData.sueldo_operador_nuevo = Number.parseFloat(
            modificacionData.sueldo_operador_nuevo
          );
          auditData.moneda_sueldo_operador_nuevo =
            modificacionData.moneda_sueldo_operador_nuevo;
        }
      }

      if (embarqueAModificar.camion_id) {
        auditData.camion_original_id = embarqueAModificar.camion_id;
        if (camionOriginal) {
          auditData.camion_original_numero = camionOriginal.numero_economico;
        }
      }

      if (
        modificacionData.cambiar_camion &&
        modificacionData.nuevo_camion_id !== "no-change"
      ) {
        auditData.camion_nuevo_id = modificacionData.nuevo_camion_id;
        if (camionNuevo) {
          auditData.camion_nuevo_numero = camionNuevo.numero_economico;
        }
      }

      // Original Remolque info for audit
      let originalRemolqueDisplay = "Sin asignar";
      if (embarqueAModificar.remolque_id && remolqueOriginal) {
        originalRemolqueDisplay = `${remolqueOriginal.numero_economico} (${
          remolqueOriginal.tipo_remolque || "N/A"
        })`;
      } else if (embarqueAModificar.remolque_placa) {
        // Corrected column name
        originalRemolqueDisplay = `Manual: ${
          embarqueAModificar.remolque_placa
        } (${embarqueAModificar.remolque_numero_economico || "N/A"})`; // Corrected column names
      }
      auditData.remolque_original_numero = originalRemolqueDisplay;

      // New Remolque info for audit
      if (modificacionData.cambiar_remolque) {
        let newRemolqueDisplay = "Sin asignar";
        if (modificacionData.nuevo_remolque_id === "sin-remolque") {
          newRemolqueDisplay = "Sin remolque";
        } else if (modificacionData.nuevo_remolque_id === "manual") {
          newRemolqueDisplay = `Manual: ${modificacionData.remolque_placa} (${
            modificacionData.remolque_numero_economico || "N/A"
          })`; // Corrected column names
        } else if (
          modificacionData.nuevo_remolque_id !== "no-change" &&
          remolqueNuevo
        ) {
          newRemolqueDisplay = `${remolqueNuevo.numero_economico} (${
            remolqueNuevo.tipo_remolque || "N/A"
          })`;
        }
        auditData.remolque_nuevo_numero = newRemolqueDisplay;
      }

      if (embarqueAModificar.precio_flete) {
        auditData.precio_flete_original = embarqueAModificar.precio_flete;
        auditData.moneda_flete_original = embarqueAModificar.moneda_flete;
      }

      if (
        modificacionData.cambiar_flete &&
        modificacionData.nuevo_precio_flete &&
        !isNaN(Number.parseFloat(modificacionData.nuevo_precio_flete))
      ) {
        auditData.precio_flete_nuevo = Number.parseFloat(
          modificacionData.nuevo_precio_flete
        );
        auditData.moneda_flete_nueva = modificacionData.nueva_moneda_flete;
      }

      if (modificacionData.flete_en_falso) {
        auditData.flete_en_falso = modificacionData.flete_en_falso;
      }

      try {
        const { error: logError } = await supabase
          .from("embarque_modificaciones")
          .insert(auditData);

        if (logError) {
          console.error("Error registrando modificación:", logError);
          if (
            logError.message.includes("Could not find") &&
            logError.message.includes("column")
          ) {
            alert(`Modificación guardada exitosamente, pero hay un problema con la tabla de auditoría. 
                   Por favor ejecuta el script SQL 33 para corregir la estructura de la base de datos.
                   Error técnico: ${logError.message}`);
          } else {
            alert(
              "Modificación guardada, pero hubo un problema registrando la auditoría: " +
                logError.message
            );
          }
        } else {
          alert(
            "Modificación guardada exitosamente con registro de auditoría completo"
          );
        }
      } catch (auditError) {
        console.error("Error en auditoría:", auditError);
        alert(
          "Modificación guardada exitosamente, pero no se pudo registrar en auditoría. Contacta al administrador."
        );
      }

      setShowModifyModal(false);
      setEmbarqueAModificar(null);
      resetModificacionData();
      await cargarDatos();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar modificación");
    } finally {
      setSaving(false);
    }
  };

  const finalizarEmbarque = async (embarqueId: string) => {
    const embarque = embarques.find((e) => e.id === embarqueId);
    if (!embarque) return;

    const confirmacion = confirm(
      `¿Estás seguro de que deseas finalizar el embarque ${embarque.folio}?\n\n` +
        `Este embarque pasará al área de Facturación y Cobranza y se marcará como completado.`
    );

    if (!confirmacion) return;

    try {
      setSaving(true);

      const updateData: any = {
        estado: "finalizado",
        estado_facturacion: "pendiente_facturacion",
        updated_at: new Date().toISOString(),
      };

      const { data: updateResult, error } = await supabase
        .from("embarques")
        .update({
          ...updateData,
          fecha_finalizacion: new Date().toISOString(),
        })
        .eq("id", embarqueId);

      if (error && error.message.includes("fecha_finalizacion")) {
        console.warn(
          "fecha_finalizacion column not found, updating without it..."
        );

        const { data: retryData, error: retryError } = await supabase
          .from("embarques")
          .update(updateData)
          .eq("id", embarqueId);

        if (retryError) {
          console.error("Error finalizando embarque (retry):", retryError);
          alert("Error al finalizar embarque: " + retryError.message);
          return;
        }
      } else if (error) {
        console.error("Error finalizando embarque:", error);
        alert("Error al finalizar embarque: " + error.message);
        return;
      }

      const embarqueCompletado = {
        id: embarque.id,
        folio: embarque.folio,
        clienteNombre: embarque.cliente?.nombre || "Cliente no especificado",
        numeroLoad: embarque.load_number || "N/A",
        direccionEnganche: embarque.direccion_recolecta || "No especificada",
        fechaEnganche:
          embarque.fecha_recolecta || new Date().toISOString().split("T")[0],
        horaEnganche: embarque.hora_recolecta || "00:00",
        comentarios: embarque.observaciones || "",
        operadorAsignado: {
          id: embarque.operador_id || "",
          nombre: embarque.operador
            ? `${embarque.operador.nombre} ${embarque.operador.apellidos}`
            : "Operador no especificado",
        },
        camionAsignado: {
          id: embarque.camion_id || "",
          marca: embarque.camion?.marca || "Marca",
          modelo: embarque.camion?.modelo || "Modelo",
          numeroEconomico: embarque.camion?.numero_economico || "000",
        },
        fechaAsignacion: new Date().toISOString().split("T")[0],
        fechaCompletado: new Date().toISOString().split("T")[0],
        fecha_finalizacion: new Date().toISOString(),
  estado: "completado",
  estado_facturacion: "pendiente_facturacion",
        montoFacturado: embarque.precio_flete || 0,
        precioFlete: embarque.precio_flete || 0,
        precio_flete: embarque.precio_flete || 0,
        moneda_flete: embarque.moneda_flete || "MXN",
        fechaEntrega: "",
        observacionesFacturacion: "",
        observacionesFinalizacion: `Embarque finalizado el ${new Date().toLocaleDateString()}`,
        pagado: false,
        fechaPago: "",
        modificado: embarque.modificado || false,
        alertaModificacion: embarque.modificado
          ? "⚠️ EMBARQUE MODIFICADO POR SITUACIÓN DE EMERGENCIA/CONTINGENCIA"
          : null,
        requiereAtencionEspecial: embarque.modificado || false,
        colorAlerta: embarque.modificado ? "red" : null,
        mensajeParaFacturacion: embarque.modificado
          ? "ATENCIÓN: Este embarque fue modificado por situaciones de emergencia/contingencia. Verificar procedimientos especiales de pago y documentación antes de procesar."
          : null,
      };

      const embarquesCompletados = JSON.parse(
        localStorage.getItem("embarquesCompletados") || "[]"
      );
      const embarquesCompletadosActualizados = [
        ...embarquesCompletados.filter((e: any) => e.id !== embarque.id),
        embarqueCompletado,
      ];
      localStorage.setItem(
        "embarquesCompletados",
        JSON.stringify(embarquesCompletadosActualizados)
      );

      const embarquesAsignados = JSON.parse(
        localStorage.getItem("embarquesAsignados") || "[]"
      );
      const embarquesAsignadosActualizados = [
        ...embarquesAsignados.filter((e: any) => e.id !== embarque.id),
  { ...embarqueCompletado, estado: "finalizado", estado_facturacion: "pendiente_facturacion" },
      ];
      localStorage.setItem(
        "embarquesAsignados",
        JSON.stringify(embarquesAsignadosActualizados)
      );

      alert(
        `Embarque ${embarque.folio} finalizado exitosamente.\nAhora está disponible en el área de Facturación y Cobranza.`
      );
      // Refrescar datos de pantalla y del modal de completados
      await Promise.all([
        cargarDatos(),
        cargarEmbarquesFinalizados(),
      ]);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al finalizar embarque");
    } finally {
      setSaving(false);
    }
  };

  // Archivar desde Asignación: marcar el registro como archivado en Asignación (no mover a "Crear Embarques → Archivos")
  const archivarEmbarque = async (embarqueId: string) => {
    const embarque = embarques.find((e) => e.id === embarqueId);
    if (!embarque) return;
    const ok = window.confirm(
      `¿Deseas archivar el embarque ${embarque.folio} en Registros Completados?\n\nQuedará disponible en Asignación → Registros Completados.`
    );
    if (!ok) return;
    try {
      setSaving(true);
      const nowIso = new Date().toISOString();
      // Marcar como archivado en Asignación usando una etiqueta en observaciones para no requerir cambios de esquema
      const tag = "[ARCHIVADO-ASIGNACION]";
      const observacionesPrevias = embarque.observaciones || "";
      const yaArchivado = observacionesPrevias.toUpperCase().includes(tag);
      const nuevasObservaciones = yaArchivado
        ? observacionesPrevias
        : `${observacionesPrevias ? observacionesPrevias.trim() + "\n\n" : ""}${tag} ${new Date().toLocaleString("es-MX")} por ${getCurrentUser()?.nombre || "Usuario"}`;

      const { error } = await supabase
        .from("embarques")
        .update({ observaciones: nuevasObservaciones, updated_at: nowIso })
        .eq("id", embarqueId);
      if (error) {
        console.error("Error archivando embarque:", error);
        alert(`Error al archivar: ${error.message}`);
        return;
      }
      // Refrescar listas: quitar de la lista principal (si aplica) y asegurar que aparezca en "Registros Completados"
      await cargarEmbarquesFinalizados();
      await cargarDatos();
    } catch (e: any) {
      console.error("Error:", e);
      alert("Error inesperado al archivar");
    } finally {
      setSaving(false);
    }
  };

  const resetModificacionData = () => {
    setModificacionData({
      razon: "",
      cambiar_operador: false,
      cambiar_camion: false,
      cambiar_remolque: false,
      cambiar_flete: false,
      nuevo_operador_id: "no-change",
      sueldo_operador_original: "",
      moneda_sueldo_operador_original: "MXN",
      sueldo_operador_nuevo: "",
      moneda_sueldo_operador_nuevo: "MXN",
      nuevo_camion_id: "no-change",
      nuevo_remolque_id: "no-change",
      remolque_numero_economico: "",
      remolque_placa: "",
      nuevo_precio_flete: "",
      nueva_moneda_flete: "MXN",
      flete_en_falso: false,
    });
    setActiveModifyTab("justificacion");
  };

  const verificarModificacion = async (embarqueId: string) => {
    try {
      const { data, error } = await supabase
        .from("embarque_modificaciones")
        .select("id")
        .eq("embarque_id", embarqueId)
        .limit(1);

      if (error) {
        console.error("Error verificando modificaciones:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados = {
      "listo-para-asignar": {
        color: "bg-blue-100 text-blue-800",
        label: "Listo para Asignar",
      },
      asignado: { color: "bg-yellow-100 text-yellow-800", label: "Asignado" },
      "en-transito": {
        color: "bg-orange-100 text-orange-800",
        label: "En Tránsito",
      },
      entregado: { color: "bg-green-100 text-green-800", label: "Entregado" },
      finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-red-100 text-red-800", label: "Cancelado" },
    };

    const estadoInfo = estados[estado as keyof typeof estados] || {
      color: "bg-gray-100 text-gray-800",
      label: estado,
    };
    return (
      <Badge className={`${estadoInfo.color} hover:${estadoInfo.color}`}>
        {estadoInfo.label}
      </Badge>
    );
  };

  const getVehicleStatusBadge = (estado: string) => {
    return estado === "disponible" || estado === "activo" ? (
      <Badge className="bg-green-100 text-green-800 text-xs ml-2">
        Disponible
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 text-xs ml-2">
        No Disponible
      </Badge>
    );
  };

  const embarquesFiltrados = embarques.filter((embarque) => {
    const matchesSearch =
      embarque.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (embarque.cliente?.nombre && // Changed here
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

    const matchesFilter =
      filtroEstado === "todos"
        ? embarque.estado !== "finalizado"
        : filtroEstado === "finalizados"
        ? embarque.estado === "finalizado"
        : embarque.estado === filtroEstado;

  // Si ya fue archivado en Asignación (tiene la etiqueta), ocultarlo de la lista principal
  const observacionesUpper = (embarque.observaciones || "").toUpperCase();
  const archivadoAsignacion = observacionesUpper.includes("[ARCHIVADO-ASIGNACION]");
  const ocultarPorArchivoAsignacion = archivadoAsignacion;

    return matchesSearch && matchesFilter && !ocultarPorArchivoAsignacion;
  });

  const imprimirDetalles = () => {
    if (!embarqueDetalle) return;

    const contactoCliente = contactosClientes.find(
      (c) => c.cliente_id === embarqueDetalle.cliente?.id
    );
    const contactoNombre = contactoCliente
      ? `${contactoCliente.nombre} ${contactoCliente.apellidos || ""}`
      : "No especificado";

    const printContent = `
<html>
  <head>
    <title>Detalles del Embarque - ${embarqueDetalle.folio}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
      .section { margin-bottom: 25px; }
      .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
      .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
      .field { margin-bottom: 10px; }
      .field-label { font-weight: bold; font-size: 12px; color: #666; text-transform: uppercase; }
      .field-value { font-size: 14px; color: #333; margin-top: 2px; padding: 5px; border-bottom: 1px solid #ddd; }
      .full-width { grid-column: 1 / -1; }
      .address-field { background-color: #f9f9f9; padding: 10px; border-left: 3px solid #007bff; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>TRANSPORTES MONARCA</h1>
      <h2>DETALLES COMPLETOS DEL EMBARQUE</h2>
      <p><strong>Folio:</strong> ${embarqueDetalle.folio}</p>
      <p><strong>Estado:</strong> ${embarqueDetalle.estado}</p>
      <p><strong>Fecha de Impresión:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="section">
      <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Cliente</div>
          <div class="field-value">${
            embarqueDetalle.cliente?.nombre || "Sin asignar" // Changed here
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Contacto del Cliente</div>
          <div class="field-value">${contactoNombre}</div>
        </div>
        <div class="field">
          <div class="field-label">Teléfono</div>
          <div class="field-value">${
            embarqueDetalle.cliente?.telefono || "No especificado"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Email</div>
          <div class="field-value">${
            embarqueDetalle.cliente?.email || "No especificado"
          }</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">INFORMACIÓN DEL EMBARQUE</div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Carta Porte</div>
          <div class="field-value">${
            embarqueDetalle.carta_porte || "Sin asignar"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Fecha de Creación</div>
          <div class="field-value">${new Date(
            embarqueDetalle.fecha_creacion
          ).toLocaleDateString()}</div>
        </div>
        <div class="field">
          <div class="field-label">Contenido</div>
          <div class="field-value">${
            embarqueDetalle.contenido || "No especificado"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Peso</div>
          <div class="field-value">${
            embarqueDetalle.peso || "No especificado"
          }</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">UBICACIONES Y FECHAS</div>
      <div class="field full-width">
        <div class="field-label">Dirección de Recolecta</div>
        <div class="field-value address-field">${
          embarqueDetalle.direccion_recolecta ||
          embarqueDetalle.origen ||
          "No especificada"
        }</div>
      </div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Fecha de Recolecta</div>
          <div class="field-value">${
            embarqueDetalle.fecha_recolecta
              ? new Date(embarqueDetalle.fecha_recolecta).toLocaleDateString()
              : "No especificada"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Hora de Recolecta</div>
          <div class="field-value">${
            embarqueDetalle.hora_recolecta || "No especificada"
          }</div>
        </div>
      </div>
      <div class="field full-width">
        <div class="field-label">Dirección de Entrega</div>
        <div class="field-value address-field">${
          embarqueDetalle.direccion_entrega ||
          embarqueDetalle.destino ||
          "No especificada"
        }</div>
      </div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Fecha de Entrega</div>
          <div class="field-value">${
            embarqueDetalle.fecha_entrega
              ? new Date(embarqueDetalle.fecha_entrega).toLocaleDateString()
              : "No especificada"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Hora de Entrega</div>
          <div class="field-value">${
            embarqueDetalle.hora_entrega || "No especificada"
          }</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">RECURSOS ASIGNADOS</div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Operador</div>
          <div class="field-value">${
            embarqueDetalle.operador
              ? `${embarqueDetalle.operador.nombre} ${embarqueDetalle.operador.apellidos}`
              : "Sin asignar"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Teléfono Operador</div>
          <div class="field-value">${
            embarqueDetalle.operador?.telefono || "No especificado"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Tractocamión</div>
          <div class="field-value">${
            embarqueDetalle.camion?.numero_economico || "Sin asignar"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Marca Tractocamión</div>
          <div class="field-value">${
            embarqueDetalle.camion?.marca || "No especificada"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Remolque</div>
          <div class="field-value">${
            embarqueDetalle.remolque?.numero_economico ||
            embarqueDetalle.remolque_numero_economico ||
            "Sin asignar"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Placa Remolque</div>
          <div class="field-value">${
            embarqueDetalle.remolque?.placas ||
            embarqueDetalle.remolque_placa ||
            "No especificado"
          }</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">INFORMACIÓN FINANCIERA</div>
      <div class="field-group">
        <div class="field">
          <div class="field-label">Precio Flete</div>
          <div class="field-value">${
            embarqueDetalle.precio_flete
              ? `$${(Number(embarqueDetalle.precio_flete) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "Sin definir"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Moneda</div>
          <div class="field-value">${
            embarqueDetalle.moneda_flete || "MXN"
          }</div>
        </div>
        <div class="field">
          <div class="field-label">Flete en Falso</div>
          <div class="field-value">${
            embarqueDetalle.flete_falso ? "Sí" : "No"
          }</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">OBSERVACIONES</div>
      <div class="field full-width">
        <div class="field-value" style="min-height: 60px; background-color: #f9f9f9; padding: 10px;">${
          embarqueDetalle.observaciones || "Sin observaciones"
        }</div>
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
  };

  const descargarExcel = () => {
    if (!embarqueDetalle) return;

    const headers = [
      "Folio",
      "Estado",
      "Cliente",
      "Representante",
      "Teléfono Cliente",
      "Email Cliente",
      "Fecha Creación",
      "Carta Porte",
      "Contenido",
      "Peso",
      "Dirección Recolecta",
      "Fecha Recolecta",
      "Hora Recolecta",
      "Dirección Entrega",
      "Fecha Entrega",
      "Hora Entrega",
      "Operador",
      "Teléfono Operador",
      "Tractocamión",
      "Marca Tractocamión",
      "Remolque (Número Económico)",
      "Remolque (Placa)",
      "Precio Flete",
      "Moneda",
      "Flete en Falso",
      "Observaciones",
    ];

    const data = [
      embarqueDetalle.folio,
      embarqueDetalle.estado,
      embarqueDetalle.cliente?.nombre || "", // Changed here
      embarqueDetalle.cliente?.contacto_principal || "",
      embarqueDetalle.cliente?.telefono || "",
      embarqueDetalle.cliente?.email || "",
      new Date(embarqueDetalle.fecha_creacion).toLocaleDateString(),
      embarqueDetalle.carta_porte || "",
      embarqueDetalle.contenido || "",
      embarqueDetalle.peso || "",
      embarqueDetalle.direccion_recolecta || embarqueDetalle.origen || "",
      embarqueDetalle.fecha_recolecta
        ? new Date(embarqueDetalle.fecha_recolecta).toLocaleDateString()
        : "",
      embarqueDetalle.hora_recolecta || "",
      embarqueDetalle.direccion_entrega || embarqueDetalle.destino || "",
      embarqueDetalle.fecha_entrega
        ? new Date(embarqueDetalle.fecha_entrega).toLocaleDateString()
        : "",
      embarqueDetalle.hora_entrega || "",
      embarqueDetalle.operador
        ? `${embarqueDetalle.operador.nombre} ${embarqueDetalle.operador.apellidos}`
        : "",
      embarqueDetalle.operador?.telefono || "",
      embarqueDetalle.camion?.numero_economico || "",
      embarqueDetalle.camion?.marca || "",
      embarqueDetalle.remolque?.numero_economico ||
        embarqueDetalle.remolque_numero_economico ||
        "",
      embarqueDetalle.remolque?.placas || embarqueDetalle.remolque_placa || "",
      embarqueDetalle.precio_flete || "",
      embarqueDetalle.moneda_flete || "",
      embarqueDetalle.flete_falso ? "Sí" : "No",
      embarqueDetalle.observaciones || "",
    ];

    const csvContent = [
      headers.join(","),
      data.map((field) => `"${field}"`).join(","),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `embarque_completo_${embarqueDetalle.folio}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const descargarRegistrosCompletos = () => {
    const headers = [
      "Folio",
      "Cliente",
      "Operador",
      "Tractocamión",
      "Remolque (Número Económico)",
      "Remolque (Placa)",
      "Origen",
      "Destino",
      "Fecha Creación",
      "Fecha Finalización",
      "Precio Flete",
      "Moneda",
      "Estado",
      "Observaciones",
    ];

    const data = embarquesFinalizados.map((embarque) => [
      embarque.folio,
      embarque.cliente?.nombre || "", // Changed here
      embarque.operador
        ? `${embarque.operador.nombre} ${embarque.operador.apellidos}`
        : "",
      embarque.camion?.numero_economico || "",
      embarque.remolque?.numero_economico ||
        embarque.remolque_numero_economico ||
        "",
      embarque.remolque?.placas || embarque.remolque_placa || "",
      embarque.direccion_recolecta || embarque.origen || "",
      embarque.direccion_entrega || embarque.destino || "",
      new Date(embarque.fecha_creacion).toLocaleDateString(),
      embarque.fecha_finalizacion
        ? new Date(embarque.fecha_finalizacion).toLocaleDateString()
        : "",
      embarque.precio_flete || "",
      embarque.moneda_flete || "",
      embarque.estado,
      embarque.observaciones || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...data.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `registros_completados_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ModificacionesHistory = ({ embarqueId }: { embarqueId: string }) => {
    const [modificaciones, setModificaciones] = useState<any[]>([]);
    const [loadingMods, setLoadingMods] = useState(true);

    useEffect(() => {
      const cargarModificaciones = async () => {
        try {
          const { data, error } = await supabase
            .from("embarque_modificaciones")
            .select("*")
            .eq("embarque_id", embarqueId)
            .order("fecha_modificacion", { ascending: false });

          if (error) {
            console.error("Error cargando modificaciones:", error);
            setModificaciones([]);
          } else {
            setModificaciones(data || []);
          }
        } catch (error) {
          console.error("Error:", error);
          setModificaciones([]);
        } finally {
          setLoadingMods(false);
        }
      };

      cargarModificaciones();
    }, [embarqueId]);

    if (loadingMods) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          <span className="ml-2 text-sm text-gray-600">
            Cargando modificaciones...
          </span>
        </div>
      );
    }

    if (modificaciones.length === 0) {
      return (
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600">
            No se encontraron registros de modificaciones en la base de datos.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {modificaciones.map((mod, index) => (
          <div
            key={mod.id || index}
            className="bg-white border rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-red-700">
                  Modificación #{modificaciones.length - index}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(mod.fecha_modificacion).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {/* Justificación en bloque completo */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Justificación</div>
                <p className="text-sm text-gray-900 mt-0.5">
                  {mod.razon || "Sin justificación registrada"}
                </p>
              </div>

              {/* Resto de campos en fila debajo de la justificación */}
              <div className="flex flex-col md:flex-row md:flex-wrap gap-4 md:gap-6">
                {(mod.operador_original_nombre || mod.operador_nuevo_nombre) && (
                  <div className="min-w-[220px]">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cambio de Operador</div>
                    <div className="mt-0.5 space-y-0.5">
                      {mod.operador_original_nombre && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Anterior:</span> {mod.operador_original_nombre}</p>
                      )}
                      {mod.operador_nuevo_nombre && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Nuevo:</span> {mod.operador_nuevo_nombre}</p>
                      )}
                    </div>
                  </div>
                )}

                {(mod.camion_original_numero || mod.camion_nuevo_numero) && (
                  <div className="min-w-[220px] md:border-l md:pl-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cambio de Tractocamión</div>
                    <div className="mt-0.5 space-y-0.5">
                      {mod.camion_original_numero && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Anterior:</span> {mod.camion_original_numero}</p>
                      )}
                      {mod.camion_nuevo_numero && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Nuevo:</span> {mod.camion_nuevo_numero}</p>
                      )}
                    </div>
                  </div>
                )}

                {(mod.remolque_original_numero || mod.remolque_nuevo_numero) && (
                  <div className="min-w-[220px] md:border-l md:pl-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cambio de Remolque</div>
                    <div className="mt-0.5 space-y-0.5">
                      {mod.remolque_original_numero && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Anterior:</span> {mod.remolque_original_numero}</p>
                      )}
                      {mod.remolque_nuevo_numero && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Nuevo:</span> {mod.remolque_nuevo_numero}</p>
                      )}
                    </div>
                  </div>
                )}

                {(mod.precio_flete_original || mod.precio_flete_nuevo || mod.flete_en_falso) && (
                  <div className="min-w-[220px] md:border-l md:pl-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cambio de Flete</div>
                    <div className="mt-0.5 space-y-0.5">
                      {mod.precio_flete_original && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Anterior:</span> ${typeof mod.precio_flete_original === "number" ? mod.precio_flete_original.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : mod.precio_flete_original} {mod.moneda_flete_original || "MXN"}</p>
                      )}
                      {mod.precio_flete_nuevo && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Nuevo:</span> ${typeof mod.precio_flete_nuevo === "number" ? mod.precio_flete_nuevo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : mod.precio_flete_nuevo} {mod.moneda_flete_nueva || "MXN"}</p>
                      )}
                      {mod.flete_en_falso && (
                        <p className="text-sm text-red-600"><span className="font-medium">⚠️ Marcado como flete en falso</span></p>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 md:ml-auto">
                  Usuario: {mod.usuario_modificacion || "Sistema"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando embarques...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Asignar Operadores
            </h1>
            <p className="text-gray-600 mt-2">
              Asignar recursos a embarques listos
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCompletedModal(true);
              cargarEmbarquesFinalizados();
            }}
            variant="outline"
            className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Registros Completados
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Embarques Pendientes por Asignar
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {
                      embarques.filter((e) => e.estado === "listo-para-asignar")
                        .length
                    }
                  </p>
                </div>
                <svg
                  className="h-8 w-8 text-blue-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Operadores Disponibles
                  </p>
                  <p className="text-2xl font-bold text-gray-600">
                    {operadores.filter((op) => op.estado === "activo").length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Embarques con Contingencia</p>
                  <p className="text-2xl font-bold text-red-600">
                    {embarques.filter((e:any) => {
                      const txt = (e.observaciones || "").toLowerCase();
                      return e.estado === "contingencia" || e.modificado === true || txt.includes("contingencia") || txt.includes("emergencia");
                    }).length}
                  </p>
                </div>
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tractocamiones Disponibles</p>
                  <p className="text-2xl font-bold text-green-600">
                    {camiones.filter((c) => c.estado === "activo").length}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Embarques por Finalizar</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {embarques.filter((e:any) => ["asignado","en-transito"].includes(e.estado)).length}
                  </p>
                </div>
                <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por folio, cliente o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="listo-para-asignar">
                    Listo para Asignar
                  </SelectItem>
                  <SelectItem value="asignado">Asignado</SelectItem>
                  <SelectItem value="en-transito">En Tránsito</SelectItem>
                  <SelectItem value="finalizados">
                    Embarques Finalizados
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de embarques */}
        <div className="grid grid-cols-1 gap-4">
          {embarquesFiltrados.map((embarque) => (
            <Card key={embarque.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      <span className="inline-flex items-center text-blue-600 text-xl">
                        <Package className="h-5 w-5 text-blue-600 mr-1" />
                        {embarque.folio}
                      </span>
                      {typeof (embarque as any).precio_quickpaid === "number" && (embarque as any).precio_quickpaid > 0 && (
                        <span
                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-semibold align-middle"
                          title="Este embarque fue asignado con QuickPaid"
                        >
                          QuickPaid
                          <Coins className="h-4 w-4 text-yellow-700 ml-1" />
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {(() => {
                        const cliente = embarque.cliente?.nombre ? `Cliente: ${embarque.cliente.nombre}` : "";
                        const load = embarque.load_number ? `Load: ${embarque.load_number}` : "";
                        const sep = cliente && load ? " • " : "";
                        return `${cliente}${sep}${load}` || "`";
                      })()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getEstadoBadge(embarque.estado)}
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmbarqueDetalle(embarque);
                          setActiveTab("general");
                          setSelectedImage(null);
                          setShowDetailsModal(true);
                          cargarFotosEmbarque(embarque.id);
                          contarFotosEmbarque(embarque.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                      {(embarque.estado === "listo-para-asignar" ||
                        embarque.estado === "asignado" ||
                        embarque.estado === "en-transito") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCancelingEmbarque(embarque);
                            setCancelReason("");
                            setShowCancelModal(true);
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                      {(embarque.estado === "asignado" ||
                        embarque.modificado) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={fotosCount[embarque.id] > 0 ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100" : ""}
                          onClick={() => {
                            window.open(
                              `/subir-fotos-embarque/${embarque.id}`,
                              "_blank"
                            );
                          }}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Fotos
                        </Button>
                      )}
                      {embarque.estado === "asignado" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmbarqueAModificar(embarque);
                            setModificacionData({
                              razon: "", // Always clear reason for new modification
                              cambiar_operador: false,
                              cambiar_camion: false,
                              cambiar_remolque: false,
                              cambiar_flete: false,
                              nuevo_operador_id:
                                embarque.operador_id || "no-change",
                              sueldo_operador_original: "",
                              moneda_sueldo_operador_original: "MXN",
                              sueldo_operador_nuevo: "",
                              moneda_sueldo_operador_nuevo: "MXN",
                              nuevo_camion_id:
                                embarque.camion_id || "no-change",
                              nuevo_remolque_id: embarque.remolque_id
                                ? embarque.remolque_id
                                : embarque.remolque_placa // Corrected column name
                                ? "manual"
                                : "no-change", // Determine initial selection
                              remolque_numero_economico:
                                embarque.remolque_numero_economico || "", // Corrected column name
                              remolque_placa: embarque.remolque_placa || "", // Corrected column name
                              nuevo_precio_flete:
                                embarque.precio_flete?.toString() || "",
                              nueva_moneda_flete:
                                embarque.moneda_flete || "MXN",
                              flete_en_falso: embarque.flete_falso || false,
                            });
                            setActiveModifyTab("justificacion"); // Reset to first tab
                            setShowModifyModal(true);
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Contingencia
                        </Button>
                      )}
                      {(embarque.estado === "asignado" ||
                        embarque.estado === "en-transito") && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => finalizarEmbarque(embarque.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Finalizando...
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Finalizar Embarque
                            </>
                          )}
                        </Button>
                      )}
                      {(embarque.estado === "finalizado" || embarque.estado === "cancelado" || embarque.estado === "archivado") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                          onClick={() => archivarEmbarque(embarque.id)}
                          disabled={saving}
                        >
                          Archivar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Indicador de modificación si aplica */}
                {embarque.modificado && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-red-800 font-medium">
                          ⚠️ EMBARQUE MODIFICADO
                        </p>
                        <p className="text-red-600 text-sm">
                          Este embarque ha sido modificado por situaciones de
                          emergencia/contingencia
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Layout principal del embarque */}
                <div
                  className={`rounded-lg border-2 ${
                    embarque.modificado
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {isV2 ? (
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Columna izquierda: Recursos + Documentación + Tipo de Servicio */}
                        <div className="lg:col-span-4 space-y-4">
                          <div className="border rounded-lg p-3 bg-white/60">
                            <div className="flex items-center mb-2">
                              <UserCheck className="h-4 w-4 text-gray-600 mr-2" />
                              <h4 className="text-sm font-semibold text-gray-800">Recursos Asignados</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Operador</label>
                                <p className="text-sm text-gray-900">
                                  {embarque.operador
                                    ? `${embarque.operador.nombre} ${embarque.operador.apellidos}`
                                    : "Sin asignar"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tractocamión</label>
                                <p className="text-sm text-gray-900">{embarque.camion?.numero_economico || "Sin asignar"}</p>
                                {embarque.camion?.marca && (
                                  <p className="text-xs text-gray-600">{embarque.camion.marca}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remolque</label>
                                <p className="text-sm text-gray-900">
                                  {embarque.remolque?.numero_economico || embarque.remolque_placa || "Sin asignar"}
                                  {embarque.remolque_placa && !embarque.remolque && (
                                    <span className="text-xs text-blue-600 block">(Manual)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documentación</label>
                            <div className="mt-1 space-y-2">
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carta Porte</span>
                                <p className="text-sm text-gray-900">{embarque.carta_porte || "Sin asignar"}</p>
                              </div>
                              <div className="flex flex-col sm:flex-row items-start gap-6">
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Load</span>
                                  <p className="text-sm text-gray-900">{embarque.load_number || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contenido</span>
                                  <p className="text-sm text-gray-900">{embarque.contenido || "No especificado"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Servicio</label>
                            {(() => {
                              // Mostrar la etiqueta derivada de tipo_servicio_id usando la función centralizada
                              const desc = getServiceDisplayName(embarque.tipo_servicio_id || "") || "No especificado";
                              const [l1, l2] = (desc || "").split(" - ");
                              return (
                                <p className="text-sm text-gray-700 mt-1 leading-tight">
                                  <span className="block">{l1}</span>
                                  {l2 && <span className="block">{l2}</span>}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Columna central: Recolecta y Entrega */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recolecta</label>
                            <p className="text-sm text-gray-900 mt-1">
                              {embarque.direccion_recolecta || embarque.origen || "No especificada"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 border">
                                {embarque.fecha_recolecta ? new Date(embarque.fecha_recolecta).toLocaleDateString() : "Sin fecha"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 border">
                                {embarque.hora_recolecta || "Sin hora"}
                              </span>
                            </div>
                          </div>
                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entrega</label>
                            <p className="text-sm text-gray-900 mt-1">
                              {embarque.direccion_entrega || embarque.destino || "No especificada"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 border">
                                {embarque.fecha_entrega ? new Date(embarque.fecha_entrega).toLocaleDateString() : "Sin fecha"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 border">
                                {embarque.hora_entrega || "Sin hora"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Columna derecha: Cliente + Resumen financiero */}
                        <div className="lg:col-span-3 space-y-4">
                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</label>
                            <p className="text-sm text-gray-900 mt-1">{embarque.cliente?.nombre || "Sin asignar"}</p>
                            {(() => {
                              // Preferir el contacto seleccionado por el usuario si viene en el embarque
                              const seleccionado: any = (embarque as any).info_representante || null;
                              // Si no hay seleccionado, usar el principal o el primero
                              const fallback = contactosClientes.find(
                                (c) => c.cliente_id === embarque.cliente?.id && (c as any).es_principal
                              ) || contactosClientes.find((c) => c.cliente_id === embarque.cliente?.id);
                              const contact = seleccionado || fallback;
                              if (!contact) return (
                                <p className="mt-1 text-sm text-gray-700">Contacto no especificado</p>
                              );
                              const nombre = `${contact.nombre ?? ""}${contact.apellidos ? ` ${contact.apellidos}` : ""}`.trim() || (contact as any)?.nombre_completo || "Contacto sin nombre";
                              const telefono = contact.telefono || (contact as any)?.phone || "";
                              return (
                                <div className="mt-1">
                                  <p className="text-sm text-gray-900">{nombre}</p>
                                  {telefono && (
                                    <p className="text-xs text-gray-600">Tel: {telefono}</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Tipo de Servicio entre Cliente y Resumen Financiero */}
                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Servicio</label>
                            {(() => {
                              const desc = getServiceDisplayName(embarque.tipo_servicio_id || "");
                              const [l1, l2] = desc.split(" - ");
                              return (
                                <p className="text-sm text-gray-900 mt-1 leading-tight">
                                  <span className="block">{l1}</span>
                                  {l2 && <span className="block">{l2}</span>}
                                </p>
                              );
                            })()}
                          </div>

                          <div className="border rounded-lg p-3 bg-white/60">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resumen Financiero</label>
                            <div className="mt-2 space-y-1">
                              <div>
                                <span className="text-xs text-gray-500">Precio Flete</span>
                                <p className="text-sm font-semibold text-green-600">
                                  {embarque.precio_flete
                                    ? `$${(Number(embarque.precio_flete) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${embarque.moneda_flete || "MXN"}`
                                    : "Sin definir"}
                                </p>
                              </div>
                              {typeof embarque.quickpaid_descuento === "number" && embarque.quickpaid_descuento > 0 && (
                                <div>
                                  <span className="text-xs text-gray-500">Descuento QuickPaid</span>
                                  <p className="text-sm font-semibold text-yellow-700">-$
                                    {(embarque.quickpaid_descuento ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {embarque.moneda_flete || "MXN"}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-xs text-gray-500">Precio Final</span>
                                <p className="text-sm font-semibold text-gray-900">$
                                  {(
                                    typeof embarque.precio_quickpaid === "number" && embarque.precio_quickpaid > 0
                                      ? embarque.precio_quickpaid
                                      : embarque.precio_flete || 0
                                  ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {embarque.moneda_flete || "MXN"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                    {/* Información General */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="space-y-1 ml-6">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Cliente
                        </label>
                        <p className="text-sm text-gray-900">
                          {embarque.cliente?.nombre || "Sin asignar"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Contacto del Cliente
                        </label>
                        {(() => {
                          const seleccionado: any = (embarque as any).info_representante || null;
                          const fallback = contactosClientes.find(
                            (c) => c.cliente_id === embarque.cliente?.id && (c as any).es_principal
                          ) || contactosClientes.find((c) => c.cliente_id === embarque.cliente?.id);
                          const contacto = seleccionado || fallback;
                          if (!contacto)
                            return <p className="text-sm text-gray-900">No especificado</p>;
                          const nombre = `${contacto.nombre ?? ""}${contacto.apellidos ? ` ${contacto.apellidos}` : ""}`.trim() || (contacto as any)?.nombre_completo || "Contacto sin nombre";
                          const telefono = contacto.telefono || (contacto as any)?.phone || "";
                          return (
                            <div>
                              <p className="text-sm text-gray-900">{nombre}</p>
                              {telefono && (
                                <p className="text-xs text-gray-600">Tel: {telefono}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Tipo de Servicio
                        </label>
                        {(() => {
                          const desc = getServiceDisplayName(embarque.tipo_servicio_id || "");
                          const [l1, l2] = desc.split(" - ");
                          return (
                            <p className="text-sm text-gray-700 max-w-xs whitespace-normal break-words leading-tight">
                              <span className="block">{l1}</span>
                              {l2 && <span className="block">{l2}</span>}
                            </p>
                          );
                        })()}
                      </div>
                      {/* Carta Porte oculto en esta sección (eliminado el bloque para compactar la fila) */}

                      <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <div className="flex items-start gap-6 flex-nowrap">
                          {/* Bloque Precio Flete */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Precio Flete
                            </label>
                            <p className="text-sm font-semibold text-green-600">
                              {embarque.precio_flete
                                ? `$${(Number(embarque.precio_flete) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${embarque.moneda_flete || 'MXN'}`
                                : 'Sin definir'}
                            </p>
                            {embarque.precio_flete && embarque.moneda_flete && (
                              <p className="text-xs text-gray-500">
                                {embarque.moneda_flete === 'USD' ? 'Dólares Americanos' : 'Pesos Mexicanos'}
                              </p>
                            )}
                          </div>

                          {/* Bloque Descuento QuickPaid */}
                          {typeof embarque.quickpaid_descuento === 'number' && embarque.quickpaid_descuento > 0 && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Descuento QuickPaid
                              </label>
                              <p className="text-sm font-semibold text-yellow-700">
                                -$
                                {(embarque.quickpaid_descuento ?? 0).toLocaleString('es-MX', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {embarque.moneda_flete || 'MXN'}
                              </p>
                              {embarque.moneda_flete && (
                                <p className="text-xs text-gray-500">
                                  {embarque.moneda_flete === 'USD' ? 'Dólares Americanos' : 'Pesos Mexicanos'}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Bloque Precio QuickPaid */}
                          {typeof embarque.precio_quickpaid === 'number' && embarque.precio_quickpaid > 0 && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Precio QuickPaid
                              </label>
                              <p className="text-sm font-semibold text-yellow-900">
                                $
                                {(embarque.precio_quickpaid ?? 0).toLocaleString('es-MX', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {embarque.moneda_flete || 'MXN'}
                              </p>
                              {embarque.moneda_flete && (
                                <p className="text-xs text-gray-500">
                                  {embarque.moneda_flete === 'USD' ? 'Dólares Americanos' : 'Pesos Mexicanos'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Direcciones */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Dirección de Recolecta
                        </label>
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded border">
                          {embarque.direccion_recolecta ||
                            embarque.origen ||
                            "No especificada"}
                        </p>
                        <div className="text-xs text-gray-500">
                          Fecha:{" "}
                          {embarque.fecha_recolecta
                            ? new Date(
                                embarque.fecha_recolecta
                              ).toLocaleDateString()
                            : "No especificada"}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Dirección de Entrega
                        </label>
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded border">
                          {embarque.direccion_entrega ||
                            embarque.destino ||
                            "No especificada"}
                        </p>
                        <div className="text-xs text-gray-500">
                          Fecha:{" "}
                          {embarque.fecha_entrega
                            ? new Date(
                                embarque.fecha_entrega
                              ).toLocaleDateString()
                            : "No especificada"}
                        </div>
                      </div>
                    </div>

                    {/* Recursos Asignados */}
                    {(embarque.estado === "asignado" ||
                      embarque.estado === "en-transito") && (
                      <div className="border-t pt-4">
                        <div className="flex items-center mb-3">
                          <UserCheck className="h-4 w-4 text-gray-600 mr-2" />
                          <h4 className="text-sm font-semibold text-gray-800">
                            Recursos Asignados
                          </h4>
                          {embarque.modificado && (
                            <Badge className="ml-3 bg-red-100 text-red-800 text-xs">
                              MODIFICADO
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start ml-8 w-full">
                          {/* Grupo izquierdo: Operador, Tractocamión, Remolque */}
                          <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0 flex-1">
                            {/* Operador */}
                            <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Operador
                            </label>
                            <p className="text-sm text-gray-900">
                              {embarque.operador
                                ? `${embarque.operador.nombre} ${embarque.operador.apellidos}`
                                : "Sin asignar"}
                            </p>
                            </div>
                            {/* Tractocamión */}
                            <div className="space-y-1 ml-20">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Tractocamión
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarque.camion?.numero_economico ||
                                "Sin asignar"}
                            </p>
                            {embarque.camion?.marca && (
                              <p className="text-xs text-gray-600">
                                {embarque.camion.marca}
                              </p>
                            )}
                            </div>
                            {/* Remolque */}
                            <div className="space-y-1 ml-12">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Remolque
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarque.remolque?.numero_economico ||
                                embarque.remolque_placa ||
                                "Sin asignar"}
                              {embarque.remolque_placa &&
                                !embarque.remolque && (
                                  <span className="text-xs text-blue-600 block">
                                    (Manual)
                                  </span>
                                )}
                            </p>
                            </div>
                            {/* Carta Porte removido de este grupo; se muestra a la derecha junto a Tipo de Servicio */}
                          </div>
                          {/* Contenedor derecho: Carta Porte, Load y Contenido juntos en la misma fila */}
                          <div className="mt-2 md:mt-0 w-full md:w-1/2 lg:w-1/2 ml-auto lg:mr-2">
                            <div className="flex flex-col md:flex-row md:flex-nowrap items-start md:items-end justify-start gap-4 md:text-left w-full pr-2 lg:pr-3">
                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carta Porte</label>
                                <p className="text-sm text-gray-700">{embarque.carta_porte || "Sin asignar"}</p>
                              </div>
                              <div className="flex flex-row items-start gap-4 md:flex-nowrap">
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Load</label>
                                  <p className="text-sm text-gray-700">{embarque.load_number || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contenido</label>
                                  <p className="text-sm text-gray-700">{embarque.contenido || "No especificado"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Formulario de Asignación */}
                    {embarque.estado === "listo-para-asignar" && (
                      <div className="border-t pt-4">
                        <div className="flex items-center mb-3">
                          <Settings className="h-4 w-4 text-blue-600 mr-2" />
                          <h4 className="text-sm font-semibold text-blue-800">
                            Asignar Recursos
                          </h4>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Fila 1: Operador | Precio Flete */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Operador *
                              </Label>
                              <Select
                                value={
                                  asignaciones[embarque.id]?.operador_id || ""
                                }
                                onValueChange={(value) =>
                                  setAsignaciones((prev) => ({
                                    ...prev,
                                    [embarque.id]: {
                                      ...prev[embarque.id],
                                      operador_id: value,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Seleccionar operador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {operadores.map((operador) => (
                                    <SelectItem
                                      key={operador.id}
                                      value={operador.id}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>
                                          {operador.nombre} {operador.apellidos}
                                        </span>
                                        {getVehicleStatusBadge(operador.estado)}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Precio Flete *
                              </Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  className="bg-white flex-1"
                                  required
                                  value={
                                    asignaciones[embarque.id]?.precio_flete ||
                                    ""
                                  }
                                  onFocus={(e) => {
                                    // Facilita reemplazar el 0 inicial al enfocar
                                    e.currentTarget.select();
                                  }}
                                  onKeyDown={(e) => {
                                    // Bloquea caracteres no deseados: negativos y exponentes
                                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    // Permitir vacío mientras se edita
                                    if (raw === "") {
                                      setAsignaciones((prev) => ({
                                        ...prev,
                                        [embarque.id]: {
                                          ...prev[embarque.id],
                                          precio_flete: "",
                                        },
                                      }));
                                      return;
                                    }
                                    const num = Number.parseFloat(raw);
                                    const safe = isNaN(num) ? "" : num < 0 ? "0" : raw;
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [embarque.id]: {
                                        ...prev[embarque.id],
                                        precio_flete: safe,
                                      },
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    let raw = e.currentTarget.value;
                                    if (raw === "") return;
                                    // Normaliza valores como "1." a "1" y clamp a 0 mínimo
                                    const num = Number.parseFloat(raw);
                                    const fixed = isNaN(num) ? 0 : Math.max(0, num);
                                    const normalized = Number.isInteger(fixed)
                                      ? String(fixed)
                                      : fixed.toFixed(2);
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [embarque.id]: {
                                        ...prev[embarque.id],
                                        precio_flete: normalized,
                                      },
                                    }));
                                  }}
                                />
                                <Select
                                  value={
                                    asignaciones[embarque.id]?.moneda_flete ||
                                    embarque.moneda_flete ||
                                    "MXN"
                                  }
                                  onValueChange={(value) =>
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [embarque.id]: {
                                        ...prev[embarque.id],
                                        moneda_flete: value,
                                      },
                                    }))
                                  }
                                  required
                                >
                                  <SelectTrigger className="w-20 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MXN">MXN</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {/* Fila 2: Tractocamión | QuickPaid */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Tractocamión *
                              </Label>
                              <Select
                                value={
                                  asignaciones[embarque.id]?.camion_id || ""
                                }
                                onValueChange={(value) =>
                                  setAsignaciones((prev) => ({
                                    ...prev,
                                    [embarque.id]: {
                                      ...prev[embarque.id],
                                      camion_id: value,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Seleccionar camión" />
                                </SelectTrigger>
                                <SelectContent>
                                  {camiones.length === 0 ? (
                                    <SelectItem value="no-camiones" disabled>
                                      No hay tractocamiones disponibles
                                    </SelectItem>
                                  ) : (
                                    camiones.map((camion) => (
                                      <SelectItem
                                        key={camion.id}
                                        value={camion.id}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>
                                            {camion.numero_economico} -{" "}
                                            {camion.marca || "Sin marca"}
                                          </span>
                                          <div className="ml-2">
                                            {getVehicleStatusBadge(camion.estado)}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* QuickPaid section inline with Tractocamión */}
                            <div className="flex items-end gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`quickpaid-enabled-${embarque.id}`}
                                  className="w-7 h-7"
                                  checked={
                                    !!asignaciones[embarque.id]
                                      ?.quickpaidEnabled
                                  }
                                  onChange={(e) => {
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [embarque.id]: {
                                        ...prev[embarque.id],
                                        quickpaidEnabled: e.target.checked,
                                        ...(e.target.checked
                                          ? {}
                                          : { quickpaid: "" }),
                                      },
                                    }));
                                  }}
                                />
                                <Label
                                  htmlFor={`quickpaid-enabled-${embarque.id}`}
                                  className="text-sm font-medium text-gray-700 select-none cursor-pointer"
                                >
                                  Aplicar QuickPaid
                                </Label>
                                <Select
                                  value={
                                    asignaciones[embarque.id]?.quickpaid || ""
                                  }
                                  onValueChange={(value) =>
                                    setAsignaciones((prev) => ({
                                      ...prev,
                                      [embarque.id]: {
                                        ...prev[embarque.id],
                                        quickpaid: value,
                                      },
                                    }))
                                  }
                                  disabled={
                                    !asignaciones[embarque.id]?.quickpaidEnabled
                                  }
                                >
                                  <SelectTrigger className="bg-white min-w-[120px]">
                                    <SelectValue placeholder="% descuento" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0.005">0.5%</SelectItem>
                                    <SelectItem value="0.01">1%</SelectItem>
                                    <SelectItem value="0.015">1.5%</SelectItem>
                                    <SelectItem value="0.02">2%</SelectItem>
                                    <SelectItem value="0.025">2.5%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* Mostrar cálculo de descuento y precio con descuento */}
                              {(() => {
                                const precioFlete = parseFloat(
                                  asignaciones[embarque.id]?.precio_flete || "0"
                                );
                                const quickpaidEnabled =
                                  !!asignaciones[embarque.id]?.quickpaidEnabled;
                                const quickpaid = quickpaidEnabled
                                  ? parseFloat(
                                      asignaciones[embarque.id]?.quickpaid ||
                                        "0"
                                    )
                                  : 0;
                                const descuento = precioFlete * quickpaid;
                                const precioConDescuento =
                                  precioFlete - descuento;
                                if (
                                  !precioFlete ||
                                  !quickpaidEnabled ||
                                  !quickpaid
                                )
                                  return null;
                                return (
                                  <div className="col-span-2 mt-2 bg-blue-50 rounded p-2 text-sm">
                                    <div className="flex flex-wrap gap-4">
                                      <span>
                                        <b>Precio Flete:</b> $
                                        {precioFlete.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span>
                                        <b>Descuento QuickPaid:</b> -$
                                        {descuento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span>
                                        <b>Precio con Descuento:</b> $
                                        {precioConDescuento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Botón Asignar SIEMPRE visible */}
                          <div className="col-span-2 flex items-center mt-4">
                            <Button
                              onClick={() => {
                                const asignacion = asignaciones[embarque.id];
                                if (
                                  !asignacion ||
                                  !asignacion.operador_id ||
                                  !asignacion.camion_id
                                ) {
                                  alert(
                                    "Por favor selecciona operador y camión"
                                  );
                                  return;
                                }

                                if (
                                  !asignacion.precio_flete ||
                                  asignacion.precio_flete.trim() === ""
                                ) {
                                  alert(
                                    "Por favor ingresa el precio del flete"
                                  );
                                  return;
                                }

                                if (!asignacion.moneda_flete) {
                                  alert(
                                    "Por favor selecciona la moneda del flete"
                                  );
                                  return;
                                }

                                const operadorSeleccionado = operadores.find(
                                  (op) => op.id === asignacion.operador_id
                                );
                                const camionSeleccionado = camiones.find(
                                  (cam) => cam.id === asignacion.camion_id
                                );

                                const confirmacion = confirm(
                                  `¿Estás seguro de que deseas asignar los siguientes recursos al embarque ${embarque.folio}?\n\n` +
                                    `Operador: ${
                                      operadorSeleccionado
                                        ? `${operadorSeleccionado.nombre} ${operadorSeleccionado.apellidos}`
                                        : "No seleccionado"
                                    }\n` +
                                    `Tractocamión: ${
                                      camionSeleccionado
                                        ? `${camionSeleccionado.numero_economico} - ${camionSeleccionado.marca}`
                                        : "No seleccionado"
                                    }\n` +
                                    `Precio Flete: $${(Number(asignacion.precio_flete) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${asignacion.moneda_flete}\n\n` +
                                    `Esta acción cambiará el estado del embarque a "Asignado".`
                                );

                                if (confirmacion) {
                                  asignarRecursos(embarque.id);
                                }
                              }}
                              disabled={
                                saving ||
                                !asignaciones[embarque.id]?.operador_id ||
                                !asignaciones[embarque.id]?.camion_id ||
                                !asignaciones[embarque.id]?.precio_flete ||
                                !asignaciones[embarque.id]?.moneda_flete
                              }
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Asignando...
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Asignar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal de Detalles con Pestañas */}
      {showDetailsModal && embarqueDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detalles del Embarque
                </h2>
                <p className="text-sm text-gray-600">
                  Folio: {embarqueDetalle.folio}
                </p>
              </div>
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "general"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("general")}
                    >
                      Información General
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "ubicaciones"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("ubicaciones")}
                    >
                      Ubicaciones
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "recursos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("recursos")}
                    >
                      Recursos
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "financiero"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("financiero")}
                    >
                      Financiero
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "contacto-cliente"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("contacto-cliente")}
                    >
                      Contacto del Cliente
                    </button>
                    {embarqueDetalle?.modificado && (
                      <button
                        className={`border-b-2 py-2 px-1 text-sm font-medium ${
                          activeTab === "modificaciones"
                            ? "border-red-500 text-red-600"
                            : "border-transparent text-red-500 hover:text-red-700"
                        }`}
                        onClick={() => setActiveTab("modificaciones")}
                      >
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Modificaciones
                      </button>
                    )}
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeTab === "fotos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("fotos")}
                    >
                      Fotos de Evidencia ({fotosEmbarque.length})
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {/* Información General Tab */}
                  {activeTab === "general" && (
                    <div className="space-y-6">
                      {/* Cliente Section */}
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Información del Cliente
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Cliente
                            </label>
                            <p className="text-sm font-medium text-gray-900">
                              {embarqueDetalle.cliente?.nombre || // Changed here
                                "Sin asignar"}
                            </p>
                            <div className="space-y-1 mt-2">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Divisa de Pago
                              </label>
                              <p className="text-sm text-gray-700">
                                {embarqueDetalle.cliente?.divisa_pago === "MXN"
                                  ? "Pesos Mexicanos (MXN)"
                                  : embarqueDetalle.cliente?.divisa_pago === "USD"
                                  ? "Dólares Americanos (USD)"
                                  : "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Teléfono
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.cliente?.telefono ||
                                "No especificado"}
                            </p>
                            <div className="space-y-1 mt-2">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Empresa Facturadora
                              </label>
                              <p className="text-sm text-gray-700">
                                {embarqueDetalle.cliente?.empresa_facturadora ||
                                  (embarqueDetalle.cliente as any)?.razon_social ||
                                  "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Email
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.cliente?.email ||
                                "No especificado"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Forma de Facturación
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.cliente?.forma_facturacion ===
                              "pue"
                                ? "Pago en una sola exhibición (PUE)"
                                : embarqueDetalle.cliente?.forma_facturacion ===
                                  "ppd"
                                ? "Pago en parcialidades o diferido (PPD)"
                                : "No especificado"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Embarque Section */}
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Información del Embarque
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Estado
                            </label>
                            <div className="flex items-center">
                              {getEstadoBadge(embarqueDetalle.estado)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Carta Porte
                            </label>
                            <p className="text-sm font-mono font-medium text-gray-900">
                              {embarqueDetalle.carta_porte || "Sin asignar"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Fecha Creación
                            </label>
                            <p className="text-sm text-gray-700">
                              {new Date(
                                embarqueDetalle.fecha_creacion
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Folio
                            </label>
                            <p className="text-sm font-mono font-medium text-gray-900">
                              {embarqueDetalle.folio}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Contenido
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.contenido || "No especificado"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Peso
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.peso || "No especificado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ubicaciones Tab */}
                  {activeTab === "ubicaciones" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Direcciones de Recolecta y Entrega
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                              Dirección de Recolecta
                            </label>
                            <div className="bg-gray-50 border rounded-lg p-4">
                              <p className="text-sm text-gray-900 leading-relaxed">
                                {embarqueDetalle.direccion_recolecta ||
                                  embarqueDetalle.origen ||
                                  "No especificada"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Fecha
                                </label>
                                <p className="text-sm text-gray-700">
                                  {embarqueDetalle.fecha_recolecta
                                    ? new Date(
                                        embarqueDetalle.fecha_recolecta
                                      ).toLocaleDateString()
                                    : "Sin fecha"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Hora
                                </label>
                                <p className="text-sm text-gray-700">
                                  {embarqueDetalle.hora_recolecta || "Sin hora"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">
                              Dirección de Entrega
                            </label>
                            <div className="bg-gray-50 border rounded-lg p-4">
                              <p className="text-sm text-gray-900 leading-relaxed">
                                {embarqueDetalle.direccion_entrega ||
                                  embarqueDetalle.destino ||
                                  "No especificada"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Fecha
                                </label>
                                <p className="text-sm text-gray-700">
                                  {embarqueDetalle.fecha_entrega
                                    ? new Date(
                                        embarqueDetalle.fecha_entrega
                                      ).toLocaleDateString()
                                    : "Sin fecha"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Hora
                                </label>
                                <p className="text-sm text-gray-700">
                                  {embarqueDetalle.hora_entrega || "Sin hora"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recursos Tab */}
                  {activeTab === "recursos" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Recursos Asignados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              Detalles del Operador
                            </h4>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700">
                                {embarqueDetalle.operador
                                  ? `${embarqueDetalle.operador.nombre} ${embarqueDetalle.operador.apellidos}`
                                  : "Sin asignar"}
                              </p>
                              {embarqueDetalle.operador?.telefono && (
                                <p className="text-sm text-gray-600">
                                  Teléfono: {embarqueDetalle.operador.telefono}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              Detalles del Tractocamión
                            </h4>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700">
                                {embarqueDetalle.camion?.numero_economico ||
                                  "Sin asignar"}
                              </p>
                              {embarqueDetalle.camion?.marca && (
                                <p className="text-sm text-gray-600">
                                  Marca: {embarqueDetalle.camion.marca}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              Detalles del Remolque
                            </h4>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700">
                                {embarqueDetalle.remolque?.numero_economico ||
                                  embarqueDetalle.remolque_numero_economico || // Corrected column name
                                  "Sin asignar"}
                              </p>
                              {embarqueDetalle.remolque?.placas && (
                                <p className="text-sm text-gray-600">
                                  Placas: {embarqueDetalle.remolque.placas}
                                </p>
                              )}
                              {embarqueDetalle.remolque_placa &&
                                !embarqueDetalle.remolque && ( // Corrected column name
                                  <p className="text-sm text-gray-600">
                                    Placas (Manual):{" "}
                                    {embarqueDetalle.remolque_placa}{" "}
                                    {/* Corrected column name */}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financiero Tab */}
                  {activeTab === "financiero" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Información Financiera
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Precio del Flete
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.precio_flete
                                ? `$${embarqueDetalle.precio_flete} ${
                                    embarqueDetalle.moneda_flete || "MXN"
                                  }`
                                : "Sin definir"}
                            </p>
                          </div>
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Flete en Falso
                            </label>
                            <p className="text-sm text-gray-700">
                              {embarqueDetalle.flete_falso ? "Sí" : "No"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Observaciones
                        </h3>
                        <div className="bg-gray-50 border rounded-lg p-4 min-h-[120px]">
                          <p className="text-sm text-gray-900 leading-relaxed">
                            {embarqueDetalle.observaciones ||
                              "Sin observaciones registradas"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contacto del Cliente Tab */}
                  {activeTab === "contacto-cliente" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Contacto Principal del Cliente
                        </h3>
                        {(() => {
                          const contacto = contactosClientes.find(
                            (c) =>
                              c.cliente_id === embarqueDetalle.cliente?.id &&
                              c.es_principal
                          );
                          if (!contacto) {
                            return (
                              <p className="text-gray-500">
                                No se ha especificado un contacto principal para
                                este cliente.
                              </p>
                            );
                          }
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Nombre
                                </label>
                                <p className="text-sm font-medium text-gray-900">
                                  {contacto.nombre} {contacto.apellidos || ""}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Puesto
                                </label>
                                <p className="text-sm text-gray-700">
                                  {contacto.puesto || "No especificado"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Teléfono
                                </label>
                                <p className="text-sm text-gray-700">
                                  {contacto.telefono || "No especificado"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Email
                                </label>
                                <p className="text-sm text-gray-700">
                                  {contacto.email || "No especificado"}
                                </p>
                              </div>
                              <div className="space-y-1 col-span-full">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Notas
                                </label>
                                <p className="text-sm text-gray-700">
                                  {contacto.notas || "Sin notas"}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Modificaciones Tab */}
                  {activeTab === "modificaciones" &&
                    embarqueDetalle?.modificado && (
                      <div className="space-y-6">
                        <div className="bg-white border rounded-lg p-6">
                          <ModificacionesHistory embarqueId={embarqueDetalle.id} />
                        </div>
                      </div>
                    )}

                  {activeTab === "fotos" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Fotos de Evidencia del Embarque
                        </h3>
                        {loadingFotos ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600">
                              Cargando fotos...
                            </span>
                          </div>
                        ) : fotosEmbarque.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {fotosEmbarque.map((foto) => (
                              <div key={foto.id} className="rounded-lg border border-gray-200 bg-white p-2">
                                {/* Área de vista previa clickable (solo aquí abre el visor) */}
                                <div
                                  className="group relative block cursor-pointer"
                                  onClick={() => setSelectedImage(foto.url_blob)}
                                >
                                  {String(foto.tipo_mime || "").startsWith("image/") ? (
                                    <img
                                      src={foto.url_blob || "/placeholder.svg"}
                                      alt={foto.nombre_archivo}
                                      className="w-full h-40 object-cover rounded-md shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                                    />
                                  ) : (
                                    <div className="w-full h-40 rounded-md bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-500">
                                      <div className="flex flex-col items-center">
                                        <FileText className="h-8 w-8 mb-1" />
                                        <span className="text-xs">Documento</span>
                                      </div>
                                    </div>
                                  )}
                                  <div className="pointer-events-none absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-md flex items-center justify-center">
                                    <Eye className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                {/* Pie con nombre y ubicación (no abre el visor) */}
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-800 truncate" title={foto.nombre_archivo}>
                                    {foto.nombre_archivo}
                                  </p>
                                  <div className="mt-1">
                                    {foto.latitud != null && foto.longitud != null ? (
                                      <a
                                        href={`https://www.google.com/maps?q=${foto.latitud},${foto.longitud}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                      >
                                        <MapPin className="h-3.5 w-3.5" /> Ver ubicación
                                      </a>
                                    ) : (
                                      <span className="text-[11px] text-gray-400">Sin geolocalización</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">
                              No hay fotos de evidencia para este embarque.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex justify-start space-x-4">
                      <Button
                        onClick={descargarExcel}
                        variant="outline"
                        size="sm"
                        className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                      >
                        📊 Descargar Excel
                      </Button>
                      <Button
                        onClick={imprimirDetalles}
                        variant="outline"
                        size="sm"
                        className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                      >
                        🖨️ Imprimir Detalles
                      </Button>
                    </div>
                    <Button
                      onClick={() => setShowDetailsModal(false)}
                      variant="outline"
                      size="sm"
                      className="ml-auto border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Modificación */}
      {showModifyModal && embarqueAModificar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b bg-red-50">
              <div>
                <h2 className="text-xl font-bold text-red-800">
                  Modificar Embarque
                </h2>
                <p className="text-sm text-red-600">
                  Folio: {embarqueAModificar.folio} - Solo para situaciones de
                  emergencia
                </p>
              </div>
              <Button
                onClick={() => setShowModifyModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 px-6 pt-6">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    className={`border-b-2 py-2 px-1 text-sm font-medium ${
                      activeModifyTab === "justificacion"
                        ? "border-red-500 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveModifyTab("justificacion")}
                  >
                    Justificación
                  </button>
                  <button
                    className={`border-b-2 py-2 px-1 text-sm font-medium ${
                      activeModifyTab === "operador"
                        ? "border-red-500 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveModifyTab("operador")}
                  >
                    Operador
                  </button>
                  <button
                    className={`border-b-2 py-2 px-1 text-sm font-medium ${
                      activeModifyTab === "vehiculos"
                        ? "border-red-500 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveModifyTab("vehiculos")}
                  >
                    Vehículos
                  </button>
                  <button
                    className={`border-b-2 py-2 px-1 text-sm font-medium ${
                      activeModifyTab === "flete"
                        ? "border-red-500 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveModifyTab("flete")}
                  >
                    Flete
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Justificación Tab */}
                {activeModifyTab === "justificacion" && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <Label className="text-lg font-semibold mb-4 block text-red-800">
                        Justificación de la Modificación *
                      </Label>
                      <textarea
                        className="w-full p-4 border border-yellow-300 rounded-md text-sm min-h-[120px]"
                        placeholder="Explica detalladamente la razón de esta modificación (emergencia, contingencia, cambio de cliente, etc.)"
                        value={modificacionData.razon}
                        onChange={(e) =>
                          setModificacionData((prev) => ({
                            ...prev,
                            razon: e.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Esta justificación será registrada en el historial de
                        auditoría del embarque.
                      </p>
                    </div>
                  </div>
                )}

                {/* Operador Tab */}
                {activeModifyTab === "operador" && (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <input
                          type="checkbox"
                          id="cambiar_operador"
                          checked={modificacionData.cambiar_operador}
                          onChange={(e) =>
                            setModificacionData((prev) => ({
                              ...prev,
                              cambiar_operador: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-red-600"
                        />
                        <Label
                          htmlFor="cambiar_operador"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Cambiar Operador
                        </Label>
                      </div>

                      {modificacionData.cambiar_operador && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Operador Actual
                              </h4>
                              <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {embarqueAModificar.operador
                                    ? `${embarqueAModificar.operador.nombre} ${embarqueAModificar.operador.apellidos}`
                                    : "Sin asignar"}
                                </span>
                                {embarqueAModificar.operador?.telefono && (
                                  <span className="text-xs text-gray-500">
                                    Tel: {embarqueAModificar.operador.telefono}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Nuevo Operador
                              </Label>
                              <Select
                                value={modificacionData.nuevo_operador_id}
                                onValueChange={(value) =>
                                  setModificacionData((prev) => ({
                                    ...prev,
                                    nuevo_operador_id: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Seleccionar nuevo operador" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no-change">
                                    No cambiar
                                  </SelectItem>
                                  {operadores.map((operador) => (
                                    <SelectItem
                                      key={operador.id}
                                      value={operador.id}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {operador.nombre} {operador.apellidos}
                                        </span>
                                        {operador.telefono && (
                                          <span className="text-xs text-gray-500">
                                            {operador.telefono}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vehículos Tab */}
                {activeModifyTab === "vehiculos" && (
                  <div className="space-y-6">
                    {/* Tractocamión */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <input
                          type="checkbox"
                          id="cambiar_camion"
                          checked={modificacionData.cambiar_camion}
                          onChange={(e) =>
                            setModificacionData((prev) => ({
                              ...prev,
                              cambiar_camion: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-red-600"
                        />
                        <Label
                          htmlFor="cambiar_camion"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Cambiar Tractocamión
                        </Label>
                      </div>

                      {modificacionData.cambiar_camion && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Tractocamión Actual
                            </h4>
                            <div>
                              <p className="text-sm text-gray-900">
                                <span className="font-mono font-medium text-gray-900">
                                  {embarqueAModificar.camion?.numero_economico || "Sin asignar"}
                                </span>
                                {embarqueAModificar.camion?.marca && (
                                  <span className="text-gray-600 ml-2">
                                    - {embarqueAModificar.camion.marca}{" "}
                                    {embarqueAModificar.camion.modelo || ""}
                                  </span>
                                )}
                                {embarqueAModificar.camion?.placas && (
                                  <span className="text-gray-600 ml-2">
                                    - Placas: {embarqueAModificar.camion.placas}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Nuevo Tractocamión
                            </Label>
                            <Select
                              value={modificacionData.nuevo_camion_id}
                              onValueChange={(value) =>
                                setModificacionData((prev) => ({
                                  ...prev,
                                  nuevo_camion_id: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Seleccionar nuevo camión" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-change">
                                  No cambiar
                                </SelectItem>
                                {camiones.map((camion) => (
                                  <SelectItem key={camion.id} value={camion.id}>
                                    <div className="flex flex-col">
                                      <span className="font-mono font-medium">
                                        {camion.numero_economico}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {camion.marca} {camion.modelo}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remolque */}
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <input
                          type="checkbox"
                          id="cambiar_remolque"
                          checked={modificacionData.cambiar_remolque}
                          onChange={(e) =>
                            setModificacionData((prev) => ({
                              ...prev,
                              cambiar_remolque: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-red-600"
                        />
                        <Label
                          htmlFor="cambiar_remolque"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Cambiar Remolque
                        </Label>
                      </div>

                      {modificacionData.cambiar_remolque && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Remolque Actual
                            </h4>
                            <div>
                              <p className="text-sm text-gray-900">
                                <span className="font-mono font-medium text-gray-900">
                                  {embarqueAModificar.remolque?.numero_economico || embarqueAModificar.remolque_numero_economico || "Sin asignar"}
                                </span>
                                {embarqueAModificar.remolque?.marca && (
                                  <span className="text-gray-600 ml-2">
                                    - {embarqueAModificar.remolque.marca}
                                    {embarqueAModificar.remolque.modelo ? ` ${embarqueAModificar.remolque.modelo}` : ""}
                                  </span>
                                )}
                                {(() => {
                                  const placasInventario = embarqueAModificar.remolque?.placas;
                                  const placasManual = !embarqueAModificar.remolque && embarqueAModificar.remolque_placa;
                                  if (placasInventario) {
                                    return (
                                      <span className="text-gray-600 ml-2">- Placas: {placasInventario}</span>
                                    );
                                  }
                                  if (placasManual) {
                                    return (
                                      <span className="text-gray-600 ml-2">- Placas: {placasManual} (Manual)</span>
                                    );
                                  }
                                  return null;
                                })()}
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Nuevo Remolque
                            </Label>
                            <Select
                              value={modificacionData.nuevo_remolque_id}
                              onValueChange={(value) =>
                                setModificacionData((prev) => ({
                                  ...prev,
                                  nuevo_remolque_id: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Seleccionar nuevo remolque" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-change">
                                  No cambiar
                                </SelectItem>
                                <SelectItem value="sin-remolque">
                                  Sin remolque
                                </SelectItem>
                                <SelectItem value="manual">
                                  Capturar remolque manualmente
                                </SelectItem>
                                {remolques.map((remolque) => (
                                  <SelectItem
                                    key={remolque.id}
                                    value={remolque.id}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-mono font-medium">
                                        {remolque.numero_economico}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {remolque.tipo_remolque}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Si el usuario selecciona 'manual', mostrar inputs para capturar remolque */}
                          {modificacionData.nuevo_remolque_id === "manual" && (
                            <div className="col-span-2 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Número Económico (Manual)
                              </Label>
                              <Input
                                type="text"
                                placeholder="Ej: Caja Seca, Plataforma"
                                className="mb-2"
                                value={
                                  modificacionData.remolque_numero_economico ||
                                  "" // Corrected column name
                                }
                                onChange={(e) =>
                                  setModificacionData((prev) => ({
                                    ...prev,
                                    remolque_numero_economico: e.target.value, // Corrected column name
                                  }))
                                }
                              />
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Placas del Remolque (Manual)
                              </Label>
                              <Input
                                type="text"
                                placeholder="Ej: ABC123A"
                                value={
                                  modificacionData.remolque_placa || "" // Corrected column name
                                }
                                onChange={(e) =>
                                  setModificacionData((prev) => ({
                                    ...prev,
                                    remolque_placa: e.target.value, // Corrected column name
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Flete Tab */}
                {activeModifyTab === "flete" && (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <input
                          type="checkbox"
                          id="cambiar_flete"
                          checked={modificacionData.cambiar_flete}
                          onChange={(e) =>
                            setModificacionData((prev) => ({
                              ...prev,
                              cambiar_flete: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 text-red-600"
                        />
                        <Label
                          htmlFor="cambiar_flete"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Cambiar Información de Flete
                        </Label>
                      </div>

                      {modificacionData.cambiar_flete && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="border rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Precio Flete Actual
                              </h4>
                              <p className="text-base font-bold text-gray-900">
                                {(() => {
                                  const quickEnabled = (embarqueAModificar as any)?.quickpaid_enabled;
                                  const current = quickEnabled
                                    ? (embarqueAModificar as any)?.precio_quickpaid ?? embarqueAModificar.precio_flete
                                    : embarqueAModificar.precio_flete;
                                  return current
                                    ? `$${current} ${embarqueAModificar.moneda_flete || "MXN"}`
                                    : "Sin definir";
                                })()}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Nuevo Precio Flete
                              </Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="flex-1 h-12 text-lg"
                                  value={modificacionData.nuevo_precio_flete}
                                  onChange={(e) =>
                                    setModificacionData((prev) => ({
                                      ...prev,
                                      nuevo_precio_flete: e.target.value,
                                    }))
                                  }
                                />
                                <Select
                                  value={modificacionData.nueva_moneda_flete}
                                  onValueChange={(value) =>
                                    setModificacionData((prev) => ({
                                      ...prev,
                                      nueva_moneda_flete: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-24 h-12">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MXN">MXN</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="flete_en_falso"
                                checked={modificacionData.flete_en_falso}
                                onChange={(e) =>
                                  setModificacionData((prev) => ({
                                    ...prev,
                                    flete_en_falso: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 text-red-600"
                              />
                              <div>
                                <Label
                                  htmlFor="flete_en_falso"
                                  className="text-sm font-semibold text-red-800"
                                >
                                  Marcar como Flete en Falso
                                </Label>
                                <p className="text-xs text-red-600 mt-1">
                                  Esta opción indica que el flete no se realizó
                                  o fue cancelado
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t p-6 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowModifyModal(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={guardarModificacion}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    "Guardar Modificación"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registros Completados */}
      {showCompletedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[92vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Registros Completados</h2>
                <p className="text-sm text-gray-600">
                  Finalizados y cancelados ({totalCompletadosFiltrados} visibles)
                  {typeof totalFinalizadosDB === 'number' && (
                    <> · Finalizados totales BD: {totalFinalizadosDB}</>
                  )}
                  {typeof totalCanceladosArchivadosDB === 'number' && (
                    <> · Cancelados archivados BD: {totalCanceladosArchivadosDB}</>
                  )}
                </p>
              </div>
              <Button onClick={() => setShowCompletedModal(false)} variant="outline" size="sm">✕</Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6">
                {/* Buscador + Tipo de Servicio */}
                <div className="mb-4 flex flex-col md:flex-row md:items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="completados-search">Buscar</Label>
                    <Input
                      id="completados-search"
                      placeholder="Buscar por folio, cliente o load..."
                      value={completadosSearch}
                      onChange={(e) => setCompletadosSearch(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-64">
                    <Label htmlFor="completados-tipo-servicio">Tipo de Servicio</Label>
                    <Select
                      value={completadosTipoServicio}
                      onValueChange={setCompletadosTipoServicio}
                    >
                      <SelectTrigger id="completados-tipo-servicio">
                        <SelectValue placeholder="Filtrar por tipo de servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {tiposServicioCompletados.map((tipoId) => (
                          <SelectItem key={tipoId} value={tipoId}>
                            {getServiceDisplayName(tipoId)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Periodos rápidos */}
                <div className="mt-2 mb-3 flex flex-wrap gap-2">
                  <Button
                    variant={completadosPeriodo === "todo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("todo")}
                  >
                    Todo
                  </Button>
                  <Button
                    variant={completadosPeriodo === "mes_actual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("mes_actual")}
                  >
                    Mes actual
                  </Button>
                  <Button
                    variant={completadosPeriodo === "mes_anterior" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("mes_anterior")}
                  >
                    Mes anterior
                  </Button>
                  <Button
                    variant={completadosPeriodo === "ultimos_3" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("ultimos_3")}
                  >
                    Últ. 3 meses
                  </Button>
                  <Button
                    variant={completadosPeriodo === "ultimos_6" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("ultimos_6")}
                  >
                    Últ. 6 meses
                  </Button>
                  <Button
                    variant={completadosPeriodo === "este_anio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompletadosPeriodo("este_anio")}
                  >
                    Este año
                  </Button>
                </div>

                {/* Resumen + página */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    Mostrando {totalCompletadosFiltrados === 0 ? 0 : firstIdxComp + 1}
                    –{lastIdxComp} de {totalCompletadosFiltrados}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span>Tamaño página</span>
                      <Select
                        value={String(completadosPageSize)}
                        onValueChange={(v) => setCompletadosPageSize(Number(v))}
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
                    <Button
                      variant="outline"
                      className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                      onClick={descargarRegistrosCompletos}
                    >
                      Descargar Excel
                    </Button>
                  </div>
                </div>

                {loadingCompleted ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Cargando registros...</span>
                  </div>
                ) : totalCompletadosFiltrados === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto mb-2 text-purple-400" />
                    <p className="text-gray-500">No hay registros completados que coincidan</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-purple-50">
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-40 md:w-48 cursor-pointer select-none" onClick={() => handleSortCompletados("folio")}>Folio{sortIndicatorCompletados("folio")}</th>
                          <th className="px-3 py-2 text-left font-semibold w-48 md:w-64 cursor-pointer select-none" onClick={() => handleSortCompletados("cliente")}>Cliente{sortIndicatorCompletados("cliente")}</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap w-14 md:w-16 cursor-pointer select-none" onClick={() => handleSortCompletados("load")}>Load{sortIndicatorCompletados("load")}</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap w-32 cursor-pointer select-none" onClick={() => handleSortCompletados("tipo")}>Tipo de Servicio{sortIndicatorCompletados("tipo")}</th>
                          <th className="px-3 py-2 text-right font-semibold whitespace-nowrap w-40">Monto Facturado</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-28">Resultado</th>
                          <th className="px-3 py-2 text-left font-semibold w-32 cursor-pointer select-none" onClick={() => handleSortCompletados("fecha")}>Fecha Finalización{sortIndicatorCompletados("fecha")}</th>
                          <th className="px-3 py-2 text-center font-semibold">Detalles</th>
                          <th className="px-3 py-2 text-center font-semibold">Eliminar</th>
                          <th className="px-3 py-2 text-center font-semibold" style={{ display: 'none' }}>Restaurar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {embarquesFinalizadosPaginados.map((embarque) => (
                          <tr key={embarque.id} className="border-b hover:bg-purple-50">
                            <td className="px-3 py-2 font-mono whitespace-nowrap w-40 md:w-48">{embarque.folio}</td>
                            <td className="px-3 py-2 w-48 md:w-64 truncate">{embarque.cliente?.nombre || ""}</td>
                            <td className="px-2 py-2 whitespace-nowrap w-14 md:w-16 truncate">{embarque.load_number || ""}</td>
                            <td className="px-2 py-2 whitespace-nowrap w-32 md:w-36 truncate">{getServiceDisplayName(embarque.tipo_servicio_id || "")}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              {(() => {
                                const monto =
                                  typeof embarque.precio_quickpaid === "number" && embarque.precio_quickpaid > 0
                                    ? embarque.precio_quickpaid
                                    : embarque.precio_flete || 0;
                                const moneda = embarque.moneda_flete || "MXN";
                                return monto
                                  ? `$${monto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`
                                  : "Sin definir";
                              })()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {(() => {
                                const cancelado = Boolean(
                                  (embarque as any).cancelado_por ||
                                  (embarque as any).motivo_cancelacion ||
                                  (embarque as any).fecha_cancelacion ||
                                  (embarque.observaciones || "").toUpperCase().includes("[CANCELADO]")
                                );
                                return cancelado ? (
                                  <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800">Finalizado</Badge>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2 w-32 whitespace-nowrap">{
                              embarque.fecha_archivado
                                ? new Date(embarque.fecha_archivado).toLocaleDateString("es-MX")
                                : (embarque.fecha_finalizacion
                                  ? new Date(embarque.fecha_finalizacion).toLocaleDateString("es-MX")
                                  : (embarque.updated_at
                                    ? new Date(embarque.updated_at).toLocaleDateString("es-MX")
                                    : ""))
                            }</td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Abrir el modal de detalles manteniendo abierto el de registros completados
                                  setEmbarqueDetalle(embarque);
                                  setActiveTab("general");
                                  setSelectedImage(null);
                                  setShowDetailsModal(true);
                                  cargarFotosEmbarque(embarque.id);
                                }}
                                aria-label="Ver detalles"
                                title="Ver detalles del embarque"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => eliminarCompletado(embarque)}
                                disabled={!puedeEliminarCompletado(embarque) || saving}
                                className={`border-gray-300${!puedeEliminarCompletado(embarque) || saving ? " opacity-50 cursor-not-allowed" : ""}`}
                                aria-label="Eliminar"
                                title="Eliminar definitivamente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="px-3 py-2 text-center" style={{ display: 'none' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                onClick={async () => {
                                  const confirmacion = confirm(`¿Estás seguro de que deseas restaurar el embarque ${embarque.folio} a la pantalla de asignación?`);
                                  if (confirmacion) {
                                    setSaving(true);
                                    try {
                                      const { error } = await supabase
                                        .from("embarques")
                                        .update({ estado: "listo-para-asignar", updated_at: new Date().toISOString(), fecha_finalizacion: null })
                                        .eq("id", embarque.id);
                                      if (error) {
                                        console.error("Error restaurando embarque:", error);
                                        alert("Error al restaurar embarque: " + error.message);
                                      } else {
                                        alert(`Embarque ${embarque.folio} restaurado exitosamente.`);
                                        await cargarEmbarquesFinalizados();
                                        await cargarDatos();
                                      }
                                    } catch (err) {
                                      console.error("Error general al restaurar:", err);
                                      alert("Error general al restaurar embarque.");
                                    } finally {
                                      setSaving(false);
                                    }
                                  }
                                }}
                                disabled={saving}
                              >
                                {saving ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-1"></div>
                                    Restaurando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 12v-1m0 0l2.163 2.163a.75.75 0 001.06-.003L9.5 11.5m-4.5 0l2.163-2.163a.75.75 0 011.06.003L12 12.5m-4.5 0l2.163 2.163a.75.75 0 001.06-.003L15 15.5m-4.5 0l2.163-2.163a.75.75 0 001.06-.003L18 18.5m-4.5 0l2.163-2.163a.75.75 0 001.06-.003L21 21.5" />
                                    </svg>
                                    Restaurar
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {totalCompletadosPaginas > 1 && (
                      <div className="flex items-center justify-between p-3 text-sm">
                        <div>
                          Página {completadosPage} de {totalCompletadosPaginas}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCompletadosPage((p) => Math.max(1, p - 1))} disabled={completadosPage <= 1}>◀ Anterior</Button>
                          <Button variant="outline" size="sm" onClick={() => setCompletadosPage((p) => Math.min(totalCompletadosPaginas, p + 1))} disabled={completadosPage >= totalCompletadosPaginas}>Siguiente ▶</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cancelar embarque (Asignación) */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Embarque</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar el embarque {cancelingEmbarque?.folio}? 
              <br />
              <strong>Esta acción no se puede deshacer.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason-asignar">Justificación de la cancelación *</Label>
              <Textarea
                id="cancel-reason-asignar"
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

      {/* Visor de Imagen a pantalla completa */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Vista ampliada"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <Button
              onClick={() => setSelectedImage(null)}
              variant="secondary"
              size="icon"
              className="absolute -top-5 -right-5 rounded-full h-10 w-10 z-10 shadow-lg"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
