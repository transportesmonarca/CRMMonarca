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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Gauge,
  Calendar,
  Shield,
  AlertTriangle,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase, type Camion, type MarcaCamion } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { agregarAuditLog } from "@/lib/audit";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "date-fns";

// Definir una interfaz para la estructura de los comentarios
interface Comentario {
  id: string;
  text: string;
  date: string;
}

// Definir interfaz para números adicionales
interface NumeroAdicional {
  nombre: string;
  numero: string;
  fecha_vencimiento: string;
}

// Definir la estructura inicial del formulario
const initialFormData = {
  numero_economico: "",
  marca: "",
  modelo: "",
  año: "",
  numero_serie: "",
  placas: "",
  kilometraje: "",
  estado: "disponible",
  ultima_verificacion: "",
  frecuencia_verificacion: "",
  poliza_seguro_mexicano: "",
  fecha_vencimiento_seguro_mexicano: "",
  poliza_seguro_americano: "",
  fecha_vencimiento_seguro_americano: "",
  comentarios: "",
  tag_americano: "",
  tag_mexicano: "",
  numero_base: "",
  numeros_adicionales: [] as NumeroAdicional[],
};

function formatDateMatamoros(value?: string | null) {
  if (!value) return "No especificado";

  // Caso 1: fecha "date-only" (YYYY-MM-DD) -> NO usar new Date()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    // Formato local es-MX: dd/mm/aaaa
    return `${d}/${m}/${y}`;
  }

  // Caso 2: timestamp/ISO -> sí podemos usar Date con timeZone
  const dt = new Date(value);
  if (isNaN(+dt)) return "No especificado";
  return dt.toLocaleDateString("es-MX", { timeZone: "America/Matamoros" });
}

