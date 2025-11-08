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
import { useState, useEffect, useRef } from "react";
import {
  supabase,
  type Cliente,
  obtenerContactosCliente,
  obtenerContactosClienteTabla,
  guardarContactosCliente,
  guardarContactosClienteRobusto,
  type ContactoCliente,
  obtenerFormasFacturacion,
  guardarFormasFacturacion,
  obtenerRepresentantesCliente,
  diagnosticarConexionSupabase,
  diagnosticarTablaContactos,
} from "@/lib/supabase";
import { agregarAuditLog } from "@/lib/audit";
import { toast } from "@/hooks/use-toast";

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
  
  // Estado para representantes (separado de contactos)
  const [representantes, setRepresentantes] = useState<ContactoCliente[]>([]);

  // Contacto en captura (para nuevo contacto)
  const [nuevoContacto, setNuevoContacto] = useState({
    nombre: "",
    puesto: "",
    telefono: "",
    email: "",
    notas: "",
  });
  
  // Representante en captura (para nuevo representante)
  const [nuevoRepresentante, setNuevoRepresentante] = useState({
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

  // Estados para paginación de contactos
  const [paginaContactos, setPaginaContactos] = useState(1);
  const [contactosPorPagina, setContactosPorPagina] = useState(5);

  // Estados para paginación de contactos en modal de detalles
  const [paginaContactosDetalle, setPaginaContactosDetalle] = useState(1);
  const [contactosPorPaginaDetalle, setContactosPorPaginaDetalle] = useState(10);

  // Funciones para paginación de contactos
  const calcularPaginacionContactos = () => {
    const inicio = (paginaContactos - 1) * contactosPorPagina;
    const fin = inicio + contactosPorPagina;
    const contactosPaginados = contactos.slice(inicio, fin);
    const totalPaginas = Math.ceil(contactos.length / contactosPorPagina);
    
    return {
      contactosPaginados,
      totalPaginas,
      inicio: inicio + 1,
      fin: Math.min(fin, contactos.length),
      total: contactos.length
    };
  };

  // Funciones para paginación de contactos en modal de detalles
  const calcularPaginacionContactosDetalle = () => {
    const inicio = (paginaContactosDetalle - 1) * contactosPorPaginaDetalle;
    const fin = inicio + contactosPorPaginaDetalle;
    const contactosPaginados = selectedClientContacts.slice(inicio, fin);
    const totalPaginas = Math.ceil(selectedClientContacts.length / contactosPorPaginaDetalle);
    
    return {
      contactosPaginados,
      totalPaginas,
      inicio: inicio + 1,
      fin: Math.min(fin, selectedClientContacts.length),
      total: selectedClientContacts.length
    };
  };

  // Generador simple de UUID v4 (sin dependencias)
  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // 🎲 Función para generar datos aleatorios de cliente
  const generarDatosAleatorios = () => {
    const empresas = [
      "Logística Express", "Transportes del Norte", "Comercial Pacífico", 
      "Distribuidora Central", "Grupo Monterrey", "Servicios Industriales",
      "Exportadora Frontera", "Importadora Global", "Manufactura Moderna",
      "Soluciones Logísticas", "Corporativo Bajío", "Empresas Unidas"
    ];
    
    const rfcs = [
      "XAXX010101000", "XEXX010101001", "XOXX010101002", "XIXX010101003",
      "XUXX010101004", "XMXX010101005", "XNXX010101006", "XPXX010101007",
      "XQXX010101008", "XRXX010101009", "XSXX010101010", "XTXX010101011"
    ];

    const ciudades = [
      "Reynosa, Tamaulipas", "Matamoros, Tamaulipas", "Monterrey, Nuevo León",
      "Ciudad de México", "Guadalajara, Jalisco", "Tijuana, Baja California",
      "Nuevo Laredo, Tamaulipas", "Cd. Juárez, Chihuahua", "Mérida, Yucatán",
      "Puebla, Puebla", "León, Guanajuato", "Torreón, Coahuila"
    ];

    const calles = [
      "Av. Principal", "Calle Industrial", "Blvd. Comercial", "Av. Central",
      "Calle Norte", "Av. Sur", "Blvd. Oriente", "Calle Poniente"
    ];

    const empresaRandom = empresas[Math.floor(Math.random() * empresas.length)];
    const rfcRandom = rfcs[Math.floor(Math.random() * rfcs.length)];
    const ciudadRandom = ciudades[Math.floor(Math.random() * ciudades.length)];
    const calleRandom = calles[Math.floor(Math.random() * calles.length)];
    const numeroRandom = Math.floor(Math.random() * 9999) + 1;
    const telefonoRandom = `+52 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
    const emailRandom = empresaRandom.toLowerCase().replace(/\s/g, '').replace(/ñ/g, 'n') + Math.floor(Math.random() * 99) + '@empresa.com';

    setFormData({
      nombre_comercial: empresaRandom,
      rfc: rfcRandom,
      direccion: `${calleRandom} ${numeroRandom}, ${ciudadRandom}`,
      correo_contacto: emailRandom,
      telefono: telefonoRandom,
      forma_facturacion: formasFacturacion.length > 0 ? formasFacturacion[0].id : "",
      divisa_pago: "MXN",
      empresa_facturadora: empresaRandom,
    });

    // También generar contactos aleatorios
    const nombresContactos = ["Juan Pérez", "María García", "Carlos López", "Ana Martínez", "Roberto Silva"];
    const puestos = ["Gerente", "Coordinador", "Supervisor", "Asistente", "Director"];
    
    const contactosAleatorios = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
      id: uuidv4(),
      nombre: nombresContactos[Math.floor(Math.random() * nombresContactos.length)],
      puesto: puestos[Math.floor(Math.random() * puestos.length)],
      telefono: `+52 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
      email: `contacto${i + 1}@${empresaRandom.toLowerCase().replace(/\s/g, '').replace(/ñ/g, 'n')}.com`,
      notas: `Contacto de ${puestos[Math.floor(Math.random() * puestos.length)]}`,
      cliente_id: "",
      es_principal: i === 0, // El primer contacto es principal
      activo: true,
      fecha_creacion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setContactos(contactosAleatorios);
    
    toast({
      title: "Datos generados",
      description: `Se generaron datos aleatorios para ${empresaRandom}`,
    });
  };



  // Estados temporales para edición de formas de facturación desde el modal
  const [editingFormas, setEditingFormas] = useState<FormaFacturacion[]>([]);
  useEffect(() => {
    // al abrir el diálogo de configuración, inicializar la copia editable
    if (showFacturacionConfig) setEditingFormas(formasFacturacion);
  }, [showFacturacionConfig]);

  // Cargar formas de facturación desde la BD al montar
  useEffect(() => {
    const cargarFormas = async () => {
      const formas = await obtenerFormasFacturacion();
      if (formas && formas.length > 0) {
        setFormasFacturacion(formas.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion || "" })));
      }
    };
    cargarFormas();
  }, []);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [eliminadosAnio, setEliminadosAnio] = useState<number>(0);
  // Para evitar que la consulta al servidor reescriba inmediatamente el conteo
  // cuando ya lo incrementamos localmente, registramos la hora del último
  // incremento local y usamos Math.max(serverCount, localCount) al actualizar.
  const lastLocalIncrementRef = useRef<number | null>(null);

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
        toast({ title: "Error al cargar clientes", variant: "destructive" });
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error("Error:", error);
  toast({ title: "Error al cargar clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // Contador preciso de clientes eliminados en el año actual (consulta directa a la DB)
  useEffect(() => {
    const fetchEliminados = async () => {
      try {
        const hoy = new Date();
        const y = hoy.getFullYear();
        const desde = `${y}-01-01`;
        const hasta = `${y + 1}-01-01`;

        // Estados que consideramos como 'eliminado' o equivalentes
        const deletionStates = ['eliminado', 'baja', 'borrado', 'deleted'];

        const { count, error } = await supabase
          .from('clientes')
          .select('id', { count: 'exact', head: true })
          .in('estado', deletionStates)
          .gte('updated_at', desde)
          .lt('updated_at', hasta);

        if (!error && typeof count === 'number') {
          // Si hemos incrementado localmente recientemente, evitar que el conteo
          // del servidor lo sobrescriba con un valor menor. Permitimos que el
          // servidor actualice después de un breve periodo.
          const now = Date.now();
          const lastLocal = lastLocalIncrementRef.current;
          const allowOverwrite = !lastLocal || now - lastLocal > 3000; // 3s
          if (allowOverwrite) {
            setEliminadosAnio((prev) => Math.max(typeof prev === 'number' ? prev : 0, count || 0));
          } else {
            // Mantener el mayor de ambos valores
            setEliminadosAnio((prev) => Math.max(typeof prev === 'number' ? prev : 0, count || 0));
          }
        } else {
          // Fallback: quizá la consulta no devuelve filas por políticas o updated_at no se setea.
          console.warn('No se obtuvo conteo exacto desde Supabase, haciendo fallback local. Error:', error);
          const fallback = clientes.filter((c) => {
            try {
              // @ts-ignore
              if (!deletionStates.includes(c.estado)) return false;
              const u = new Date((c as any).updated_at || c.fecha_registro);
              return u.getFullYear() === y;
            } catch {
              return false;
            }
          }).length;
          setEliminadosAnio((prev) => Math.max(typeof prev === 'number' ? prev : 0, fallback));
        }
      } catch (e) {
        console.error('Excepción consultando eliminados del año:', e);
      }
    };

    fetchEliminados();
  }, [clientes]);

  

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
  setRepresentantes([]);
  setNuevoContacto({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
  setNuevoRepresentante({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
    setEditingClient(null);
    setActiveTab("general");
  };

  // Función para generar datos aleatorios de contactos
  // Funciones para manejar contactos
  const agregarContacto = () => {
    // Validar que haya algún dato mínimo (nombre o teléfono o email)
    const tieneDatos =
      nuevoContacto.nombre.trim() ||
      nuevoContacto.telefono.trim() ||
      nuevoContacto.email.trim();
    if (!tieneDatos) return;
    // Límite de contactos removido - se permite ilimitado

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
    const nuevosContactos = [...contactos, nuevo];
    setContactos(nuevosContactos);
    setNuevoContacto({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
    
    // Ir a la última página para mostrar el nuevo contacto
    const totalPaginas = Math.ceil(nuevosContactos.length / contactosPorPagina);
    setPaginaContactos(totalPaginas);
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
    
    // Ajustar la página si quedamos en una página vacía
    const totalPaginas = Math.ceil(restantes.length / contactosPorPagina);
    if (paginaContactos > totalPaginas && totalPaginas > 0) {
      setPaginaContactos(totalPaginas);
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

  // 🎯 Funciones para manejar representantes
  const agregarRepresentante = () => {
    // Validar que haya algún dato mínimo
    const tieneDatos =
      nuevoRepresentante.nombre.trim() ||
      nuevoRepresentante.telefono.trim() ||
      nuevoRepresentante.email.trim();
    if (!tieneDatos) return;

    const nuevo: ContactoCliente = {
      id: `temp-rep-${Date.now()}`,
      cliente_id: "",
      nombre: nuevoRepresentante.nombre.trim(),
      telefono: nuevoRepresentante.telefono.trim(),
      email: nuevoRepresentante.email.trim(),
      puesto: nuevoRepresentante.puesto.trim(),
      notas: nuevoRepresentante.notas.trim(),
      es_principal: false, // Los representantes nunca son principales
      activo: true,
      fecha_creacion: "",
      updated_at: "",
      tipo_contacto: 'representante' // ⭐ NUEVO CAMPO
    };
    
    setRepresentantes([...representantes, nuevo]);
    setNuevoRepresentante({ nombre: "", puesto: "", telefono: "", email: "", notas: "" });
  };

  const eliminarRepresentante = (id: string) => {
    const restantes = representantes.filter((rep) => rep.id !== id);
    setRepresentantes(restantes);
  };

  // Funciones para manejar formas de facturación
  const agregarFormaFacturacion = () => {
    if (nuevaFormaFacturacion.nombre.trim()) {
      const nuevaForma: FormaFacturacion = {
        id: uuidv4(),
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
  toast({ title: "Por favor completa los campos obligatorios: Nombre Comercial y RFC", variant: "destructive" });
      return;
    }

    // Validar longitud de campos con mensajes más específicos
    if (formData.nombre_comercial.length > 100) {
  toast({ title: `El nombre comercial es demasiado largo (${formData.nombre_comercial.length} caracteres). Máximo permitido: 100 caracteres`, variant: "destructive" });
      return;
    }

    if (formData.rfc.length > 13) {
  toast({ title: `El RFC es demasiado largo (${formData.rfc.length} caracteres). Máximo permitido: 13 caracteres`, variant: "destructive" });
      return;
    }

    if (formData.direccion && formData.direccion.length > 200) {
  toast({ title: `La dirección es demasiado larga (${formData.direccion.length} caracteres). Máximo permitido: 200 caracteres`, variant: "destructive" });
      return;
    }

    if (formData.correo_contacto && formData.correo_contacto.length > 100) {
  toast({ title: `El correo es demasiado largo (${formData.correo_contacto.length} caracteres). Máximo permitido: 100 caracteres`, variant: "destructive" });
      return;
    }

    // Validación de teléfono removida - formato libre permitido

    // Validar que al menos un contacto tenga información
    const contactosValidos = contactos.filter(
      (c) =>
        c.nombre.trim() ||
  (c.telefono?.trim?.() || "") ||
  (c.email?.trim?.() || "") ||
        (c.puesto && c.puesto.trim())
    );
    if (contactosValidos.length === 0) {
      toast({ title: "Por favor agrega al menos un contacto con información", variant: "destructive" });
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
          try {
            console.error("❌ Error actualizando cliente:");
            
            // Logs seguros para evitar errores de serialización
            if (error.message) {
              console.error("   - Message:", error.message);
            }
            if (error.details) {
              console.error("   - Details:", error.details);
            }
            if (error.hint) {
              console.error("   - Hint:", error.hint);
            }
            if (error.code) {
              console.error("   - Code:", error.code);
            }
            
            console.error("   - Datos que se intentaron actualizar:", clienteData);
            console.error("   - ID del cliente:", editingClient?.id);
            
            // Mostrar el error completo de forma segura
            try {
              console.error("   - Error completo:", error);
            } catch (logError) {
              console.error("   - No se pudo mostrar error completo:", logError);
            }
            
            const errorMessage = error.message || error.details || error.hint || 'Error desconocido al actualizar cliente';
            
            toast({ 
              title: "Error al actualizar cliente", 
              description: errorMessage,
              variant: "destructive" 
            });
            
          } catch (handlingError) {
            console.error("❌ Error manejando el error de actualización de cliente:", String(handlingError));
            toast({
              title: "Error al actualizar cliente",
              description: "Error interno del sistema. Revisa la consola.",
              variant: "destructive",
            });
          }
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

        // Guardar contactos Y representantes usando la función robusta
        try {
          console.log("💾 Guardando contactos con función robusta...");
          const contactosConTipo = contactos.map(c => ({ 
            ...c, 
            tipo_contacto: c.es_principal ? 'principal' : 'contacto' 
          }));
          
          const representantesConTipo = representantes.map(r => ({ 
            ...r, 
            tipo_contacto: 'representante' as const
          }));
          
          // Combinar contactos y representantes en un solo array
          const todosLosContactos = [...contactosConTipo, ...representantesConTipo];
          
          const contactosGuardados = await guardarContactosClienteRobusto(
            editingClient.id,
            todosLosContactos
          );
          if (!contactosGuardados) {
            console.warn("No se pudieron guardar los contactos/representantes con la función robusta");
            toast({ title: "Cliente actualizado, pero hubo un error guardando los contactos", variant: "destructive" });
            
            // Ejecutar diagnóstico para entender el problema
            console.log("🔧 Ejecutando diagnóstico debido al error en actualización...");
            await diagnosticarTablaContactos();
          } else {
            console.log("✅ Contactos y representantes guardados exitosamente con función robusta");
          }
        } catch (errorContactos) {
          console.error("Error guardando contactos/representantes durante actualización:", errorContactos);
          
          // Ejecutar diagnóstico para entender el problema
          console.log("🔧 Ejecutando diagnóstico debido a excepción en actualización...");
          await diagnosticarTablaContactos();
          toast({ title: "Cliente actualizado, pero hubo un error guardando los contactos", variant: "default" });
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
          try {
            console.error("❌ Error creando cliente:");
            
            // Logs seguros para evitar errores de serialización
            if (error.message) {
              console.error("   - Message:", error.message);
            }
            if (error.details) {
              console.error("   - Details:", error.details);
            }
            if (error.hint) {
              console.error("   - Hint:", error.hint);
            }
            if (error.code) {
              console.error("   - Code:", error.code);
            }
            
            console.error("   - Datos que se intentaron insertar:");
            console.error("     * nombre:", clienteData.nombre);
            console.error("     * rfc:", clienteData.rfc);
            console.error("     * direccion:", clienteData.direccion);
            console.error("     * email:", clienteData.email);
            console.error("     * telefono:", clienteData.telefono);
            
            // Mostrar el error completo de forma segura
            try {
              console.error("   - Error completo:", error);
            } catch (logError) {
              console.error("   - No se pudo mostrar error completo:", logError);
            }
            
            // Intentar serializar el error de forma segura
            try {
              const errorInfo = {
                message: error.message || 'Sin mensaje',
                details: error.details || 'Sin detalles',
                hint: error.hint || 'Sin sugerencias',
                code: error.code || 'Sin código',
                timestamp: new Date().toISOString()
              };
              console.error("   - Error resumido:", JSON.stringify(errorInfo, null, 2));
            } catch (serializationError) {
              console.error("   - Error en serialización:", String(serializationError));
            }
            
            const errorMessage = error.message || error.details || error.hint || 'Error desconocido al crear cliente';
            
            toast({ 
              title: "Error al crear cliente", 
              description: errorMessage,
              variant: "destructive" 
            });
            
          } catch (handlingError) {
            console.error("❌ Error manejando el error de creación de cliente:", String(handlingError));
            toast({
              title: "Error al crear cliente",
              description: "Error interno del sistema. Revisa la consola.",
              variant: "destructive",
            });
          }
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

        // Guardar contactos Y representantes usando la función robusta
        try {
          console.log("💾 Guardando contactos y representantes con función robusta...");
          const contactosConTipo = contactos.map(c => ({ 
            ...c, 
            tipo_contacto: c.es_principal ? 'principal' : 'contacto' 
          }));
          
          const representantesConTipo = representantes.map(r => ({ 
            ...r, 
            tipo_contacto: 'representante' as const
          }));
          
          // Combinar contactos y representantes en un solo array
          const todosLosContactos = [...contactosConTipo, ...representantesConTipo];
          const totalItems = contactos.length + representantes.length;
          
          const contactosGuardados = await guardarContactosClienteRobusto(
            nuevoCliente.id,
            todosLosContactos
          );
          if (!contactosGuardados) {
            console.warn("No se pudieron guardar los contactos/representantes con la función robusta");
            toast({ title: "Cliente creado, pero hubo un error guardando los contactos", variant: "destructive" });
            
            // Ejecutar diagnóstico para entender el problema
            console.log("🔧 Ejecutando diagnóstico debido al error en creación...");
            await diagnosticarTablaContactos();
          } else {
            console.log("✅ Contactos y representantes guardados exitosamente con función robusta");
            toast({ 
              title: `✅ Cliente, ${contactos.length} contactos y ${representantes.length} representantes guardados exitosamente`, 
              variant: "default" 
            });
          }
        } catch (errorContactos) {
          console.error("Error guardando contactos/representantes:", errorContactos);
          toast({ title: "Cliente creado, pero hubo un error guardando los contactos", variant: "destructive" });
          
          // Ejecutar diagnóstico para entender el problema
          console.log("🔧 Ejecutando diagnóstico debido a excepción en creación...");
          await diagnosticarTablaContactos();
        }
      }

  toast({ title: editingClient ? "Cliente actualizado exitosamente" : "Cliente creado exitosamente" });
      limpiarFormulario();
      setShowForm(false);
      await cargarClientes();
    } catch (error) {
      console.error("Error guardando cliente:", error);
      console.error("Tipo de error:", typeof error);
      
      // Serialización segura del error
      try {
        console.error("Detalles del error:", JSON.stringify(error, null, 2));
      } catch (jsonError) {
        console.error("No se pudo serializar el error a JSON");
      }
      
      console.error("Stack trace:", (error as any)?.stack);
      console.error("Message:", (error as any)?.message);
      
      const errorMessage = (error as any)?.message || 
                          (error as any)?.details || 
                          String(error) || 
                          "Error desconocido";
      
      toast({ 
        title: "Error al guardar cliente", 
        description: errorMessage,
        variant: "destructive" 
      });
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
      const contactosCliente = await obtenerContactosClienteTabla(cliente.id);
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
    // New flow: this function will be called only after user confirmed in the dialog
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
        setClientNotificationMessage("Error al verificar estado del cliente");
        setClientNotificationVariant("destructive");
        setClientNotificationOpen(true);
        return;
      }

      if (!clienteEstado || clienteEstado.estado !== "inactivo") {
        setClientNotificationMessage("Para eliminar el cliente primero debes cambiarlo a estado INACTIVO. Luego intenta nuevamente.");
        setClientNotificationVariant("destructive");
        setClientNotificationOpen(true);
        return;
      }

      // 1) Bloqueo: si existen embarques ACTIVOS del cliente, no permitir eliminar
      const { data: embarquesActivos, error: errorActivos } = await supabase
        .from("embarques")
        .select("id, folio, estado")
        .eq("cliente_id", id)
        .not("estado", "in", "(archivado,cancelado)")
        .limit(10);

      if (errorActivos) {
        console.error("Error verificando embarques activos:", errorActivos);
        setClientNotificationMessage("Error al verificar embarques activos del cliente");
        setClientNotificationVariant("destructive");
        setClientNotificationOpen(true);
        return;
      }

      if (embarquesActivos && embarquesActivos.length > 0) {
        const listaFolios = embarquesActivos
          .map((e) => `${e.folio || e.id} (${e.estado})`)
          .join("\n • ");
        setClientNotificationMessage(
          `❌ No se puede eliminar el cliente\n\nTiene ${embarquesActivos.length} embarque(s) aún activos (no archivados ni cancelados).\nDebes ARCHIVAR o CANCELAR todos los embarques de este cliente antes de eliminarlo.\n\n${listaFolios ? `Referencias:\n • ${listaFolios}` : ""}`
        );
        setClientNotificationVariant("destructive");
        setClientNotificationOpen(true);
        return;
      }

      const { data: embarquesAsociados, error: errorConsulta } = await supabase
        .from("embarques")
        .select("id")
        .eq("cliente_id", id)
        .limit(1);

      if (errorConsulta) {
        console.error("Error verificando embarques asociados:", errorConsulta);
        setClientNotificationMessage("Error al verificar embarques asociados");
        setClientNotificationVariant("destructive");
        setClientNotificationOpen(true);
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
          setClientNotificationMessage("Error al eliminar cliente");
          setClientNotificationVariant("destructive");
          setClientNotificationOpen(true);
          return;
        }

  setClientNotificationMessage("Cliente marcado como eliminado. No se puede eliminar completamente porque tiene embarques asociados.");
  setClientNotificationVariant("destructive");
  setClientNotificationOpen(true);
  // Mostrar toast destructivo en la parte inferior (consistente con camiones/remolques)
  toast({ title: "Cliente marcado como eliminado", variant: "destructive" });
  // Incrementar contador de eliminados en el header inmediatamente para feedback UX
  setEliminadosAnio((v) => (typeof v === 'number' ? v + 1 : 1));
  lastLocalIncrementRef.current = Date.now();

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
          setClientNotificationMessage("Error al eliminar cliente");
          setClientNotificationVariant("destructive");
          setClientNotificationOpen(true);
          return;
        }

  // Mostrar notificación y toast destructivo para eliminar cliente (estilo rojo/white como en otras secciones)
  setClientNotificationMessage("Cliente eliminado exitosamente");
  setClientNotificationVariant("destructive");
  toast({ title: "Cliente eliminado exitosamente", variant: "destructive" });
  // Incrementar contador de eliminados en el header inmediatamente para feedback UX
  setEliminadosAnio((v) => (typeof v === 'number' ? v + 1 : 1));
  lastLocalIncrementRef.current = Date.now();

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
      setClientNotificationMessage("Error al procesar la eliminación del cliente");
      setClientNotificationVariant("destructive");
      setClientNotificationOpen(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  // States for delete confirm dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const confirmDeleteCliente = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDoDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteConfirmOpen(false);
    await eliminarCliente(deleteConfirmId);
    setDeleteConfirmId(null);
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
  setClientNotificationMessage("Error al cambiar estado del cliente");
  setClientNotificationVariant("destructive");
  setClientNotificationOpen(true);
  return false;
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
      return true;
    } catch (error) {
      console.error("Error:", error);
      setClientNotificationMessage("Error al cambiar estado del cliente");
      setClientNotificationVariant("destructive");
      setClientNotificationOpen(true);
      return false;
    }
  };

  // Estados para confirmación y notificaciones reutilizables
  const [clientConfirmId, setClientConfirmId] = useState<string | null>(null);
  const [clientConfirmOpen, setClientConfirmOpen] = useState(false);
  const [clientPendingEstado, setClientPendingEstado] = useState<string | null>(null);
  const [clientNotificationOpen, setClientNotificationOpen] = useState(false);
  const [clientNotificationMessage, setClientNotificationMessage] = useState("");
  const [clientNotificationVariant, setClientNotificationVariant] = useState<"default" | "success" | "destructive">("default");

  const handleConfirmChangeEstado = async () => {
    if (!clientConfirmId || !clientPendingEstado) {
      setClientConfirmOpen(false);
      return;
    }
    setClientConfirmOpen(false);
    const ok = await cambiarEstadoCliente(clientConfirmId, clientPendingEstado);
    if (ok) {
      setClientNotificationMessage(
        `Cliente ${clientPendingEstado === "activo" ? "activado" : "desactivado"} exitosamente`
      );
      setClientNotificationVariant("success");
    }
    setClientNotificationOpen(true);
    setClientConfirmId(null);
    setClientPendingEstado(null);
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
  let contactosPrincipales: Record<string, { nombre: string; telefono: string | null; puesto?: string; email?: string; notas?: string }> = {};
    try {
      const ids = clientes.map(c => c.id);
      const { data: contactosData, error: contactosError } = await supabase
        .from("contactos_clientes")
        .select("cliente_id, nombre, telefono, puesto, email, notas, es_principal")
        .in("cliente_id", ids)
        .eq("activo", true);
      if (!contactosError && contactosData) {
        // Group contacts per client
        const grouped: Record<string, any[]> = contactosData.reduce((acc: any, c: any) => {
          acc[c.cliente_id] = acc[c.cliente_id] || [];
          acc[c.cliente_id].push(c);
          return acc;
        }, {});

        // For each client choose the es_principal contact if exists, otherwise first available
        contactosPrincipales = Object.keys(grouped).reduce((acc: any, clienteId: string) => {
          const list = grouped[clienteId] || [];
          const principal = list.find((x: any) => x.es_principal) || list[0];
          if (principal) {
            acc[clienteId] = {
              nombre: principal.nombre || '',
              telefono: principal.telefono || '',
              puesto: principal.puesto || '',
              email: principal.email || '',
              notas: principal.notas || ''
            };
          }
          return acc;
        }, {} as any);
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
      'Puesto Contacto',
      'Correo Contacto',
      'Teléfono Contacto',
      'Notas Contacto',
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
      const contacto = contactosPrincipales[cliente.id] || { nombre: '', telefono: '', puesto: '', email: '', notas: '' };
      return [
        escapeCSV(cliente.nombre),
        escapeCSV(cliente.rfc || ''),
        escapeCSV(cliente.telefono || ''),
        escapeCSV(cliente.email || ''),
        escapeCSV(cliente.direccion || ''),
        escapeCSV(cliente.estado),
        escapeCSV(contacto.nombre),
        escapeCSV(contacto.puesto || ''),
        escapeCSV(contacto.email || ''),
        escapeCSV(contacto.telefono || ''),
        escapeCSV(contacto.notas || ''),
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

  // Descargar todos los datos de un cliente específico (detalles + contactos + representantes)
  const descargarDetalleClienteExcel = async (clienteId: string | undefined) => {
    if (!clienteId) return;
    try {
      // Obtener cliente (desde memoria)
      const cliente = clientes.find((c) => c.id === clienteId) || selectedClient;

      // Contactos y representantes desde la API
      const contactos = await obtenerContactosClienteTabla(clienteId);
      const representantes = await obtenerRepresentantesCliente(clienteId);

      const escape = (v: any) => `"\t${(v ?? "").toString().replace(/"/g, '""')}"`;

      const lines: string[] = [];
      lines.push(`"DETALLE COMPLETO CLIENTE"`);
      lines.push(`"ID","${cliente?.id || ''}"`);
      lines.push(`"Nombre Comercial",${escape(cliente?.nombre || '')}`);
      lines.push(`"RFC",${escape(cliente?.rfc || '')}`);
      lines.push(`"Teléfono",${escape(cliente?.telefono || '')}`);
      lines.push(`"Email",${escape(cliente?.email || '')}`);
      lines.push(`"Dirección",${escape(cliente?.direccion || '')}`);
      lines.push(`"Estado",${escape(cliente?.estado || '')}`);
      lines.push(`"Divisa Pago",${escape(cliente?.divisa_pago || '')}`);
      lines.push(`"Empresa Facturadora",${escape(cliente?.empresa_facturadora || '')}`);
      lines.push(`"Forma Facturación",${escape(cliente?.forma_facturacion || '')}`);
      lines.push('');

      // Contactos
      lines.push('"CONTACTOS"');
      lines.push('"Nombre","Puesto","Teléfono","Email","Notas","Principal"');
      contactos.forEach((c) => {
        lines.push([
          escape(c.nombre || ''),
          escape(c.puesto || ''),
          escape(c.telefono || ''),
          escape(c.email || ''),
          escape((c as any).notas || ''),
          escape(c.es_principal ? 'Sí' : 'No'),
        ].join(','));
      });
      lines.push('');

      // Representantes
      lines.push('"REPRESENTANTES"');
      lines.push('"Nombre","Apellidos","Teléfono","Email","Puesto"');
      representantes.forEach((r) => {
        lines.push([
          escape(r.nombre || ''),
          escape((r as any).apellidos || ''),
          escape(r.telefono || ''),
          escape(r.email || ''),
          escape(r.puesto || ''),
        ].join(','));
      });

      const csv = lines.join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cliente_${(cliente?.nombre || 'detalle').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      try { agregarAuditLog('EXPORTAR', 'ClienteDetalle', `Exportó detalle de cliente ${cliente?.id}`); } catch {}
    } catch (error) {
      console.error('Error exportando detalle cliente', error);
      toast({ title: 'Error al exportar detalle del cliente', variant: 'destructive' });
    }
  };

  const verDetallesCliente = async (cliente: Cliente) => {
    console.log("🔍 Abriendo detalles del cliente:", { id: cliente.id, nombre: cliente.nombre });
    
    setSelectedClient(cliente);
    setShowDetailModal(true);
    setActiveTab("general"); // Reset tab to general when opening details
    setPaginaContactosDetalle(1); // Reset pagination when opening details

    // Cargar contactos para el modal de detalles
    try {
      console.log("📞 Cargando contactos para cliente:", cliente.id);
      const contactosData = await obtenerContactosClienteTabla(cliente.id);
      console.log(`✅ Contactos cargados: ${contactosData.length}`);
      setSelectedClientContacts(contactosData);
      
      if (contactosData.length === 0) {
        console.log("ℹ️ No se encontraron contactos para este cliente");
        toast({
          title: "Sin contactos",
          description: "Este cliente no tiene contactos registrados",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("💥 Error cargando contactos para detalles:", error);
      setSelectedClientContacts([]);
      
      // Ejecutar diagnóstico
      console.log("🔧 Ejecutando diagnóstico de conexión...");
      diagnosticarConexionSupabase();
      
      toast({
        title: "Error cargando contactos",
        description: "No se pudieron cargar los contactos del cliente. Revisa la consola para más detalles.",
        variant: "destructive"
      });
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
            <div className="flex gap-2">
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
                      ? "md:h-[80vh]"
                      : "md:h-[65vh]"
                  } md:rounded-lg md:mx-auto flex flex-col overflow-hidden`}
                >
                  {/* Mobile compact header: visible only on small screens */}
                  <div className="md:hidden px-4 py-3 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">
                        {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop header: keep original header for md+ */}
                  <DialogHeader className="hidden md:block">
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle>
                            {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                          </DialogTitle>
                          <DialogDescription>
                            Completa la información del cliente
                          </DialogDescription>
                        </div>

                      </div>
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
                      {/* Pestaña de Representantes ocultada - funcionalidad duplicada con Contactos 
                      <button
                        onClick={() => setActiveTab("representantes")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === "representantes"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Representantes
                      </button>
                      */}
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
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="text-lg font-semibold">Agregar Contacto</h3>
                            <p className="text-sm text-gray-600">Total de contactos: <span className="font-semibold text-blue-600">{contactos.length}</span></p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Button
                              type="button"
                              disabled={!nuevoContacto.nombre.trim()}
                              onClick={agregarContacto}
                              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                            >
                              Guardar Contacto
                            </Button>
                          </div>
                        </div>

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
                          <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">Nombre</th>
                                  <th className="px-2 py-1 text-left">Puesto</th>
                                  <th className="px-2 py-1 text-left">Teléfono</th>
                                  <th className="px-2 py-1 text-left">Correo</th>
                                  <th className="px-2 py-1 text-left">Notas</th>
                                  <th className="px-2 py-1 text-left">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calcularPaginacionContactos().contactosPaginados.map((c) => (
                                  <tr key={c.id} className="border-t">
                                    <td className="px-2 py-1">{c.nombre}</td>
                                    <td className="px-2 py-1">{c.puesto}</td>
                                    <td className="px-2 py-1">{c.telefono}</td>
                                    <td className="px-2 py-1">{c.email}</td>
                                    <td className="px-2 py-1">{truncateText(c.notas || "", 40)}</td>
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
                                    <td className="px-2 py-4 text-center text-gray-500" colSpan={6}>
                                      Sin contactos aún
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Controles de paginación */}
                          {contactos.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t bg-gray-50">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium">Mostrar:</Label>
                                  <Select 
                                    value={contactosPorPagina.toString()} 
                                    onValueChange={(value) => {
                                      setContactosPorPagina(Number(value));
                                      setPaginaContactos(1);
                                    }}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="10">10</SelectItem>
                                      <SelectItem value="15">15</SelectItem>
                                      <SelectItem value="20">20</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="text-sm text-gray-600">por página</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Mostrando {calcularPaginacionContactos().inicio} - {calcularPaginacionContactos().fin} de {calcularPaginacionContactos().total} contactos
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaginaContactos(Math.max(1, paginaContactos - 1))}
                                  disabled={paginaContactos === 1}
                                >
                                  Anterior
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: calcularPaginacionContactos().totalPaginas }, (_, i) => (
                                    <Button
                                      key={i + 1}
                                      variant={paginaContactos === i + 1 ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setPaginaContactos(i + 1)}
                                      className="w-8 h-8 p-0"
                                    >
                                      {i + 1}
                                    </Button>
                                  ))}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaginaContactos(Math.min(calcularPaginacionContactos().totalPaginas, paginaContactos + 1))}
                                  disabled={paginaContactos === calcularPaginacionContactos().totalPaginas}
                                >
                                  Siguiente
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🎯 Pestaña Representantes - OCULTADA por funcionalidad duplicada
                    {activeTab === "representantes" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold">Agregar Representante</h3>
                            <p className="text-sm text-gray-600">Total de representantes: <span className="font-semibold text-purple-600">{representantes.length}</span></p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={!nuevoRepresentante.nombre.trim()}
                              onClick={agregarRepresentante}
                              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60"
                            >
                              Guardar Representante
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre *</Label>
                            <Input
                              value={nuevoRepresentante.nombre}
                              onChange={(e) => setNuevoRepresentante({ ...nuevoRepresentante, nombre: e.target.value })}
                              placeholder="Nombre completo"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Puesto</Label>
                            <Input
                              value={nuevoRepresentante.puesto || ""}
                              onChange={(e) => setNuevoRepresentante({ ...nuevoRepresentante, puesto: e.target.value })}
                              placeholder="Director, Gerente, etc."
                              maxLength={50}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                              value={nuevoRepresentante.telefono || ""}
                              onChange={(e) => setNuevoRepresentante({ ...nuevoRepresentante, telefono: e.target.value })}
                              placeholder="55-1234-5678"
                              maxLength={15}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Correo</Label>
                            <Input
                              type="email"
                              value={nuevoRepresentante.email || ""}
                              onChange={(e) => setNuevoRepresentante({ ...nuevoRepresentante, email: e.target.value })}
                              placeholder="representante@empresa.com"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-4">
                            <Label>Notas</Label>
                            <Textarea
                              value={nuevoRepresentante.notas || ""}
                              onChange={(e) => setNuevoRepresentante({ ...nuevoRepresentante, notas: e.target.value })}
                              placeholder="Autoridad, responsabilidades, etc."
                              rows={2}
                              maxLength={250}
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-md font-semibold mb-2">Representantes Registrados</h4>
                          {representantes.length > 0 ? (
                            <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">Nombre</th>
                                    <th className="px-2 py-1 text-left">Puesto</th>
                                    <th className="px-2 py-1 text-left">Teléfono</th>
                                    <th className="px-2 py-1 text-left">Correo</th>
                                    <th className="px-2 py-1 text-left">Notas</th>
                                    <th className="px-2 py-1 text-left">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {representantes.map((rep) => (
                                    <tr key={rep.id} className="border-t">
                                      <td className="px-2 py-1 font-medium text-purple-700">{rep.nombre}</td>
                                      <td className="px-2 py-1">{rep.puesto}</td>
                                      <td className="px-2 py-1">{rep.telefono}</td>
                                      <td className="px-2 py-1">{rep.email}</td>
                                      <td className="px-2 py-1">{rep.notas ? rep.notas.substring(0, 40) + (rep.notas.length > 40 ? "..." : "") : "-"}</td>
                                      <td className="px-2 py-1">
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => eliminarRepresentante(rep.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500 border rounded">
                              <p>No hay representantes registrados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    */}

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
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
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
                                <div>
                                  <Button size="sm" variant="outline" onClick={() => setShowFacturacionConfig(true)}>
                                    Gestionar
                                  </Button>
                                </div>
                              </div>
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

                    {/* Dialog para gestionar formas de facturación (desde el modal Nuevo Cliente) */}
                    <Dialog open={showFacturacionConfig} onOpenChange={setShowFacturacionConfig}>
                      <DialogContent className="max-w-xl w-full">
                        <DialogHeader>
                          <DialogTitle>Gestionar Formas de Facturación</DialogTitle>
                          <DialogDescription>Agrega, edita o elimina las formas que luego aparecerán en el menú desplegable.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Formas actuales</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                              {editingFormas.map((f) => (
                                <div key={f.id} className="flex items-center gap-2">
                                  <Input value={f.nombre} onChange={(e) => setEditingFormas(editingFormas.map(x => x.id === f.id ? { ...x, nombre: e.target.value } : x))} className="flex-1" />
                                  <Input value={f.descripcion} onChange={(e) => setEditingFormas(editingFormas.map(x => x.id === f.id ? { ...x, descripcion: e.target.value } : x))} className="flex-1" />
                                  <Button size="sm" variant="ghost" onClick={() => setEditingFormas(editingFormas.filter(x => x.id !== f.id))}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {editingFormas.length === 0 && (
                                <div className="text-sm text-gray-500">No hay formas registradas.</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Agregar nueva forma</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <Input placeholder="Nombre" value={nuevaFormaFacturacion.nombre} onChange={(e) => setNuevaFormaFacturacion({ ...nuevaFormaFacturacion, nombre: e.target.value })} />
                              <Input placeholder="Descripción" value={nuevaFormaFacturacion.descripcion} onChange={(e) => setNuevaFormaFacturacion({ ...nuevaFormaFacturacion, descripcion: e.target.value })} />
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                                if (!nuevaFormaFacturacion.nombre.trim()) return;
                                const nueva: FormaFacturacion = { id: Date.now().toString(), nombre: nuevaFormaFacturacion.nombre.trim(), descripcion: nuevaFormaFacturacion.descripcion.trim() };
                                setEditingFormas([...editingFormas, nueva]);
                                setFormasFacturacion([...formasFacturacion, nueva]);
                                setNuevaFormaFacturacion({ nombre: '', descripcion: '' });
                              }}>
                                Agregar
                              </Button>
                            </div>
                          </div>

                            <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => { setShowFacturacionConfig(false); setEditingFormas([]); }}>
                              Cerrar
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                              // Intentar persistir en Supabase
                              const ok = await guardarFormasFacturacion(editingFormas.map(f => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion })));
                              if (ok) {
                                setFormasFacturacion(editingFormas);
                                setShowFacturacionConfig(false);
                                try {
                                  agregarAuditLog(
                                    "ACTUALIZAR",
                                    "FormasFacturacion",
                                    `Formas de facturación actualizadas: ${editingFormas.map(f=>f.nombre).join(", ")}`
                                  );
                                } catch {}
                                toast({ title: 'Formas de facturación actualizadas', variant: 'default' });
                              } else {
                                toast({ title: 'No se pudo guardar en la base de datos. Los cambios se mantienen en memoria.', variant: 'destructive' });
                              }
                            }}>
                              Guardar cambios
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
          // Eliminados del año: usar el estado `eliminadosAnio` (DB-backed + UI increment).
          // Evitamos redeclarar `eliminadosAnio` para que las llamadas a
          // setEliminadosAnio(...) se reflejen inmediatamente en el header.
          const eliminadosEsteAnio = eliminadosAnio;

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
                    <div className="text-2xl font-bold text-red-600">{eliminadosEsteAnio}</div>
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
                      onClick={() => confirmDeleteCliente(cliente.id)}
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
                    {/* Pestaña de Representantes ocultada - funcionalidad duplicada con Contactos 
                    <button
                      onClick={() => setActiveTab("representantes")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "representantes"
                          ? "border-purple-500 text-purple-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Representantes
                    </button>
                    */}
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
                            {selectedClient.estado === "activo" ? (
                              <Badge className="bg-green-100 text-green-800">{selectedClient.estado}</Badge>
                            ) : selectedClient.estado === "inactivo" ? (
                              <Badge variant="secondary">{selectedClient.estado}</Badge>
                            ) : (
                              <Badge variant="outline">{selectedClient.estado}</Badge>
                            )}
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

                      {/* Agregar Última Actualización */}
                      {selectedClient.updated_at && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pestaña Contactos */}
                  {activeTab === "contactos" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Contactos del Cliente</h3>
                          <p className="text-sm text-gray-600">
                            Total de contactos: <span className="font-semibold text-blue-600">{selectedClientContacts.length}</span>
                          </p>
                        </div>
                        {selectedClientContacts.length > contactosPorPaginaDetalle && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Mostrar:</Label>
                            <Select 
                              value={contactosPorPaginaDetalle.toString()} 
                              onValueChange={(value) => {
                                setContactosPorPaginaDetalle(Number(value));
                                setPaginaContactosDetalle(1);
                              }}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {selectedClientContacts.length > 0 ? (
                        <div className="space-y-4">
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
                                {calcularPaginacionContactosDetalle().contactosPaginados.map((contacto) => (
                                  <tr key={contacto.id} className="border-t align-top hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-600" />
                                        <div>
                                          <span className="font-medium text-gray-900">
                                            {contacto.nombre || "Sin nombre"}
                                          </span>
                                          {contacto.es_principal && (
                                            <Badge className="bg-green-100 text-green-800 text-xs ml-2">Principal</Badge>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="text-gray-700">{contacto.puesto || "-"}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-gray-500" />
                                        <span className="text-gray-700">{contacto.telefono || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-gray-500" />
                                        <span className="text-gray-700 break-all">{contacto.email || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 max-w-xs">
                                      <div className="whitespace-pre-wrap break-words text-gray-600 text-xs">
                                        {contacto.notas ? truncateText(contacto.notas, 100) : "-"}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Controles de paginación para contactos */}
                          {selectedClientContacts.length > contactosPorPaginaDetalle && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t bg-gray-50 rounded-b-lg">
                              <div className="text-sm text-gray-600">
                                Mostrando {calcularPaginacionContactosDetalle().inicio} - {calcularPaginacionContactosDetalle().fin} de {calcularPaginacionContactosDetalle().total} contactos
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaginaContactosDetalle(Math.max(1, paginaContactosDetalle - 1))}
                                  disabled={paginaContactosDetalle === 1}
                                >
                                  Anterior
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Math.min(5, calcularPaginacionContactosDetalle().totalPaginas) }, (_, i) => {
                                    const totalPaginas = calcularPaginacionContactosDetalle().totalPaginas;
                                    let startPage = Math.max(1, paginaContactosDetalle - 2);
                                    let endPage = Math.min(totalPaginas, startPage + 4);
                                    startPage = Math.max(1, endPage - 4);
                                    
                                    const pageNum = startPage + i;
                                    if (pageNum <= endPage) {
                                      return (
                                        <Button
                                          key={pageNum}
                                          variant={paginaContactosDetalle === pageNum ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setPaginaContactosDetalle(pageNum)}
                                          className="w-8 h-8 p-0"
                                        >
                                          {pageNum}
                                        </Button>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPaginaContactosDetalle(Math.min(calcularPaginacionContactosDetalle().totalPaginas, paginaContactosDetalle + 1))}
                                  disabled={paginaContactosDetalle === calcularPaginacionContactosDetalle().totalPaginas}
                                >
                                  Siguiente
                                </Button>
                              </div>
                            </div>
                          )}
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

                  {/* 🎯 Pestaña Representantes en Modal Detalles - OCULTADA por funcionalidad duplicada 
                  {activeTab === "representantes" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Representantes del Cliente</h3>
                          <p className="text-sm text-gray-600">
                            Representantes legales y comerciales con autoridad
                          </p>
                        </div>
                      </div>

                      {selectedClientContacts.filter(c => c.tipo_contacto === 'representante').length > 0 ? (
                        <div className="space-y-4">
                          <div className="border rounded-lg overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-purple-50">
                                  <th className="px-3 py-2 text-left font-semibold text-purple-700">Representante</th>
                                  <th className="px-3 py-2 text-left font-semibold text-purple-700">Puesto</th>
                                  <th className="px-3 py-2 text-left font-semibold text-purple-700">Teléfono</th>
                                  <th className="px-3 py-2 text-left font-semibold text-purple-700">Email</th>
                                  <th className="px-3 py-2 text-left font-semibold text-purple-700">Notas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedClientContacts.filter(c => c.tipo_contacto === 'representante').map((representante) => (
                                  <tr key={representante.id} className="border-t align-top hover:bg-purple-50">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-purple-600" />
                                        <div>
                                          <span className="font-medium text-purple-900">
                                            {representante.nombre || "Sin nombre"}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="text-gray-700 font-medium">{representante.puesto || "-"}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-gray-500" />
                                        <span className="text-gray-700">{representante.telefono || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-gray-500" />
                                        <span className="text-gray-700 break-all">{representante.email || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 max-w-xs">
                                      <div className="whitespace-pre-wrap break-words text-gray-600 text-xs">
                                        {representante.notas ? (representante.notas.length > 100 ? representante.notas.substring(0, 100) + "..." : representante.notas) : "-"}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Building className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                          <p className="text-gray-500">No hay representantes registrados</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Los representantes se pueden agregar al editar el cliente
                          </p>
                        </div>
                      )}
                    </div>
                  */}

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


                </div>

                {/* Botones de Acción */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div className="flex space-x-2 items-center">
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
                    <Button size="sm" variant="outline" onClick={() => descargarDetalleClienteExcel(selectedClient?.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
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
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Delete confirmation dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>¿Confirmas que deseas eliminar este cliente? Esta acción puede marcarlo como 'eliminado' si tiene historial.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmId(null); }}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDoDelete}>
                Eliminar cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notification dialog (used for errors/success) */}
        <Dialog open={clientNotificationOpen} onOpenChange={setClientNotificationOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {clientNotificationVariant === "destructive"
                  ? clientNotificationMessage && clientNotificationMessage.includes("Para eliminar el cliente primero")
                    ? "Aviso"
                    : "Error"
                  : "Notificación"}
              </DialogTitle>
              <DialogDescription>
                {clientNotificationMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setClientNotificationOpen(false)}
                className={
                  clientNotificationVariant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-[#16A34A] hover:bg-[#12813a] text-white"
                }
              >
                Aceptar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
