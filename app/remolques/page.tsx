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
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Importar Tabs components
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  Eye,
  Upload,
  FileText,
  Image,
  UploadCloud,
  X,
  Download,
  ExternalLink,
  Shield,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase, type Remolque, type MarcaRemolque, type DocumentoRemolque } from "@/lib/supabase";
import { formatDateMatamoros, normalizeDate, todayLocalISODate } from '@/lib/date-utils';
import { agregarAuditLog } from "@/lib/audit";
import { toast } from "@/hooks/use-toast";
import { subirDocumentoRemolque, eliminarDocumentoRemolque, listarDocumentosRemolque } from "@/lib/blob";

export default function RemolquesPage() {
  // --- Estados y lógica para gestión de marcas de remolques ---
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [agregandoMarca, setAgregandoMarca] = useState(false);
  const [editandoMarcaId, setEditandoMarcaId] = useState<string | null>(null);
  // Estado para mostrar el modal de marcas de remolques
  const [showMarcasRemolque, setShowMarcasRemolque] = useState(false);
  // Función para descargar el reporte de remolques en CSV
  const descargarReporteRemolques = () => {
    const headers = [
      "Número Económico",
      "Tipo",
      "Marca",
      "Modelo",
      "Año",
      "Número de Serie",
      "Capacidad",
      "Placas",
      "Fecha Última Inspección",
      "Próxima Inspección",
      "Póliza Seguro",
      "Vigencia Seguro",
      "Estado",
      "Comentarios",
      "Activo",
      "Fecha Registro",
    ];
  const rows = remolques.map((r) => [
      r.numero_economico,
      r.tipo || "",
      r.marca || "",
      r.modelo || "",
      r.año || "",
      r.numero_serie || "",
      r.capacidad || "",
      r.placas || "",
  r.fecha_ultima_inspeccion ? formatDateMatamoros(r.fecha_ultima_inspeccion) : "",
  r.proxima_inspeccion ? formatDateMatamoros(r.proxima_inspeccion) : "",
      r.poliza_seguro || "",
  r.vigencia_seguro ? formatDateMatamoros(r.vigencia_seguro) : "",
      r.estado || "",
      r.comentarios || "",
      r.activo !== false ? "Sí" : "No",
  r.fecha_registro ? formatDateMatamoros(r.fecha_registro) : "",
    ]);
    // Escapar comillas dobles y unir en formato CSV
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")
      )
      .join("\n");
    const blob = new window.Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "reporte_remolques.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Audit log: exportación general de remolques
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Remolques",
        `Descargó reporte general de remolques (${remolques.length})`
      );
    } catch {}
  };
  const [showForm, setShowForm] = useState(false);
  // Mantener modal de detalles abierto al editar
  const [editingRemolque, setEditingRemolque] = useState<Remolque | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  // Número de cards por fila en la lista (2,3,4)
  const [cardsPerRow, setCardsPerRow] = useState<number>(3);

  // Estados para los datos
  const [remolques, setRemolques] = useState<Remolque[]>([]);
  const [marcas, setMarcas] = useState<MarcaRemolque[]>([]);
  const [deletingMarcaId, setDeletingMarcaId] = useState<string | null>(null);
  const [pendingDeleteMarca, setPendingDeleteMarca] = useState<{
    id: string;
    nombre: string;
    abierto: boolean;
  } | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationFolios, setNotificationFolios] = useState<string[]>([]);
  // Estado para confirmación de activar/desactivar remolque
  const [pendingToggleRemolque, setPendingToggleRemolque] = useState<{
    id: string;
    nuevoEstado: boolean;
    abierto: boolean;
  } | null>(null);
  // Historial de mantenimiento remolques
  const [historialMantenimientoRemolque, setHistorialMantenimientoRemolque] = useState<any[]>([]);
  const [loadingHistorialMantenimientoRemolque, setLoadingHistorialMantenimientoRemolque] = useState(false);
  const [loadingDocumentosRemolque, setLoadingDocumentosRemolque] = useState(false);
  const [currentPageMantenimientoRemolque, setCurrentPageMantenimientoRemolque] = useState(1);
  const [pageSizeMantenimientoRemolque, setPageSizeMantenimientoRemolque] = useState(5);

  // Estados para el historial de actualizaciones
  const [historialActualizaciones, setHistorialActualizaciones] = useState<any[]>([]);
  const [loadingHistorialActualizaciones, setLoadingHistorialActualizaciones] = useState(false);
  const [mantenimientoRemolqueFormData, setMantenimientoRemolqueFormData] = useState({
    fecha_mantenimiento: "",
    tipo_mantenimiento: "preventivo",
    detalles_mantenimiento: "",
    proximo_mantenimiento: "",
  });
  const [showFormMantenimientoRemolque, setShowFormMantenimientoRemolque] = useState(false);
  const [addingMantenimientoRemolque, setAddingMantenimientoRemolque] = useState(false);

  // Estados para documentos de remolques
  const [documentosRemolque, setDocumentosRemolque] = useState<DocumentoRemolque[]>([]);
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<File[]>([]);
  const [uploadingDocumentos, setUploadingDocumentos] = useState(false);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<{ url: string; nombre: string } | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    numeroEconomico: "",
    tipo: "",
    marca: "",
    modelo: "",
    año: "",
    numeroSerie: "",
    capacidad: "",
    placas: "",
    fechaUltimaInspeccion: "",
    proximaInspeccion: "",
    polizaSeguro: "",
    vigenciaSeguro: "",
    estado: "disponible",
    comentarios: "",
  });

  // Función para generar datos aleatorios de remolque
  const generarDatosAleatorios = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randDigits = (len: number) => Array.from({ length: len }, () => String(randInt(0, 9))).join("");
    const randLetters = (len: number) => Array.from({ length: len }, () => String.fromCharCode(randInt(65, 90))).join("");
    const randDateFuture = (daysMin = 30, daysMax = 365) => {
      const base = new Date();
      const d = randInt(daysMin, daysMax);
      const dt = new Date(base.getTime() + d * 24 * 3600 * 1000);
      return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0, 10);
    };
    const randDatePast = (daysMin = 30, daysMax = 180) => {
      const base = new Date();
      const d = randInt(daysMin, daysMax);
      const dt = new Date(base.getTime() - d * 24 * 3600 * 1000);
      return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0, 10);
    };

    const tipos = ["Caja Seca", "Refrigerado", "Plataforma", "Tolva", "Tanque", "Lowboy"];
    const marcasMX = ["Great Dane", "Utility", "Wabash", "Hyundai", "Stoughton", "Fruehauf", "Dorsey"];
    const modelos = ["Modelo A", "Modelo B", "Serie X", "Serie Pro", "Standard", "Heavy Duty"];
    const estados = ["disponible", "en_uso", "mantenimiento"];
    const comentarios = [
      "Remolque en excelente estado",
      "Requiere inspección rutinaria",
      "Última revisión completa", 
      "Apto para cargas pesadas",
      "Sin observaciones",
    ];

    const numeroEconomico = `R-${randDigits(4)}`;
    const placasMX = `${randDigits(3)}-${randLetters(3)}-${randDigits(1)}`;
    const numeroSerie = `${randLetters(3)}${randDigits(8)}`;
    const polizaSeguro = `POL-${randDigits(10)}`;

    setFormData({
      numeroEconomico,
      tipo: pick(tipos),
      marca: pick(marcasMX),
      modelo: pick(modelos),
      año: String(randInt(2015, 2024)),
      numeroSerie,
      capacidad: String(randInt(20, 53)) + " ton",
      placas: placasMX,
      fechaUltimaInspeccion: randDatePast(30, 90),
      proximaInspeccion: randDateFuture(60, 180),
      polizaSeguro,
      vigenciaSeguro: randDateFuture(90, 365),
      estado: pick(estados),
      comentarios: pick(comentarios),
    });

    toast({
      title: "Datos generados",
      description: `Remolque ${numeroEconomico} creado con datos aleatorios`,
    });
  };

  // Cargar datos desde Supabase
  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar remolques
      const { data: remolquesData, error: remolquesError } = await supabase
        .from("remolques")
        .select("*")
        .order("numero_economico");

      if (remolquesError) {
        console.error("Error cargando remolques:", remolquesError);
      } else {
        setRemolques(remolquesData || []);
      }

      // Cargar marcas
      const { data: marcasData, error: marcasError } = await supabase
        .from("marcas_remolques")
        .select("*")
        .eq("activa", true)
        .order("nombre");

      if (marcasError) {
        console.error("Error cargando marcas:", marcasError);
      } else {
        setMarcas(marcasData || []);
      }
    } catch (error) {
      console.error("Error general:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Persistir preferencia de cards por fila en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('remolques_cards_per_row');
      if (saved) setCardsPerRow(Number(saved));
    } catch (e) {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('remolques_cards_per_row', String(cardsPerRow));
    } catch (e) {
      // noop
    }
  }, [cardsPerRow]);

  const getGridClass = (n: number) => {
    switch (n) {
      case 2:
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case 4:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
      case 3:
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      numeroEconomico: "",
      tipo: "",
      marca: "",
      modelo: "",
      año: "",
      numeroSerie: "",
      capacidad: "",
      placas: "",
      fechaUltimaInspeccion: "",
      proximaInspeccion: "",
      polizaSeguro: "",
      vigenciaSeguro: "",
      estado: "disponible",
      comentarios: "",
    });
    setEditingRemolque(null);
    // Limpiar documentos seleccionados
    setDocumentosSeleccionados([]);
    setDocumentosRemolque([]);
  };

  

  const crearRecordatoriosVencimientos = async (
    remolqueId: string,
    numeroEconomico: string,
    proximaInspeccion?: string,
    vigenciaSeguro?: string
  ) => {
    try {
      const recordatorios = [];

      // Recordatorio para inspección (15 días antes)
      if (proximaInspeccion) {
        // normalize input date (accept YYYY-MM-DD or timestamp)
        const norm = normalizeDate(proximaInspeccion);
        if (norm) {
          const fechaInspeccion = new Date(norm);
          const fechaRecordatorio = new Date(fechaInspeccion);
          fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 15); // 15 días antes

          recordatorios.push({
            titulo: `Inspección de Remolque ${numeroEconomico}`,
            descripcion: `La inspección del remolque ${numeroEconomico} vence el ${formatDateMatamoros(norm)}. Programa la inspección con anticipación.`,
            fecha_vencimiento: fechaRecordatorio.toISOString().split("T")[0],
            tipo: "inspeccion_remolque",
            prioridad: "alta",
            estado: "pendiente",
          });
        }
      }

      // Recordatorio para seguro (15 días antes)
      if (vigenciaSeguro) {
        const norm = normalizeDate(vigenciaSeguro);
        if (norm) {
          const fechaSeguro = new Date(norm);
          const fechaRecordatorio = new Date(fechaSeguro);
          fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 15); // 15 días antes

          recordatorios.push({
            titulo: `Seguro de Remolque ${numeroEconomico}`,
            descripcion: `El seguro del remolque ${numeroEconomico} vence el ${formatDateMatamoros(norm)}. Renueva la póliza de seguro antes del vencimiento.`,
            fecha_vencimiento: fechaRecordatorio.toISOString().split("T")[0],
            tipo: "seguro_remolque",
            prioridad: "alta",
            estado: "pendiente",
          });
        }
      }

      // Insertar recordatorios si hay alguno
      if (recordatorios.length > 0) {
        const { error } = await supabase
          .from("recordatorios")
          .insert(recordatorios);

        if (error) {
          console.error("Error creando recordatorios:", error);
          // Mostrar mensaje informativo al usuario en lugar de error
          toast({
            title: "Remolque guardado exitosamente",
            description:
              "Nota: Los recordatorios automáticos se configurarán manualmente desde la sección de recordatorios.",
            variant: "success",
          });
        } else {
          console.log(
            `Creados ${recordatorios.length} recordatorios para remolque ${numeroEconomico}`
          );
        }
      }
    } catch (error) {
      console.error("Error en crearRecordatoriosVencimientos:", error);
      // No mostrar error al usuario, solo log interno
    }
  };

  const guardarRemolque = async () => {
    if (!formData.numeroEconomico) {
      alert("El número económico es obligatorio");
      return;
    }

    try {
      setSaving(true);

      // Verificar que el número económico no esté duplicado
      const { data: existingRemolque, error: checkError } = await supabase
        .from("remolques")
        .select("id")
        .eq("numero_economico", formData.numeroEconomico);

        if (checkError) {
        console.error("Error verificando número económico:", checkError);
        toast({ title: "Error al verificar número económico", description: checkError?.message || JSON.stringify(checkError), variant: "destructive" });
        return;
      }

      // Si estamos editando, excluir el remolque actual de la verificación
      const duplicateExists = editingRemolque
        ? existingRemolque?.some((r) => r.id !== editingRemolque.id)
        : existingRemolque && existingRemolque.length > 0;

      if (duplicateExists) {
        toast({ title: "Ya existe un remolque con ese número económico", variant: "destructive" });
        return;
      }

    // Verificar que el número de serie no esté duplicado (solo si se proporciona)
    const serialTrim = (formData.numeroSerie || '').trim();
    if (serialTrim) {
        const { data: existingSerial, error: serialError } = await supabase
          .from("remolques")
          .select("id")
      .eq("numero_serie", serialTrim);

        if (serialError) {
          console.error("Error verificando número de serie:", serialError);
          const msg = (serialError as any)?.message || (serialError as any)?.hint || JSON.stringify(serialError);
          toast({ title: `Error al verificar número de serie`, description: msg, variant: "destructive" });
          return;
        }

        // Si estamos editando, excluir el remolque actual de la verificación
        const serialDuplicateExists = editingRemolque
          ? existingSerial?.some((r) => r.id !== editingRemolque.id)
          : existingSerial && existingSerial.length > 0;

  if (serialDuplicateExists) {
          toast({ title: "Ya existe un remolque con ese número de serie", variant: "destructive" });
          return;
        }
      }

    // Sanitize and validate numeric inputs to avoid DB numeric overflow
    const parsedAño = (() => {
      if (!formData.año) return null;
      const n = Number.parseInt(String(formData.año), 10);
      if (Number.isNaN(n)) return null;
      const minYear = 1900;
      const maxYear = new Date().getFullYear() + 1;
      if (n < minYear || n > maxYear) return null;
      return n;
    })();

    const parsedCapacidad = (() => {
      const capField = formData.capacidad;
      if (capField === undefined || capField === null || String(capField).trim() === '') return null;
      // accept comma or dot
      const raw = String(capField).replace(/,/g, '.').trim();
      const v = Number.parseFloat(raw);
      if (!Number.isFinite(v)) return null;
      // DECIMAL(10,2) allows up to 99999999.99
      const MAX_CAP = 99999999.99;
      if (Math.abs(v) > MAX_CAP) return null;
      // round to 2 decimals to avoid sending overly precise numbers
      return Math.round(v * 100) / 100;
    })();

    if (formData.capacidad && parsedCapacidad === null) {
      toast({ title: 'Capacidad inválida', description: 'Introduce un número válido para capacidad (máx 99,999,999.99).', variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (formData.año && parsedAño === null) {
      toast({ title: 'Año inválido', description: `Introduce un año válido entre 1900 y ${new Date().getFullYear() + 1}.`, variant: 'destructive' });
      setSaving(false);
      return;
    }

    const remolqueData = {
          numero_economico: formData.numeroEconomico,
          tipo: formData.tipo || null,
          marca: formData.marca || null,
          modelo: formData.modelo || null,
          año: parsedAño,
    numero_serie: serialTrim || null,
          capacidad: parsedCapacidad,
        placas: formData.placas || null,
  fecha_ultima_inspeccion: normalizeDate(formData.fechaUltimaInspeccion) || null,
  proxima_inspeccion: normalizeDate(formData.proximaInspeccion) || null,
        poliza_seguro: formData.polizaSeguro || null,
  vigencia_seguro: normalizeDate(formData.vigenciaSeguro) || null,
        estado: formData.estado,
        comentarios: formData.comentarios || null,
        updated_at: new Date().toISOString(),
      };

      let remolqueId: string;

      if (editingRemolque) {
        // Actualizar remolque existente
        const { data: updatedRemolque, error: updateError } = await supabase
          .from("remolques")
          .update(remolqueData)
          .eq("id", editingRemolque.id)
          .select()
          .single();

        if (updateError) {
          console.warn("Error actualizando remolque:", updateError, { remolqueData });
          toast({ title: 'Error al actualizar remolque', description: updateError?.message || JSON.stringify(updateError), variant: 'destructive' });
          return;
        }
        remolqueId = editingRemolque.id;
        // If the details modal is open for this remolque, update its state immediately so UI reflects changes
        try {
          if (remolqueDetalle && remolqueDetalle.id === editingRemolque.id) {
            setRemolqueDetalle(updatedRemolque as any);
            // reload historial for the updated remolque
            try { await cargarHistorialMantenimientoRemolque(updatedRemolque.id); } catch (e) { console.warn('No se pudo recargar historial después de actualizar remolque', e); }
          }
        } catch (e) {
          console.warn('No se pudo actualizar remolqueDetalle en memoria:', e);
        }
        // Audit log: actualización de remolque
        try {
          agregarAuditLog(
            "ACTUALIZAR",
            "Remolques",
            `Actualizó remolque ${remolqueData.numero_economico} (ID: ${editingRemolque.id})`
          );
        } catch {}
      } else {
        // Crear nuevo remolque
        const insertData = { ...remolqueData, fecha_registro: new Date().toISOString() };

        const { data: insertedRemolque, error: insertError } = await supabase
          .from("remolques")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.warn("Error creando remolque:", insertError, { insertData });
          toast({ title: 'Error al crear remolque', description: insertError?.message || JSON.stringify(insertError), variant: 'destructive' });
          return;
        }
        remolqueId = insertedRemolque.id;
        // Audit log: creación de remolque
        try {
          agregarAuditLog(
            "CREAR",
            "Remolques",
            `Creó remolque ${insertData.numero_economico} (ID: ${remolqueId})`
          );
        } catch {}
      }

      // Crear recordatorios para vencimientos
      await crearRecordatoriosVencimientos(
        remolqueId,
        formData.numeroEconomico,
        formData.proximaInspeccion,
        formData.vigenciaSeguro
      );

      // Subir documentos si hay alguno seleccionado
      try {
        if (documentosSeleccionados.length > 0 && remolqueId) {
          const resultados = await subirDocumentosRemolque(remolqueId);
          if (resultados.length > 0) {
            toast({ 
              title: 'Documentos subidos', 
              description: `Se subieron ${resultados.length} documento(s) correctamente`,
              variant: 'default' 
            });
          }
        }
      } catch (error) {
        console.error('Error subiendo documentos:', error);
        // No fallar el guardado del remolque por error en documentos
        toast({ 
          title: 'Remolque guardado, error en documentos', 
          description: 'El remolque se guardó correctamente pero hubo un error subiendo los documentos',
          variant: 'destructive' 
        });
      }

      // Mostrar éxito y actualizar estado local para reflejar cambios de inmediato
      toast({ title: editingRemolque ? 'Remolque actualizado' : 'Remolque guardado', variant: 'success' });

      // If we have an inserted/updated remolque, update local list for immediate UI feedback
      try {
        if (editingRemolque && remolqueId) {
          // updatedRemolque may be available when updating; try to find it via cargarDatos fallback
          // Replace the remolque in local state if present
          setRemolques((prev) => prev.map(r => (r.id === remolqueId ? ({ ...r, ...remolqueData, id: remolqueId } as any) : r)));
        } else if (!editingRemolque && remolqueId) {
          // New remolque created: append a minimal item (will be refreshed by cargarDatos)
          setRemolques((prev) => [{ ...remolqueData, id: remolqueId, fecha_registro: new Date().toISOString() } as any, ...prev]);
        }
      } catch (e) {
        console.warn('No se pudo actualizar estado local de remolques:', e);
      }

      // Refresh full dataset to ensure server-side canonical state
      await cargarDatos();
      limpiarFormulario();
      setShowForm(false);
    } catch (error) {
      console.error('Error guardando remolque:', error);
      toast({ title: 'Error al guardar remolque', variant: 'destructive' });
    } finally {
      setSaving(false);
    }

  }

  const editarRemolque = async (remolque: Remolque) => {
    setFormData({
      numeroEconomico: remolque.numero_economico || "",
      tipo: remolque.tipo || "",
      marca: remolque.marca || "",
      modelo: remolque.modelo || "",
      año: remolque.año ? String(remolque.año) : "",
      numeroSerie: remolque.numero_serie || "",
      capacidad: remolque.capacidad ? String(remolque.capacidad) : "",
      placas: remolque.placas || "",
      fechaUltimaInspeccion: remolque.fecha_ultima_inspeccion || "",
      proximaInspeccion: remolque.proxima_inspeccion || "",
      polizaSeguro: remolque.poliza_seguro || "",
      vigenciaSeguro: remolque.vigencia_seguro || "",
      estado: remolque.estado || "disponible",
      comentarios: remolque.comentarios || "",
    });
    setEditingRemolque(remolque);
    // Asegurar que remolqueDetalle esté seteado para operaciones de mantenimiento
    setRemolqueDetalle(remolque);
    // Cargar historial para que la pestaña Mantenimiento muestre datos cuando el usuario abra el modal de edición
    try {
      await cargarHistorialMantenimientoRemolque(remolque.id);
      // Cargar documentos del remolque
      await cargarDocumentosRemolque(remolque.id);
    } catch (e) {
      console.warn('No se pudo cargar historial/documentos al editar remolque', e);
    }
    setShowForm(true);
  };

  // Modal de detalles de remolque
  const [showDetallesRemolque, setShowDetallesRemolque] = useState(false);
  const [remolqueDetalle, setRemolqueDetalle] = useState<Remolque | null>(null);
  const [detalleTabRemolque, setDetalleTabRemolque] = useState('general');
  
  // Estados para actualización rápida de seguros e inspecciones
  const [showModalRenovarRemolque, setShowModalRenovarRemolque] = useState(false);
  const [tipoActualizacion, setTipoActualizacion] = useState<'inspeccion' | 'seguro' | null>(null);
  const [nuevaFechaInspeccion, setNuevaFechaInspeccion] = useState('');
  const [nuevaFechaSeguro, setNuevaFechaSeguro] = useState('');
  const [comentarioActualizacion, setComentarioActualizacion] = useState('');
  const [actualizandoRemolque, setActualizandoRemolque] = useState(false);
  
  const verDetallesRemolque = (remolque: Remolque) => {
    setRemolqueDetalle(remolque);
    setShowDetallesRemolque(true);
    setDetalleTabRemolque('general');
    cargarHistorialMantenimientoRemolque(remolque.id);
    cargarDocumentosRemolque(remolque.id);
    cargarHistorialActualizaciones(remolque.id);
  };

  // Cargar historial de mantenimiento para un remolque
  const cargarHistorialMantenimientoRemolque = async (remolqueId: string) => {
    try {
      setLoadingHistorialMantenimientoRemolque(true);
      const { data, error } = await supabase
        .from('registros_mantenimiento_remolques')
        .select('*')
        .eq('remolque_id', remolqueId)
        .order('fecha_mantenimiento', { ascending: false });
      if (error) {
        console.log('Tabla registros_mantenimiento_remolques no existe o error:', error.message);
        setHistorialMantenimientoRemolque([]);
      } else {
        setHistorialMantenimientoRemolque(data || []);
      }
    } catch (e) {
      console.error('Error cargando historial mantenimiento remolque', e);
      setHistorialMantenimientoRemolque([]);
    } finally {
      setLoadingHistorialMantenimientoRemolque(false);
    }
  };

  // Ajustar paginación del historial
  useEffect(() => {
    const totalPages = Math.ceil(historialMantenimientoRemolque.length / pageSizeMantenimientoRemolque) || 1;
    if (currentPageMantenimientoRemolque > totalPages) {
      setCurrentPageMantenimientoRemolque(totalPages);
    }
  }, [historialMantenimientoRemolque, currentPageMantenimientoRemolque, pageSizeMantenimientoRemolque]);

  // Cargar historial de actualizaciones para un remolque
  const cargarHistorialActualizaciones = async (remolqueId: string) => {
    try {
      setLoadingHistorialActualizaciones(true);
      const { data, error } = await supabase
        .from('historial_actualizaciones_remolques')
        .select('*')
        .eq('remolque_id', remolqueId)
        .order('fecha_registro', { ascending: false });

      if (error) {
        console.log('Tabla historial_actualizaciones_remolques no existe o error:', error.message);
        setHistorialActualizaciones([]);
      } else {
        setHistorialActualizaciones(data || []);
      }
    } catch (e) {
      console.error('Error cargando historial de actualizaciones', e);
      setHistorialActualizaciones([]);
    } finally {
      setLoadingHistorialActualizaciones(false);
    }
  };

  const resetFormMantenimientoRemolque = () => {
    setMantenimientoRemolqueFormData({
      fecha_mantenimiento: "",
      tipo_mantenimiento: "preventivo",
      detalles_mantenimiento: "",
      proximo_mantenimiento: "",
    });
  };

  // Funciones SIMPLES para actualización rápida
  const cerrarModalActualizacion = () => {
    setShowModalRenovarRemolque(false);
    setTipoActualizacion(null);
    setNuevaFechaInspeccion('');
    setNuevaFechaSeguro('');
    setComentarioActualizacion('');
  };

  const abrirModalActualizarInspeccion = () => {
    if (!remolqueDetalle) {
      toast({ title: "Error", description: "No hay remolque seleccionado", variant: "destructive" });
      return;
    }
    setTipoActualizacion('inspeccion');
    setNuevaFechaInspeccion('');
    setShowModalRenovarRemolque(true);
  };

  const abrirModalActualizarSeguro = () => {
    if (!remolqueDetalle) {
      toast({ title: "Error", description: "No hay remolque seleccionado", variant: "destructive" });
      return;
    }
    setTipoActualizacion('seguro');
    setNuevaFechaSeguro('');
    setShowModalRenovarRemolque(true);
  };

  const actualizarFechaRemolque = async () => {
    if (!remolqueDetalle) return;

    try {
      setActualizandoRemolque(true);
      const actualizaciones: any = {};
      let mensaje = '';

      // Debug logs para verificar fechas
      console.log('🔍 DEBUG - Fechas antes de procesar:');
      console.log('- remolqueDetalle.proxima_inspeccion:', remolqueDetalle.proxima_inspeccion);
      console.log('- nuevaFechaInspeccion:', nuevaFechaInspeccion);
      console.log('- nuevaFechaSeguro:', nuevaFechaSeguro);

      if (tipoActualizacion === 'inspeccion' && nuevaFechaInspeccion) {
        // La fecha actual de próxima inspección se convierte en última inspección
        if (remolqueDetalle.proxima_inspeccion) {
          // Normalizar la fecha actual para evitar problemas de zona horaria
          actualizaciones.fecha_ultima_inspeccion = normalizeDate(remolqueDetalle.proxima_inspeccion);
          console.log('🔍 DEBUG - fecha_ultima_inspeccion normalizada:', actualizaciones.fecha_ultima_inspeccion);
        }
        // La nueva fecha se convierte en próxima inspección (también normalizada)
        actualizaciones.proxima_inspeccion = normalizeDate(nuevaFechaInspeccion);
        console.log('🔍 DEBUG - proxima_inspeccion normalizada:', actualizaciones.proxima_inspeccion);
        mensaje = `Próxima inspección actualizada a ${new Date(nuevaFechaInspeccion).toLocaleDateString('es-MX')}`;
      } else if (tipoActualizacion === 'seguro' && nuevaFechaSeguro) {
        actualizaciones.vigencia_seguro = normalizeDate(nuevaFechaSeguro);
        mensaje = `Fecha de vigencia del seguro actualizada a ${new Date(nuevaFechaSeguro).toLocaleDateString('es-MX')}`;
      }

      if (Object.keys(actualizaciones).length === 0) {
        toast({ title: "Error", description: "Debes ingresar una fecha válida", variant: "destructive" });
        return;
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from('remolques')
        .update({
          ...actualizaciones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', remolqueDetalle.id);

      if (error) {
        console.error('Error actualizando remolque:', error);
        toast({ title: "Error al actualizar", description: "No se pudo actualizar la fecha", variant: "destructive" });
        return;
      }

      // Actualizar el estado local
      setRemolqueDetalle(prev => prev ? { ...prev, ...actualizaciones } : null);

      // Registrar en el historial de actualizaciones
      try {
        const fechaAnterior = tipoActualizacion === 'inspeccion' 
          ? remolqueDetalle.proxima_inspeccion 
          : remolqueDetalle.vigencia_seguro;
        
        const fechaNueva = tipoActualizacion === 'inspeccion' 
          ? nuevaFechaInspeccion 
          : nuevaFechaSeguro;

        await supabase.from('historial_actualizaciones_remolques').insert({
          remolque_id: remolqueDetalle.id,
          numero_economico: remolqueDetalle.numero_economico,
          tipo_actualizacion: tipoActualizacion,
          fecha_anterior: fechaAnterior ? normalizeDate(fechaAnterior) : null,
          fecha_nueva: normalizeDate(fechaNueva),
          comentario: comentarioActualizacion || null,
          fecha_registro: new Date().toISOString()
        });
      } catch (historialError) {
        console.error('Error registrando en historial:', historialError);
        // No fallar la operación por error en historial
      }

      // Recargar la lista de remolques
      await cargarDatos();

      // Registrar en audit log con comentario si existe
      const detalles = comentarioActualizacion 
        ? `${mensaje}. Comentario: ${comentarioActualizacion}`
        : mensaje;

      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Remolques",
          `Actualización rápida - ${detalles} para remolque ${remolqueDetalle.numero_economico}`
        );
      } catch {}

      // Cerrar modal y limpiar estados
      cerrarModalActualizacion();

      toast({ title: "Actualización exitosa", description: mensaje });

    } catch (error) {
      console.error('Error en actualizarFechaRemolque:', error);
      toast({ title: "Error", description: "Ocurrió un error al actualizar", variant: "destructive" });
    } finally {
      setActualizandoRemolque(false);
    }
  };

  const agregarMantenimientoRemolque = async () => {
    if (!remolqueDetalle) return;
    if (!mantenimientoRemolqueFormData.fecha_mantenimiento || !mantenimientoRemolqueFormData.detalles_mantenimiento) {
      alert('Fecha y detalles son obligatorios');
      return;
    }
    try {
      setAddingMantenimientoRemolque(true);
      const insertData: any = {
        remolque_id: remolqueDetalle.id,
        fecha_mantenimiento: mantenimientoRemolqueFormData.fecha_mantenimiento,
        tipo_mantenimiento: mantenimientoRemolqueFormData.tipo_mantenimiento,
        detalles_mantenimiento: mantenimientoRemolqueFormData.detalles_mantenimiento,
        proximo_mantenimiento: mantenimientoRemolqueFormData.proximo_mantenimiento || null,
      };
      const { error } = await supabase.from('registros_mantenimiento_remolques').insert(insertData);
      if (error) {
        console.error('Error insert mantenimiento remolque', error);
        alert('Error al guardar mantenimiento');
        return;
      }
      // Crear recordatorio si hay próximo mantenimiento
      if (mantenimientoRemolqueFormData.proximo_mantenimiento) {
        try {
          const fechaProx = new Date(mantenimientoRemolqueFormData.proximo_mantenimiento);
          const fechaRecordatorio = new Date(fechaProx);
          // 7 días antes (ajustar si se requiere otro margen)
          fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 7);
          const recordatorio = {
            titulo: `Mantenimiento Remolque ${remolqueDetalle.numero_economico}`,
            // Use shared formatter for consistent Matamoros display
            descripcion: `Mantenimiento programado el ${formatDateMatamoros(mantenimientoRemolqueFormData.proximo_mantenimiento)} para el remolque ${remolqueDetalle.numero_economico}.`,
            fecha_vencimiento: fechaRecordatorio.toISOString().split('T')[0],
            tipo: 'mantenimiento_remolque',
            prioridad: 'media',
            estado: 'pendiente',
          };
          const { error: recError } = await supabase.from('recordatorios').insert(recordatorio);
          if (recError) {
            console.warn('No se pudo crear recordatorio mantenimiento:', recError.message);
          }
        } catch (e) {
          console.warn('Fallo creando recordatorio de mantenimiento', e);
        }
      }
  toast({ title: 'Mantenimiento registrado', variant: 'success' });
      resetFormMantenimientoRemolque();
      setShowFormMantenimientoRemolque(false);
      await cargarHistorialMantenimientoRemolque(remolqueDetalle.id);
    } catch (e) {
      console.error(e);
      alert('Error al guardar mantenimiento');
    } finally {
      setAddingMantenimientoRemolque(false);
    }
  };

  const eliminarMantenimientoRemolque = async (id: string) => {
    if (!confirm('¿Eliminar registro de mantenimiento?')) return;
    try {
      const { error } = await supabase.from('registros_mantenimiento_remolques').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar');
        return;
      }
      if (remolqueDetalle) await cargarHistorialMantenimientoRemolque(remolqueDetalle.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Exportar remolque individual a CSV (Excel)
  const descargarExcelRemolque = (remolque: Remolque) => {
    if (!remolque) return;

    const esc = (v: any) => `"\t${(v ?? '').toString().replace(/"/g,'""')}"`;
    const headers: string[] = [
      'Número Económico','Tipo','Marca','Modelo','Año','Número Serie','Capacidad (ton)','Placas','Última Inspección','Próxima Inspección','Póliza Seguro','Vigencia Seguro','Estado','Activo','Fecha Registro','Comentarios'
    ];
    const row: string[] = [
      esc(remolque.numero_economico),
      esc(remolque.tipo || ''),
      esc(remolque.marca || ''),
      esc(remolque.modelo || ''),
      esc(remolque.año || ''),
      esc(remolque.numero_serie || ''),
      esc(remolque.capacidad || ''),
      esc(remolque.placas || ''),
      esc(remolque.fecha_ultima_inspeccion ? new Date(remolque.fecha_ultima_inspeccion).toISOString().split('T')[0] : ''),
      esc(remolque.proxima_inspeccion ? new Date(remolque.proxima_inspeccion).toISOString().split('T')[0] : ''),
      esc(remolque.poliza_seguro || ''),
      esc(remolque.vigencia_seguro ? new Date(remolque.vigencia_seguro).toISOString().split('T')[0] : ''),
      esc(remolque.estado || ''),
      esc(remolque.activo !== false ? 'Activo' : 'Inactivo'),
      esc(remolque.fecha_registro ? new Date(remolque.fecha_registro).toISOString().split('T')[0] : ''),
      esc(remolque.comentarios || '')
    ];

    // Construir contenido CSV incluyendo sección de historial de mantenimiento
    const lines: string[] = [];
    lines.push(headers.join(','));
    lines.push(row.join(','));
    // Sección de historial de mantenimiento
    lines.push('');
    lines.push('"Historial de Mantenimiento"');
    const maintHeaders = ['Fecha','Tipo','Detalles','Próximo Mantenimiento'];
    lines.push(maintHeaders.join(','));
    if (historialMantenimientoRemolque && historialMantenimientoRemolque.length > 0) {
      for (const reg of historialMantenimientoRemolque) {
        const mrow = [
          esc(reg.fecha_mantenimiento ? formatDateMatamoros(reg.fecha_mantenimiento) : ''),
          esc(reg.tipo_mantenimiento || ''),
          esc(reg.detalles_mantenimiento || ''),
          esc(reg.proximo_mantenimiento ? formatDateMatamoros(reg.proximo_mantenimiento) : ''),
        ];
        lines.push(mrow.join(','));
      }
    } else {
      lines.push('"Sin registros de mantenimiento"');
    }

    const contenido = lines.join('\n');
    const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `remolque_${remolque.numero_economico}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit log: exportación individual de remolque
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Remolques",
        `Descargó reporte del remolque ${remolque.numero_economico} (ID: ${remolque.id})`
      );
    } catch {}
  };

  // Funciones para manejo de documentos de remolques
  const cargarDocumentosRemolque = async (remolqueId: string) => {
    try {
      console.log('🔍 Cargando documentos para remolque ID:', remolqueId);
      setLoadingDocumentosRemolque(true);
      const documentos = await listarDocumentosRemolque(remolqueId);
      console.log('📄 Documentos cargados:', documentos);
      console.log('📊 Cantidad de documentos:', documentos.length);
      setDocumentosRemolque(documentos);
    } catch (error) {
      console.error('❌ Error cargando documentos del remolque:', error);
      toast({ 
        title: 'Error cargando documentos', 
        description: 'No se pudieron cargar los documentos del remolque',
        variant: 'destructive' 
      });
    } finally {
      setLoadingDocumentosRemolque(false);
    }
  };

  const handleDocumentosSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Verificar límite de 8 documentos
    const totalDocumentos = documentosRemolque.length + documentosSeleccionados.length + files.length;
    if (totalDocumentos > 8) {
      toast({ 
        title: 'Límite excedido', 
        description: `Solo puedes tener máximo 8 documentos. Actualmente tienes ${documentosRemolque.length + documentosSeleccionados.length} y estás agregando ${files.length}.`,
        variant: 'destructive' 
      });
      return;
    }

    // Validar cada archivo
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          title: 'Archivo muy grande', 
          description: `El archivo ${file.name} es muy grande. Tamaño máximo: 10MB`,
          variant: 'destructive' 
        });
        return;
      }

      const tiposPermitidos = [
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/webp", "application/pdf"
      ];
      
      if (!tiposPermitidos.includes(file.type)) {
        toast({ 
          title: 'Tipo no permitido', 
          description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten imágenes y PDFs`,
          variant: 'destructive' 
        });
        return;
      }
    }

    setDocumentosSeleccionados(prev => [...prev, ...files]);
  };

  const eliminarDocumentoSeleccionado = (index: number) => {
    setDocumentosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  const subirDocumentosRemolque = async (remolqueId: string) => {
    if (documentosSeleccionados.length === 0) return [];
    
    try {
      setUploadingDocumentos(true);
      const resultados: string[] = [];

      // Verificar que tenemos un remolqueId válido
      if (!remolqueId || remolqueId.trim() === '') {
        throw new Error('ID del remolque no válido');
      }

      for (const file of documentosSeleccionados) {
        try {
          const { url, pathname } = await subirDocumentoRemolque(
            remolqueId, 
            file, 
            'documento_general'
          );

          // Guardar en la base de datos
          const documentData = {
            remolque_id: remolqueId,
            tipo_documento: 'documento_general',
            nombre_archivo: file.name,
            url_blob: url,
            pathname: pathname,
            tamano_bytes: file.size,
            tipo_mime: file.type,
            subido_por: 'Usuario',
            activo: true
          };

          console.log('Insertando documento con remolqueId:', remolqueId);
          console.log('Datos del documento:', documentData);

          const { data, error } = await supabase.from('documentos_remolques').insert(documentData).select();

          if (error) {
            console.error('Error detallado guardando documento en BD:', {
              error,
              errorMessage: error.message,
              errorCode: error.code,
              errorDetails: error.details,
              errorHint: error.hint,
              remolqueId,
              fileName: file.name
            });
            
            // Verificar si es un error de tabla que no existe
            if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
              throw new Error(`La tabla documentos_remolques no existe en la base de datos. Ejecuta el script de creación primero.`);
            }
            
            throw new Error(`Error guardando ${file.name}: ${error.message || 'Error desconocido'}`);
          }

          console.log('Documento guardado exitosamente:', data);

          resultados.push(file.name);
        } catch (error) {
          console.error(`Error subiendo ${file.name}:`, error);
          throw error;
        }
      }

      // Limpiar archivos seleccionados y recargar documentos
      setDocumentosSeleccionados([]);
      await cargarDocumentosRemolque(remolqueId);
      
      return resultados;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/almacenamiento|quota|insufficient|507/i.test(msg)) {
        toast({ 
          title: 'Almacenamiento lleno', 
          description: 'El almacenamiento está lleno. Contacta al administrador.',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Error subiendo documentos', 
          description: msg,
          variant: 'destructive' 
        });
      }
      throw error;
    } finally {
      setUploadingDocumentos(false);
    }
  };

  const eliminarDocumentoRemolqueBD = async (documento: DocumentoRemolque) => {
    try {
      await eliminarDocumentoRemolque(documento.id);
      await cargarDocumentosRemolque(documento.remolque_id);
      toast({ 
        title: 'Documento eliminado', 
        description: 'El documento se eliminó correctamente',
        variant: 'default' 
      });
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast({ 
        title: 'Error eliminando documento', 
        description: 'No se pudo eliminar el documento',
        variant: 'destructive' 
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (tipoMime?: string) => {
    if (!tipoMime) return <FileText className="w-12 h-12" />;
    
    if (tipoMime.includes('pdf')) {
      return (
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (tipoMime.startsWith('image/')) {
      return (
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return <FileText className="w-12 h-12" />;
  };

  const getFileTypeColor = (tipoMime?: string) => {
    if (!tipoMime) return 'text-gray-400';
    if (tipoMime.includes('pdf')) return 'text-red-500';
    if (tipoMime.startsWith('image/')) return 'text-blue-500';
    return 'text-gray-400';
  };

  const eliminarRemolque = async (id: string) => {
    try {
      // Verificar que el REMOLQUE esté INACTIVO antes de eliminar
      const remolque = remolques.find((r) => r.id === id);
      if (!remolque) {
        toast({ title: 'Remolque no encontrado', variant: 'destructive' });
        return;
      }

      if (remolque.activo !== false) {
        setNotificationMessage("Para eliminar este remolque primero debes cambiarlo a estado INACTIVO. Luego intenta nuevamente.");
        setNotificationFolios([]);
        setNotificationOpen(true);
        return;
      }

      // Verificar que NO tenga embarques ACTIVOS
      // Activos = cualquier embarque cuyo estado NO esté 'archivado' NI 'cancelado'
      const { data: embarquesActivos, error: embarquesError } = await supabase
        .from("embarques")
        .select("id, folio, estado")
        .eq("remolque_id", id)
        .not("estado", "in", "(archivado,cancelado)")
        .limit(10);

      if (embarquesError) {
        console.error("Error verificando embarques:", embarquesError);
  toast({ title: 'Error al verificar embarques activos', variant: 'destructive' });
        return;
      }

      if (embarquesActivos && embarquesActivos.length > 0) {
        const folios = embarquesActivos.map((e) => `${e.folio || e.id} (${e.estado})`).filter(Boolean) as string[];
        setNotificationMessage(`No es posible eliminar el remolque ${remolque.numero_economico} porque tiene ${embarquesActivos.length} embarque(s) activo(s).`);
        setNotificationFolios(folios.slice(0, 20));
        setNotificationOpen(true);
        return;
      }

  // Proceder con la eliminación (la confirmación se muestra mediante AlertDialog en la UI)
      const { error } = await supabase.from("remolques").delete().eq("id", id);

      if (error) {
        console.error('Error eliminando remolque:', error);
        toast({ title: 'Error al eliminar remolque', variant: 'destructive' });
        return;
      }

      toast({ title: 'Remolque eliminado exitosamente', variant: 'destructive' });
      // Audit log: eliminación de remolque
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Remolques",
          `Eliminó remolque ${remolque.numero_economico} (ID: ${id})`
        );
      } catch {}
      await cargarDatos();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: 'Error al eliminar remolque', variant: 'destructive' });
    }
  };

  const toggleActivarRemolque = (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setPendingToggleRemolque({ id, nuevoEstado, abierto: true });
  };

  // Función para verificar si una fecha está próxima a vencer
  const estaProximoAVencer = (fecha: string, diasAnticipacion = 30) => {
    if (!fecha) return false;
    const fechaVencimiento = new Date(fecha);
    const hoy = new Date();
    const diferenciaDias = Math.ceil(
      (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diferenciaDias <= diasAnticipacion && diferenciaDias >= 0;
  };

  // Función para verificar si una fecha ya venció
  const yaVencio = (fecha: string) => {
    if (!fecha) return false;
    const fechaVencimiento = new Date(fecha);
    const hoy = new Date();
    return fechaVencimiento < hoy;
  };

  const remolquesFiltrados = remolques.filter(
    (remolque) =>
      remolque.numero_economico
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (remolque.marca &&
        remolque.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (remolque.modelo &&
        remolque.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (remolque.placas &&
        remolque.placas.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Derivados de paginación
  const totalPages = Math.max(
    1,
    Math.ceil(remolquesFiltrados.length / Math.max(1, pageSize))
  );
  // Asegurar página válida si cambia el filtro o el tamaño
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const remolquesPaginados = remolquesFiltrados.slice(start, end);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando remolques...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
        {/* AlertDialog for activar/desactivar remolque (replaces confirm) */}
        <AlertDialog open={!!pendingToggleRemolque?.abierto} onOpenChange={(v) => {
          if (!v) setPendingToggleRemolque(null);
          else if (pendingToggleRemolque) setPendingToggleRemolque({...pendingToggleRemolque, abierto: v});
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingToggleRemolque?.nuevoEstado ? 'Activar remolque' : 'Desactivar remolque'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingToggleRemolque?.nuevoEstado
                  ? '¿Estás seguro de que deseas activar este remolque? El remolque será activado y estará disponible para asignaciones.'
                  : '¿Estás seguro de que deseas desactivar este remolque? El remolque será desactivado y no estará disponible para asignaciones.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!pendingToggleRemolque) return;
                const { id, nuevoEstado } = pendingToggleRemolque;
                try {
                  const updateObj: any = { activo: nuevoEstado, updated_at: new Date().toISOString() };
                  // If marking as inactive, also set estado to 'fuera-de-servicio' so system counts it correctly
                  if (nuevoEstado === false) {
                    updateObj.estado = 'fuera-de-servicio';
                  } else if (nuevoEstado === true) {
                    // Al reactivar, marcar como disponible para que aparezca en el contador de 'Disponibles'
                    updateObj.estado = 'disponible';
                  }
                  const { error } = await supabase
                    .from('remolques')
                    .update(updateObj)
                    .eq('id', id);
                  if (error) {
                    console.error('Error actualizando estado del remolque:', error);
                    toast({ title: 'Error al actualizar el estado del remolque', variant: 'destructive' });
                  } else {
                    toast({ title: nuevoEstado ? 'Remolque activado' : 'Remolque desactivado', description: nuevoEstado ? undefined : 'El remolque ha sido marcado como fuera de servicio', variant: 'success' });
                    try { agregarAuditLog('ACTUALIZAR', 'Remolques', `Cambió estado del remolque (ID: ${id}) a ${nuevoEstado ? 'activo' : 'inactivo'}`); } catch {}
                    await cargarDatos();
                  }
                } catch (e) {
                  console.error('Error:', e);
                  toast({ title: 'Error al cambiar el estado del remolque', variant: 'destructive' });
                } finally {
                  setPendingToggleRemolque(null);
                }
              }} className="bg-green-600 hover:bg-green-700 text-white">Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <div className="space-y-6">
        <div className="flex justify-between items-center relative">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Remolques
            </h1>
            <p className="text-gray-600 mt-2">Administrar la flota de remolques</p>
            <div className="absolute right-0 flex items-center gap-2 -translate-y-14">
              <Button
                variant="outline"
                onClick={() => descargarReporteRemolques()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                Descargar Reporte
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowMarcasRemolque(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Marcas de Remolques
              </Button>

              <Button
                onClick={() => { limpiarFormulario(); setShowForm(true); }}
                className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Remolque
              </Button>
            </div>
            {/* Modal para gestionar marcas de remolques */}
            <Dialog
              open={showMarcasRemolque}
              onOpenChange={setShowMarcasRemolque}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Gestionar Marcas de Remolques</DialogTitle>
                  <DialogDescription>
                    Aquí puedes agregar, editar o eliminar marcas de remolques.
                  </DialogDescription>
                </DialogHeader>
                {/* Gestión de marcas de remolques: cards en grid, scroll, crear y editar */}
                <div className="py-2">
                  <form
                    className="flex gap-2 mb-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!nuevaMarcaNombre.trim()) return;
                      setAgregandoMarca(true);
                      if (editandoMarcaId) {
                        // Editar marca existente
                        const { error } = await supabase
                          .from("marcas_remolques")
                          .update({ nombre: nuevaMarcaNombre.trim() })
                          .eq("id", editandoMarcaId);
                        if (!error) {
                          setEditandoMarcaId(null);
                          setNuevaMarcaNombre("");
                          await cargarDatos();
                          toast({ title: 'Marca actualizada', variant: 'success' });
                        } else {
                          toast({ title: 'Error al editar marca', variant: 'destructive' });
                        }
                      } else {
                        // Crear nueva marca
                        const { error } = await supabase
                          .from("marcas_remolques")
                          .insert({
                            nombre: nuevaMarcaNombre.trim(),
                            activa: true,
                          });
                        if (!error) {
                          setNuevaMarcaNombre("");
                          await cargarDatos();
                          // Popo-style green toast to notify success
                          toast({ title: 'Marca registrada', description: 'Nueva marca de remolque registrada correctamente.', variant: 'success' });
                        } else {
                          toast({ title: 'Error al agregar marca', variant: 'destructive' });
                        }
                      }
                      setAgregandoMarca(false);
                    }}
                  >
                    <Input
                      placeholder={
                        editandoMarcaId
                          ? "Editar marca"
                          : "Nueva marca de remolque"
                      }
                      value={nuevaMarcaNombre}
                      onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                      className="flex-1"
                      disabled={agregandoMarca}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={agregandoMarca || !nuevaMarcaNombre.trim()}
                      className={
                        editandoMarcaId
                          ? "border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }
                    >
                      {editandoMarcaId ? "Guardar" : "Agregar"}
                    </Button>
                    {editandoMarcaId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditandoMarcaId(null);
                          setNuevaMarcaNombre("");
                        }}
                        disabled={agregandoMarca}
                      >
                        Cancelar
                      </Button>
                    )}
                  </form>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                    {marcas.map((marca) => (
                      <div
                        key={marca.id}
                        className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between shadow-sm"
                      >
                        <span className="font-medium text-gray-800 truncate max-w-[120px]">
                          {marca.nombre}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar"
                            onClick={() => {
                              setEditandoMarcaId(marca.id);
                              setNuevaMarcaNombre(marca.nombre);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Eliminar"
                            onClick={() => setPendingDeleteMarca({ id: marca.id, nombre: marca.nombre, abierto: true })}
                            disabled={deletingMarcaId === marca.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Confirmation dialog for deleting a marca (popo-style) */}
            <AlertDialog open={!!pendingDeleteMarca?.abierto} onOpenChange={(v)=>{ if(!v) setPendingDeleteMarca(null); else if(pendingDeleteMarca) setPendingDeleteMarca({...pendingDeleteMarca, abierto: v}); }}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Deseas eliminar la marca <strong>{pendingDeleteMarca?.nombre}</strong>? Esta acción desactivará la marca y no eliminará los registros históricos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async ()=>{
                    if(!pendingDeleteMarca) return;
                    const id = pendingDeleteMarca.id;
                    try{
                      setDeletingMarcaId(id);
                      const { error } = await supabase.from('marcas_remolques').update({ activa: false }).eq('id', id);
                      if(error){
                        console.error('Error desactivando marca:', error);
                        toast({ title: 'Error al eliminar marca', variant: 'destructive' });
                      } else {
                        toast({ title: 'Marca eliminada', variant: 'destructive' });
                        try{ agregarAuditLog('ELIMINAR','MarcasRemolques', `Desactivó marca ${pendingDeleteMarca.nombre} (ID: ${id})`); }catch{}
                        await cargarDatos();
                      }
                    }catch(e){
                      console.error(e);
                      toast({ title: 'Error al eliminar marca', variant: 'destructive' });
                    }finally{
                      setDeletingMarcaId(null);
                      setPendingDeleteMarca(null);
                    }
                  }} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {/* Notification dialog for remolques (replaces alerts) */}
            <Dialog open={notificationOpen} onOpenChange={(o)=>{setNotificationOpen(o); if(!o) setNotificationMessage(""); setNotificationFolios([]);}}>
              {/* Consider this a warning modal when the message indicates deletion is blocked or asks to set to INACTIVO */}
              <DialogContent className={
                notificationMessage && (
                  notificationMessage.includes("No es posible eliminar el remolque") ||
                  notificationMessage.includes("Para eliminar este remolque") ||
                  notificationMessage.includes("INACTIVO")
                )
                  ? "max-w-md bg-red-50 border border-red-200"
                  : "max-w-sm"
              }>
                <DialogHeader>
                  {(notificationMessage && (
                    notificationMessage.includes("No es posible eliminar el remolque") ||
                    notificationMessage.includes("Para eliminar este remolque") ||
                    notificationMessage.includes("INACTIVO")
                  )) ? (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <DialogTitle>Aviso</DialogTitle>
                    </div>
                  ) : (
                    <DialogTitle>Notificación</DialogTitle>
                  )}
                  <DialogDescription className={
                    notificationMessage && (
                      notificationMessage.includes("No es posible eliminar el remolque") ||
                      notificationMessage.includes("Para eliminar este remolque") ||
                      notificationMessage.includes("INACTIVO")
                    )
                      ? "text-red-700"
                      : undefined
                  }>
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
                  <Button onClick={()=>setNotificationOpen(false)} className={
                    notificationMessage && (
                      notificationMessage.includes("No es posible eliminar el remolque") ||
                      notificationMessage.includes("Para eliminar este remolque") ||
                      notificationMessage.includes("INACTIVO")
                    )
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : undefined
                  }>
                    Aceptar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showForm} onOpenChange={(open)=>{
              setShowForm(open);
              if(!open && remolqueDetalle){
                const actualizado = remolques.find(r=>r.id===remolqueDetalle.id);
                if(actualizado) setRemolqueDetalle(actualizado);
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle>
                        {editingRemolque ? "Modificar Remolque" : "Nuevo Remolque"}
                      </DialogTitle>
                      <DialogDescription>
                        Completa la información del remolque
                      </DialogDescription>
                    </div>
                    {!editingRemolque && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generarDatosAleatorios}
                        className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto-completar
                      </Button>
                    )}
                  </div>
                </DialogHeader>
                

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className={`grid w-full ${editingRemolque ? "grid-cols-6" : "grid-cols-5"}`}>
                    <TabsTrigger value="general">
                      Información General
                    </TabsTrigger>
                    <TabsTrigger value="info-tecnica">Info Técnica</TabsTrigger>
                    <TabsTrigger value="seguros">Inspecciones & Seguros</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    {editingRemolque && (
                      <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
                    )}
                    <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general">
                    <div className="py-4">
                      <h3 className="text-lg font-medium mb-4">
                        Información Básica
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="numeroEconomico">
                            Número Económico *
                          </Label>
                          <Input
                            id="numeroEconomico"
                            value={formData.numeroEconomico}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                numeroEconomico: e.target.value,
                              })
                            }
                            placeholder="Ej: R001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo de Remolque</Label>
                          <Select
                            value={formData.tipo}
                            onValueChange={(value) =>
                              setFormData({ ...formData, tipo: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="caja-seca">
                                Caja Seca
                              </SelectItem>
                              <SelectItem value="plataforma">
                                Plataforma
                              </SelectItem>
                              <SelectItem value="refrigerado">
                                Refrigerado
                              </SelectItem>
                              <SelectItem value="tanque">Tanque</SelectItem>
                              <SelectItem value="tolva">Tolva</SelectItem>
                              <SelectItem value="lowboy">Lowboy</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="marca">Marca</Label>
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
                              {marcas.map((marca) => (
                                <SelectItem key={marca.id} value={marca.nombre}>
                                  {marca.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modelo">Modelo</Label>
                          <Input
                            id="modelo"
                            value={formData.modelo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                modelo: e.target.value,
                              })
                            }
                            placeholder="Modelo del remolque"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="año">Año</Label>
                          <Input
                            id="año"
                            type="number"
                            min="1990"
                            max={new Date().getFullYear() + 1}
                            value={formData.año}
                            onChange={(e) =>
                              setFormData({ ...formData, año: e.target.value })
                            }
                            placeholder="Año del remolque"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="info-tecnica">
                    <div className="py-4">
                      <h3 className="text-lg font-medium mb-4">
                        Información Técnica
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Columna 1: Número de Serie arriba, Capacidad abajo */}
                        <div className="flex flex-col gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="numeroSerie">Número de Serie</Label>
                            <Input
                              id="numeroSerie"
                              value={formData.numeroSerie}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  numeroSerie: e.target.value,
                                })
                              }
                              placeholder="Número de serie del remolque"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="capacidad">
                              Capacidad (toneladas)
                            </Label>
                            <Input
                              id="capacidad"
                              type="number"
                              step="0.1"
                              value={formData.capacidad}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  capacidad: e.target.value,
                                })
                              }
                              placeholder="Capacidad de carga"
                            />
                          </div>
                        </div>
                        {/* Columna 2: Placas arriba, Estado abajo */}
                        <div className="flex flex-col gap-6">
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
                              placeholder="Número de placas"
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
                    </div>
                  </TabsContent>

                  <TabsContent value="seguros">
                    <div className="space-y-4 py-4">
                      <h3 className="text-lg font-medium">
                        Inspecciones y Seguro
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fechaUltimaInspeccion">
                            Fecha Última Inspección
                          </Label>
                          <Input
                            id="fechaUltimaInspeccion"
                            type="date"
                            value={formData.fechaUltimaInspeccion}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                fechaUltimaInspeccion: e.target.value,
                              })
                            }
                            disabled={!!editingRemolque}
                            className={!!editingRemolque ? "bg-gray-100 cursor-not-allowed" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="proximaInspeccion">
                            Próxima Inspección
                          </Label>
                          <Input
                            id="proximaInspeccion"
                            type="date"
                            value={formData.proximaInspeccion}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                proximaInspeccion: e.target.value,
                              })
                            }
                            disabled={!!editingRemolque}
                            className={!!editingRemolque ? "bg-gray-100 cursor-not-allowed" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="polizaSeguro">
                            Número de Póliza de Seguro
                          </Label>
                          <Input
                            id="polizaSeguro"
                            value={formData.polizaSeguro}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                polizaSeguro: e.target.value,
                              })
                            }
                            placeholder="Número de póliza"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vigenciaSeguro">
                            Vigencia del Seguro
                          </Label>
                          <Input
                            id="vigenciaSeguro"
                            type="date"
                            value={formData.vigenciaSeguro}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vigenciaSeguro: e.target.value,
                              })
                            }
                            disabled={!!editingRemolque}
                            className={!!editingRemolque ? "bg-gray-100 cursor-not-allowed" : ""}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos">
                    <div className="py-4 space-y-4">
                      <h3 className="text-lg font-medium mb-4">Documentos del Remolque</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Sube hasta 8 documentos relacionados con el remolque (pólizas, verificaciones, manuales, etc.). 
                        Formatos permitidos: imágenes y PDFs. Tamaño máximo: 10MB por archivo.
                      </p>
                      
                      {/* Área de carga de documentos */}
                      <div className="space-y-4">
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const files = Array.from(e.dataTransfer?.files || []);
                            
                            // Validar archivos directamente
                            const totalDocumentos = documentosRemolque.length + documentosSeleccionados.length + files.length;
                            if (totalDocumentos > 8) {
                              toast({ 
                                title: 'Límite excedido', 
                                description: `Solo puedes tener máximo 8 documentos. Actualmente tienes ${documentosRemolque.length + documentosSeleccionados.length} y estás agregando ${files.length}.`,
                                variant: 'destructive' 
                              });
                              return;
                            }

                            // Validar cada archivo
                            for (const file of files) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({ 
                                  title: 'Archivo muy grande', 
                                  description: `El archivo ${file.name} es muy grande. Tamaño máximo: 10MB`,
                                  variant: 'destructive' 
                                });
                                return;
                              }

                              const tiposPermitidos = [
                                "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/webp", "application/pdf"
                              ];
                              
                              if (!tiposPermitidos.includes(file.type)) {
                                toast({ 
                                  title: 'Tipo no permitido', 
                                  description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten imágenes y PDFs`,
                                  variant: 'destructive' 
                                });
                                return;
                              }
                            }

                            setDocumentosSeleccionados(prev => [...prev, ...files]);
                          }}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                          onClick={() => document.getElementById('documentos-input')?.click()}
                        >
                          <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Arrastra documentos aquí o haz clic para seleccionar
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Máximo 8 archivos • Imágenes y PDFs • 10MB por archivo
                          </p>
                        </div>

                        <input
                          id="documentos-input"
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleDocumentosSelect}
                          className="hidden"
                        />

                        {/* Archivos seleccionados (pendientes de subir) */}
                        {documentosSeleccionados.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700">Archivos seleccionados ({documentosSeleccionados.length}):</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {documentosSeleccionados.map((file, index) => (
                                <div key={index} className="relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                  {/* Vista en miniatura */}
                                  <div className="relative h-24 bg-gray-50 flex items-center justify-center">
                                    {file.type.startsWith('image/') ? (
                                      <img 
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => {
                                          // Liberar memoria después de cargar la imagen
                                          setTimeout(() => {
                                            try {
                                              URL.revokeObjectURL((e.target as HTMLImageElement).src);
                                            } catch {}
                                          }, 1000);
                                        }}
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <FileText className="h-8 w-8 text-red-600" />
                                        <span className="text-xs text-gray-500 mt-1">PDF</span>
                                      </div>
                                    )}
                                    
                                    {/* Botón de eliminar en la esquina */}
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => eliminarDocumentoSeleccionado(index)}
                                      className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  {/* Información del archivo */}
                                  <div className="p-2">
                                    <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Documentos ya subidos */}
                        {editingRemolque && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm text-gray-700">Documentos subidos ({documentosRemolque.length}/8):</h4>
                              {loadingDocumentos && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  Cargando...
                                </div>
                              )}
                            </div>
                            
                            {documentosRemolque.length === 0 ? (
                              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>No hay documentos subidos</p>
                                <p className="text-xs mt-1">Los documentos aparecerán aquí después de guardar el remolque</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                {documentosRemolque.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded">
                                    <div className="flex items-center gap-3">
                                      {doc.tipo_mime?.startsWith('image/') ? (
                                        <Image className="h-5 w-5 text-green-600" />
                                      ) : (
                                        <FileText className="h-5 w-5 text-red-600" />
                                      )}
                                      <div>
                                        <p className="text-sm font-medium truncate max-w-xs">{doc.nombre_archivo}</p>
                                        <p className="text-xs text-gray-500">
                                          {doc.tamano_bytes && formatFileSize(doc.tamano_bytes)} • 
                                          {new Date(doc.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => window.open(doc.url_blob, '_blank')}
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => eliminarDocumentoRemolqueBD(doc)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Estado de carga */}
                        {uploadingDocumentos && (
                          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-blue-700">Subiendo documentos...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="mantenimiento">
                    <div className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Mantenimiento</h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setShowFormMantenimientoRemolque((s)=>!s)} className="bg-[#16A34A] hover:bg-[#12813a] text-white">
                            {showFormMantenimientoRemolque ? 'Cancelar' : 'Nuevo Mantenimiento'}
                          </Button>
                        </div>
                      </div>

                      {showFormMantenimientoRemolque && (
                        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                              <Label htmlFor="fecha_mantenimiento">Fecha *</Label>
                              <Input id="fecha_mantenimiento" type="date" value={mantenimientoRemolqueFormData.fecha_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, fecha_mantenimiento: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tipo_mantenimiento">Tipo</Label>
                              <select id="tipo_mantenimiento" value={mantenimientoRemolqueFormData.tipo_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, tipo_mantenimiento: e.target.value})} className="border rounded-md h-9 px-2 text-sm w-full bg-white">
                                <option value="preventivo">Preventivo</option>
                                <option value="correctivo">Correctivo</option>
                                <option value="revision">Revisión</option>
                                <option value="otro">Otro</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="proximo_mantenimiento">Próximo</Label>
                              <Input id="proximo_mantenimiento" type="date" value={mantenimientoRemolqueFormData.proximo_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, proximo_mantenimiento: e.target.value})} />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <Label htmlFor="detalles_mantenimiento">Detalles *</Label>
                              <Textarea id="detalles_mantenimiento" rows={2} value={mantenimientoRemolqueFormData.detalles_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, detalles_mantenimiento: e.target.value})} placeholder="Trabajo realizado, refacciones, etc." />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={()=>{resetFormMantenimientoRemolque(); setShowFormMantenimientoRemolque(false);}} disabled={addingMantenimientoRemolque}>Cancelar</Button>
                            <Button size="sm" onClick={agregarMantenimientoRemolque} disabled={addingMantenimientoRemolque} className="bg-[#16A34A] hover:bg-[#12813a] text-white">
                              {addingMantenimientoRemolque ? 'Guardando...' : 'Guardar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {loadingHistorialMantenimientoRemolque ? (
                          <p className="text-sm text-gray-500">Cargando historial...</p>
                        ) : historialMantenimientoRemolque.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">Sin registros de mantenimiento.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="overflow-x-auto border rounded-md">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-100 text-gray-700">
                                  <tr>
                                    <th className="px-2 py-2 text-left font-medium">Fecha</th>
                                    <th className="px-2 py-2 text-left font-medium">Tipo</th>
                                    <th className="px-2 py-2 text-left font-medium">Detalles</th>
                                    <th className="px-2 py-2 text-left font-medium">Próximo</th>
                                    <th className="px-2 py-2 text-left font-medium">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {historialMantenimientoRemolque.slice((currentPageMantenimientoRemolque-1)*pageSizeMantenimientoRemolque, (currentPageMantenimientoRemolque-1)*pageSizeMantenimientoRemolque + pageSizeMantenimientoRemolque).map(reg => (
                                    <tr key={reg.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-2 whitespace-nowrap">{reg.fecha_mantenimiento ? formatDateMatamoros(reg.fecha_mantenimiento) : '—'}</td>
                                      <td className="px-2 py-2 whitespace-nowrap capitalize">{reg.tipo_mantenimiento}</td>
                                      <td className="px-2 py-2 max-w-xs"><span className="line-clamp-2" title={reg.detalles_mantenimiento}>{reg.detalles_mantenimiento}</span></td>
                                      <td className="px-2 py-2 whitespace-nowrap">{reg.proximo_mantenimiento ? formatDateMatamoros(reg.proximo_mantenimiento) : '—'}</td>
                                      <td className="px-2 py-2 whitespace-nowrap">
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>eliminarMantenimientoRemolque(reg.id)}>Eliminar</Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="text-gray-600">Total: {historialMantenimientoRemolque.length}</span>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-7" disabled={currentPageMantenimientoRemolque===1} onClick={()=>setCurrentPageMantenimientoRemolque(p=>Math.max(1,p-1))}>Anterior</Button>
                                <span>Página {currentPageMantenimientoRemolque} de {Math.ceil(historialMantenimientoRemolque.length / pageSizeMantenimientoRemolque) || 1}</span>
                                <Button variant="outline" size="sm" className="h-7" disabled={currentPageMantenimientoRemolque >= Math.ceil(historialMantenimientoRemolque.length / pageSizeMantenimientoRemolque)} onClick={()=>setCurrentPageMantenimientoRemolque(p=>p+1)}>Siguiente</Button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>Por página:</span>
                                <select value={pageSizeMantenimientoRemolque} onChange={e=>{setPageSizeMantenimientoRemolque(Number(e.target.value)); setCurrentPageMantenimientoRemolque(1);}} className="border rounded-md h-7 text-xs px-1">
                                  {[5,10,15,20].map(n=> <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="comentarios">
                    <div className="space-y-4 py-4">
                      <h3 className="text-lg font-medium">
                        Comentarios y Observaciones
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="comentarios">Comentarios</Label>
                        <Textarea
                          id="comentarios"
                          value={formData.comentarios}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              comentarios: e.target.value,
                            })
                          }
                          placeholder="Comentarios adicionales"
                          rows={3}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={guardarRemolque} disabled={saving} className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold">
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : editingRemolque ? (
                      "Actualizar Remolque"
                    ) : (
                      "Guardar Remolque"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Remolques
                  </p>
                  <p className="text-2xl font-bold">{remolques.length}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Disponibles
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {remolques.filter((r) => r.activo !== false).length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Mantenimientos Próximos
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {remolques.filter((r) => {
                      const tieneMantenimiento = r.estado === "mantenimiento";
                      const inspeccionPróxima = r.proxima_inspeccion && estaProximoAVencer(r.proxima_inspeccion, 7);
                      return (tieneMantenimiento || inspeccionPróxima) && r.activo !== false;
                    }).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
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
                    {
                      remolques.filter((r) => r.estado === "fuera-de-servicio")
                        .length
                    }
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Inspecciones por vencer</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {remolques.filter((r) => r.proxima_inspeccion && (estaProximoAVencer(r.proxima_inspeccion, 15) || yaVencio(r.proxima_inspeccion))).length}
                  </p>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium text-gray-600">Seguros por vencer</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {remolques.filter((r) => r.vigencia_seguro && (estaProximoAVencer(r.vigencia_seguro, 15) || yaVencio(r.vigencia_seguro))).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda + paginación superior */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número económico, marca, modelo o placas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-72 sm:w-80 md:w-96 lg:w-[460px] xl:w-[520px]"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Página {page} de {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
                <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Cards por fila:</span>
                  <Select
                    value={String(cardsPerRow)}
                    onValueChange={(v) => {
                      const n = Number.parseInt(v, 10) || 3;
                      setCardsPerRow(n);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 por fila</SelectItem>
                      <SelectItem value="3">3 por fila</SelectItem>
                      <SelectItem value="4">4 por fila</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          </CardContent>
        </Card>

  {/* Lista de remolques (paginada) */}
  <div className={getGridClass(cardsPerRow)}>
          {remolquesPaginados.map((remolque) => (
            <Card key={remolque.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      <span>{remolque.numero_economico}</span>
                      {remolque.marca && remolque.modelo && (
                        <>
                          <br />
                          <span className="text-lg font-semibold">{`${remolque.marca} ${remolque.modelo}`}</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {remolque.tipo && `Tipo: ${remolque.tipo}`}
                      {remolque.año && ` • Año: ${remolque.año}`}
                      {remolque.capacidad &&
                        ` • Capacidad: ${remolque.capacidad} ton`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Badge de estado activo/inactivo */}
                    <Badge
                      variant={remolque.activo !== false ? "default" : "destructive"}
                      className={
                        remolque.activo !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800 border border-red-300"
                      }
                    >
                      {remolque.activo !== false ? "Activo" : "Inactivo"}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verDetallesRemolque(remolque)}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleActivarRemolque(
                          remolque.id,
                          remolque.activo !== false
                        )
                      }
                      className={
                        remolque.activo !== false
                          ? "text-red-600 hover:text-red-700"
                          : "text-green-600 hover:text-green-700"
                      }
                    >
                      {remolque.activo !== false ? (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar remolque?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará
                            permanentemente el remolque y todos sus datos
                            asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => eliminarRemolque(remolque.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alertas de fechas próximas - ahora arriba, entre encabezado (tipo/año) y datos (placas/serie) */}
                {(() => {
                  const alertas = [] as Array<{
                    tipo: "inspeccion" | "seguro";
                    dias: number;
                    vencido: boolean;
                    fecha: string;
                    mensaje: string;
                  }>;
                  const hoy = new Date();

                  // Verificar inspección próxima (7 días)
                  if (remolque.proxima_inspeccion) {
                    const fechaInspeccion = new Date(remolque.proxima_inspeccion);
                    const diasRestantes = Math.ceil(
                      (fechaInspeccion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (diasRestantes <= 7 && diasRestantes >= 0) {
                      alertas.push({
                        tipo: "inspeccion",
                        dias: diasRestantes,
                        vencido: false,
                        fecha: formatDateMatamoros(remolque.proxima_inspeccion),
                        mensaje: `Inspección vence en ${diasRestantes} días`,
                      });
                    } else if (diasRestantes < 0) {
                      alertas.push({
                        tipo: "inspeccion",
                        dias: Math.abs(diasRestantes),
                        vencido: true,
                        fecha: formatDateMatamoros(remolque.proxima_inspeccion),
                        mensaje: `Inspección vencida hace ${Math.abs(diasRestantes)} días`,
                      });
                    }
                  }

                  // Verificar seguro próximo a vencer (15 días)
                  if (remolque.vigencia_seguro) {
                    const fechaVencimiento = new Date(remolque.vigencia_seguro);
                    const diasRestantes = Math.ceil(
                      (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (diasRestantes <= 15 && diasRestantes >= 0) {
                      alertas.push({
                        tipo: "seguro",
                        dias: diasRestantes,
                        vencido: false,
                        fecha: formatDateMatamoros(remolque.vigencia_seguro),
                        mensaje: `Seguro vence en ${diasRestantes} días`,
                      });
                    } else if (diasRestantes < 0) {
                      alertas.push({
                        tipo: "seguro",
                        dias: Math.abs(diasRestantes),
                        vencido: true,
                        fecha: formatDateMatamoros(remolque.vigencia_seguro),
                        mensaje: `Seguro vencido hace ${Math.abs(diasRestantes)} días`,
                      });
                    }
                  }

                  return alertas.length > 0 ? (
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
                                alerta.vencido ? "text-red-600" : "text-yellow-600"
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {alerta.tipo === "seguro" ? "🛡️ Seguro" : "🔍 Inspección"}
                              </p>
                              <p className="text-xs">
                                {alerta.vencido ? "Vencido el" : "Vence el"}: {alerta.fecha}
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
                  ) : null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {remolque.placas && (
                    <div>
                      <p className="font-medium">Placas</p>
                      <p className="text-gray-600">{remolque.placas}</p>
                    </div>
                  )}
                  {remolque.numero_serie && (
                    <div>
                      <p className="font-medium">Número de Serie</p>
                      <p className="text-gray-600">{remolque.numero_serie}</p>
                    </div>
                  )}
                  {remolque.fecha_ultima_inspeccion && (
                    <div>
                      <p className="font-medium">Última Inspección</p>
                      <p className="text-gray-600">{formatDateMatamoros(remolque.fecha_ultima_inspeccion)}</p>
                    </div>
                  )}
                  {remolque.proxima_inspeccion && (
                    <div>
                      <p className="font-medium">Próxima Inspección</p>
                      <p className="text-gray-600">{formatDateMatamoros(remolque.proxima_inspeccion)}</p>
                    </div>
                  )}
                  {remolque.poliza_seguro && (
                    <div>
                      <p className="font-medium">Póliza de Seguro</p>
                      <p className="text-gray-600">{remolque.poliza_seguro}</p>
                    </div>
                  )}
                  {remolque.vigencia_seguro && (
                    <div>
                      <p className="font-medium">Vigencia Seguro</p>
                      <p className="text-gray-600">{formatDateMatamoros(remolque.vigencia_seguro)}</p>
                    </div>
                  )}
                </div>

                {remolque.comentarios && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>Comentarios:</strong> {remolque.comentarios}
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-400">Registrado: {formatDateMatamoros(remolque.fecha_registro)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal Detalles Remolque */}
        <Dialog 
          open={showDetallesRemolque} 
          onOpenChange={(o)=>{
            // No cerrar si el modal de actualización está abierto
            if (showModalRenovarRemolque) return;
            setShowDetallesRemolque(o); 
            if(!o){setRemolqueDetalle(null);} 
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {`Detalles del remolque: ${remolqueDetalle?.numero_economico ?? ""}`}
              </DialogTitle>
              <DialogDescription>Información completa y acciones del remolque seleccionado.</DialogDescription>
            </DialogHeader>
            {remolqueDetalle && (
              <div className="space-y-4">

                <Tabs value={detalleTabRemolque} onValueChange={setDetalleTabRemolque} className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="info-tecnica">Info Técnica</TabsTrigger>
                    <TabsTrigger value="seguros">Inspecciones & Seguros</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
                    <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general">
                    <div className="py-4 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Información Básica</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div><span className="font-medium text-gray-600">Número Económico:</span><p>{remolqueDetalle.numero_economico}</p></div>
                        <div><span className="font-medium text-gray-600">Tipo:</span><p>{remolqueDetalle.tipo || '—'}</p></div>
                        <div><span className="font-medium text-gray-600">Estado:</span><p>{remolqueDetalle.estado}</p></div>
                        <div><span className="font-medium text-gray-600">Marca:</span><p>{remolqueDetalle.marca || '—'}</p></div>
                        <div><span className="font-medium text-gray-600">Modelo:</span><p>{remolqueDetalle.modelo || '—'}</p></div>
                        <div><span className="font-medium text-gray-600">Año:</span><p>{remolqueDetalle.año || '—'}</p></div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="info-tecnica">
                    <div className="py-4 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Información Técnica</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div><span className="font-medium text-gray-600">Número Serie:</span><p>{remolqueDetalle.numero_serie || '—'}</p></div>
                        <div><span className="font-medium text-gray-600">Capacidad:</span><p>{remolqueDetalle.capacidad ? `${remolqueDetalle.capacidad} ton` : '—'}</p></div>
                        <div><span className="font-medium text-gray-600">Placas:</span><p>{remolqueDetalle.placas || '—'}</p></div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="seguros">
                    <div className="py-4 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Inspecciones & Seguros</h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={abrirModalActualizarInspeccion}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Actualizar Inspección
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={abrirModalActualizarSeguro}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Actualizar Seguro
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sección de Inspecciones */}
                        <div className="p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Inspecciones
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Última Inspección:</span>
                              <p className="text-gray-900">
                                {remolqueDetalle.fecha_ultima_inspeccion ? formatDateMatamoros(remolqueDetalle.fecha_ultima_inspeccion) : '—'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Próxima Inspección:</span>
                              <p className={`font-medium ${
                                remolqueDetalle.proxima_inspeccion 
                                  ? new Date(remolqueDetalle.proxima_inspeccion) < new Date() 
                                    ? 'text-red-600' 
                                    : new Date(remolqueDetalle.proxima_inspeccion) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                      ? 'text-orange-600'
                                      : 'text-green-600'
                                  : 'text-gray-500'
                              }`}>
                                {remolqueDetalle.proxima_inspeccion ? formatDateMatamoros(remolqueDetalle.proxima_inspeccion) : '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Sección de Seguros */}
                        <div className="p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            Seguro
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Póliza de Seguro:</span>
                              <p className="text-gray-900">{remolqueDetalle.poliza_seguro || '—'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Vigencia del Seguro:</span>
                              <p className={`font-medium ${
                                remolqueDetalle.vigencia_seguro 
                                  ? new Date(remolqueDetalle.vigencia_seguro) < new Date() 
                                    ? 'text-red-600' 
                                    : new Date(remolqueDetalle.vigencia_seguro) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                      ? 'text-orange-600'
                                      : 'text-green-600'
                                  : 'text-gray-500'
                              }`}>
                                {remolqueDetalle.vigencia_seguro ? formatDateMatamoros(remolqueDetalle.vigencia_seguro) : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos">
                    <div className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Documentos del Remolque</h3>
                        <span className="text-xs text-gray-500">({documentosRemolque.length} documentos)</span>
                      </div>
                      
                      {loadingDocumentosRemolque ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16A34A] mx-auto"></div>
                          <p className="text-sm text-gray-600 mt-2">Cargando documentos...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Debug info */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="col-span-full text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              Debug: {documentosRemolque.length} documentos • Remolque ID: {remolqueDetalle?.id}
                            </div>
                          )}
                          
                          {documentosRemolque.length === 0 ? (
                            <div className="col-span-full text-center py-8">
                              <FileText className="mx-auto h-12 w-12 text-gray-400" />
                              <p className="text-sm text-gray-600 mt-2">No hay documentos subidos</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {remolqueDetalle?.id ? `Buscando en remolque: ${remolqueDetalle.id}` : 'Sin ID de remolque'}
                              </p>
                            </div>
                          ) : (
                            documentosRemolque.map((doc) => (
                              <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                {/* Preview del archivo */}
                                <div className="relative h-32 bg-gray-50 flex items-center justify-center">
                                  {doc.tipo_mime?.startsWith('image/') ? (
                                    <img 
                                      src={doc.url_blob} 
                                      alt={doc.nombre_archivo}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setImagenPreview({ url: doc.url_blob, nombre: doc.nombre_archivo })}
                                      onError={(e) => {
                                        // Si falla la carga de la imagen, mostrar icono
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                                              <svg class="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>
                                              </svg>
                                              <span class="text-xs">Error de imagen</span>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  ) : doc.tipo_mime?.includes('pdf') ? (
                                    <div className={`flex flex-col items-center justify-center h-full ${getFileTypeColor(doc.tipo_mime)} cursor-pointer hover:opacity-80 transition-all`}
                                         onClick={() => window.open(doc.url_blob, '_blank')}>
                                      {getFileIcon(doc.tipo_mime)}
                                      <span className="text-xs font-medium mt-2">PDF</span>
                                    </div>
                                  ) : (
                                    <div className={`flex flex-col items-center justify-center h-full ${getFileTypeColor(doc.tipo_mime)} cursor-pointer hover:opacity-80 transition-all`}
                                         onClick={() => window.open(doc.url_blob, '_blank')}>
                                      {getFileIcon(doc.tipo_mime)}
                                      <span className="text-xs mt-2">
                                        {doc.tipo_mime?.split('/')[1]?.toUpperCase() || 'Archivo'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Overlay con tipo de archivo */}
                                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-0.5 rounded-md backdrop-blur-sm">
                                    {doc.tipo_mime?.includes('pdf') ? 'PDF' : 
                                     doc.tipo_mime?.startsWith('image/') ? 
                                       doc.tipo_mime.split('/')[1]?.toUpperCase() || 'IMG' : 
                                       'FILE'}
                                  </div>
                                  
                                  {/* Indicador de click para imágenes */}
                                  {doc.tipo_mime?.startsWith('image/') && (
                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                                      <div className="bg-white bg-opacity-90 text-gray-800 text-xs px-2 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                        Click para ampliar
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Información del archivo */}
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.nombre_archivo}>
                                        {doc.nombre_archivo}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatFileSize(doc.tamano_bytes || 0)} • {new Date(doc.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-3">
                                  <a
                                    href={doc.url_blob}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Ver
                                  </a>
                                  <button
                                    onClick={() => eliminarDocumentoRemolqueBD(doc)}
                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                                    title="Eliminar documento"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="mantenimiento">
                    <div className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Historial de Mantenimiento</h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setShowFormMantenimientoRemolque((s)=>!s)} className="bg-[#16A34A] hover:bg-[#12813a] text-white">
                            {showFormMantenimientoRemolque ? 'Cancelar' : 'Nuevo Mantenimiento'}
                          </Button>
                        </div>
                      </div>

                      {showFormMantenimientoRemolque && (
                        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                              <Label htmlFor="fecha_mantenimiento">Fecha *</Label>
                              <Input id="fecha_mantenimiento" type="date" value={mantenimientoRemolqueFormData.fecha_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, fecha_mantenimiento: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="tipo_mantenimiento">Tipo</Label>
                              <select id="tipo_mantenimiento" value={mantenimientoRemolqueFormData.tipo_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, tipo_mantenimiento: e.target.value})} className="border rounded-md h-9 px-2 text-sm w-full bg-white">
                                <option value="preventivo">Preventivo</option>
                                <option value="correctivo">Correctivo</option>
                                <option value="revision">Revisión</option>
                                <option value="otro">Otro</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="proximo_mantenimiento">Próximo</Label>
                              <Input id="proximo_mantenimiento" type="date" value={mantenimientoRemolqueFormData.proximo_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, proximo_mantenimiento: e.target.value})} />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <Label htmlFor="detalles_mantenimiento">Detalles *</Label>
                              <Textarea id="detalles_mantenimiento" rows={2} value={mantenimientoRemolqueFormData.detalles_mantenimiento} onChange={e=>setMantenimientoRemolqueFormData({...mantenimientoRemolqueFormData, detalles_mantenimiento: e.target.value})} placeholder="Trabajo realizado, refacciones, etc." />
                            </div>
                            {/* Campos financiero/proveedor eliminados según requerimiento */}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={()=>{resetFormMantenimientoRemolque(); setShowFormMantenimientoRemolque(false);}} disabled={addingMantenimientoRemolque}>Cancelar</Button>
                            <Button size="sm" onClick={agregarMantenimientoRemolque} disabled={addingMantenimientoRemolque} className="bg-[#16A34A] hover:bg-[#12813a] text-white">
                              {addingMantenimientoRemolque ? 'Guardando...' : 'Guardar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {loadingHistorialMantenimientoRemolque ? (
                          <p className="text-sm text-gray-500">Cargando historial...</p>
                        ) : historialMantenimientoRemolque.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">Sin registros de mantenimiento.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="overflow-x-auto border rounded-md">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-100 text-gray-700">
                                  <tr>
                                    <th className="px-2 py-2 text-left font-medium">Fecha</th>
                                    <th className="px-2 py-2 text-left font-medium">Tipo</th>
                                    <th className="px-2 py-2 text-left font-medium">Detalles</th>
                                    <th className="px-2 py-2 text-left font-medium">Próximo</th>
                                    <th className="px-2 py-2 text-left font-medium">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {historialMantenimientoRemolque.slice((currentPageMantenimientoRemolque-1)*pageSizeMantenimientoRemolque, (currentPageMantenimientoRemolque-1)*pageSizeMantenimientoRemolque + pageSizeMantenimientoRemolque).map(reg => (
                                    <tr key={reg.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-2 whitespace-nowrap">{reg.fecha_mantenimiento ? formatDateMatamoros(reg.fecha_mantenimiento) : '—'}</td>
                                      <td className="px-2 py-2 whitespace-nowrap capitalize">{reg.tipo_mantenimiento}</td>
                                      <td className="px-2 py-2 max-w-xs"><span className="line-clamp-2" title={reg.detalles_mantenimiento}>{reg.detalles_mantenimiento}</span></td>
                                      <td className="px-2 py-2 whitespace-nowrap">{reg.proximo_mantenimiento ? formatDateMatamoros(reg.proximo_mantenimiento) : '—'}</td>
                                      <td className="px-2 py-2 whitespace-nowrap">
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={()=>eliminarMantenimientoRemolque(reg.id)}>Eliminar</Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="text-gray-600">Total: {historialMantenimientoRemolque.length}</span>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-7" disabled={currentPageMantenimientoRemolque===1} onClick={()=>setCurrentPageMantenimientoRemolque(p=>Math.max(1,p-1))}>Anterior</Button>
                                <span>Página {currentPageMantenimientoRemolque} de {Math.ceil(historialMantenimientoRemolque.length / pageSizeMantenimientoRemolque) || 1}</span>
                                <Button variant="outline" size="sm" className="h-7" disabled={currentPageMantenimientoRemolque >= Math.ceil(historialMantenimientoRemolque.length / pageSizeMantenimientoRemolque)} onClick={()=>setCurrentPageMantenimientoRemolque(p=>p+1)}>Siguiente</Button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>Por página:</span>
                                <select value={pageSizeMantenimientoRemolque} onChange={e=>{setPageSizeMantenimientoRemolque(Number(e.target.value)); setCurrentPageMantenimientoRemolque(1);}} className="border rounded-md h-7 text-xs px-1">
                                  {[5,10,15,20].map(n=> <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="comentarios">
                    <div className="py-4 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Comentarios</h3>
                      {remolqueDetalle.comentarios ? (
                        <p className="bg-gray-50 p-3 rounded-md border text-gray-700 whitespace-pre-wrap text-sm">{remolqueDetalle.comentarios}</p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Sin comentarios registrados.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex flex-wrap justify-start gap-2 pt-4 border-t mt-2">
                  <Button
                    onClick={() => { editarRemolque(remolqueDetalle); /* no cerrar detalles */ }}
                    className="bg-[#16A34A] hover:bg-[#12813a] text-white font-semibold"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Editar Remolque
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => descargarExcelRemolque(remolqueDetalle)}
                    className="flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                    </svg>
                    Descargar Excel
                  </Button>
                  <Button variant="outline" onClick={() => setShowDetallesRemolque(false)}>Cerrar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de imagen completa */}
        <Dialog open={!!imagenPreview} onOpenChange={() => setImagenPreview(null)}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                {imagenPreview?.nombre}
              </DialogTitle>
            </DialogHeader>
            
            {imagenPreview && (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative max-w-full max-h-[70vh] overflow-hidden rounded-lg border">
                  <img
                    src={imagenPreview.url}
                    alt={imagenPreview.nombre}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <a
                    href={imagenPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en nueva ventana
                  </a>
                  <button
                    onClick={() => setImagenPreview(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Controles de paginación inferior */}
        {remolquesFiltrados.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-600">
              Mostrando {Math.min(remolquesFiltrados.length, end) - start} de {remolquesFiltrados.length}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
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
          </div>
        )}

        {remolquesFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron remolques</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de actualización rápida - RECONSTRUIDO SIMPLE */}
      {showModalRenovarRemolque && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9990, pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={cerrarModalActualizacion}
            style={{ pointerEvents: 'auto' }}
          />
          <div 
            className="relative bg-white rounded-lg shadow-xl w-full max-w-lg"
            style={{ zIndex: 9991, pointerEvents: 'auto' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {tipoActualizacion === 'seguro' ? 'Actualizar Seguro' : 'Actualizar Inspección'}
              </h3>
              <button 
                onClick={cerrarModalActualizacion} 
                className="text-gray-500 hover:text-gray-700"
                style={{ pointerEvents: 'auto' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Fecha actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tipoActualizacion === 'seguro' ? 'Vigencia actual del seguro' : 'Última inspección'}
                </label>
                <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-800">
                  {tipoActualizacion === 'seguro'
                    ? (remolqueDetalle?.vigencia_seguro
                        ? formatDateMatamoros(remolqueDetalle.vigencia_seguro)
                        : 'Sin fecha registrada')
                    : (remolqueDetalle?.proxima_inspeccion
                        ? formatDateMatamoros(remolqueDetalle.proxima_inspeccion)
                        : 'Sin fecha registrada')}
                </div>
              </div>

              {/* Nueva fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tipoActualizacion === 'seguro' ? 'Nueva vigencia de seguro' : 'Próxima inspección'}
                </label>
                <input
                  type="date"
                  value={tipoActualizacion === 'seguro' ? nuevaFechaSeguro : nuevaFechaInspeccion}
                  onChange={(e) => {
                    if (tipoActualizacion === 'seguro') {
                      setNuevaFechaSeguro(e.target.value);
                    } else {
                      setNuevaFechaInspeccion(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ pointerEvents: 'auto' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={cerrarModalActualizacion}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                disabled={actualizandoRemolque}
                  style={{ pointerEvents: 'auto' }}
              >
                Cancelar
              </button>
              <button
                onClick={actualizarFechaRemolque}
                disabled={!(tipoActualizacion === 'seguro' ? nuevaFechaSeguro : nuevaFechaInspeccion) || actualizandoRemolque}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  style={{ pointerEvents: 'auto' }}
              >
                {actualizandoRemolque ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
