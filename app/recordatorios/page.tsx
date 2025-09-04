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
import * as XLSX from "xlsx";
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
import { toast } from "@/hooks/use-toast";
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
  Bell,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RotateCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  supabase,
  type Recordatorio,
  type Operador,
  type Camion,
} from "@/lib/supabase";
import { agregarAuditLog } from "@/lib/audit";

export default function RecordatoriosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRecordatorio, setEditingRecordatorio] =
    useState<Recordatorio | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para los datos relacionados
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fecha_vencimiento: "",
    tipo: "",
    prioridad: "media",
    estado: "pendiente",
    operador_id: "",
    camion_id: "",
  });

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  // Filtro prioridad
  const [filtroPrioridad, setFiltroPrioridad] = useState<"todas" | "alta" | "media" | "baja">("todas");
  // Filtro estado
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendiente" | "completado" | "vencido">("todos");
  // Número de tarjetas por fila (2 a 6)
  const [cardsPerRow, setCardsPerRow] = useState<2 | 3 | 4 | 5 | 6>(3);
  // Utilidad para saber si está vencido (mover arriba para evitar ReferenceError)
  const esVencido = (fechaVencimiento: string) => {
    return new Date(fechaVencimiento) < new Date();
  };

  // Formatear fechas en formato México (día/mes/año)
  const formatFechaMX = (fecha?: string | null) => {
    if (!fecha) return "";
    try {
      return new Date(fecha).toLocaleDateString("es-MX");
    } catch {
      return String(fecha);
    }
  };
  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // tarjetas por página

  // Cargar datos desde Supabase
  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar recordatorios con relaciones
      const { data: recordatoriosData, error: recordatoriosError } =
        await supabase
          .from("recordatorios")
          .select(
            `
          *,
          operador:operadores(*),
          camion:camiones(*)
        `
          )
          .order("fecha_vencimiento", { ascending: true });

      if (recordatoriosError) {
        console.error("Error cargando recordatorios:", recordatoriosError);
      } else {
        setRecordatorios(recordatoriosData || []);
      }

      // Cargar operadores
      const { data: operadoresData, error: operadoresError } = await supabase
        .from("operadores")
        .select("*")
        .eq("estado", "activo")
        .order("nombre");

      if (operadoresError) {
        console.error("Error cargando operadores:", operadoresError);
      } else {
        setOperadores(operadoresData || []);
      }

      // Cargar camiones
      const { data: camionesData, error: camionesError } = await supabase
        .from("camiones")
        .select("*")
        .order("numero_economico");

      if (camionesError) {
        console.error("Error cargando camiones:", camionesError);
      } else {
        setCamiones(camionesData || []);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarFormulario = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      fecha_vencimiento: "",
      tipo: "",
      prioridad: "media",
      estado: "pendiente",
      operador_id: "",
      camion_id: "",
    });
    setEditingRecordatorio(null);
  };

  const guardarRecordatorio = async () => {
    if (!formData.titulo || !formData.fecha_vencimiento) {
      alert(
        "Por favor completa los campos obligatorios (título y fecha de vencimiento)"
      );
      return;
    }

    try {
      setSaving(true);

      const recordatorioData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        fecha_vencimiento: formData.fecha_vencimiento,
        tipo: formData.tipo || null,
        prioridad: formData.prioridad,
        estado: formData.estado,
        updated_at: new Date().toISOString(),
      };

      if (editingRecordatorio) {
        // Actualizar recordatorio existente
        const { error } = await supabase
          .from("recordatorios")
          .update(recordatorioData)
          .eq("id", editingRecordatorio.id);

        if (error) {
          console.error("Error actualizando recordatorio:", error);
          alert("Error al actualizar recordatorio");
          return;
        }
        // Audit: actualización de recordatorio
        try {
          agregarAuditLog(
            "ACTUALIZAR",
            "Recordatorios",
            `Actualizó recordatorio ${editingRecordatorio.id} - "${formData.titulo}" (vence: ${formData.fecha_vencimiento})`
          );
        } catch {}
      } else {
        // Crear nuevo recordatorio
        const { error } = await supabase
          .from("recordatorios")
          .insert(recordatorioData);

        if (error) {
          console.error("Error creando recordatorio:", error);
          alert("Error al crear recordatorio");
          return;
        }
        // Audit: creación de recordatorio (sin operador/camión)
        try {
          const partes: string[] = [
            `"${formData.titulo}"`,
            `vence: ${formData.fecha_vencimiento}`,
          ];
          agregarAuditLog("CREAR", "Recordatorios", `Creó recordatorio ${partes.join(", ")}`);
        } catch {}
      }

        if (editingRecordatorio) {
          // Close form, reload list and show success toast
          limpiarFormulario();
          setShowForm(false);
          await cargarDatos(); // Recargar la lista
          toast({ title: 'Recordatorio actualizado exitosamente', variant: 'success' });
        } else {
          alert("Recordatorio creado exitosamente");
          limpiarFormulario();
          setShowForm(false);
          await cargarDatos(); // Recargar la lista
        }
    } catch (error) {
      console.error("Error guardando recordatorio:", error);
      alert("Error al guardar recordatorio");
    } finally {
      setSaving(false);
    }
  };

  const editarRecordatorio = (recordatorio: Recordatorio) => {
    setFormData({
      titulo: recordatorio.titulo,
      descripcion: recordatorio.descripcion || "",
      fecha_vencimiento: recordatorio.fecha_vencimiento,
      tipo: recordatorio.tipo || "",
      prioridad: recordatorio.prioridad,
      estado: recordatorio.estado,
  operador_id: recordatorio.operador_id || "",
  camion_id: recordatorio.camion_id || "",
    });
    setEditingRecordatorio(recordatorio);
    setShowForm(true);
  };

  const eliminarRecordatorio = async (id: string) => {
    try {
      const rec = recordatorios.find((r) => r.id === id);
      const { error } = await supabase
        .from("recordatorios")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error eliminando recordatorio:", error);
        alert("Error al eliminar recordatorio");
        return;
      }

  toast({ title: 'Recordatorio eliminado exitosamente', variant: 'destructive' });
      // Audit: eliminación de recordatorio
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Recordatorios",
          `Eliminó recordatorio ${id}${rec?.titulo ? ` - "${rec.titulo}"` : ""}`
        );
      } catch {}
      await cargarDatos(); // Recargar la lista
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar recordatorio");
    }
  };

  const marcarComoCompletado = async (id: string) => {
    try {
      const rec = recordatorios.find((r) => r.id === id);
      const { error } = await supabase
        .from("recordatorios")
        .update({
          estado: "completado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error actualizando recordatorio:", error);
        alert("Error al marcar como completado");
        return;
      }

      // Audit: marcado como completado
      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Recordatorios",
          `Marcó como completado el recordatorio ${id}${rec?.titulo ? ` - "${rec.titulo}"` : ""}`
        );
      } catch {}
      await cargarDatos(); // Recargar la lista
    } catch (error) {
      console.error("Error:", error);
      alert("Error al marcar como completado");
    }
  };

  const desmarcarRecordatorio = async (id: string) => {
    try {
      const rec = recordatorios.find((r) => r.id === id);
      const { error } = await supabase
        .from("recordatorios")
        .update({
          estado: "pendiente",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error desmarcando recordatorio:", error);
        alert("Error al desmarcar el recordatorio");
        return;
      }

      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Recordatorios",
          `Desmarcó como completado el recordatorio ${id}${rec?.titulo ? ` - "${rec.titulo}"` : ""}`
        );
      } catch {}

      await cargarDatos(); // Recargar la lista
    } catch (error) {
      console.error("Error:", error);
      alert("Error al desmarcar el recordatorio");
    }
  };

  const recordatoriosFiltrados = recordatorios.filter(
    (recordatorio: Recordatorio) => {
      const coincideTexto =
        recordatorio.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recordatorio.descripcion &&
          recordatorio.descripcion
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (recordatorio.tipo &&
          recordatorio.tipo.toLowerCase().includes(searchTerm.toLowerCase()));
      const coincidePrioridad =
        filtroPrioridad === "todas" || recordatorio.prioridad === filtroPrioridad;
      const estadoDerivado = esVencido(recordatorio.fecha_vencimiento) && recordatorio.estado !== "completado" ? "vencido" : recordatorio.estado;
      const coincideEstado = filtroEstado === "todos" || estadoDerivado === filtroEstado;
      return coincideTexto && coincidePrioridad && coincideEstado;
    }
  );

  // Asegurar que la página sea válida si cambian filtros o tamaño
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filtroPrioridad, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(recordatoriosFiltrados.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedRecordatorios = recordatoriosFiltrados.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getPrioridadBadge = (prioridad: string) => {
    const prioridades = {
      alta: { color: "bg-red-100 text-red-800", label: "Alta" },
      media: { color: "bg-yellow-100 text-yellow-800", label: "Media" },
      baja: { color: "bg-green-100 text-green-800", label: "Baja" },
    };

    const prioridadInfo = prioridades[
      prioridad as keyof typeof prioridades
    ] || {
      color: "bg-gray-100 text-gray-800",
      label: prioridad,
    };

    return (
      <Badge className={`${prioridadInfo.color} hover:${prioridadInfo.color}`}>
        {prioridadInfo.label}
      </Badge>
    );
  };

  const getEstadoBadge = (estado: string) => {
    const estados = {
      pendiente: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Pendiente",
        icon: Clock,
      },
      completado: {
        color: "bg-green-100 text-green-800",
        label: "Completado",
        icon: CheckCircle,
      },
      vencido: {
        color: "bg-red-100 text-red-800",
        label: "Vencido",
        icon: AlertTriangle,
      },
    };

    const estadoInfo = estados[estado as keyof typeof estados] || {
      color: "bg-gray-100 text-gray-800",
      label: estado,
      icon: Clock,
    };
    const IconComponent = estadoInfo.icon;

    return (
      <Badge className={`${estadoInfo.color} hover:${estadoInfo.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {estadoInfo.label}
      </Badge>
    );
  };

  // (definición movida arriba)

  const descargarExcel = () => {
    if (recordatorios.length === 0) {
      alert("No hay recordatorios para descargar");
      return;
    }

    // Preparar datos enriquecidos
    const rows = recordatorios.map((r) => ({
      Titulo: r.titulo,
      Descripcion: r.descripcion || "",
      Fecha_Vencimiento: r.fecha_vencimiento,
      Tipo: r.tipo || "",
      Prioridad: r.prioridad,
      Estado: r.estado,
      Operador: r.operador ? `${r.operador.nombre} ${r.operador.apellidos}` : "",
      Camion: r.camion?.numero_economico || "",
      Fecha_Creacion: r.fecha_creacion,
      Actualizado: r.updated_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    // Ajustar ancho de columnas automáticamente básico
    const colWidths = Object.keys(rows[0] || { dummy: '' }).map((key) => ({ wch: Math.min(40, Math.max(key.length + 2, ...rows.map(r => String((r as any)[key]).length + 2))) }));
    (worksheet["!cols"] as any) = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recordatorios");
    XLSX.writeFile(workbook, `recordatorios_${new Date().toISOString().split('T')[0]}.xlsx`);
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Recordatorios",
        `Exportó ${recordatorios.length} recordatorios a Excel`
      );
    } catch {}
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando recordatorios...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Recordatorios</h1>
            <p className="text-gray-600 mt-2">
              Gestionar recordatorios y tareas pendientes
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={descargarExcel}
              disabled={recordatorios.length === 0}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button onClick={() => limpiarFormulario()} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Recordatorio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRecordatorio
                      ? "Editar Recordatorio"
                      : "Nuevo Recordatorio"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa la información del recordatorio
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                      placeholder="Título del recordatorio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          descripcion: e.target.value,
                        })
                      }
                      placeholder="Descripción detallada del recordatorio"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_vencimiento">
                        Fecha de Vencimiento *
                      </Label>
                      <Input
                        id="fecha_vencimiento"
                        type="date"
                        value={formData.fecha_vencimiento}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fecha_vencimiento: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Input
                        id="tipo"
                        value={formData.tipo}
                        onChange={(e) =>
                          setFormData({ ...formData, tipo: e.target.value })
                        }
                        placeholder="Ej: Mantenimiento, Documentos, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select
                        value={formData.prioridad}
                        onValueChange={(value) =>
                          setFormData({ ...formData, prioridad: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="baja">Baja</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Operador y Camión removidos del formulario por solicitud */}

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={guardarRecordatorio} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : editingRecordatorio ? (
                        "Actualizar Recordatorio"
                      ) : (
                        "Guardar Recordatorio"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
  {/* success toast will be shown on update */}

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{recordatorios.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pendientes
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {
                      recordatorios.filter((r) => r.estado === "pendiente")
                        .length
                    }
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Completados
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      recordatorios.filter((r) => r.estado === "completado")
                        .length
                    }
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      recordatorios.filter(
                        (r) =>
                          r.estado === "vencido" ||
                          esVencido(r.fecha_vencimiento)
                      ).length
                    }
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título, descripción o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filtroPrioridad" className="text-xs text-gray-500">Prioridad</Label>
                <Select value={filtroPrioridad} onValueChange={(v: any) => setFiltroPrioridad(v)}>
                  <SelectTrigger id="filtroPrioridad" className="w-40">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filtroEstado" className="text-xs text-gray-500">Estado</Label>
                <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
                  <SelectTrigger id="filtroEstado" className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles de paginación y lista de recordatorios */}
        <Card className="mb-4">
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {paginatedRecordatorios.length} de {recordatoriosFiltrados.length} recordatorios
                {searchTerm && (
                  <span className="ml-1">(filtro aplicado)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pageSize" className="text-xs text-gray-500">Por página</Label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm bg-white"
                  >
                    {[6,12,24,48].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cardsPerRow" className="text-xs text-gray-500">Elementos por fila</Label>
                  <Select value={String(cardsPerRow)} onValueChange={(v: any) => setCardsPerRow(Number(v) as 2|3|4|5|6)}>
                    <SelectTrigger id="cardsPerRow" className="w-28">
                      <SelectValue placeholder="Elementos por fila" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className={"grid grid-cols-1 gap-4 " + (
              cardsPerRow === 2 ? 'sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-2' :
              cardsPerRow === 3 ? 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3' :
              cardsPerRow === 4 ? 'sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4' :
              cardsPerRow === 5 ? 'sm:grid-cols-2 lg:grid-cols-5 2xl:grid-cols-5' :
              'sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-6'
            )}>
              {paginatedRecordatorios.map((recordatorio: Recordatorio) => (
                <Card
                  key={recordatorio.id}
                  className={
                    (esVencido(recordatorio.fecha_vencimiento) && recordatorio.estado !== 'completado')
                      ? "border-red-200 bg-red-50"
                      : recordatorio.prioridad === 'alta'
                      ? 'border-red-100'
                      : recordatorio.prioridad === 'media'
                      ? 'border-yellow-100'
                      : ''
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold leading-snug truncate">
                          {recordatorio.titulo}
                        </CardTitle>
                        <CardDescription className="text-xs leading-tight space-y-0.5">
                          <span className="block">Vence: {formatFechaMX(recordatorio.fecha_vencimiento)}</span>
                          {recordatorio.operador && (
                            <span className="block truncate">Op: {recordatorio.operador.nombre} {recordatorio.operador.apellidos}</span>
                          )}
                          {recordatorio.camion && (
                            <span className="block">Camión: {recordatorio.camion.numero_economico}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          {/* Globo prioridad */}
                          <span
                            title={`Prioridad ${recordatorio.prioridad}`}
                            className={
                              `inline-block h-3 w-3 rounded-full border shadow-sm ` +
                              (recordatorio.prioridad === 'alta'
                                ? 'bg-red-500 border-red-600'
                                : recordatorio.prioridad === 'media'
                                ? 'bg-yellow-400 border-yellow-500'
                                : 'bg-green-500 border-green-600')
                            }
                          />
                          {getPrioridadBadge(recordatorio.prioridad)}
                        </div>
                        {getEstadoBadge(esVencido(recordatorio.fecha_vencimiento) && recordatorio.estado !== 'completado' ? 'vencido' : recordatorio.estado)}
                      </div>
                    </div>
                  </CardHeader>
                  {recordatorio.descripcion && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {recordatorio.descripcion.slice(0,140)}{recordatorio.descripcion.length>140 && '…'}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Creado: {formatFechaMX(recordatorio.fecha_creacion)}</span>
                        <div className="flex space-x-1">
                          {recordatorio.estado === 'pendiente' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar completado</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Marcar este recordatorio como completado? Esta acción actualizará su estado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => marcarComoCompletado(recordatorio.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {recordatorio.estado === 'completado' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-gray-600 hover:text-gray-700"
                                  title="Desmarcar como completado"
                                >
                                  <RotateCw className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar desmarcado</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Deseas marcar este recordatorio nuevamente como pendiente? Esto revertirá el estado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                    onClick={() => desmarcarRecordatorio(recordatorio.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => editarRecordatorio(recordatorio)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar recordatorio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer y eliminará el recordatorio permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => eliminarRecordatorio(recordatorio.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
            {recordatoriosFiltrados.length > pageSize && (
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p-1))}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).slice(0,10).map((_,i) => {
                    const pageNumber = i+1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`h-7 w-7 rounded text-xs font-medium border ${pageNumber===page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'} transition`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  {totalPages > 10 && (
                    <span className="text-xs text-gray-400 px-1">…</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p+1))}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {recordatoriosFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron recordatorios</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
