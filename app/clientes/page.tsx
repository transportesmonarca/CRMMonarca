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
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building,
  Download,
  X,
  Settings,
  User,
  UserCheck,
  UserX,
  Calendar,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  supabase,
  type Cliente,
  obtenerContactosCliente,
  guardarContactosCliente,
  type ContactoCliente,
} from "@/lib/supabase";
import { agregarAuditLog } from "@/lib/audit";

interface FormaFacturacion {
  id: string;
  nombre: string;
  descripcion: string;
}

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showFacturacionConfig, setShowFacturacionConfig] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedClientContacts, setSelectedClientContacts] = useState<
    ContactoCliente[]
  >([]); // Nuevo estado para contactos del cliente seleccionado

  // Estado del formulario principal
  const [formData, setFormData] = useState({
    nombre_comercial: "",
    rfc: "",
    direccion: "",
    correo_contacto: "",
    telefono: "",
    forma_facturacion: "",
    divisa_pago: "",
    empresa_facturadora: "",
  });

  // Estado para contactos múltiples (usando la nueva tabla)
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);

  // Contacto en captura (para nuevo contacto)
  const [nuevoContacto, setNuevoContacto] = useState({
    nombre: "",
    puesto: "",
    telefono: "",
    email: "",
    notas: "",
  });

  // Estado para formas de facturación
  const [formasFacturacion, setFormasFacturacion] = useState<
    FormaFacturacion[]
  >([
    { id: "1", nombre: "Tradicional", descripcion: "Factura física" },
    { id: "2", nombre: "Electrónica", descripcion: "CFDI 4.0" },
    { id: "3", nombre: "Complemento", descripcion: "Complemento de pago" },
  ]);

  const [nuevaFormaFacturacion, setNuevaFormaFacturacion] = useState({
    nombre: "",
    descripcion: "",
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Función para truncar texto
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  // Cargar clientes desde Supabase
  const cargarClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .in("estado", ["activo", "inactivo"])
        .order("fecha_registro", { ascending: false });

      if (error) {
        console.error("Error cargando clientes:", error);
        alert("Error al cargar clientes");
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  

  const limpiarFormulario = () => {
    setFormData({
      nombre_comercial: "",
      rfc: "",
      direccion: "",
      correo_contacto: "",
      telefono: "",
      forma_facturacion: "",
      divisa_pago: "",
      empresa_facturadora: "",
    });
  setContactos([]);
  setNuevoContacto({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
    setEditingClient(null);
    setActiveTab("general");
  };

  // Funciones para manejar contactos
  const agregarContacto = () => {
    // Validar que haya algún dato mínimo (nombre o teléfono o email)
    const tieneDatos =
      nuevoContacto.nombre.trim() ||
      nuevoContacto.telefono.trim() ||
      nuevoContacto.email.trim();
    if (!tieneDatos) return;
    if (contactos.length >= 5) return;

    // Caso: sólo existe el placeholder vacío inicial marcado como principal
    if (
      contactos.length === 1 &&
      !contactos[0].nombre &&
      !contactos[0].telefono &&
      !contactos[0].email &&
      !contactos[0].notas
    ) {
      const actualizado: ContactoCliente = {
        ...contactos[0],
        nombre: nuevoContacto.nombre.trim(),
        telefono: nuevoContacto.telefono.trim(),
        email: nuevoContacto.email.trim(),
        puesto: nuevoContacto.puesto.trim(),
        notas: nuevoContacto.notas.trim(),
        es_principal: true, // asegurar principal
      };
      setContactos([actualizado]);
      setNuevoContacto({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
      return;
    }

    const existePrincipal = contactos.some((c) => c.es_principal);
    const nuevo: ContactoCliente = {
      id: `temp-${Date.now()}`,
      cliente_id: "",
      nombre: nuevoContacto.nombre.trim(),
      telefono: nuevoContacto.telefono.trim(),
      email: nuevoContacto.email.trim(),
      puesto: nuevoContacto.puesto.trim(),
      notas: nuevoContacto.notas.trim(),
      es_principal: !existePrincipal, // si no hay principal, este lo será
      activo: true,
      fecha_creacion: "",
      updated_at: "",
    };
    setContactos([...contactos, nuevo]);
    setNuevoContacto({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
  };

  const eliminarContacto = (id: string) => {
    if (contactos.length <= 1) return; // no eliminar el único
    const eliminado = contactos.find((c) => c.id === id);
    const restantes = contactos.filter((contacto) => contacto.id !== id);
    // Si el eliminado era principal, reasignar al primero restante
    if (eliminado?.es_principal) {
      setContactos([
        { ...restantes[0], es_principal: true },
        ...restantes.slice(1).map((c) => ({ ...c, es_principal: false })),
      ]);
    } else {
      // Asegurar que exista exactamente un principal
      if (!restantes.some((c) => c.es_principal) && restantes.length) {
        restantes[0].es_principal = true;
      }
      setContactos(restantes);
    }
  };

  const actualizarContacto = (
    id: string,
    campo: keyof ContactoCliente,
    valor: string
  ) => {
    setContactos(
      contactos.map((contacto) =>
        contacto.id === id ? { ...contacto, [campo]: valor } : contacto
      )
    );
  };

  // Funciones para manejar formas de facturación
  const agregarFormaFacturacion = () => {
    if (nuevaFormaFacturacion.nombre.trim()) {
      const nuevaForma: FormaFacturacion = {
        id: Date.now().toString(),
        nombre: nuevaFormaFacturacion.nombre,
        descripcion: nuevaFormaFacturacion.descripcion,
      };
      setFormasFacturacion([...formasFacturacion, nuevaForma]);
      setNuevaFormaFacturacion({ nombre: "", descripcion: "" });
    }
  };

  const eliminarFormaFacturacion = (id: string) => {
    setFormasFacturacion(formasFacturacion.filter((forma) => forma.id !== id));
  };

  const guardarCliente = async () => {
    // Validar campos obligatorios
    if (!formData.nombre_comercial.trim() || !formData.rfc.trim()) {
      alert(
        "Por favor completa los campos obligatorios: Nombre Comercial y RFC"
      );
      return;
    }

    // Validar longitud de campos con mensajes más específicos
    if (formData.nombre_comercial.length > 100) {
      alert(
        `El nombre comercial es demasiado largo (${formData.nombre_comercial.length} caracteres). Máximo permitido: 100 caracteres`
      );
      return;
    }

    if (formData.rfc.length > 13) {
      alert(
        `El RFC es demasiado largo (${formData.rfc.length} caracteres). Máximo permitido: 13 caracteres`
      );
      return;
    }

    if (formData.direccion && formData.direccion.length > 200) {
      alert(
        `La dirección es demasiado larga (${formData.direccion.length} caracteres). Máximo permitido: 200 caracteres`
      );
      return;
    }

    if (formData.correo_contacto && formData.correo_contacto.length > 100) {
      alert(
        `El correo es demasiado largo (${formData.correo_contacto.length} caracteres). Máximo permitido: 100 caracteres`
      );
      return;
    }

    if (formData.telefono && formData.telefono.length > 15) {
      alert(
        `El teléfono es demasiado largo (${formData.telefono.length} caracteres). Máximo permitido: 15 caracteres`
      );
      return;
    }

    // Validar que al menos un contacto tenga información
    const contactosValidos = contactos.filter(
      (c) =>
        c.nombre.trim() ||
  (c.telefono?.trim?.() || "") ||
  (c.email?.trim?.() || "") ||
        c.notas?.trim()
    );
    if (contactosValidos.length === 0) {
      alert("Por favor agrega al menos un contacto con información");
      return;
    }

    try {
      setSaving(true);

      const clienteData = {
        nombre: formData.nombre_comercial.substring(0, 100), // Asegurar máximo 100 caracteres
        rfc: formData.rfc.toUpperCase().substring(0, 13),
        direccion: formData.direccion
          ? formData.direccion.substring(0, 200)
          : null,
        email: formData.correo_contacto
          ? formData.correo_contacto.substring(0, 100)
          : null,
        telefono: formData.telefono ? formData.telefono.substring(0, 15) : null,
        estado: "activo",
        divisa_pago: formData.divisa_pago || null,
        empresa_facturadora: formData.empresa_facturadora || null,
      };

      // Después de guardar el cliente exitosamente, guardar los contactos
      if (editingClient) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from("clientes")
          .update({
            ...clienteData,
            forma_facturacion: formData.forma_facturacion || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingClient.id);

        if (error) {
          console.error("Error actualizando cliente:", error);
          alert("Error al actualizar cliente");
          return;
        }

        // Audit log: actualización de cliente
        try {
          agregarAuditLog(
            "ACTUALIZAR",
            "Clientes",
            `Actualizó cliente ${clienteData.nombre} (ID: ${editingClient.id})`
          );
        } catch {}

        // Guardar contactos en la nueva tabla
        const contactosGuardados = await guardarContactosCliente(
          editingClient.id,
          contactos
        );
        if (!contactosGuardados) {
          alert(
            "Cliente actualizado, pero hubo un error guardando los contactos"
          );
        }
      } else {
        // Crear nuevo cliente
        const { data: nuevoCliente, error } = await supabase
          .from("clientes")
          .insert({
            ...clienteData,
            forma_facturacion: formData.forma_facturacion || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creando cliente:", error);
          alert("Error al crear cliente");
          return;
        }

        // Audit log: creación de cliente
        try {
          agregarAuditLog(
            "CREAR",
            "Clientes",
            `Creó cliente ${clienteData.nombre} (ID: ${nuevoCliente.id})`
          );
        } catch {}

        // Guardar contactos en la nueva tabla
        const contactosGuardados = await guardarContactosCliente(
          nuevoCliente.id,
          contactos
        );
        if (!contactosGuardados) {
          alert("Cliente creado, pero hubo un error guardando los contactos");
        }
      }

      alert(
        editingClient
          ? "Cliente actualizado exitosamente"
          : "Cliente creado exitosamente"
      );
      limpiarFormulario();
      setShowForm(false);
      await cargarClientes();
    } catch (error) {
      console.error("Error guardando cliente:", error);
      alert("Error al guardar cliente");
    } finally {
      setSaving(false);
    }
  };

  // Función para debug - puedes llamarla desde la consola del navegador
  const debugCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      console.log("Información del cliente:", cliente);
      console.log("Campo empresa:", cliente.empresa);
    }
  };

  // Hacer la función disponible globalmente para debug
  if (typeof window !== "undefined") {
    (window as any).debugCliente = debugCliente;
  }

  const editarCliente = async (cliente: Cliente) => {
    setFormData({
      nombre_comercial: cliente.nombre,
      rfc: cliente.rfc || "",
      direccion: cliente.direccion || "",
      correo_contacto: cliente.email || "",
      telefono: cliente.telefono || "",
      forma_facturacion: cliente.forma_facturacion || "",
      divisa_pago: cliente.divisa_pago || "",
      empresa_facturadora: cliente.empresa_facturadora || "",
    });

    // Cargar contactos desde la nueva tabla
    try {
      const contactosCliente = await obtenerContactosCliente(cliente.id);
      if (contactosCliente.length > 0) {
        setContactos(contactosCliente);
      } else {
        // Si no hay contactos, mantener uno vacío
        setContactos([
          {
            id: "temp-1",
            cliente_id: cliente.id,
            nombre: "",
            telefono: "",
            email: "",
            puesto: "",
            notas: "", // Inicializar notas
            es_principal: true,
            activo: true,
            fecha_creacion: "",
            updated_at: "",
          },
        ]);
      }
    } catch (error) {
      console.error("Error cargando contactos:", error);
      setContactos([
        {
          id: "temp-1",
          cliente_id: cliente.id,
          nombre: "",
          telefono: "",
          email: "",
          puesto: "",
          notas: "", // Inicializar notas
          es_principal: true,
          activo: true,
          fecha_creacion: "",
          updated_at: "",
        },
      ]);
    }

    setEditingClient(cliente);
    setShowForm(true);
  };

  const eliminarCliente = async (id: string) => {
    try {
      setDeleteLoading(true);

      // 0) Verificar que el cliente esté INACTIVO antes de cualquier otra cosa
      const { data: clienteEstado, error: errorClienteEstado } = await supabase
        .from("clientes")
        .select("estado")
        .eq("id", id)
        .single();

      if (errorClienteEstado) {
        console.error("Error obteniendo estado del cliente:", errorClienteEstado);
        alert("Error al verificar estado del cliente");
        return;
      }

      if (!clienteEstado || clienteEstado.estado !== "inactivo") {
        alert(
          "Para eliminar el cliente primero debes cambiarlo a estado INACTIVO. Luego intenta nuevamente."
        );
        return;
      }

  // 1) Bloqueo: si existen embarques ACTIVOS del cliente, no permitir eliminar
      //    Nueva definición de ACTIVO: cualquier embarque cuyo estado NO sea 'archivado' NI 'cancelado'.
      //    (Incluye estados en proceso, asignados, finalizados, etc. mientras no estén archivados o cancelados.)
      const { data: embarquesActivos, error: errorActivos } = await supabase
        .from("embarques")
        .select("id, folio, estado")
        .eq("cliente_id", id)
        .not("estado", "in", "(archivado,cancelado)")
        .limit(10);

      if (errorActivos) {
        console.error("Error verificando embarques activos:", errorActivos);
        alert("Error al verificar embarques activos del cliente");
        return;
      }

  if (embarquesActivos && embarquesActivos.length > 0) {
        const listaFolios = embarquesActivos
          .map((e) => `${e.folio || e.id} (${e.estado})`)
          .join("\n • ");
        alert(
          `❌ No se puede eliminar el cliente\n\n` +
            `Tiene ${embarquesActivos.length} embarque(s) aún activos (no archivados ni cancelados).\n` +
            `Debes ARCHIVAR o CANCELAR todos los embarques de este cliente (Crear Embarques / Asignación / Facturación y Cobranza) antes de eliminarlo.\n\n` +
            (listaFolios ? `Referencias:\n • ${listaFolios}` : "")
        );
        return;
      }

      // 2) Confirmación antes de eliminar (ya está inactivo y sin embarques activos)
      const confirmado = window.confirm(
        "¿Confirmas eliminar este cliente?\n\n" +
          "Si el cliente tiene embarques históricos se marcará como 'eliminado' (soft delete) para conservar el histórico.\n" +
          "Si no tiene embarques se eliminará definitivamente.\n\n" +
          "Esta acción no se puede deshacer."
      );
      if (!confirmado) {
        return; // Se aborta, finally limpiará loading
      }

      const { data: embarquesAsociados, error: errorConsulta } = await supabase
        .from("embarques")
        .select("id")
        .eq("cliente_id", id)
        .limit(1);

      if (errorConsulta) {
        console.error("Error verificando embarques asociados:", errorConsulta);
        alert("Error al verificar embarques asociados");
        return;
      }

  if (embarquesAsociados && embarquesAsociados.length > 0) {
        const { error: errorUpdate } = await supabase
          .from("clientes")
          .update({
            estado: "eliminado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (errorUpdate) {
          console.error("Error marcando cliente como eliminado:", errorUpdate);
          alert("Error al eliminar cliente");
          return;
        }

        alert(
          "Cliente marcado como eliminado. No se puede eliminar completamente porque tiene embarques asociados."
        );

        // Audit log: marcado como eliminado (soft delete)
        try {
          agregarAuditLog(
            "ELIMINAR",
            "Clientes",
            `Marcó cliente (ID: ${id}) como eliminado por tener embarques asociados`
          );
        } catch {}
      } else {
        const { error: errorDelete } = await supabase
          .from("clientes")
          .delete()
          .eq("id", id);

        if (errorDelete) {
          console.error("Error eliminando cliente:", errorDelete);
          alert("Error al eliminar cliente");
          return;
        }

        alert("Cliente eliminado exitosamente");

        // Audit log: eliminación definitiva
        try {
          agregarAuditLog(
            "ELIMINAR",
            "Clientes",
            `Eliminó cliente definitivamente (ID: ${id})`
          );
        } catch {}
      }

      await cargarClientes();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar la eliminación del cliente");
    } finally {
      setDeleteLoading(false);
    }
  };

  const cambiarEstadoCliente = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error cambiando estado del cliente:", error);
        alert("Error al cambiar estado del cliente");
        return;
      }

      // Audit log: cambio de estado
      try {
        agregarAuditLog(
          "ACTUALIZAR",
          "Clientes",
          `Cambió estado del cliente (ID: ${id}) a ${nuevoEstado}`
        );
      } catch {}

      await cargarClientes();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cambiar estado del cliente");
    }
  };

  const clientesFiltrados = clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.rfc &&
        cliente.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cliente.email &&
        cliente.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Derivados de paginación
  const totalPages = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / Math.max(1, pageSize))
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const clientesPaginados = clientesFiltrados.slice(start, end);

  const descargarClientesExcel = async () => {
    if (clientes.length === 0) {
      alert("No hay clientes para descargar");
      return;
    }

    // Obtener contactos principales de todos los clientes en una sola consulta
    let contactosPrincipales: Record<string, { nombre: string; telefono: string | null }> = {};
    try {
      const ids = clientes.map(c => c.id);
      const { data: contactosData, error: contactosError } = await supabase
        .from("contactos_clientes")
        .select("cliente_id, nombre, telefono, es_principal")
        .in("cliente_id", ids)
        .eq("activo", true)
        .eq("es_principal", true);
      if (!contactosError && contactosData) {
        contactosPrincipales = contactosData.reduce((acc: any, c: any) => {
          acc[c.cliente_id] = { nombre: c.nombre || '', telefono: c.telefono || '' };
            return acc;
        }, {});
      }
    } catch (e) {
      console.error('Error obteniendo contactos principales para exportación', e);
    }

    // Encabezados de la tabla principal
    const headers = [
      'Nombre Comercial',
      'RFC',
      'Teléfono',
      'Email',
      'Dirección',
      'Estado',
      'Contacto Principal',
      'Teléfono Contacto',
      'Divisa Pago Preferida',
      'Empresa Facturadora',
      'Forma Facturación'
    ];

    // Forzar tratamiento como texto para que Excel alinee a la izquierda (prefijando \t)
    const escapeCSV = (val: any) => {
      const str = (val ?? '').toString().replace(/"/g, '""');
      // Prefijo con tab para que Excel no intente interpretar números / RFC como número o fórmula
      return `"\t${str}"`;
    };

    const rows = clientes.map(cliente => {
      const contacto = contactosPrincipales[cliente.id] || { nombre: '', telefono: '' };
      return [
        escapeCSV(cliente.nombre),
        escapeCSV(cliente.rfc || ''),
        escapeCSV(cliente.telefono || ''),
        escapeCSV(cliente.email || ''),
        escapeCSV(cliente.direccion || ''),
        escapeCSV(cliente.estado),
        escapeCSV(contacto.nombre),
        escapeCSV(contacto.telefono || ''),
        escapeCSV(cliente.divisa_pago || ''),
        escapeCSV(cliente.empresa_facturadora || ''),
        escapeCSV(cliente.forma_facturacion || ''),
      ].join(',');
    });

    // Título y meta-info
    const fechaDescarga = new Date();
    const fechaStr = fechaDescarga.toLocaleString('es-MX', { hour12: false });
    const titulo = 'TRANSPORTES INTERNACIONALES MONARCA';
    const subtitulo = 'REPORTE GENERAL DE CLIENTES';
    const totalClientes = clientes.length;
    const metadataLines = [
      `"${titulo}"`,
      `"${subtitulo}"`,
      `"Fecha de Descarga:","${fechaStr}"`,
      `"Total de Clientes:","${totalClientes}"`,
      '' // línea en blanco
    ];

    const csvContent = [...metadataLines, headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fechaArchivo = fechaDescarga.toISOString().split('T')[0];
    link.setAttribute('download', `Reporte_Clientes_${fechaArchivo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Audit log: exportación de clientes
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Clientes",
        `Descargó reporte general de clientes (${clientes.length})`
      );
    } catch {}
  };

  const verDetallesCliente = async (cliente: Cliente) => {
    setSelectedClient(cliente);
    setShowDetailModal(true);
    setActiveTab("general"); // Reset tab to general when opening details

    // Cargar contactos para el modal de detalles
    try {
      const contactosData = await obtenerContactosCliente(cliente.id);
      setSelectedClientContacts(contactosData);
    } catch (error) {
      console.error("Error cargando contactos para detalles:", error);
      setSelectedClientContacts([]);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando clientes...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          {/* ocultar título/descripcion en móvil, mostrar en md+ */}
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Clientes
            </h1>
            <p className="text-gray-600 mt-2">
              Administrar información de clientes
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={descargarClientesExcel}
              disabled={clientes.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => limpiarFormulario()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>

                <DialogContent
                  className={`w-full h-screen md:h-auto md:max-w-5xl md:w-[1100px] ${
                    activeTab === "contactos" && contactos.length > 0
                      ? "md:h-[75vh]"
                      : "md:h-[65vh]"
                  } md:rounded-lg md:mx-auto flex flex-col overflow-hidden`}
                >
                  {/* Mobile compact header: visible only on small screens */}
                  <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white">
                    <h2 className="text-lg font-semibold">
                      {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Desktop header: keep original header for md+ */}
                  <DialogHeader className="hidden md:block">
                    <DialogTitle>
                      {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                    </DialogTitle>
                    <DialogDescription>
                      Completa la información del cliente
                    </DialogDescription>
                  </DialogHeader>

                

                <div className="w-full flex flex-col flex-1 overflow-hidden">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("general")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "general"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Información General
                      </button>
                      <button
                        onClick={() => setActiveTab("contactos")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "contactos"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Contactos
                      </button>
                      <button
                        onClick={() => setActiveTab("facturacion")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "facturacion"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Facturación y Pagos
                      </button>
                    </nav>
                  </div>

                  <div className="mt-4 flex-1 overflow-y-auto pr-2">
                    {/* Pestaña Información General */}
                    {activeTab === "general" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Información General
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nombre_comercial">
                              Nombre Comercial *
                            </Label>
                            <Input
                              id="nombre_comercial"
                              value={formData.nombre_comercial}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  nombre_comercial: e.target.value,
                                })
                              }
                              placeholder="Nombre comercial del cliente"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rfc">RFC *</Label>
                            <Input
                              id="rfc"
                              value={formData.rfc}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  rfc: e.target.value.toUpperCase(),
                                })
                              }
                              placeholder="RFC del cliente"
                              maxLength={13}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="direccion">Dirección</Label>
                          <Textarea
                            id="direccion"
                            value={formData.direccion}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                direccion: e.target.value,
                              })
                            }
                            placeholder="Dirección completa"
                            rows={2}
                            maxLength={200}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="correo_contacto">
                              Correo de Contacto
                            </Label>
                            <Input
                              id="correo_contacto"
                              type="email"
                              value={formData.correo_contacto}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  correo_contacto: e.target.value,
                                })
                              }
                              placeholder="correo@empresa.com"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                              id="telefono"
                              value={formData.telefono}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  telefono: e.target.value,
                                })
                              }
                              placeholder="55-1234-5678"
                              maxLength={20}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pestaña Contactos */}
                    {activeTab === "contactos" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-semibold">Agregar Contacto</h3>
                          <Button
                            type="button"
                            disabled={contactos.length >= 5 || !nuevoContacto.nombre.trim()}
                            onClick={agregarContacto}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                          >
                            Guardar Contacto
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">Captura un contacto y pulsa Guardar Contacto. Se listarán abajo. Máximo 5.</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre *</Label>
                            <Input
                              value={nuevoContacto.nombre}
                              onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })}
                              placeholder="Nombre completo"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Puesto</Label>
                            <Input
                              value={nuevoContacto.puesto || ""}
                              onChange={(e) => setNuevoContacto({ ...nuevoContacto, puesto: e.target.value })}
                              placeholder="Cargo"
                              maxLength={50}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                              value={nuevoContacto.telefono || ""}
                              onChange={(e) => setNuevoContacto({ ...nuevoContacto, telefono: e.target.value })}
                              placeholder="55-1234-5678"
                              maxLength={15}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Correo</Label>
                            <Input
                              type="email"
                              value={nuevoContacto.email || ""}
                              onChange={(e) => setNuevoContacto({ ...nuevoContacto, email: e.target.value })}
                              placeholder="contacto@empresa.com"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-4">
                            <Label>Notas</Label>
                            <Textarea
                              value={nuevoContacto.notas || ""}
                              onChange={(e) => setNuevoContacto({ ...nuevoContacto, notas: e.target.value })}
                              placeholder="Notas"
                              rows={2}
                              maxLength={250}
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-md font-semibold mb-2">Contactos Registrados</h4>
                          <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">Nombre</th>
                                  <th className="px-2 py-1 text-left">Puesto</th>
                                  <th className="px-2 py-1 text-left">Teléfono</th>
                                  <th className="px-2 py-1 text-left">Correo</th>
                                  <th className="px-2 py-1 text-left">Notas</th>
                                  <th className="px-2 py-1 text-left">Principal</th>
                                  <th className="px-2 py-1 text-left">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {contactos.map((c) => (
                                  <tr key={c.id} className="border-t">
                                    <td className="px-2 py-1">{c.nombre}</td>
                                    <td className="px-2 py-1">{c.puesto}</td>
                                    <td className="px-2 py-1">{c.telefono}</td>
                                    <td className="px-2 py-1">{c.email}</td>
                                    <td className="px-2 py-1">{truncateText(c.notas || "", 40)}</td>
                                    <td className="px-2 py-1">{c.es_principal ? <Badge className="text-xs">Sí</Badge> : ""}</td>
                                    <td className="px-2 py-1">
                                      {contactos.length > 1 && (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => eliminarContacto(c.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {contactos.length === 0 && (
                                  <tr>
                                    <td className="px-2 py-4 text-center text-gray-500" colSpan={7}>
                                      Sin contactos aún
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pestaña Facturación y Pagos */}
                    {activeTab === "facturacion" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Facturación y Pagos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium flex items-center"><Building className="h-4 w-4 mr-2" /> Divisa de Pago</Label>
                            <Select value={formData.divisa_pago} onValueChange={(value) => setFormData({ ...formData, divisa_pago: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MXN">🇲🇽 Pesos (MXN)</SelectItem>
                                <SelectItem value="USD">🇺🇸 Dólares (USD)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm font-medium flex items-center"><Settings className="h-4 w-4 mr-2" /> Forma de Facturación</Label>
                            <Select value={formData.forma_facturacion} onValueChange={(value) => setFormData({ ...formData, forma_facturacion: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {formasFacturacion.map((forma) => (
                                  <SelectItem key={forma.id} value={forma.nombre}>{forma.nombre} - {forma.descripcion}</SelectItem>
                                ))}
                                {formasFacturacion.length === 0 && (
                                  <SelectItem value="GLOBAL">Global</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2 mt-10 md:mt-12 border-t pt-6">
                          <Label className="text-sm font-medium flex items-center"><Building className="h-4 w-4 mr-2" /> Empresa Facturadora</Label>
                          <Select value={formData.empresa_facturadora} onValueChange={(value) => setFormData({ ...formData, empresa_facturadora: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="JOSE_FERNANDO_CABARJO">🇲🇽 José Fernando Cabarjo</SelectItem>
                              <SelectItem value="MONARCH_INTERNATIONAL">🇺🇸 Monarch International Transport Inc</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-500">Solo selecciona las opciones necesarias. Puedes configurar más formas después.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={guardarCliente} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : editingClient ? (
                        "Actualizar Cliente"
                      ) : (
                        "Guardar Cliente"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Resumen rápido de clientes */}
        {(() => {
          const totales = clientes.length;
          const activos = clientes.filter((c) => c.estado === "activo").length;
          const inactivos = clientes.filter((c) => c.estado === "inactivo").length;
          const hoy = new Date();
          const y = hoy.getFullYear();
          // Nuevos del año (reinicia cada 1 de enero)
          const nuevosAnio = clientes.filter((c) => {
            try {
              const f = new Date(c.fecha_registro);
              return f.getFullYear() === y;
            } catch {
              return false;
            }
          }).length;
          // Eliminados del año (estado 'eliminado' y updated_at del año actual)
          const eliminadosAnio = clientes.filter((c) => {
            try {
              // @ts-ignore
              if (c.estado !== "eliminado") return false;
              const u = new Date((c as any).updated_at || c.fecha_registro);
              return u.getFullYear() === y;
            } catch {
              return false;
            }
          }).length;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Clientes Totales (a la izquierda de Activos) */}
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Clientes Totales</div>
                    <div className="text-2xl font-bold text-indigo-600">{totales}</div>
                  </div>
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Clientes Activos</div>
                    <div className="text-2xl font-bold text-green-600">{activos}</div>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Clientes Inactivos</div>
                    <div className="text-2xl font-bold text-gray-600">{inactivos}</div>
                  </div>
                  <UserX className="h-8 w-8 text-gray-600" />
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Nuevos clientes este año</div>
                    <div className="text-2xl font-bold text-blue-600">{nuevosAnio}</div>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Eliminados este año</div>
                    <div className="text-2xl font-bold text-red-600">{eliminadosAnio}</div>
                  </div>
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Búsqueda + paginación superior */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre comercial, RFC o email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full min-w-[300px] md:min-w-[440px] lg:min-w-[560px] xl:min-w-[640px] max-w-[760px]"
                />
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
          </CardContent>
        </Card>

        {/* Lista de clientes (paginada) */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[40vh] md:max-h-none overflow-y-auto md:overflow-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          {clientesPaginados.map((cliente) => (
            <Card key={cliente.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{cliente.nombre}</CardTitle>
                    <CardDescription>
                      {cliente.rfc && `RFC: ${cliente.rfc}`}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => verDetallesCliente(cliente)}
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      variant={
                        cliente.estado === "activo" ? "outline" : "default"
                      }
                      size="sm"
                      onClick={() =>
                        cambiarEstadoCliente(
                          cliente.id,
                          cliente.estado === "activo" ? "inactivo" : "activo"
                        )
                      }
                      className={
                        cliente.estado === "inactivo"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : ""
                      }
                    >
                      {cliente.estado === "activo" ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarCliente(cliente.id)}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Mobile-only compact header to show client name (since CardHeader is hidden on mobile) */}
                <div className="md:hidden border-b pb-2 mb-2">
                  <div className="text-lg font-semibold text-gray-900">{cliente.nombre}</div>
                  {cliente.rfc && (
                    <div className="text-xs text-gray-500">RFC: {cliente.rfc}</div>
                  )}
                </div>
                {/* Información Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm text-gray-700">
                        RFC:
                      </span>
                      <span className="text-sm">
                        {cliente.rfc || "No especificado"}
                      </span>
                    </div>

                    {cliente.telefono && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-700">
                          Teléfono:
                        </span>
                        <span className="text-sm">{cliente.telefono}</span>
                      </div>
                    )}

                    {cliente.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-700">
                          Email:
                        </span>
                        <span className="text-sm break-all">
                          {cliente.email}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {cliente.direccion && (
                      <div className="flex items-start space-x-2">
                        <Building className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="font-medium text-sm text-gray-700 block">
                            Dirección:
                          </span>
                          <span className="text-sm text-gray-600">
                            {cliente.direccion}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm text-gray-700">
                        Estado:
                      </span>
                      <Badge
                        className={`text-xs ${
                          cliente.estado === "activo"
                            ? "bg-green-500 text-white"
                            : cliente.estado === "inactivo"
                            ? "bg-red-500 text-white"
                            : ""
                        }`}
                      >
                        {cliente.estado}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Información Adicional */}
                {cliente.empresa && (
                  <div className="border-t pt-3">
                    <div className="flex items-start space-x-2">
                      <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium text-sm text-gray-700 block">
                          Información adicional:
                        </span>
                        <div className="mt-2 space-y-2">
                          {(() => {
                            try {
                              // Extraer información de facturación
                              const factMatch =
                                cliente.empresa.match(/FACT:([^|]+)/);
                              const facturacion = factMatch
                                ? factMatch[1].trim()
                                : null;

                              // Extraer contactos
                              const contactosMatch = cliente.empresa.match(
                                /C\d+:[^;]+(;C\d+:[^;]+)*/g
                              );
                              const contactos = contactosMatch
                                ? contactosMatch[0]
                                    .split(";")
                                    .map((contactoStr, index) => {
                                      const match = contactoStr.match(
                                        /C\d+:([^|]*)\|([^|]*)\|(.*)/
                                      );
                                      if (match) {
                                        return {
                                          nombre: match[1] || "",
                                          telefono: match[2] || "",
                                          email: match[3] || "",
                                        };
                                      }
                                      return null;
                                    })
                                    .filter(Boolean)
                                : [];

                              return (
                                <div className="space-y-2">
                                  {facturacion && (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Facturación:
                                        </span>{" "}
                                        {facturacion}
                                      </span>
                                    </div>
                                  )}

                                  {contactos.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs font-medium text-gray-700">
                                          Contactos:
                                        </span>
                                      </div>
                                      <div className="ml-4 space-y-1">
                                        {contactos.map((contacto, index) => (
                                          contacto && (
                                            <div
                                              key={index}
                                              className="text-xs text-gray-600"
                                            >
                                              {contacto.nombre && (
                                                <div className="flex items-center space-x-1">
                                                  <span className="font-medium">
                                                    {contacto.nombre}
                                                  </span>
                                                  {contacto.telefono && (
                                                    <span className="text-gray-500">
                                                      • {contacto.telefono}
                                                    </span>
                                                  )}
                                                  {contacto.email && (
                                                    <span className="text-gray-500">
                                                      • {contacto.email}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (error) {
                              // Si hay error parseando, mostrar el texto original
                              return (
                                <span className="text-xs text-gray-600 break-words">
                                  {cliente.empresa}
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer con fecha */}
                <div className="border-t pt-3 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Registrado:</span>{" "}
                    {new Date(cliente.fecha_registro).toLocaleDateString(
                      "es-ES",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </div>
                  {cliente.updated_at && (
                    <div className="text-xs text-gray-400">
                      <span className="font-medium">Actualizado:</span>{" "}
                      {new Date(cliente.updated_at).toLocaleDateString(
                        "es-ES",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controles de paginación inferior */}
        {clientesFiltrados.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-600">
              Mostrando {Math.min(clientesFiltrados.length, end) - start} de {clientesFiltrados.length}
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

        {clientesFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron clientes</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {/* Modal de Detalles del Cliente */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles Completos del Cliente</DialogTitle>
              <DialogDescription>
                Información completa y comentarios del cliente seleccionado
              </DialogDescription>
            </DialogHeader>

            {selectedClient && (
              <div className="space-y-4">
                {/* Pestañas de navegación */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab("general")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "general"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Información General
                    </button>
                    <button
                      onClick={() => setActiveTab("contactos")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "contactos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Contactos
                    </button>
                    <button
                      onClick={() => setActiveTab("facturacion")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "facturacion"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Facturación y Pagos
                    </button>
                    <button
                      onClick={() => setActiveTab("sistema")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "sistema"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Sistema
                    </button>
                  </nav>
                </div>

                {/* Contenido de las pestañas */}
                <div className="mt-6">
                  {/* Pestaña Información General */}
                  {activeTab === "general" && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Información General</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Nombre Comercial</span>
                          <span className="text-sm">{selectedClient.nombre}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">RFC</span>
                          <span className="text-sm">{selectedClient.rfc || "No especificado"}</span>
                        </div>
                      </div>

                      {selectedClient.direccion && (
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Dirección</span>
                          <span className="text-sm text-gray-700">{selectedClient.direccion}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedClient.telefono && (
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Teléfono Principal</span>
                            <span className="text-sm">{selectedClient.telefono}</span>
                          </div>
                        )}
                        {selectedClient.email && (
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Email Principal</span>
                            <span className="text-sm break-all">{selectedClient.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Estado</span>
                          <div className="mt-1">
                            <Badge
                              variant={
                                selectedClient.estado === "activo"
                                  ? "default"
                                  : selectedClient.estado === "inactivo"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {selectedClient.estado}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Fecha de Registro</span>
                          <span className="text-sm">
                            {new Date(selectedClient.fecha_registro).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pestaña Contactos */}
                  {activeTab === "contactos" && (
                    <div>
                      {selectedClientContacts.length > 0 ? (
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-3 py-2 text-left font-semibold">Contacto</th>
                                <th className="px-3 py-2 text-left font-semibold">Puesto</th>
                                <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                                <th className="px-3 py-2 text-left font-semibold">Email</th>
                                <th className="px-3 py-2 text-left font-semibold">Notas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedClientContacts.map((contacto) => (
                                <tr key={contacto.id} className="border-t align-top">
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-600" />
                                      <span className="font-medium text-gray-900">{contacto.nombre || "Sin nombre"}</span>
                                      {contacto.es_principal && (
                                        <Badge className="bg-green-100 text-green-800 text-xs">Principal</Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">{contacto.puesto || "-"}</td>
                                  <td className="px-3 py-2">{contacto.telefono || "-"}</td>
                                  <td className="px-3 py-2 break-all">{contacto.email || "-"}</td>
                                  <td className="px-3 py-2">
                                    <div className="whitespace-pre-wrap break-words">{contacto.notas || "-"}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No hay contactos registrados</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Los contactos se pueden agregar al editar el cliente
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pestaña Facturación y Pagos */}
                  {activeTab === "facturacion" && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Divisa de Pago Preferida</span>
                          <span className="text-sm">
                            {selectedClient.divisa_pago === "USD"
                              ? "🇺🇸 Dólares Americanos (USD)"
                              : selectedClient.divisa_pago === "MXN"
                              ? "🇲🇽 Pesos Mexicanos (MXN)"
                              : "No especificado"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">Empresa Facturadora</span>
                          <span className="text-sm">
                            {selectedClient.empresa_facturadora === "JOSE_FERNANDO_CABARJO"
                              ? "🇲🇽 José Fernando Cabarjo"
                              : selectedClient.empresa_facturadora === "MONARCH_INTERNATIONAL"
                              ? "🇺🇸 Monarch International Transport Inc"
                              : selectedClient.empresa_facturadora || "No especificado"}
                          </span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="block text-xs text-gray-500 mb-1">Forma de Facturación</span>
                        <span className="text-sm">
                          {selectedClient.forma_facturacion || "No especificado"}
                        </span>
                      </div>
                      {/* Información adicional de facturación del campo empresa */}
                      {(() => {
                        try {
                          const factMatch = selectedClient.empresa?.match(/FACT:([^|]+)/);
                          const facturacion = factMatch ? factMatch[1].trim() : null;
                          if (facturacion && facturacion !== selectedClient.forma_facturacion) {
                            return (
                              <div className="mb-4">
                                <span className="block text-xs text-gray-500 mb-1">Información Adicional de Facturación</span>
                                <span className="text-sm">{facturacion}</span>
                              </div>
                            );
                          }
                        } catch (error) {
                          return null;
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Pestaña Sistema */}
                  {activeTab === "sistema" && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">ID del Cliente</span>
                          <span className="text-sm font-mono">{selectedClient.id}</span>
                        </div>
                        {selectedClient.updated_at && (
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Última Actualización</span>
                            <span className="text-sm">
                              {new Date(selectedClient.updated_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Información completa del campo empresa para debug */}
                      {selectedClient.empresa && (
                        <div className="mb-4">
                          <span className="block text-xs text-gray-500 mb-1">Datos Completos (Campo Empresa)</span>
                          <span className="text-xs font-mono break-all block max-h-32 overflow-y-auto">{selectedClient.empresa}</span>
                        </div>
                      )}
                      <div className="bg-yellow-50 p-4 rounded mb-2">
                        <span className="block text-xs font-medium text-yellow-800 mb-2">Información para Desarrolladores</span>
                        <span className="text-xs text-yellow-700">
                          Para debug en consola del navegador, ejecuta: <code>debugCliente('{selectedClient.id}')</code>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cerrar
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailModal(false);
                        editarCliente(selectedClient);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modificar Información
                    </Button>
                    <Button
                      variant={
                        selectedClient.estado === "activo"
                          ? "destructive"
                          : "default"
                      }
                      onClick={() => {
                        cambiarEstadoCliente(
                          selectedClient.id,
                          selectedClient.estado === "activo"
                            ? "inactivo"
                            : "activo"
                        );
                        setShowDetailModal(false);
                      }}
                      className={
                        selectedClient.estado === "activo"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }
                    >
                      {selectedClient.estado === "activo"
                        ? "Desactivar Cliente"
                        : "Activar Cliente"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
