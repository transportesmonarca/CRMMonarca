"use client";

import type React from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  X,
  ImageIcon,
  FileSpreadsheet,
  User,
  BadgeIcon as IdCard,
  Shield,
  Contact,
  MessageSquare,
  Save,
} from "lucide-react";
import { exportOperadoresToExcel, exportOperadorDetalleToExcel } from "./excel-export";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Operador } from "@/lib/supabase";
import { subirDocumentoOperador, eliminarDocumentoOperador } from "@/lib/blob";
import { agregarAuditLog } from "@/lib/audit";

interface DocumentoOperador {
  id: string;
  operador_id: string;
  tipo_documento: string;
  numero_documento?: string;
  nombre_archivo: string;
  url_blob: string;
  pathname: string;
  tamano_bytes?: number;
  tipo_mime?: string;
  fecha_vencimiento?: string;
  activo: boolean;
  notas?: string;
  fecha_subida: string;
  subido_por?: string;
}

export default function OperadoresPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Nuevo modal compacto "Ver Detalles" por tarjeta
  const [showQuickDetailsModal, setShowQuickDetailsModal] = useState(false);
  const [operadorQuickDetalle, setOperadorQuickDetalle] = useState<any>(null);
  const [quickTab, setQuickTab] = useState<string>('general');
  const [operadorDetalle, setOperadorDetalle] = useState<Operador | null>(null);
  // Tabs del modal de detalles: restauramos 'general' y agregamos 'ids' separado
  const [activeTab, setActiveTab] = useState("general");
  const [documentos, setDocumentos] = useState<DocumentoOperador[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);

  // Observaciones (comentarios) - se almacena como JSON en campo observaciones
  interface ComentarioOperador {
    id: string;
    texto: string;
    fecha: string; // ISO string
  }
  const [comentarios, setComentarios] = useState<ComentarioOperador[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [editandoComentarioId, setEditandoComentarioId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");

  // Estados para fotografía y documentos básicos
  const [fotoOperador, setFotoOperador] = useState<File | null>(null);
  const [fotoOperadorUrl, setFotoOperadorUrl] = useState<string>("");
  const [documentosBasicos, setDocumentosBasicos] = useState<File[]>([]);
  const [documentosBasicosUrls, setDocumentosBasicosUrls] = useState<string[]>(
    []
  );
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingDocumentos, setUploadingDocumentos] = useState(false);

  // Estados para los datos
  const [operadores, setOperadores] = useState<Operador[]>([]);
  // Toggle para columnas (2 o 3)
  const [cols, setCols] = useState<2 | 3>(3);
  // Foto principal y documentos adicionales (antiguo comportamiento)
  // fotoOperador: archivo único (imagen)
  // documentosBasicos: lista de archivos adicionales (imágenes o PDFs), límite 7

  // Estados para el formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    alias: "",
    telefono: "",
    email: "",
    licencia: "",
    numero_apto_medico: "",
    fecha_vencimiento_licencia: "",
    fecha_vencimiento_apto_medico: "",
    numero_visa: "",
    fecha_vencimiento_visa: "",
    numero_fast: "",
    fecha_vencimiento_fast: "",
    tipo_sangre: "",
    direccion: "",
    fecha_nacimiento: "",
    curp: "",
    rfc: "",
    nss: "",
    telefono_emergencia: "",
    contactos_emergencia: "",
    observaciones: "",
    estado: "activo",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Popup para errores de cuota de almacenamiento
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState<string>("");
  const router = useRouter();

  // Estados para subida de documentos
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notasDocumento, setNotasDocumento] = useState("");

  // Checkpoint / restauración
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [contactosEmergencia, setContactosEmergencia] = useState<Array<{nombre:string;relacion:string;direccion:string;telefono:string;correo:string}>>([]);
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" });
  const [editingContactoIndex, setEditingContactoIndex] = useState<number | null>(null);

  const tiposDocumento = [
    "licencia",
    "apto_medico",
    "visa",
    "fast",
    "curp",
    "rfc",
    "nss",
    "ine",
    "pasaporte",
    "comprobante_domicilio",
    "contrato",
    "otro",
  ];

  // =============== Helpers de datos aleatorios (temporal) ===============
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randDigits = (len: number) => Array.from({ length: len }, () => String(randInt(0, 9))).join("");
  const randDatePast = (yearsFromNowMin = 20, yearsFromNowMax = 50) => {
    const y = new Date().getFullYear() - randInt(yearsFromNowMin, yearsFromNowMax);
    const m = randInt(1, 12);
    const d = randInt(1, 28);
    return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  };
  const randDateFuture = (daysMin = 30, daysMax = 365) => {
    const base = new Date();
    const d = randInt(daysMin, daysMax);
    const dt = new Date(base.getTime() + d * 24 * 3600 * 1000);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())).toISOString().slice(0, 10);
  };
  const randNombre = () => pick(["Juan","María","Luis","Ana","Carlos","Sofía","Pedro","Lucía","Jorge","Laura"]);
  const randApellidos = () => `${pick(["Pérez","García","López","Martínez","Hernández","González","Rodríguez"]) } ${pick(["Sánchez","Ramírez","Cruz","Flores","Díaz","Torres","Vargas"])}`;
  const randAlias = () => pick(["El Rápido","Pantera","Cóndor","Titan","Fénix","Norteño","Centella","Águila"]);
  const randEmail = (nombre: string, apellidos: string) => {
    const base = (nombre + "." + apellidos.split(" ")[0]).toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
    return `${base}${randInt(1,99)}@correo.com`;
  };
  const randTelefonoMX = () => `+52 ${randInt(10,99)} ${randDigits(4)} ${randDigits(4)}`;
  const randDireccion = () => `${pick(["Calle","Av.","Blvd.","Prol."])} ${pick(["Monarca","Independencia","Juárez","Hidalgo","Reforma","Centro"])} #${randInt(10,999)}, Col. ${pick(["Centro","Norte","Sur","Oriente","Poniente"])}, ${pick(["CDMX","Monterrey","Guadalajara","Querétaro","Puebla"])}.`;
  const randTexto = () => pick([
    "Operador con experiencia en rutas largas.",
    "Requiere seguimiento de vencimientos.",
    "Disponible para viajes internacionales.",
    "Excelente récord de seguridad.",
  ]);
  const randTipoSangre = () => pick(["A+","A-","B+","B-","AB+","AB-","O+","O-"]);
  const randRel = () => pick(["padre","madre","esposa","esposo","hijo","hija","hermano","hermana","otro"]);

  const autocompletarAleatorio = () => {
    const nombre = randNombre();
    const apellidos = randApellidos();
    const telefono = randTelefonoMX();
    const email = randEmail(nombre, apellidos);
    setFormData({
      nombre,
      apellidos,
      alias: Math.random() < 0.5 ? randAlias() : "",
      telefono,
      email,
      licencia: `LIC-${randDigits(6)}`,
      numero_apto_medico: `APTO-${randDigits(5)}`,
      fecha_vencimiento_licencia: randDateFuture(60, 540),
      fecha_vencimiento_apto_medico: randDateFuture(60, 365),
      numero_visa: Math.random() < 0.6 ? `VISA-${randDigits(7)}` : "",
      fecha_vencimiento_visa: Math.random() < 0.6 ? randDateFuture(120, 720) : "",
      numero_fast: Math.random() < 0.5 ? `FAST-${randDigits(6)}` : "",
      fecha_vencimiento_fast: Math.random() < 0.5 ? randDateFuture(90, 720) : "",
      tipo_sangre: randTipoSangre(),
      direccion: randDireccion(),
      fecha_nacimiento: randDatePast(25, 45),
      curp: `CURP${randDigits(10)}`,
      rfc: `RFC${randDigits(9)}`,
      nss: `NSS${randDigits(8)}`,
      telefono_emergencia: randTelefonoMX(),
      contactos_emergencia: "",
      observaciones: randTexto(),
      estado: "activo",
    });
    const c1 = { nombre: `${randNombre()} ${pick(["Pérez","López","García"])}`, relacion: randRel(), direccion: randDireccion(), telefono: randTelefonoMX(), correo: randEmail("contacto", "fam") };
    const c2 = { nombre: `${randNombre()} ${pick(["Sánchez","Díaz","Flores"])}`, relacion: randRel(), direccion: randDireccion(), telefono: randTelefonoMX(), correo: randEmail("contacto", "amigo") };
    setContactosEmergencia([c1, c2]);
    setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" });
  };

  // Botón de auto-llenado removido por requerimiento (se elimina helper de datos de prueba)

  // Función para validar RFC
  const validarRFC = (rfc: string): boolean => {
    if (!rfc) return true; // Permitir vacío
    const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return (
      rfcRegex.test(rfc.toUpperCase()) &&
      (rfc.length === 12 || rfc.length === 13)
    );
  };

  // Función para validar CURP
  const validarCURP = (curp: string): boolean => {
    if (!curp) return true; // Permitir vacío
  // Regex oficial (estructura completa con validación de fecha y código de estado)
  const curpRegex = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
  return curpRegex.test(curp.toUpperCase());
  };

  // Función para validar NSS
  const validarNSS = (nss: string): boolean => {
    if (!nss) return true; // Permitir vacío
    const nssRegex = /^[0-9]{11}$/;
    return nssRegex.test(nss);
  };

  // Función para validar email
  const validarEmail = (email: string): boolean => {
    if (!email) return true; // Permitir vacío
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Función para validar teléfono
  const validarTelefono = (telefono: string): boolean => {
    if (!telefono) return true; // Permitir vacío
  // Normalizamos quitando todo excepto dígitos
  const digitos = telefono.replace(/[^0-9]/g, "");
  // Formatos aceptados:
  //  - 10 dígitos nacionales
  //  - 52 + 10 dígitos (12 total) (ej: +52 55 1234 5678)
  //  - 521 + 10 dígitos (13 total) (algunos móviles) 
  if (digitos.length === 10) return true;
  if (digitos.startsWith("52") && digitos.length === 12) return true;
  if (digitos.startsWith("521") && digitos.length === 13) return true;
  return false;
  };

  // Normalizar teléfono para guardar (solo dígitos, opcional +52 si aplica) y limitar a 15 chars
  const normalizarTelefonoParaGuardar = (telefono?: string | null): string | null => {
    if (!telefono) return null;
    let t = telefono.trim();
    // Mantener prefijo + si existe al inicio
    const tieneMas = t.startsWith('+');
    // Remover todo excepto dígitos
    const digitos = t.replace(/[^0-9]/g, '');
    // Reconstruir
    t = (tieneMas ? '+' : '') + digitos;
    // Si supera 15, cortar (evitar error SQL)
    if (t.length > 15) t = t.slice(0, 15);
    return t || null;
  };

  const actualizarContactoEmergencia = (
    index: number,
    campo: string,
    valor: string
  ) => {
    const nuevosContactos = [...contactosEmergencia];
    nuevosContactos[index] = { ...nuevosContactos[index], [campo]: valor };
    setContactosEmergencia(nuevosContactos);
  };

  // Función para limpiar y validar datos antes del envío
  const limpiarDatosFormulario = (data: typeof formData) => {
    const dataLimpia: any = { ...data };

    // Campos de texto que deben convertirse a null si están vacíos
    const camposTexto = [
      "alias",
      "telefono",
      "email",
      "licencia",
      "numero_apto_medico",
      "numero_visa",
      "numero_fast",
      "tipo_sangre",
      "direccion",
      "curp",
      "rfc",
      "nss",
      "telefono_emergencia",
      "observaciones",
    ];

    // Campos de fecha que deben convertirse a null si están vacíos
    const camposFecha = [
      "fecha_vencimiento_licencia",
      "fecha_vencimiento_apto_medico",
      "fecha_vencimiento_visa",
      "fecha_vencimiento_fast",
      "fecha_nacimiento",
    ];

    // Limpiar campos de texto
    camposTexto.forEach((campo) => {
      if (dataLimpia[campo] === "" || dataLimpia[campo]?.trim() === "") {
        dataLimpia[campo] = null;
      } else if (dataLimpia[campo]) {
        // Limpiar espacios extra y convertir a mayúsculas campos específicos
  if (campo === "email") {
          dataLimpia[campo] = dataLimpia[campo].trim().toLowerCase();
        } else {
          dataLimpia[campo] = dataLimpia[campo].trim();
        }
      }
    });

    // Limpiar campos de fecha
    camposFecha.forEach((campo) => {
      if (dataLimpia[campo] === "" || !dataLimpia[campo]) {
        dataLimpia[campo] = null;
      }
    });

    // Manejar contactos_emergencia (convertir array a JSON)
    const contactosValidos = contactosEmergencia.filter(
      (contacto) =>
        contacto.nombre.trim() ||
        contacto.telefono.trim() ||
        contacto.correo.trim()
    );
    if (contactosValidos.length > 0) {
      dataLimpia.contactos_emergencia = JSON.stringify(contactosValidos);
    } else {
      dataLimpia.contactos_emergencia = null;
    }

  // Normalizar teléfonos finales a formato seguro (<=15 chars)
  dataLimpia.telefono = normalizarTelefonoParaGuardar(dataLimpia.telefono);
  dataLimpia.telefono_emergencia = normalizarTelefonoParaGuardar(dataLimpia.telefono_emergencia);
  return dataLimpia;
  };

  // Función para validar todos los campos
  const validarFormulario = (data: typeof formData): string | null => {
    // Validar campos obligatorios
    if (!data.nombre.trim()) {
      return "El nombre es obligatorio";
    }
    if (!data.apellidos.trim()) {
      return "Los apellidos son obligatorios";
    }

  // Se elimina validación de formato/longitud para RFC, CURP y NSS (inputs libres)

    // Validar email si se proporciona
    if (data.email && !validarEmail(data.email)) {
      return "El email no tiene un formato válido.";
    }

    // Validar teléfonos si se proporcionan
    if (data.telefono && !validarTelefono(data.telefono)) {
      return "El teléfono no tiene un formato válido.";
    }
    if (
      data.telefono_emergencia &&
      !validarTelefono(data.telefono_emergencia)
    ) {
      return "El teléfono de emergencia no tiene un formato válido.";
    }

    // Validar fechas
    const fechasValidar = [
      { campo: "fecha_nacimiento", nombre: "Fecha de nacimiento" },
      {
        campo: "fecha_vencimiento_licencia",
        nombre: "Fecha de vencimiento de licencia",
      },
      {
        campo: "fecha_vencimiento_apto_medico",
        nombre: "Fecha de vencimiento de apto médico",
      },
      {
        campo: "fecha_vencimiento_visa",
        nombre: "Fecha de vencimiento de visa",
      },
      {
        campo: "fecha_vencimiento_fast",
        nombre: "Fecha de vencimiento de FAST",
      },
    ];

    for (const { campo, nombre } of fechasValidar) {
      if ((data as any)[campo] && (data as any)[campo] !== "") {
        const fecha = new Date((data as any)[campo]);
        if (isNaN(fecha.getTime())) {
          return `${nombre} no es una fecha válida.`;
        }
      }
    }

    return null;
  };

  // Función para manejar la selección de foto del operador
  const handleFotoOperadorSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten archivos de imagen para la fotografía");
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La fotografía es muy grande. Tamaño máximo: 5MB");
        return;
      }

      setFotoOperador(file);
      // Crear URL temporal para vista previa
      const tempUrl = URL.createObjectURL(file);
      setFotoOperadorUrl(tempUrl);
      setError("");
  setSuccess("Fotografía seleccionada. Se subirá al guardar el operador.");
    }
  };

  // Función para manejar la selección de documentos básicos
  const handleDocumentosBasicosSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    if (documentosBasicos.length + files.length > 7) {
      setError("Máximo 7 documentos adicionales permitidos");
      return;
    }

    // Validar cada archivo
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`El archivo ${file.name} es muy grande. Tamaño máximo: 10MB`);
        return;
      }

      const tiposPermitidos = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "application/pdf",
      ];
      if (!tiposPermitidos.includes(file.type)) {
        setError(`El archivo ${file.name} no es un tipo permitido`);
        return;
      }
    }

    setDocumentosBasicos((prev) => [...prev, ...files]);

    // Crear URLs temporales para vista previa
    const tempUrls = files.map((file) => URL.createObjectURL(file));
    setDocumentosBasicosUrls((prev) => [...prev, ...tempUrls]);
    setError("");
    if (files.length > 0) {
      setSuccess(`${files.length} documento(s) seleccionados. Se subirán al guardar el operador.`);
    }
  };

  // Función para eliminar documento básico
  const eliminarDocumentoBasico = (index: number) => {
    setDocumentosBasicos((prev) => prev.filter((_, i) => i !== index));
    setDocumentosBasicosUrls((prev) => {
      // Liberar URL temporal
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Función para subir fotografía y documentos (nueva matriz + compatibilidad)
  const safeStringify = (obj: any) => {
    try {
      return JSON.stringify(obj, Object.getOwnPropertyNames(obj || {}), 2);
    } catch {
      try { return JSON.stringify(obj); } catch { return String(obj); }
    }
  };

  const subirFotografiaYDocumentos = async (operadorId: string) => {
    try {
      const resultados: string[] = [];
      // Subir foto principal si existe
      if (fotoOperador) {
        setUploadingFoto(true);
        const { url: fotoUrl, pathname: fotoPathname } = await subirDocumentoOperador(
          operadorId,
          fotoOperador,
          'fotografia_operador'
        );
        const insertFotoResp = await supabase.from('documentos_operadores').insert({
          operador_id: operadorId,
          tipo_documento: 'fotografia_operador',
          nombre_archivo: fotoOperador.name || null,
          url_blob: fotoUrl,
          // Compatibilidad con esquemas legados que usan url_archivo NOT NULL
          url_archivo: fotoUrl,
          pathname: fotoPathname,
          // Compat con esquemas legados que usan pathname_archivo NOT NULL
          pathname_archivo: fotoPathname,
          tamano_bytes: fotoOperador.size || null,
          tipo_mime: fotoOperador.type || null,
          notas: 'Fotografía del operador',
          subido_por: 'Sistema',
          activo: true,
        }).select();
  if (insertFotoResp.error) {
          console.error('Error insertando foto en DB (error):', safeStringify(insertFotoResp.error));
          console.error('Error insertando foto en DB (resp):', safeStringify(insertFotoResp));
          throw new Error(`Error insertando foto: ${insertFotoResp.error.message || safeStringify(insertFotoResp.error)}`);
        }
        resultados.push('Fotografía subida');
      }

      // Subir documentos adicionales (hasta 7)
      if (documentosBasicos.length > 0) {
        setUploadingDocumentos(true);
        for (let i = 0; i < Math.min(7, documentosBasicos.length); i++) {
          const documento = documentosBasicos[i];
          const tipo = `documento_basico_${i + 1}`;
          const { url: docUrl, pathname: docPathname } = await subirDocumentoOperador(operadorId, documento, tipo);
          const insertDocResp = await supabase.from('documentos_operadores').insert({
            operador_id: operadorId,
            tipo_documento: tipo,
            nombre_archivo: documento.name || null,
            url_blob: docUrl,
            // Compatibilidad con esquemas legados que usan url_archivo NOT NULL
            url_archivo: docUrl,
            pathname: docPathname,
            // Compat legada: pathname_archivo
            pathname_archivo: docPathname,
            tamano_bytes: documento.size || null,
            tipo_mime: documento.type || null,
            notas: `Documento básico ${i + 1}`,
            subido_por: 'Sistema',
            activo: true,
          }).select();
          if (insertDocResp.error) {
            console.error('Error insertando documento en DB (error):', safeStringify(insertDocResp.error));
            console.error('Error insertando documento en DB (resp):', safeStringify(insertDocResp));
            throw new Error(`Error insertando documento: ${insertDocResp.error.message || safeStringify(insertDocResp.error)}`);
          }
        }
        resultados.push(`${Math.min(7, documentosBasicos.length)} documentos subidos`);
      }
      return resultados;
  } catch (error) {
      console.error('Error subiendo archivos:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (/almacenamiento|quota|insufficient|507/i.test(msg)) {
        setQuotaMessage('El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan.');
        setShowQuotaModal(true);
        // Evitar duplicar alerta superior
        setError("");
        return [];
      } else {
        setError(`Error subiendo archivos: ${msg}`);
        throw error;
      }
    } finally {
      setUploadingFoto(false);
      setUploadingDocumentos(false);
    }
  };

  // Cargar datos desde Supabase
  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: operadoresData, error: operadoresError } = await supabase
        .from("operadores")
        .select("*")
        .order("nombre");

      if (operadoresError) {
        console.error("Error cargando operadores:", operadoresError);
        setOperadores([]);
      } else {
        const ids = (operadoresData || []).map((o: any) => o.id);
        let fotosMap: Record<string, string> = {};

        if (ids.length > 0) {
          const { data: fotosData, error: fotosError } = await supabase
            .from("documentos_operadores")
            .select("operador_id,url_blob,url_archivo,tipo_documento")
            .in("operador_id", ids)
            .eq("tipo_documento", "fotografia_operador")
            .eq("activo", true);

          if (fotosError) {
            console.warn("Error cargando fotos operadores:", fotosError);
          } else if (fotosData) {
            fotosMap = (fotosData || []).reduce((acc: Record<string, string>, f: any) => {
              const url = f?.url_blob || f?.url_archivo || '';
              if (f?.operador_id && url) acc[f.operador_id] = url;
              return acc;
            }, {});
          }
        }

        const enriched = (operadoresData || []).map((o: any) => ({
          ...o,
          foto_url: fotosMap[o.id] || "",
        }));
        setOperadores(enriched);
      }
    } catch (error) {
      console.error("Error cargando datos de operadores:", error);
      setOperadores([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarDocumentosOperador = async (operadorId: string) => {
    try {
      setLoadingDocumentos(true);

      const { data, error } = await supabase
        .from("documentos_operadores")
        .select("*")
        .eq("operador_id", operadorId)
        .eq("activo", true)
        .order("fecha_subida", { ascending: false });

      if (error) {
        console.error("Error cargando documentos:", error);
        setDocumentos([]);
      } else {
        // Ordenar documentos: fotografía primero, luego documentos básicos, luego otros
        const documentosOrdenados = (data || []).sort((a, b) => {
          // Fotografía del operador va primero
          if (a.tipo_documento === "fotografia_operador") return -1;
          if (b.tipo_documento === "fotografia_operador") return 1;

          // Documentos básicos van después
          if (
            a.tipo_documento.startsWith("documento_basico_") &&
            !b.tipo_documento.startsWith("documento_basico_")
          )
            return -1;
          if (
            b.tipo_documento.startsWith("documento_basico_") &&
            !a.tipo_documento.startsWith("documento_basico_")
          )
            return 1;

          // Si ambos son documentos básicos, ordenar por número
          if (
            a.tipo_documento.startsWith("documento_basico_") &&
            b.tipo_documento.startsWith("documento_basico_")
          ) {
            const numA = Number.parseInt(a.tipo_documento.split("_")[2]) || 0;
            const numB = Number.parseInt(b.tipo_documento.split("_")[2]) || 0;
            return numA - numB;
          }

          // Para otros documentos, ordenar por fecha de subida (más reciente primero)
          return (
            new Date(b.fecha_subida).getTime() -
            new Date(a.fecha_subida).getTime()
          );
        });

        setDocumentos(documentosOrdenados);
      }
    } catch (error) {
      console.error("Error:", error);
      setDocumentos([]);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Parsear observaciones actuales cuando se abre el modal de detalles
  useEffect(() => {
    if (showDetailsModal && operadorDetalle) {
      try {
        if (operadorDetalle.observaciones) {
          const raw = operadorDetalle.observaciones;
          let parsed: any = null;
            try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
          if (
            parsed &&
            Array.isArray(parsed) &&
            parsed.every(
              (c: any) => typeof c.id === "string" && typeof c.texto === "string" && typeof c.fecha === "string"
            )
          ) {
            setComentarios(parsed as ComentarioOperador[]);
          } else {
            // Tratar todo el texto como un único comentario
            setComentarios([
              {
                id: Date.now().toString(),
                texto: raw,
                fecha: new Date().toISOString(),
              },
            ]);
          }
        } else {
          setComentarios([]);
        }
      } catch (e) {
        console.error("Error parseando observaciones", e);
        setComentarios([]);
      }
      setNuevoComentario("");
      setEditandoComentarioId(null);
      setTextoEdicion("");
    }
  }, [showDetailsModal, operadorDetalle]);

  const persistirComentarios = async (lista: ComentarioOperador[]) => {
    if (!operadorDetalle) return;
    try {
      const obsValue = lista.length > 0 ? JSON.stringify(lista) : null;
      const { error: upError } = await supabase
        .from("operadores")
        .update({ observaciones: obsValue, updated_at: new Date().toISOString() })
        .eq("id", operadorDetalle.id);
      if (upError) {
        console.error("Error guardando comentarios", upError);
        setError("Error al guardar comentarios");
      } else {
        setSuccess("Observaciones actualizadas");
        // Actualizar en operadorDetalle para mantener consistencia
        setOperadorDetalle((prev) =>
          prev ? { ...prev, observaciones: obsValue ?? undefined } : prev
        );
      }
    } catch (e) {
      console.error(e);
      setError("Error desconocido al guardar comentarios");
    }
  };

  const agregarComentario = async () => {
    const texto = nuevoComentario.trim();
    if (!texto) return;
    const nuevo: ComentarioOperador = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      texto,
      fecha: new Date().toISOString(),
    };
    const lista = [nuevo, ...comentarios];
    setComentarios(lista);
    setNuevoComentario("");
    await persistirComentarios(lista);
  };

  const iniciarEdicionComentario = (id: string) => {
    const c = comentarios.find((x) => x.id === id);
    if (!c) return;
    setEditandoComentarioId(id);
    setTextoEdicion(c.texto);
  };

  const guardarEdicionComentario = async () => {
    if (!editandoComentarioId) return;
    const texto = textoEdicion.trim();
    if (!texto) return;
    const lista = comentarios.map((c) =>
      c.id === editandoComentarioId ? { ...c, texto } : c
    );
    setComentarios(lista);
    setEditandoComentarioId(null);
    setTextoEdicion("");
    await persistirComentarios(lista);
  };

  const cancelarEdicionComentario = () => {
    setEditandoComentarioId(null);
    setTextoEdicion("");
  };

  const eliminarComentario = async (id: string) => {
    const lista = comentarios.filter((c) => c.id !== id);
    setComentarios(lista);
    await persistirComentarios(lista);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellidos: "",
      alias: "",
      telefono: "",
      email: "",
      licencia: "",
      numero_apto_medico: "",
      fecha_vencimiento_licencia: "",
      fecha_vencimiento_apto_medico: "",
      numero_visa: "",
  fecha_vencimiento_visa: "",
      numero_fast: "",
      fecha_vencimiento_fast: "",
      tipo_sangre: "",
      direccion: "",
      fecha_nacimiento: "",
      curp: "",
      rfc: "",
      nss: "",
      telefono_emergencia: "",
      contactos_emergencia: "",
      observaciones: "",
      estado: "activo",
    });
    setEditingId(null);
    setError("");
    setSuccess("");
  setContactosEmergencia([]);
  setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" });
  setEditingContactoIndex(null);

    // Limpiar fotografía y documentos
    setFotoOperador(null);
    setFotoOperadorUrl("");
    setDocumentosBasicos([]);
    // Liberar URLs temporales
    documentosBasicosUrls.forEach((url) => URL.revokeObjectURL(url));
    setDocumentosBasicosUrls([]);
    setUploadingFoto(false);
    setUploadingDocumentos(false);
  };

  const resetDocumentForm = () => {
    setSelectedFile(null);
    setTipoDocumento("");
    setNumeroDocumento("");
    setFechaVencimiento("");
    setNotasDocumento("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      // Validar formulario
      const errorValidacion = validarFormulario(formData);
      if (errorValidacion) {
        setError(errorValidacion);
        setSaving(false);
        return;
      }

      // Limpiar y preparar datos
      const dataToSave = limpiarDatosFormulario(formData);

      if (editingId) {
        const { error } = await supabase
          .from("operadores")
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) {
          console.error("Error actualizando operador:", error);
          setError(`Error al actualizar operador: ${error.message}`);
          return;
        }

        // Audit log: actualización de operador
        try {
          agregarAuditLog(
            "ACTUALIZAR",
            "Operadores",
            `Actualizó operador (ID: ${editingId}) ${dataToSave.nombre} ${dataToSave.apellidos}`
          );
        } catch {}

        // Subir archivos si hay nuevos
        if (fotoOperador || documentosBasicos.length > 0) {
          try {
            const resultados = await subirFotografiaYDocumentos(editingId);
            setSuccess(
              `Operador actualizado exitosamente. ${resultados.join(", ")}`
            );
          } catch (error) {
            setSuccess(
              "Operador actualizado exitosamente, pero hubo errores subiendo algunos archivos"
            );
          }
        } else {
          setSuccess("Operador actualizado exitosamente");
        }
      } else {
        // For new operator creation, we need to get the created operator ID
        console.log("[DEBUG] Creando operador con payload:", dataToSave);
        // Solo columnas que existen realmente en la tabla 'operadores'
        const payload = {
          nombre: dataToSave.nombre,
          apellidos: dataToSave.apellidos,
          alias: dataToSave.alias || null,
          telefono: dataToSave.telefono || null,
          email: dataToSave.email || null,
          licencia: dataToSave.licencia || null,
          fecha_vencimiento_licencia: dataToSave.fecha_vencimiento_licencia || null,
          fecha_vencimiento_apto_medico: dataToSave.fecha_vencimiento_apto_medico || null,
          numero_apto_medico: dataToSave.numero_apto_medico || null,
          numero_visa: dataToSave.numero_visa || null,
          fecha_vencimiento_visa: dataToSave.fecha_vencimiento_visa || null,
          numero_fast: dataToSave.numero_fast || null,
          fecha_vencimiento_fast: dataToSave.fecha_vencimiento_fast || null,
          tipo_sangre: dataToSave.tipo_sangre || null,
          direccion: dataToSave.direccion || null,
          fecha_nacimiento: dataToSave.fecha_nacimiento || null,
          curp: dataToSave.curp || null,
          rfc: dataToSave.rfc || null,
          nss: dataToSave.nss || null,
          telefono_emergencia: dataToSave.telefono_emergencia || null,
          contactos_emergencia: dataToSave.contactos_emergencia || null,
          observaciones: dataToSave.observaciones || null,
          estado: dataToSave.estado || 'activo',
          fecha_registro: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log('[DEBUG] Payload depurado para inserción:', payload);
        // Ejecutar inserción y registrar la respuesta completa para diagnóstico
        let insertResult: any;
        try {
          insertResult = await supabase.from('operadores').insert(payload).select().single();
          console.log('[DEBUG] supabase insert result raw (stringified):', JSON.stringify(insertResult, null, 2));
        } catch (ex) {
          console.error('[DEBUG] supabase insert threw an exception:', ex);
          setError(`Error al crear operador (excepción): ${ex instanceof Error ? ex.message : String(ex)}`);
          return;
        }

        // Manejar respuesta con más detalles
        if (insertResult?.error) {
          const err = insertResult.error as any;
          try {
            console.error('[DEBUG] Error creando operador (supabase):', JSON.stringify(err, null, 2));
          } catch (_) {
            console.error('[DEBUG] Error creando operador (supabase) (non-serializable):', err);
          }
          setError(`Error al crear operador: ${err?.message || 'desconocido'} ${err?.details || ''}`);
          return;
        }

        const newOperador = insertResult?.data;
        console.log('[DEBUG] Operador creado:', newOperador);

        // Audit log: creación de operador
        try {
          agregarAuditLog(
            "CREAR",
            "Operadores",
            `Creó operador ${payload.nombre} ${payload.apellidos} (ID: ${newOperador.id})`
          );
        } catch {}

        // Subir archivos para el nuevo operador
        if (fotoOperador || documentosBasicos.length > 0) {
          try {
            const resultados = await subirFotografiaYDocumentos(newOperador.id);
            setSuccess(
              `Operador creado exitosamente. ${resultados.join(", ")}`
            );
          } catch (error) {
            setSuccess(
              "Operador creado exitosamente, pero hubo errores subiendo algunos archivos"
            );
          }
        } else {
          setSuccess("Operador creado exitosamente");
        }
      }

      setShowModal(false);
      resetForm();
      await cargarDatos();
    } catch (error) {
      console.error("Error:", error);
      setError(
        `Error al guardar operador: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (operador: Operador) => {
    setFormData({
      nombre: operador.nombre || "",
      apellidos: operador.apellidos || "",
      alias: operador.alias || "",
      telefono: operador.telefono || "",
      email: operador.email || "",
      licencia: operador.licencia || "",
      numero_apto_medico: operador.numero_apto_medico || "",
      fecha_vencimiento_licencia: operador.fecha_vencimiento_licencia || "",
      fecha_vencimiento_apto_medico:
        operador.fecha_vencimiento_apto_medico || "",
      numero_visa: operador.numero_visa || "",
      fecha_vencimiento_visa: operador.fecha_vencimiento_visa || "",
      numero_fast: operador.numero_fast || "",
      fecha_vencimiento_fast: operador.fecha_vencimiento_fast || "",
      tipo_sangre: operador.tipo_sangre || "",
      direccion: operador.direccion || "",
      fecha_nacimiento: operador.fecha_nacimiento || "",
      curp: operador.curp || "",
      rfc: operador.rfc || "",
      nss: operador.nss || "",
      telefono_emergencia: operador.telefono_emergencia || "",
      contactos_emergencia:
        typeof operador.contactos_emergencia === "object" &&
        operador.contactos_emergencia !== null
          ? JSON.stringify(operador.contactos_emergencia)
          : operador.contactos_emergencia || "",
      observaciones: operador.observaciones || "",
      estado: operador.estado || "activo",
    });

    // Manejar contactos de emergencia (cargar arreglo existente)
    const contactosCargados: Array<any> = [];
    if (operador.contactos_emergencia) {
      try {
        const contactosExistentes =
          typeof operador.contactos_emergencia === "string"
            ? JSON.parse(operador.contactos_emergencia)
            : operador.contactos_emergencia;

        if (Array.isArray(contactosExistentes)) {
          contactosExistentes.forEach((contacto) => {
            contactosCargados.push({
              nombre: contacto.nombre || "",
              relacion: contacto.relacion || "",
              direccion: contacto.direccion || "",
              telefono: contacto.telefono || "",
              correo: contacto.correo || contacto.email || "",
            });
          });
        }
      } catch (error) {
        console.error("Error parsing contactos_emergencia:", error);
      }
    }

    setContactosEmergencia(contactosCargados);

    setEditingId(operador.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setSaving(true);

      // 1) Verificar que el operador esté INACTIVO
      const { data: operador, error: opError } = await supabase
        .from("operadores")
        .select("id, nombre, apellidos, estado")
        .eq("id", id)
        .single();

      if (opError) {
        console.warn("Error verificando operador:", JSON.stringify(opError));
        setError("Error al verificar estado del operador");
        return;
      }

      if (!operador || operador.estado !== "inactivo") {
        window.alert(
          "No se puede eliminar. El operador debe estar en estado INACTIVO."
        );
        return;
      }

      // 2) Verificar que NO tenga ningún embarque asociado (cualquier estado)
      const { data: embarques, error: embError } = await supabase
        .from("embarques")
        .select("id, folio")
        .eq("operador_id", id);

      if (embError) {
        console.warn("Error verificando embarques asociados:", JSON.stringify(embError));
        setError("Error al verificar embarques asociados");
        return;
      }

      if (embarques && embarques.length > 0) {
        const listado = embarques
          .slice(0, 5)
          .map((e) => e.folio || e.id)
          .join(", ");
        window.alert(
          `No se puede eliminar: el operador tiene embarques asociados (${embarques.length}). Folios: ${listado}${
            embarques.length > 5 ? "..." : ""
          }`
        );
        return;
      }

      // 2.5) Si tiene recordatorios asociados, los eliminamos antes de borrar el operador
      const { data: recordatorios, error: recError } = await supabase
        .from('recordatorios')
        .select('id, titulo')
        .eq('operador_id', id);

      if (recError) {
        console.warn('Error verificando recordatorios asociados:', recError);
        const detalle = recError?.message || JSON.stringify(recError) || 'error desconocido';
        setError(`Error al verificar recordatorios asociados: ${detalle}`);
        return;
      }

      if (recordatorios && recordatorios.length > 0) {
        console.info(`El operador tiene ${recordatorios.length} recordatorio(s). Procediendo a eliminarlos...`);
        const { data: delRecData, error: delRecError } = await supabase
          .from('recordatorios')
          .delete()
          .eq('operador_id', id);

        if (delRecError) {
          console.warn('Error eliminando recordatorios asociados:', delRecError);
          const detalle = delRecError?.message || JSON.stringify(delRecError) || 'error desconocido';
          setError(`Error eliminando recordatorios asociados: ${detalle}`);
          return;
        }

  let deletedCount = 0;
  if (Array.isArray(delRecData)) deletedCount = (delRecData as any).length;
  else if (Array.isArray(recordatorios)) deletedCount = recordatorios.length;
  console.info('Recordatorios eliminados:', deletedCount);
      }

      // 2.6) Eliminar documentos y sus archivos en blob storage
      try {
        const { data: docs, error: docsError } = await supabase
          .from('documentos_operadores')
          .select('id, pathname')
          .eq('operador_id', id);

        if (docsError) {
          console.warn('Error obteniendo documentos del operador para eliminar:', docsError);
        } else if (docs && docs.length > 0) {
          for (const doc of docs as Array<{ id: string; pathname: string | null }>) {
            if (doc.pathname) {
              try {
                await eliminarDocumentoOperador(doc.pathname);
              } catch (e) {
                console.warn('No se pudo eliminar archivo de blob storage:', doc.pathname, e);
              }
            }
          }

          const { error: delDocsError } = await supabase
            .from('documentos_operadores')
            .delete()
            .eq('operador_id', id);

          if (delDocsError) {
            console.warn('Error eliminando registros de documentos del operador:', delDocsError);
          }
        }
      } catch (e) {
        console.warn('Excepción al eliminar documentos del operador:', e);
      }

      // 3) Eliminar definitivamente
      const { error } = await supabase.from("operadores").delete().eq("id", id);

      if (error) {
        console.warn("Error eliminando operador:", JSON.stringify(error));
        setError(
          `Error al eliminar operador: ${error?.message || JSON.stringify(error) || 'desconocido'}`
        );
        return;
      }

      setSuccess("Operador eliminado exitosamente");
      // Audit log: eliminación de operador
      try {
        agregarAuditLog(
          "ELIMINAR",
          "Operadores",
          `Eliminó operador (ID: ${id})`
        );
      } catch {}
      await cargarDatos();
    } catch (error) {
      console.warn("Error al eliminar operador (excepción):", String(error));
      setError(
        `Error al eliminar operador: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("El archivo es muy grande. Tamaño máximo: 10MB");
        return;
      }

      // Validar tipo
      const tiposPermitidos = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "application/pdf",
      ];
      if (!tiposPermitidos.includes(file.type)) {
        setError(
          "Tipo de archivo no permitido. Solo se permiten imágenes y PDFs"
        );
        return;
      }

      setSelectedFile(file);
      setError("");
    }
  };

  const subirDocumento = async () => {
    if (!operadorDetalle || !selectedFile || !tipoDocumento) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      setUploadingDoc(true);
      setError("");

      // Subir archivo a Blob
      const { url, pathname } = await subirDocumentoOperador(
        operadorDetalle.id,
        selectedFile,
        tipoDocumento,
        numeroDocumento
      );

      // Guardar información en la base de datos
      const insertResp = await supabase.from("documentos_operadores").insert({
        operador_id: operadorDetalle.id,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento || null,
        nombre_archivo: selectedFile.name,
        url_blob: url,
  // Compatibilidad con esquemas legados que usan url_archivo NOT NULL
  url_archivo: url,
        pathname: pathname,
        // Compatibilidad legada: pathname_archivo
        pathname_archivo: pathname,
        tamano_bytes: selectedFile.size,
        tipo_mime: selectedFile.type,
        fecha_vencimiento: fechaVencimiento || null,
        notas: notasDocumento || null,
        subido_por: "Sistema",
        activo: true,
      }).select();

      if (insertResp.error) {
        console.error("Error guardando documento (error):", safeStringify(insertResp.error));
        console.error("Error guardando documento (resp):", safeStringify(insertResp));
        setError(`Error al guardar la información del documento: ${insertResp.error.message || safeStringify(insertResp.error)}`);
        return;
      }

      setSuccess("Documento subido exitosamente");
      resetDocumentForm();
      await cargarDocumentosOperador(operadorDetalle.id);
    } catch (error) {
      console.error("Error subiendo documento:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (/almacenamiento|quota|insufficient|507/i.test(msg)) {
        setQuotaMessage('El almacenamiento de imágenes está lleno. Contacta al administrador para liberar espacio o ampliar el plan.');
        setShowQuotaModal(true);
        setError("");
      } else {
        setError(`Error al subir documento: ${msg}`);
      }
    } finally {
      setUploadingDoc(false);
    }
  };


  const eliminarDocumento = async (documento: DocumentoOperador) => {
    try {
      // Eliminar de Blob storage
      await eliminarDocumentoOperador(documento.pathname);

      // Marcar como inactivo en la base de datos
      const { error } = await supabase
        .from("documentos_operadores")
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq("id", documento.id);

      if (error) {
        console.error("Error eliminando documento:", error);
        setError("Error al eliminar documento");
        return;
      }

      setSuccess("Documento eliminado exitosamente");
      await cargarDocumentosOperador(documento.operador_id);
    } catch (error) {
      console.error("Error:", error);
      setError("Error al eliminar documento");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  // Exportar un solo operador (mismo orden que el reporte general)
  const exportOperadorToExcel = (operador: Operador) => {
    if (!operador) return;
    exportOperadorDetalleToExcel(operador);
  };

  const getEstadoBadge = (estado: string) => {
    return estado === "activo" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Activo
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Inactivo
      </Badge>
    );
  };

  const operadoresFiltrados = operadores.filter(
    (operador) =>
      operador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operador.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (operador.alias &&
        operador.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (operador.telefono && operador.telefono.includes(searchTerm))
  );

  // Derivados de paginación
  const totalPages = Math.max(
    1,
    Math.ceil(operadoresFiltrados.length / Math.max(1, pageSize))
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const operadoresPaginados = operadoresFiltrados.slice(start, end);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando operadores...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Aviso de cuota llena: redirige a Configuración > Limpieza */}
        <AlertDialog open={showQuotaModal} onOpenChange={(open) => {
          setShowQuotaModal(open);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="sr-only">Almacenamiento de imágenes lleno</AlertDialogTitle>
              <Alert className="bg-red-50 text-red-800 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Almacenamiento de imágenes lleno.</span>
                  <span className="ml-1">{quotaMessage || 'No hay espacio disponible para subir más archivos.'}</span>
                </AlertDescription>
              </Alert>
            </AlertDialogHeader>
            <div className="text-sm text-gray-700 mt-2">
              Ve a Configuración &gt; Limpieza para borrar archivos por rango de fechas y liberar espacio.
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Salir</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                setShowQuotaModal(false);
                router.push('/configuracion?tab=limpieza');
              }}>Ir a Limpieza</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Operadores
            </h1>
            <p className="text-gray-600 mt-2">
              Gestión de operadores y conductores
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  exportOperadoresToExcel(operadores);
                } finally {
                  try {
                    agregarAuditLog(
                      "EXPORTAR",
                      "Operadores",
                      `Descargó reporte general de operadores (${operadores.length})`
                    );
                  } catch {}
                }
              }}
              className="flex items-center"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar Reporte
            </Button>
            <div className="flex items-center space-x-2">
              {/* Checkpoint button hidden intentionally */}

              <input ref={restoreInputRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setRestoring(true);
                  const txt = await f.text();
                  const data = JSON.parse(txt);
                  // Simple restore strategy: insertar operadores que no existan por id
                  if (Array.isArray(data.operadores)) {
                    for (const op of data.operadores) {
                      try {
                        // insert or ignore if exists
                        const { data: existing } = await supabase.from('operadores').select('id').eq('id', op.id).single();
                        if (!existing) {
                          await supabase.from('operadores').insert(op);
                        }
                      } catch (err) { console.warn('restore operador err', err); }
                    }
                  }
                  // Restaurar documentos: insert metadata rows, no blob
                  if (Array.isArray(data.documentos)) {
                    for (const doc of data.documentos) {
                      try {
                        const { data: existingDoc } = await supabase.from('documentos_operadores').select('id').eq('id', doc.id).single();
                        if (!existingDoc) {
                          // Insert minimal fields
                          await supabase.from('documentos_operadores').insert({
                            ...doc,
                            activo: doc.activo ?? true,
                          });
                        }
                      } catch (err) { console.warn('restore doc err', err); }
                    }
                  }
                  setSuccess('Restauración completada (verifica duplicados)');
                  await cargarDatos();
                } catch (err) {
                  console.error('Error restaurando checkpoint', err);
                  setError('Error restaurando checkpoint');
                } finally { setRestoring(false); }
                // limpiar input
                (e.target as HTMLInputElement).value = '';
              }} />

              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Operador
              </Button>

            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Operadores */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Operadores
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {operadores.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          {/* Operadores Activos */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Operadores Activos
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {operadores.filter((op) => op.estado === "activo").length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          {/* Operadores Inactivos */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Operadores Inactivos
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {operadores.filter((op) => op.estado === "inactivo").length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          {/* Licencias por Vencer */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Licencias por Vencer
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {
                      operadores.filter((op) => {
                        if (!op.fecha_vencimiento_licencia) return false;
                        const dias =
                          (new Date(op.fecha_vencimiento_licencia).getTime() -
                            new Date().getTime()) /
                          (1000 * 60 * 60 * 24);
                        return dias >= 0 && dias <= 30;
                      }).length
                    }
                  </p>
                </div>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          {/* Aptos Médicos por Vencer */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Aptos Médicos por Vencer
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {
                      operadores.filter((op) => {
                        if (!op.fecha_vencimiento_apto_medico) return false;
                        const dias =
                          (new Date(
                            op.fecha_vencimiento_apto_medico
                          ).getTime() -
                            new Date().getTime()) /
                          (1000 * 60 * 60 * 24);
                        return dias >= 0 && dias <= 30;
                      }).length
                    }
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          {/* Cumpleaños Próximo */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Cumpleaños Próximo
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {
                      operadores.filter((op) => {
                        if (!op.fecha_nacimiento) return false;
                        const hoy = new Date();
                        const cumple = new Date(op.fecha_nacimiento);
                        cumple.setFullYear(hoy.getFullYear());
                        const diff =
                          (cumple.getTime() - hoy.getTime()) /
                          (1000 * 60 * 60 * 24);
                        return diff >= 0 && diff <= 14; // próximas 2 semanas
                      }).length
                    }
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              {/* Solo conteo en próximas 2 semanas; sin lista detallada */}
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Filtros + paginación superior */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  className="w-72 md:w-96"
                  placeholder="Buscar por nombre, alias, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
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
                {/* Dropdown columnas */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Columnas:</span>
                  <Select
                    value={String(cols)}
                    onValueChange={(v) => setCols(v === '3' ? 3 : 2)}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue placeholder="Cols" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
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

  {/* Lista de operadores en formato de tarjetas (paginada) */}
  {/* Ajuste solicitado: mostrar 2 operadores por fila (limitar a 2 columnas incluso en pantallas grandes) */}
  <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
          {operadoresPaginados.map((operador) => (
            <Card
              key={operador.id}
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-4">
                  {/* Foto del operador */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-300">
                      <img
                        src={operador.foto_url || "/images/logo-monarca-transparent.png"}
                        alt={`${operador.nombre} ${operador.apellidos}`}
                        className={`w-full h-full ${operador.foto_url ? 'object-cover' : 'object-contain p-1 bg-white'}`}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/images/logo-monarca-transparent.png";
                          // Ajustar estilo para que el logo no se recorte si falla la foto
                          e.currentTarget.style.objectFit = 'contain';
                          e.currentTarget.style.padding = '4px';
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      />
                    </div>
                  </div>

                  {/* Información y botones */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {operador.nombre} {operador.apellidos}
                        </CardTitle>
                        <div className="flex items-center mb-2 gap-2 min-h-[24px]">
                          {operador.alias && (
                            <span className="text-sm font-medium text-blue-600 truncate">
                              "{operador.alias}"
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-2">
                        <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Detalles completos"
                          onClick={() => {
                            setOperadorDetalle(operador);
                            setActiveTab('general');
                            cargarDocumentosOperador(operador.id);
                            setShowDetailsModal(true);
                          }}
                          className="px-2"
                        >
                          Detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title={
                            operador.estado === "activo"
                              ? "Desactivar operador"
                              : "Activar operador"
                          }
                          onClick={async () => {
                            // Cambiar estado (permitido siempre, sin importar embarques asociados)
                            const nuevoEstado =
                              operador.estado === "activo"
                                ? "inactivo"
                                : "activo";
                            const { error: updateError } = await supabase
                              .from("operadores")
                              .update({
                                estado: nuevoEstado,
                                updated_at: new Date().toISOString(),
                              })
                              .eq("id", operador.id);
                            if (updateError) {
                              window.alert(
                                "Error al actualizar estado del operador"
                              );
                              return;
                            }
                            setSuccess(
                              nuevoEstado === "activo"
                                ? "Operador activado correctamente"
                                : "Operador desactivado correctamente"
                            );
                            // Audit log: cambio de estado
                            try {
                              agregarAuditLog(
                                "ACTUALIZAR",
                                "Operadores",
                                `Cambió estado del operador (ID: ${operador.id}) a ${nuevoEstado}`
                              );
                            } catch {}
                            await cargarDatos();
                          }}
                        >
                          {operador.estado === "activo" ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        {/* Botón Modificar ocultado según solicitud */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar operador?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente el operador {operador.nombre} {operador.apellidos}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(operador.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                        <div className="mt-2">{getEstadoBadge(operador.estado)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Información de contacto */}
                <div className="space-y-2">
                  {operador.telefono && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{operador.telefono}</span>
                    </div>
                  )}
                  {operador.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{operador.email}</span>
                    </div>
                  )}
                </div>

                {/* Información de documentos principales */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {operador.licencia && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-1 mb-1">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-xs">Licencia</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {operador.licencia}
                      </p>
                      {operador.fecha_vencimiento_licencia && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            operador.fecha_vencimiento_licencia
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {operador.tipo_sangre && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-1 mb-1">
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                        <span className="font-medium text-xs">Tipo Sangre</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {operador.tipo_sangre}
                      </p>
                    </div>
                  )}

                  {operador.numero_visa && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-1 mb-1">
                        <FileText className="h-3 w-3 text-blue-400" />
                        <span className="font-medium text-xs">Visa</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {operador.numero_visa}
                      </p>
                      {operador.fecha_vencimiento_visa && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            operador.fecha_vencimiento_visa
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {operador.numero_fast && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-1 mb-1">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="font-medium text-xs">FAST</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {operador.numero_fast}
                      </p>
                      {operador.fecha_vencimiento_fast && (
                        <p className="text-xs text-gray-500">
                          {new Date(
                            operador.fecha_vencimiento_fast
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Información adicional */}
                {operador.fecha_nacimiento && (
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="flex items-center space-x-1 mb-1">
                      <Users className="h-3 w-3 text-blue-400" />
                      <span className="font-medium text-xs">
                        Fecha de Nacimiento
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(operador.fecha_nacimiento).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Observaciones si existen */}
                {operador.observaciones && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs">
                      <strong>Obs:</strong>{" "}
                      {operador.observaciones.length > 50
                        ? `${operador.observaciones.substring(0, 50)}...`
                        : operador.observaciones}
                    </p>
                  </div>
                )}

                {/* Fecha de registro */}
                <div className="text-xs text-gray-400 pt-2 border-t">
                  Registrado:{" "}
                  {new Date(operador.fecha_registro).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controles de paginación inferior */}
        {operadoresFiltrados.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-gray-600">
              Mostrando {Math.min(operadoresFiltrados.length, end) - start} de {operadoresFiltrados.length}
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

        {/* Mensaje cuando no hay operadores */}
        {operadoresFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No se encontraron operadores</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Formulario con Pestañas */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-start p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Editar Operador" : "Nuevo Operador"}
                </h2>
                {!editingId && (
                  <p className="text-sm text-gray-500 mt-1">
                    Captura aquí la información completa de tu operador.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleSubmit} className="p-6">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger
                      value="personal"
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Personal
                    </TabsTrigger>
                    <TabsTrigger
                      value="detalles"
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Detalles
                    </TabsTrigger>
                    <TabsTrigger
                      value="fotografia"
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Fotografía
                    </TabsTrigger>
                    <TabsTrigger
                      value="documentos"
                      className="flex items-center gap-2"
                    >
                      <IdCard className="h-4 w-4" />
                      Documentos
                    </TabsTrigger>
                    <TabsTrigger
                      value="licencias"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Licencias
                    </TabsTrigger>
                    <TabsTrigger
                      value="emergencia"
                      className="flex items-center gap-2"
                    >
                      <Contact className="h-4 w-4" />
                      Emergencia
                    </TabsTrigger>
                    <TabsTrigger
                      value="observaciones"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Observaciones
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData({ ...formData, nombre: e.target.value })
                          }
                          required
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellidos">Apellidos *</Label>
                        <Input
                          id="apellidos"
                          value={formData.apellidos}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              apellidos: e.target.value,
                            })
                          }
                          required
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alias">Alias</Label>
                        <Input
                          id="alias"
                          value={formData.alias}
                          onChange={(e) =>
                            setFormData({ ...formData, alias: e.target.value })
                          }
                          placeholder="Ej: El Rápido, La Máquina..."
                          maxLength={50}
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
                          placeholder="Ej: +52 123 456 7890"
                          maxLength={20}
                        />
                        {formData.telefono &&
                          !validarTelefono(formData.telefono) && (
                            <p className="text-xs text-red-500">
                              Formato de teléfono inválido
                            </p>
                          )}
                      </div>
                      {/* Ajuste: levantamos ligeramente el bloque de Email */}
                      <div className="space-y-2 -mt-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="ejemplo@correo.com"
                          maxLength={100}
                        />
                        {formData.email && !validarEmail(formData.email) && (
                          <p className="text-xs text-red-500">
                            Formato de email inválido
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="detalles" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                        <Input
                          id="fecha_nacimiento"
                          type="date"
                          value={formData.fecha_nacimiento}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_nacimiento: e.target.value,
                            })
                          }
                          max={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipo_sangre">Tipo de Sangre</Label>
                        <Select
                          value={formData.tipo_sangre}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tipo_sangre: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
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
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
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
                          rows={2}
                          maxLength={500}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="fotografia" className="space-y-6 mt-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Fotografía y Documentos</h3>
                      <p className="text-xs text-gray-500 mb-4">Sube una fotografía principal y hasta 7 documentos adicionales (imágenes o PDFs).</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Fotografía del operador (imagen)</Label>
                          <div className="mt-2 w-48 h-48 bg-gray-100 rounded overflow-hidden border">
                            {fotoOperadorUrl ? (
                              <img src={fotoOperadorUrl} alt="Fotografía" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">Sin fotografía</div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input type="file" accept="image/*" onChange={handleFotoOperadorSelect} />
                            {fotoOperador && (
                              <Button variant="outline" size="sm" onClick={() => { URL.revokeObjectURL(fotoOperadorUrl); setFotoOperador(null); setFotoOperadorUrl(''); }}>Quitar</Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Documentos adicionales (hasta 7)</Label>
                          <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={handleDocumentosBasicosSelect}
                            className="mt-2"
                          />
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {documentosBasicosUrls.map((url, idx) => (
                              <div key={idx} className="border rounded p-2 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {documentosBasicos[idx].type.startsWith('image/') ? (
                                    <img src={url} className="w-12 h-12 object-cover rounded" alt={documentosBasicos[idx].name} />
                                  ) : (
                                    <FileText className="w-8 h-8 text-gray-400" />
                                  )}
                                  <div className="text-xs">
                                    <div className="font-medium truncate w-36">{documentosBasicos[idx].name}</div>
                                    <div className="text-gray-500">{formatFileSize(documentosBasicos[idx].size)}</div>
                                  </div>
                                </div>
                                <div>
                                  <Button variant="ghost" size="sm" onClick={() => eliminarDocumentoBasico(idx)} className="text-red-600">Eliminar</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {(uploadingFoto || uploadingDocumentos) && (
                        <div className="flex items-center justify-center mt-4 text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          Subiendo archivos...
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documentos" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="curp">CURP</Label>
                        <Input
                          id="curp"
                          value={formData.curp}
                          onChange={(e) => setFormData({ ...formData, curp: e.target.value })}
                          placeholder="CURP (opcional)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rfc">RFC</Label>
                        <Input
                          id="rfc"
                          value={formData.rfc}
                          onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                          placeholder="RFC (opcional)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nss">NSS</Label>
                        <Input
                          id="nss"
                          value={formData.nss}
                          onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
                          placeholder="NSS (opcional)"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="licencias" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="licencia">Número de Licencia</Label>
                        <Input
                          id="licencia"
                          value={formData.licencia}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              licencia: e.target.value,
                            })
                          }
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento_licencia">
                          Vencimiento Licencia
                        </Label>
                        <Input
                          id="fecha_vencimiento_licencia"
                          type="date"
                          value={formData.fecha_vencimiento_licencia}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_vencimiento_licencia: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero_apto_medico">Apto Médico</Label>
                        <Input
                          id="numero_apto_medico"
                          value={formData.numero_apto_medico}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numero_apto_medico: e.target.value,
                            })
                          }
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento_apto_medico">
                          Vencimiento Apto Médico
                        </Label>
                        <Input
                          id="fecha_vencimiento_apto_medico"
                          type="date"
                          value={formData.fecha_vencimiento_apto_medico}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_vencimiento_apto_medico: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero_visa">Número de Visa</Label>
                        <Input
                          id="numero_visa"
                          value={formData.numero_visa}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numero_visa: e.target.value,
                            })
                          }
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento_visa">
                          Vencimiento Visa
                        </Label>
                        <Input
                          id="fecha_vencimiento_visa"
                          type="date"
                          value={formData.fecha_vencimiento_visa}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_vencimiento_visa: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero_fast">Número FAST</Label>
                        <Input
                          id="numero_fast"
                          value={formData.numero_fast}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              numero_fast: e.target.value,
                            })
                          }
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento_fast">
                          Vencimiento FAST
                        </Label>
                        <Input
                          id="fecha_vencimiento_fast"
                          type="date"
                          value={formData.fecha_vencimiento_fast}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_vencimiento_fast: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="emergencia" className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="telefono_emergencia">
                        Teléfono de Emergencia Principal
                      </Label>
                      <Input
                        id="telefono_emergencia"
                        value={formData.telefono_emergencia}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            telefono_emergencia: e.target.value,
                          })
                        }
                        placeholder="Ej: +52 123 456 7890"
                        maxLength={20}
                        className="bg-red-50/40 border-red-100 focus:ring-red-200"
                      />
                      {formData.telefono_emergencia &&
                        !validarTelefono(formData.telefono_emergencia) && (
                          <p className="text-xs text-red-500">
                            Formato de teléfono inválido
                          </p>
                        )}
                    </div>

                    <div className="space-y-4">
                      <div className="border-t pt-4">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Contactos de Emergencia (Máximo 5)
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Capture la información de las personas a contactar en
                          caso de emergencia
                        </p>

                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                              <Label>Nombre Completo</Label>
                              <Input
                                value={nuevoContacto.nombre}
                                onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })}
                                placeholder="Ej: Juan Pérez García"
                              />
                            </div>
                            <div>
                              <Label>Relación</Label>
                              <Select value={nuevoContacto.relacion} onValueChange={(v) => setNuevoContacto({ ...nuevoContacto, relacion: v })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar relación" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="padre">Padre</SelectItem>
                                  <SelectItem value="madre">Madre</SelectItem>
                                  <SelectItem value="esposo">Esposo</SelectItem>
                                  <SelectItem value="esposa">Esposa</SelectItem>
                                  <SelectItem value="hijo">Hijo</SelectItem>
                                  <SelectItem value="hija">Hija</SelectItem>
                                  <SelectItem value="hermano">Hermano</SelectItem>
                                  <SelectItem value="hermana">Hermana</SelectItem>
                                  <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Teléfono</Label>
                              <Input
                                value={nuevoContacto.telefono}
                                onChange={(e) => setNuevoContacto({ ...nuevoContacto, telefono: e.target.value })}
                                placeholder="Ej: +52 123 456 7890"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <Label>Correo Electrónico</Label>
                              <Input value={nuevoContacto.correo} onChange={(e) => setNuevoContacto({ ...nuevoContacto, correo: e.target.value })} placeholder="ejemplo@correo.com" />
                            </div>
                            <div>
                              <Label>Dirección</Label>
                              <Input value={nuevoContacto.direccion} onChange={(e) => setNuevoContacto({ ...nuevoContacto, direccion: e.target.value })} placeholder="Dirección" />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4">
                            {editingContactoIndex === null ? (
                              <Button
                                type="button"
                                onClick={() => {
                                  if (!nuevoContacto.nombre && !nuevoContacto.telefono && !nuevoContacto.correo) return;
                                  if (contactosEmergencia.length >= 5) return;
                                  setContactosEmergencia([...contactosEmergencia, { ...nuevoContacto }]);
                                  setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" });
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Agregar Contacto
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (editingContactoIndex === null) return;
                                    const lista = [...contactosEmergencia];
                                    lista[editingContactoIndex] = { ...nuevoContacto };
                                    setContactosEmergencia(lista);
                                    setEditingContactoIndex(null);
                                    setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" });
                                  }}
                                >Guardar</Button>
                                <Button type="button" variant="outline" onClick={() => { setEditingContactoIndex(null); setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" }); }}>Cancelar</Button>
                              </>
                            )}
                            <Button type="button" variant="ghost" onClick={() => { setContactosEmergencia([]); setNuevoContacto({ nombre: "", relacion: "", direccion: "", telefono: "", correo: "" }); }}>Limpiar</Button>
                          </div>

                          <div>
                            {contactosEmergencia.length === 0 ? (
                              <p className="text-sm text-gray-500">No hay contactos agregados.</p>
                            ) : (
                              <div className="border rounded">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left">
                                      <th className="p-2">Nombre</th>
                                      <th className="p-2">Relación</th>
                                      <th className="p-2">Dirección</th>
                                      <th className="p-2">Teléfono</th>
                                      <th className="p-2">Correo</th>
                                      <th className="p-2">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {contactosEmergencia.map((c, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="p-2">{c.nombre || '—'}</td>
                                        <td className="p-2">{c.relacion || '—'}</td>
                                        <td className="p-2">{c.direccion || '—'}</td>
                                        <td className="p-2">{c.telefono || '—'}</td>
                                        <td className="p-2">{c.correo || '—'}</td>
                                        <td className="p-2">
                                          <div className="flex gap-2">
                                            <Button type="button" size="sm" onClick={() => { setEditingContactoIndex(idx); setNuevoContacto({ ...contactosEmergencia[idx] }); }}>Editar</Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => { setContactosEmergencia(contactosEmergencia.filter((_, i) => i !== idx)); }}>Eliminar</Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="observaciones" className="space-y-4 mt-6">
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
                        rows={4}
                        placeholder="Notas adicionales sobre el operador..."
                        maxLength={1000}
                      />
                      <p className="text-xs text-gray-500">
                        {formData.observaciones.length}/1000 caracteres
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-start space-x-3 pt-6 border-t mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => exportOperadoresToExcel(operadores)}
                    className="flex items-center"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? "Actualizar" : "Crear registro"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles con Pestañas */}
      {showDetailsModal && operadorDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detalles del Operador
                </h2>
                <p className="text-sm text-gray-600">
                  {operadorDetalle.nombre} {operadorDetalle.apellidos}
                  {operadorDetalle.alias && (
                    <span className="text-blue-600 ml-2">
                      "{operadorDetalle.alias}"
                    </span>
                  )}
                </p>
              </div>
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-170px)] flex-1">
              <div className="p-6 pb-2">
                {/* Tab Navigation */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  {/* Se agrega nueva pestaña 'Contactos de Emergencia' */}
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> General
                    </TabsTrigger>
                    <TabsTrigger value="ids" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> IDs
                    </TabsTrigger>
                    <TabsTrigger value="licencias" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Licencias
                    </TabsTrigger>
                    <TabsTrigger value="fotografias" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Fotografías ({documentos.filter(doc => doc.tipo_mime?.startsWith('image/') || doc.tipo_documento === 'fotografia_operador').length})
                    </TabsTrigger>
                    <TabsTrigger value="contactos" className="flex items-center gap-2">
                      <Contact className="h-4 w-4" /> Contactos de Emergencia
                    </TabsTrigger>
                    <TabsTrigger value="observaciones" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Observaciones
                    </TabsTrigger>
                  </TabsList>
                  {/* Tab Contactos de Emergencia */}
                  <TabsContent value="contactos" className="space-y-6 mt-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center">
                        <Contact className="h-5 w-5 mr-2 text-blue-600" /> Contactos de Emergencia
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          try {
                            const lista = operadorDetalle.contactos_emergencia ? (typeof operadorDetalle.contactos_emergencia === 'string' ? JSON.parse(operadorDetalle.contactos_emergencia) : operadorDetalle.contactos_emergencia) : [];
                            if (!Array.isArray(lista) || lista.length === 0) return <p className="text-gray-500">Sin contactos registrados</p>;
                            return (
                              <div className="border rounded">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left">
                                      <th className="p-2">Nombre</th>
                                      <th className="p-2">Relación</th>
                                      <th className="p-2">Dirección</th>
                                      <th className="p-2">Teléfono</th>
                                      <th className="p-2">Correo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lista.filter(Boolean).map((c: any, i: number) => (
                                      <tr key={i} className="border-t">
                                        <td className="p-2">{c.nombre || '—'}</td>
                                        <td className="p-2">{c.relacion || '—'}</td>
                                        <td className="p-2">{c.direccion || '—'}</td>
                                        <td className="p-2">{c.telefono || '—'}</td>
                                        <td className="p-2">{c.correo || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          } catch { return <p className="text-red-500">Error leyendo contactos</p>; }
                        })()}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab General (contenido existente más abajo en archivo original, no modificado) */}
                  <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="space-y-8">
                      {/* Identidad y Estado */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Nombre Completo</p>
                          <p className="font-medium text-gray-900">{operadorDetalle.nombre} {operadorDetalle.apellidos}</p>
                        </div>
                        {operadorDetalle.alias && (
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Alias</p>
                            <p className="font-medium text-blue-600">"{operadorDetalle.alias}"</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Estado</p>
                          <div>{getEstadoBadge(operadorDetalle.estado)}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Fecha de Nacimiento</p>
                          <p>{operadorDetalle.fecha_nacimiento ? new Date(operadorDetalle.fecha_nacimiento).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Tipo de Sangre</p>
                          <p>{operadorDetalle.tipo_sangre || '—'}</p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Dirección</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{operadorDetalle.direccion || '—'}</p>
                        </div>
                      </div>

                      {/* Contacto (sin contactos de emergencia) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Teléfono</p>
                          <p>{operadorDetalle.telefono || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Email</p>
                          <p className="truncate">{operadorDetalle.email || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab IDs */}
                  <TabsContent value="ids" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">CURP</p>
                        <p className="font-mono break-all text-sm">{operadorDetalle.curp || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">RFC</p>
                        <p className="font-mono break-all text-sm">{operadorDetalle.rfc || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">NSS</p>
                        <p className="font-mono break-all text-sm">{operadorDetalle.nss || '—'}</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab Licencias */}
                  <TabsContent value="licencias" className="space-y-4 mt-6 text-sm">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documentos y Vencimientos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                      <p className="text-sm">
                        <span className="font-semibold">Licencia:</span> {operadorDetalle.licencia || '—'}
                        {operadorDetalle.fecha_vencimiento_licencia && (
                          <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorDetalle.fecha_vencimiento_licencia).toLocaleDateString()}</span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Apto Médico:</span> {operadorDetalle.numero_apto_medico || '—'}
                        {operadorDetalle.fecha_vencimiento_apto_medico && (
                          <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorDetalle.fecha_vencimiento_apto_medico).toLocaleDateString()}</span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">FAST:</span> {operadorDetalle.numero_fast || '—'}
                        {operadorDetalle.fecha_vencimiento_fast && (
                          <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorDetalle.fecha_vencimiento_fast).toLocaleDateString()}</span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Visa:</span> {operadorDetalle.numero_visa || '—'}
                        {operadorDetalle.fecha_vencimiento_visa && (
                          <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorDetalle.fecha_vencimiento_visa).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab Fotografías: mostrar todos los objetos subidos, frame verde para la principal */}
                  <TabsContent value="fotografias" className="space-y-6 mt-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        Archivos Subidos ({documentos.length})
                      </h3>
                      {loadingDocumentos ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-sm text-gray-600">Cargando archivos...</span>
                        </div>
                      ) : documentos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No hay archivos subidos</p>
                          <p className="text-sm mt-1">Los archivos cargados en el registro aparecerán aquí</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Mostrar primero imágenes, luego otros archivos */}
                          {documentos
                            .sort((a, b) => {
                              const aImg = a.tipo_mime?.startsWith('image/');
                              const bImg = b.tipo_mime?.startsWith('image/');
                              if (aImg === bImg) return 0;
                              return aImg ? -1 : 1;
                            })
                            .map((documento) => {
                              const esImagen = documento.tipo_mime?.startsWith('image/');
                              const esPrincipal = documento.tipo_documento === 'fotografia_operador';
                              return (
                                <div
                                  key={documento.id}
                                  className={`border rounded-lg p-3 space-y-2 bg-white hover:shadow-md transition-shadow ${esPrincipal ? 'border-green-500 ring-2 ring-green-400' : ''}`}
                                >
                                  <div className="aspect-square max-w-[180px] w-full mx-auto bg-gray-100 rounded-lg overflow-hidden relative group flex items-center justify-center">
                                    {esImagen ? (
                                      <img
                                        src={documento.url_blob || '/placeholder.svg'}
                                        alt={documento.nombre_archivo}
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open(documento.url_blob, '_blank')}
                                        onError={(e) => { e.currentTarget.src = '/placeholder.svg?height=200&width=300&text=Error+cargando+imagen'; }}
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                                        <FileText className="h-8 w-8 mb-2" />
                                        <span className="text-[10px]">{documento.nombre_archivo}</span>
                                      </div>
                                    )}
                                    {esPrincipal && (
                                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow">FOTOGRAFÍA PRINCIPAL</div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="text-white text-center">
                                        <Eye className="h-5 w-5 mx-auto mb-1" />
                                        <span className="text-[10px]">Click para ver</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Badge className={esPrincipal ? 'bg-green-100 text-green-800 text-[10px]' : esImagen ? 'bg-blue-100 text-blue-800 text-[10px]' : 'bg-gray-100 text-gray-800 text-[10px]'}>
                                        {esPrincipal ? 'FOTOGRAFÍA PRINCIPAL' : esImagen ? 'IMAGEN' : 'ARCHIVO'}
                                      </Badge>
                                      <span className="text-[10px] text-gray-500">{documento.tamano_bytes && formatFileSize(documento.tamano_bytes)}</span>
                                    </div>
                                    <p className="text-xs font-medium truncate">{documento.nombre_archivo}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(documento.fecha_subida).toLocaleDateString()} a las {new Date(documento.fecha_subida).toLocaleTimeString()}</p>
                                    {documento.notas && (<p className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded">{documento.notas}</p>)}
                                    <div className="flex space-x-2 pt-2">
                                      <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => window.open(documento.url_blob, '_blank')}>
                                        <Eye className="h-3 w-3 mr-1" /> Ver
                                      </Button>
                                      <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = documento.url_blob;
                                        link.download = documento.nombre_archivo;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}>
                                        <Download className="h-3 w-3 mr-1" /> Descargar
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta acción no se puede deshacer. El archivo se eliminará permanentemente.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => eliminarDocumento(documento)}>Eliminar</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab Observaciones */}
                  <TabsContent value="observaciones" className="space-y-6 mt-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center justify-between">
                        <span>Observaciones</span>
                        <span className="text-xs font-normal text-gray-400">{comentarios.length} comentario(s)</span>
                      </h3>
                      <div className="space-y-4">
                        {/* Nuevo comentario */}
                        <div className="flex flex-col md:flex-row gap-2">
                          <Textarea
                            placeholder="Escribe un nuevo comentario / observación..."
                            value={nuevoComentario}
                            onChange={(e) => setNuevoComentario(e.target.value)}
                            className="flex-1"
                            rows={3}
                          />
                          <div className="flex md:flex-col gap-2">
                            <Button
                              type="button"
                              onClick={agregarComentario}
                              disabled={!nuevoComentario.trim()}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Agregar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setNuevoComentario("")}
                              disabled={!nuevoComentario}
                            >
                              Limpiar
                            </Button>
                          </div>
                        </div>

                        {/* Lista de comentarios */}
                        {comentarios.length === 0 ? (
                          <p className="text-sm text-gray-500">No hay comentarios todavía.</p>
                        ) : (
                          <ul className="space-y-3">
                            {comentarios.map((c) => (
                              <li
                                key={c.id}
                                className="group border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    {editandoComentarioId === c.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={textoEdicion}
                                          onChange={(e) => setTextoEdicion(e.target.value)}
                                          rows={3}
                                          className="w-full"
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={guardarEdicionComentario}
                                            disabled={!textoEdicion.trim()}
                                          >
                                            Guardar
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelarEdicionComentario}
                                          >
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-sm text-gray-900 whitespace-pre-line break-words">
                                          {c.texto}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                                          <span>{new Date(c.fecha).toLocaleString()}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {editandoComentarioId !== c.id && (
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => iniciarEdicionComentario(c.id)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7 hover:bg-red-50"
                                        onClick={() => eliminarComentario(c.id)}
                                      >
                                        <Trash2 className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* (La pestaña de subida se eliminó según requerimiento) */}
                </Tabs>
              </div>
            </div>
            {/* Barra Inferior de Acciones (izquierda) */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // cargar datos en formulario para edición
                    const op = operadores.find(
                      (o) => o.id === operadorDetalle.id
                    );
                    if (op) {
                      // replicar lógica de edición reutilizando código existente
                      setFormData({
                        nombre: op.nombre || "",
                        apellidos: op.apellidos || "",
                        alias: op.alias || "",
                        telefono: op.telefono || "",
                        email: op.email || "",
                        licencia: op.licencia || "",
                        numero_apto_medico: op.numero_apto_medico || "",
                        fecha_vencimiento_licencia:
                          op.fecha_vencimiento_licencia || "",
                        fecha_vencimiento_apto_medico:
                          op.fecha_vencimiento_apto_medico || "",
                        numero_visa: op.numero_visa || "",
                        fecha_vencimiento_visa:
                          op.fecha_vencimiento_visa || "",
                        numero_fast: op.numero_fast || "",
                        fecha_vencimiento_fast:
                          op.fecha_vencimiento_fast || "",
                        tipo_sangre: op.tipo_sangre || "",
                        direccion: op.direccion || "",
                        fecha_nacimiento: op.fecha_nacimiento || "",
                        curp: op.curp || "",
                        rfc: op.rfc || "",
                        nss: op.nss || "",
                        telefono_emergencia: (op as any).telefono_emergencia || "",
                        contactos_emergencia: op.contactos_emergencia
                          ? typeof op.contactos_emergencia === "string"
                            ? op.contactos_emergencia
                            : JSON.stringify(op.contactos_emergencia)
                          : "",
                        observaciones: op.observaciones || "",
                        estado: op.estado || "activo",
                      });
                      // contactos emergencia
                      try {
                        const contactosExistentes =
                          op.contactos_emergencia
                            ? typeof op.contactos_emergencia === "string"
                              ? JSON.parse(op.contactos_emergencia)
                              : op.contactos_emergencia
                            : [];
                        const base = [
                          { nombre: "", relacion: "", direccion: "", telefono: "", correo: "" },
                          { nombre: "", relacion: "", direccion: "", telefono: "", correo: "" },
                          { nombre: "", relacion: "", direccion: "", telefono: "", correo: "" },
                          { nombre: "", relacion: "", direccion: "", telefono: "", correo: "" },
                          { nombre: "", relacion: "", direccion: "", telefono: "", correo: "" },
                        ];
                        if (Array.isArray(contactosExistentes)) {
                          contactosExistentes.forEach((c, i) => {
                            if (i < 5) {
                              base[i] = {
                                nombre: c.nombre || "",
                                relacion: c.relacion || "",
                                direccion: c.direccion || "",
                                telefono: c.telefono || "",
                                correo: c.correo || c.email || "",
                              };
                            }
                          });
                        }
                        setContactosEmergencia(base);
                      } catch (e) {
                        console.error("Error contactos emergencia:", e);
                      }
                      setEditingId(op.id);
                      setShowDetailsModal(false);
                      setShowModal(true);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportOperadorToExcel(operadorDetalle)}
                >
                  Descargar Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Cerrar
                </Button>
              </div>
              <div className="text-xs text-gray-400">
                ID Operador: {operadorDetalle.id}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal rápido Ver Detalles */}
      {showQuickDetailsModal && operadorQuickDetalle && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[70vh] overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header alineado al modal principal */}
            <div className="flex justify-between items-start p-6 border-b bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" /> Detalles del Operador
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Vista rápida de la información registrada del operador.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowQuickDetailsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Contenido con Tabs igual estructura */}
            <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
              <div className="p-6 pt-4">
                <Tabs value={quickTab} onValueChange={setQuickTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="general" className="flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" /> General
                    </TabsTrigger>
                    <TabsTrigger value="contacto" className="flex items-center gap-1 text-xs">
                      <Contact className="h-3 w-3" /> Contacto
                    </TabsTrigger>
                    <TabsTrigger value="ids" className="flex items-center gap-1 text-xs">
                      <IdCard className="h-3 w-3" /> IDs
                    </TabsTrigger>
                    <TabsTrigger value="licencias" className="flex items-center gap-1 text-xs">
                      <Shield className="h-3 w-3" /> Licencias
                    </TabsTrigger>
                    <TabsTrigger value="fotos" className="flex items-center gap-1 text-xs">
                      <ImageIcon className="h-3 w-3" /> Fotos
                    </TabsTrigger>
                    <TabsTrigger value="emergencia" className="flex items-center gap-1 text-xs">
                      <Contact className="h-3 w-3" /> Emergencia
                    </TabsTrigger>
                    <TabsTrigger value="observaciones" className="flex items-center gap-1 text-xs">
                      <MessageSquare className="h-3 w-3" /> Obs
                    </TabsTrigger>
                  </TabsList>

                <TabsContent value="general" className="space-y-4 mt-6">
                  {/* Fila con los campos solicitados */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-start md:gap-10 gap-4">
                      <div className="min-w-[160px]">
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Nombre Completo</p>
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {operadorQuickDetalle.nombre} {operadorQuickDetalle.apellidos}
                        </p>
                      </div>
                      {operadorQuickDetalle.alias && (
                        <div className="min-w-[120px]">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Alias</p>
                          <p className="text-sm font-medium text-blue-600 leading-snug">"{operadorQuickDetalle.alias}"</p>
                        </div>
                      )}
                      <div className="min-w-[150px]">
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Fecha de Nacimiento</p>
                        <p className="text-sm leading-snug">{operadorQuickDetalle.fecha_nacimiento ? new Date(operadorQuickDetalle.fecha_nacimiento).toLocaleDateString() : '—'}</p>
                      </div>
                      <div className="min-w-[120px]">
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Tipo de Sangre</p>
                        <p className="text-sm leading-snug">{operadorQuickDetalle.tipo_sangre || '—'}</p>
                      </div>
                      <div className="min-w-[120px]">
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Estado</p>
                        <div className="mt-0.5">{getEstadoBadge(operadorQuickDetalle.estado)}</div>
                      </div>
                    </div>
                    {/* Dirección debajo sin marco */}
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Dirección</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {operadorQuickDetalle.direccion || '—'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacto" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Teléfono</dt>
                      <dd>{operadorQuickDetalle.telefono || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Email</dt>
                      <dd className="truncate">{operadorQuickDetalle.email || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">Contacto Emergencia (Resumen)</dt>
                      <dd className="text-xs text-gray-700">
                        {(() => {
                          try {
                            const lista = operadorQuickDetalle.contactos_emergencia ? (typeof operadorQuickDetalle.contactos_emergencia === 'string' ? JSON.parse(operadorQuickDetalle.contactos_emergencia) : operadorQuickDetalle.contactos_emergencia) : [];
                            if (!Array.isArray(lista) || lista.length === 0) return '—';
                            return lista.filter(Boolean).slice(0,2).map((c:any)=>c.nombre).join(', ') + (lista.length>2 ? '…' : '');
                          } catch { return '—'; }
                        })()}
                      </dd>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ids" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">CURP</dt>
                      <dd className="font-mono break-all text-xs">{operadorQuickDetalle.curp || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">RFC</dt>
                      <dd className="font-mono break-all text-xs">{operadorQuickDetalle.rfc || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 uppercase">NSS</dt>
                      <dd className="font-mono break-all text-xs">{operadorQuickDetalle.nss || '—'}</dd>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="licencias" className="space-y-4 mt-6 text-sm">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documentos y Vencimientos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                    <p className="text-sm">
                      <span className="font-semibold">Licencia:</span> {operadorQuickDetalle.licencia || '—'}
                      {operadorQuickDetalle.fecha_vencimiento_licencia && (
                        <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorQuickDetalle.fecha_vencimiento_licencia).toLocaleDateString()}</span>
                      )}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Apto Médico:</span> {operadorQuickDetalle.numero_apto_medico || '—'}
                      {operadorQuickDetalle.fecha_vencimiento_apto_medico && (
                        <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorQuickDetalle.fecha_vencimiento_apto_medico).toLocaleDateString()}</span>
                      )}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">FAST:</span> {operadorQuickDetalle.numero_fast || '—'}
                      {operadorQuickDetalle.fecha_vencimiento_fast && (
                        <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorQuickDetalle.fecha_vencimiento_fast).toLocaleDateString()}</span>
                      )}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Visa:</span> {operadorQuickDetalle.numero_visa || '—'}
                      {operadorQuickDetalle.fecha_vencimiento_visa && (
                        <span className="text-sm text-gray-500 ml-2">Vence {new Date(operadorQuickDetalle.fecha_vencimiento_visa).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="emergencia" className="space-y-6 mt-6 text-sm">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contactos de Emergencia</h4>
                  <div className="bg-gray-50 rounded border p-4 text-xs space-y-2">
                    {(() => {
                      try {
                        const lista = operadorQuickDetalle.contactos_emergencia ? (typeof operadorQuickDetalle.contactos_emergencia === 'string' ? JSON.parse(operadorQuickDetalle.contactos_emergencia) : operadorQuickDetalle.contactos_emergencia) : [];
                        if (!Array.isArray(lista) || lista.length === 0) return <p className="text-gray-500">Sin contactos registrados</p>;
                        return (
                          <ul className="list-disc ml-4 space-y-1">
                            {lista.filter(Boolean).map((c: any, i: number) => (
                              <li key={i} className="leading-snug">
                                <span className="font-medium">{c.nombre || '—'}</span>
                                {c.relacion && ` (${c.relacion})`} - {c.telefono || '—'} {c.correo && <span className="text-gray-500">• {c.correo}</span>}
                              </li>
                            ))}
                          </ul>
                        );
                      } catch (e) {
                        return <p className="text-red-500">Error leyendo contactos</p>;
                      }
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="fotos" className="space-y-6 mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Fotografías</h4>
                  {(() => {
                    const fotos = documentos.filter(d => d.operador_id === operadorQuickDetalle.id && (d.tipo_mime?.startsWith('image/') || d.tipo_documento === 'fotografia_operador'));
                    if (!fotos.length) return <p className="text-xs text-gray-500">Sin fotografías registradas</p>;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {fotos.map(f => (
                          <div key={f.id} className="border rounded-lg overflow-hidden group bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="aspect-square max-w-[200px] w-full mx-auto bg-gray-100 relative">
                              <img
                                src={f.url_blob || '/placeholder.svg'}
                                alt={f.nombre_archivo}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onClick={() => window.open(f.url_blob, '_blank')}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=No+image'; }}
                              />
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/30 flex items-center justify-center text-white text-xs transition-opacity">
                                Ver
                              </div>
                            </div>
                            <div className="p-2 space-y-1">
                              <p className="text-xs font-medium truncate">{f.nombre_archivo}</p>
                              <p className="text-xs text-gray-500">{new Date(f.fecha_subida).toLocaleDateString()}</p>
                              {f.tipo_documento === 'fotografia_operador' && (
                                <span className="inline-block bg-green-100 text-green-700 rounded px-1 py-px text-[10px] md:text-xs">Principal</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="observaciones" className="space-y-6 mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Observaciones</h4>
                  {operadorQuickDetalle.observaciones ? (
                    <p className="text-sm whitespace-pre-line bg-gray-50 border rounded p-4 text-gray-700">
                      {operadorQuickDetalle.observaciones}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">Sin observaciones</p>
                  )}
                </TabsContent>
                </Tabs>
              </div>
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportOperadorToExcel(operadorQuickDetalle)}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowQuickDetailsModal(false)}>Cerrar</Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setOperadorDetalle(operadorQuickDetalle);
                      setActiveTab('general');
                      setShowDetailsModal(true);
                      cargarDocumentosOperador(operadorQuickDetalle.id);
                      setShowQuickDetailsModal(false);
                    }}
                  >
                    Abrir Completo
                  </Button>
                </div>
                <span className="text-xs text-gray-400">ID: {operadorQuickDetalle.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