export default function CamionesPage() {
  // Main state variables
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCamion, setEditingCamion] = useState<Camion | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [tieneRegistrosKilometraje, setTieneRegistrosKilometraje] =
    useState(false);
  const [registrosKilometrajeTableExists, setRegistrosKilometrajeTableExists] =
    useState(true);
  const [
    registrosMantenimientoTableExists,
    setRegistrosMantenimientoTableExists,
  ] = useState(true);
  const [marcas, setMarcas] = useState<MarcaCamion[]>([]);
  const [marcasTableExists, setMarcasTableExists] = useState(true);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMarca, setEditingMarca] = useState(false);
  const [marcaFormData, setMarcaFormData] = useState({ nombre: "" });
  const marcasDefault = [
    "Kenworth",
    "Freightliner",
    "Volvo",
    "International",
    "Peterbilt",
  ];
  // Estados y paginación para modal de marcas (se añadieron para evitar errores por referencias faltantes)
  const [showMarcasForm, setShowMarcasForm] = useState(false);
  const [marcaPage, setMarcaPage] = useState<number>(1);
  const [marcaPageSize, setMarcaPageSize] = useState<number>(10);
  const [confirmEstadoCamionId, setConfirmEstadoCamionId] = useState<string | null>(null);
  const [confirmEstadoCamionOpen, setConfirmEstadoCamionOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationFolios, setNotificationFolios] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("basica");
  const [loading, setLoading] = useState(false);
  const [selectedCamionKilometraje, setSelectedCamionKilometraje] =
    useState<Camion | null>(null);
  const [kilometrajeFormData, setKilometrajeFormData] = useState({
    kilometraje_actual: "",
    tramo_recorrido: "",
    fecha_viaje: "",
    comentarios_viaje: "",
  });
  const [historialKilometraje, setHistorialKilometraje] = useState<any[]>([]);
  // Paginación historial kilometraje
  const [currentPageKilometraje, setCurrentPageKilometraje] = useState<number>(1);
  // Paginación para historial de mantenimiento (nuevo diseño de tabla)
  const [currentPageMantenimiento, setCurrentPageMantenimiento] = useState<number>(1);
  const [pageSizeMantenimiento, setPageSizeMantenimiento] = useState<number>(5);
  // Paginación y orden para comentarios
  const [currentPageComentarios, setCurrentPageComentarios] = useState<number>(1);
  const [pageSizeComentarios, setPageSizeComentarios] = useState<number>(3);
  const [sortOrderComentarios, setSortOrderComentarios] = useState<'desc' | 'asc'>('desc');
  const [pageSizeKilometraje, setPageSizeKilometraje] = useState<number>(5);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialMantenimiento, setHistorialMantenimiento] = useState<any[]>(
    []
  );
  const [showKilometrajeForm, setShowKilometrajeForm] = useState(false);
  const [showMantenimientoForm, setShowMantenimientoForm] = useState(false);
  const [selectedCamionMantenimiento, setSelectedCamionMantenimiento] =
    useState<Camion | null>(null);
  const [mantenimientoFormData, setMantenimientoFormData] = useState({
    fecha_mantenimiento: "",
    detalles_mantenimiento: "",
    proximo_mantenimiento: "",
    tipo_mantenimiento: "",
  });
  const [camionDetalle, setCamionDetalle] = useState<Camion | null>(null);
  const [showDetallesCamion, setShowDetallesCamion] = useState(false);

  // Update helper moved above guardarCamion so it can be called from confirmation
  async function performUpdate(camionDataToUpdate: any) {
    if (!editingCamion) return;
    setSaving(true);
    try {
      const { data: updatedRow, error: updateError } = await supabase
        .from("camiones")
        .update(camionDataToUpdate)
        .eq("id", editingCamion.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error actualizando camión:", updateError);
        toast({ title: `Error al actualizar el camión: ${updateError.message || String(updateError)}`, variant: "destructive" });
        setSaving(false);
        return;
      }

      setCamiones(prev => prev.map(c => c.id === editingCamion.id ? { ...c, ...updatedRow } as any : c));
      if (updatedRow) setCamionDetalle(updatedRow as any);
      toast({ title: "Camión actualizado exitosamente", variant: "success" });
    } catch (e) {
      console.error("Error inesperado en performUpdate:", e);
      toast({ title: "Error inesperado al actualizar el camión", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  const [editingRegistro, setEditingRegistro] = useState<any>(null);
  const [editRegistroFormData, setEditRegistroFormData] = useState({
    kilometraje_agregado: "",
    tramo_recorrido: "",
    fecha_viaje: "",
    comentarios_viaje: "",
  });
  const [showEditRegistroForm, setShowEditRegistroForm] = useState(false);
  const [editingRegistroMantenimiento, setEditingRegistroMantenimiento] =
    useState<any>(null);
  const [editMantenimientoFormData, setEditMantenimientoFormData] = useState({
    fecha_mantenimiento: "",
    tipo_mantenimiento: "",
    detalles_mantenimiento: "",
    proximo_mantenimiento: "",
  });
  const [showEditMantenimientoForm, setShowEditMantenimientoForm] =
    useState(false);
  const [loadingHistorialMantenimiento, setLoadingHistorialMantenimiento] =
    useState(false);
  const [recordsPerPageKilometraje, setRecordsPerPageKilometraje] =
    useState(10);

  // Estados para la gestión de comentarios
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");

  // Cargar datos iniciales
  useEffect(() => {
    cargarCamiones();
    cargarMarcas();
    verificarTablaRegistrosKilometraje();
    verificarTablaRegistrosMantenimiento();
  }, []);

  // Función para cargar marcas desde la base de datos
  const cargarMarcas = async () => {
    try {
      setLoadingMarcas(true);
      const { data, error } = await supabase
        .from("marcas_camiones")
        .select("*")
        .eq("activa", true)
        .order("nombre");

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.code === "42P01"
        ) {
          console.log("Tabla marcas_camiones no existe");
          setMarcasTableExists(false);
        } else {
          console.error("Error cargando marcas:", error);
          setMarcasTableExists(false);
        }
        setMarcas([]);
      } else {
        setMarcasTableExists(true);
        setMarcas(data || []);
      }
    } catch (error) {
      console.error("Error en cargarMarcas:", error);
      setMarcasTableExists(false);
      setMarcas([]);
    } finally {
      setLoadingMarcas(false);
    }
  };

  // Consulta a Supabase para cargar camiones
  const cargarCamiones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("camiones")
        .select("*")
        .order("numero_economico");
      if (error) {
        console.error("Error cargando camiones:", error);
        setCamiones([]);
      } else {
        setCamiones(data || []);
      }
    } catch (error) {
      console.error("Error inesperado cargando camiones:", error);
      setCamiones([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper: safely parse observaciones whether stored as string or object
  const safeParseObservaciones = (obs: any) => {
    if (!obs) return {};
    if (typeof obs === "object") return obs;
    if (typeof obs === "string") {
      try {
        return JSON.parse(obs);
      } catch (e) {
        try {
          // sometimes double-escaped strings can appear, try unescaping
          return JSON.parse(obs.replace(/\\"/g, '"'));
        } catch (e2) {
          return {};
        }
      }
    }
    return {};
  };

  // Limpiar formulario de camión
  const limpiarFormulario = () => {
    setFormData({ ...initialFormData });
    setEditingCamion(null);
    setActiveTab("basica");
  };

  // Poblar formulario al editar un camión existente
  const poblarFormularioParaEdicion = (camion: Camion) => {
    let datosAdicionales: any = {};
    if (camion.observaciones) {
      try {
        datosAdicionales = safeParseObservaciones(camion.observaciones);
      } catch (error) {
        console.error("Error parsing observaciones:", error);
      }
    }

    // Prefer historial_comentarios when populating the edit form so comments are consistent
    let initialComentarios = datosAdicionales.comentarios || "";
    try {
      if ((!initialComentarios || initialComentarios === "") && Array.isArray(datosAdicionales.historial_comentarios) && datosAdicionales.historial_comentarios.length > 0) {
        // populate with the last comment for compatibility
        const last = datosAdicionales.historial_comentarios[datosAdicionales.historial_comentarios.length - 1];
        initialComentarios = last && last.text ? last.text : initialComentarios;
      }
    } catch (e) {
      // ignore and fallback to comentarios
    }

    setFormData({
      numero_economico: camion.numero_economico || "",
      marca: camion.marca || "",
      modelo: camion.modelo || "",
      año: camion.año?.toString() || "",
      numero_serie: datosAdicionales.numero_serie || "",
      placas: camion.placas || "",
      kilometraje: camion.kilometraje?.toString() || "",
      estado: camion.estado || "disponible",
      ultima_verificacion: datosAdicionales.ultima_verificacion || "",
      frecuencia_verificacion: datosAdicionales.frecuencia_verificacion || "",
      poliza_seguro_mexicano: datosAdicionales.poliza_seguro_mexicano || "",
      fecha_vencimiento_seguro_mexicano:
        datosAdicionales.fecha_vencimiento_seguro_mexicano || "",
      poliza_seguro_americano: datosAdicionales.poliza_seguro_americano || "",
      fecha_vencimiento_seguro_americano:
        datosAdicionales.fecha_vencimiento_seguro_americano || "",
  comentarios: initialComentarios || "",
      tag_americano: datosAdicionales.tag_americano || "",
      tag_mexicano: datosAdicionales.tag_mexicano || "",
      numero_base: datosAdicionales.numero_base || "",
      numeros_adicionales: Array.isArray(datosAdicionales.numeros_adicionales)
        ? datosAdicionales.numeros_adicionales.map((item: any) => ({
            nombre: item.nombre || "",
            numero: item.numero || "",
            fecha_vencimiento: item.fecha_vencimiento || "",
          }))
        : [],
    });
  setEditingCamion(camion);
  // Ensure the basic tab is active before opening the modal so fields render immediately
  setActiveTab("basica");
  // open modal on next tick to allow tab state to apply
  setTimeout(() => setShowForm(true), 0);
  };

  // Función para guardar camión
  const guardarCamion = async () => {
    setSaving(true);

    try {
      // Validaciones básicas
      if (!formData.numero_economico || !formData.marca || !formData.modelo) {
        toast({ title: "Por favor completa los campos obligatorios: Número Económico, Marca y Modelo", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Verificar duplicados de número económico
      const { data: existingCamion } = await supabase
        .from("camiones")
        .select("id")
        .eq("numero_economico", formData.numero_economico)
        .neq("id", editingCamion?.id || "");

      if (existingCamion && existingCamion.length > 0) {
        toast({ title: "Ya existe un camión con este número económico", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Verificar duplicados de número de serie (almacenado en observaciones.numero_serie)
      const serialTrim = (formData.numero_serie || "").trim();
      if (serialTrim) {
        try {
          // Some Supabase clients do not accept JSON path in .eq; fetch observaciones and check client-side
          const { data: all, error: allErr } = await supabase
            .from("camiones")
            .select("id, observaciones");

          if (allErr) {
            console.warn("Error fetching camiones for serial check:", allErr);
            toast({ title: "Error al verificar número de serie", variant: "destructive" });
            setSaving(false);
            return;
          }

          const existingSerial = (all || []).filter((r: any) => {
            try {
              const obs = r.observaciones ? safeParseObservaciones(r.observaciones) : {};
              return (obs.numero_serie || "").trim() === serialTrim;
            } catch {
              return false;
            }
          });

          const serialDuplicateExists = editingCamion
            ? existingSerial.some((r: any) => r.id !== editingCamion.id)
            : existingSerial.length > 0;

          if (serialDuplicateExists) {
            toast({ title: "Ya existe un camión con ese número de serie", variant: "destructive" });
            setSaving(false);
            return;
          }
        } catch (e) {
          console.warn("Error comprobando serial en camiones:", e);
        }
      }

      // Preparar datos adicionales para JSON
      // Build datosAdicionales and preserve any existing historial_comentarios
      let existingObservaciones: any = {};
      if (editingCamion && editingCamion.observaciones) {
        try {
          existingObservaciones = safeParseObservaciones(editingCamion.observaciones);
        } catch (e) {
          existingObservaciones = {};
        }
      }

      const datosAdicionales = {
        numero_serie: formData.numero_serie || null,
        poliza_seguro_mexicano: formData.poliza_seguro_mexicano || null,
        fecha_vencimiento_seguro_mexicano:
          formData.fecha_vencimiento_seguro_mexicano || null,
        poliza_seguro_americano: formData.poliza_seguro_americano || null,
        fecha_vencimiento_seguro_americano:
          formData.fecha_vencimiento_seguro_americano || null,
        ultima_verificacion: formData.ultima_verificacion || null,
        frecuencia_verificacion: formData.frecuencia_verificacion || null,
        tag_americano: formData.tag_americano || null,
        tag_mexicano: formData.tag_mexicano || null,
        numero_base: formData.numero_base || null,
        numeros_adicionales: formData.numeros_adicionales.filter(
          (item) => item.nombre && item.numero
        ),
        // We'll keep comentarios for backward compatibility, but maintain historial_comentarios as the source of truth.
        comentarios: formData.comentarios || null,
        // Preserve existing historial_comentarios (array) and, if none exist but comentarios provided, initialize it.
        historial_comentarios: Array.isArray(existingObservaciones.historial_comentarios)
          ? existingObservaciones.historial_comentarios
          : (existingObservaciones.comentarios ? [{ id: uuidv4(), text: existingObservaciones.comentarios, date: new Date().toISOString() }] : []),
      };

      // If user edited the comentarios textarea, append/update the historial_comentarios with the latest comment
      try {
        if (formData.comentarios && formData.comentarios.trim() !== "") {
          const last = datosAdicionales.historial_comentarios[datosAdicionales.historial_comentarios.length - 1];
          // If last comment text differs, append a new entry; otherwise update last
          if (!last || last.text !== formData.comentarios.trim()) {
            datosAdicionales.historial_comentarios = [
              ...datosAdicionales.historial_comentarios,
              { id: uuidv4(), text: formData.comentarios.trim(), date: new Date().toISOString() },
            ];
          } else {
            // keep as-is
          }
        }
      } catch (e) {
        // ignore
      }

      // Datos principales del camión - usar valores exactos que coincidan con la base de datos
      const kilometrajeValue = editingCamion
        ? editingCamion.kilometraje // No permitir modificar el kilometraje inicial al editar
        : Number.parseInt(formData.kilometraje) || 0;

      const asDateOnly = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : v || null);

      const columnPatch = {
        // Tags / números
        tag_americano: formData.tag_americano || null,
        tag_mexicano: formData.tag_mexicano || null,
        numero_base: formData.numero_base || null,
        numeros_adicionales: (formData.numeros_adicionales || [])
          .filter((x) => x?.nombre && x?.numero) || null, // si tu columna es JSONB

        // Pólizas / vencimientos (si tus columnas son DATE, manda YYYY-MM-DD string)
        poliza_seguro_mexicano: formData.poliza_seguro_mexicano || null,
        fecha_vencimiento_seguro_mexicano: asDateOnly(formData.fecha_vencimiento_seguro_mexicano),
        poliza_seguro_americano: formData.poliza_seguro_americano || null,
        fecha_vencimiento_seguro_americano: asDateOnly(formData.fecha_vencimiento_seguro_americano),
      };

      const camionData = {
        numero_economico: formData.numero_economico,
        marca: formData.marca,
        modelo: formData.modelo,
        año: formData.año ? Number.parseInt(formData.año) : null,
        placas: formData.placas || null,
        kilometraje: kilometrajeValue,
        estado: formData.estado,
        observaciones: datosAdicionales,
        updated_at: new Date().toISOString(),
        ...columnPatch,
      };

      if (editingCamion) {
        // Show a confirmation with the payload so user can inspect without DevTools
        try {
          const pretty = JSON.stringify(camionData, null, 2);
          const ok = confirm("Confirmar actualización del camión con el siguiente payload:\n\n" + pretty);
          if (!ok) {
            setSaving(false);
            return;
          }
        } catch (e) {
          // ignore confirm errors and proceed
        }

        // Perform update using helper which updates local state
        await performUpdate(camionData);
      } else {
        // Crear nuevo camión
        const newCamionData = {
          ...camionData,
          fecha_registro: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from("camiones")
          .insert(newCamionData)
          .select("*")
          .single();

        if (error) {
          console.warn("Error creando camión:", error);
          const dbCode = (error as any)?.code || (error as any)?.status || "";
          const details = (error as any)?.details || "";

          if (dbCode === "23505" || details.includes("already exists") || details.includes("Key (numero_economico)")) {
            toast({ title: "Ya existe un camión con ese número económico", variant: "destructive" });
          } else if (dbCode === "23505" && details.includes("numero_serie")) {
            toast({ title: "Ya existe un camión con ese número de serie", variant: "destructive" });
          } else {
            toast({ title: `Error al crear el camión: ${ (error as any)?.message || 'Error desconocido' }`, variant: "destructive" });
          }

          setSaving(false);
          return;
        }

        if (inserted) {
          setCamiones((prev) => [...prev, inserted as any]);
          setCamionDetalle(inserted as any);
        } else {
          setCamiones((prev) => [...prev, { ...newCamionData } as any]);
        }

        toast({ title: "Camión creado exitosamente", variant: "success" });

        try {
          agregarAuditLog("CREAR", "Camiones", `Creó camión ${newCamionData.numero_economico}`);
        } catch {}
      }

      await cargarCamiones();
      setShowForm(false);
      if (editingCamion) {
        setActiveTab("informacion");
        setTimeout(() => setShowDetallesCamion(true), 60);
      }
      limpiarFormulario();
    } catch (error) {
      console.error("Error guardando camión:", error);
      toast({ title: "Error inesperado al guardar el camión", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // performUpdate is defined earlier (moved above guardarCamion)

  // Funciones para gestión de marcas
  const limpiarFormularioMarca = () => {
    setMarcaFormData({ nombre: "" });
    setEditingMarca(false);
  };

  const guardarMarca = async () => {
    if (!marcaFormData.nombre.trim()) {
      toast({ title: "Por favor ingresa el nombre de la marca", variant: "destructive" });
      return;
    }

    try {
      if (editingMarca) {
        // Actualizar marca existente
        const marcaAEditar = marcas.find(
          (m) => m.nombre === marcaFormData.nombre
        );
        if (marcaAEditar) {
          const { error } = await supabase
            .from("marcas_camiones")
            .update({
              nombre: marcaFormData.nombre.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", marcaAEditar.id);

          if (error) {
            toast({ title: "Error al actualizar la marca", variant: "destructive" });
            return;
          }
          toast({ title: "Marca actualizada exitosamente", variant: "success" });
        }
      } else {
        // Crear nueva marca
        const { error } = await supabase.from("marcas_camiones").insert({
          nombre: marcaFormData.nombre.trim(),
          activa: true,
        });

        if (error) {
          if (error.code === "23505") {
            toast({ title: "Ya existe una marca con este nombre", variant: "destructive" });
          } else {
            toast({ title: "Error al crear la marca", variant: "destructive" });
          }
          return;
        }
        toast({ title: "Marca creada exitosamente", variant: "success" });
      }

      await cargarMarcas();
      limpiarFormularioMarca();
    } catch (error) {
      console.error("Error guardando marca:", error);
      toast({ title: "Error inesperado al guardar la marca", variant: "destructive" });
    }
  };

  const editarMarca = (marca: MarcaCamion) => {
    setEditingMarca(true);
    setMarcaFormData({ nombre: marca.nombre });
  };

  const eliminarMarca = async (id: string) => {
    try {
      // Check if any camiones are currently using this marca (do not modify them)
      let marcaRecord: any = null;
      try {
        const { data: mx } = await supabase.from("marcas_camiones").select("*").eq("id", id).single();
        marcaRecord = mx;
      } catch (e) {
        // ignore
      }

      const marcaNombre = marcaRecord?.nombre || null;
      let inUseCount = 0;
      if (marcaNombre) {
        try {
          const { data: camionesUsing } = await supabase.from("camiones").select("id").eq("marca", marcaNombre);
          inUseCount = Array.isArray(camionesUsing) ? camionesUsing.length : 0;
        } catch (e) {
          // ignore count errors
        }
      }

      const { error } = await supabase
        .from("marcas_camiones")
        .update({ activa: false })
        .eq("id", id);

      if (error) {
        toast({ title: "Error al eliminar la marca", variant: "destructive" });
        return;
      }

      if (inUseCount > 0) {
        toast({
          title: `Marca desactivada. Esta marca está en uso en ${inUseCount} camión(es); los registros existentes NO fueron modificados. La desactivación sólo aplica a asignaciones futuras.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Marca eliminada exitosamente", variant: "destructive" });
      }

      await cargarMarcas();
    } catch (error) {
      console.error("Error eliminando marca:", error);
      toast({ title: "Error inesperado al eliminar la marca", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !camionDetalle) return;

    const newComment: Comentario = {
      id: uuidv4(),
      text: newCommentText.trim(),
      date: new Date().toISOString(),
    };

    let currentObservaciones: any = {};
    try {
      currentObservaciones = camionDetalle.observaciones
        ? safeParseObservaciones(camionDetalle.observaciones)
        : {};
    } catch (e) {
      console.error("Error parsing observaciones:", e);
    }

    const updatedComments = [
      ...(currentObservaciones.historial_comentarios || []),
      newComment,
    ];
    const updatedObservaciones = {
      ...currentObservaciones,
      historial_comentarios: updatedComments,
    };

    try {
      const { error } = await supabase
        .from("camiones")
        .update({
          observaciones: updatedObservaciones,
          updated_at: new Date().toISOString(),
        })
        .eq("id", camionDetalle.id);

      if (error) {
        console.error("Error adding comment:", error);
        toast({ title: "Error al agregar comentario.", variant: "destructive" });
      } else {
        setCamionDetalle((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            observaciones: updatedObservaciones,
          };
        });
        setNewCommentText("");
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      toast({ title: "Error inesperado al guardar comentario.", variant: "destructive" });
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editedCommentText.trim() || !camionDetalle) return;

    let currentObservaciones: any = {};
    try {
      currentObservaciones = camionDetalle.observaciones
        ? safeParseObservaciones(camionDetalle.observaciones)
        : {};
    } catch (e) {
      console.error("Error parsing observaciones:", e);
    }

    const updatedComments = (
      currentObservaciones.historial_comentarios || []
    ).map((comment: Comentario) =>
      comment.id === commentId
        ? { ...comment, text: editedCommentText.trim() }
        : comment
    );

    const updatedObservaciones = {
      ...currentObservaciones,
      historial_comentarios: updatedComments,
    };

    try {
      const { error } = await supabase
        .from("camiones")
        .update({
          observaciones: updatedObservaciones,
          updated_at: new Date().toISOString(),
        })
        .eq("id", camionDetalle.id);

      if (error) {
        console.error("Error editing comment:", error);
        toast({ title: "Error al editar comentario.", variant: "destructive" });
      } else {
        setCamionDetalle((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            observaciones: updatedObservaciones,
          };
        });
  setEditingCommentId(null);
  setEditedCommentText("");
  toast({ title: "Comentario editado exitosamente.", variant: "success" });
      }
    } catch (error) {
      console.error("Error saving edited comment:", error);
      toast({ title: "Error inesperado al guardar comentario editado.", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
  if (!camionDetalle) return;
  if (!confirm("¿Estás seguro de eliminar este comentario?")) return;

    let currentObservaciones: any = {};
    try {
      currentObservaciones = camionDetalle.observaciones
  ? safeParseObservaciones(camionDetalle.observaciones)
        : {};
    } catch (e) {
      console.error("Error parsing observaciones:", e);
    }

    const updatedComments = (
      currentObservaciones.historial_comentarios || []
    ).filter((comment: Comentario) => comment.id !== commentId);

    const updatedObservaciones = {
      ...currentObservaciones,
      historial_comentarios: updatedComments,
    };

    try {
      const { error } = await supabase
        .from("camiones")
        .update({
          observaciones: updatedObservaciones,
          updated_at: new Date().toISOString(),
        })
        .eq("id", camionDetalle.id);

      if (error) {
        console.error("Error deleting comment:", error);
        toast({ title: "Error al eliminar comentario.", variant: "destructive" });
      } else {
        setCamionDetalle((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            observaciones: updatedObservaciones,
          };
        });
  toast({ title: "Comentario eliminado exitosamente.", variant: "success" });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({ title: "Error inesperado al eliminar comentario.", variant: "destructive" });
    }
  };

  const eliminarCamion = async (id: string) => {
    try {
      // Obtener información del camión
      const camion = camiones.find((c) => c.id === id);
      if (!camion) {
        toast({ title: "Camión no encontrado", variant: "destructive" });
        return;
      }

      // 1. Verificar si el camión está asociado a cualquier embarque (cualquier estado)
      const { data: embarquesAsociados, error: errorEmbarques } = await supabase
        .from("embarques")
        .select("id, folio, estado")
        .eq("camion_id", id);

      if (errorEmbarques) {
        console.error("Error verificando embarques:", errorEmbarques);
        toast({ title: "Error al verificar si el camión está en uso", variant: "destructive" });
        return;
      }

      if (embarquesAsociados && embarquesAsociados.length > 0) {
        const folios = embarquesAsociados.map((e) => e.folio).filter(Boolean) as string[];
        const mensaje = `No es posible eliminar el camión ${camion.numero_economico} porque tiene ${embarquesAsociados.length} embarque(s) asociado(s).`;
        // Mostrar notificación en un pop-up (Dialog) en lugar de alert
        setNotificationMessage(mensaje + "\n\nAcción recomendada: crea un nuevo camión para futuros movimientos y conserva este como histórico.");
        setNotificationFolios(folios.slice(0, 20)); // limitar visual a primeros 20
        setNotificationOpen(true);
        return;
      }

      // 2. Limpiar dependencias opcionales para evitar restricciones de FK
      try {
        if (registrosKilometrajeTableExists) {
          await supabase.from("registros_kilometraje").delete().eq("camion_id", id);
        }
      } catch (e) {
        console.warn("No se pudo limpiar registros_kilometraje (posible tabla inexistente)");
      }

      try {
        if (registrosMantenimientoTableExists) {
          await supabase
            .from("registros_mantenimiento")
            .delete()
            .eq("camion_id", id);
        }
      } catch (e) {
        console.warn(
          "No se pudo limpiar registros_mantenimiento (posible tabla inexistente)"
        );
      }

      try {
        // Eliminar recordatorios vinculados a este camión
        await supabase.from("recordatorios").delete().eq("camion_id", id);
      } catch (e) {
        console.warn("No se pudieron eliminar recordatorios asociados al camión");
      }

      // 3. Eliminar el camión
      const { error } = await supabase.from("camiones").delete().eq("id", id);

      if (error) {
        console.error("Error eliminando camión:", error?.message || error);
        toast({ title: "Error al eliminar el camión", variant: "destructive" });
        return;
      }

  toast({ title: "Camión eliminado exitosamente", variant: "destructive" });
      // Audit log: eliminación de camión
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Camiones",
          `Eliminó camión ${camion.numero_economico} (ID: ${id})`
        );
      } catch {}
      await cargarCamiones(); // Recargar la lista
    } catch (error) {
      console.error(
        "Error en eliminación:",
        error instanceof Error ? error.message : error
      );
      toast({ title: "Error inesperado al eliminar el camión", variant: "destructive" });
    }
  };

  const cambiarEstadoFueraServicio = async (id: string) => {
    try {
      const camion = camiones.find((c) => c.id === id);
      if (!camion) return;

      const nuevoEstado =
        camion.estado === "fuera-de-servicio"
          ? "disponible"
          : "fuera-de-servicio";

      const { error } = await supabase
        .from("camiones")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error cambiando estado:", error);
        setNotificationMessage("Error al cambiar estado del camión");
        setNotificationOpen(true);
        return;
      }

      setNotificationMessage(
        `Camión ${camion.numero_economico} ${
          nuevoEstado === "fuera-de-servicio" ? "marcado como fuera de servicio" : "reactivado"
        }`
      );
      setNotificationOpen(true);
      // Audit log: cambio de estado de camión
      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Camiones",
          `Cambió estado del camión ${camion.numero_economico} (ID: ${id}) a ${nuevoEstado}`
        );
      } catch {}
      await cargarCamiones(); // Recargar la lista
    } catch (error) {
      console.error("Error:", error);
      setNotificationMessage("Error al cambiar estado del camión");
      setNotificationOpen(true);
    }
  };

  const camionesFiltrados = camiones.filter(
    (camion) =>
      camion.numero_economico
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (camion.marca &&
        camion.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (camion.modelo &&
        camion.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (camion.placas &&
        camion.placas.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginación para la lista de camiones
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // 12 cards por página
  // Preferencia: cuántas cards mostrar por fila (2..6). Se persiste en localStorage.
  const [cardsPerRow, setCardsPerRow] = useState<number>(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('camiones.cardsPerRow') : null;
      return v ? Math.max(2, Math.min(6, Number.parseInt(v, 10) || 3)) : 3;
    } catch {
      return 3;
    }
  });
  // Detectar pantallas pequeñas para forzar 1 columna en mobile
  const [isMobile, setIsMobile] = useState(false);

  const totalItems = camionesFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const camionesPaginados = camionesFiltrados.slice(startIndex, endIndex);

  useEffect(() => {
    // Reiniciar a la primera página cuando cambie la búsqueda
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    // Guardar preferencia cuando cambie
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('camiones.cardsPerRow', String(cardsPerRow));
      }
    } catch {}
  }, [cardsPerRow]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const set = () => setIsMobile(Boolean(mq.matches));
    set();
    try {
      mq.addEventListener('change', set);
    } catch {
      // Safari fallback
      // @ts-ignore
      mq.addListener(set);
    }
    return () => {
      try {
        mq.removeEventListener('change', set);
      } catch {
        // @ts-ignore
        mq.removeListener(set);
      }
    };
  }, []);

  const getEstadoBadge = (estado: string) => {
    const estados = {
      disponible: { color: "bg-green-100 text-green-800", label: "Disponible" },
      "en-uso": { color: "bg-blue-100 text-blue-800", label: "En Uso" },
      mantenimiento: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Mantenimiento",
      },
      "fuera-de-servicio": {
        color: "bg-red-100 text-red-800",
        label: "Fuera de Servicio",
      },
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

  const verificarVencimientos = (camion: Camion) => {
    const alertas = [];

    if (camion.observaciones) {
      try {
        const datos = safeParseObservaciones(camion.observaciones);

        // Verificar seguro mexicano
        if (datos.fecha_vencimiento_seguro_mexicano) {
          const fechaVencimiento = new Date(
            datos.fecha_vencimiento_seguro_mexicano
          );
          const hoy = new Date();
          const diasRestantes = Math.ceil(
            (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasRestantes <= 30) {
            alertas.push({
              tipo: "seguro_mexicano",
              dias: Math.abs(diasRestantes),
              vencido: diasRestantes <= 0,
              fecha: formatDateMatamoros(datos.fecha_vencimiento_seguro_mexicano),
              mensaje:
                diasRestantes <= 0
                  ? `Seguro Mexicano vencido hace ${Math.abs(
                      diasRestantes
                    )} días`
                  : `Seguro Mexicano vence en ${diasRestantes} días`,
            });
          }
        }

        // Verificar seguro americano
        if (datos.fecha_vencimiento_seguro_americano) {
          const fechaVencimiento = new Date(
            datos.fecha_vencimiento_seguro_americano
          );
          const hoy = new Date();
          const diasRestantes = Math.ceil(
            (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasRestantes <= 30) {
            alertas.push({
              tipo: "seguro_americano",
              dias: Math.abs(diasRestantes),
              vencido: diasRestantes <= 0,
              fecha: formatDateMatamoros(datos.fecha_vencimiento_seguro_americano),
              mensaje:
              diasRestantes <= 0
                ? `Seguro Americano vencido hace ${Math.abs(
                  diasRestantes
                )} días`
                : `Seguro Americano vence en ${diasRestantes} días`,
            });
          }
        }

        // Verificar verificación
        if (datos.frecuencia_verificacion) {
          const proximaVerificacion = new Date(datos.frecuencia_verificacion);
          const hoy = new Date();
          const diasRestantes = Math.ceil(
            (proximaVerificacion.getTime() - hoy.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (diasRestantes <= 15) {
            alertas.push({
              tipo: "verificacion",
              dias: Math.abs(diasRestantes),
              vencido: diasRestantes <= 0,
              fecha: proximaVerificacion.toLocaleDateString(),
              mensaje:
                diasRestantes <= 0
                  ? `Verificación vencida hace ${Math.abs(diasRestantes)} días`
                  : `Verificación en ${Math.abs(diasRestantes)} días`,
            });
          }
        }
      } catch (error) {
        // Ignorar errores de parsing
      }
    }

    return alertas;
  };

  const descargarExcel = async () => {
    if (camiones.length === 0) {
      toast({ title: "No hay camiones para descargar", variant: "destructive" });
      return;
    }

    const headers = [
      "Número Económico",
      "Marca",
      "Modelo",
      "Año",
      "Placas",
      "Kilometraje",
      "Estado",
      "Número de Serie",
      "TAG Mexicano",
      "TAG Americano",
      "Número Base",
      "Póliza Mexicana",
  "Póliza Americana",
  "Vencimiento Seguro Mexicano",
  "Vencimiento Seguro Americano",
  "Último Mantenimiento",
  "Comentarios"
    ];

    // Helper para escapar y forzar texto (prefijo tab) evitando interpretación numérica en Excel
    const esc = (v: any) => `"\t${(v ?? "").toString().replace(/"/g, '""')}"`;

    // Consultar última fecha de mantenimiento real por camión
    const ultimaFechaMantenimientoPorCamion: Record<string, string> = {};
    try {
      if (registrosMantenimientoTableExists) {
        const camionIds = camiones.map(c => c.id);
        if (camionIds.length > 0) {
          const { data: registros, error } = await supabase
            .from('registros_mantenimiento')
            .select('camion_id, fecha_mantenimiento')
            .in('camion_id', camionIds)
            .order('fecha_mantenimiento', { ascending: false });
          if (!error && registros) {
            for (const reg of registros) {
              if (!ultimaFechaMantenimientoPorCamion[reg.camion_id]) {
                // Formatear fecha (YYYY-MM-DD o local)
                const f = reg.fecha_mantenimiento;
                ultimaFechaMantenimientoPorCamion[reg.camion_id] = f || '';
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error consultando últimas fechas mantenimiento:', e);
    }

    const csvContent = [
      headers.join(","),
      ...camiones.map((camion) => {
        let datos: any = {};
        if (camion.observaciones) {
          try {
            datos = safeParseObservaciones(camion.observaciones);
          } catch {
            datos = {};
          }
        }
        const vencimientoMex = datos.fecha_vencimiento_seguro_mexicano || "";
        const vencimientoUs = datos.fecha_vencimiento_seguro_americano || "";
  const ultimaMantRaw = ultimaFechaMantenimientoPorCamion[camion.id] || "";
  const ultimaMant = ultimaMantRaw ? new Date(ultimaMantRaw).toISOString().split('T')[0] : "";
        return [
          esc(camion.numero_economico),
          esc(camion.marca || ""),
          esc(camion.modelo || ""),
          esc(camion.año || ""),
          esc(camion.placas || ""),
          esc(camion.kilometraje),
          esc(camion.estado),
          esc(datos.numero_serie || ""),
          esc(datos.tag_mexicano || ""),
          esc(datos.tag_americano || ""),
          esc(datos.numero_base || ""),
          esc(datos.poliza_seguro_mexicano || ""),
          esc(datos.poliza_seguro_americano || ""),
          esc(vencimientoMex),
          esc(vencimientoUs),
          esc(ultimaMant),
          esc(datos.comentarios || ""),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `camiones_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Audit log: exportación general de camiones
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Camiones",
        `Descargó reporte general de camiones (${camiones.length})`
      );
    } catch {}
  };

  // Obtener marcas disponibles (de la BD o por defecto)
  const getMarcasDisponibles = () => {
    if (marcasTableExists && marcas.length > 0) {
      return marcas.map((marca) => marca.nombre);
    }
    return marcasDefault;
  };

  const limpiarFormularioKilometraje = () => {
    setKilometrajeFormData({
      kilometraje_actual: "",
      tramo_recorrido: "",
      fecha_viaje: todayLocalISODate(),
      comentarios_viaje: "",
    });
    setSelectedCamionKilometraje(null);
  };

  const verificarTablaRegistrosKilometraje = async () => {
    try {
      const { data, error } = await supabase
        .from("registros_kilometraje")
        .select("id")
        .limit(1);

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.code === "42P01"
        ) {
          console.log("Tabla registros_kilometraje no existe");
          setRegistrosKilometrajeTableExists(false);
        } else {
          console.error(
            "Error verificando tabla registros_kilometraje:",
            error
          );
          setRegistrosKilometrajeTableExists(false);
        }
      } else {
        setRegistrosKilometrajeTableExists(true);
      }
    } catch (error) {
      console.error("Error en verificarTablaRegistrosKilometraje:", error);
      setRegistrosKilometrajeTableExists(false);
    }
  };

  const verificarTablaRegistrosMantenimiento = async () => {
    try {
      const { data, error } = await supabase
        .from("registros_mantenimiento")
        .select("id")
        .limit(1);

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.code === "42P01"
        ) {
          console.log("Tabla registros_mantenimiento no existe");
          setRegistrosMantenimientoTableExists(false);
        } else {
          console.error(
            "Error verificando tabla registros_mantenimiento:",
            error
          );
          setRegistrosMantenimientoTableExists(false);
        }
      } else {
        setRegistrosMantenimientoTableExists(true);
      }
    } catch (error) {
      console.error("Error en verificarTablaRegistrosMantenimiento:", error);
      setRegistrosMantenimientoTableExists(false);
    }
  };

  const guardarKilometraje = async () => {
    if (!registrosKilometrajeTableExists) {
      toast({ title: "La tabla de registros de kilometraje no existe. Por favor ejecuta el script de migración de base de datos.", variant: "destructive" });
      return;
    }

    if (
      !selectedCamionKilometraje ||
      !kilometrajeFormData.kilometraje_actual ||
      !kilometrajeFormData.tramo_recorrido ||
      !kilometrajeFormData.fecha_viaje
    ) {
      toast({ title: "Por favor completa todos los campos obligatorios", variant: "destructive" });
      return;
    }

    try {
      const kilometrajeActual = Number.parseInt(
        kilometrajeFormData.kilometraje_actual
      );
      const kilometrajeAgregado =
        kilometrajeActual - selectedCamionKilometraje.kilometraje;

      if (kilometrajeAgregado <= 0) {
        toast({ title: "El kilometraje actual debe ser mayor al kilometraje anterior del camión", variant: "destructive" });
        return;
      }

      // Actualizar el kilometraje del camión
      const { error: errorCamion } = await supabase
        .from("camiones")
        .update({
          kilometraje: kilometrajeActual,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCamionKilometraje.id);

      if (errorCamion) {
        console.error("Error actualizando kilometraje:", errorCamion);
        toast({ title: "Error al actualizar kilometraje del camión", variant: "destructive" });
        return;
      }

      // Crear registro de viaje
      const registroViaje = {
        camion_id: selectedCamionKilometraje.id,
        kilometraje_anterior: selectedCamionKilometraje.kilometraje,
        kilometraje_agregado: kilometrajeAgregado,
        kilometraje_nuevo: kilometrajeActual,
        tramo_recorrido: kilometrajeFormData.tramo_recorrido,
        fecha_viaje: kilometrajeFormData.fecha_viaje,
        comentarios: kilometrajeFormData.comentarios_viaje,
        fecha_registro: new Date().toISOString(),
      };

      // Intentar guardar en tabla de registros de viaje
      const { error: errorViaje } = await supabase
        .from("registros_kilometraje")
        .insert(registroViaje);

      if (errorViaje) {
        console.log(
          "Tabla de registros de kilometraje no existe, solo se actualizó el camión"
        );
      }

      // Actualizar el camión seleccionado con el nuevo kilometraje
      setSelectedCamionKilometraje({
        ...selectedCamionKilometraje,
        kilometraje: kilometrajeActual,
      });
  // Reflejar inmediatamente en el detalle abierto
  setCamionDetalle(prev => prev && prev.id === selectedCamionKilometraje.id ? { ...prev, kilometraje: kilometrajeActual } : prev);

      // Limpiar solo los campos del formulario, mantener el camión seleccionado
      setKilometrajeFormData({
        kilometraje_actual: "",
        tramo_recorrido: "",
        fecha_viaje: new Date().toISOString().split("T")[0],
        comentarios_viaje: "",
      });

      await cargarCamiones();

      // Recargar historial si estamos en la ventana de detalles
      if (camionDetalle && camionDetalle.id === selectedCamionKilometraje.id) {
        await cargarHistorialKilometraje(selectedCamionKilometraje.id);
      }

      // Audit log: actualización de kilometraje
      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Camiones",
          `Actualizó kilometraje de camión ${selectedCamionKilometraje.numero_economico} a ${kilometrajeActual} (+${kilometrajeAgregado})`
        );
      } catch {}

  // Mensaje de éxito silencioso (se eliminó alert visible)
    } catch (error) {
      console.error("Error guardando kilometraje:", error);
      toast({ title: "Error al guardar kilometraje", variant: "destructive" });
    }
  };

  const cargarHistorialKilometraje = async (camionId: string) => {
    try {
      setLoadingHistorial(true);
      const { data, error } = await supabase
        .from("registros_kilometraje")
        .select("*")
        .eq("camion_id", camionId)
        .order("fecha_registro", { ascending: false });

      if (error) {
        console.log("Tabla de registros de kilometraje no existe");
        setHistorialKilometraje([]);
      } else {
        setHistorialKilometraje(data || []);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
      setHistorialKilometraje([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Ajustar página actual si el número de páginas cambia tras recarga
  useEffect(() => {
    const totalPages = Math.ceil(historialKilometraje.length / pageSizeKilometraje) || 1;
    if (currentPageKilometraje > totalPages) {
      setCurrentPageKilometraje(totalPages);
    }
  }, [historialKilometraje, currentPageKilometraje, pageSizeKilometraje]);

  // Ajustar página mantenimiento si cambia el total
  useEffect(() => {
    const totalPages = Math.ceil(historialMantenimiento.length / pageSizeMantenimiento) || 1;
    if (currentPageMantenimiento > totalPages) {
      setCurrentPageMantenimiento(totalPages);
    }
  }, [historialMantenimiento, currentPageMantenimiento, pageSizeMantenimiento]);

  const cargarHistorialMantenimiento = async (camionId: string) => {
    try {
      setLoadingHistorialMantenimiento(true);
      const { data, error } = await supabase
        .from("registros_mantenimiento")
        .select("*")
        .eq("camion_id", camionId)
        .order("fecha_mantenimiento", { ascending: false });

      if (error) {
        console.log("Tabla de registros de mantenimiento no existe");
        setHistorialMantenimiento([]);
      } else {
        setHistorialMantenimiento(data || []);
      }
    } catch (error) {
      console.error("Error cargando historial de mantenimiento:", error);
      setHistorialMantenimiento([]);
    } finally {
      setLoadingHistorialMantenimiento(false);
    }
  };

  const eliminarRegistroKilometraje = async (
    registroId: string,
    camionId: string,
    kilometrajeEliminado: number
  ) => {
    try {
      const { error } = await supabase
        .from("registros_kilometraje")
        .delete()
        .eq("id", registroId);

      if (error) {
        toast({ title: "Error al eliminar registro", variant: "destructive" });
        return;
      }

      // Recalcular la cadena completa de kilometrajes para evitar discrepancias si se borra un registro intermedio
      const { data: registrosRestantes, error: errorRegistros } = await supabase
        .from("registros_kilometraje")
        .select("id, kilometraje_anterior, kilometraje_agregado, kilometraje_nuevo")
        .eq("camion_id", camionId)
        .order("fecha_viaje", { ascending: true });

      let nuevoKilometraje = 0;
      if (!errorRegistros && registrosRestantes && registrosRestantes.length > 0) {
        // Base inicial (kilometraje antes del primer registro)
        const baseInicial = registrosRestantes[0].kilometraje_anterior || 0;
        let acumulado = baseInicial;
        const updates: any[] = [];
        for (const reg of registrosRestantes) {
          const esperadoAnterior = acumulado;
          acumulado += reg.kilometraje_agregado;
          const esperadoNuevo = acumulado;
          if (
            reg.kilometraje_anterior !== esperadoAnterior ||
            reg.kilometraje_nuevo !== esperadoNuevo
          ) {
            updates.push({
              id: reg.id,
              kilometraje_anterior: esperadoAnterior,
              kilometraje_nuevo: esperadoNuevo,
              updated_at: new Date().toISOString(),
            });
          }
        }
        nuevoKilometraje = acumulado;
        // Aplicar ajustes si hay diferencias
        for (const up of updates) {
          await supabase
            .from("registros_kilometraje")
            .update({
              kilometraje_anterior: up.kilometraje_anterior,
              kilometraje_nuevo: up.kilometraje_nuevo,
              updated_at: up.updated_at,
            })
            .eq("id", up.id);
        }
      } else {
        // Si no quedan registros, restar el eliminado del total actual (fallback)
        const camionActual = camiones.find((c) => c.id === camionId);
        if (camionActual) {
          nuevoKilometraje = Math.max(0, camionActual.kilometraje - kilometrajeEliminado);
        }
      }

      const updateResp = await supabase
        .from("camiones")
        .update({
          kilometraje: nuevoKilometraje,
          updated_at: new Date().toISOString(),
        })
        .eq("id", camionId);

      if (!updateResp.error) {
        // Actualizar lista local inmediatamente
        setCamiones(prev => prev.map(c => c.id === camionId ? { ...c, kilometraje: nuevoKilometraje } : c));
        // Actualizar detalle y seleccionados de forma segura
        setCamionDetalle(prev => prev && prev.id === camionId ? { ...prev, kilometraje: nuevoKilometraje } : prev);
        setSelectedCamionKilometraje(prev => prev && prev.id === camionId ? { ...prev, kilometraje: nuevoKilometraje } : prev);
      }

      await cargarHistorialKilometraje(camionId);
      // Sincronización posterior (no bloqueante) para asegurar consistencia con servidor
      cargarCamiones();
    } catch (error) {
      console.error("Error eliminando registro:", error);
      toast({ title: "Error al eliminar registro", variant: "destructive" });
    }
  };

  const editarRegistroKilometraje = (registro: any) => {
    setEditingRegistro(registro);
    setEditRegistroFormData({
      kilometraje_agregado: registro.kilometraje_agregado?.toString() || "",
      tramo_recorrido: registro.tramo_recorrido || "",
      fecha_viaje: registro.fecha_viaje || "",
      comentarios_viaje: registro.comentarios || "",
    });
    setShowEditRegistroForm(true);
  };

  const guardarEdicionRegistro = async () => {
    if (
      !editingRegistro ||
      !editRegistroFormData.kilometraje_agregado ||
      !editRegistroFormData.tramo_recorrido ||
      !editRegistroFormData.fecha_viaje
    ) {
      toast({ title: "Por favor completa todos los campos obligatorios", variant: "destructive" });
      return;
    }

    try {
      const nuevoKilometrajeAgregado = Number.parseInt(
        editRegistroFormData.kilometraje_agregado
      );
      const diferencia =
        nuevoKilometrajeAgregado - editingRegistro.kilometraje_agregado;

      // Actualizar el registro
      const { error } = await supabase
        .from("registros_kilometraje")
        .update({
          kilometraje_agregado: nuevoKilometrajeAgregado,
          kilometraje_nuevo:
            editingRegistro.kilometraje_anterior + nuevoKilometrajeAgregado,
          tramo_recorrido: editRegistroFormData.tramo_recorrido,
          fecha_viaje: editRegistroFormData.fecha_viaje,
          comentarios: editRegistroFormData.comentarios_viaje,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRegistro.id);

      if (error) {
        toast({ title: "Error al actualizar registro", variant: "destructive" });
        return;
      }

      // Actualizar el kilometraje del camión
      if (camionDetalle && diferencia !== 0) {
        const nuevoKilometrajeTotal = camionDetalle.kilometraje + diferencia;

        await supabase
          .from("camiones")
          .update({
            kilometraje: Math.max(0, nuevoKilometrajeTotal),
            updated_at: new Date().toISOString(),
          })
          .eq("id", camionDetalle.id);
      }

  toast({ title: "Registro actualizado exitosamente", variant: "success" });
      setShowEditRegistroForm(false);
      setEditingRegistro(null);
      await cargarCamiones();
      if (camionDetalle) {
        await cargarHistorialKilometraje(camionDetalle.id);
      }
    } catch (error) {
      console.error("Error actualizando registro:", error);
      toast({ title: "Error al actualizar registro", variant: "destructive" });
    }
  };

  const cancelarEdicionRegistro = () => {
    setShowEditRegistroForm(false);
    setEditingRegistro(null);
    setEditRegistroFormData({
      kilometraje_agregado: "",
      tramo_recorrido: "",
      fecha_viaje: "",
      comentarios_viaje: "",
    });
  };

  const editarRegistroMantenimiento = (registro: any) => {
    setEditingRegistroMantenimiento(registro);
    setEditMantenimientoFormData({
      fecha_mantenimiento: registro.fecha_mantenimiento || "",
      tipo_mantenimiento: registro.tipo_mantenimiento || "",
      detalles_mantenimiento: registro.detalles_mantenimiento || "",
      proximo_mantenimiento: registro.proximo_mantenimiento || "",
    });
    setShowEditMantenimientoForm(true);
  };

  const guardarEdicionMantenimiento = async () => {
    if (
      !editingRegistroMantenimiento ||
      !editMantenimientoFormData.fecha_mantenimiento ||
      !editMantenimientoFormData.detalles_mantenimiento
    ) {
      toast({ title: "Por favor completa los campos obligatorios: fecha y detalles", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("registros_mantenimiento")
        .update({
          fecha_mantenimiento: editMantenimientoFormData.fecha_mantenimiento,
          tipo_mantenimiento: editMantenimientoFormData.tipo_mantenimiento,
          detalles_mantenimiento:
            editMantenimientoFormData.detalles_mantenimiento,
          proximo_mantenimiento:
            editMantenimientoFormData.proximo_mantenimiento,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRegistroMantenimiento.id);

      if (error) {
        toast({ title: "Error al actualizar registro de mantenimiento", variant: "destructive" });
        return;
      }

      toast({ title: "Registro de mantenimiento actualizado exitosamente", variant: "success" });
      setShowEditMantenimientoForm(false);
      setEditingRegistroMantenimiento(null);
      if (camionDetalle) {
        await cargarHistorialMantenimiento(camionDetalle.id);
      }
    } catch (error) {
      console.error("Error actualizando registro de mantenimiento:", error);
      toast({ title: "Error al actualizar registro de mantenimiento", variant: "destructive" });
    }
  };

  const cancelarEdicionMantenimiento = () => {
    setShowEditMantenimientoForm(false);
    setEditingRegistroMantenimiento(null);
    setEditMantenimientoFormData({
      fecha_mantenimiento: "",
      tipo_mantenimiento: "",
      detalles_mantenimiento: "",
      proximo_mantenimiento: "",
    });
  };

  const eliminarRegistroMantenimiento = async (registroId: string) => {
    try {
      const { error } = await supabase
        .from("registros_mantenimiento")
        .delete()
        .eq("id", registroId);

      if (error) {
        toast({ title: "Error al eliminar registro de mantenimiento", variant: "destructive" });
        return;
      }

      toast({ title: "Registro de mantenimiento eliminado exitosamente", variant: "success" });
      if (camionDetalle) {
        await cargarHistorialMantenimiento(camionDetalle.id);
      }
    } catch (error) {
      console.error("Error eliminando registro de mantenimiento:", error);
      toast({ title: "Error al eliminar registro de mantenimiento", variant: "destructive" });
    }
  };

  const todayLocalISODate = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Matamoros" });

  const seleccionarCamionKilometraje = (camion: Camion) => {
    setSelectedCamionKilometraje(camion);
    setKilometrajeFormData({
      kilometraje_actual: "",
      tramo_recorrido: "",
      fecha_viaje: todayLocalISODate(),
      comentarios_viaje: "",
    });
  };

  const verDetallesCamion = (camion: Camion) => {
    setCamionDetalle(camion);
    setActiveTab("informacion"); // Establecer pestaña inicial para detalles
    setShowDetallesCamion(true);
    cargarHistorialKilometraje(camion.id);
    cargarHistorialMantenimiento(camion.id);
  };

  const limpiarFormularioMantenimiento = () => {
    setMantenimientoFormData({
      fecha_mantenimiento: "",
      detalles_mantenimiento: "",
      proximo_mantenimiento: "",
      tipo_mantenimiento: "",
    });
    setSelectedCamionMantenimiento(null);
  };

  const guardarMantenimiento = async () => {
    if (
      !selectedCamionMantenimiento ||
      !mantenimientoFormData.fecha_mantenimiento ||
      !mantenimientoFormData.detalles_mantenimiento
    ) {
  toast({ title: "Por favor completa los campos obligatorios: fecha de mantenimiento y detalles", variant: "destructive" });
      return;
    }

    try {
      // Guardar registro de mantenimiento en la tabla si existe
      if (registrosMantenimientoTableExists) {
        // Normalizar campos y alinear con esquema de la tabla
        const fechaM = (mantenimientoFormData.fecha_mantenimiento || "").trim();
        const proxM = (mantenimientoFormData.proximo_mantenimiento || "").trim();
        const tipoM = (mantenimientoFormData.tipo_mantenimiento || "general").trim();
        const detalles = mantenimientoFormData.detalles_mantenimiento;

        const registroMantenimiento: any = {
          camion_id: selectedCamionMantenimiento.id,
          fecha_mantenimiento: fechaM || null, // DATE
          tipo_mantenimiento: tipoM,
          detalles_mantenimiento: detalles,
          proximo_mantenimiento: proxM || null, // DATE
          kilometraje_actual: selectedCamionMantenimiento.kilometraje,
        };

        const { error: errorMantenimiento } = await supabase
          .from("registros_mantenimiento")
          .insert(registroMantenimiento);

        if (errorMantenimiento) {
          console.error("Error guardando registro de mantenimiento:", errorMantenimiento);
          const msg = (errorMantenimiento as any)?.message || (errorMantenimiento as any)?.hint || JSON.stringify(errorMantenimiento);
          throw new Error(`Error guardando registro de mantenimiento: ${msg}`);
        }
      }

  limpiarFormularioMantenimiento();
  setShowMantenimientoForm(false);

      // Audit log: registro de mantenimiento
      try {
        if (selectedCamionMantenimiento) {
          agregarAuditLog(
            "CREAR",
            "Camiones",
            `Registró mantenimiento para camión ${selectedCamionMantenimiento.numero_economico} en ${mantenimientoFormData.fecha_mantenimiento} (${mantenimientoFormData.tipo_mantenimiento || 'general'})`
          );
        }
      } catch {}

      // Recargar historial de mantenimiento si estamos en la ventana de detalles
      if (
        camionDetalle &&
        camionDetalle.id === selectedCamionMantenimiento.id
      ) {
        await cargarHistorialMantenimiento(selectedCamionMantenimiento.id);
      }
    } catch (error:any) {
      console.error("Error guardando mantenimiento:", error);
      toast({ title: error?.message || "Error al guardar el mantenimiento", variant: "destructive" });
    }
  };

  const descargarExcelCamion = async (camion: Camion) => {
    if (!camion) {
      toast({ title: "No hay información del camión para descargar", variant: "destructive" });
      return;
    }

    // Helper: escape/serialize values for CSV cells
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "object") {
        try {
          return JSON.stringify(v).replace(/"/g, '""');
        } catch {
          return String(v).replace(/"/g, '""');
        }
      }
      return String(v).replace(/"/g, '""');
    };

    const csvLines: string[] = [];

    // 1) Basic, explicit camion information (prefer parsed values from observaciones)
    csvLines.push("INFORMACIÓN BÁSICA DEL CAMIÓN");
    csvLines.push("Campo,Valor");

    let obs: any = {};
    try {
  obs = camion.observaciones ? safeParseObservaciones(camion.observaciones as any) : {};
    } catch {
      obs = {};
    }

    // Query latest kilometraje record and latest maintenance for this camion to include summary info
    let latestTripDate = "";
    let latestTripKm: any = "";
    try {
      const { data: lastTrip } = await supabase
        .from("registros_kilometraje")
        .select("fecha_viaje, kilometraje_nuevo, kilometraje_agregado")
        .eq("camion_id", camion.id)
        .order("fecha_viaje", { ascending: false })
        .limit(1);
      if (lastTrip && lastTrip.length > 0) {
        latestTripDate = lastTrip[0].fecha_viaje || "";
        latestTripKm = lastTrip[0].kilometraje_nuevo ?? lastTrip[0].kilometraje_agregado ?? "";
      }
    } catch (e) {
      // ignore
    }

    let latestMantDate = "";
    try {
      const { data: lastMant } = await supabase
        .from("registros_mantenimiento")
        .select("fecha_mantenimiento")
        .eq("camion_id", camion.id)
        .order("fecha_mantenimiento", { ascending: false })
        .limit(1);
      if (lastMant && lastMant.length > 0) {
        latestMantDate = lastMant[0].fecha_mantenimiento || "";
      }
    } catch (e) {
      // ignore
    }

    const basicRows: Array<[string, string]> = [
      ["Número Económico", camion.numero_economico || "No especificado"],
      ["Marca", camion.marca || "No especificado"],
      ["Modelo", camion.modelo || "No especificado"],
      // Preferir el campo explícito año, si no usar observaciones
  ["Año", camion.año ? String(camion.año) : (obs.año ? String(obs.año) : "No especificado")],
      ["Placas", camion.placas || "No especificado"],
      // Kilometraje actual formateado para lectura humana
      ["Kilometraje actual", camion.kilometraje != null ? (typeof camion.kilometraje === 'number' ? `${camion.kilometraje.toLocaleString('es-MX')} km` : String(camion.kilometraje)) : "No registrado"],
      ["Número de serie", obs.numero_serie || obs.numeroSerie || "No especificado"],
      ["Último viaje - Fecha", latestTripDate ? new Date(latestTripDate).toLocaleDateString('es-MX') : "No registrado"],
      ["Último viaje - Kilometraje", latestTripKm ? (typeof latestTripKm === 'number' ? `${latestTripKm.toLocaleString('es-MX')} km` : String(latestTripKm)) : "No registrado"],
      ["Último mantenimiento - Fecha", latestMantDate ? new Date(latestMantDate).toLocaleDateString('es-MX') : "No registrado"],
      ["Comentarios", obs.comentarios || ""],
    ];

    for (const r of basicRows) {
      csvLines.push(`"${r[0]}","${esc(r[1])}"`);
    }

    // 2) Query and export related tables fully (all columns for each record)
    const relatedTables: { label: string; table: string; fk: string }[] = [
      { label: "REGISTROS_KILOMETRAJE", table: "registros_kilometraje", fk: "camion_id" },
      { label: "REGISTROS_MANTENIMIENTO", table: "registros_mantenimiento", fk: "camion_id" },
      { label: "RECORDATORIOS", table: "recordatorios", fk: "camion_id" },
      { label: "EMBARQUES", table: "embarques", fk: "camion_id" },
      // NOTE: 'viajes' intentionally omitted from exports per request
    ];

    // Helper: collect any comment-like fields from a row into a single string
    const gatherComments = (row: any) => {
      if (!row) return "";
      const candidates = [
        row.comentarios,
        row.comentarios_viaje,
        row.descripcion,
        row.notas,
        row.detalles_mantenimiento,
        row.detalles,
        row.observaciones,
      ];
      return candidates.filter(Boolean).map((c: any) => String(c)).join(' | ');
    };

    for (const rel of relatedTables) {
      csvLines.push(""); // blank line for separation
      csvLines.push(rel.label);
      try {
        const { data, error } = await supabase.from(rel.table).select("*").eq(rel.fk, camion.id);
        if (error) {
          // Skip emitting error rows in CSV; continue to next related table
          continue;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          csvLines.push("No hay registros");
          continue;
        }

        // Special-case friendly exports for kilometraje and mantenimiento
        if (rel.table === "registros_kilometraje") {
          // Columns: Fecha (+km agregado), Kilometraje anterior, Kilometraje nuevo, Tramo recorrido, Comentarios
          csvLines.push(["Fecha (km+)", "Kilometraje anterior", "Kilometraje nuevo", "Tramo recorrido", "Comentarios"].map(h => `"${h}"`).join(","));
          (data as any[]).forEach((row) => {
            const fechaRaw = row?.fecha_viaje || row?.fecha_registro || "";
            const fecha = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-MX') : "";

            const kmAgregadoRaw = row?.kilometraje_agregado != null ? Number(row.kilometraje_agregado) : null;
            const kmAgregadoDisplay = kmAgregadoRaw != null ? `(+${kmAgregadoRaw.toLocaleString('es-MX')} km)` : "";

            // Mostrar fecha y el +km en la primera columna tal como pediste
            const fechaYKm = `${fecha}${kmAgregadoDisplay ? ` ${kmAgregadoDisplay}` : ""}`.trim();

            const kmAnteriorRaw = row?.kilometraje_anterior != null ? Number(row.kilometraje_anterior) : null;
            const kmAnterior = kmAnteriorRaw != null ? `${kmAnteriorRaw.toLocaleString('es-MX')} km` : "";

            const kmNuevoRaw = row?.kilometraje_nuevo != null ? Number(row.kilometraje_nuevo) : null;
            const kmNuevo = kmNuevoRaw != null ? `${kmNuevoRaw.toLocaleString('es-MX')} km` : "";

            const tramo = row?.tramo_recorrido || row?.tramo || "";
            const comentarios = gatherComments(row);

            csvLines.push([esc(fechaYKm), esc(kmAnterior), esc(kmNuevo), esc(tramo), esc(comentarios)].map(v => `"${v}"`).join(","));
          });
          continue;
        }

        if (rel.table === "registros_mantenimiento") {
          // Columns: Fecha, Tipo, Detalles, Próximo mantenimiento, Kilometraje actual, Comentarios, Proveedor (if any)
          csvLines.push(["Fecha", "Tipo", "Detalles", "Próximo mantenimiento", "Kilometraje actual", "Comentarios", "Proveedor"].map(h => `"${h}"`).join(","));
          (data as any[]).forEach((row) => {
            const fecha = row?.fecha_mantenimiento ? new Date(row.fecha_mantenimiento).toLocaleDateString('es-MX') : "";
            const tipo = row?.tipo_mantenimiento || "";
            const detalles = row?.detalles_mantenimiento || row?.detalles || "";
            const prox = row?.proximo_mantenimiento ? new Date(row.proximo_mantenimiento).toLocaleDateString('es-MX') : "";
            const kmActual = row?.kilometraje_actual != null ? `${Number(row.kilometraje_actual).toLocaleString('es-MX')} km` : "";
            const comentarios = gatherComments(row);
            const proveedor = row?.proveedor || row?.taller || "";
            csvLines.push([esc(fecha), esc(tipo), esc(detalles), esc(prox), esc(kmActual), esc(comentarios), esc(proveedor)].map(v => `"${v}"`).join(","));
          });
          continue;
        }

        // Generic fallback: Build union of all keys across rows to ensure no field is omitted
        const allKeys = new Set<string>();
        (data as any[]).forEach((row) => Object.keys(row || {}).forEach((k) => allKeys.add(k)));
        const headers = Array.from(allKeys);

        // Resolve *_id fields to human-readable values to avoid exposing raw IDs
        const idFieldMap: Record<string, Record<string, string>> = {};
        const idFields = headers.filter((h) => /_id$/.test(h) || ['representante_cliente', 'info_representante'].includes(h));
        if (idFields.length > 0) {
          for (const f of idFields) {
            try {
              const ids = Array.from(new Set((data as any[]).map((r) => (r ? r[f] : null)).filter(Boolean)));
              if (ids.length === 0) {
                idFieldMap[f] = {};
                continue;
              }

              let tableName = "";
              if (f === 'cliente_id') tableName = 'clientes';
              else if (f === 'operador_id') tableName = 'operadores';
              else if (f === 'camion_id') tableName = 'camiones';
              else if (f === 'remolque_id') tableName = 'remolques';
              else if (f === 'tipo_servicio_id') tableName = 'tipos_servicio';
              else if (f === 'representante_cliente' || f === 'representante_cliente_id') tableName = 'representantes_clientes';
              else tableName = f.replace(/_id$/, 's');

              const { data: ref, error: refErr } = await supabase.from(tableName).select('*').in('id', ids as any);
              const map: Record<string, string> = {};
              if (!refErr && ref) {
                ref.forEach((r: any) => {
                  let disp = '';
                  if (tableName === 'clientes') disp = `${r.nombre || ''}${r.empresa ? ` (${r.empresa})` : ''}`.trim() || r.id;
                  else if (tableName === 'operadores') disp = `${r.nombre || ''} ${r.apellidos || ''}`.trim() || r.id;
                  else if (tableName === 'camiones' || tableName === 'remolques') disp = r.numero_economico || r.numero_serie || r.id;
                  else if (tableName === 'tipos_servicio') disp = r.nombre || r.id;
                  else if (tableName === 'representantes_clientes') disp = `${r.nombre || ''} ${r.apellidos || ''}`.trim() || r.id;
                  else disp = r.nombre || r.id;
                  map[String(r.id)] = disp;
                });
              }
              idFieldMap[f] = map;
            } catch (e) {
              console.warn('Error resolving ids for', f, e);
              idFieldMap[f] = {};
            }
          }
        }

        // Special friendly export for recordatorios: Fecha, Tipo, Kilometraje asociado, Notas
        if (rel.table === "recordatorios") {
          csvLines.push(["Fecha", "Tipo", "Kilometraje asociado", "Notas", "Comentarios"].map(h => `"${h}"`).join(","));
          (data as any[]).forEach((row) => {
            const fecha = row?.fecha_vencimiento ? new Date(row.fecha_vencimiento).toLocaleDateString('es-MX') : (row?.fecha ? new Date(row.fecha).toLocaleDateString('es-MX') : "");
            const tipo = row?.tipo || row?.categoria || row?.nombre || "";
            const km = row?.kilometraje != null ? (typeof row.kilometraje === 'number' ? row.kilometraje.toLocaleString('es-MX') : String(row.kilometraje)) : (row?.km != null ? String(row.km) : "");
            const notas = row?.notas || row?.descripcion || row?.comentarios || "";
            const comentarios = gatherComments(row);
            csvLines.push([esc(fecha), esc(tipo), esc(km), esc(notas), esc(comentarios)].map(v => `"${v}"`).join(","));
          });
        } else {
          // Header row
          csvLines.push(headers.map((h) => `"${h}"`).join(","));

          // Data rows (+ append combined Comentarios column)
          (data as any[]).forEach((row) => {
            const cells = headers.map((h) => {
              let v = row ? row[h] : undefined;
              // Resolve id fields to friendly display values when we have mappings
              if (v && idFieldMap[h]) {
                v = idFieldMap[h][String(v)] || String(v);
              }
              // Format date-like fields
              if (v && /fecha|fecha_creacion|fecha_registro|fecha_vencimiento|fecha_mantenimiento|fecha_viaje/i.test(h)) {
                try {
                  v = new Date(v).toLocaleDateString('es-MX');
                } catch {}
              }
              return `"${esc(v)}"`;
            });
            // Add combined comments column
            cells.push(`"${esc(gatherComments(row))}"`);
            csvLines.push(cells.join(","));
          });
        }
        
      } catch (err: any) {
        // Do not emit error rows into CSV; just log and continue
        console.error('Error exporting related table', rel.table, err);
        continue;
      }
    }

    // 3) Create and download CSV
    try {
      const blob = new Blob(["\ufeff" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `camion_${camion.numero_economico || camion.id}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error creando o descargando CSV:", err);
      toast({ title: "Ocurrió un error al generar el archivo CSV", variant: "destructive" });
    }

    // Audit log: exportación de camión individual
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Camiones",
        `Descargó reporte completo del camión ${camion.numero_economico} (ID: ${camion.id})`
      );
    } catch {}
  };

  // Forzar recompilación: control de estado de carga
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando camiones...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Tractocamiones
            </h1>
            <p className="text-gray-600 mt-2">Administrar flota de camiones</p>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2 hidden sm:inline">Ver por fila:</span>
              <Select
                value={String(cardsPerRow)}
                onValueChange={(v) => setCardsPerRow(Math.max(2, Math.min(6, Number.parseInt(v, 10) || 3)))}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 por fila</SelectItem>
                  <SelectItem value="3">3 por fila</SelectItem>
                  <SelectItem value="4">4 por fila</SelectItem>
                  <SelectItem value="5">5 por fila</SelectItem>
                  <SelectItem value="6">6 por fila</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={descargarExcel}
              disabled={camiones.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Reporte
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMarcasForm(true)}
              disabled={!marcasTableExists}
              title={
                !marcasTableExists
                  ? "Ejecuta el script de migración para habilitar esta función"
                  : ""
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Gestionar Marcas
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => limpiarFormulario()}
                  className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Camión
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCamion ? "Editar Camión" : "Nuevo Camión"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa la información del camión
                  </DialogDescription>
                </DialogHeader>

                <div className="w-full">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("basica")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "basica"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Información Básica
                      </button>
                      <button
                        onClick={() => setActiveTab("documentos")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "documentos"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Documentos y Verificaciones
                      </button>
                      <button
                        onClick={() => setActiveTab("tags")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "tags"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Tags y Números
                      </button>
                      <button
                        onClick={() => setActiveTab("comentarios")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "comentarios"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Comentarios
                      </button>
                    </nav>
                  </div>

                  <div className="mt-6">
                    {activeTab === "basica" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="numero_economico">
                              Número Económico *
                            </Label>
                            <Input
                              id="numero_economico"
                              value={formData.numero_economico}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  numero_economico: e.target.value,
                                })
                              }
                              placeholder="Ej: CAM001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="marca">Marca *</Label>
                            <Select
                              value={formData.marca}
                              onValueChange={(value) =>
                                setFormData({ ...formData, marca: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar marca" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMarcasDisponibles().map((marca) => (
                                  <SelectItem key={marca} value={marca}>
                                    {marca}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="modelo">Modelo *</Label>
                            <Input
                              id="modelo"
                              value={formData.modelo}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  modelo: e.target.value,
                                })
                              }
                              placeholder="Ej: T680"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="año">Año</Label>
                            <Input
                              id="año"
                              type="number"
                              min="1990"
                              max="2030"
                              value={formData.año}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  año: e.target.value,
                                })
                              }
                              placeholder="Ej: 2020"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="numero_serie">
                              Número de Serie
                            </Label>
                            <Input
                              id="numero_serie"
                              value={formData.numero_serie}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  numero_serie: e.target.value,
                                })
                              }
                              placeholder="Número de serie del vehículo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="placas">Placas</Label>
                            <Input
                              id="placas"
                              value={formData.placas}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  placas: e.target.value,
                                })
                              }
                              placeholder="Ej: ABC-123-D"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="kilometraje">
                              Kilometraje Inicial {!editingCamion && "*"}
                              {editingCamion && (
                                <span className="text-red-600 text-xs ml-2">
                                  (No editable al editar)
                                </span>
                              )}
                            </Label>
                            <Input
                              id="kilometraje"
                              type="number"
                              min="0"
                              value={formData.kilometraje}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  kilometraje: e.target.value,
                                })
                              }
                              placeholder={
                                editingCamion
                                  ? "Kilometraje actual del camión"
                                  : "Kilometraje inicial del camión (opcional)"
                              }
                              disabled={Boolean(editingCamion)}
                              className={editingCamion ? "bg-gray-100 cursor-not-allowed" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <Select
                              value={formData.estado}
                              onValueChange={(value) =>
                                setFormData({ ...formData, estado: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="disponible">Disponible</SelectItem>
                                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                                <SelectItem value="fuera-de-servicio">Fuera de Servicio</SelectItem>
                                <SelectItem value="vendido">Vendido</SelectItem>
                                <SelectItem value="siniestrado">Siniestrado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "documentos" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-900">
                            Verificación y Mantenimiento
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="ultima_verificacion">
                                Última Verificación
                              </Label>
                              <Input
                                id="ultima_verificacion"
                                type="date"
                                value={formData.ultima_verificacion}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    ultima_verificacion: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="proxima_verificacion">
                                Próxima Verificación
                              </Label>
                              <Input
                                id="proxima_verificacion"
                                type="date"
                                value={formData.frecuencia_verificacion}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    frecuencia_verificacion: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-900">
                            Información del Seguro Mexicano
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="poliza_seguro_mexicano">
                                Póliza de Seguro Mexicano
                              </Label>
                              <Input
                                id="poliza_seguro_mexicano"
                                value={formData.poliza_seguro_mexicano}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    poliza_seguro_mexicano: e.target.value,
                                  })
                                }
                                placeholder="Número de póliza mexicana"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fecha_vencimiento_seguro_mexicano">
                                Fecha de Vencimiento del Seguro Mexicano
                              </Label>
                              <Input
                                id="fecha_vencimiento_seguro_mexicano"
                                type="date"
                                value={
                                  formData.fecha_vencimiento_seguro_mexicano
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    fecha_vencimiento_seguro_mexicano:
                                      e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-900">
                            Información del Seguro Americano
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="poliza_seguro_americano">
                                Póliza de Seguro Americano
                              </Label>
                              <Input
                                id="poliza_seguro_americano"
                                value={formData.poliza_seguro_americano}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    poliza_seguro_americano: e.target.value,
                                  })
                                }
                                placeholder="Número de póliza americana"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fecha_vencimiento_seguro_americano">
                                Fecha de Vencimiento del Seguro Americano
                              </Label>
                              <Input
                                id="fecha_vencimiento_seguro_americano"
                                type="date"
                                value={
                                  formData.fecha_vencimiento_seguro_americano
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    fecha_vencimiento_seguro_americano:
                                      e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "tags" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-900">
                            Tags y Números de Identificación
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="tag_americano">
                                Número de Tag Americano
                              </Label>
                              <Input
                                id="tag_americano"
                                value={formData.tag_americano}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    tag_americano: e.target.value,
                                  })
                                }
                                placeholder="Ej: USA123456"
                                maxLength={20}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="tag_mexicano">
                                Número de Tag Mexicano
                              </Label>
                              <Input
                                id="tag_mexicano"
                                value={formData.tag_mexicano}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    tag_mexicano: e.target.value,
                                  })
                                }
                                placeholder="Ej: MEX789012"
                                maxLength={20}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="numero_base">
                                Número de Base
                              </Label>
                              <Input
                                id="numero_base"
                                value={formData.numero_base}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    numero_base: e.target.value,
                                  })
                                }
                                placeholder="Ej: BASE001"
                                maxLength={20}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-gray-900">
                              Números Adicionales con Vencimiento
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (formData.numeros_adicionales.length < 5) {
                                  setFormData({
                                    ...formData,
                                    numeros_adicionales: [
                                      ...formData.numeros_adicionales,
                                      {
                                        nombre: "",
                                        numero: "",
                                        fecha_vencimiento: "",
                                      },
                                    ],
                                  });
                                }
                              }}
                              disabled={
                                formData.numeros_adicionales.length >= 5
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar Número (
                              {formData.numeros_adicionales.length}/5)
                            </Button>
                          </div>

                          {formData.numeros_adicionales.length > 0 && (
                            <div className="space-y-3">
                              {formData.numeros_adicionales.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50"
                                  >
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`nombre_adicional_${index}`}
                                      >
                                        Nombre del Documento *
                                      </Label>
                                      <Input
                                        id={`nombre_adicional_${index}`}
                                        value={item.nombre}
                                        onChange={(e) => {
                                          const nuevosNumeros = [
                                            ...formData.numeros_adicionales,
                                          ];
                                          nuevosNumeros[index].nombre =
                                            e.target.value;
                                          setFormData({
                                            ...formData,
                                            numeros_adicionales: nuevosNumeros,
                                          });
                                        }}
                                        placeholder="Ej: Permiso SCT, Licencia Federal"
                                        maxLength={50}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`numero_adicional_${index}`}
                                      >
                                        Número *
                                      </Label>
                                      <Input
                                        id={`numero_adicional_${index}`}
                                        value={item.numero}
                                        onChange={(e) => {
                                          const nuevosNumeros = [
                                            ...formData.numeros_adicionales,
                                          ];
                                          nuevosNumeros[index].numero =
                                            e.target.value;
                                          setFormData({
                                            ...formData,
                                            numeros_adicionales: nuevosNumeros,
                                          });
                                        }}
                                        placeholder="Ej: SCT123456"
                                        maxLength={30}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`fecha_vencimiento_${index}`}
                                      >
                                        Fecha de Vencimiento
                                      </Label>
                                      <Input
                                        id={`fecha_vencimiento_${index}`}
                                        type="date"
                                        value={item.fecha_vencimiento}
                                        onChange={(e) => {
                                          const nuevosNumeros = [
                                            ...formData.numeros_adicionales,
                                          ];
                                          nuevosNumeros[
                                            index
                                          ].fecha_vencimiento = e.target.value;
                                          setFormData({
                                            ...formData,
                                            numeros_adicionales: nuevosNumeros,
                                          });
                                        }}
                                        min={
                                          new Date().toISOString().split("T")[0]
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Acciones</Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const nuevosNumeros =
                                            formData.numeros_adicionales.filter(
                                              (_, i) => i !== index
                                            );
                                          setFormData({
                                            ...formData,
                                            numeros_adicionales: nuevosNumeros,
                                          });
                                        }}
                                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {formData.numeros_adicionales.length === 0 && (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                              <p>No hay números adicionales registrados</p>
                              <p className="text-sm mt-1">
                                Haz clic en "Agregar Número" para añadir
                                documentos con fecha de vencimiento
                              </p>
                            </div>
                          )}

                          {formData.numeros_adicionales.length >= 5 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-sm text-yellow-800">
                                <strong>Límite alcanzado:</strong> Se pueden
                                registrar máximo 5 números adicionales.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "comentarios" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="comentarios">
                            Comentarios Adicionales
                          </Label>
                          <Textarea
                            id="comentarios"
                            value={formData.comentarios}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                comentarios: e.target.value,
                              })
                            }
                            placeholder="Comentarios adicionales sobre el camión..."
                            rows={6}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 mt-8 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => { setShowForm(false); setActiveTab("informacion"); }}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={guardarCamion}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : editingCamion ? (
                        "Actualizar Camión"
                      ) : (
                        "Guardar Camión"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Modal de confirmación para marcar como fuera-de-servicio / reactivar */}
        <Dialog open={confirmEstadoCamionOpen} onOpenChange={(o)=>{setConfirmEstadoCamionOpen(o); if(!o) setConfirmEstadoCamionId(null);}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                { /* Si el camion ya está fuera-de-servicio, el texto debería indicar reactivar; de lo contrario, marcar como fuera-de-servicio */ }
                Confirmar acción
              </DialogTitle>
              <DialogDescription>
                Antes de eliminar una unidad, debes marcarla como "Fuera de Servicio". ¿Deseas marcar esta unidad como Fuera de Servicio ahora?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setConfirmEstadoCamionOpen(false); setConfirmEstadoCamionId(null); }}>Cancelar</Button>
              <Button
                className="bg-[#16A34A] hover:bg-[#12813a] text-white"
                onClick={async () => {
                  if (!confirmEstadoCamionId) return;
                  setConfirmEstadoCamionOpen(false);
                  const id = confirmEstadoCamionId;
                  setConfirmEstadoCamionId(null);
                  await cambiarEstadoFueraServicio(id);
                }}
              >
                Marcar como Fuera de Servicio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Notificación pop-up para reactivar/activar unidades (reemplaza alert) */}
        <Dialog open={notificationOpen} onOpenChange={(o)=>{setNotificationOpen(o); if(!o) setNotificationMessage("");}}>
          {/* Hacer modal un poco más ancho y aplicar tono de advertencia cuando el mensaje indica que no se puede eliminar por embarques asociados */}
          <DialogContent className={
            notificationMessage && notificationMessage.includes("No es posible eliminar el camión")
              ? "max-w-md bg-red-50 border border-red-200"
              : "max-w-sm"
          }>
            <DialogHeader>
              {notificationMessage && notificationMessage.includes("No es posible eliminar el camión") ? (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <DialogTitle>Aviso</DialogTitle>
                </div>
              ) : (
                <DialogTitle>Notificación</DialogTitle>
              )}
              <DialogDescription className={notificationMessage && notificationMessage.includes("No es posible eliminar el camión") ? "text-red-700" : undefined}>
                {notificationMessage}
              </DialogDescription>
              {notificationFolios && notificationFolios.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700">Embarques asociados:</p>
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                    {notificationFolios.map((f, idx) => (
                      <li key={idx} className="break-all">{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button
                onClick={()=>setNotificationOpen(false)}
                className={
                  notificationMessage && notificationMessage.includes("reactivado") || notificationMessage && notificationMessage.includes("marcado como fuera de servicio")
                    ? "bg-[#16A34A] hover:bg-[#12813a] text-white"
                    : notificationMessage && notificationMessage.includes("No es posible eliminar el camión")
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : undefined
                }
              >
                Aceptar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Alerta si la tabla de marcas no existe */}
        {!marcasTableExists && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Tabla de marcas no encontrada</p>
                  <p className="text-sm">
                    Se están usando marcas por defecto. Ejecuta el script de
                    migración para habilitar la gestión de marcas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tractocamiones
                  </p>
                  <p className="text-2xl font-bold">{camiones.length}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disponibles</p>
                  <p className="text-2xl font-bold text-green-600">
                    {camiones.filter((c) => c.estado === "disponible").length}
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
                  <p className="text-sm font-medium text-gray-600">
                    Fuera de Servicio
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {camiones.filter((c) => c.estado === "fuera-de-servicio").length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Seguros por Vencer</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(() => {
                      let segurosVenciendo = 0;
                      camiones.forEach((camion) => {
                        if (camion.observaciones) {
                          try {
                            const datos = safeParseObservaciones(camion.observaciones);
                            const hoy = new Date();

                            if (datos.fecha_vencimiento_seguro_mexicano) {
                              const fechaVencimiento = new Date(datos.fecha_vencimiento_seguro_mexicano);
                              const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                              if (diasRestantes <= 30) segurosVenciendo++;
                            }

                            if (datos.fecha_vencimiento_seguro_americano) {
                              const fechaVencimiento = new Date(datos.fecha_vencimiento_seguro_americano);
                              const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                              if (diasRestantes <= 30) segurosVenciendo++;
                            }
                          } catch (error) {
                            // Ignorar errores de parsing
                          }
                        }
                      });
                      return segurosVenciendo;
                    })()}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Seguros próximos (15 días)</p>
                  <div className="flex items-center space-x-6 mt-2">
                    {(() => {
                      let mex = 0;
                      let usa = 0;
                      const hoy = new Date();
                      camiones.forEach((camion) => {
                        if (!camion.observaciones) return;
                        try {
                          const datos = safeParseObservaciones(camion.observaciones);
                          if (datos.fecha_vencimiento_seguro_mexicano) {
                            const f = new Date(datos.fecha_vencimiento_seguro_mexicano);
                            const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                            if (diff <= 15 && diff >= 0) mex++;
                          }
                          if (datos.fecha_vencimiento_seguro_americano) {
                            const f2 = new Date(datos.fecha_vencimiento_seguro_americano);
                            const diff2 = Math.ceil((f2.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                            if (diff2 <= 15 && diff2 >= 0) usa++;
                          }
                        } catch (e) {
                          // ignore parse errors
                        }
                      });
                      return (
                        <>
                          <div className="flex flex-col items-start">
                            <span className="text-sm text-gray-500">México</span>
                            <span className="text-2xl font-bold text-orange-600">{mex}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-500">USA</span>
                            <span className="text-2xl font-bold text-orange-600">{usa}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* icon removed per request */}
                <div />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número económico, marca, modelo o placas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-[28rem]"
                />
              </div>
              {totalItems > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-700">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </Button>
                  <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Por página:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        const newSize = Number.parseInt(v, 10);
                        setPageSize(newSize);
                        setPage(1);
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
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de camiones */}
        <div
          className="gap-6"
          style={
            isMobile
              ? { display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }
              : { display: 'grid', gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))`, gap: '1.5rem' }
          }
        >
          {camionesPaginados.map((camion) => {
            const alertas = verificarVencimientos(camion);
            let datosAdicionales = {
              poliza_seguro: "",
              fecha_vencimiento_seguro: "",
              comentarios: "",
            };

            if (camion.observaciones) {
              try {
                datosAdicionales = {
                  ...datosAdicionales,
                  ...safeParseObservaciones(camion.observaciones),
                };
              } catch (error) {
                // Ignorar errores de parsing
              }
            }

            return (
              <Card key={camion.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {camion.numero_economico}
                      </CardTitle>
                      <CardDescription>
                        {camion.marca} {camion.modelo}{" "}
                        {camion.año && `(${camion.año})`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getEstadoBadge(camion.estado)}
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verDetallesCamion(camion)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmEstadoCamionId(camion.id);
                            setConfirmEstadoCamionOpen(true);
                          }}
                          className={
                            camion.estado === "fuera-de-servicio"
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          }
                          title={
                            camion.estado === "fuera-de-servicio"
                              ? "Reactivar unidad"
                              : "Marcar como fuera de servicio"
                          }
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        {camion.estado === "fuera-de-servicio" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar camión?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará
                                  permanentemente el camión y todos sus
                                  recordatorios asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => eliminarCamion(camion.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setConfirmEstadoCamionId(camion.id);
                              setConfirmEstadoCamionOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {alertas.length > 0 && (
                    <div className="space-y-2">
                      {alertas.map((alerta, index) => (
                        <div
                          key={index}
                          className={`flex items-start justify-between p-3 rounded-lg border ${
                            alerta.vencido
                              ? "bg-red-50 border-red-200 text-red-800"
                              : "bg-yellow-50 border-yellow-200 text-yellow-800"
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <AlertTriangle
                              className={`h-4 w-4 mt-0.5 ${
                                alerta.vencido
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {alerta.tipo === "seguro_mexicano"
                                  ? "🛡️ Seguro MX"
                                  : alerta.tipo === "seguro_americano"
                                  ? "🇺🇸 Seguro US"
                                  : alerta.tipo === "seguro"
                                  ? "🛡️ Seguro"
                                  : "🔍 Verificación"}
                              </p>
                              <p className="text-xs">
                                {alerta.vencido ? "Vencido el" : "Vence el"}:{" "}
                                {alerta.fecha}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                alerta.vencido
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {alerta.vencido
                                ? `${alerta.dias} días vencido`
                                : `${alerta.dias} días restantes`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {camion.placas && (
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Placas:</span>
                        <span>{camion.placas}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <Gauge className="h-4 w-4 text-gray-400" />
                      <span>{camion.kilometraje.toLocaleString('es-MX')} km</span>
                    </div>
                    {datosAdicionales.poliza_seguro && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span>Seguro: {datosAdicionales.poliza_seguro}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        Registrado:{" "}
                        {new Date(camion.fecha_registro).toLocaleDateString()}
                      </span>
                    </div>
                    {datosAdicionales.comentarios && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Comentarios:</span>
                        <p className="mt-1">{datosAdicionales.comentarios}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Controles de paginación */}
        {totalItems > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Por página:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    const newSize = Number.parseInt(v, 10);
                    setPageSize(newSize);
                    setPage(1);
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
              </div>
            </div>
          </div>
        )}

        {camionesFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron camiones</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Diálogo de Gestión de Marcas */}
        {marcasTableExists && (
          <Dialog open={showMarcasForm} onOpenChange={setShowMarcasForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestión de Marcas de Camiones</DialogTitle>
                <DialogDescription>
                  Administrar marcas disponibles para los camiones
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Formulario para nueva marca */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {editingMarca ? "Editar Marca" : "Nueva Marca"}
                  </h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Nombre de la marca"
                      value={marcaFormData.nombre}
                      onChange={(e) =>
                        setMarcaFormData({ nombre: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={guardarMarca}
                      className={
                        editingMarca
                          ? undefined
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }
                    >
                      {editingMarca ? "Actualizar" : "Agregar"}
                    </Button>
                    {editingMarca && (
                      <Button
                        variant="outline"
                        onClick={limpiarFormularioMarca}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Lista de marcas con scroll vertical y paginación */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Marcas Registradas</h3>
                    <div className="flex items-center space-x-2">
                      <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                        <span>Por página</span>
                        <Select value={String(marcaPageSize)} onValueChange={(v)=>{ setMarcaPageSize(Number.parseInt(v,10)); setMarcaPage(1); }}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="18">18</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="48">48</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={()=>setMarcaPage(Math.max(1, marcaPage-1))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-gray-700 px-2">{marcaPage}</div>
                        <Button variant="ghost" size="icon" onClick={()=>{
                          const maxPage = Math.max(1, Math.ceil((marcas.length||0)/marcaPageSize));
                          setMarcaPage(Math.min(maxPage, marcaPage+1));
                        }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {loadingMarcas ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando marcas...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="max-h-[52vh] overflow-y-auto pr-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {marcas.slice((marcaPage-1)*marcaPageSize, (marcaPage)*marcaPageSize).map((marca) => (
                              <div key={marca.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="font-medium">{marca.nombre}</span>
                                <div className="flex space-x-1">
                                  <Button variant="outline" size="sm" onClick={() => editarMarca(marca)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar marca?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no afectará los camiones ya registrados. Si la marca está en uso, se marcará como inactiva.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => eliminarMarca(marca.id)}>
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {marcas.length === 0 && !loadingMarcas && (
                    <p className="text-center text-gray-500 py-4">No hay marcas registradas</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowMarcasForm(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Diálogo de Detalles del Camión */}
        <Dialog open={showDetallesCamion} onOpenChange={setShowDetallesCamion}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-2xl font-bold">
                <Truck className="h-6 w-6" />
                <span>
                  Detalles del Camión:{" "}
                  <span className="font-bold">
                    {camionDetalle?.numero_economico}
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription>
                Información completa é historial del camión
              </DialogDescription>
            </DialogHeader>

            {camionDetalle && (
              <div className="w-full">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab("informacion")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "informacion"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Información General
                    </button>
                    <button
                      onClick={() => setActiveTab("datos-control")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "datos-control"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Datos Control
                    </button>
                    <button
                      onClick={() => setActiveTab("documentos-detalle")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "documentos-detalle"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Documentos y Seguros
                    </button>
                    <button
                      onClick={() => setActiveTab("kilometraje")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "kilometraje"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Kilometraje
                    </button>
                    <button
                      onClick={() => setActiveTab("mantenimiento")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "mantenimiento"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Mantenimiento
                    </button>
                    <button
                      onClick={() => setActiveTab("fechas-control")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "fechas-control"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Fechas Control
                    </button>
                    <button
                      onClick={() => setActiveTab("comentarios-detalle")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "comentarios-detalle"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Comentarios
                    </button>
                  </nav>
                </div>

                <div className="mt-6">
                  {activeTab === "informacion" && (
                    <div className="space-y-8">
                      {/* Fila 1: Información básica + Kilometraje */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            <span>Información Básica</span>
                          </h3>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div>
                                <span className="font-medium text-gray-600">
                                  Número Económico:
                                </span>
            <p className="font-semibold">
                                  {camionDetalle.numero_economico}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Marca:</span>
                                <p>{camionDetalle.marca || "No especificado"}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Modelo:</span>
                                <p>{camionDetalle.modelo || "No especificado"}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="font-medium text-gray-600">Año:</span>
                                <p>{camionDetalle.año || "No especificado"}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Placas:</span>
                                <p>{camionDetalle.placas || "No especificado"}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Estado:</span>
                                <div className="mt-1">{getEstadoBadge(camionDetalle.estado)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="sr-only">
                            <Gauge className="h-5 w-5" />
                            <span>Kilometraje</span>
                          </h3>
                          <div className="mt-3 text-center">
                            <span className="font-medium text-gray-600 block mb-1">Kilometraje Actual:</span>
                            <p className="text-3xl font-bold text-blue-600">
                              {camionDetalle.kilometraje.toLocaleString('es-MX')}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => {
                                seleccionarCamionKilometraje(camionDetalle);
                                setShowKilometrajeForm(true);
                              }}
                              className="mt-3 bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold mx-auto"
                              disabled={!registrosKilometrajeTableExists}
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Registrar Kilometraje
                            </Button>
                            <p className="text-sm text-gray-500 mt-2">kilómetros</p>
                          </div>
                        </div>
                      </section>

                      {/* Fila 2: Fechas importantes - ocultada, ahora en pestaña 'Fechas Control' */}

                      {/* Fila 3: Datos adicionales */}
                      {(() => {
                        let datosAdicionales: any = {};
                        if (camionDetalle.observaciones) {
                          try {
                            datosAdicionales = safeParseObservaciones(camionDetalle.observaciones);
                          } catch (error) {
                            console.error("Error parsing observaciones:", error);
                          }
                        }

                        return (
                          <div className="space-y-6">
                            {/* Sección de números movida a pestaña Datos Control */}
                          </div>
                        );
                      })()}

                      {/* Fila 4: Acciones rápidas */}
                      <section>
                        <h3 className="text-sm font-semibold text-gray-900">Acciones Rápidas</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            onClick={() => poblarFormularioParaEdicion(camionDetalle)}
                            className="flex items-center space-x-2 bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Editar Información</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => descargarExcelCamion(camionDetalle)}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Descargar Reporte</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => cambiarEstadoFueraServicio(camionDetalle.id)}
                            className={`flex items-center space-x-2 ${
                              camionDetalle.estado === "fuera-de-servicio"
                                ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                : "text-red-600 hover:text-red-700 hover:bg-red-50"
                            }`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span>
                              {camionDetalle.estado === "fuera-de-servicio"
                                ? "Reactivar Unidad"
                                : "Fuera de Servicio"}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDetallesCamion(false)}
                            className="flex items-center space-x-2 ml-auto"
                          >
                            <span>Cerrar</span>
                          </Button>
                        </div>
                      </section>
                    </div>
                  )}
                  {activeTab === "datos-control" && (
                    <div className="space-y-6">
                      {/* Encabezado y descripción de Datos de Control ocultados por solicitud */}
                      {/* Placeholder inicial: reutiliza datos parseados de observaciones si existen */}
                      {(() => {
                        let datos: any = {};
                        try { datos = camionDetalle.observaciones ? safeParseObservaciones(camionDetalle.observaciones) : {}; } catch {}
                        // Última fecha mantenimiento (si existe en cache global)
                        let ultimaMantenimiento = '';
                        try {
                          const g: any = globalThis as any;
                          if (g.__ultimaFechaMantenimientoCamiones && g.__ultimaFechaMantenimientoCamiones[camionDetalle.id]) {
                            ultimaMantenimiento = g.__ultimaFechaMantenimientoCamiones[camionDetalle.id];
                          }
                        } catch {}
                        return (
                          <div className="space-y-8">
                            <section>
                              <h4 className="text-sm font-semibold text-gray-900">Números de Identificación</h4>
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {datos.numero_serie && (
                                  <div>
                                    <span className="font-medium text-gray-600">Número de Serie:</span>
                                    <p>{datos.numero_serie}</p>
                                  </div>
                                )}
                                {datos.tag_americano && (
                                  <div>
                                    <span className="font-medium text-gray-600">Tag Americano:</span>
                                    <p>{datos.tag_americano}</p>
                                  </div>
                                )}
                                {datos.tag_mexicano && (
                                  <div>
                                    <span className="font-medium text-gray-600">Tag Mexicano:</span>
                                    <p>{datos.tag_mexicano}</p>
                                  </div>
                                )}
                                {datos.numero_base && (
                                  <div>
                                    <span className="font-medium text-gray-600">Número de Base:</span>
                                    <p>{datos.numero_base}</p>
                                  </div>
                                )}
                              </div>
                            </section>
                            {datos.numeros_adicionales && Array.isArray(datos.numeros_adicionales) && datos.numeros_adicionales.length > 0 && (
                              <section>
                                <h4 className="text-sm font-semibold text-gray-900">Números Adicionales</h4>
                                <div className="mt-3 space-y-3">
                                  {datos.numeros_adicionales.map((numero: any, index: number) => (
                                    <div key={index} className="p-3 rounded-lg bg-gray-50">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <span className="font-medium text-gray-600">Documento:</span>
                                          <p>{numero.nombre}</p>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600">Número:</span>
                                          <p>{numero.numero}</p>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600">Vencimiento:</span>
                                          <p>{numero.fecha_vencimiento ? new Date(numero.fecha_vencimiento).toLocaleDateString() : 'No especificado'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}
                            <section>
                              {/* Sección 'Resumen Rápido' ocultada por solicitud */}
                            </section>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activeTab === "documentos-detalle" && (
                    <div className="space-y-6">
                      {(() => {
                        let datosAdicionales: any = {};
                        if (camionDetalle.observaciones) {
                          try {
                            datosAdicionales = JSON.parse(
                              camionDetalle.observaciones
                            );
                          } catch (error) {
                            console.error(
                              "Error parsing observaciones:",
                              error
                            );
                          }
                        }

                        const alertas = verificarVencimientos(camionDetalle);

                        return (
                          <>
                            {/* Alertas de Vencimiento */}
                            {alertas.length > 0 && (
                              <section>
                                <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5" />
                                  <span>Alertas de Vencimiento</span>
                                </h3>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                  {alertas.map((alerta, index) => (
                                    <div
                                      key={index}
                                      className={`relative rounded-md border text-xs md:text-sm p-3 flex flex-col gap-2 shadow-sm ${
                                        alerta.vencido
                                          ? 'border-red-300 bg-red-50/70'
                                          : 'border-yellow-300 bg-yellow-50/70'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${alerta.vencido ? 'bg-red-600' : 'bg-yellow-500'}`}></span>
                                        <div className="space-y-0.5 leading-tight pr-10">
                                          <p className="font-medium">{alerta.mensaje}</p>
                                          <p className="opacity-80">Fecha: {alerta.fecha}</p>
                                        </div>
                                        <span className={`absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                                          alerta.vencido ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                                        }`}>
                                          {alerta.vencido ? 'VENCIDO' : `${alerta.dias} días`}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                            {/* Seguros */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center space-x-2">
                                    <Shield className="h-5 w-5" />
                                    <span>Seguro Mexicano</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Póliza:
                                    </span>
                                    <p>
                                      {datosAdicionales.poliza_seguro_mexicano ||
                                        "No especificado"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Fecha de Vencimiento:
                                    </span>
                                    <p>{formatDateMatamoros(datosAdicionales.fecha_vencimiento_seguro_mexicano)}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center space-x-2">
                                    <Shield className="h-5 w-5" />
                                    <span>Seguro Americano</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Póliza:
                                    </span>
                                    <p>
                                      {datosAdicionales.poliza_seguro_americano ||
                                        "No especificado"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Fecha de Vencimiento:
                                    </span>
                                    <p>{formatDateMatamoros(datosAdicionales.fecha_vencimiento_seguro_americano)}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Verificaciones */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center space-x-2">
                                  <Calendar className="h-5 w-5" />
                                  <span>Verificaciones</span>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Última Verificación:
                                    </span>
                                    <p>{formatDateMatamoros(datosAdicionales.ultima_verificacion)}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">
                                      Próxima Verificación:
                                    </span>
                                    <p>{formatDateMatamoros(datosAdicionales.proxima_verificacion)}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {activeTab === "kilometraje" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          <Gauge className="h-5 w-5" />
                          <span>Historial de Kilometraje</span>
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600 hidden sm:inline">Mostrar:</span>
                            <Select
                              value={pageSizeKilometraje.toString()}
                              onValueChange={(val) => {
                                const n = parseInt(val, 10);
                                setPageSizeKilometraje(n);
                                setCurrentPageKilometraje(1);
                              }}
                            >
                              <SelectTrigger className="w-[110px] h-8 px-2 text-xs">
                                <SelectValue placeholder="Registros" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            className="bg-[#16A34A] hover:bg-[#12813a] text-white"
                            onClick={() => {
                              seleccionarCamionKilometraje(camionDetalle);
                              setShowKilometrajeForm(true);
                            }}
                            disabled={!registrosKilometrajeTableExists}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Registro
                          </Button>
                        </div>
                      </div>
                      {(() => {
                        const totalPages = Math.ceil(historialKilometraje.length / pageSizeKilometraje) || 1;
                        const start = (currentPageKilometraje - 1) * pageSizeKilometraje;
                        const paginated = historialKilometraje.slice(start, start + pageSizeKilometraje);
                        return (
                          <>
                      {loadingHistorial ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-gray-600">Cargando historial...</p>
                        </div>
                      ) : historialKilometraje.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr className="divide-x divide-gray-200">
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Km +</th>
                                <th className="px-3 py-2 text-left font-medium">Tramo</th>
                                <th className="px-3 py-2 text-left font-medium">Comentarios</th>
                                <th className="px-3 py-2 text-left font-medium">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paginated.map((registro) => (
                                <tr key={registro.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap">{new Date(registro.fecha_viaje).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 font-semibold text-blue-600">+{registro.kilometraje_agregado.toLocaleString('es-MX')} km</td>
                                  <td className="px-3 py-2">{registro.tramo_recorrido}</td>
                                  <td className="px-3 py-2 max-w-[240px] truncate" title={registro.comentarios || ''}>{registro.comentarios || '-'}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => editarRegistroKilometraje(registro)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Se eliminará el registro y se ajustará el kilometraje del camión.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() =>
                                                eliminarRegistroKilometraje(
                                                  registro.id,
                                                  camionDetalle.id,
                                                  registro.kilometraje_agregado
                                                )
                                              }
                                            >
                                              Eliminar
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex items-center justify-between mt-4 text-sm">
                            <span className="text-gray-600">
                              {historialKilometraje.length > 0 ? (
                                <>Página {currentPageKilometraje} de {totalPages} · {historialKilometraje.length} registros</>
                              ) : (
                                <>0 registros</>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPageKilometraje === 1 || historialKilometraje.length === 0}
                                onClick={() => setCurrentPageKilometraje((p: number) => Math.max(1, p - 1))}
                              >
                                Anterior
                              </Button>
                              <div className="flex items-center gap-1">
                                {historialKilometraje.length > 0 && Array.from({ length: totalPages }).map((_, i) => {
                                  const page = i + 1;
                                  const active = page === currentPageKilometraje;
                                  const show =
                                    totalPages <= 7 ||
                                    page === 1 ||
                                    page === totalPages ||
                                    Math.abs(page - currentPageKilometraje) <= 1 ||
                                    page === 2 ||
                                    page === totalPages - 1;
                                  if (!show) {
                                    if (
                                      (page === 3 && currentPageKilometraje > 4) ||
                                      (page === totalPages - 2 && currentPageKilometraje < totalPages - 3)
                                    ) {
                                      return <span key={page} className="px-1 text-gray-400">...</span>;
                                    }
                                    return null;
                                  }
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPageKilometraje(page)}
                                      className={`h-8 w-8 rounded-md border text-xs font-medium ${
                                        active
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPageKilometraje === totalPages || historialKilometraje.length === 0}
                                onClick={() => setCurrentPageKilometraje((p: number) => Math.min(totalPages, p + 1))}
                              >
                                Siguiente
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Gauge className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>No hay registros de kilometraje</p>
                          <p className="text-sm mt-1">Los registros de viajes aparecerán aquí</p>
                        </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {activeTab === "mantenimiento" && (
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Gauge className="h-5 w-5" />
                          <span>Historial de Mantenimiento</span>
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Mostrar</span>
              <Select
                              value={String(pageSizeMantenimiento)}
                              onValueChange={(v) => {
                                setPageSizeMantenimiento(Number(v));
                                setCurrentPageMantenimiento(1);
                              }}
                              disabled={loadingHistorialMantenimiento || historialMantenimiento.length === 0}
                            >
                              <SelectTrigger className="h-8 w-[90px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                {[5,10,25,50].map(opt => (
                                  <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedCamionMantenimiento(camionDetalle);
                              setShowMantenimientoForm(true);
                            }}
                            disabled={!registrosMantenimientoTableExists}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Mantenimiento
                          </Button>
                        </div>
                      </div>

                      {loadingHistorialMantenimiento ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                          <p className="mt-2 text-gray-600">Cargando historial...</p>
                        </div>
                      ) : historialMantenimiento.length > 0 ? (
                        (() => {
                          const start = (currentPageMantenimiento - 1) * pageSizeMantenimiento;
                          const end = start + pageSizeMantenimiento;
                          const paginated = historialMantenimiento.slice(start, end);
                          const totalPages = Math.ceil(historialMantenimiento.length / pageSizeMantenimiento) || 1;
                          const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                          return (
                            <div className="space-y-4">
                              <div className="overflow-x-auto rounded-lg border">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600">Tipo</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600">Detalles</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600">Próximo</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {paginated.map(registro => {
                                      const detalles = registro.detalles_mantenimiento || '';
                                      const truncated = detalles.length > 70 ? detalles.slice(0,70) + '…' : detalles;
                                      return (
                                        <tr key={registro.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 whitespace-nowrap">{new Date(registro.fecha_mantenimiento).toLocaleDateString()}</td>
                                          <td className="px-3 py-2 capitalize">{registro.tipo_mantenimiento || 'General'}</td>
                                          <td className="px-3 py-2" title={detalles}>{truncated || <span className="text-gray-400 italic">Sin detalles</span>}</td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            {registro.proximo_mantenimiento ? new Date(registro.proximo_mantenimiento).toLocaleDateString() : <span className="text-gray-400 italic">—</span>}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => editarRegistroMantenimiento(registro)}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="outline" size="sm">
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar registro de mantenimiento?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Esta acción no se puede deshacer. Se eliminará permanentemente el registro de mantenimiento.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => eliminarRegistroMantenimiento(registro.id)}>Eliminar</AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="text-xs text-gray-500">
                                  Página {currentPageMantenimiento} de {totalPages} · {historialMantenimiento.length} registros
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPageMantenimiento === 1 || historialMantenimiento.length === 0}
                                    onClick={() => setCurrentPageMantenimiento(p => Math.max(1, p - 1))}
                                  >
                                    Anterior
                                  </Button>
                                  <div className="flex items-center gap-1">
                                    {pages.map(page => {
                                      const active = page === currentPageMantenimiento;
                                      const show =
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPageMantenimiento) <= 1 ||
                                        (page === 3 && currentPageMantenimiento > 4) ||
                                        (page === totalPages - 2 && currentPageMantenimiento < totalPages - 3);
                                      if (!show) return null;
                                      if (
                                        (page === 3 && currentPageMantenimiento > 5) ||
                                        (page === totalPages - 2 && currentPageMantenimiento < totalPages - 4)
                                      ) {
                                        return <span key={page} className="px-1 text-gray-400">…</span>;
                                      }
                                      return (
                                        <button
                                          key={page}
                                          onClick={() => setCurrentPageMantenimiento(page)}
                                          className={`h-8 w-8 rounded-md border text-xs font-medium ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                        >
                                          {page}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPageMantenimiento === totalPages || historialMantenimiento.length === 0}
                                    onClick={() => setCurrentPageMantenimiento(p => Math.min(totalPages, p + 1))}
                                  >
                                    Siguiente
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Gauge className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>No hay registros de mantenimiento</p>
                          <p className="text-sm mt-1">Los registros de mantenimiento aparecerán aquí</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "fechas-control" && (
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          <span>Fechas de Control</span>
                        </h3>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <span className="font-medium text-gray-600">Fecha de Registro:</span>
                            <p>{new Date(camionDetalle.fecha_registro).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Última Actualización:</span>
                            <p>
                              {camionDetalle.updated_at
                                ? new Date(camionDetalle.updated_at).toLocaleDateString()
                                : "No disponible"}
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTab === "comentarios-detalle" && (
                    <div className="space-y-6">
                      <Card>
                        <CardContent>
                          {(() => {
                            let datosAdicionales: any = {};
                            if (camionDetalle.observaciones) {
                              try {
                                datosAdicionales = safeParseObservaciones(camionDetalle.observaciones);
                              } catch (error) {
                                console.error('Error parsing observaciones:', error);
                              }
                            }
                            const comentarios = datosAdicionales.historial_comentarios || [];
                            return (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Textarea
                                    className="min-h-[90px] resize-y text-sm w-full"
                                    placeholder="Escribe tu comentario..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    rows={4}
                                  />
                                  <div className="flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-gray-500">Orden:</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[11px]"
                                        onClick={() => { setSortOrderComentarios(o => o === 'desc' ? 'asc' : 'desc'); setCurrentPageComentarios(1); }}
                                      >
                                        {sortOrderComentarios === 'desc' ? 'Más recientes' : 'Más antiguos'}
                                      </Button>
                                      <span className="text-gray-400">|</span>
                                      <span className="text-gray-500">Mostrar</span>
                                      <Select
                                        value={String(pageSizeComentarios)}
                                        onValueChange={(v) => { setPageSizeComentarios(Number(v)); setCurrentPageComentarios(1); }}
                                      >
                                        <SelectTrigger className="h-7 w-[70px] text-[11px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[3,5,10,25,50].map(n => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={handleAddComment}
                                      disabled={!newCommentText.trim()}
                                      className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Agregar Comentario
                                    </Button>
                                  </div>
                                </div>
                                {comentarios.length > 0 ? (() => {
                                  const sorted = [...comentarios].sort((a: Comentario, b: Comentario) => {
                                    const da = new Date(a.date).getTime();
                                    const db = new Date(b.date).getTime();
                                    return sortOrderComentarios === 'desc' ? db - da : da - db;
                                  });
                                  const total = sorted.length;
                                  const totalPages = Math.ceil(total / pageSizeComentarios) || 1;
                                  const start = (currentPageComentarios - 1) * pageSizeComentarios;
                                  const pageItems = sorted.slice(start, start + pageSizeComentarios);
                                  if (currentPageComentarios > totalPages) setCurrentPageComentarios(totalPages);
                                  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                                  return (
                                    <div className="space-y-3">
                                      <div className="border rounded-md divide-y divide-gray-200 text-sm bg-white">
                                        {pageItems.map((comentario: Comentario) => (
                                          <div key={comentario.id} className="flex items-start gap-3 px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                          {editingCommentId === comentario.id ? (
                                            <div className="space-y-2">
                                              <Textarea
                                                value={editedCommentText}
                                                onChange={(e) => setEditedCommentText(e.target.value)}
                                                rows={3}
                                                className="text-sm"
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleEditComment(comentario.id)}
                                                  disabled={!editedCommentText.trim()}
                                                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                                                >
                                                  Guardar
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => { setEditingCommentId(null); setEditedCommentText(''); }}
                                                  className="h-7 px-3 text-xs"
                                                >
                                                  Cancelar
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <p className="text-gray-800 break-words leading-snug">{comentario.text}</p>
                                              <p className="text-[10px] uppercase tracking-wide text-gray-500">{new Date(comentario.date).toLocaleString()}</p>
                                            </div>
                                          )}
                                        </div>
                                        {editingCommentId !== comentario.id && (
                                          <div className="flex gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => { setEditingCommentId(comentario.id); setEditedCommentText(comentario.text); }}
                                              className="h-7 w-7 p-0"
                                            >
                                              <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleDeleteComment(comentario.id)}
                                              className="h-7 w-7 p-0"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                        ))}
                                      </div>
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-gray-600">
                                        <div> Página {currentPageComentarios} de {totalPages} · {total} comentarios</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPageComentarios === 1}
                                            onClick={() => setCurrentPageComentarios(p => Math.max(1, p - 1))}
                                            className="h-7 px-2"
                                          >Anterior</Button>
                                          <div className="flex items-center gap-1">
                                            {pages.map(p => (
                                              <button
                                                key={p}
                                                onClick={() => setCurrentPageComentarios(p)}
                                                className={`h-7 w-7 rounded-md border text-[11px] font-medium ${p === currentPageComentarios ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                              >{p}</button>
                                            ))}
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPageComentarios === totalPages}
                                            onClick={() => setCurrentPageComentarios(p => Math.min(totalPages, p + 1))}
                                            className="h-7 px-2"
                                          >Siguiente</Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })() : (
                                  <p className="text-xs text-gray-500 italic">No hay comentarios registrados.</p>
                                )}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Cerrar button moved to Acciones Rápidas */}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Registro de Kilometraje */}
        <Dialog
          open={showKilometrajeForm}
          onOpenChange={setShowKilometrajeForm}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Kilometraje</DialogTitle>
              <DialogDescription>
                {selectedCamionKilometraje && (
                  <>
                    Camión: {selectedCamionKilometraje.numero_economico} -
                    Kilometraje actual:{" "}
                    {selectedCamionKilometraje.kilometraje.toLocaleString('es-MX')} km
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kilometraje_actual">
                    Kilometraje Actual *
                  </Label>
                  <Input
                    id="kilometraje_actual"
                    type="number"
                    min={selectedCamionKilometraje?.kilometraje || 0}
                    value={kilometrajeFormData.kilometraje_actual}
                    onChange={(e) =>
                      setKilometrajeFormData({
                        ...kilometrajeFormData,
                        kilometraje_actual: e.target.value,
                      })
                    }
                    placeholder="Nuevo kilometraje"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_viaje">Fecha del Viaje *</Label>
                  <Input
                    id="fecha_viaje"
                    type="date"
                    value={kilometrajeFormData.fecha_viaje}
                    onChange={(e) =>
                      setKilometrajeFormData({
                        ...kilometrajeFormData,
                        fecha_viaje: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tramo_recorrido">Tramo Recorrido *</Label>
                <Input
                  id="tramo_recorrido"
                  value={kilometrajeFormData.tramo_recorrido}
                  onChange={(e) =>
                    setKilometrajeFormData({
                      ...kilometrajeFormData,
                      tramo_recorrido: e.target.value,
                    })
                  }
                  placeholder="Ej: Ciudad de México - Guadalajara"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentarios_viaje">Comentarios</Label>
                <Textarea
                  id="comentarios_viaje"
                  value={kilometrajeFormData.comentarios_viaje}
                  onChange={(e) =>
                    setKilometrajeFormData({
                      ...kilometrajeFormData,
                      comentarios_viaje: e.target.value,
                    })
                  }
                  placeholder="Comentarios adicionales del viaje..."
                  rows={3}
                />
              </div>

              {selectedCamionKilometraje &&
                kilometrajeFormData.kilometraje_actual && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Kilometraje a agregar:</strong>{" "}
                      {(
                        Number.parseInt(
                          kilometrajeFormData.kilometraje_actual
                        ) - selectedCamionKilometraje.kilometraje
                      ).toLocaleString()}{" "}
                      km
                    </p>
                  </div>
                )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowKilometrajeForm(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarKilometraje}
                className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
              >
                Guardar Kilometraje
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Registro de Mantenimiento */}
        <Dialog
          open={showMantenimientoForm}
          onOpenChange={setShowMantenimientoForm}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Mantenimiento</DialogTitle>
              <DialogDescription>
                {selectedCamionMantenimiento && (
                  <>Camión: {selectedCamionMantenimiento.numero_economico}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_mantenimiento">
                    Fecha de Mantenimiento *
                  </Label>
                  <Input
                    id="fecha_mantenimiento"
                    type="date"
                    value={mantenimientoFormData.fecha_mantenimiento}
                    onChange={(e) =>
                      setMantenimientoFormData({
                        ...mantenimientoFormData,
                        fecha_mantenimiento: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_mantenimiento">
                    Tipo de Mantenimiento
                  </Label>
                  <Select
                    value={mantenimientoFormData.tipo_mantenimiento}
                    onValueChange={(value) =>
                      setMantenimientoFormData({
                        ...mantenimientoFormData,
                        tipo_mantenimiento: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventivo">Preventivo</SelectItem>
                      <SelectItem value="correctivo">Correctivo</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="motor">Motor</SelectItem>
                      <SelectItem value="frenos">Frenos</SelectItem>
                      <SelectItem value="transmision">Transmisión</SelectItem>
                      <SelectItem value="suspension">Suspensión</SelectItem>
                      <SelectItem value="electrico">Eléctrico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalles_mantenimiento">
                  Detalles del Mantenimiento *
                </Label>
                <Textarea
                  id="detalles_mantenimiento"
                  value={mantenimientoFormData.detalles_mantenimiento}
                  onChange={(e) =>
                    setMantenimientoFormData({
                      ...mantenimientoFormData,
                      detalles_mantenimiento: e.target.value,
                    })
                  }
                  placeholder="Describe el mantenimiento realizado..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximo_mantenimiento">
                  Próximo Mantenimiento
                </Label>
                <Input
                  id="proximo_mantenimiento"
                  type="date"
                  value={mantenimientoFormData.proximo_mantenimiento}
                  onChange={(e) =>
                    setMantenimientoFormData({
                      ...mantenimientoFormData,
                      proximo_mantenimiento: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMantenimientoForm(false)}
              >
                Cancelar
              </Button>
              <Button onClick={guardarMantenimiento} className="bg-green-600 hover:bg-green-700 text-white">
                Guardar Mantenimiento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edición de Registro de Kilometraje */}
        <Dialog
          open={showEditRegistroForm}
          onOpenChange={setShowEditRegistroForm}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Registro de Kilometraje</DialogTitle>
              <DialogDescription>
                Modificar información del registro de viaje
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_kilometraje_agregado">
                    Kilometraje Agregado *
                  </Label>
                  <Input
                    id="edit_kilometraje_agregado"
                    type="number"
                    min="1"
                    value={editRegistroFormData.kilometraje_agregado}
                    onChange={(e) =>
                      setEditRegistroFormData({
                        ...editRegistroFormData,
                        kilometraje_agregado: e.target.value,
                      })
                    }
                    placeholder="Kilometraje agregado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_fecha_viaje">Fecha del Viaje *</Label>
                  <Input
                    id="edit_fecha_viaje"
                    type="date"
                    value={editRegistroFormData.fecha_viaje}
                    onChange={(e) =>
                      setEditRegistroFormData({
                        ...editRegistroFormData,
                        fecha_viaje: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_tramo_recorrido">Tramo Recorrido *</Label>
                <Input
                  id="edit_tramo_recorrido"
                  value={editRegistroFormData.tramo_recorrido}
                  onChange={(e) =>
                    setEditRegistroFormData({
                      ...editRegistroFormData,
                      tramo_recorrido: e.target.value,
                    })
                  }
                  placeholder="Ej: Ciudad de México - Guadalajara"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_comentarios_viaje">Comentarios</Label>
                <Textarea
                  id="edit_comentarios_viaje"
                  value={editRegistroFormData.comentarios_viaje}
                  onChange={(e) =>
                    setEditRegistroFormData({
                      ...editRegistroFormData,
                      comentarios_viaje: e.target.value,
                    })
                  }
                  placeholder="Comentarios adicionales del viaje..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={cancelarEdicionRegistro}>
                Cancelar
              </Button>
              <Button
                onClick={guardarEdicionRegistro}
                className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
              >
                Actualizar Registro
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edición de Registro de Mantenimiento */}
        <Dialog
          open={showEditMantenimientoForm}
          onOpenChange={setShowEditMantenimientoForm}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Registro de Mantenimiento</DialogTitle>
              <DialogDescription>
                Modificar información del mantenimiento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_fecha_mantenimiento">
                    Fecha de Mantenimiento *
                  </Label>
                  <Input
                    id="edit_fecha_mantenimiento"
                    type="date"
                    value={editMantenimientoFormData.fecha_mantenimiento}
                    onChange={(e) =>
                      setEditMantenimientoFormData({
                        ...editMantenimientoFormData,
                        fecha_mantenimiento: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_tipo_mantenimiento">
                    Tipo de Mantenimiento
                  </Label>
                  <Select
                    value={editMantenimientoFormData.tipo_mantenimiento}
                    onValueChange={(value) =>
                      setEditMantenimientoFormData({
                        ...editMantenimientoFormData,
                        tipo_mantenimiento: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventivo">Preventivo</SelectItem>
                      <SelectItem value="correctivo">Correctivo</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="motor">Motor</SelectItem>
                      <SelectItem value="frenos">Frenos</SelectItem>
                      <SelectItem value="transmision">Transmisión</SelectItem>
                      <SelectItem value="suspension">Suspensión</SelectItem>
                      <SelectItem value="electrico">Eléctrico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_detalles_mantenimiento">
                  Detalles del Mantenimiento *
                </Label>
                <Textarea
                  id="edit_detalles_mantenimiento"
                  value={editMantenimientoFormData.detalles_mantenimiento}
                  onChange={(e) =>
                    setEditMantenimientoFormData({
                      ...editMantenimientoFormData,
                      detalles_mantenimiento: e.target.value,
                    })
                  }
                  placeholder="Describe el mantenimiento realizado..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_proximo_mantenimiento">
                  Próximo Mantenimiento
                </Label>
                <Input
                  id="edit_proximo_mantenimiento"
                  type="date"
                  value={editMantenimientoFormData.proximo_mantenimiento}
                  onChange={(e) =>
                    setEditMantenimientoFormData({
                      ...editMantenimientoFormData,
                      proximo_mantenimiento: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={cancelarEdicionMantenimiento}>
                Cancelar
              </Button>
              <Button onClick={guardarEdicionMantenimiento}>
                Actualizar Mantenimiento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
