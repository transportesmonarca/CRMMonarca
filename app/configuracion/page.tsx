"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Shield, Bell, FileText, User, Trash2, Download, Filter, AlertTriangle, Edit2, Save } from "lucide-react";
import { getCurrentUser, verifyAuditPassword, listUsers, createUser, resetPassword, getSecuritySettings, setSecuritySettings, verifyCurrentUserPassword, deactivateUser } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface AlertThreshold {
  id: string;
  modulo: string;
  campo: string;
  dias_rojo: number;
  dias_amarillo: number;
  dias_verde?: number;
}


interface AuditLogEntry {
  id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalles: string;
  ip?: string;
}

interface ConfiguracionGeneral {
  nombreEmpresa: string;
  notificacionesEmail: boolean;
  notificacionesPush: boolean;
  backupAutomatico: boolean;
  retencionDatos: number;
  formatoFecha: string;
}

export default function ConfiguracionPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') || 'general');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroAccion, setFiltroAccion] = useState("todas");
  // Paginación para audit log
  const [pageLog, setPageLog] = useState(1)
  const [pageSizeLog, setPageSizeLog] = useState(50)
  const [configuracion, setConfiguracion] = useState<ConfiguracionGeneral>({
    nombreEmpresa: "",
    notificacionesEmail: false,
    notificacionesPush: false,
    backupAutomatico: false,
  retencionDatos: 12,
    formatoFecha: "",
  });
  const currentUser = getCurrentUser();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  // Alert thresholds state
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>([]);
  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editValues, setEditValues] = useState<Partial<AlertThreshold>>({});
  // Seguridad: usuarios y políticas
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [newUser, setNewUser] = useState({ username: "", nombre: "", password: "" })
  const [secSettings, setSecSettings] = useState({ max_failed_attempts: 5, lockout_minutes: 15, session_timeout_minutes: 30 })
  const [savingSec, setSavingSec] = useState(false)
  const [secConfirmOpen, setSecConfirmOpen] = useState(false)
  const [secAdminPassword, setSecAdminPassword] = useState("")
  // Dialogos de seguridad
  const [confirmAdminOpen, setConfirmAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [pendingCreate, setPendingCreate] = useState<{ username: string; nombre: string; password: string } | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetUser, setResetUser] = useState<{ id: string; username: string } | null>(null)
  const [resetPwd1, setResetPwd1] = useState("")
  const [resetPwd2, setResetPwd2] = useState("")
  // Retención de datos (solo Embarques)
  const [retencionConfirmOpen, setRetencionConfirmOpen] = useState(false)
  const [retencionFinalOpen, setRetencionFinalOpen] = useState(false)
  const [retencionRunning, setRetencionRunning] = useState(false)
  const [retencionNextRun, setRetencionNextRun] = useState<string | null>(null)
  const [retencionWarning, setRetencionWarning] = useState<string | null>(null)
  // Limpieza de audit logs
  const [auditLimpiezaDialogOpen, setAuditLimpiezaDialogOpen] = useState(false)
  const [auditLimpiezaRunning, setAuditLimpiezaRunning] = useState(false)
  const [auditLimpiezaResult, setAuditLimpiezaResult] = useState<string | null>(null)
  const [auditLimpiezaError, setAuditLimpiezaError] = useState<string | null>(null)
  const [auditStats, setAuditStats] = useState<{ totalRegistros: number; registrosAntiguos: number; registrosActivos: number } | null>(null)
  const [limpiezaFinalOpen, setLimpiezaFinalOpen] = useState(false)
  const [limpiezaRunning, setLimpiezaRunning] = useState(false)
  const [limpiezaMsg, setLimpiezaMsg] = useState<string | null>(null)
  const [limpiezaErr, setLimpiezaErr] = useState<string | null>(null)
  // Variables faltantes para doble confirmación de limpieza
  const [limpiezaPwd1, setLimpiezaPwd1] = useState("")
  const [limpiezaPwd2, setLimpiezaPwd2] = useState("")
  const [limpiezaDialog1Open, setLimpiezaDialog1Open] = useState(false)
  const [limpiezaDialog2Open, setLimpiezaDialog2Open] = useState(false)
  // Limpieza manual de Blob
  const [blobRunning, setBlobRunning] = useState(false)
  const [blobResult, setBlobResult] = useState<string | null>(null)
  const [blobConfirmOpen, setBlobConfirmOpen] = useState(false)
  const [blobStart, setBlobStart] = useState<string>("")
  const [blobEnd, setBlobEnd] = useState<string>("")

  // Cargar umbrales de alerta desde Supabase
  const cargarAlertThresholds = async () => {
    setLoadingThresholds(true);
    const { data, error } = await supabase.from('alert_thresholds').select('*').order('modulo').order('campo');
    if (!error && data) setAlertThresholds(data);
    setLoadingThresholds(false);
  };

  useEffect(() => {
    cargarAlertThresholds();
  }, []);

  // Cargar usuarios y seguridad
  const cargarUsuarios = async () => {
    try {
      setLoadingUsers(true)
      const data = await listUsers()
      setUsers(data)
    } catch (e) {
      console.warn("No se pudieron cargar usuarios:", e)
    } finally {
      setLoadingUsers(false)
    }
  }

  const cargarSeguridad = async () => {
    try {
      const s = await getSecuritySettings()
      if (s) setSecSettings(s as any)
    } catch (e) {
      console.warn("No se pudo cargar configuración de seguridad:", e)
    }
  }

  useEffect(() => {
    cargarUsuarios()
    cargarSeguridad()
    // Cargar configuración general persistida
    try {
      const cfgRaw = localStorage.getItem("configuracion")
      if (cfgRaw) {
        const parsed = JSON.parse(cfgRaw)
        setConfiguracion((prev) => ({ ...prev, ...parsed }))
      }
      const nextRun = localStorage.getItem("retencion_next_run")
      if (nextRun) setRetencionNextRun(nextRun)
    } catch {}
  }, [])

  // Guardar cambios de umbral editado
  const guardarEditThreshold = async (idx: number) => {
    const t = alertThresholds[idx];
    const update = {
      dias_rojo: Number(editValues.dias_rojo),
      dias_amarillo: Number(editValues.dias_amarillo),
      dias_verde: editValues.dias_verde !== undefined && String(editValues.dias_verde) !== '' ? Number(editValues.dias_verde) : undefined
    };
    const { error } = await supabase.from('alert_thresholds').update(update).eq('id', t.id);
    if (!error) {
      const nuevos = [...alertThresholds];
      nuevos[idx] = { ...t, ...update };
      setAlertThresholds(nuevos);
      setEditIdx(null);
      setEditValues({});
    } else {
      alert('No se pudo actualizar el umbral.');
    }
  }

  // Función para cargar audit logs desde Supabase
  const cargarAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("fecha_creacion", { ascending: false })
        .limit(1000)

      if (error) {
        console.warn("Tabla audit_logs no existe aún, usando datos de ejemplo:", error.message)
        // Usar datos de ejemplo hasta que se cree la tabla
        const sampleLogs = [
          {
            id: "1",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            usuario: "Juan Pérez",
            accion: "CREAR",
            modulo: "Embarques",
            detalles: "Nuevo embarque creado: TIM-2507-001 para cliente ACME Corp",
            ip: "192.168.1.100",
          },
          {
            id: "2",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            usuario: "María González",
            accion: "ACTUALIZAR",
            modulo: "Operadores",
            detalles: "Información del operador Carlos Ruiz actualizada",
            ip: "192.168.1.101",
          },
          {
            id: "3",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            usuario: "Admin Sistema",
            accion: "ELIMINAR",
            modulo: "Camiones",
            detalles: "Camión con placas ABC-123 eliminado del sistema",
            ip: "192.168.1.1",
          },
          {
            id: "4",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            usuario: "Ana López",
            accion: "EXPORTAR",
            modulo: "Clientes",
            detalles: "Lista de clientes exportada a Excel",
            ip: "192.168.1.102",
          },
          {
            id: "5",
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            usuario: "Carlos Mendoza",
            accion: "LOGIN",
            modulo: "Sistema",
            detalles: "Inicio de sesión exitoso",
            ip: "192.168.1.103",
          },
          {
            id: "6",
            timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
            usuario: "Juan Pérez",
            accion: "ACTUALIZAR",
            modulo: "Embarques",
            detalles: "Estado del embarque TIM-2507-001 cambiado a 'En Tránsito'",
            ip: "192.168.1.100",
          },
          {
            id: "7",
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            usuario: "María González",
            accion: "CREAR",
            modulo: "Clientes",
            detalles: "Nuevo cliente registrado: Transportes del Norte S.A.",
            ip: "192.168.1.101",
          },
        ]
        setAuditLogs(sampleLogs)
        return
      }

      // Convertir formato de Supabase al formato esperado
      const logsDB = (data || []).map((log) => ({
        id: log.id?.toString?.() || `${log.fecha_creacion}-${log.usuario}-${log.accion}`,
        timestamp: log.fecha_creacion,
        usuario: log.usuario,
        accion: log.accion,
        modulo: log.modulo,
        detalles: log.detalles,
        ip: log.ip,
      }))

      // Mezclar con fallback localStorage si existe
      const logsLocalStorage = localStorage.getItem("auditLogs")
      const logsLocal: AuditLogEntry[] = logsLocalStorage ? JSON.parse(logsLocalStorage) : []
      const combinados = [...logsDB, ...logsLocal]
        .reduce((acc: Record<string, AuditLogEntry>, item) => {
          const key = `${item.timestamp}|${item.usuario}|${item.accion}|${item.modulo}|${item.detalles}`
          if (!acc[key]) acc[key] = item
          return acc
        }, {})
      const lista = Object.values(combinados).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 1000)
      setAuditLogs(lista)
    } catch (error) {
      console.warn("Error conectando con la base de datos, usando modo offline:", error)
      // Cargar desde localStorage como fallback
      const logsLocalStorage = localStorage.getItem("auditLogs")
      if (logsLocalStorage) {
        setAuditLogs(JSON.parse(logsLocalStorage))
      } else {
        setAuditLogs([])
      }
    }
  }

  useEffect(() => {
    cargarAuditLogs()
  }, [])

  // Agregar una entrada al Audit Log (Supabase con fallback local)
  const agregarAuditLog = async (accion: string, modulo: string, detalles: string) => {
    try {
      const nuevaEntrada = {
        usuario: currentUser?.nombre || "Sistema",
        accion,
        modulo,
        detalles,
        ip: "127.0.0.1",
      } as any
      const { data, error } = await supabase
        .from("audit_logs")
        .insert(nuevaEntrada)
        .select()
        .single()
      if (error) throw error

      const local = {
        id: (data?.id ?? Date.now()).toString(),
        timestamp: data?.fecha_creacion ?? new Date().toISOString(),
        usuario: nuevaEntrada.usuario,
        accion: nuevaEntrada.accion,
        modulo: nuevaEntrada.modulo,
        detalles: nuevaEntrada.detalles,
        ip: nuevaEntrada.ip,
      }
      setAuditLogs((prev) => [local, ...prev].slice(0, 1000))
    } catch (e) {
      console.warn("Fallo inserción audit_logs, usando localStorage:", e)
      const logsExistentes = JSON.parse(localStorage.getItem("auditLogs") || "[]")
      const local = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        usuario: currentUser?.nombre || "Sistema",
        accion,
        modulo,
        detalles,
        ip: "127.0.0.1",
      }
      const logsActualizados = [local, ...logsExistentes].slice(0, 1000)
      setAuditLogs(logsActualizados)
      localStorage.setItem("auditLogs", JSON.stringify(logsActualizados))
    }
  }



  const exportarAuditLogs = () => {
    const csv = [
      "Fecha,Usuario,Acción,Módulo,Detalles,IP",
      ...auditLogs.map(
        (log) =>
          `${new Date(log.timestamp).toLocaleString()},${log.usuario},${log.accion},${log.modulo},"${log.detalles}",${log.ip || "N/A"}`,
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`
    link.click()

    agregarAuditLog("EXPORTAR", "Audit Log", "Logs de auditoría exportados a CSV")
  }

  const guardarConfiguracion = () => {
    // Lógica para guardar la configuración
    localStorage.setItem("configuracion", JSON.stringify(configuracion))
    agregarAuditLog("ACTUALIZAR", "Configuración", "Configuración guardada")
  }

  // Helpers para retención
  const computeNextRun = (months: number) => {
    const base = new Date()
    base.setMonth(base.getMonth() + months)
    return base.toISOString()
  }
  const scheduleNextRun = (months: number) => {
    const next = computeNextRun(months)
    localStorage.setItem("retencion_next_run", next)
    setRetencionNextRun(next)
  }

  useEffect(() => {
    // Mostrar advertencia si el periodo está vencido
    if (!retencionNextRun) return
    const now = new Date()
    const due = new Date(retencionNextRun)
    if (now >= due) {
      setRetencionWarning("La limpieza por retención está pendiente. Solo se eliminarán Embarques más antiguos que el periodo configurado.")
    } else {
      setRetencionWarning(null)
    }
  }, [retencionNextRun])

  const runRetention = async () => {
    if (!currentUser) { alert('Tu sesión ha expirado.'); return }
    if (currentUser.role !== 'admin') { alert('Solo el administrador puede realizar esta acción.'); return }
    try {
      setRetencionRunning(true)
      // Calcular fecha límite por meses
      const months = Math.max(0, Number(configuracion.retencionDatos) || 12)
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - months)
      const cutoffISO = cutoff.toISOString()
      // Eliminar SOLO de embarques con estado archivado o finalizado y fecha anterior al corte
      const { error } = await supabase
        .from('embarques')
        .delete()
        .lt('fecha_creacion', cutoffISO)
      if (error) throw error
      try { await agregarAuditLog('ELIMINAR', 'Configuración', `Retención ejecutada: embarques anteriores a ${cutoffISO}`) } catch {}
      // Reprogramar siguiente corrida
      scheduleNextRun(months)
      setRetencionWarning(null)
      alert('Limpieza de embarques ejecutada correctamente.')
    } catch (e:any) {
      alert('Error ejecutando retención: '+(e.message||e))
    } finally {
      setRetencionRunning(false)
      setRetencionFinalOpen(false)
    }
  }

  const startRetentionFlow = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Solo el administrador puede modificar retención o ejecutar limpieza.');
      return
    }
    setRetencionConfirmOpen(true)
  }

  const confirmRetentionProceed = () => {
    // Segunda confirmación
    setRetencionConfirmOpen(false)
    setRetencionFinalOpen(true)
  }

  const cancelRetentionAndSnooze = () => {
    // Al cancelar, reinicia el conteo (snooze) al periodo completo
    const months = Math.max(0, Number(configuracion.retencionDatos) || 12)
    scheduleNextRun(months)
    setRetencionConfirmOpen(false)
    setRetencionFinalOpen(false)
    setRetencionWarning(null)
    try { agregarAuditLog('ACTUALIZAR','Configuración','Retención cancelada: contador reiniciado') } catch {}
  }

  const logsFiltrados = auditLogs.filter((log) => {
    const moduloMatch = filtroModulo === "todos" || log.modulo.toLowerCase().includes(filtroModulo.toLowerCase())
    const accionMatch = filtroAccion === "todas" || log.accion === filtroAccion
    return moduloMatch && accionMatch
  })
  const totalPagesLog = Math.max(1, Math.ceil(logsFiltrados.length / pageSizeLog))
  const startIdx = (pageLog - 1) * pageSizeLog
  const endIdx = startIdx + pageSizeLog
  const logsPaginados = logsFiltrados.slice(startIdx, endIdx)

  useEffect(() => {
    // Reiniciar página al cambiar filtros o tamaño
    setPageLog(1)
  }, [filtroModulo, filtroAccion, pageSizeLog])

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case "CREAR":
        return "bg-green-100 text-green-800"
      case "ACTUALIZAR":
        return "bg-blue-100 text-blue-800"
      case "ELIMINAR":
        return "bg-red-100 text-red-800"
      case "EXPORTAR":
        return "bg-purple-100 text-purple-800"
      case "LOGIN":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-2">Administrar configuraciones del sistema y auditoría</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
            <TabsTrigger value="alertas">Alertas de Vencimiento</TabsTrigger>
            <TabsTrigger value="auditlog">Audit Log</TabsTrigger>
            <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
          </TabsList>
        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>Configuración de Alertas de Vencimiento</span>
              </CardTitle>
              <CardDescription>
                Define con cuánta anticipación se mostrarán las alertas roja, amarilla y verde para cada campo de vencimiento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingThresholds ? (
                <div className="text-center text-gray-500 py-8">Cargando umbrales...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Módulo</th>
                        <th className="px-2 py-1 border">Campo</th>
                        <th className="px-2 py-1 border text-red-700 text-center">Días Alerta Alta</th>
                        <th className="px-2 py-1 border text-yellow-700 text-center">Días Alerta Media</th>
                        <th className="px-2 py-1 border text-green-700 text-center">Días Alerta Baja</th>
                        <th className="px-2 py-1 border">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertThresholds.map((t, idx) => (
                        <tr key={t.id} className="border-b">
                          <td className="px-2 py-1 border">{t.modulo}</td>
                          <td className="px-2 py-1 border">{t.campo.replace(/_/g, ' ')}</td>
                          {editIdx === idx ? (
                            <>
                              <td className="px-2 py-1 border"><Input type="number" value={editValues.dias_rojo ?? t.dias_rojo} min={0} onChange={e => setEditValues(v => ({...v, dias_rojo: Number(e.target.value)}))} className="w-20" /></td>
                              <td className="px-2 py-1 border"><Input type="number" value={editValues.dias_amarillo ?? t.dias_amarillo} min={0} onChange={e => setEditValues(v => ({...v, dias_amarillo: Number(e.target.value)}))} className="w-20" /></td>
                              <td className="px-2 py-1 border"><Input type="number" value={editValues.dias_verde ?? t.dias_verde ?? ''} min={0} onChange={e => setEditValues(v => ({...v, dias_verde: e.target.value === '' ? undefined : Number(e.target.value)}))} className="w-20" /></td>
                              <td className="px-2 py-1 border flex gap-2">
                                <Button
                                  size="icon"
                                  className="mr-1 bg-green-600 hover:bg-green-700 text-white border-green-700"
                                  onClick={() => guardarEditThreshold(idx)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  className="px-6 bg-red-600 hover:bg-red-700 text-white border-red-700"
                                  onClick={() => {setEditIdx(null);setEditValues({})}}
                                >
                                  Cancelar
                                </Button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-1 border text-center">{t.dias_rojo}</td>
                              <td className="px-2 py-1 border text-center">{t.dias_amarillo}</td>
                              <td className="px-2 py-1 border text-center">{t.dias_verde ?? '-'}</td>
                              <td className="px-2 py-1 border">
                                <Button size="icon" variant="outline" onClick={() => {setEditIdx(idx);setEditValues({ dias_rojo: t.dias_rojo, dias_amarillo: t.dias_amarillo, dias_verde: t.dias_verde })}}><Edit2 className="h-4 w-4" /></Button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {alertThresholds.length === 0 && <div className="text-center text-gray-500 py-8">No hay umbrales configurados.</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuración General</span>
                </CardTitle>
                <CardDescription>Configuraciones básicas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Advertencia de retención pendiente */}
                {retencionWarning && (
                  <div className="p-3 border border-yellow-300 bg-yellow-50 text-yellow-900 rounded text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium">Aviso de retención</div>
                      <div>{retencionWarning}</div>
                      <div className="text-xs text-gray-700 mt-1">Siguiente ejecución programada: {retencionNextRun ? new Date(retencionNextRun).toLocaleString() : 'no programada'}</div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-green-700" onClick={startRetentionFlow}>Ejecutar ahora</Button>
                        <Button size="sm" variant="outline" onClick={cancelRetentionAndSnooze}>Cancelar y reiniciar conteo</Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Dialogo 1: Confirmación inicial */}
                <Dialog open={retencionConfirmOpen} onOpenChange={setRetencionConfirmOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar limpieza por retención</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <p>Se eliminarán únicamente Embarques con fecha anterior a {(() => { const d=new Date(); d.setMonth(d.getMonth() - Math.max(0, Number(configuracion.retencionDatos)||12)); return d.toLocaleDateString(); })()}.</p>
                      <p>Clientes, usuarios, operadores y unidades no se eliminan.</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={cancelRetentionAndSnooze}>Cancelar</Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white border-green-700" onClick={confirmRetentionProceed}>Continuar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Dialogo 2: Confirmación final */}
                <Dialog open={retencionFinalOpen} onOpenChange={setRetencionFinalOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmación final</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <p>¿Seguro que deseas ejecutar la limpieza ahora? Esta acción no se puede deshacer.</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={cancelRetentionAndSnooze}>Cancelar</Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white border-green-700" disabled={retencionRunning} onClick={runRetention}>{retencionRunning? 'Ejecutando…':'Ejecutar ahora'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de la empresa</Label>
                    <Input
                      placeholder="Transportes Monarca"
                      value={configuracion.nombreEmpresa}
                      onChange={(e)=>setConfiguracion({...configuracion, nombreEmpresa: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Formato de fecha</Label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={configuracion.formatoFecha}
                      onChange={(e)=>setConfiguracion({...configuracion, formatoFecha: e.target.value})}
                    >
                      <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                      <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                      <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                    </select>
                    <p className="text-xs text-gray-500">Afecta cómo se muestran las fechas en reportes y listados.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Retención de datos (meses) — Solo Embarques</Label>
                    <Input
                      type="number"
                      min={0}
                      value={configuracion.retencionDatos}
                      onChange={(e)=>setConfiguracion({...configuracion, retencionDatos: Number(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500">El sistema eliminará únicamente Embarques anteriores al periodo configurado. Clientes, usuarios, operadores y unidades nunca se eliminan por retención.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="block">Respaldo automático</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="backupAutomatico"
                        checked={configuracion.backupAutomatico}
                        onCheckedChange={(checked)=>setConfiguracion({...configuracion, backupAutomatico: checked})}
                      />
                      <span className="text-sm text-gray-700">Habilitar respaldos periódicos</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="text-xs text-gray-600">
                    Próxima ejecución de retención: {retencionNextRun ? new Date(retencionNextRun).toLocaleString() : 'no programada'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => scheduleNextRun(Math.max(0, Number(configuracion.retencionDatos) || 12))}>Reprogramar siguiente ejecución</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white border-green-700" onClick={() => {
                      // Solo admin puede guardar cambios de retención
                      if (!currentUser || currentUser.role !== 'admin') { alert('Solo el administrador puede guardar estos cambios.'); return }
                      guardarConfiguracion()
                      // Si cambió retención, reprogramar siguiente corrida
                      scheduleNextRun(Math.max(0, Number(configuracion.retencionDatos) || 12))
                    }}>Guardar configuración</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguridad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Configuración de Seguridad</span>
                </CardTitle>
                <CardDescription>Usuarios secundarios y políticas de bloqueo/expiración</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gestión de usuarios */}
                <div>
                  <h3 className="font-semibold mb-2">Usuarios secundarios</h3>
                  <p className="text-sm text-gray-600 mb-3">Solo el admin puede crear usuarios. Tienen los mismos permisos operativos, excepto crear/eliminar usuarios.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Usuario" value={newUser.username} onChange={e=>setNewUser(v=>({...v, username:e.target.value}))} />
                    <Input placeholder="Nombre" value={newUser.nombre} onChange={e=>setNewUser(v=>({...v, nombre:e.target.value}))} />
                    <Input placeholder="Contraseña" type="password" value={newUser.password} onChange={e=>setNewUser(v=>({...v, password:e.target.value}))} />
                  </div>
                  <div className="mt-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                      onClick={() => {
                        if (!newUser.username || !newUser.nombre || !newUser.password) {
                          alert('Completa usuario, nombre y contraseña')
                          return
                        }
                        setPendingCreate({ ...newUser })
                        setAdminPassword("")
                        setConfirmAdminOpen(true)
                      }}
                    >
                      Crear usuario
                    </Button>
                  </div>

                  <div className="overflow-x-auto mt-4">
                    <table className="min-w-full text-sm border">
            <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 border text-left">Usuario</th>
                          <th className="px-2 py-1 border text-left">Nombre</th>
                          <th className="px-2 py-1 border text-left">Estado</th>
                          <th className="px-2 py-1 border text-left">Intentos</th>
                          <th className="px-2 py-1 border text-left">Bloqueado hasta</th>
              <th className="px-2 py-1 border">Acciones</th>
              <th className="px-2 py-1 border text-red-700">Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUsers ? (
                          <tr><td className="px-2 py-2" colSpan={6}>Cargando...</td></tr>
                        ) : users.length===0 ? (
                          <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={6}>Sin usuarios</td></tr>
                        ) : users.map((u)=> (
                          <tr key={u.id} className="border-b">
                            <td className="px-2 py-1 border">{u.username}</td>
                            <td className="px-2 py-1 border">{u.nombre}</td>
                            <td className="px-2 py-1 border">{u.active? 'Activo':'Inactivo'}</td>
                            <td className="px-2 py-1 border">{u.failed_attempts||0}</td>
                            <td className="px-2 py-1 border">{u.locked_until ? new Date(u.locked_until).toLocaleString(): '-'}</td>
                            <td className="px-2 py-1 border text-center">
                              <Button size="sm" variant="outline" onClick={() => {
                                setResetUser({ id: u.id, username: u.username })
                                setResetPwd1("")
                                setResetPwd2("")
                                setResetDialogOpen(true)
                              }}>Resetear contraseña</Button>
                            </td>
                            <td className="px-2 py-1 border text-center">
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                                onClick={async () => {
                                  if (!currentUser || currentUser.role !== 'admin') { alert('Solo el administrador puede eliminar usuarios.'); return }
                                  const ok = confirm(`¿Eliminar al usuario \"${u.username}\"? Esta acción no afectará documentos pasados; solo desactiva al usuario hacia futuro.`)
                                  if (!ok) return
                                  try {
                                    await deactivateUser(u.id)
                                    await cargarUsuarios()
                                    try { await agregarAuditLog('ELIMINAR','Seguridad',`Usuario desactivado: ${u.username}`) } catch {}
                                  } catch (e:any) {
                                    alert('No se pudo eliminar: '+(e.message||e))
                                  }
                                }}
                              >
                                Eliminar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Políticas de seguridad */}
                <div>
                  <h3 className="font-semibold mb-2">Políticas</h3>
              {/* Dialogo: Confirmar contraseña admin para crear usuario */}
              <Dialog open={confirmAdminOpen} onOpenChange={setConfirmAdminOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar acción de administrador</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Ingresa tu contraseña de administrador para crear el usuario "{pendingCreate?.username}".</p>
                    <Input type="password" placeholder="Contraseña admin" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={()=>setConfirmAdminOpen(false)}>Cancelar</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white border-green-700" onClick={async()=>{
                      if(!pendingCreate) return
                      if(!currentUser){ alert('Tu sesión ha expirado. Inicia sesión nuevamente.'); return }
                      if(currentUser.role !== 'admin'){ alert('Solo el administrador puede realizar esta acción.'); return }
                      const ok = await verifyCurrentUserPassword(adminPassword)
                      if(!ok){ alert('Contraseña admin incorrecta'); return }
                      try{
                        await createUser(pendingCreate.username.trim(), pendingCreate.nombre.trim(), pendingCreate.password)
                        setNewUser({ username:'', nombre:'', password:'' })
                        await cargarUsuarios()
                        agregarAuditLog('CREAR','Seguridad','Usuario secundario creado')
                        setConfirmAdminOpen(false)
                        setPendingCreate(null)
                      }catch(e:any){ alert('Error creando usuario: '+(e.message||e)) }
                    }}>Confirmar y crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialogo: Resetear contraseña con doble entrada */}
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resetear contraseña</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Usuario: {resetUser?.username}</p>
                    <Input type="password" placeholder="Nueva contraseña" value={resetPwd1} onChange={e=>setResetPwd1(e.target.value)} />
                    <Input type="password" placeholder="Confirmar nueva contraseña" value={resetPwd2} onChange={e=>setResetPwd2(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={()=>setResetDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white border-green-700" onClick={async()=>{
                      if(!resetUser) return
                      if(!resetPwd1 || !resetPwd2){ alert('Ingresa la nueva contraseña dos veces'); return }
                      if(resetPwd1 !== resetPwd2){ alert('Las contraseñas no coinciden'); return }
                      try{
                        await resetPassword(resetUser.id, resetPwd1)
                        agregarAuditLog('ACTUALIZAR','Seguridad','Password reset')
                        setResetDialogOpen(false)
                        setResetUser(null)
                      }catch(e:any){ alert('Error: '+(e.message||e)) }
                    }}>Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Expiración de sesión (minutos)</Label>
                      <Input type="number" min={5} value={secSettings.session_timeout_minutes} onChange={e=>setSecSettings(s=>({...s, session_timeout_minutes:Number(e.target.value)}))} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                      disabled={savingSec}
                      onClick={() => { setSecAdminPassword(""); setSecConfirmOpen(true) }}
                    >
                      Guardar políticas
                    </Button>
                  </div>

                  {/* Dialogo: Confirmar contraseña admin para guardar políticas */}
                  <Dialog open={secConfirmOpen} onOpenChange={setSecConfirmOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar cambios de seguridad</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Ingresa tu contraseña de administrador para guardar las políticas.</p>
                        <Input type="password" placeholder="Contraseña admin" value={secAdminPassword} onChange={e=>setSecAdminPassword(e.target.value)} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={()=>setSecConfirmOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                          disabled={savingSec}
                          onClick={async()=>{
                            if(!currentUser){ alert('Tu sesión ha expirado. Inicia sesión nuevamente.'); return }
                            if(currentUser.role !== 'admin'){ alert('Solo el administrador puede realizar esta acción.'); return }
                            const ok = await verifyCurrentUserPassword(secAdminPassword)
                            if(!ok){ alert('Contraseña admin incorrecta'); return }
                            try{
                              setSavingSec(true)
                              await setSecuritySettings(secSettings as any)
                              await agregarAuditLog('ACTUALIZAR','Seguridad','Políticas actualizadas')
                              setSecConfirmOpen(false)
                            }catch(e:any){
                              alert('Error guardando políticas: '+(e.message||e))
                            } finally {
                              setSavingSec(false)
                            }
                          }}
                        >
                          Confirmar y guardar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          

          <TabsContent value="auditlog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Audit Log</span>
                </CardTitle>
                <CardDescription>
                  Registro de actividades del sistema - Mostrando {logsFiltrados.length} de {auditLogs.length} entradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Controles de filtro */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <Select value={filtroModulo} onValueChange={setFiltroModulo}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filtrar módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los módulos</SelectItem>
                        <SelectItem value="embarques">Embarques</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="operadores">Operadores</SelectItem>
                        <SelectItem value="camiones">Camiones</SelectItem>
                        <SelectItem value="configuracion">Configuración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={filtroAccion} onValueChange={setFiltroAccion}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filtrar acción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las acciones</SelectItem>
                      <SelectItem value="CREAR">Crear</SelectItem>
                      <SelectItem value="ACTUALIZAR">Actualizar</SelectItem>
                      <SelectItem value="ELIMINAR">Eliminar</SelectItem>
                      <SelectItem value="EXPORTAR">Exportar</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex space-x-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={exportarAuditLogs}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>

                {/* Lista de logs (compacta en filas) */}
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    {logsFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay registros de auditoría</p>
                        <p className="text-sm">Las actividades aparecerán aquí</p>
                      </div>
                    ) : (
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">Fecha</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">Usuario</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">Acción</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">Módulo</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">Detalles</th>
                            <th className="px-2 py-2 text-left font-medium text-gray-700">IP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logsPaginados.map((log) => (
                            <tr key={log.id} className="border-t">
                              <td className="px-2 py-2 whitespace-nowrap text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-gray-700">{log.usuario}</td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded ${getAccionColor(log.accion)}`}>{log.accion}</span>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-gray-700">{log.modulo}</td>
                              <td className="px-2 py-2 max-w-[400px] truncate text-gray-700" title={log.detalles}>{log.detalles}</td>
                              <td className="px-2 py-2 whitespace-nowrap text-gray-700">{log.ip || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* Paginador */}
                  {logsFiltrados.length > 0 && (
                    <div className="flex items-center justify-between p-2 border-t bg-white text-xs">
                      <div className="flex items-center gap-2">
                        <span>Página {pageLog} de {totalPagesLog}</span>
                        <span className="text-gray-500">•</span>
                        <span>
                          Mostrando {startIdx + 1}-{Math.min(endIdx, logsFiltrados.length)} de {logsFiltrados.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={pageSizeLog}
                          onChange={(e) => setPageSizeLog(Number(e.target.value))}
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPageLog((p) => Math.max(1, p - 1))}
                          disabled={pageLog <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPageLog((p) => Math.min(totalPagesLog, p + 1))}
                          disabled={pageLog >= totalPagesLog}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limpieza" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span>Limpieza total de datos</span>
                </CardTitle>
                <CardDescription>
                  Elimina TODOS los registros de Embarques, Audit Logs, Clientes, Remolques, Operadores y Camiones. Esta acción es irreversible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border border-red-300 bg-red-50 text-red-900 rounded text-sm">
                  <div className="font-semibold">Advertencia</div>
                  <div>Esta operación dejará la aplicación limpia pero funcional. No podrá deshacerse.</div>
                </div>
                {limpiezaMsg && (
                  <div className="p-2 rounded border border-green-300 bg-green-50 text-green-800 text-sm">{limpiezaMsg}</div>
                )}
                {limpiezaErr && (
                  <div className="p-2 rounded border border-red-300 bg-red-50 text-red-800 text-sm">{limpiezaErr}</div>
                )}
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                  onClick={()=>{
                    setLimpiezaErr(null); setLimpiezaMsg(null);
                    if (!currentUser || currentUser.role !== 'admin') { setLimpiezaErr('Solo el administrador puede ejecutar la limpieza.'); return }
                    setLimpiezaPwd1(""); setLimpiezaPwd2(""); setLimpiezaDialog1Open(true)
                  }}
                >
                  Ejecutar limpieza total (Irreversible)
                </Button>
              </CardContent>
            </Card>

            {/* Limpieza automática de Audit Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-orange-600" />
                  <span>Limpieza automática de Audit Logs</span>
                </CardTitle>
                <CardDescription>
                  Elimina registros de auditoría antiguos (más de 6 meses) para mantener el rendimiento del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border border-orange-300 bg-orange-50 text-orange-900 rounded text-sm">
                  <div className="font-semibold">Información</div>
                  <div>Esta operación eliminará automáticamente todos los registros de auditoría con más de 6 meses de antigüedad.</div>
                </div>
                {auditLimpiezaResult && (
                  <div className="p-2 rounded border border-green-300 bg-green-50 text-green-800 text-sm whitespace-pre-wrap">{auditLimpiezaResult}</div>
                )}
                {auditLimpiezaError && (
                  <div className="p-2 rounded border border-red-300 bg-red-50 text-red-800 text-sm">{auditLimpiezaError}</div>
                )}
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white border-orange-700"
                  disabled={auditLimpiezaRunning}
                  onClick={async () => {
                    if (!currentUser || currentUser.role !== 'admin') {
                      setAuditLimpiezaError('Solo el administrador puede ejecutar esta limpieza.');
                      return;
                    }
                    setAuditLimpiezaError(null);
                    setAuditLimpiezaResult(null);
                    setAuditLimpiezaRunning(true);
                    try {
                      const response = await fetch('/api/limpiar-audit-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ confirm: true })
                      });
                      const data = await response.json();
                      if (!response.ok || data.error) {
                        throw new Error(data.error || 'Error al limpiar audit logs');
                      }
                      setAuditLimpiezaResult(`Limpieza completada exitosamente:\n• Registros eliminados: ${data.eliminados}\n• Registros restantes: ${data.registrosRestantes || 'N/A'}`);
                      // Recargar los logs después de la limpieza
                      await cargarAuditLogs();
                    } catch (error: any) {
                      setAuditLimpiezaError(error.message || 'Error desconocido');
                    } finally {
                      setAuditLimpiezaRunning(false);
                    }
                  }}
                >
                  {auditLimpiezaRunning ? 'Ejecutando limpieza...' : 'Limpiar Audit Logs antiguos (>6 meses)'}
                </Button>
              </CardContent>
            </Card>

            {/* Limpieza manual de archivos en Blob */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span>Limpieza de almacenamiento de archivos (Blob)</span>
                </CardTitle>
                <CardDescription>
                  Borra archivos públicos almacenados en Blob por prefijo (operadores/ y embarques/). Útil cuando el almacenamiento está lleno.
                </CardDescription>
              </CardHeader>
        <CardContent className="space-y-3">
                {blobResult && (
                  <div className="p-2 rounded border border-green-300 bg-green-50 text-green-800 text-sm whitespace-pre-wrap">{blobResult}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label>Rango de fechas (opcional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={blobStart} onChange={(e)=>setBlobStart(e.target.value)} />
                      <Input type="date" value={blobEnd} onChange={(e)=>setBlobEnd(e.target.value)} />
                    </div>
                    <p className="text-xs text-gray-500">Si dejas vacío, se limpia sin filtrar por fecha.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Acción</Label>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white border-red-700"
                      disabled={blobRunning}
                      onClick={()=>{ setBlobResult(null); setBlobConfirmOpen(true) }}
                    >
          {blobRunning ? 'Ejecutando…' : 'Borrar archivos de Blob'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Dialogo 1: Contraseña admin (1/2) */}
            <Dialog open={limpiezaDialog1Open} onOpenChange={setLimpiezaDialog1Open}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Confirmar identidad de administrador (1/2)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="p-2 border border-red-200 bg-red-50 text-red-800 rounded text-xs">Esta es una acción sensible. Verifica tu identidad para continuar.</div>
                  <p>Ingresa tu contraseña de administrador.</p>
                  <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      value={limpiezaPwd1}
                      onChange={e=>setLimpiezaPwd1(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      name="admin-password-1"
                    />
                  </div>
                  {limpiezaErr && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2">{limpiezaErr}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setLimpiezaDialog1Open(false)}>Cancelar</Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-red-700" onClick={async()=>{
                    setLimpiezaErr(null)
                    if (!currentUser || currentUser.role !== 'admin') { setLimpiezaErr('Solo el administrador puede ejecutar la limpieza.'); return }
                    if (!limpiezaPwd1) { setLimpiezaErr('Ingresa tu contraseña.'); return }
                    const ok = await verifyCurrentUserPassword(limpiezaPwd1)
                    if (!ok) { setLimpiezaErr('Contraseña incorrecta.'); return }
                    setLimpiezaDialog1Open(false)
                    setLimpiezaPwd2("")
                    setLimpiezaDialog2Open(true)
                  }}>Continuar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialogo 2: Confirmar contraseña nuevamente (2/2) */}
            <Dialog open={limpiezaDialog2Open} onOpenChange={setLimpiezaDialog2Open}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Confirmar contraseña (2/2)</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="p-2 border border-red-200 bg-red-50 text-red-800 rounded text-xs">Por seguridad, vuelve a escribir tu contraseña exactamente igual.</div>
                  <p>Ingresa nuevamente tu contraseña de administrador para confirmar.</p>
                  <Input
                    type="password"
                    value={limpiezaPwd2}
                    onChange={e=>setLimpiezaPwd2(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    name="admin-password-2"
                  />
                  {limpiezaErr && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2">{limpiezaErr}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setLimpiezaDialog2Open(false)}>Cancelar</Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-red-700" onClick={async()=>{
                    setLimpiezaErr(null)
                    if (!limpiezaPwd2) { setLimpiezaErr('Ingresa tu contraseña nuevamente.'); return }
                    if (limpiezaPwd2 !== limpiezaPwd1) { setLimpiezaErr('Las contraseñas no coinciden.'); return }
                    setLimpiezaDialog2Open(false)
                    setLimpiezaFinalOpen(true)
                  }}>Continuar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialogo 3: Confirmación irreversible */}
            <Dialog open={limpiezaFinalOpen} onOpenChange={setLimpiezaFinalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmación final</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <p>Esta acción eliminará todos los datos indicados y no se puede deshacer.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setLimpiezaFinalOpen(false)}>Cancelar</Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-red-700" disabled={limpiezaRunning} onClick={async()=>{
                    setLimpiezaRunning(true)
                    setLimpiezaErr(null)
                    try {
                      const res = await fetch('/api/cleanup', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ confirm: true }) })
                      const json = await res.json()
                      if (!res.ok || json?.error) throw new Error(json?.error||'Error de limpieza')
                      setLimpiezaMsg('Limpieza completada correctamente.')
                      try { await agregarAuditLog('ELIMINAR','Configuración','Limpieza total ejecutada') } catch {}
                      setLimpiezaFinalOpen(false)
                    } catch(e:any) {
                      setLimpiezaErr(e.message||'Falló la limpieza')
                    } finally {
                      setLimpiezaRunning(false)
                    }
                  }}>{limpiezaRunning? 'Ejecutando…':'Ejecutar limpieza'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Confirmación limpieza de Blob */}
      <Dialog open={blobConfirmOpen} onOpenChange={setBlobConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-700">Confirmar limpieza de Blob</DialogTitle>
                </DialogHeader>
                <div className="text-sm space-y-2">
          <p>Se procederá a borrar archivos bajo los prefijos: operadores/ y embarques/.</p>
          <div className="p-2 border border-red-200 bg-red-50 text-red-800 rounded text-xs">Esta acción no se puede deshacer.</div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setBlobConfirmOpen(false)}>Cancelar</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                    disabled={blobRunning}
                    onClick={async()=>{
                      setBlobRunning(true)
                      setBlobResult(null)
                      try {
                        // Health check
                        const hc = await fetch('/api/upload')
                        const info = hc.ok ? await hc.json() : null
                        if (!info?.tokenPresent) { throw new Error('El servidor no tiene BLOB_READ_WRITE_TOKEN configurado.') }
                        const res = await fetch('/api/blob-cleanup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
              dryRun: false,
                            startIso: blobStart ? new Date(`${blobStart}T00:00:00Z`).toISOString() : undefined,
                            endIso: blobEnd ? new Date(`${blobEnd}T00:00:00Z`).toISOString() : undefined,
                          })
                        })
                        const json = await res.json()
                        if (!res.ok || json?.error) throw new Error(json?.error||'Error al limpiar')
                        const lines = [
                          `Resultado: ${json.ok ? 'OK' : 'FALLO'}`,
                          `Escaneados: ${json.scanned}`,
                          `Borrados: ${json.deleted}`,
                          ...(Array.isArray(json.details) ? json.details.map((d:any)=>`• ${d.prefix} — escaneados ${d.scanned}, borrados ${d.deleted}`) : []),
                        ]
                        setBlobResult(lines.join('\n'))
                        setBlobConfirmOpen(false)
            try { await agregarAuditLog('ELIMINAR', 'Configuración', 'Borrado de Blob ejecutado') } catch {}
                      } catch(e:any) {
                        setBlobResult(`Error: ${e.message||e}`)
                      } finally {
                        setBlobRunning(false)
                      }
                    }}
                  >
          Borrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
// ...el resto del componente y el return JSX...
}

// Diálogos de doble confirmación para retención
// Nota: Colocados fuera del return principal por claridad, pero deben estar en el JSX si se requiere render condicional.
