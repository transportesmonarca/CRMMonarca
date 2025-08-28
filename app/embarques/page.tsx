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
  Eye,
  RefreshCw,
  Printer,
  Link,
  ImageIcon,
  Copy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { agregarAuditLog } from "@/lib/audit";
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

export default function EmbarquesPage() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [remolques, setRemolques] = useState<Remolque[]>([]);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingEmbarque, setCancelingEmbarque] = useState<Embarque | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState("");
  const [proximoFolio, setProximoFolio] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [embarqueFotos, setEmbarqueFotos] = useState<FotoEmbarque[]>([]);

  const { toast } = useToast();

  // Estado para el formulario
  const [formData, setFormData] = useState({
    folio: "",
    cliente_id: "",
    camion_id: "",
    remolque_id: "",
    contenido: "",
    peso: "",
    observaciones: "",
    direccion_recolecta: "",
    direccion_entrega: "",
    fecha_recolecta: "",
    hora_recolecta: "",
    fecha_entrega: "",
    hora_entrega: "",
    load_number: "",
    patente_agente_aduanal: "",
    aduana_cruce: "",
    dueno_mercancia: "",
    representante_cliente: "",
    carta_porte: "",
    tipo_servicio_id: "",
    remolque_manual: false,
    remolque_numero_economico: "",
    remolque_placa: "",
  // remolque_sello_fiscal removido (no se usa)
  });

  // Validaciones para "Nuevo Embarque"
  const isClienteSelected = !!formData.cliente_id && formData.cliente_id !== "none";
  const isRemolqueValid = formData.remolque_manual
    ? (formData.remolque_numero_economico.trim() !== "" || formData.remolque_placa.trim() !== "")
    : (!!formData.remolque_id && formData.remolque_id !== "none");
  const isNuevoEmbarqueValid = isClienteSelected && isRemolqueValid;

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    cargarProximoFolio();
  }, []);

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
      const { data, error } = await supabase
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

      if (error) {
        console.error("Error loading embarques:", error);
        return;
      }

      setEmbarques(data || []);
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

      const { data: existingEmbarques, error } = await supabase
        .from("embarques")
        .select("folio")
        .like("folio", `${baseFormat}-%`)
        .order("folio", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error getting existing folios:", error);
        return `${baseFormat}-001`;
      }

      if (!existingEmbarques || existingEmbarques.length === 0) {
        return `${baseFormat}-001`;
      }

      const lastFolio = existingEmbarques[0].folio;
      const consecutiveMatch = lastFolio.match(/-(\d{3})$/);

      if (!consecutiveMatch) {
        return `${baseFormat}-001`;
      }

      const lastConsecutive = Number.parseInt(consecutiveMatch[1]);
      const nextConsecutive = (lastConsecutive + 1).toString().padStart(3, "0");

      return `${baseFormat}-${nextConsecutive}`;
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
      direccion_recolecta: "",
      direccion_entrega: "",
      fecha_recolecta: "",
      hora_recolecta: "",
      fecha_entrega: "",
      hora_entrega: "",
      load_number: "",
      patente_agente_aduanal: "",
      aduana_cruce: "",
      dueno_mercancia: "",
      representante_cliente: "",
      carta_porte: "",
      tipo_servicio_id: "",
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
      direccion_recolecta:
        "Parque Industrial Norte #100, Col. Centro, Monterrey, NL",
      fecha_recolecta: formatDate(now),
      hora_recolecta: formatTime(9, 0),
      direccion_entrega:
        "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, MX",
      fecha_entrega: formatDate(addDays(now, 1)),
      hora_entrega: formatTime(17, 0),
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

  const handleEdit = async (embarque: Embarque) => {
    setFormData({
      folio: embarque.folio,
      cliente_id: embarque.cliente_id || "",
      camion_id: embarque.camion_id || "",
      remolque_id: embarque.remolque_id || "",
      direccion_recolecta: embarque.direccion_recolecta || "",
      direccion_entrega: embarque.direccion_entrega || "",
      fecha_recolecta: embarque.fecha_recolecta || "",
      hora_recolecta: embarque.hora_recolecta || "",
      fecha_entrega: embarque.fecha_entrega || "",
      hora_entrega: embarque.hora_entrega || "",
      contenido: embarque.contenido || "",
      peso: embarque.peso?.toString() || "",
      observaciones: embarque.observaciones || "",
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
  // remolque_sello_fiscal removido (no se usa)
    });

    if (embarque.cliente_id) {
      await cargarContactos(embarque.cliente_id);
    }

    setEmbarqueEditando(embarque);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.direccion_recolecta || !formData.direccion_entrega) {
      alert(
        "Por favor completa los campos obligatorios (dirección de recolecta y dirección de entrega)"
      );
      return;
    }

    // Validación específica para creación: requiere Cliente y Remolque (o captura manual)
    if (!embarqueEditando) {
      if (!isClienteSelected || !isRemolqueValid) {
        alert(
          "Para crear un embarque debes seleccionar un cliente y un remolque o capturarlo manualmente."
        );
        return;
      }
    }

    // Validación para remolque manual: capturar al menos número económico o placa
    if (
      formData.remolque_manual &&
      !formData.remolque_numero_economico.trim() &&
      !formData.remolque_placa.trim()
    ) {
      alert(
        "Captura al menos el número económico o la placa del remolque no registrado"
      );
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
        origen: formData.direccion_recolecta || "Por definir",
        destino: formData.direccion_entrega || "Por definir",
        direccion_recolecta: formData.direccion_recolecta,
        direccion_entrega: formData.direccion_entrega,
        fecha_recolecta: formData.fecha_recolecta || null,
        hora_recolecta: formData.hora_recolecta || null,
        fecha_entrega: formData.fecha_entrega || null,
        hora_entrega: formData.hora_entrega || null,
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
        embarqueData.observaciones = formData.observaciones || null;
      } catch (error) {
        console.warn("Campo observaciones no disponible en el esquema actual");
      }

  // Sello fiscal del remolque eliminado del flujo

      console.log("Datos a guardar:", embarqueData);

      if (embarqueEditando) {
        const { error } = await supabase
          .from("embarques")
          .update(embarqueData)
          .eq("id", embarqueEditando.id);
        if (error) {
          console.error("Error actualizando embarque:", error);
          alert(`Error al actualizar embarque: ${error.message}`);
          return;
        }
        agregarAuditLog("ACTUALIZAR", "Embarques", `Folio: ${folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      } else {
        const { error } = await supabase.from("embarques").insert(embarqueData);
        if (error) {
          console.error("Error creando embarque:", error);
          alert(`Error al crear embarque: ${error.message}`);
          return;
        }
        agregarAuditLog("CREAR", "Embarques", `Folio: ${folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      }

      alert(
        embarqueEditando
          ? "Embarque actualizado exitosamente"
          : "Embarque creado exitosamente"
      );
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
      await loadEmbarques();
    } catch (error) {
      console.error("Error guardando embarque:", error);
      const msg = (error as any)?.message || String(error);
      alert(`Error al guardar embarque: ${msg}`);
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
        alert("Error al eliminar embarque");
        return;
      }

      alert("Embarque eliminado exitosamente");
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
      alert("Error al eliminar embarque");
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
    if (embarque.id) {
      const fotos = await obtenerFotosEmbarque(embarque.id); // Fetch photos
      setEmbarqueFotos(fotos); // Set photos in state
    } else {
      setEmbarqueFotos([]); // Clear if no embarque ID
    }
  };

  const cancelarEmbarque = async () => {
  if (cancelingEmbarque) {
    agregarAuditLog(
      "ELIMINAR",
      "Embarques",
      `Folio: ${cancelingEmbarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`
    );
  }
    if (!cancelingEmbarque || !cancelReason.trim()) {
      alert("Por favor ingresa una justificación para la cancelación");
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
        alert(
          `Error al cancelar embarque: ${
            // @ts-ignore
            baseError?.message || JSON.stringify(baseError) || "Desconocido"
          }`
        );
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

      alert("Embarque cancelado exitosamente");
      setShowCancelModal(false);
      setCancelingEmbarque(null);
      setCancelReason("");
      await loadEmbarques();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cancelar embarque");
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
        alert("Error al actualizar el estado");
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
      alert("Error al actualizar el estado");
    }
  };

  const marcarComoCompletado = async (embarque: Embarque) => {
  const confirmar = window.confirm(
    `¿Deseas completar y enviar el embarque ${embarque.folio} a Asignación?\n\n` +
      "Esta acción cambiará su estado a 'listo-para-asignar'."
  );
  if (!confirmar) {
    return;
  }
  agregarAuditLog("ACTUALIZAR", "Embarques", `Folio: ${embarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
    try {
      setSaving(true);

      const { error } = await supabase
        .from("embarques")
        .update({
          estado: "listo-para-asignar",
          updated_at: new Date().toISOString(),
        })
        .eq("id", embarque.id);

      if (error) {
        console.error("Error actualizando embarque:", error);
        alert("Error al marcar como completado");
        return;
      }

      alert("Embarque marcado como completado y enviado a asignación");
      await loadEmbarques();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al marcar como completado");
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

  const imprimirFormulario = () => {
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
              <span class="label">Dirección de Recolecta:</span><br>
              <span class="value" style="width: 100%; min-height: 24px; display: block;">${
                formData.direccion_recolecta
              }</span>
            </div>
            <div class="field full-width">
              <span class="label">Dirección de Entrega:</span><br>
              <span class="value" style="width: 100%; min-height: 24px; display: block;">${
                formData.direccion_entrega
              }</span>
            </div>
          </div>

          <div class="section">
            <h3>FECHAS Y HORARIOS</h3>
            <div class="grid">
              <div class="field">
                <span class="label">Fecha Recolecta:</span> <span class="value">${
                  formData.fecha_recolecta
                }</span>
              </div>
              <div class="field">
                <span class="label">Hora Recolecta:</span> <span class="value">${
                  formData.hora_recolecta
                }</span>
              </div>
              <div class="field">
                <span class="label">Fecha Entrega:</span> <span class="value">${
                  formData.fecha_entrega
                }</span>
              </div>
              <div class="field">
                <span class="label">Hora Entrega:</span> <span class="value">${
                  formData.hora_entrega
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
    const camionTexto = embarqueDetalle.camion
      ? `${embarqueDetalle.camion.numero_economico || ""}`
      : (embarqueDetalle as any).camion_numero_economico || "";
    const remolqueTexto = embarqueDetalle.remolque
      ? `${embarqueDetalle.remolque.numero_economico || "Sin económico"} | ${embarqueDetalle.remolque.marca || "Sin marca"} | Placas: ${embarqueDetalle.remolque.placas || "Sin placas"}`
      : embarqueDetalle.remolque_numero_economico
      ? `${embarqueDetalle.remolque_numero_economico}${embarqueDetalle.remolque_placa ? ` | Placas: ${embarqueDetalle.remolque_placa}` : ""}`
      : "";

    const printContent = `
      <html>
        <head>
          <title>Embarque ${embarqueDetalle.folio}</title>
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
              <h2>DETALLES DEL EMBARQUE</h2>
              <p>Folio: <span class="value">${embarqueDetalle.folio}</span></p>
            </div>

            <div class="section">
              <h3>INFORMACIÓN BÁSICA</h3>
              <div class="grid">
                <div class="field">
                  <span class="label">Carta Porte:</span> <span class="value">${embarqueDetalle.carta_porte || ""}</span>
                </div>
                <div class="field">
                  <span class="label">Cliente:</span> <span class="value">${clienteNombre}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>DIRECCIONES</h3>
              <div class="field full-width">
                <span class="label">Dirección de Recolecta:</span><br>
                <span class="value" style="width: 100%; min-height: 24px; display: block;">${embarqueDetalle.direccion_recolecta || ""}</span>
              </div>
              <div class="field full-width">
                <span class="label">Dirección de Entrega:</span><br>
                <span class="value" style="width: 100%; min-height: 24px; display: block;">${embarqueDetalle.direccion_entrega || ""}</span>
              </div>
            </div>

            <div class="section">
              <h3>FECHAS Y HORARIOS</h3>
              <div class="grid">
                <div class="field">
                  <span class="label">Fecha Recolecta:</span> <span class="value">${embarqueDetalle.fecha_recolecta || ""}</span>
                </div>
                <div class="field">
                  <span class="label">Hora Recolecta:</span> <span class="value">${embarqueDetalle.hora_recolecta || ""}</span>
                </div>
                <div class="field">
                  <span class="label">Fecha Entrega:</span> <span class="value">${embarqueDetalle.fecha_entrega || ""}</span>
                </div>
                <div class="field">
                  <span class="label">Hora Entrega:</span> <span class="value">${embarqueDetalle.hora_entrega || ""}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>VEHÍCULOS</h3>
              <div class="grid">
                <div class="field">
                  <span class="label">Tractocamión:</span> <span class="value">${camionTexto}</span>
                </div>
                <div class="field">
                  <span class="label">Remolque:</span> <span class="value">${remolqueTexto}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>DETALLES DE CARGA</h3>
              <div class="grid">
                <div class="field">
                  <span class="label">Contenido:</span> <span class="value">${embarqueDetalle.contenido || ""}</span>
                </div>
                <div class="field">
                  <span class="label">Peso (kg):</span> <span class="value">${(embarqueDetalle as any).peso || ""}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>OBSERVACIONES</h3>
              <div class="field full-width">
                <span class="value" style="width: 100%; min-height: 30px; display: block;">${embarqueDetalle.observaciones || ""}</span>
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
        `Imprimió detalle del embarque ${embarqueDetalle.folio}`
      );
    } catch {}
  };

  // Paginación para la lista principal de embarques (similar a Gestión de Operadores)
  const [listaPage, setListaPage] = useState(1);
  const [listaPageSize, setListaPageSize] = useState(12);

  // Filtrar embarques
  const embarquesFiltrados = embarques.filter((embarque) => {
    if (embarque.estado === "archivado") return false;
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

    return coincideBusqueda && coincideEstado;
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
  const getRemolqueTexto = (e: Embarque) =>
    e.remolque
      ? `${e.remolque.numero_economico || "Sin económico"} | ${e.remolque.marca || "Sin marca"} | Placas: ${e.remolque.placas || "Sin placas"}`
      : (e as any).remolque_numero_economico
      ? `${(e as any).remolque_numero_economico}${(e as any).remolque_placa ? ` | Placas: ${(e as any).remolque_placa}` : ""}`
      : "";

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
      "Dueño Mercancía",
      "Contacto Nombre",
      "Contacto Puesto",
      "Contacto Teléfono",
      "Contacto Email",
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
        e.fecha_creacion ? new Date(e.fecha_creacion).toLocaleString() : "",
        e.updated_at ? new Date(e.updated_at).toLocaleString() : "",
        e.patente_agente_aduanal || "",
        e.aduana_cruce || "",
        e.dueno_mercancia || "",
        `${contacto.nombre || ""} ${contacto.apellidos || ""}`.trim(),
        contacto.puesto || "",
        contacto.telefono || "",
        contacto.email || "",
      ];
    });

    const csvContent = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const str = String(cell ?? "");
            const escaped = '"' + str.replace(/"/g, '""') + '"';
            return escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `embarques_activos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Embarques",
        `Exportó ${activos.length} embarques activos a CSV`
      );
    } catch {}
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
      "Dueño Mercancía",
      "Contacto Nombre",
      "Contacto Puesto",
      "Contacto Teléfono",
      "Contacto Email",
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
    ];

    const csvContent = [header, row]
      .map((r) =>
        r
          .map((cell) => {
            const str = String(cell ?? "");
            const escaped = '"' + str.replace(/"/g, '""') + '"';
            return escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `embarque_${e.folio}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      agregarAuditLog(
        "EXPORTAR",
        "Embarques",
        `Exportó detalle del embarque ${e.folio} a CSV`
      );
    } catch {}
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

  const eliminarArchivadoDefinitivo = async (embarque: Embarque) => {
    const msg = `¿Eliminar definitivamente el embarque ${embarque.folio}?\n\n` +
      "Esta acción no se puede deshacer y eliminará el registro de forma permanente.";
    const confirmado = window.confirm(msg);
    if (!confirmado) return;
    try {
      setSaving(true);
      agregarAuditLog("ELIMINAR", "Embarques (Archivados)", `Folio: ${embarque.folio} | Usuario: ${getCurrentUser()?.nombre || ''}`);
      const { error } = await supabase
        .from("embarques")
        .delete()
        .eq("id", embarque.id);
      if (error) {
        console.error("Error eliminando embarque archivado:", error);
        toast({
          title: "Error al eliminar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Eliminado", description: `Se eliminó el embarque ${embarque.folio}.` });
      await loadEmbarques();
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Error inesperado", description: "No se pudo eliminar el embarque.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getEstadoBadge = (estado: string, embarque?: Embarque) => {
    if (
      estado === "creado" &&
      embarque &&
      embarque.updated_at &&
      new Date(embarque.updated_at).getTime() >
        new Date(embarque.fecha_creacion).getTime()
    ) {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          Modificado
        </Badge>
      );
    }

    // No mostrar badge para estado 'creado'
    if (estado === "creado") {
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
              Gestión de Embarques
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                onClick={() => setArchivosPeriodo("todo")}
              >
                Todo
              </Button>
              <Button
                variant={archivosPeriodo === "mes_actual" ? "default" : "outline"}
                size="sm"
                onClick={() => setArchivosPeriodo("mes_actual")}
              >
                Mes actual
              </Button>
              <Button
                variant={archivosPeriodo === "mes_anterior" ? "default" : "outline"}
                size="sm"
                onClick={() => setArchivosPeriodo("mes_anterior")}
              >
                Mes anterior
              </Button>
              <Button
                variant={archivosPeriodo === "ultimos_3" ? "default" : "outline"}
                size="sm"
                onClick={() => setArchivosPeriodo("ultimos_3")}
              >
                Últ. 3 meses
              </Button>
              <Button
                variant={archivosPeriodo === "ultimos_6" ? "default" : "outline"}
                size="sm"
                onClick={() => setArchivosPeriodo("ultimos_6")}
              >
                Últ. 6 meses
              </Button>
              <Button
                variant={archivosPeriodo === "este_anio" ? "default" : "outline"}
                size="sm"
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
                <Button
                  variant="outline"
                  className="border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black"
                  onClick={exportarArchivadosAExcel}
                >
                  Descargar Excel
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-40 md:w-48 cursor-pointer select-none" onClick={() => handleSort("folio")}>Folio{sortIndicator("folio")}</th>
                    <th className="px-3 py-2 text-left font-semibold w-44 md:w-64 cursor-pointer select-none" onClick={() => handleSort("cliente")}>
                      Cliente{sortIndicator("cliente")}
                    </th>
                    <th className="px-3 py-2 text-center font-semibold w-14 md:w-16 cursor-pointer select-none" onClick={() => handleSort("load")}>Load{sortIndicator("load")}</th>
                    <th className="px-3 py-2 text-center font-semibold w-16 md:w-20 cursor-pointer select-none" onClick={() => handleSort("estatus")}>Estatus{sortIndicator("estatus")}</th>
                    <th className="px-3 py-2 text-left font-semibold w-48 cursor-pointer select-none" onClick={() => handleSort("tipo")}>
                      Tipo de Servicio{sortIndicator("tipo")}
                    </th>
                    <th className="px-3 py-2 text-left font-semibold w-32 cursor-pointer select-none" onClick={() => handleSort("fecha")}>Fecha de creación{sortIndicator("fecha")}</th>
                    <th className="px-3 py-2 text-center font-semibold">Acciones</th>
                    <th className="px-3 py-2 text-center font-semibold">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {embarquesArchivadosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-gray-500"
                      >
                        <Package className="h-10 w-10 mx-auto mb-2 text-purple-400" />
                        No hay embarques archivados que coincidan
                      </td>
                    </tr>
                  ) : (
                    embarquesArchivadosPaginados.map((embarque) => (
                      <tr
                        key={embarque.id}
                        className="border-b hover:bg-purple-50"
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap w-40 md:w-48">
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
                        <td className="px-3 py-2">
                          {getServiceDisplayName(embarque.tipo_servicio_id || "")}
                        </td>
                        <td className="px-3 py-2 w-32 whitespace-nowrap">
                          {embarque.fecha_creacion
                            ? new Date(embarque.fecha_creacion).toLocaleDateString("es-MX")
                            : ""}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(embarque)}
                            aria-label="Ver detalles"
                          >
              <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarArchivadoDefinitivo(embarque)}
                            disabled={!puedeEliminarArchivado(embarque)}
                            className={`border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black${
                              !puedeEliminarArchivado(embarque) ? " opacity-50 cursor-not-allowed" : ""
                            }`}
                            aria-label="Eliminar definitivamente"
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalArchivadosPaginas > 1 && (
                <div className="flex items-center justify-between p-3 text-sm">
                  <div>
                    Página {archivosPage} de {totalArchivadosPaginas}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setArchivosPage((p) => Math.max(1, p - 1))}
                      disabled={archivosPage <= 1}
                    >
                      ◀ Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setArchivosPage((p) => Math.min(totalArchivadosPaginas, p + 1))
                      }
                      disabled={archivosPage >= totalArchivadosPaginas}
                    >
                      Siguiente ▶
                    </Button>
                  </div>
                </div>
              )}
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
                  <p className="text-xs text-gray-500">Total del año en curso</p>
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
                  setFiltroEstado(v);
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
              key={embarque.id}
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
                    <div className="flex space-x-1">
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

                      {embarque.estado === "creado" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => marcarComoCompletado(embarque)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Completar y Enviar
                        </Button>
                      )}

                      {embarque.estado === "listo-para-asignar" && (
                        <Badge className="bg-green-100 text-green-800">
                          Listo para Asignar
                        </Badge>
                      )}
                      {embarque.estado === "cancelado" && (
                        <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
                      )}

                      {/* Botón Enviar Link oculto por requerimiento */}

                      {(embarque.estado === "finalizado" ||
                        embarque.estado === "cancelado") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                "¿Estás seguro de que deseas archivar este embarque?"
                              )
                            ) {
                              updateEstado(embarque, "archivado");
                            }
                          }}
                        >
                          Archivar
                        </Button>
                      )}

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
                    <div>
                      <p className="font-medium">Recolecta</p>
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
                          {new Date(
                            embarque.fecha_recolecta
                          ).toLocaleDateString()}
                          {embarque.hora_recolecta &&
                            ` ${embarque.hora_recolecta}`}
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
                          {new Date(
                            embarque.fecha_entrega
                          ).toLocaleDateString()}
                          {embarque.hora_entrega && ` ${embarque.hora_entrega}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm border-t pt-3">
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
                      ((embarque.cliente as any).divsa_pago ||
                        (embarque.cliente as any).divisa_pago))) && (
                    <div className="flex items-center space-x-4">
                      {embarque.tipo_servicio_id && (
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Tipo de Servicio</p>
                            <p className="text-xs text-gray-500">
                              {getServiceDisplayName(embarque.tipo_servicio_id)}
                            </p>
                          </div>
                        </div>
                      )}
                      {getRemolqueTexto(embarque) && (
                        <div className="flex items-center space-x-2">
                          <div>
                            <p className="font-medium">Remolque</p>
                            <p className="text-xs text-gray-500">{getRemolqueTexto(embarque)}</p>
                          </div>
                        </div>
                      )}
                      {(embarque.cliente &&
                        (((embarque.cliente as any).divsa_pago ||
                          (embarque.cliente as any).divisa_pago))) && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Divisa de Pago:</span>
                          <span className="text-xs text-gray-500">
                            {(
                              (embarque.cliente as any).divsa_pago ||
                              (embarque.cliente as any).divisa_pago
                            )}
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
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">
                      Información Aduanal
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {embarque.load_number && (
                        <div className="text-sm">
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
                          <span className="font-medium">Dueño:</span>{" "}
                          {embarque.dueno_mercancia}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(embarque.contenido || embarque.observaciones) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {embarque.contenido && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Contenido:</strong> {embarque.contenido}
                        </p>
                      </div>
                    )}
                    {embarque.observaciones && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Observaciones:</strong>{" "}
                          {embarque.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-400">
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
                    setFiltroEstado(v);
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
                    <CardTitle className="text-lg">
                      Información Básica
                    </CardTitle>
                    {/* Botón de prellenado eliminado por requerimiento */}
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
                        <h4 className="font-medium text-gray-900">
                          Información de Recolecta
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="direccion_recolecta">
                              Dirección de Recolecta *
                            </Label>
                            <Textarea
                              id="direccion_recolecta"
                              value={formData.direccion_recolecta}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  direccion_recolecta: e.target.value,
                                })
                              }
                              placeholder="Dirección completa de recolecta"
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="fecha_recolecta">
                                Fecha de Recolecta
                              </Label>
                              <Input
                                id="fecha_recolecta"
                                type="date"
                                value={formData.fecha_recolecta}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    fecha_recolecta: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hora_recolecta">
                                Hora de Recolecta
                              </Label>
                              <Input
                                id="hora_recolecta"
                                type="time"
                                value={formData.hora_recolecta}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    hora_recolecta: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900">
                          Información de Entrega
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="direccion_entrega">
                              Dirección de Entrega *
                            </Label>
                            <Textarea
                              id="direccion_entrega"
                              value={formData.direccion_entrega}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  direccion_entrega: e.target.value,
                                })
                              }
                              placeholder="Dirección completa de entrega"
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="fecha_entrega">
                                Fecha de Entrega
                              </Label>
                              <Input
                                id="fecha_entrega"
                                type="date"
                                value={formData.fecha_entrega}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    fecha_entrega: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hora_entrega">
                                Hora de Entrega
                              </Label>
                              <Input
                                id="hora_entrega"
                                type="time"
                                value={formData.hora_entrega}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    hora_entrega: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
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
                              Dueño de la Mercancía
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
                              placeholder="Nombre del dueño"
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
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                          {embarqueDetalle.observaciones}
                        </p>
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
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                              {embarqueDetalle.direccion_recolecta ||
                                "Sin especificar"}
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Fecha de Recolecta
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.fecha_recolecta
                                  ? new Date(
                                      embarqueDetalle.fecha_recolecta
                                    ).toLocaleDateString("es-MX", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "Sin especificar"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Hora de Recolecta
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.hora_recolecta ||
                                  "Sin especificar"}
                              </p>
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
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">
                              {embarqueDetalle.direccion_entrega ||
                                "Sin especificar"}
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Fecha de Entrega
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.fecha_entrega
                                  ? new Date(
                                      embarqueDetalle.fecha_entrega
                                    ).toLocaleDateString("es-MX", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "Sin especificar"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Hora de Entrega
                              </Label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                                {embarqueDetalle.hora_entrega ||
                                  "Sin especificar"}
                              </p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1 inline-flex items-center">
                              <span>
                                {detalleContacto
                                  ? `${detalleContacto?.nombre || ""} ${detalleContacto?.apellidos || ""}`.trim()
                                  : `${embarqueDetalle.info_representante?.nombre || ""} ${embarqueDetalle.info_representante?.apellidos || ""}`.trim()}
                              </span>
                              {(detalleContacto?.es_principal || embarqueDetalle.info_representante
                                .es_principal) && (
                                <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                                  Principal
                                </Badge>
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

                  <TabsContent value="archivos" className="space-y-4 mt-6">
                    <h4 className="font-medium text-gray-900">Fotos y Ubicaciones</h4>

                    {embarqueFotos.some((f) => typeof (f as any).latitud === "number" && typeof (f as any).longitud === "number") && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Ubicaciones donde se subieron las fotografías (según confirmación de geolocalización del operador):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {embarqueFotos
                            .filter((f) => typeof (f as any).latitud === "number" && typeof (f as any).longitud === "number")
                            .slice(0, 9)
                            .map((f) => {
                              const lat = (f as any).latitud as number;
                              const lng = (f as any).longitud as number;
                              const mapsEmbed = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
                              const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
                              return (
                                <div key={f.id} className="rounded-lg overflow-hidden border">
                                  <iframe
                                    src={mapsEmbed}
                                    width="100%"
                                    height="200"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                  />
                                  <div className="p-2 text-xs text-gray-600 flex items-center justify-between">
                                    <span className="truncate">{new Date((f as any).fecha_subida).toLocaleString()}</span>
                                    <a
                                      className="text-blue-600 hover:underline ml-2 shrink-0"
                                      href={mapsLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Abrir en Maps
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

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
                              <div className="p-2 text-xs space-y-0.5">
                                <p className="font-medium truncate">{foto.nombre_archivo}</p>
                                <p className="text-gray-500">Subido por: {foto.subido_por || "Desconocido"}</p>
                                <p className="text-gray-500">{new Date(foto.fecha_subida).toLocaleDateString()}</p>
                                {hasGeo && (
                                  <p>
                                    <a
                                      className="text-blue-600 hover:underline"
                                      href={mapsLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Ver ubicación
                                    </a>
                                  </p>
                                )}
                              </div>
                              <a
                                href={foto.url_blob}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
      </div>
    </MainLayout>
  );
}
