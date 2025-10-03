"use client";

import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

import { DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Users,
  Truck,
  Package,
  Download,
  FileText,
  Edit,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Lock,
  LockOpen,
  Search,
  Calendar,
  MapPin,
  Coins,
  Eye,
  Trash,
  HelpCircle,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from 'next/navigation';
import * as XLSX from "xlsx";
import {
  supabase,
  obtenerEmbarquesModificadosIds,
  obtenerTiposServicio,
  TipoServicio,
  obtenerFotosEmbarque,
  type FotoEmbarque,
  type FacturaData,
  calcularPagoOperador,
  calcularPagoOperadorAsync,
  obtenerPrecioFleteFalso,
  actualizarPrecioFleteFalso,
  actualizarFleteFalsoEmbarque,
} from "@/lib/supabase";
import { agregarAuditLog } from "@/lib/audit";
import { formatDateMatamoros, normalizeDate } from '@/lib/date-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmbarqueAsignado {
  id: string;
  folio: string;
  clienteNombre: string;
  numeroLoad: string;
  direccionEnganche: string;
  fechaEnganche: string;
  horaEnganche: string;
  comentarios: string;
  observaciones?: string | null;
  operadorAsignado: { id: string; nombre: string };
  camionAsignado?: { id?: string; marca?: string; modelo?: string; numeroEconomico?: string };
  // Remolque relacionado (si existe) o captura manual
  remolque?: { numero_economico?: string; placas?: string };
  remolque_numero_economico?: string;
  remolque_placa?: string;
  fechaAsignacion?: string;
  estado?: string;
  montoFacturado?: number;
  fechaEntrega?: string;
  observacionesFacturacion?: string | null;
  pagado?: boolean;
  fechaPago?: string;
  moneda_flete?: "MXN" | "USD";
  modificadoPorEmergencia?: boolean;
  requiereAtencionEspecial?: boolean;
  alertaModificacion?: string;
  mensajeParaFacturacion?: string;
  fechaModificacionEmergencia?: string;
  usuarioModificacion?: string;
  motivoModificacion?: string;
  // Nuevos campos
  foliosFactura?: { folio1?: string; folio2?: string; folio3?: string; folio4?: string };
  cantidadFinalFacturada?: number | null;
  tipoServicio?: string;
  estado_facturacion?: "pendiente_facturacion" | "facturado" | "pagado" | "archivado";
  precioFlete?: number;
  tipo_servicio_id?: string;
  fechaArchivado?: string;
  usuarioArchivo?: string;
  
  // Nuevos campos JSON para facturación consolidada
  facturas_json?: FacturaData[];

  // Campos y aliases que pueden venir del backend (snake_case)
  precio_flete?: number;
  direccion_recolecta?: string;
  direccion_entrega?: string;
  carta_porte?: string;
  cliente_id?: string;
  load_number?: string;
  // Nota: folio_factura_1-4 eliminadas - usar facturas_json
  observaciones_facturacion?: string | null;

  // Backend snake_case aliases used throughout the file (single declarations)
  cantidad_final_facturada?: number | null;
  fecha_envio_cliente?: string;
  fecha_pago?: string;
  referencia_pago?: string;

  // camelCase friendly aliases used in UI
  fechaEnvioCliente?: string;
  referenciaPago?: string;

  // Convenience alias used in UI
  direccionRecolecta?: string;

  // QuickPaid
  quickpaid_enabled?: boolean;
  quickpaid_percent?: number;
  quickpaid_descuento?: number;
  precio_quickpaid?: number;

  // Contingency / other operational fields
  representante_cliente?: string;
  info_representante?: any;
  operadorOriginalId?: string;
  operadorOriginalNombre?: string;
  operadorReemplazoId?: string;
  operadorReemplazoNombre?: string;
  montoOriginalContingencia?: number;
  montoReemplazoContingencia?: number;
  pagoOperador?: number;
  tipoServicioNombre?: string;
  peso?: number | string;
  updated_at?: string;
  fecha_creacion?: string;
}

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

const obtenerMontoTipoServicio = (tipo?: Partial<TipoServicio> | null, embarque?: any): number => {
  // 🎯 FUENTE ÚNICA: Si hay embarque, SIEMPRE usar embarques.pago_operador
  if (embarque && typeof embarque.pago_operador === 'number') {
    return embarque.pago_operador;
  }
  
  // Fallback para casos donde solo se pasa el tipo (compatibilidad)
  if (!tipo) return 0;
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

const encontrarTipoFleteFalso = (
  tipos?: Array<Partial<TipoServicio>> | null,
): Partial<TipoServicio> | undefined => {
  return (tipos || []).find((tipo) => esTipoServicioFleteFalso(tipo));
};

const ModificacionesHistory = ({ embarqueId }: { embarqueId: string }) => {
  const [modificaciones, setModificaciones] = useState<any[]>([]);
  const [loadingMods, setLoadingMods] = useState(true);
  const mounted = useRef(true);
  

  useEffect(() => {
    mounted.current = true;
    const cargarModificaciones = async () => {
      try {
        const { data, error } = await supabase
          .from("embarque_modificaciones")
          .select("*")
          .eq("embarque_id", embarqueId)
          .order("fecha_modificacion", { ascending: false });

        if (error) {
          console.error("Error cargando modificaciones:", error);
          if (mounted.current) setModificaciones([]);
        } else {
          if (mounted.current) setModificaciones(data || []);
        }
      } catch (error) {
        console.error("Error:", error);
        if (mounted.current) setModificaciones([]);
      } finally {
        if (mounted.current) setLoadingMods(false);
      }
    };

    cargarModificaciones();

    return () => {
      mounted.current = false;
    };
  }, [embarqueId]);

  if (loadingMods) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
        <span className="ml-2 text-sm text-gray-600">
          Cargando historial de modificaciones...
        </span>
      </div>
    );
  }

  if (modificaciones.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">
              Sin modificaciones registradas
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Este embarque no ha sido modificado desde su asignación original.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {modificaciones.map((mod, index) => (
        <Card key={mod.id || index} className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {modificaciones.length - index}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base text-gray-800">
                    Modificación #{modificaciones.length - index}
                  </CardTitle>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(mod.fecha_modificacion).toLocaleDateString(
                      "es-MX",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-600 border-gray-300"
              >
                {mod.usuario_modificacion || "Sistema"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Justificación */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Justificación
              </h4>
              <p className="text-sm text-gray-700">
                {mod.razon || "Sin justificación registrada"}
              </p>
            </div>

            {/* Cambios realizados */}
            <div className="space-y-3">
              {/* Cambio de Operador */}
              {(mod.operador_original_nombre || mod.operador_nuevo_nombre) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Operador Anterior
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border">
                        {mod.operador_original_nombre || "No especificado"}
                      </p>
                      {mod.sueldo_operador_original && (
                        <p className="text-xs text-gray-600 mt-1">
                          Sueldo: ${mod.sueldo_operador_original}{" "}
                          {mod.moneda_sueldo_operador_original || "MXN"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Operador Nuevo
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border font-medium">
                        {mod.operador_nuevo_nombre || "No especificado"}
                      </p>
                      {mod.sueldo_operador_nuevo && (
                        <p className="text-xs text-gray-600 mt-1">
                          Sueldo: ${mod.sueldo_operador_nuevo}{" "}
                          {mod.moneda_sueldo_operador_nuevo || "MXN"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cambio de Tractocamión */}
              {(mod.camion_original_numero || mod.camion_nuevo_numero) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Tractocamión Anterior
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border font-mono">
                        {mod.camion_original_numero || "No especificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Tractocamión Nuevo
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border font-mono font-medium">
                        {mod.camion_nuevo_numero || "No especificado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cambio de Remolque */}
              {(mod.remolque_original_numero || mod.remolque_nuevo_numero) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Remolque Anterior
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border font-mono">
                        {mod.remolque_original_numero || "No especificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Remolque Nuevo
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded border font-mono font-medium">
                        {mod.remolque_nuevo_numero || "No especificado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cambio de Precio de Flete */}
              {(mod.precio_flete_original || mod.precio_flete_nuevo) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Precio Anterior
                      </p>
                      <p className="text-lg font-bold text-gray-800 bg-gray-100 p-2 rounded border">
                        {mod.precio_flete_original
                          ? `$${mod.precio_flete_original.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${
                              mod.moneda_flete_original || "MXN"
                            }`
                          : "No especificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Precio Nuevo
                      </p>
                      <p className="text-lg font-bold text-gray-800 bg-gray-100 p-2 rounded border-2 border-gray-400">
                        {mod.precio_flete_nuevo
                          ? `$${mod.precio_flete_nuevo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${
                              mod.moneda_flete_nueva || "MXN"
                            }`
                          : "No especificado"}
                      </p>
                    </div>
                  </div>
                  {mod.flete_en_falso && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded p-2" role="alert" aria-live="polite">
                      <p className="text-sm text-red-800 font-semibold flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                        Marcado como flete en falso
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Información de auditoría */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>ID de Registro: {mod.id?.slice(-8) || "N/A"}</span>
                <span>Modificación por emergencia/contingencia</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// --- Modal y lógica para actualizar precio manualmente ---
const UpdatePriceModal = ({
  open,
  onOpenChange,
  embarque,
  initialRazon,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  embarque: any | null;
  initialRazon?: string | null;
}) => {
  const [precio, setPrecio] = useState<string>("");
  const [moneda, setMoneda] = useState<string>("MXN");
  const [razon, setRazon] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (embarque) {
      // Prefer mostrar/editar el precio_flete. Si no existe, caer a precio_quickpaid como respaldo.
      const base = embarque.precio_flete ?? embarque.precio_quickpaid ?? '';
      const currentMoneda = embarque.moneda_flete || 'MXN';
      
      setPrecio(base !== null && base !== undefined ? String(base) : '');
      setMoneda(currentMoneda);
      setRazon(initialRazon ?? '');
    }
  }, [embarque, initialRazon]);

  const submit = async () => {
    if (!embarque) return;
    
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      toast({ title: 'Ingresa un precio válido mayor a 0', variant: 'default' });
      return;
    }
    
    if (!moneda || !['MXN', 'USD'].includes(moneda)) {
      toast({ title: 'Selecciona una moneda válida', variant: 'default' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/embarques/actualizar-precio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          embarque_id: embarque.id, 
          precio: Number(precio), 
          moneda: moneda,
          razon 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || 'Error');
      
      onOpenChange(false);
      // refrescar la página o datos locales
      try { router.refresh(); } catch {}
      toast({ 
        title: 'Precio y moneda actualizados exitosamente', 
        description: `Nuevo precio: $${Number(precio).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`,
        variant: 'default' 
      });
    } catch (error: any) {
      console.error('Error actualizando precio:', error);
      toast({ title: 'Error actualizando precio', description: error?.message || String(error), variant: 'default' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Actualizar Precio y Moneda del Flete</DialogTitle>
          <DialogDescription>
            Modifica el monto del flete y selecciona la moneda. Esta acción quedará registrada en el historial del embarque.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {embarque && (
            <div className="bg-gray-50 p-3 rounded-lg border">
              <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                Embarque: {embarque.folio}
                {esFleteFalso(embarque) && (
                  <span 
                    className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                    title="Este embarque está marcado como flete en falso (contingencia)"
                  >
                    Flete F.
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Cliente: {embarque.clienteNombre || 'N/A'}</div>
                <div>Load: {embarque.load_number || 'N/A'}</div>
                <div>Precio actual: ${Number(embarque.precio_flete || embarque.precio_quickpaid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {embarque.moneda_flete || 'MXN'}</div>
                <div>Fecha: {embarque.fechaAsignacion ? new Date(embarque.fechaAsignacion).toLocaleDateString('es-MX') : 'N/A'}</div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="precio" className="text-sm font-medium">Nuevo Monto</Label>
              <Input 
                id="precio"
                type="number" 
                placeholder="0.00"
                min="0"
                step="0.01"
                value={precio} 
                onChange={(e) => setPrecio(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="moneda" className="text-sm font-medium">Moneda</Label>
              <select
                id="moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MXN">MXN - Pesos Mexicanos</option>
                <option value="USD">USD - Dólares Americanos</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="razon" className="text-sm font-medium">Justificación (opcional)</Label>
            <textarea
              id="razon"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              placeholder="Describe el motivo del cambio de precio..."
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              rows={3}
            />
          </div>
          
          {precio && moneda && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800">Vista previa:</div>
              <div className="text-lg font-bold text-blue-900">
                ${Number(precio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {moneda}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !precio || isNaN(Number(precio))}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Actualizar Precio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function FacturacionCobranzaPage() {
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [selectedEmbarqueForUpdate, setSelectedEmbarqueForUpdate] = useState<any | null>(null);
  const [showJustificacionPrompt, setShowJustificacionPrompt] = useState(false);
  const [justificacionDraft, setJustificacionDraft] = useState('');
  const [initialRazonForModal, setInitialRazonForModal] = useState<string | null>(null);
  const mounted = useRef(true);
  // Helper: mostrar nombre legible de la moneda en la UI
  const monedaNombre = (code?: string) => (code === "USD" ? "Dólares Americanos" : "Pesos Mexicanos");

  // Estado para límites de crédito por cliente (usd/mxn) y estado UI por fila (candado, valores como strings)
  const [creditLimits, setCreditLimits] = useState<Record<string, { usd: number; mxn: number }>>({});
  const [creditRowState, setCreditRowState] = useState<Record<string, { locked?: boolean; usd?: string; mxn?: string }>>({});

  // Guardar ambos límites (USD + MXN) en una sola operación (upsert-like) y actualizar cache local
  const saveCreditLimits = async (clienteId: string, usd: number, mxn: number) => {
    const currentLimits = creditLimits[clienteId] || { usd: 0, mxn: 0 };
    const newLimits = {
      ...creditLimits,
      [clienteId]: {
        ...currentLimits,
        usd: Number(usd) || 0,
        mxn: Number(mxn) || 0,
      },
    };
    if (mounted.current) setCreditLimits(newLimits);
    try {
      localStorage.setItem("creditLimits", JSON.stringify(newLimits));
    } catch (e) {
      // ignore localStorage errors in private mode
    }

    try {
      const { data: existingRecord, error: selectError } = await supabase
        .from("creditos_clientes")
        .select("id")
        .eq("cliente_id", clienteId)
        .single();

      if (selectError && (selectError as any)?.code !== "PGRST116") {
        console.error("Error checking existing credit limit:", selectError);
      }

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("creditos_clientes")
          .update({
            limite_credito_usd: newLimits[clienteId].usd,
            limite_credito_mxn: newLimits[clienteId].mxn,
            updated_at: new Date().toISOString(),
          })
          .eq("cliente_id", clienteId);

        if (updateError) console.error("Error updating credit limits:", updateError);
      } else {
        const { error: insertError } = await supabase
          .from("creditos_clientes")
          .insert({
            cliente_id: clienteId,
            limite_credito_usd: newLimits[clienteId].usd,
            limite_credito_mxn: newLimits[clienteId].mxn,
            activo: true,
          });

        if (insertError) console.error("Error inserting credit limits:", insertError);
      }
    } catch (error) {
      console.error("Error saving credit limits to database:", error);
    }
  };

  // Detectar si un embarque fue cancelado por otras áreas (Asignación / creación)
  const esCancelado = (emb: any) => {
    if (!emb) return false;
    // Normalizar campos que pueden contener marcas de cancelación
    const estado = (emb.estado || emb.estado_facturacion || "").toString().toLowerCase();
    const obsCandidates = [
      emb.observaciones,
      emb.observaciones_facturacion,
      emb.observacionesFacturacion,
      emb.motivo_cancelacion,
      emb.motivoCancelacion,
    ]
      .filter(Boolean)
      .map((s: any) => s?.toString?.() || "")
      .join(" ")
      .toUpperCase();

    const hasCancelDate = Boolean(emb.fecha_cancelacion || emb.fechaCancelacion || emb.cancelado_en);
    const hasCancelBy = Boolean(emb.cancelado_por || emb.canceladoPor || emb.cancelado_por_nombre);

    // Buscar palabras clave comunes
    const containsCancelKeyword = /CANCELA|CANCELADO|CANCELACIÓN|CANCELLED|CANCEL/.test(obsCandidates);

    return Boolean(
      estado.includes('cancel') ||
      estado === 'cancelado' ||
      hasCancelDate ||
      hasCancelBy ||
      containsCancelKeyword
    );
  };

  const [contingencyPaymentsDb, setContingencyPaymentsDb] = useState<{
    [embarqueId: string]: {
      monto_original: number;
      monto_reemplazo: number;
      operador_original_id: string;
      operador_reemplazo_id: string;
    };
  }>({});
  const [embarquesModificadosIds, setEmbarquesModificadosIds] = useState<
    string[]
  >([]);
  // IDs de embarques archivados para ocultarlos en la lista principal
  const [archivadosIds, setArchivadosIds] = useState<string[]>([]);

  // Confirmation dialog for archiving an embarque (replace window.confirm)
  const [embarqueAArchivar, setEmbarqueAArchivar] = useState<EmbarqueAsignado | null>(null);
  const [showConfirmArchivarDialog, setShowConfirmArchivarDialog] = useState(false);
  const [embarqueACancelar, setEmbarqueACancelar] = useState<EmbarqueAsignado | null>(null);
  const [showConfirmCancelarDialog, setShowConfirmCancelarDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelingEmbarque, setCancelingEmbarque] = useState(false);
  // Confirmation dialog for permanent deletion of an archived embarque
  const [embarqueAEliminar, setEmbarqueAEliminar] = useState<EmbarqueAsignado | null>(null);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);

  const [loadingEmbarques, setLoadingEmbarques] = useState(true);
  const [loadingTiposServicio, setLoadingTiposServicio] = useState(true);

  useEffect(() => {
    mounted.current = true;
    obtenerEmbarquesModificadosIds().then((ids) => {
      if (mounted.current) setEmbarquesModificadosIds(ids);
    });
    // Cargar IDs archivados para excluirlos
    (async () => {
      try {
        const { data, error } = await supabase
          .from("embarques")
          .select("id")
          .eq("estado_facturacion", "archivado");
        if (!error && mounted.current) {
          const ids = (data || []).map((r: any) => r.id);
          setArchivadosIds(Array.from(new Set(ids)));
        }
      } catch (e) {
        console.error("Error cargando IDs de archivados:", e);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const [showAnalisisOperadoresModal, setShowAnalisisOperadoresModal] =
    useState(false);
  const [analisisData, setAnalisisData] = useState<any>({
    analisisPorOperador: [],
    embarquesFiltradosAnalisis: [],
    resumenGeneral: null,
  });
  const [filtroAnalisisOperador, setFiltroAnalisisOperador] = useState("todos");
  const [fechaInicioAnalisis, setFechaInicioAnalisis] = useState("");
  const [fechaFinAnalisis, setFechaFinAnalisis] = useState("");
  const [activeAnalisisTab, setActiveAnalisisTab] = useState("porOperador");
  // Paginación para la sección "Por Operador"
  const [itemsPerPageAnalisisOp, setItemsPerPageAnalisisOp] = useState(10);
  const [currentPageAnalisisOp, setCurrentPageAnalisisOp] = useState(1);
  // Paginación para la sección "Detalle"
  const [itemsPerPageAnalisisDetalle, setItemsPerPageAnalisisDetalle] =
    useState(5);
  const [currentPageAnalisisDetalle, setCurrentPageAnalisisDetalle] =
    useState(1);
  // Ayuda modal para Casos de Contingencia
  const [showContingenciaInfo, setShowContingenciaInfo] = useState(false);
  const [operadoresContingencia, setOperadoresContingencia] = useState<{
    [key: string]: { original: number; reemplazo: number };
  }>({});
  const [operadoresContingenciaData, setOperadoresContingenciaData] = useState<{
    [key: string]: { original: any; reemplazo: any };
  }>({});
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [analisisError, setAnalisisError] = useState<string | null>(null);
  const [debugAnalisis, setDebugAnalisis] = useState<any | null>(null);

  

  // Operadores únicos basados en el resultado del análisis (incluye original y reemplazo)
  const operadoresUnicosAnalisis = useMemo(() => {
    const nombres = new Set<string>();
    (analisisData?.embarquesFiltradosAnalisis || []).forEach((e: any) => {
  const asignado = (e?.operadorAsignado?.nombre || "").toString().trim();
  const original = (e?.operadorOriginalNombre || e?.operadorOriginal || "").toString().trim();
  const reemplazo = (e?.operadorReemplazoNombre || "").toString().trim();
  if (asignado) nombres.add(asignado);
  if (original) nombres.add(original);
  if (reemplazo) nombres.add(reemplazo);
    });
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [analisisData?.embarquesFiltradosAnalisis]);

  // Lista completa de operadores (activos e inactivos) para mostrar siempre en el select
  const [todosOperadores, setTodosOperadores] = useState<Array<{ id: string; nombre: string; apellidos?: string; estado?: string }>>([]);

  useEffect(() => {
    let mountedLocal = true;
    if (showAnalisisOperadoresModal) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('operadores')
            .select('id, nombre, apellidos, estado')
            .order('nombre', { ascending: true });
          if (!error && mountedLocal) {
            setTodosOperadores(data || []);
          } else if (error) {
            console.error('Error cargando todos los operadores:', error);
          }
        } catch (e) {
          console.error('Excepción cargando operadores:', e);
        }
      })();
    }
    return () => {
      mountedLocal = false;
    };
  }, [showAnalisisOperadoresModal]);

  const [showPagosOperadoresModal, setShowPagosOperadoresModal] =
    useState(false);
  const [filtroPagosOperadorId, setFiltroPagosOperadorId] = useState("todos");
  const [fechaInicioPagos, setFechaInicioPagos] = useState("");
  const [fechaFinPagos, setFechaFinPagos] = useState("");
  const [embarquesOperadorFiltrados, setEmbarquesOperadorFiltrados] = useState<
    EmbarqueAsignado[]
  >([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [activePagosTab, setActivePagosTab] = useState("detalle");
  const [filtroPeriodoPagos, setFiltroPeriodoPagos] = useState("custom");
  const [periodoAnalisis, setPeriodoAnalisis] = useState("año");

  const setPeriodoActual = (tipo: string) => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date;

    switch (tipo) {
      case "mes":
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        break;
      case "mes_anterior":
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        break;
      case "dos_meses_atras":
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        fin = hoy;
        break;
      case "tres_meses_atras":
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
        fin = hoy;
        break;
      case "seis_meses_atras":
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
        fin = hoy;
        break;
      case "un_ano_atras":
        inicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
        fin = hoy;
        break;
      case "año":
        inicio = new Date(hoy.getFullYear(), 0, 1);
        fin = new Date(hoy.getFullYear(), 11, 31);
        break;
      default:
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = hoy;
    }

    setFechaInicioAnalisis(inicio.toISOString().slice(0, 10));
    setFechaFinAnalisis(fin.toISOString().slice(0, 10));
  };

  // UX: Prefijar rango de fechas al abrir el modal (sin generar análisis automáticamente)
  useEffect(() => {
    if (showAnalisisOperadoresModal) {
      if (!fechaInicioAnalisis || !fechaFinAnalisis) {
        setPeriodoActual(periodoAnalisis || "mes");
      }
      // No generar análisis automáticamente - esperar a que el usuario presione "Analizar"
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnalisisOperadoresModal]);

  // useEffect eliminado - no generar análisis automáticamente, esperar a que el usuario presione "Analizar"

  const generarAnalisisOperadores = async () => {
    // Validación: exigir rango de fechas para evitar consultas demasiado amplias
    if (!fechaInicioAnalisis || !fechaFinAnalisis) {
      setAnalisisError("Selecciona un rango de fechas (Desde y Hasta) o elige un periodo.");
      return;
    }
    if (new Date(fechaInicioAnalisis) > new Date(fechaFinAnalisis)) {
      setAnalisisError("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
      return;
    }
    setAnalisisError(null);
    setLoadingAnalisis(true);
    try {
      // Helper: normalizar nombres (quita acentos, lower, colapsa espacios)
      const normalizeName = (s?: any) => {
        if (!s && s !== 0) return "";
        try {
          return String(s)
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        } catch (e) {
          return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
        }
      };
      const fechaInicio = new Date(fechaInicioAnalisis);
      const fechaFin = new Date(fechaFinAnalisis);
      fechaFin.setHours(23, 59, 59, 999);

      // Combinar embarques de Facturación/Cobranza y de Asignación, deduplicar por id
      const fuenteCombinada = [
        ...(embarquesAnaliticos || []),
        ...(embarquesAsignados || []),
      ];
      const uniqueByIdMap: Record<string, any> = {};
      for (const e of fuenteCombinada) {
        if (!e) continue;
  const id = String((e as any).id || "");
        if (!id) continue;
        // Preferir la primera aparición (embarquesAnaliticos viene primero en la lista)
        if (!uniqueByIdMap[id]) uniqueByIdMap[id] = e;
      }
      const todosEmbarques = Object.values(uniqueByIdMap);

      // Preparar datos de depuración en UI
      let debugData: any = { todosEmbarquesCount: 0, todosEmbarquesSample: [], foundTimAll: false, embarquesFiltradosCount: 0, embarquesFiltradosSample: [], foundTimFiltered: false };
      try {
        debugData.todosEmbarquesCount = (todosEmbarques || []).length;
        debugData.todosEmbarquesSample = (todosEmbarques || []).slice(0, 10).map((x: any) => ({ id: x.id, folio: x.folio || '', operador: x.operadorAsignado?.nombre || '', operadorOriginal: x.operadorOriginalNombre || x.operadorOriginal || '' }));
        debugData.foundTimAll = (todosEmbarques || []).some((x: any) => String(x.folio || '').toLowerCase().includes('tim-2509-010') || String(x.folio || '').toLowerCase().includes('2509-010'));
      } catch (e) {
        // ignore
      }

      // Filtrar por rango de fechas, excluir archivados y asegurarse de que tengan operador asignado
      // Nota: sólo incluimos embarques cancelados si ya tenían un operador (asignado u original).
      const embarquesFiltrados = (todosEmbarques || []).filter((embarque: any) => {
        const fechaEmbarque = new Date(embarque.fecha_creacion || embarque.fechaAsignacion || embarque.created_at || "");
        const coincideFecha = fechaEmbarque >= fechaInicio && fechaEmbarque <= fechaFin;
        const noArchivado = embarque.estado_facturacion !== "archivado";
        const tieneOperador = !!(
          embarque.operadorAsignado?.id ||
          embarque.operadorAsignado?.nombre ||
          embarque.operador_original_id ||
          embarque.operador_original_nombre
        );
        // Si fue cancelado pero no tenía operador, NO lo incluimos (se mostrará como "Sin Asignar - Cancelados" en otras vistas).
        // Sólo permitimos el registro si tiene operador (asignado o por modificaciones).
        return coincideFecha && noArchivado && tieneOperador;
      });

      // Rellenar debugData con los embarques filtrados
      try {
        debugData.embarquesFiltradosCount = (embarquesFiltrados || []).length;
        debugData.embarquesFiltradosSample = (embarquesFiltrados || []).map((x: any) => ({ id: x.id, folio: x.folio || '', estado_facturacion: x.estado_facturacion || x.estado || '', operadorAsignado: x.operadorAsignado?.nombre || '', operadorOriginalNombre: x.operadorOriginalNombre || x.operadorOriginal || '' })).slice(0, 40);
        debugData.foundTimFiltered = (embarquesFiltrados || []).some((x: any) => String(x.folio || '').toLowerCase().includes('tim-2509-010') || String(x.folio || '').toLowerCase().includes('2509-010'));
      } catch (e) {
        // ignore
      }
      // Guardar en estado para mostrar en UI
      if (mounted.current) setDebugAnalisis(debugData);

      // Consulta directa a la DB para folios de diagnóstico (ejemplos: TIM-2509-016 y TIM-2509-002)
      try {
        const foliosToSearch = ['TIM-2509-016', 'TIM-2509-002'];
        const dbLookupResults: Record<string, any> = {};
        for (const folioToSearch of foliosToSearch) {
          try {
            const { data: dbRows, error: dbErr } = await supabase
              .from('embarques')
              .select(`id, folio, estado_facturacion, fecha_creacion, operador_asignado_id, operador_asignado_nombre, operador_original_id, operador_original_nombre, operador:operadores(id,nombre,apellidos)`)
              .ilike('folio', `%${folioToSearch}%`);
            dbLookupResults[folioToSearch] = { rows: dbRows || [], error: dbErr ? String(dbErr?.message || dbErr) : null };
          } catch (innerErr) {
            dbLookupResults[folioToSearch] = { rows: [], error: String(innerErr) };
          }
        }
        if (mounted.current) {
          // Mantener compatibilidad retroactiva con el campo `dbLookup` y añadir `dbLookupMultiple`
          setDebugAnalisis((prev: any) => ({ ...prev, dbLookupMultiple: dbLookupResults, dbLookup: dbLookupResults['TIM-2509-016'] || { rows: [], error: null } }));
        }
      } catch (e) {
        if (mounted.current) setDebugAnalisis((prev: any) => ({ ...prev, dbLookupMultiple: {}, dbLookup: { rows: [], error: String(e) } }));
      }

      // Traer últimas modificaciones por embarque para conocer operador original y de reemplazo
      const idsAnalisis = embarquesFiltrados.map((e: any) => e.id);
      let latestModsMap: Record<string, any> = {};
      if (idsAnalisis.length) {
        try {
      const { data: modsData, error: modsError } = await supabase
            .from("embarque_modificaciones")
            .select(
        "embarque_id, operador_original_id, operador_original_nombre, operador_nuevo_id, operador_nuevo_nombre, razon, fecha_modificacion, flete_en_falso"
            )
            .in("embarque_id", idsAnalisis)
            .order("fecha_modificacion", { ascending: false });
          if (!modsError && modsData) {
            for (const m of modsData) {
              if (!latestModsMap[m.embarque_id]) latestModsMap[m.embarque_id] = m;
            }
          } else if (modsError) {
            console.error("Error cargando modificaciones para análisis:", modsError);
          }
        } catch (e) {
          console.error("Excepción cargando modificaciones para análisis:", e);
        }
      }

      // Construir lista para análisis: duplicar en contingencia (original y reemplazo) y NO calcular pago automático en esos casos
      let embarquesParaAnalisis: any[] = [];
      
      for (const embarque of embarquesFiltrados) {
        const tipoServicio = tiposServicio.find(
          (t) => t.id === embarque.tipo_servicio_id
        );
        const base: any = {
          ...embarque,
          tipoServicioNombre: tipoServicio?.nombre || "Sin especificar",
          // Usar la fecha de creación como fecha de referencia en el análisis
          fechaAsignacion: embarque.fecha_creacion,
        };
        
        // Enriquecer con datos de modificación (operador original y reemplazo)
        const mod = latestModsMap[embarque.id];
        if (mod) {
          base.operadorOriginalId = mod.operador_original_id;
          base.operadorOriginalNombre = mod.operador_original_nombre;
          base.operadorReemplazoId = mod.operador_nuevo_id;
          base.operadorReemplazoNombre = mod.operador_nuevo_nombre;
          base.motivoModificacion = mod.razon;
          // Propagar bandera de flete en falso desde la última modificación si existe
          (base as any).flete_en_falso = (mod as any)?.flete_en_falso || (base as any)?.flete_en_falso || false;
        }

        // --- Garantizar operador para análisis incluso si el embarque fue cancelado ---
        // Prioridad: operadorAsignado (si existe) -> operadorOriginalNombre (desde modificaciones) -> campos del embarque
        const nombreAsignadoActual = (embarque.operadorAsignado?.nombre || "").toString().trim();
        const nombreOriginalMod = (mod?.operador_original_nombre || embarque.operadorOriginalNombre || embarque.operadorOriginal || "").toString().trim();
        const nombreReemplazoMod = (mod?.operador_nuevo_nombre || embarque.operadorReemplazoNombre || "").toString().trim();

        const operadorNombreParaAnalisis = nombreAsignadoActual || nombreOriginalMod || nombreReemplazoMod || "";

        // Si no existe operadorAsignado en el objeto base, rellenarlo con el nombre detectado
        if (operadorNombreParaAnalisis && (!base.operadorAsignado || !base.operadorAsignado.nombre)) {
          // Buscar el ID correcto del operador por nombre
          const operadorEncontrado = todosOperadores.find(op => {
            const nombreCompleto = `${(op.nombre||'').toString().trim()} ${(op.apellidos||'').toString().trim()}`.trim();
            return normalizeName(nombreCompleto) === normalizeName(operadorNombreParaAnalisis);
          });
          
          base.operadorAsignado = {
            id: operadorEncontrado?.id || mod?.operador_original_id || base.operadorOriginalId || "",
            nombre: operadorNombreParaAnalisis,
          };
        }
        
        // Calcular un pago por defecto para el operador usando la función centralizada ASÍNCRONA
        let precioPorTipoRaw_Cont = await calcularPagoOperadorAsync(embarque, tipoServicio, tiposServicio);
        
        // Si el embarque está cancelado, para efectos del análisis debe mostrarse pago 0
        if (esCancelado(embarque)) {
          precioPorTipoRaw_Cont = 0;
        }
        const precioPorTipo_Cont = typeof precioPorTipoRaw_Cont === 'number' ? precioPorTipoRaw_Cont : Number(precioPorTipoRaw_Cont) || 0;

        // Considerar contingencia solo si hubo cambio de operador; flete_en_falso por sí solo no es contingencia
        const huboCambioOperador = !!(base.operadorOriginalId || base.operadorReemplazoId);
        const esContingencia = huboCambioOperador && (
          (embarque as any).modificadoPorEmergencia || embarquesModificadosIds.includes(embarque.id)
        );

        if (esContingencia) {
          const duplicados: any[] = [];
          const nombreOriginal =
            base.operadorOriginalNombre ||
            embarque.operadorAsignado?.nombre;
          if (nombreOriginal) {
            // Buscar el ID correcto del operador original
            const operadorOriginalEncontrado = todosOperadores.find(op => {
              const nombreCompleto = `${(op.nombre||'').toString().trim()} ${(op.apellidos||'').toString().trim()}`.trim();
              return normalizeName(nombreCompleto) === normalizeName(nombreOriginal);
            });
            
            duplicados.push({
              ...base,
              modificadoPorEmergencia: true,
              operadorAsignado: {
                id: operadorOriginalEncontrado?.id || base.operadorOriginalId || "",
                nombre: nombreOriginal,
              },
              // Usar el pago por defecto calculado para el operador original cuando no exista división capturada
              pagoOperador: precioPorTipo_Cont,
              rolContingencia: "original",
            });
          }
          if (base.operadorReemplazoNombre) {
            // Buscar el ID correcto del operador de reemplazo
            const operadorReemplazoEncontrado = todosOperadores.find(op => {
              const nombreCompleto = `${(op.nombre||'').toString().trim()} ${(op.apellidos||'').toString().trim()}`.trim();
              return normalizeName(nombreCompleto) === normalizeName(base.operadorReemplazoNombre);
            });
            
            duplicados.push({
              ...base,
              modificadoPorEmergencia: true,
              operadorAsignado: {
                id: operadorReemplazoEncontrado?.id || base.operadorReemplazoId || "",
                nombre: base.operadorReemplazoNombre,
              },
              // Por defecto, el reemplazo inicia con 0 hasta que se asigne manualmente su parte
              pagoOperador: 0,
              rolContingencia: "reemplazo",
            });
          }
          
          // Agregar los duplicados al array final
          embarquesParaAnalisis.push(...(duplicados.length 
            ? duplicados 
            : [{ ...base, pagoOperador: 0, modificadoPorEmergencia: true }]));
        } else {
          // Caso normal: usar la función centralizada ASÍNCRONA para calcular el pago al operador
          let precioPorTipoRaw = await calcularPagoOperadorAsync(embarque, tipoServicio, tiposServicio);

          // Si el embarque está cancelado, para efectos del análisis debe mostrarse pago 0
          if (esCancelado(embarque)) {
            precioPorTipoRaw = 0;
          }

          const precioPorTipo = typeof precioPorTipoRaw === 'number' ? precioPorTipoRaw : Number(precioPorTipoRaw) || 0;

          embarquesParaAnalisis.push({ ...base, pagoOperador: precioPorTipo });
        }
      }

      // Filtro por operador después de duplicar por contingencia
      if (filtroAnalisisOperador !== "todos") {
        const filtroRaw = (filtroAnalisisOperador || "").toString().trim();
        
        // Determinar si es filtro por nombre o por ID
        if (filtroRaw.startsWith('nombre:')) {
          // Filtro por nombre
          const nombreBuscado = filtroRaw.replace(/^nombre:/, '').trim();
          const filtroNorm = normalizeName(nombreBuscado);
          
          embarquesParaAnalisis = (embarquesParaAnalisis as any[]).filter((e: any) => {
            const asignadoRaw = e.operadorAsignado?.nombre || "";
            const originalRaw = e.operadorOriginalNombre || e.operadorOriginal || "";
            const asignadoNorm = normalizeName(asignadoRaw);
            const originalNorm = normalizeName(originalRaw);
            
            return asignadoNorm === filtroNorm || originalNorm === filtroNorm;
          });
        } else {
          // Filtro por ID - buscar el operador para obtener su nombre
          const operadorSeleccionado = todosOperadores.find(op => op.id === filtroRaw);
          
          if (operadorSeleccionado) {
            const nombreCompleto = `${(operadorSeleccionado.nombre||'').toString().trim()} ${(operadorSeleccionado.apellidos||'').toString().trim()}`.trim();
            const filtroNorm = normalizeName(nombreCompleto);
            
            console.log('🔍 Filtrando por operador seleccionado:', { 
              id: filtroRaw, 
              nombreCompleto, 
              filtroNorm,
              totalEmbarquesAntesFiltro: embarquesParaAnalisis.length 
            });
            
            // Mostrar algunos embarques de ejemplo antes del filtrado
            console.log('📋 Ejemplo de embarques antes del filtrado:', 
              embarquesParaAnalisis.slice(0, 5).map(e => ({
                folio: e.folio,
                operadorId: e.operadorAsignado?.id,
                operadorNombre: e.operadorAsignado?.nombre,
                operadorOriginalId: e.operadorOriginalId,
                operadorOriginalNombre: e.operadorOriginalNombre
              }))
            );
            
            embarquesParaAnalisis = (embarquesParaAnalisis as any[]).filter((e: any) => {
              // Comparar por ID primero (más preciso)
              const coincideId = (
                e.operadorAsignado?.id === filtroRaw || 
                e.operadorOriginalId === filtroRaw ||
                e.operadorReemplazoId === filtroRaw
              );
              
              if (coincideId) {
                console.log('✅ Coincidencia por ID:', e.folio, {
                  operadorAsignadoId: e.operadorAsignado?.id,
                  operadorOriginalId: e.operadorOriginalId,
                  operadorReemplazoId: e.operadorReemplazoId,
                  filtroId: filtroRaw
                });
                return true;
              }
              
              // Fallback a comparación por nombre (normalizado)
              const asignadoNorm = normalizeName(e.operadorAsignado?.nombre || "");
              const originalNorm = normalizeName(e.operadorOriginalNombre || e.operadorOriginal || "");
              const reemplazoNorm = normalizeName(e.operadorReemplazoNombre || "");
              
              const coincideNombre = (
                asignadoNorm === filtroNorm || 
                originalNorm === filtroNorm || 
                reemplazoNorm === filtroNorm
              );
              
              if (coincideNombre) {
                console.log('✅ Coincidencia por nombre:', e.folio, { 
                  asignadoNorm, 
                  originalNorm, 
                  reemplazoNorm, 
                  filtroNorm 
                });
                return true;
              }
              
              return false;
            });
            
            console.log('🎯 Resultado del filtrado:', {
              embarquesFiltrados: embarquesParaAnalisis.length,
              ejemplos: embarquesParaAnalisis.slice(0, 3).map(e => ({
                folio: e.folio,
                operadorNombre: e.operadorAsignado?.nombre,
                operadorId: e.operadorAsignado?.id
              }))
            });
          } else {
            console.log('❌ Operador no encontrado para ID:', filtroRaw);
            console.log('📋 Operadores disponibles:', todosOperadores.slice(0, 5).map(op => ({
              id: op.id,
              nombre: op.nombre,
              apellidos: op.apellidos
            })));
            // Si no se encuentra el operador, no mostrar nada
            embarquesParaAnalisis = [];
          }
        }
      }

      // Excluir embarques sin operador asignado (no mostrar 'Sin asignar' en el modal)
      embarquesParaAnalisis = (embarquesParaAnalisis as any[]).filter((e: any) => {
        const nombreAsignado = (e?.operadorAsignado?.nombre || "").toString().trim();
        const idAsignado = e?.operadorAsignado?.id;
        // Considerar válido si tiene id o un nombre distinto de 'Sin asignar' y no vacío
        if (idAsignado) return true;
        if (nombreAsignado && nombreAsignado.toLowerCase() !== "sin asignar") return true;
        return false;
      });

      const operadoresMap: Map<string, any[]> = new Map();
      for (const embarque of embarquesParaAnalisis as any[]) {
        // Preferir el nombre del operador asignado; si no existe, usar el nombre original registrado en modificaciones
        let nombre =
          embarque.operadorAsignado?.nombre ||
          embarque.operadorOriginalNombre ||
          embarque.operadorOriginal ||
          "Sin asignar";
        // Si el embarque está cancelado y no hay un nombre disponible, mostrar etiqueta explícita
        if ((nombre === "Sin asignar" || !nombre) && esCancelado(embarque)) {
          nombre = "Sin Asignar - Cancelados";
        }
        if (!operadoresMap.has(nombre)) {
          operadoresMap.set(nombre, []);
        }
        operadoresMap.get(nombre)!.push(embarque);
      }
      const analisisPorOperador = Array.from(operadoresMap.entries()).map(
        ([nombre, embarques]: [string, any[]]) => {
          const totalPagos = embarques.reduce((sum: number, e: any) => {
            if (e.modificadoPorEmergencia) {
              const m = operadoresContingencia[e.id] || {};
              let monto: number;
              if (e.rolContingencia === "original") {
                // Fallback al pago del embarque si no existe división capturada
                const fallback = (typeof e.pagoOperador === 'number' ? e.pagoOperador : Number(e.pagoOperador) || 0);
                monto = (m.original != null ? m.original : fallback) || 0;
              } else {
                monto = (m.reemplazo != null ? m.reemplazo : 0) || 0;
              }
              return sum + monto;
            }
            return sum + (e.pagoOperador || 0);
          }, 0);
          // Contingencia: sólo contar embarques en contingencia que NO estén cancelados
          const embarquesContingencia = embarques.filter((e: any) =>
            embarquesModificadosIds.includes(e.id) && !esCancelado(e)
          ).length;
          const embarquesCancelados = embarques.filter((e: any) =>
            esCancelado(e)
          ).length;
          const embarquesCorrectos = embarques.filter((e: any) => {
            // Correctos = asignados al operador, no cancelados y no en contingencia
            const enContingencia = e.modificadoPorEmergencia || embarquesModificadosIds.includes(e.id);
            return !esCancelado(e) && !enContingencia;
          }).length;
          return {
            nombre,
            totalPagos,
            cantidadEmbarques: embarques.length,
            cancelados: embarquesCancelados,
            correctos: embarquesCorrectos,
            embarques,
            embarquesContingencia,
            promedioPorEmbarque:
              embarques.length > 0 ? totalPagos / embarques.length : 0,
          };
        }
      );
  const resumenGeneral = {
        totalPagos: (embarquesParaAnalisis as any[]).reduce((sum: number, e: any) => {
          if (e.modificadoPorEmergencia) {
            const m = operadoresContingencia[e.id] || {};
            let monto: number;
            if (e.rolContingencia === "original") {
              const fallback = (typeof e.pagoOperador === 'number' ? e.pagoOperador : Number(e.pagoOperador) || 0);
              monto = (m.original != null ? m.original : fallback) || 0;
            } else {
              monto = (m.reemplazo != null ? m.reemplazo : 0) || 0;
            }
            return sum + monto;
          }
          return sum + (e.pagoOperador || 0);
        }, 0),
        totalEmbarques: embarquesParaAnalisis.length,
        operadores: analisisPorOperador.length,
        // contar embarques únicos en contingencia (excluir los cancelados para evitar doble conteo)
        casosContingencia: Array.from(
          new Set(
            embarquesFiltrados
              .filter((e) => embarquesModificadosIds.includes(e.id) && !esCancelado(e))
              .map((e) => e.id)
          )
        ).length,
      };
      if (mounted.current) {
        setAnalisisData({
          analisisPorOperador,
          embarquesFiltradosAnalisis: embarquesParaAnalisis,
          resumenGeneral,
        });
      }
    } catch (error) {
      console.error("Error al generar el análisis de operadores:", error);
      toast({ title: 'Error al generar el análisis de operadores', description: String((error as any)?.message || String(error) || ''), variant: 'destructive' });
  toast({ title: 'Error al generar el análisis de operadores', description: String((error as any)?.message || String(error) || ''), variant: 'default' });
    } finally {
      if (mounted.current) setLoadingAnalisis(false);
    }
  };

  const exportarAnalisisExcel = () => {
    const escape = (val: any) => {
      const s = String(val ?? "");
      // Escapar comillas dobles para CSV
      return `"${s.replace(/"/g, '""')}"`;
    };

    let csv = "";
    let filename = "analisis_operadores.csv";

    // Determinar qué datos exportar según el tab activo
    if (activeAnalisisTab === "porOperador") {
      // Exportar resumen por operador
      csv = [
        "Operador",
        "Total Pagos",
        "Cantidad Embarques", 
        "Correctos",
        "Cancelados",
        "Contingencia",
        "Promedio por Embarque"
      ].map(escape).join(",") + "\n";

      const lista = analisisData.analisisPorOperador || [];
      // Si hay operador específico seleccionado, filtrar solo ese operador
      const listaFiltrada = filtroAnalisisOperador !== "todos" 
        ? lista.filter((op: any) => {
            const operadorSeleccionado = todosOperadores.find(o => {
              const operadorId = o.id || `nombre:${`${(o.nombre||'').toString().trim()} ${(o.apellidos||'').toString().trim()}`.trim()}`;
              return operadorId === filtroAnalisisOperador;
            });
            return op.nombre === (operadorSeleccionado ? `${(operadorSeleccionado.nombre||'').toString().trim()} ${(operadorSeleccionado.apellidos||'').toString().trim()}`.trim() : '');
          })
        : lista;

      listaFiltrada.forEach((op: any) => {
        const row = [
          op.nombre,
          `$${op.totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          op.cantidadEmbarques.toString(),
          op.correctos.toString(),
          op.cancelados.toString(),
          op.embarquesContingencia.toString(),
          `$${op.promedioPorEmbarque.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ].map(escape).join(",");
        csv += row + "\n";
      });

      filename = filtroAnalisisOperador !== "todos" 
        ? `analisis_operador_${filtroAnalisisOperador.replace(':', '_')}.csv`
        : "analisis_por_operador.csv";

    } else if (activeAnalisisTab === "detalle") {
      // Exportar detalle de embarques (como antes pero con el pago operador correcto)
      csv = [
        "Folio",
        "Operador",
        "Cliente",
        "Load",
        "Carta Porte",
        "Tractocamión",
        "Remolque",
        "Fecha",
        "Tipo Servicio",
        "Pago Operador",
        "Contingencia",
        "Cancelado"
      ].map(escape).join(",") + "\n";

      const lista = analisisData.embarquesFiltradosAnalisis || [];
      lista.forEach((e: any) => {
        const fechaFmt = e.fechaAsignacion
          ? new Date(e.fechaAsignacion).toLocaleDateString("es-MX")
          : "";
        
        // Usar la misma lógica que se muestra en la tabla del modal
        const pagoMostrado = Number(e.pago_operador ?? 0);
        const pagoFmt = `$${pagoMostrado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const contingenciaTxt = (() => {
          if (!e.modificadoPorEmergencia) return "No";
          const folio = e.folio || "";
          const folioShort = folio.includes("-") ? folio.split("-").slice(1).join("-") : folio;
          return folioShort ? `Sí / ${folioShort}` : "Sí";
        })();

        const canceladoTxt = esCancelado(e) ? "Sí" : "No";

        const row = [
          e.folio || "",
          e.operadorAsignado?.nombre || "",
          e.clienteNombre || "",
          (e as any).load_number || (e as any).numeroLoad || "",
          (e as any).carta_porte || "",
          (e as any).camionAsignado?.numeroEconomico || (e as any).camion?.numero_economico || "",
          (e as any).remolque?.numero_economico || (e as any).remolque_numero_economico || (e as any).remolque_placa || "",
          fechaFmt,
          e.tipoServicioNombre || "",
          pagoFmt,
          contingenciaTxt,
          canceladoTxt
        ].map(escape).join(",");
        csv += row + "\n";
      });

      filename = filtroAnalisisOperador !== "todos" 
        ? `detalle_embarques_${filtroAnalisisOperador.replace(':', '_')}.csv`
        : "detalle_embarques.csv";

    } else if (activeAnalisisTab === "contingencia") {
      // Exportar casos de contingencia
      csv = [
        "Folio",
        "Operador Original",
        "Operador Reemplazo",
        "Cliente",
        "Fecha",
        "Tipo Servicio",
        "Pago Original",
        "Pago Reemplazo",
        "Total Pago",
        "Motivo"
      ].map(escape).join(",") + "\n";

      const casosContingencia = (analisisData.embarquesFiltradosAnalisis || [])
        .filter((e: any) => embarquesModificadosIds.includes(e.id))
        .filter((e: any, idx: number, arr: any[]) => 
          idx === arr.findIndex((x: any) => x.id === e.id)
        );

      casosContingencia.forEach((e: any) => {
        const fechaFmt = e.fechaAsignacion
          ? new Date(e.fechaAsignacion).toLocaleDateString("es-MX")
          : "";
        
        const pagoOriginal = operadoresContingencia[e.id]?.original || 0;
        const pagoReemplazo = e.operadorReemplazoNombre ? (operadoresContingencia[e.id]?.reemplazo || 0) : 0;
        const totalPago = pagoOriginal + pagoReemplazo;

        const row = [
          e.folio || "",
          e.operadorOriginalNombre || e.operadorAsignado?.nombre || "",
          e.operadorReemplazoNombre || "",
          e.clienteNombre || "",
          fechaFmt,
          e.tipoServicioNombre || "",
          `$${pagoOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${pagoReemplazo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${totalPago.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          e.motivoModificacion || ""
        ].map(escape).join(",");
        csv += row + "\n";
      });

      filename = "casos_contingencia.csv";
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showArchivadosModal, setShowArchivadosModal] = useState(false);
  const [embarquesArchivados, setEmbarquesArchivados] = useState<
    EmbarqueAsignado[]
  >([]);
  // Global oldest archived id (fetched from DB) to ensure the oldest record is always deletable
  const [globalMasViejoArchivadoId, setGlobalMasViejoArchivadoId] = useState<string | null>(null);
  // ⚡ OPTIMIZACIÓN: Estado para contador total real
  const [totalArchivadosReal, setTotalArchivadosReal] = useState<number | null>(null);
  const [loadingArchivados, setLoadingArchivados] = useState(false);

  // UI/UX: filtros, orden y paginación para modal de Archivados (diseño alineado a Crear Embarques)
  const [archivadosSearch, setArchivadosSearch] = useState("");
  const [archivadosPeriodo, setArchivadosPeriodo] = useState<
    "todo" | "mes_actual" | "mes_anterior" | "ultimos_3" | "ultimos_6" | "este_anio"
  >("todo");
  const [archivadosSortBy, setArchivadosSortBy] = useState<
    "folio" | "cliente" | "load" | "valor" | "fechaPago"
  >("folio");
  const [archivadosSortDir, setArchivadosSortDir] = useState<"asc" | "desc">(
    "desc"
  );
  const [archivadosPage, setArchivadosPage] = useState(1);
  const [archivadosPageSize, setArchivadosPageSize] = useState(25);

  const sortIndicatorArchivados = (field:
    | "folio"
    | "cliente"
    | "load"
    | "valor"
    | "fechaPago"
  ) => {
    if (archivadosSortBy !== field) return null;
    return archivadosSortDir === "asc" ? " ▲" : " ▼";
  };

  const toggleSortArchivados = (
    field: "folio" | "cliente" | "load" | "valor" | "fechaPago"
  ) => {
    setArchivadosPage(1);
    if (archivadosSortBy === field) {
      setArchivadosSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setArchivadosSortBy(field);
  // Por defecto: fechaPago y folio en descendente; los demás asc
  setArchivadosSortDir(field === "fechaPago" || field === "folio" ? "desc" : "asc");
    }
  };

  // Reset de página ante cambios de filtros
  useEffect(() => {
    setArchivadosPage(1);
  }, [archivadosSearch, archivadosPeriodo, archivadosPageSize]);

  // Helper: validar si una fecha cae dentro del periodo seleccionado
  const fechaDentroPeriodoArchivados = (fechaIso?: string | null) => {
    if (!fechaIso) return false;
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();
    switch (archivadosPeriodo) {
      case "todo":
        return true;
      case "mes_actual":
        return (
          fecha.getFullYear() === anioActual && fecha.getMonth() === mesActual
        );
      case "mes_anterior": {
        const mesAnterior = new Date(anioActual, mesActual - 1, 1);
        return (
          fecha.getFullYear() === mesAnterior.getFullYear() &&
          fecha.getMonth() === mesAnterior.getMonth()
        );
      }
      case "ultimos_3": {
        const limite = new Date();
        limite.setMonth(limite.getMonth() - 3);
        return fecha >= limite;
      }
      case "ultimos_6": {
        const limite = new Date();
        limite.setMonth(limite.getMonth() - 6);
        return fecha >= limite;
      }
      case "este_anio":
        return fecha.getFullYear() === anioActual;
      default:
        return true;
    }
  };

  // ⚡ OPTIMIZACIÓN: Filtrado y ordenamiento simplificado (la mayoría se hace en servidor)
  const archivadosFilteredSorted = useMemo(() => {
    // Como los filtros principales se aplican en servidor, solo ordenamiento en cliente para casos especiales
    const data = embarquesArchivados || [];
    
    if (archivadosSortBy === "folio" || archivadosSortBy === "cliente" || archivadosSortBy === "load" || archivadosSortBy === "valor") {
      // Solo ordenamiento en cliente para campos que no se pueden ordenar eficientemente en servidor
      return data.sort((a, b) => {
        let va: any = 0;
        let vb: any = 0;
        
        switch (archivadosSortBy) {
          case "folio":
            const folioNum = (x: any) => {
              const s = String(x?.folio ?? "");
              const digits = s.replace(/[^0-9]/g, "");
              return digits.length > 0 ? parseInt(digits, 10) : Number.MIN_SAFE_INTEGER;
            };
            va = folioNum(a);
            vb = folioNum(b);
            break;
          case "cliente":
            va = String(a.clienteNombre || "");
            vb = String(b.clienteNombre || "");
            break;
          case "load":
            va = String(a.load_number || "");
            vb = String(b.load_number || "");
            break;
          case "valor":
            va = typeof a.precioFlete === "number" ? a.precioFlete : 0;
            vb = typeof b.precioFlete === "number" ? b.precioFlete : 0;
            break;
        }
        
        if (va < vb) return archivadosSortDir === "asc" ? -1 : 1;
        if (va > vb) return archivadosSortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    // Para fechaPago y fecha_archivado, el ordenamiento ya se hizo en servidor
    return data;
  }, [embarquesArchivados, archivadosSortBy, archivadosSortDir]);

  // ⚡ OPTIMIZACIÓN: Paginación ya se maneja en servidor, aquí solo mostramos los datos
  const totalArchivados = archivadosFilteredSorted.length;
  const paginatedArchivados = archivadosFilteredSorted; // Ya vienen paginados del servidor
  
  // ⚡ OPTIMIZACIÓN: Usar contador real cuando esté disponible, estimar cuando no
  const totalParaPaginacion = useMemo(() => {
    if (totalArchivadosReal !== null) {
      return totalArchivadosReal;
    }
    
    // Estimación basada en la página actual
    if (totalArchivados === archivadosPageSize) {
      // Página llena, hay más páginas
      return archivadosPage * archivadosPageSize + 1;
    } else {
      // Página parcial, probablemente la última
      return (archivadosPage - 1) * archivadosPageSize + totalArchivados;
    }
  }, [totalArchivadosReal, totalArchivados, archivadosPageSize, archivadosPage]);
  
  const totalArchivadosPaginas = Math.max(1, Math.ceil(totalParaPaginacion / archivadosPageSize));
  const clampedPage = Math.min(archivadosPage, totalArchivadosPaginas);
  const startIdx = (clampedPage - 1) * archivadosPageSize;
  const endIdx = startIdx + totalArchivados;

  // Elegibilidad de eliminación: habilitado si es el registro más antiguo o ya pasaron 6 meses desde su archivo
  const masViejoArchivadoId = useMemo(() => {
    if (!embarquesArchivados || embarquesArchivados.length === 0) return null;
    let minId: string | null = null;
    let minTime = Number.POSITIVE_INFINITY;
    for (const e of embarquesArchivados) {
      const fechaStr =
        (e as any).fecha_archivado || e.fechaArchivado || e.fecha_creacion || e.updated_at;
      const t = fechaStr ? new Date(fechaStr).getTime() : Number.POSITIVE_INFINITY;
      if (t < minTime) {
        minTime = t;
        minId = e.id;
      }
    }
    return minId;
  }, [embarquesArchivados]);

  const puedeEliminarArchivadoFC = (e: EmbarqueAsignado) => {
    // Only the globally oldest archived record can be deleted — enabled immediately
    const oldestIdToCheck = globalMasViejoArchivadoId || masViejoArchivadoId;
    if (!oldestIdToCheck) return false;
    return e.id === oldestIdToCheck;
  };

  const eliminarArchivadoDefinitivoFC = async (e: EmbarqueAsignado) => {
    // Perform deletion (confirmation is handled by an in-UI modal)
    if (!puedeEliminarArchivadoFC(e)) return;
    try {
      const { error } = await supabase.from("embarques").delete().eq("id", e.id);
      if (error) {
        toast({ title: 'Error al eliminar en Supabase', description: String(error.message || ''), variant: 'destructive' });
  toast({ title: 'Error al eliminar en Supabase', description: String(error.message || ''), variant: 'default' });
        return;
      }
      setEmbarquesArchivados((prev) => (prev || []).filter((x) => x.id !== e.id));
      // Audit log
      try {
        const { agregarAuditLog } = await import("../../lib/audit");
        agregarAuditLog(
          "ELIMINAR",
          "Facturación/Cobranza",
          `Eliminación definitiva de embarque archivado folio ${e.folio}`
        );
      } catch {}
  // Eliminación permanente: notificar en rojo
  toast({ title: 'Registro eliminado definitivamente', variant: 'destructive' });
    } catch (err) {
      console.error(err);
      const _e: any = err;
      toast({ title: 'Error inesperado al eliminar el registro', description: String(_e?.message || _e || ''), variant: 'destructive' });
  toast({ title: 'Error inesperado al eliminar el registro', description: String(_e?.message || _e || ''), variant: 'default' });
    }
  };

  useEffect(() => {
    // Re-fetch archivados whenever modal is opened or pagination / filters change
    if (!showArchivadosModal) return;
    setLoadingArchivados(true);
    let active = true;

    const cargarArchivados = async () => {
      try {
        // ⚡ OPTIMIZACIÓN: Paginación más inteligente
        const page = Math.max(1, Number(archivadosPage || 1));
        const pageSize = Math.max(1, Number(archivadosPageSize || 25));
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        // ⚡ OPTIMIZACIÓN: Solo cargar campos necesarios para la tabla
        let query = supabase
          .from("embarques")
          .select(
            `id, folio, load_number, precio_flete, moneda_flete, fecha_archivado, fecha_pago, fecha_creacion, updated_at, recolectas_json, entregas_json, observaciones, flete_en_falso,
            cliente:clientes(id, nombre),
            operador:operadores(id, nombre, apellidos)`
          )
          .eq("estado_facturacion", "archivado");

        // ⚡ OPTIMIZACIÓN: Aplicar filtros en el servidor cuando sea posible
        const s = (archivadosSearch || "").trim();
        if (s) {
          const like = `%${s.replace(/%/g, '')}%`;
          query = query.or(`folio.ilike.${like},load_number.ilike.${like}`);
        }

        // ⚡ OPTIMIZACIÓN: Filtros de periodo en servidor
        if (archivadosPeriodo && archivadosPeriodo !== "todo") {
          const ahora = new Date();
          let fechaDesde: string | null = null;
          
          switch (archivadosPeriodo) {
            case "mes_actual":
              fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
              break;
            case "mes_anterior":
              fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
              const fechaHasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString();
              query = query.gte("fecha_archivado", fechaDesde).lte("fecha_archivado", fechaHasta);
              break;
            case "ultimos_3":
              const fechaTresMeses = new Date();
              fechaTresMeses.setMonth(fechaTresMeses.getMonth() - 3);
              query = query.gte("fecha_archivado", fechaTresMeses.toISOString());
              break;
            case "ultimos_6":
              const fechaSeisMeses = new Date();
              fechaSeisMeses.setMonth(fechaSeisMeses.getMonth() - 6);
              query = query.gte("fecha_archivado", fechaSeisMeses.toISOString());
              break;
            case "este_anio":
              fechaDesde = new Date(ahora.getFullYear(), 0, 1).toISOString();
              query = query.gte("fecha_archivado", fechaDesde);
              break;
          }
          
          if (fechaDesde && archivadosPeriodo === "mes_actual") {
            query = query.gte("fecha_archivado", fechaDesde);
          }
        }

        // ⚡ OPTIMIZACIÓN: Ordenamiento en servidor
        const orderField = archivadosSortBy === "fechaPago" ? "fecha_pago" : "fecha_archivado";
        const ascending = archivadosSortDir === "asc";
        query = query.order(orderField, { ascending, nullsFirst: false }).range(start, end);

        const { data, error } = await query;

        if (!active) return;

        if (error) {
          console.error("Error cargando embarques archivados:", error);
          if (mounted.current) setEmbarquesArchivados([]);
        } else {
          // ⚡ OPTIMIZACIÓN: Procesamiento más simple y directo
          const embarquesFormateados = (data || []).map((embarque: any): EmbarqueAsignado => {
            const cliente = Array.isArray(embarque.cliente) ? embarque.cliente[0] : embarque.cliente;
            const operador = Array.isArray(embarque.operador) ? embarque.operador[0] : embarque.operador;
            
            return {
              ...embarque,
              precioFlete: typeof embarque.precio_flete === "string" 
                ? Number(embarque.precio_flete) || 0
                : embarque.precio_flete || 0,
              clienteNombre: cliente?.nombre || "Cliente no especificado",
              numeroLoad: embarque.load_number || "",
              direccionEnganche: embarque.direccion_enganche || "",
              fechaEnganche: embarque.fecha_enganche || "",
              horaEnganche: embarque.hora_enganche || "",
              comentarios: embarque.comentarios || "",
              operadorAsignado: operador
                ? {
                    id: operador.id || "",
                    nombre: `${operador.nombre || ""} ${operador.apellidos || ""}`.trim(),
                  }
                : { id: "", nombre: "Sin asignar" },
            };
          });
          
          if (mounted.current) {
            setEmbarquesArchivados(embarquesFormateados);
          }
          
          // ⚡ OPTIMIZACIÓN: Solo buscar el registro más antiguo si se necesita para eliminación
          if (embarquesFormateados.length > 0) {
            const oldestId = embarquesFormateados.reduce((oldest: any, current: any) => {
              const oldestTime = oldest.fecha_archivado ? new Date(oldest.fecha_archivado).getTime() : 0;
              const currentTime = current.fecha_archivado ? new Date(current.fecha_archivado).getTime() : 0;
              return currentTime < oldestTime ? current : oldest;
            }, embarquesFormateados[0])?.id;
            
            if (mounted.current) setGlobalMasViejoArchivadoId(oldestId || null);
          }
          
          // ⚡ OPTIMIZACIÓN: Solo obtener contador total en primera página o cuando se cambian filtros
          if (page === 1 && active) {
            try {
              let countQuery = supabase
                .from("embarques")
                .select("id", { count: "exact", head: true })
                .eq("estado_facturacion", "archivado");

              // Aplicar los mismos filtros que a la consulta principal
              if (s) {
                const like = `%${s.replace(/%/g, '')}%`;
                countQuery = countQuery.or(`folio.ilike.${like},load_number.ilike.${like}`);
              }

              if (archivadosPeriodo && archivadosPeriodo !== "todo") {
                const ahora = new Date();
                let fechaDesde: string | null = null;
                
                switch (archivadosPeriodo) {
                  case "mes_actual":
                    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
                    countQuery = countQuery.gte("fecha_archivado", fechaDesde);
                    break;
                  case "mes_anterior":
                    fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString();
                    const fechaHasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString();
                    countQuery = countQuery.gte("fecha_archivado", fechaDesde).lte("fecha_archivado", fechaHasta);
                    break;
                  case "ultimos_3":
                    const fechaTresMesesCount = new Date();
                    fechaTresMesesCount.setMonth(fechaTresMesesCount.getMonth() - 3);
                    countQuery = countQuery.gte("fecha_archivado", fechaTresMesesCount.toISOString());
                    break;
                  case "ultimos_6":
                    const fechaSeisMesesCount = new Date();
                    fechaSeisMesesCount.setMonth(fechaSeisMesesCount.getMonth() - 6);
                    countQuery = countQuery.gte("fecha_archivado", fechaSeisMesesCount.toISOString());
                    break;
                  case "este_anio":
                    fechaDesde = new Date(ahora.getFullYear(), 0, 1).toISOString();
                    countQuery = countQuery.gte("fecha_archivado", fechaDesde);
                    break;
                }
              }

              const { count } = await countQuery;
              if (mounted.current && typeof count === 'number') {
                setTotalArchivadosReal(count);
              }
            } catch (countError) {
              console.warn('Error obteniendo contador de archivados:', countError);
            }
          }
          
          console.log(`⚡ cargarArchivados optimizado: ${embarquesFormateados.length} registros (página ${page})`);
        }
      } catch (error) {
        if (!active) return;
        console.error("Error cargando embarques archivados (excepción):", error);
        if (mounted.current) setEmbarquesArchivados([]);
      } finally {
        if (active && mounted.current) setLoadingArchivados(false);
      }
    };

    cargarArchivados();

    return () => {
      active = false;
    };
  }, [showArchivadosModal, archivadosPage, archivadosPageSize, archivadosSearch, archivadosPeriodo, archivadosSortBy, archivadosSortDir]);

  // ⚡ OPTIMIZACIÓN: Resetear contador total cuando cambian filtros importantes
  useEffect(() => {
    setTotalArchivadosReal(null);
    setArchivadosPage(1); // Volver a página 1 cuando cambian filtros
  }, [archivadosSearch, archivadosPeriodo]);

  async function archivarEmbarque(embarque: EmbarqueAsignado) {

    const fechaArchivado = new Date().toISOString();
    // Obtener usuario actual
    let usuarioArchivo = "Usuario Actual";
    try {
      const { getCurrentUser } = await import("../../lib/auth");
      const user = getCurrentUser && getCurrentUser();
      if (user && user.nombre) usuarioArchivo = user.nombre;
    } catch {}
    const motivoArchivo = "Archivado manualmente desde facturación";
    const observacionesArchivo = "Registro archivado para consulta histórica";

    const { error } = await supabase
      .from("embarques")
      .update({
        estado_facturacion: "archivado",
        fecha_archivado: fechaArchivado,
        usuario_archivo: usuarioArchivo,
        motivo_archivo: motivoArchivo,
        observaciones_archivo: observacionesArchivo,
        updated_at: fechaArchivado,
      })
      .eq("id", embarque.id);

    if (error) {
      // Use toast for non-blocking error notification and rethrow so caller can handle
      toast({ title: 'Error al archivar embarque', description: error.message || String(error), variant: 'destructive' });
  toast({ title: 'Error al archivar embarque', description: error.message || String(error), variant: 'default' });
      throw error;
    }

    const actualizados: EmbarqueAsignado[] = embarquesAsignados.map((e) =>
      e.id === embarque.id
        ? {
            ...e,
            estado_facturacion: "archivado",
            fechaArchivado,
            usuarioArchivo,
            motivoArchivo,
            observacionesArchivo,
            updated_at: fechaArchivado,
          }
        : e
    );
    if (mounted.current) {
      setEmbarquesAsignados(actualizados);
      localStorage.setItem("embarquesAsignados", JSON.stringify(actualizados));
      // Ocultar inmediatamente de la lista principal
      setArchivadosIds((prev) =>
        Array.from(new Set([...(prev || []), embarque.id]))
      );
      // Si el modal de archivados está abierto, agregar el registro de inmediato
      setEmbarquesArchivados((prev) => {
        if (!showArchivadosModal) return prev;
        const yaExiste = (prev || []).some((e) => e.id === embarque.id);
        if (yaExiste) return prev;
        const paraModal: EmbarqueAsignado = {
          ...embarque,
          estado_facturacion: "archivado",
          // Normalizar campos utilizados por el listado de Archivados
          clienteNombre: (embarque as any).clienteNombre || (embarque as any).cliente?.nombre || "Cliente no especificado",
          precioFlete: (typeof (embarque as any).precioFlete === "number"
            ? (embarque as any).precioFlete
            : typeof (embarque as any).precio_flete === "string"
            ? Number((embarque as any).precio_flete)
            : (embarque as any).precio_flete) as any,
          fecha_pago: (embarque as any).fecha_pago || (embarque as any).fechaPago || null,
          fecha_archivado: (embarque as any).fecha_archivado || fechaArchivado,
          updated_at: fechaArchivado,
          load_number: (embarque as any).load_number || embarque.numeroLoad,
        } as any;
        return [paraModal, ...(prev || [])];
      });
    }
    // Audit log: archivar embarque
    try {
      const { agregarAuditLog } = await import("../../lib/audit");
      agregarAuditLog(
        "ACTUALIZAR",
        "Facturación/Cobranza",
        `Archivo de embarque folio ${embarque.folio} por usuario ${usuarioArchivo}`
      );
    } catch {}
  }

  async function cancelarEmbarque(embarque: EmbarqueAsignado, motivo?: string) {
    if (!embarque || !embarque.id) {
      throw new Error('Embarque inválido para cancelar');
    }

    const fechaCancelacion = new Date().toISOString();
    
    // Obtener usuario actual
    let usuarioCancelacion = "Usuario Actual";
    try {
      const { getCurrentUser } = await import("../../lib/auth");
      const user = getCurrentUser && getCurrentUser();
      if (user && user.nombre) usuarioCancelacion = user.nombre;
    } catch (error) {
      console.warn("Error obteniendo usuario actual:", error);
    }

    try {
      // PASO 1: Actualización base (campos que siempre existen) - similar a embarques y asignar-operadores
      const baseUpdate: any = {
        estado: "cancelado",
        // NO archivar automáticamente - el usuario decidirá cuándo usar el botón "Archivar"
        updated_at: fechaCancelacion,
      };

      // Intentar agregar observaciones si es posible
      try {
        baseUpdate.observaciones = `${embarque.observaciones || ""}

[CANCELADO DESDE FACTURACIÓN] ${motivo || "Sin motivo especificado"}`.trim();
      } catch (error) {
        console.warn("Campo observaciones no disponible, continuando sin él");
      }

      const { error: baseError } = await supabase
        .from("embarques")
        .update(baseUpdate)
        .eq("id", embarque.id);

      if (baseError) {
        console.error("Error de Supabase al cancelar embarque (actualización base):", baseError);
        
        // Manejo mejorado del error similar a otras implementaciones
        const errorMessage = baseError?.message || JSON.stringify(baseError) || "Error desconocido en base de datos";
        
        toast({ 
          title: 'Error al cancelar embarque', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        throw new Error(`Error de base de datos: ${errorMessage}`);
      }

      console.log(`✅ Embarque ${embarque.folio} - actualización base exitosa`);

      // PASO 2: Metadata best-effort (puede fallar si columnas no existen) - similar a embarques y asignar-operadores
      try {
        const metaUpdate: any = {
          fecha_cancelacion: fechaCancelacion,
          usuario_cancelacion: usuarioCancelacion,
          motivo_cancelacion: motivo || "Cancelado desde facturación y cobranza",
        };

        const { error: metaError } = await supabase
          .from("embarques")
          .update(metaUpdate)
          .eq("id", embarque.id);

        if (metaError) {
          // No bloquear al usuario, solo advertir en consola - como en otras implementaciones
          console.warn(
            "No se pudo guardar metadata de cancelación (campos pueden no existir en el esquema):",
            metaError
          );
        } else {
          console.log(`✅ Embarque ${embarque.folio} - metadata de cancelación guardada`);
        }
      } catch (metaException) {
        console.warn("Excepción guardando metadata de cancelación:", metaException);
      }

      console.log(`✅ Embarque ${embarque.folio} cancelado exitosamente en base de datos`);

      // PASO 3: Actualizar estado local - mantener embarque con estado cancelado (NO remover)
      if (mounted.current) {
        // Actualizar el embarque en la lista principal marcándolo como cancelado
        const actualizados = embarquesAsignados.map((e) => 
          e.id === embarque.id 
            ? { 
                ...e, 
                estado: "cancelado",
                // NO archivar automáticamente en facturación - el usuario decidirá
                fecha_cancelacion: fechaCancelacion,
                usuario_cancelacion: usuarioCancelacion,
                motivo_cancelacion: motivo || "Cancelado desde facturación y cobranza",
                updated_at: fechaCancelacion,
                observaciones: `${e.observaciones || ""}

[CANCELADO DESDE FACTURACIÓN] ${motivo || "Sin motivo especificado"}`.trim()
              }
            : e
        );
        setEmbarquesAsignados(actualizados);
        console.log(`✅ Estado local actualizado: embarque ${embarque.folio} marcado como cancelado (mantenido en lista)`);

        // También actualizar embarques analíticos si existen
        setEmbarquesAnaliticos((prev) => 
          prev.map((e) => 
            e.id === embarque.id 
              ? { ...e, estado: "cancelado" } // NO archivar automáticamente
              : e
          )
        );
        console.log(`✅ Estado analítico actualizado: embarque ${embarque.folio} marcado como cancelado`);
      }

      // PASO 4: Audit log best-effort - similar a asignar-operadores
      try {
        const { agregarAuditLog } = await import("../../lib/audit");
        await agregarAuditLog(
          "ELIMINAR",
          "Facturación/Cobranza",
          `Cancelación de embarque folio ${embarque.folio} por usuario ${usuarioCancelacion}. Motivo: ${motivo || 'No especificado'}`
        );
        console.log(`✅ Audit log registrado para cancelación de ${embarque.folio}`);
      } catch (auditError) {
        console.warn("Error registrando audit log (no crítico):", auditError);
        // No lanzar error aquí, el audit log no debe interrumpir la cancelación
      }

      // Toast de éxito se maneja desde el modal que llama a esta función
      console.log(`🎯 Cancelación completa para embarque ${embarque.folio}`);

    } catch (error) {
      console.error("Error cancelando embarque:", error);
      
      // Manejo de errores más robusto
      let errorMessage = 'Error desconocido al cancelar embarque';
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Error sin mensaje específico';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Manejar objetos de error de Supabase u otros
        if ('message' in error && error.message) {
          errorMessage = String(error.message);
        } else if ('code' in error && error.code) {
          errorMessage = `Error de base de datos (${error.code})`;
        } else {
          // Objeto vacío o sin propiedades útiles
          errorMessage = 'Error de sistema - contacte al administrador';
          console.error("Error objeto sin información útil:", JSON.stringify(error));
        }
      }
      
      toast({ 
        title: 'Error al cancelar embarque', 
        description: errorMessage, 
        variant: 'destructive' 
      });
      
      // Crear un error más descriptivo para propagación
      const enhancedError = new Error(errorMessage);
      enhancedError.cause = error;
      throw enhancedError;
    }
  }
  const [embarquesAsignados, setEmbarquesAsignados] = useState<
    EmbarqueAsignado[]
  >([]);
  const [filtroOperador, setFiltroOperador] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  // Paginación lista principal
  const [listaPage, setListaPage] = useState(1);
  const [listaPageSize, setListaPageSize] = useState(12);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [embarqueEditando, setEmbarqueEditando] =
    useState<EmbarqueAsignado | null>(null);

  const [formData, setFormData] = useState({
    montoFacturado: 0,
    fechaEntrega: "",
    observacionesFacturacion: "",
    pagado: false,
    fechaPago: "",
    estado_facturacion: "pendiente_facturacion",
    numeroFactura1: "",
    numeroFactura2: "",
    numeroFactura3: "",
    fechaEnvioCliente: "",
    referenciaPago: "",
  });

  const [showCreditModal, setShowCreditModal] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  // Ordenar clientes alfabéticamente para dropdowns (acentos/uppercase-insensitive)
  const clientesOrdenadosPorNombre = useMemo(
    () =>
      [...(clientes || [])]
        .filter((c) => c && typeof c.nombre === "string")
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    [clientes]
  );
  const [creditClientSearchTerm, setCreditClientSearchTerm] = useState("");
  const [currentPageCredit, setCurrentPageCredit] = useState(1);
  const [itemsPerPageCredit, setItemsPerPageCredit] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [embarqueDetalle, setEmbarqueDetalle] =
    useState<EmbarqueAsignado | null>(null);

  const [activeTab, setActiveTab] = useState("general");

  const [showFacturacionEditModal, setShowFacturacionEditModal] =
    useState(false);
  const [facturacionFormData, setFacturacionFormData] = useState({
    folio1: "",
    folio2: "",
    folio3: "",
    folio4: "",
    cantidadFinalFacturada: 0,
    observacionesFacturacion: "",
  });

  const [showTiposServicioModal, setShowTiposServicioModal] = useState(false);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  // Modal para crear nuevo tipo de servicio
  const [showCrearTipoModal, setShowCrearTipoModal] = useState(false);
  const [showTiposInfo, setShowTiposInfo] = useState(false);
  
  // Estado para búsqueda de tipos de servicio
  const [searchTipos, setSearchTipos] = useState("");
  // Estados para validación de eliminación
  const [tipoValidationInfo, setTipoValidationInfo] = useState<{[key: string]: {canDelete: boolean, reason: string, embarquesCount: number}} | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);
  // Modal para configurar flete falso
  const [showConfigurarFleteModal, setShowConfigurarFleteModal] = useState(false);
  const [precioFleteFalso, setPrecioFleteFalso] = useState<string>('800.00');
  const [guardandoPrecioFlete, setGuardandoPrecioFlete] = useState(false);
  const [itemsPerPageTipos, setItemsPerPageTipos] = useState(5);
  const [currentPageTipos, setCurrentPageTipos] = useState(1);
  // Ordenamiento para la tabla de Tipos de Servicio
  const [tiposSortBy, setTiposSortBy] = useState<'tipo' | 'categoria' | 'pago'>('tipo');
  const [tiposSortDir, setTiposSortDir] = useState<'asc' | 'desc'>('asc');
  // Editar tipo de servicio
  const [showEditarTipoModal, setShowEditarTipoModal] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoServicio | null>(null);
  // Usos de tipos de servicio (¿qué embarques lo usan?)
  const [showUsosModal, setShowUsosModal] = useState(false);
  const [usosTipo, setUsosTipo] = useState<TipoServicio | null>(null);
  const [usosLoading, setUsosLoading] = useState(false);
  const [usosEmbarques, setUsosEmbarques] = useState<Array<{ id: string; folio: string; estado?: string | null; estado_facturacion?: string | null; bloquea?: boolean }>>([]);
  const [editarTipo, setEditarTipo] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    subcategoria: "",
    es_flete_falso: false,
  });
  const [guardandoEdicionTipo, setGuardandoEdicionTipo] = useState(false);
  // Filtrar tipos de servicio por búsqueda
  const tiposFiltrados = useMemo(() => {
    if (!Array.isArray(tiposServicio)) return [];
    
    if (!searchTipos.trim()) {
      return tiposServicio;
    }
    
    const searchLower = searchTipos.toLowerCase().trim();
    return tiposServicio.filter((tipo: TipoServicio) => 
      String(tipo.nombre || '').toLowerCase().includes(searchLower) ||
      String(tipo.descripcion || '').toLowerCase().includes(searchLower) ||
      String(tipo.categoria || '').toLowerCase().includes(searchLower) ||
      String(tipo.subcategoria || '').toLowerCase().includes(searchLower)
    );
  }, [tiposServicio, searchTipos]);

  const totalPagesTipos = useMemo(
    () => Math.max(1, Math.ceil((tiposFiltrados?.length || 0) / itemsPerPageTipos)),
    [tiposFiltrados, itemsPerPageTipos]
  );
  const paginatedTipos = useMemo(() => {
    // Ordenar copia de tiposFiltrados según estado de orden
    const todos = [...tiposFiltrados];
    todos.sort((a: any, b: any) => {
      const dir = tiposSortDir === 'asc' ? 1 : -1;
      if (tiposSortBy === 'tipo') {
        const va = String(a.nombre || '').toLowerCase();
        const vb = String(b.nombre || '').toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      }
      if (tiposSortBy === 'categoria') {
        const va = String(a.categoria || '').toLowerCase();
        const vb = String(b.categoria || '').toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      }
      if (tiposSortBy === 'pago') {
        const va = obtenerMontoTipoServicio(a);
        const vb = obtenerMontoTipoServicio(b);
        return (va - vb) * dir;
      }
      return 0;
    });

    const start = (currentPageTipos - 1) * itemsPerPageTipos;
    return todos.slice(start, start + itemsPerPageTipos);
  }, [tiposFiltrados, currentPageTipos, itemsPerPageTipos, tiposSortBy, tiposSortDir]);
  useEffect(() => {
    // Si cambia el total de páginas y la actual queda fuera de rango, ajusta
    if (currentPageTipos > totalPagesTipos) {
      setCurrentPageTipos(totalPagesTipos);
    }
  }, [totalPagesTipos]);

  // Resetear página cuando cambie orden de tipos o búsqueda
  useEffect(() => {
    setCurrentPageTipos(1);
  }, [tiposSortBy, tiposSortDir, itemsPerPageTipos, searchTipos]);
  const [nuevoTipo, setNuevoTipo] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    subcategoria: "",
    precio_base: 0,
    es_flete_falso: false,
  });
  const [guardandoNuevoTipo, setGuardandoNuevoTipo] = useState(false);

  const [showFacturacionModal, setShowFacturacionModal] = useState(false);
  const [embarqueFacturacion, setEmbarqueFacturacion] =
    useState<EmbarqueAsignado | null>(null);
  const [savingFacturacion, setSavingFacturacion] = useState(false);
  const [facturacionData, setFacturacionData] = useState({
    facturas: [
      { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
      { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
      { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
      { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" }
    ] as FacturaData[],
    observacionesFacturacion: "",
  });

  // Controles de generación aleatoria removidos por requerimiento (sin auto-generar facturas)

  const [activeDetailTab, setActiveDetailTab] = useState("general");

  // Fotos (Detalle)
  const [fotosDetalle, setFotosDetalle] = useState<FotoEmbarque[]>([]);
  const [loadingFotosDetalle, setLoadingFotosDetalle] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const cargarFotosDetalle = useCallback(async (embarqueId: string) => {
    if (!embarqueId) return;
    setLoadingFotosDetalle(true);
    try {
      const fotos = await obtenerFotosEmbarque(embarqueId);
      if (mounted.current) setFotosDetalle(fotos || []);
    } catch (e) {
      console.error("Error cargando fotos (detalle):", e);
      if (mounted.current) setFotosDetalle([]);
    } finally {
      if (mounted.current) setLoadingFotosDetalle(false);
    }
  }, []);

  // Helper: obtener cliente por id para pestaña Datos del Cliente
  const getClienteById = useCallback(
    (clienteId?: string) => {
      if (!clienteId) return undefined;
      return clientes.find((c) => c.id === clienteId);
    },
    [clientes]
  );

  // Helper: verificar si el embarque tiene múltiples direcciones
  const tieneMultiplesDirecciones = useCallback((recolectas: any[], entregas: any[]) => {
    const recolectasValidas = recolectas.filter((r: any) => r.direccion?.trim());
    const entregasValidas = entregas.filter((e: any) => e.direccion?.trim());
    return recolectasValidas.length > 1 || entregasValidas.length > 1;
  }, []);

  // Helper: extraer múltiples direcciones de las observaciones
  const extraerDireccionesMultiples = useCallback((observaciones: string | null) => {
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
          const direccion = match[1];
          const fechaHora = match[3] || '';
          
          let fecha = '';
          let hora = '';
          if (fechaHora) {
            const partesFechaHora = fechaHora.split(' ');
            fecha = partesFechaHora[0] || '';
            hora = partesFechaHora[1] || '';
          }

          const item = { direccion, fecha, hora };
          if (seccionActual === 'recolecciones') {
            recolectas.push(item);
          } else if (seccionActual === 'entregas') {
            entregas.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error parseando direcciones múltiples:', error);
    }

    return { recolectas, entregas, observacionesLimpias };
  }, []);

  // Helper: verificar si el embarque es flete falso
  const esFleteFalso = useCallback((embarque: any) => {
    // Mostrar "Flete F." cuando:
    // 1. El estado contiene "_contingencia_FF" (estado modificado por contingencia)
    // 2. O cuando el campo flete_falso es true (marcado explícitamente como flete falso)
    return embarque?.estado?.includes('_contingencia_FF') || embarque?.flete_falso === true;
  }, []);

  // Helper: verificar si un embarque tiene múltiples direcciones (lógica idéntica a asignar-operadores)
  const embarqueTieneMultiplesDirecciones = useCallback((embarque: any) => {
    let recolectasArray, entregasArray;
    
    // Prioridad 1: Obtener desde campos JSON (método principal)
    try {
      recolectasArray = embarque.recolectas_json ? JSON.parse(embarque.recolectas_json) : [];
      entregasArray = embarque.entregas_json ? JSON.parse(embarque.entregas_json) : [];
    } catch (jsonError) {
      recolectasArray = [];
      entregasArray = [];
    }
    
    // Prioridad 2: Si no hay datos JSON, extraer de observaciones (fallback)
    if (recolectasArray.length === 0 && entregasArray.length === 0) {
      if (embarque.observaciones && embarque.observaciones.includes('DIRECCIONES MÚLTIPLES')) {
        try {
          const { recolectas, entregas } = extraerDireccionesMultiples(embarque.observaciones);
          recolectasArray = recolectas.length > 0 ? recolectas : [{ direccion: embarque.direccion_recolecta }];
          entregasArray = entregas.length > 0 ? entregas : [{ direccion: embarque.direccion_entrega }];
        } catch (e) {
          console.warn('Error parseando direcciones múltiples desde observaciones:', e);
          recolectasArray = [{ direccion: embarque.direccion_recolecta }];
          entregasArray = [{ direccion: embarque.direccion_entrega }];
        }
      } else {
        // Sin múltiples direcciones, usar campos individuales
        recolectasArray = [{ direccion: embarque.direccion_recolecta }];
        entregasArray = [{ direccion: embarque.direccion_entrega }];
      }
    } else {
      // Si tenemos datos JSON pero están vacíos, usar datos principales
      if (recolectasArray.length === 0) recolectasArray = [{ direccion: embarque.direccion_recolecta }];
      if (entregasArray.length === 0) entregasArray = [{ direccion: embarque.direccion_entrega }];
    }
    
    return tieneMultiplesDirecciones(recolectasArray, entregasArray);
  }, [tieneMultiplesDirecciones]);

  // Helper: obtener el monto contable de un embarque (preferir precio_quickpaid si aplica)
  const getMontoContable = useCallback((e: EmbarqueAsignado | any) => {
    if (!e) return 0;
    // Si QuickPaid está activo y existe precio_quickpaid, usarlo (post-descuento)
    if (e?.quickpaid_enabled && (typeof e?.precio_quickpaid === "number" || typeof e?.precio_quickpaid === "string")) {
      return typeof e.precio_quickpaid === "number" ? e.precio_quickpaid : Number(e.precio_quickpaid) || 0;
    }
    // Si existe cantidad_final_facturada explícita usarla
    if (typeof e?.cantidad_final_facturada === "number") return e.cantidad_final_facturada;
    // Preferir precio_flete (puede venir como number o string) o alias precioFlete/montoFacturado
    if (typeof e?.precio_flete === "number") return e.precio_flete;
    if (typeof e?.precio_flete === "string") return Number(e.precio_flete) || 0;
    if (typeof e?.precioFlete === "number") return e.precioFlete;
    if (typeof e?.montoFacturado === "number") return e.montoFacturado;
    return 0;
  }, []);

  // Exportar detalle del embarque (todas las secciones) a CSV (compatible Excel)
  const exportarDetalleEmbarqueExcel = useCallback(() => {
    if (!embarqueDetalle) return;
    const c = getClienteById(embarqueDetalle.cliente_id);

    // Datos facturación 1..4
    const anyDet: any = embarqueDetalle;
    const facturas = [1, 2, 3, 4].map((i) => ({
      folio: anyDet[`folio_factura_${i}`] || anyDet[`numero_factura_${i}`] || "",
      envio: anyDet[`fecha_envio_cliente_${i}`] || (i === 1 ? anyDet["fecha_envio_cliente"] : ""),
      pago: anyDet[`fecha_pago_${i}`] || (i === 1 ? anyDet["fecha_pago"] : ""),
      ref: anyDet[`referencia_pago_${i}`] || (i === 1 ? anyDet["referencia_pago"] : ""),
    }));

    const rows: Record<string, string>[] = [];
    const push = (k: string, v: any) => rows.push({ Campo: k, Valor: v == null || v === "" ? "-" : String(v) });

    // General
    push("Folio", embarqueDetalle.folio);
    push("Cliente", embarqueDetalle.clienteNombre);
    push("Load", embarqueDetalle.load_number || "");
    push("Fecha Creación", embarqueDetalle.fecha_creacion ? new Date(embarqueDetalle.fecha_creacion).toLocaleDateString() : "");

    // Operativos/Facturación extra solicitados
    push("Patente Agente Aduanal", anyDet.patente_agente_aduanal || "");
    push("Aduana de cruce", anyDet.aduana_cruce || "");
  push("Cliente del Embarque", anyDet.dueno_mercancia || "");
    push("Contenido", anyDet.contenido || "");
    push("Peso (kg)", anyDet.peso || "");
    push("Carta Porte", anyDet.carta_porte || "");

    // Resumen facturación
    const monto = getMontoContable(anyDet) as number;
  push("Valor Facturado", `${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${anyDet.moneda_flete || "MXN"}`);
    push("Estado Facturación", anyDet.estado_facturacion || "pendiente_facturacion");
    push("Pagado", anyDet.pagado ? "Sí" : "No");
  push("Fecha Pago", anyDet.fecha_pago ? formatDateMatamoros(normalizeDate(anyDet.fecha_pago) || anyDet.fecha_pago) : "");
    push("Observaciones", anyDet.observacionesFacturacion || anyDet.observaciones_facturacion || "");

    // QuickPaid (incluye divisa)
    if (anyDet.quickpaid_enabled) {
      push("QuickPaid %", anyDet.quickpaid_percent ?? "");
      const monedaAny = anyDet.moneda_flete || "MXN";
      push(
        "Descuento QuickPaid",
        anyDet.quickpaid_descuento != null
          ? `${Number(anyDet.quickpaid_descuento).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${monedaAny}`
          : "-"
      );
      push(
        "Precio QuickPaid",
        anyDet.precio_quickpaid != null
          ? `${Number(anyDet.precio_quickpaid).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${monedaAny}`
          : "-"
      );
    }

    // Facturas
    facturas.forEach((f, idx) => {
      const n = idx + 1;
      push(`Factura ${n} - Folio`, f.folio);
      push(`Factura ${n} - Referencia`, f.ref);
  push(`Factura ${n} - Fecha envío`, f.envio ? formatDateMatamoros(normalizeDate(f.envio) || f.envio) : "");
  push(`Factura ${n} - Fecha pago`, f.pago ? formatDateMatamoros(normalizeDate(f.pago) || f.pago) : "");
    });

    // Cliente
    push("Cliente - RFC", c?.rfc || "");
    push("Cliente - Divisa de pago", c?.divisa_pago || c?.moneda_preferida || "");
    push("Cliente - Empresa facturadora", c?.empresa_facturadora || c?.razon_social || c?.nombre_comercial || "");
    const contactoNombre = anyDet.info_representante?.nombre || anyDet.representante_cliente || c?.contacto || "";
    const contactoTel = anyDet.info_representante?.telefono || c?.telefono || c?.telefono_contacto || "";
    const contactoEmail = anyDet.info_representante?.email || c?.correo || c?.correo_contacto || "";
    push("Cliente - Contacto", contactoNombre);
    push("Cliente - Teléfono", contactoTel);
    push("Cliente - Correo", contactoEmail);

    // Entrega
    push("Lugar de Recolecta", anyDet.direccion_recolecta || anyDet.direccionRecolecta || "");
    push("Lugar de Entrega", anyDet.direccion_entrega || anyDet.direccionEnganche || "");
  push("Fecha/Hora Recolecta", `${anyDet.fecha_recolecta ? formatDateMatamoros(normalizeDate(anyDet.fecha_recolecta) || anyDet.fecha_recolecta) : anyDet.fecha_recolecta || ""} ${anyDet.hora_recolecta || ""}`.trim());
  push("Fecha/Hora Entrega", `${anyDet.fecha_entrega ? formatDateMatamoros(normalizeDate(anyDet.fecha_entrega) || anyDet.fecha_entrega) : (anyDet.fechaEntrega || "")} ${anyDet.hora_entrega || ""}`.trim());

    // CSV
    const header = ["Campo", "Valor"]; 
    const csv = [header.join(",")].concat(
      rows.map((r) => `"${(r.Campo || "").replace(/"/g, '"')}","${(r.Valor || "").replace(/"/g, '"')}"`)
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `detalle_embarque_${embarqueDetalle.folio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [embarqueDetalle, getClienteById]);

  // Totales anuales (incluyen archivados) para que no disminuyan al archivar
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [yearlyFleteMXN, setYearlyFleteMXN] = useState<number>(0);
  const [yearlyFleteUSD, setYearlyFleteUSD] = useState<number>(0);

  useEffect(() => {
    mounted.current = true;
    const cargarTotalesAnuales = async () => {
      try {
        const desde = `${currentYear}-01-01`;
        const hasta = `${currentYear}-12-31`;
        // Traer todos los embarques del año (incluyendo archivados en facturación).
        // Filtrado fino se hace en el cliente para asegurar que incluimos los registros
        // que pertenecen a Facturación/Cobranza (estado_facturacion definido) y
        // también aquellos operativos finalizados.
        const { data, error } = await supabase
          .from("embarques")
          .select(
            `precio_flete, moneda_flete, fecha_creacion, cantidad_final_facturada, estado, estado_facturacion, quickpaid_enabled, precio_quickpaid`
          )
          .gte("fecha_creacion", desde)
          .lte("fecha_creacion", hasta);

        if (error) {
          console.error("Error cargando totales anuales:", error);
          return;
        }

  let sumMXN = 0;
  let sumUSD = 0;
  let fetchedCount = (data || []).length;
  console.log(`cargarTotalesAnuales: fetched ${fetchedCount} records from supabase for year ${currentYear}`);
        // Incluir sólo los embarques que estén dentro del flujo de Facturación/Cobranza
        // (tengan estado_facturacion definido, incluyendo 'archivado') o los que
        // estén marcados como operativamente 'finalizado'. Así nos aseguramos de
        // contabilizar también los archivados en facturación.
        let includedCount = 0;
        (data || []).forEach((e: any) => {
          const inFacturacion = e && e.estado_facturacion != null;
          const isFinalizado = String(e?.estado || "").toLowerCase().includes("finalizado");
          // Excluir embarques cancelados para que, si se cancelan en Asignación, se resten de los totales
          if (esCancelado(e)) {
            return; // omitimos embarques cancelados
          }
          if (!inFacturacion && !isFinalizado) return; // saltar registros no relevantes

          includedCount++;

          const currency = e?.moneda_flete || "MXN";
          // getMontoContable ya prioriza precio_quickpaid cuando quickpaid_enabled=true
          const monto = getMontoContable(e) || 0;
          if (currency === "USD") sumUSD += monto;
          else sumMXN += monto;
        });

        console.log(
          `cargarTotalesAnuales: included ${includedCount} records -> MXN: ${sumMXN}, USD: ${sumUSD}`
        );

        if (mounted.current) {
          setYearlyFleteMXN(sumMXN);
          setYearlyFleteUSD(sumUSD);
        }
      } catch (e) {
        console.error("Excepción al calcular totales anuales:", e);
      }
    };
    cargarTotalesAnuales();
    return () => {
      mounted.current = false;
    };
  }, [currentYear]);

  // Dataset para Análisis: incluir embarques ASIGNADOS y FINALIZADOS, excluyendo archivados en facturación
  const [embarquesAnaliticos, setEmbarquesAnaliticos] = useState<EmbarqueAsignado[]>([]);
  useEffect(() => {
    let active = true;
    const cargarEmbarquesAnaliticos = async () => {
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
          .or("estado.ilike.finalizado%,estado.ilike.asignado%,estado.ilike.cancel%")
          .or("estado_facturacion.is.null,estado_facturacion.neq.archivado")
          .order("fecha_creacion", { ascending: false });

        if (error) {
          console.error("Error cargando embarques analíticos:", error?.message || error);
          if (active) setEmbarquesAnaliticos([]);
          return;
        }

        const embarquesFormateados: EmbarqueAsignado[] = (data || []).map(
          (embarque) => ({
            ...embarque,
            precioFlete:
              typeof (embarque as any).precio_flete === "string"
                ? Number((embarque as any).precio_flete)
                : typeof (embarque as any).precio_flete === "number"
                ? (embarque as any).precio_flete
                : undefined,
            clienteNombre:
              embarque.cliente?.nombre || "Cliente no especificado",
            fechaAsignacion: embarque.fecha_creacion,
            operadorAsignado: embarque.operador
              ? {
                  id: embarque.operador.id || "",
                  nombre: `${embarque.operador.nombre || ""} ${
                    embarque.operador.apellidos || ""
                  }`.trim(),
                }
              : { id: "", nombre: "Sin asignar" },
            camionAsignado: embarque.camion
              ? {
                  id: embarque.camion.id || "",
                  marca: embarque.camion.marca || "",
                  modelo: embarque.camion.modelo || "",
                  numeroEconomico: embarque.camion.numero_economico || "",
                }
              : {
                  id: "",
                  marca: "Sin asignar",
                  modelo: "",
                  numeroEconomico: "",
                },
          })
        );
        if (active) setEmbarquesAnaliticos(embarquesFormateados);
      } catch (e: any) {
        console.error("Excepción cargando embarques analíticos:", e?.message || e);
        if (active) setEmbarquesAnaliticos([]);
      }
    };
    cargarEmbarquesAnaliticos();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const cargarEmbarquesFacturados = async () => {
      setLoadingEmbarques(true);
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
          // Incluir embarques finalizados, archivados o en tránsito (a nivel operativo), sin excluir archivados de facturación
          .or("estado.ilike.finalizado%,estado.ilike.archivado%,estado.ilike.transito%,estado.ilike.en%20transito%,estado.ilike.cancel%")
          .order("fecha_creacion", { ascending: false });

        if (error) {
          console.error("Error cargando embarques facturados:", error);
          if (mounted.current) setEmbarquesAsignados([]);
        } else {
          const embarquesFormateados: EmbarqueAsignado[] = (data || []).map(
            (embarque) => ({
              ...embarque,
              // Normalizamos monto flete a número cuando venga como string
              precioFlete:
                typeof (embarque as any).precio_flete === "string"
                  ? Number((embarque as any).precio_flete)
                  : typeof (embarque as any).precio_flete === "number"
                  ? (embarque as any).precio_flete
                  : undefined,
              clienteNombre:
                embarque.cliente?.nombre || "Cliente no especificado", // Corrected field name
              // Normalizamos fechaAsignacion para usarla en filtros/orden
              fechaAsignacion: embarque.fecha_creacion,
              operadorAsignado: embarque.operador
                ? {
                    id: embarque.operador.id,
                    nombre: `${embarque.operador.nombre} ${
                      embarque.operador.apellidos || ""
                    }`.trim(),
                  }
                : { id: "", nombre: "Sin asignar" },
              camionAsignado: embarque.camion
                ? {
                    id: embarque.camion.id,
                    marca: embarque.camion.marca,
                    modelo: embarque.camion.modelo,
                    numeroEconomico: embarque.camion.numero_economico,
                  }
                : {
                    id: "",
                    marca: "Sin asignar",
                    modelo: "",
                    numeroEconomico: "",
                  },
              // Columnas legacy eliminadas - usar facturas_json
              fecha_envio_cliente: embarque.fecha_envio_cliente,
              fecha_pago: embarque.fecha_pago,
              referencia_pago: embarque.referencia_pago,
              observacionesFacturacion: (embarque as any)
                .observaciones_facturacion,
              fecha_creacion: embarque.fecha_creacion,
              direccionRecolecta: embarque.direccion_recolecta || "",
              direccionEnganche: embarque.direccion_entrega || "",
              // Operativos extra
              patente_agente_aduanal: (embarque as any).patente_agente_aduanal || (embarque as any).patente || "",
              aduana_cruce: (embarque as any).aduana_cruce || (embarque as any).aduana || "",
              dueno_mercancia: (embarque as any).dueno_mercancia || (embarque as any).dueno || "",
              contenido: (embarque as any).contenido || "",
              peso: (embarque as any).peso ?? (embarque as any).peso_kg ?? "",
            })
          );
          if (mounted.current) setEmbarquesAsignados(embarquesFormateados);
        }
      } catch (error) {
        console.error("Error cargando embarques facturados:", error);
        if (mounted.current) setEmbarquesAsignados([]);
      } finally {
        if (mounted.current) setLoadingEmbarques(false);
      }
    };
    cargarEmbarquesFacturados();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const loadClientsFromDatabase = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from("clientes")
          .select("*")
          .eq("estado", "activo")
          .order("nombre");

        if (clientesError) {
          console.error("Error loading clients:", clientesError);
          const clientesGuardados = JSON.parse(
            localStorage.getItem("clientes") || "[]"
          );
          if (mounted.current) setClientes(clientesGuardados);
        } else {
          if (mounted.current) setClientes(clientesData || []);
        }

        const { data: creditosData, error: creditosError } = await supabase
          .from("creditos_clientes")
          .select("cliente_id, limite_credito_usd, limite_credito_mxn")
          .eq("activo", true);
        if (creditosError) {
          // Si la tabla no existe o no hay filas, no bloqueamos la UI; usamos caché local
          const code = (creditosError as any)?.code;
          if (code && code !== "PGRST116") {
            console.error("Error loading credit limits:", creditosError);
          }
          const creditosGuardados = JSON.parse(
            localStorage.getItem("creditLimits") || "{}"
          );
          if (mounted.current) setCreditLimits(creditosGuardados);
        } else {
          const creditLimitsMap: {
            [key: string]: { usd: number; mxn: number };
          } = {};
          (creditosData || []).forEach((credito: any) => {
            if (!credito?.cliente_id) return;
            creditLimitsMap[String(credito.cliente_id)] = {
              usd: Number(credito.limite_credito_usd) || 0,
              mxn: Number(credito.limite_credito_mxn) || 0,
            };
          });
          if (mounted.current) setCreditLimits(creditLimitsMap);
        }
      } catch (error) {
        console.error("Error in loadClientsFromDatabase:", error);
        const clientesGuardados = JSON.parse(
          localStorage.getItem("clientes") || "[]"
        );
        const creditosGuardados = JSON.parse(
          localStorage.getItem("creditLimits") || "{}"
        );
        if (mounted.current) {
          setClientes(clientesGuardados);
          setCreditLimits(creditosGuardados);
        }
      }
    };

    loadClientsFromDatabase();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const loadTiposServicio = async () => {
      setLoadingTiposServicio(true);
      try {
        const tiposData = await obtenerTiposServicio();
        if (mounted.current) {
          setTiposServicio(tiposData || []);
          // Validar automáticamente qué tipos se pueden eliminar
          if ((tiposData || []).length > 0) {
            setTimeout(() => validateTiposServicioForDeletion(), 500);
          }
        }
      } catch (error) {
        console.error("Error loading tipos de servicio:", error);
        const tiposDefault: TipoServicio[] = [
          {
            id: "exportacion-cargada-caja-seca-240",
            nombre: "EXPORTACIÓN CARGADA - CAJA SECA 240",
            precio_base: 1800,
            es_flete_falso: false,
            descripcion:
              "Servicio de exportación con contenedor de caja seca cargada - Zona 240",
            activo: true,
            fecha_creacion: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "importacion-cargada-caja-seca-240",
            nombre: "IMPORTACIÓN CARGADA - CAJA SECA 240",
            precio_base: 1700,
            es_flete_falso: false,
            descripcion:
              "Servicio de importación con contenedor de caja seca cargada - Zona 240",
            activo: true,
            fecha_creacion: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "otro",
            nombre: "OTRO",
            precio_base: 0,
            es_flete_falso: false,
            descripcion:
              "Servicio personalizado según necesidades específicas del cliente",
            activo: true,
            fecha_creacion: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        if (mounted.current) {
          setTiposServicio(tiposDefault);
          // Validar automáticamente qué tipos se pueden eliminar
          setTimeout(() => validateTiposServicioForDeletion(), 500);
        }
      } finally {
        if (mounted.current) setLoadingTiposServicio(false);
      }
    };

    loadTiposServicio();
    return () => {
      mounted.current = false;
    };
  }, []);

  // Nota: El precio de "Flete en Falso" ahora se edita directamente en la tabla de Tipos de Servicio.

  const operadoresUnicos = Array.from(
    new Set(
      (embarquesAnaliticos || [])
        .filter((e: any) => e?.estado_facturacion !== "archivado")
        .flatMap((e: any) => [
          e?.operadorAsignado?.nombre,
          (e as any)?.operadorOriginalNombre,
          (e as any)?.operadorReemplazoNombre,
        ])
        .filter(Boolean) as string[]
    )
  )
    .map((nombre) => {
      const fuente = (embarquesAnaliticos || []).find(
        (e: any) =>
          e?.operadorAsignado?.nombre === nombre ||
          (e as any)?.operadorOriginalNombre === nombre ||
          (e as any)?.operadorReemplazoNombre === nombre
      );
      return fuente?.operadorAsignado?.nombre === nombre
        ? fuente.operadorAsignado
        : { id: "", nombre };
    })
    .filter((op): op is { id: string; nombre: string } => Boolean(op?.nombre));

  const embarquesFiltrados = (embarquesAsignados || []).filter((embarque: EmbarqueAsignado) => {
    if (!embarque) return false;
    // Mostrar embarques finalizados, archivados o cancelados (operativo). Sólo se ocultan si están archivados en facturación
    const estadoNorm = String(embarque.estado || "").trim().toLowerCase();
    if (!(estadoNorm.startsWith("finalizado") || estadoNorm.startsWith("archivado") || estadoNorm === "cancelado")) return false;
    if (embarque.estado_facturacion === "archivado") return false;

    const currentSearchTerm = searchTerm || "";

    const coincideBusqueda =
      String(embarque.folio || "")
        .toLowerCase()
        .includes(currentSearchTerm.toLowerCase()) ||
      String(embarque.clienteNombre || "")
        .toLowerCase()
        .includes(currentSearchTerm.toLowerCase()) ||
      String(embarque.numeroLoad || "")
        .toLowerCase()
        .includes(currentSearchTerm.toLowerCase()) ||
      String(embarque.operadorAsignado?.nombre || "")
        .toLowerCase()
        .includes(currentSearchTerm.toLowerCase());

    const coincideOperador =
      filtroOperador === "todos" ||
      embarque.operadorAsignado?.nombre === filtroOperador;

    const coincideEstado =
      filtroEstado === "todos" ||
      String(embarque.estado || "").trim().toLowerCase().startsWith(filtroEstado.toLowerCase());

    const coincideFecha =
      !filtroFecha ||
      new Date(embarque.fechaAsignacion || "") >= new Date(filtroFecha);

    const coincideFechaHasta =
      !filtroFechaHasta ||
      new Date(embarque.fechaAsignacion || "") <= new Date(filtroFechaHasta);

    return (
      coincideBusqueda &&
      coincideOperador &&
      coincideEstado &&
      coincideFecha &&
      coincideFechaHasta
    );
  });

  // Ordenar y paginar (mismo patrón que Crear Embarques / Asignar Operadores)
  const embarquesOrdenados = [...embarquesFiltrados].sort((a, b) => {
    const da = new Date((a.fechaAsignacion as any) || a.fecha_creacion || a.updated_at || 0).getTime();
    const db = new Date((b.fechaAsignacion as any) || b.fecha_creacion || b.updated_at || 0).getTime();
    return db - da;
  });
  const totalListaPages = Math.max(1, Math.ceil(embarquesOrdenados.length / Math.max(1, listaPageSize)));
  useEffect(() => {
    if (listaPage > totalListaPages) setListaPage(totalListaPages);
  }, [totalListaPages]);
  useEffect(() => {
    setListaPage(1);
  }, [searchTerm, filtroOperador, filtroEstado, filtroFecha, filtroFechaHasta, listaPageSize]);
  const listaStart = (listaPage - 1) * listaPageSize;
  const listaEnd = listaStart + listaPageSize;
  const embarquesPaginados = embarquesOrdenados.slice(listaStart, listaEnd);

  const saveCreditLimit = async (
    clienteId: string,
    currency: "usd" | "mxn",
    limit: number
  ) => {
    const currentLimits = creditLimits[clienteId] || { usd: 0, mxn: 0 };
    const newLimits = {
      ...creditLimits,
      [clienteId]: {
        ...currentLimits,
        [currency]: limit,
      },
    };
    if (mounted.current) setCreditLimits(newLimits);
    localStorage.setItem("creditLimits", JSON.stringify(newLimits));

    try {
      const { data: existingRecord, error: selectError } = await supabase
        .from("creditos_clientes")
        .select("id")
        .eq("cliente_id", clienteId)
        .single();
      // PGRST116 = no rows; en ese caso seguimos para insertar
      if (selectError && (selectError as any)?.code !== "PGRST116") {
        console.error("Error checking existing credit limit:", selectError);
      }

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("creditos_clientes")
          .update({
            limite_credito_usd: newLimits[clienteId].usd,
            limite_credito_mxn: newLimits[clienteId].mxn,
            updated_at: new Date().toISOString(),
          })
          .eq("cliente_id", clienteId);

        if (updateError) {
          console.error("Error updating credit limits:", updateError);
        }
  } else {
        const { error: insertError } = await supabase
          .from("creditos_clientes")
          .insert({
            cliente_id: clienteId,
            limite_credito_usd: newLimits[clienteId].usd,
            limite_credito_mxn: newLimits[clienteId].mxn,
            activo: true,
          });

        if (insertError) {
          console.error("Error inserting credit limits:", insertError);
        }
      }
    } catch (error) {
      console.error("Error saving credit limits to database:", error);
    }
  };

  const checkCreditExceeded = (
    clienteNombre: string,
    montoFacturado: number,
    moneda_flete: "MXN" | "USD" = "MXN"
  ) => {
    if (!clienteNombre || !clientes || clientes.length === 0) {
      return { exceeded: false, message: "" };
    }

    const cliente = clientes.find((c) => c?.nombre === clienteNombre); // Corrected field name
    if (!cliente) return { exceeded: false, message: "" };

    const clienteLimits = creditLimits?.[cliente.id] || { usd: 0, mxn: 0 };

    const clienteEmbarquesUSD = (embarquesFiltrados || []).filter(
      (e) =>
        e?.clienteNombre === clienteNombre &&
        !e?.pagado &&
        e?.moneda_flete === "USD"
    );
    const clienteEmbarquesMXN = (embarquesFiltrados || []).filter(
      (e) =>
        e?.clienteNombre === clienteNombre &&
        !e?.pagado &&
        (e?.moneda_flete === "MXN" || !e?.moneda_flete)
    );

    const totalPendienteUSD = clienteEmbarquesUSD.reduce(
      (sum, e) => sum + getMontoContable(e),
      0
    );
    const totalPendienteMXN = clienteEmbarquesMXN.reduce(
      (sum, e) => sum + getMontoContable(e),
      0
    );

    const isExceededUSD =
      totalPendienteUSD > clienteLimits.usd && clienteLimits.usd > 0;
    const isExceededMXN =
      totalPendienteMXN > clienteLimits.mxn && clienteLimits.mxn > 0;

    if (isExceededUSD || isExceededMXN) {
      return { exceeded: true, message: "Crédito excedido" };
    }

    return { exceeded: false, message: "" };
  };

  const guardarTipoServicio = async (
    tipoId: string,
    nuevoMonto: number
  ) => {
    try {
      const payload: any = { precio_base: nuevoMonto, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("tipos_servicio")
        .update(payload)
        .eq("id", tipoId);

      if (error) {
        console.error("Error updating tipo servicio:", error);
        toast({ title: 'Error al actualizar el tipo de servicio', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al actualizar el tipo de servicio', description: String((error as any)?.message || ''), variant: 'default' });
        return;
      }

      if (mounted.current) {
        setTiposServicio((prev) => prev.map((tipo) => tipo.id === tipoId ? { ...tipo, precio_base: nuevoMonto } : tipo));
      }
    } catch (error) {
      console.error("Error:", error);
      toast({ title: 'Error al actualizar el tipo de servicio', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al actualizar el tipo de servicio', description: String((error as any)?.message || ''), variant: 'default' });
    }
  };

  // Componente local: fila de detalles con candado y guardar
  function DetallesTipoRow({
    tipo,
    onSave,
  }: {
    tipo: TipoServicio;
      onSave: (monto: number) => void;
  }) {
    const [locked, setLocked] = useState(true);
  const isFleteFalso = esTipoServicioFleteFalso(tipo);
    const [value, setValue] = useState<number>(obtenerMontoTipoServicio(tipo));
    const [saving, setSaving] = useState(false);
    const readOnly = false;

    useEffect(() => {
      // si el tipo cambia externamente, sincronizar el input
      setValue(obtenerMontoTipoServicio(tipo));
    }, [tipo]);

    const handleSave = async () => {
      const monto = Number(value) || 0;
      setSaving(true);
      try {
        await onSave(monto);
        // después de guardar, volver a bloquear
        setLocked(true);
      } catch (e) {
        console.error('Error guardando detalle tipo:', e);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="flex items-center justify-end gap-2">
        <Input
          type="number"
          value={String(value)}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-28 text-right"
          disabled={locked || readOnly}
          title={"Monto a pagar al operador para este tipo"}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={() => { if (!readOnly) setLocked((l) => !l); }}
          title={locked ? 'Desbloquear para editar' : 'Bloquear'}
        >
          {locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={locked || saving || readOnly}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    );
  }

  const normalizarIdDesdeNombre = (nombre: string) => {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 100);
  };

  const crearNuevoTipoServicio = async () => {
    if (!nuevoTipo.nombre.trim()) {
      toast({ title: 'Ingresa un nombre para el tipo de servicio', variant: 'destructive' });
  toast({ title: 'Ingresa un nombre para el tipo de servicio', variant: 'default' });
      return;
    }
    setGuardandoNuevoTipo(true);
    try {
      // Generar slug legible y evitar colisiones básicas con nombres existentes
      const baseSlug = normalizarIdDesdeNombre(nuevoTipo.nombre);
      const existingSlugs = new Set(
        (tiposServicio || []).map((t) => normalizarIdDesdeNombre(t.nombre))
      );
      let finalSlug = baseSlug;
      if (existingSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }

      const payload = {
        slug: finalSlug,
        nombre: nuevoTipo.nombre.trim(),
        descripcion: nuevoTipo.descripcion.trim() || null,
        categoria: (nuevoTipo.categoria || "General").trim(),
        subcategoria: nuevoTipo.subcategoria.trim() || null,
        precio_base: Number(nuevoTipo.precio_base) || 0,
        activo: true,
        orden_display: (tiposServicio?.length || 0) + 1,
        updated_at: new Date().toISOString(),
      } as any;

      const { data: created, error } = await supabase
        .from("tipos_servicio")
        .insert(payload)
  .select("id, slug, nombre, descripcion, categoria, subcategoria, precio_base, activo, orden_visualizacion, orden_display, fecha_creacion, updated_at")
        .single();
      if (error) {
        console.error("Error creando tipo de servicio:", error);
        toast({ title: 'No se pudo crear el tipo de servicio', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'No se pudo crear el tipo de servicio', description: String((error as any)?.message || ''), variant: 'default' });
        return;
      }

      // Actualizar lista local con el UUID real
      const nuevo: TipoServicio = {
        id: created.id,
        nombre: created.nombre,
        descripcion: created.descripcion || undefined,
        categoria: created.categoria,
        subcategoria: created.subcategoria || undefined,
        precio_base: created.precio_base,
        // Campos eliminados: es_flete_falso, pago_operador_flete_falso
        activo: !!created.activo,
        orden_visualizacion: created.orden_visualizacion ?? created.orden_display,
        fecha_creacion: created.fecha_creacion || new Date().toISOString(),
        updated_at: created.updated_at || payload.updated_at,
      } as TipoServicio;
      if (mounted.current) {
        setTiposServicio((prev) => [...prev, nuevo]);
        setShowCrearTipoModal(false);
        setNuevoTipo({ nombre: "", descripcion: "", categoria: "", subcategoria: "", precio_base: 0, es_flete_falso: false });
        // Notificar creación en verde
        toast({ title: 'Tipo de servicio creado', description: nuevo.nombre, variant: 'success' });
        // Re-validar automáticamente después de crear
        setTimeout(() => validateTiposServicioForDeletion(), 1000);
      }
    } catch (e) {
      console.error(e);
  toast({ title: 'Ocurrió un error creando el tipo de servicio.', description: String((e as any)?.message || ''), variant: 'default' });
    } finally {
      if (mounted.current) setGuardandoNuevoTipo(false);
    }
  };

  const eliminarTipoServicio = async (tipo: TipoServicio) => {
    // Confirmación de eliminación definitiva: se permite si NO hay embarques activos (no archivados)
    // Si sólo hay embarques archivados/cancelados, intentaremos eliminar el tipo.
    // Nota: Si la base de datos impide eliminar por integridad referencial, se mostrará un error.
    setTipoPending(tipo);
    setConfirmAction('delete');
    setConfirmDialogMessage(
      `¿Eliminar el tipo de servicio "${tipo.nombre}"?\n` +
      `Se eliminará definitivamente si únicamente está referenciado por embarques archivados o por embarques cancelados. ` +
      `Si existe algún embarque activo (no archivado y no cancelado), la eliminación se cancelará y se mostrará la lista de embarques en uso.`
    );
    setConfirmDialogOpen(true);
  };

  // =======================
  // FUNCIONES FLETE FALSO
  // =======================

  // Helper para formatear precio en estilo mexicano
  const formatearPrecioMexicano = (num: number): string => {
    return num.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Helper para parsear precio mexicano a número
  const parsearPrecioMexicano = (str: string): number => {
    // Remover comas y convertir a número
    const cleaned = str.replace(/,/g, '');
    return Number(cleaned);
  };

  // Reemplazar cargarPrecioFleteFalso para usar API server-side
  const cargarPrecioFleteFalso = async () => {
    try {
      const res = await fetch('/api/config/flete-falso', { cache: 'no-store' });
      if (!res.ok) throw new Error('API no ok');
      const json = await res.json();
      const precio = Number(json?.precio);
      setPrecioFleteFalso(!isNaN(precio) ? formatearPrecioMexicano(precio) : '800.00');
    } catch (error) {
      console.warn('No se pudo cargar precio global, usando 800.00');
      setPrecioFleteFalso('800.00');
    }
  };

  // Reemplazar guardarPrecioFleteFalso para usar API server-side
  const guardarPrecioFleteFalso = async () => {
    if (guardandoPrecioFlete) return;

    const precio = parsearPrecioMexicano(precioFleteFalso);
    if (isNaN(precio) || precio <= 0) {
      toast({
        title: 'Error',
        description: 'El precio debe ser un número mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    setGuardandoPrecioFlete(true);
    try {
      const res = await fetch('/api/config/flete-falso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio, usuario: 'usuario' }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data?.error || 'Error desconocido';
        const errorDetails = data?.details || data;
        console.error('Error detallado al guardar:', errorDetails);
        
        // Si la tabla no existe, sugerir ejecutar el script
        if (errorMsg.includes('does not exist') || errorMsg.includes('no existe')) {
          throw new Error('La tabla configuracion_sistema no existe. Ejecuta el script 107-crear-configuracion-sistema.sql en Supabase.');
        }
        
        throw new Error(errorMsg);
      }

      toast({
        title: 'Precio actualizado',
        description: `El precio de flete en falso ahora es $${formatearPrecioMexicano(precio)}`,
        variant: 'success',
      });
      setShowConfigurarFleteModal(false);
    } catch (error) {
      console.error('Error guardando precio flete falso:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar el precio. Intenta de nuevo.';
      toast({
        title: 'Error al guardar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setGuardandoPrecioFlete(false);
    }
  };

  // Cargar precio cuando se abre el modal
  useEffect(() => {
    if (showConfigurarFleteModal) {
      cargarPrecioFleteFalso();
    }
  }, [showConfigurarFleteModal]);

  // Cargar embarques que usan este tipo (activos para facturación: estado_facturacion != archivado o null)
  const cargarUsosTipo = async (tipo: TipoServicio) => {
    setUsosTipo(tipo);
    setShowUsosModal(true);
    setUsosLoading(true);
    setUsosEmbarques([]);
    try {
      // Cargamos embarques por tipo y filtramos en cliente los "activos" segun reglas
      const { data, error } = await supabase
        .from('embarques')
        .select('id, folio, estado, estado_facturacion')
        .eq('tipo_servicio_id', tipo.id)
        .order('fecha_creacion', { ascending: false })
        .limit(200);
      if (error) {
        console.error('Error cargando usos de tipo:', error);
        toast({ title: 'No se pudieron cargar los embarques en uso', description: String((error as any)?.message || ''), variant: 'destructive' });
        return;
      }
      // Mapear todos los embarques que referencian este tipo y marcar si bloquean la eliminación
      const todos = (data || []).map((r: any) => {
        const ef = r?.estado_facturacion ?? null;
        const estado = (r?.estado || '').toString().toLowerCase();
        const esActivoPorEF = ef === 'pendiente_facturacion' || ef === 'facturado' || ef === 'pagado';
        const esActivoPorNull = (ef === null || ef === undefined) && estado !== 'cancelado';
        const bloquea = !!(esActivoPorEF || esActivoPorNull);
        return {
          id: String(r.id),
          folio: String(r.folio || ''),
          estado: r.estado ?? null,
          estado_facturacion: r.estado_facturacion ?? null,
          bloquea,
        };
      });
      setUsosEmbarques(todos);
    } catch (e) {
      console.error('Excepción cargando usos de tipo:', e);
      toast({ title: 'Error inesperado', description: String((e as any)?.message || ''), variant: 'destructive' });
    } finally {
      setUsosLoading(false);
    }
  };

  const abrirEditarTipo = (tipo: TipoServicio) => {
    setTipoEditando(tipo);
    setEditarTipo({
      nombre: tipo.nombre || "",
      descripcion: (tipo as any).descripcion || "",
      categoria: (tipo as any).categoria || "",
      subcategoria: (tipo as any).subcategoria || "",
      es_flete_falso: false,
    });
    setShowEditarTipoModal(true);
  };

  const guardarEdicionTipo = async () => {
    if (!tipoEditando) return;
    if (!editarTipo.nombre.trim()) {
      toast({ title: 'Ingresa un nombre para el tipo de servicio', variant: 'destructive' });
      return;
    }
    setGuardandoEdicionTipo(true);
    try {
      const payload: any = {
        nombre: editarTipo.nombre.trim(),
        descripcion: editarTipo.descripcion.trim() || null,
        categoria: (editarTipo.categoria || 'General').trim(),
        subcategoria: editarTipo.subcategoria.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('tipos_servicio')
        .update(payload)
        .eq('id', tipoEditando.id);
      if (error) {
        console.error('Error actualizando tipo de servicio:', error);
        toast({ title: 'No se pudo actualizar el tipo de servicio', description: String((error as any)?.message || ''), variant: 'destructive' });
        return;
      }
      // Update local list
      setTiposServicio((prev) => prev.map((t: TipoServicio) => t.id === tipoEditando.id ? {
        ...t,
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? undefined,
        categoria: payload.categoria,
        subcategoria: payload.subcategoria ?? undefined,
        updated_at: payload.updated_at,
      } : t));
      setShowEditarTipoModal(false);
      setTipoEditando(null);
      toast({ title: 'Tipo de servicio actualizado', description: payload.nombre, variant: 'success' });
    } catch (e) {
      console.error('Excepción actualizando tipo de servicio:', e);
      toast({ title: 'Ocurrió un error', description: String((e as any)?.message || ''), variant: 'destructive' });
    } finally {
      setGuardandoEdicionTipo(false);
    }
  };

  const performDeactivate = async (tipo: TipoServicio) => {
    try {
      const { error: inactError } = await supabase
        .from("tipos_servicio")
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq("id", tipo.id);
      if (inactError) {
        console.error("Error desactivando tipo de servicio:", inactError);
        toast({ title: 'No se pudo desactivar el tipo de servicio', description: String((inactError as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'No se pudo desactivar el tipo de servicio', description: String((inactError as any)?.message || ''), variant: 'default' });
        return;
      }
      if (mounted.current) {
        // Remover de la lista para ocultarlo inmediatamente en el modal
        setTiposServicio((prev) => prev.filter((t) => t.id !== tipo.id));
      }
      // Notificar como eliminación lógica
      toast({ title: 'Tipo de servicio eliminado', description: 'Se desactivó y ocultó. Embarques existentes no se modifican.', variant: 'destructive' });
      // Re-validar automáticamente después de desactivar
      setTimeout(() => validateTiposServicioForDeletion(), 1000);
    } catch (e) {
      console.error("Error inesperado desactivando tipo:", e);
      toast({ title: 'Error inesperado', description: String((e as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error inesperado', description: String((e as any)?.message || ''), variant: 'default' });
    }
  };

  // Función para validar qué tipos de servicios se pueden eliminar
  const validateTiposServicioForDeletion = async () => {
    if (!tiposServicio.length) return;
    
    setLoadingValidation(true);
    const validationInfo: {[key: string]: {canDelete: boolean, reason: string, embarquesCount: number}} = {};
    
    try {
      for (const tipo of tiposServicio) {
        try {
          // Verificar referencias en múltiples tablas
          const checks = await Promise.all([
            // Tabla principal embarques
            supabase.from('embarques')
              .select('id', { count: 'exact', head: true })
              .eq('tipo_servicio_id', tipo.id)
              .neq('estado', 'cancelado'),
            
            // Tabla embarques_servicios (nueva estructura)
            supabase.from('embarques_servicios')
              .select('id', { count: 'exact', head: true })
              .eq('tipo_servicio_id', tipo.id),
              
            // Tabla embarques_financiero (nueva estructura)
            supabase.from('embarques_financiero')
              .select('id', { count: 'exact', head: true })
              .eq('tipo_servicio_id', tipo.id)
          ]);

          const embarquesCount = (checks[0].count || 0);
          const serviciosCount = (checks[1].count || 0);
          const financieroCount = (checks[2].count || 0);
          const totalReferences = embarquesCount + serviciosCount + financieroCount;

          if (totalReferences > 0) {
            let reason = '';
            if (embarquesCount > 0) reason += `${embarquesCount} embarque(s) activos`;
            if (serviciosCount > 0) reason += `${reason ? ', ' : ''}${serviciosCount} servicio(s) configurados`;
            if (financieroCount > 0) reason += `${reason ? ', ' : ''}${financieroCount} registro(s) financieros`;
            
            validationInfo[tipo.id] = {
              canDelete: false,
              reason: `En uso por ${reason}`,
              embarquesCount: totalReferences
            };
          } else {
            // Verificar si es el único tipo activo
            const activeTipos = tiposServicio.filter(t => t.activo && t.id !== tipo.id);
            if (activeTipos.length === 0) {
              validationInfo[tipo.id] = {
                canDelete: false,
                reason: 'Es el único tipo de servicio activo',
                embarquesCount: 0
              };
            } else {
              validationInfo[tipo.id] = {
                canDelete: true,
                reason: 'Sin referencias, se puede eliminar',
                embarquesCount: 0
              };
            }
          }
        } catch (error) {
          console.error(`Error validando tipo ${tipo.nombre}:`, error);
          validationInfo[tipo.id] = {
            canDelete: false,
            reason: 'Error al verificar referencias',
            embarquesCount: 0
          };
        }
      }
      
      setTipoValidationInfo(validationInfo);
    } catch (error) {
      console.error('Error general en validación:', error);
      toast({ 
        title: 'Error validando tipos de servicio', 
        description: 'No se pudo verificar qué tipos se pueden eliminar',
        variant: 'destructive' 
      });
    } finally {
      setLoadingValidation(false);
    }
  };

  const performDelete = async (tipo: TipoServicio) => {
    try {
      // Traer embarques que referencian este tipo para evaluarlos cliente-side
      const { data, error } = await supabase
        .from('embarques')
        .select(
          `id, folio, estado, estado_facturacion, observaciones, observaciones_facturacion, motivo_cancelacion, fecha_cancelacion, cancelado_por`
        )
        .eq('tipo_servicio_id', tipo.id)
        .order('fecha_creacion', { ascending: false })
        .limit(1000);
      if (error) {
        // Algunos errores de supabase en el cliente llegan como {} y no contienen message.
        const errString = typeof error === 'object' ? JSON.stringify(error) : String(error);
        console.error('Error cargando embarques para verificación:', errString, error);
        // Intentar fallback: usar conteos previos (server-side RPC o count queries)
        try {
          const { count: countA, error: errA } = await supabase
            .from('embarques')
            .select('id', { count: 'exact', head: true })
            .eq('tipo_servicio_id', tipo.id)
            .in('estado_facturacion', ['pendiente_facturacion', 'facturado', 'pagado']);
          const { count: countB, error: errB } = await supabase
            .from('embarques')
            .select('id', { count: 'exact', head: true })
            .eq('tipo_servicio_id', tipo.id)
            .is('estado_facturacion', null)
            .neq('estado', 'cancelado');
          if (errA || errB) {
            console.error('Fallback counts failed', errA || errB);
            toast({ title: 'No se pudo verificar el uso del tipo de servicio', description: errString, variant: 'destructive' });
            return;
          }
          const totalActivos = (countA || 0) + (countB || 0);
          if (totalActivos > 0) {
            toast({ title: 'No se puede eliminar', description: `Este tipo de servicio está en uso por ${totalActivos} embarque(s) activos que impiden la eliminación.`, variant: 'destructive' });
            try { await cargarUsosTipo(tipo as any); } catch {}
            return;
          }
          // continuar al intento de borrado
        } catch (fallbackErr) {
          console.error('Error en fallback de verificación de usos:', fallbackErr);
          toast({ title: 'No se pudo verificar el uso del tipo de servicio', description: String((fallbackErr as any)?.message || ''), variant: 'destructive' });
          return;
        }
      }

      // Evaluar qué embarques bloquean: aplicar la misma lógica usada en cargarUsosTipo
      const candidatos = (data || []) as any[];
      const bloqueantes = candidatos.filter((r) => {
        // si el embarque está claramente cancelado según la heurística, NO bloquea
        if (esCancelado(r)) return false;
        const ef = r?.estado_facturacion ?? null;
        const estado = (r?.estado || '').toString().toLowerCase();
        const esActivoPorEF = ef === 'pendiente_facturacion' || ef === 'facturado' || ef === 'pagado';
        const esActivoPorNull = (ef === null || ef === undefined) && estado !== 'cancelado';
        return !!(esActivoPorEF || esActivoPorNull);
      });

      if ((bloqueantes?.length || 0) > 0) {
        const msg = `Este tipo de servicio está en uso por ${bloqueantes.length} embarque(s) activos que impiden la eliminación.`;
        toast({ title: 'No se puede eliminar', description: msg, variant: 'destructive' });
        try { await cargarUsosTipo(tipo); } catch {}
        return;
      }

      // No hay bloqueantes activos (podrían existir solo archivados o cancelados). Intentar eliminar físicamente.
      // Intentar eliminar y capturar detalles
      const delRes = await supabase.from('tipos_servicio').delete().eq('id', tipo.id).select();
      const delError = (delRes as any)?.error || null;
      if (delError) {
        const delStr = typeof delError === 'object' ? JSON.stringify(delError) : String(delError);
        console.error('Error eliminando tipo de servicio:', delStr, delError);
        const code = (delError as any)?.code;
        // Si es FK violation o mensaje de llave foránea, desactivar en su lugar
        if (code === '23503' || (delError as any)?.message?.includes('violates foreign key')) {
          toast({ title: 'No se pudo eliminar por referencias históricas', description: 'Se desactivará y ocultará para mantener la integridad de datos.', variant: 'destructive' });
          await performDeactivate(tipo);
          return;
        }
        // Si la respuesta es un objeto vacío ({}), intentar desactivar como fallback seguro
        if (delStr === '{}' || delStr === '') {
          console.warn('Respuesta de eliminación ambigua, se realizará desactivación como fallback.');
          await performDeactivate(tipo);
          return;
        }
        toast({ title: 'Error al eliminar el tipo de servicio', description: 'Puede estar protegido por integridad de datos. (' + (delStr || 'error desconocido') + ')', variant: 'destructive' });
        return;
      }

      if (mounted.current) setTiposServicio((prev) => prev.filter((t) => t.id !== tipo.id));

      try {
        const { agregarAuditLog } = await import('../../lib/audit');
        agregarAuditLog('ELIMINAR', 'Facturación/Cobranza', `Se eliminó el tipo de servicio ${tipo.nombre} (${tipo.id})`);
      } catch (e) {
        console.warn('No se pudo registrar auditoría de eliminación de tipo:', e);
      }

      toast({ title: 'Tipo de servicio eliminado', variant: 'destructive' });
      // Re-validar automáticamente después de eliminar
      setTimeout(() => validateTiposServicioForDeletion(), 1000);
    } catch (e) {
      const estr = typeof e === 'object' ? JSON.stringify(e) : String(e);
      console.error('Error inesperado al eliminar tipo de servicio:', estr, e);
      toast({ title: 'Error inesperado al eliminar el tipo de servicio', description: String((e as any)?.message || estr), variant: 'destructive' });
    }
  };

  const handleConfirm = async () => {
    setConfirmDialogOpen(false);
    const tipo = tipoPending;
    if (!tipo) return;
    if (confirmAction === 'deactivate') {
      await performDeactivate(tipo);
      setConfirmAction(null);
      setTipoPending(null);
      return;
    }
    // If confirmAction is 'delete' or null (initial delete request), attempt delete flow
    await performDelete(tipo);
    setTipoPending(null);
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
    setTipoPending(null);
  };

  const exportarTiposServicioExcel = () => {
    try {
      // Fecha y hora actuales
      const now = new Date();
      const fecha = now.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const hora = now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Construir filas: encabezado informativo + encabezados de tabla + datos
      const headerInfo = [[`Exportado: ${fecha} ${hora}`]];
      const headers = [
        [
          "Tipo",
          "Descripción",
          "Categoría",
          "Subcategoría",
          "Pago Operador (MXN)",
          "¿Flete en Falso?",
          "Pago Base (MXN)",
        ],
      ];

      const rows = (tiposServicio || []).map((t) => {
        const flagged = esTipoServicioFleteFalso(t);
        const pagoActivo = obtenerMontoTipoServicio(t);
        const pagoBase = parseMonto((t as any)?.precio_base);
        return [
          t.nombre || "",
          t.descripcion || "",
          t.categoria || "General",
          t.subcategoria || "",
          pagoActivo,
          flagged ? "Sí" : "No",
          pagoBase ?? "",
        ];
      });

      const data = [...headerInfo, [], ...headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Ajustar ancho de columnas básico
      ws["!cols"] = [
        { wch: 36 },
        { wch: 50 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TiposServicio");
      const fileName = `tipos_servicio_${now
        .toISOString()
        .replace(/[:.]/g, "-")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error("Error exportando tipos de servicio:", e);
      toast({ title: 'No se pudo exportar el archivo Excel', description: String((e as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'No se pudo exportar el archivo Excel', description: String((e as any)?.message || ''), variant: 'default' });
    }
  };

  const editarEmbarque = (embarque: EmbarqueAsignado) => {
    setEmbarqueEditando(embarque);
    setFormData({
      montoFacturado: getMontoContable(embarque) || 0,
      fechaEntrega: embarque.fechaEntrega || "",
      observacionesFacturacion: embarque.observacionesFacturacion || "",
      pagado: embarque.pagado || false,
      fechaPago: embarque.fechaPago || "",
      estado_facturacion: embarque.estado_facturacion || "pendiente_facturacion",
      numeroFactura1: "",
      numeroFactura2: "",
      numeroFactura3: "",
      fechaEnvioCliente: embarque.fechaEnvioCliente || "",
      referenciaPago: embarque.referenciaPago || "",
    });
    setShowEditDialog(true);
  };

  const guardarCambios = async () => {
    if (!embarqueEditando) return;

    let usuarioActual = "Usuario Actual";
    try {
      const { getCurrentUser } = await import("../../lib/auth");
      const user = getCurrentUser && getCurrentUser();
      if (user && user.nombre) usuarioActual = user.nombre;
    } catch {}

    try {
      const { error } = await supabase
        .from("embarques")
        .update({
          precio_flete: formData.montoFacturado,
          fecha_entrega: formData.fechaEntrega || null,
          observaciones_facturacion: formData.observacionesFacturacion || null,
          pagado: formData.pagado,
          fecha_pago: formData.fechaPago || null,
          estado_facturacion: formData.estado_facturacion,
          // Legacy columns removed - usar facturas_json
          fecha_envio_cliente: formData.fechaEnvioCliente || null,
          referencia_pago: formData.referenciaPago || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", embarqueEditando.id);

      if (error) {
        console.error("Error actualizando embarque:", error);
        toast({ title: 'Error al guardar los cambios', description: String((error as any)?.message || ''), variant: 'destructive' });
        return;
      }
      // Notificar éxito
      toast({ title: 'Cambios guardados exitosamente', variant: 'default' });

      const embarquesActualizados = embarquesAsignados.map((embarque) =>
        embarque.id === embarqueEditando.id
          ? {
              ...embarque,
              montoFacturado: formData.montoFacturado,
              precioFlete: formData.montoFacturado,
              fechaEntrega: formData.fechaEntrega,
              observacionesFacturacion: formData.observacionesFacturacion,
              pagado: formData.pagado,
              fechaPago: formData.fechaPago,
              estado_facturacion:
                formData.estado_facturacion as EmbarqueAsignado["estado_facturacion"],
            }
          : embarque
      );

      if (mounted.current) {
        setEmbarquesAsignados(embarquesActualizados);
        localStorage.setItem(
          "embarquesAsignados",
          JSON.stringify(embarquesActualizados)
        );
        setShowEditDialog(false);
        setEmbarqueEditando(null);
      }
      // Audit log: modificación de embarque
      try {
        const { agregarAuditLog } = await import("../../lib/audit");
        agregarAuditLog(
          "ACTUALIZAR",
          "Facturación/Cobranza",
          `Modificación de embarque folio ${embarqueEditando.folio} por usuario ${usuarioActual}`
        );
      } catch {}
  // success already shown via toast
    } catch (error) {
      console.error("Error:", error);
      toast({ title: 'Error al guardar los cambios', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al guardar los cambios', description: String((error as any)?.message || ''), variant: 'default' });
  toast({ title: 'Error al guardar los cambios', description: String((error as any)?.message || ''), variant: 'default' });
    }
  };

  // Confirmation dialog state for deleting / deactivating tipos de servicio
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'deactivate' | null>(null);
  const [tipoPending, setTipoPending] = useState<TipoServicio | null>(null);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState<string>('');


  const abrirModalFacturacion = (embarque: EmbarqueAsignado) => {
    setEmbarqueFacturacion(embarque);
    
    // Usar datos JSON (única fuente de verdad después de la migración)
    const facturas: FacturaData[] = [];
    
    if (embarque.facturas_json && embarque.facturas_json.length > 0) {
      // Usar datos JSON existentes
      facturas.push(...embarque.facturas_json);
    } else {
      // Fallback para datos legacy en foliosFactura (compatibilidad temporal)
      const legacyData = [
        {
          numero: embarque.foliosFactura?.folio1 || "",
          fecha_envio: (embarque as any).fecha_envio_cliente || "",
          fecha_pago: (embarque as any).fecha_pago || "",
          referencia: (embarque as any).referencia_pago || ""
        },
        {
          numero: embarque.foliosFactura?.folio2 || "",
          fecha_envio: "",
          fecha_pago: "",
          referencia: ""
        },
        {
          numero: embarque.foliosFactura?.folio3 || "",
          fecha_envio: "",
          fecha_pago: "",
          referencia: ""
        },
        {
          numero: embarque.foliosFactura?.folio4 || "",
          fecha_envio: "",
          fecha_pago: "",
          referencia: ""
        }
      ];
      facturas.push(...legacyData.filter(f => f.numero.trim() !== ""));
    }
    
    // Rellenar hasta 4 elementos si es necesario
    while (facturas.length < 4) {
      facturas.push({ numero: "", fecha_envio: "", fecha_pago: "", referencia: "" });
    }
    
    setFacturacionData({
      facturas: facturas.slice(0, 4), // Asegurar máximo 4 facturas
      observacionesFacturacion:
        (embarque as any).observaciones_facturacion ||
        embarque.observacionesFacturacion ||
        "",
    });
    setShowFacturacionModal(true);
  };

  const guardarDatosFacturacion = async () => {
    if (!embarqueFacturacion) return;

    try {
      // Validación: Observaciones obligatoria
      const obs = (facturacionData.observacionesFacturacion || "").trim();
      if (!obs) {
        toast({ title: 'Las Observaciones son obligatorias', description: 'Agrega observaciones antes de guardar la captura de facturación.', variant: 'destructive' });
  toast({ title: 'Las Observaciones son obligatorias', description: 'Agrega observaciones antes de guardar la captura de facturación.', variant: 'default' });
        return;
      }

      setSavingFacturacion(true);
      // Filtrar facturas con datos para crear JSON
      const facturasConDatos = facturacionData.facturas.filter(f => 
        f.numero && f.numero.trim() !== ""
      );
      
      // Tomar el primer valor no vacío para columnas legadas (compatibilidad)
      const firstFactura = facturasConDatos[0];
      const firstEnvio = firstFactura?.fecha_envio || null;
      const firstPago = firstFactura?.fecha_pago || null;
      const firstRef = firstFactura?.referencia || null;

      const { error } = await supabase
        .from("embarques")
        .update({
          // Único campo JSON (después de la migración)
          facturas_json: facturasConDatos,
          // Mantener columnas principales para compatibilidad con otras vistas
          fecha_envio_cliente: firstEnvio,
          fecha_pago: firstPago,
          referencia_pago: firstRef,
          observaciones_facturacion: obs || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", embarqueFacturacion.id);

      if (error) {
        console.error("Error actualizando datos de facturación:", error);
        toast({ title: 'Error guardando facturación', description: String((error as any)?.message || (error as any)?.details || ''), variant: 'destructive' });
  toast({ title: 'Error guardando facturación', description: String((error as any)?.message || (error as any)?.details || ''), variant: 'default' });
        return;
      }

      const embarquesActualizados = embarquesAsignados.map((embarque) =>
        embarque.id === embarqueFacturacion.id
          ? {
              ...embarque,
              facturas_json: facturasConDatos,
              // Actualizar foliosFactura para compatibilidad con otras partes del código
              foliosFactura: {
                folio1: facturasConDatos[0]?.numero || "",
                folio2: facturasConDatos[1]?.numero || "",
                folio3: facturasConDatos[2]?.numero || "",
                folio4: facturasConDatos[3]?.numero || "",
              },
              // Campos principales para compatibilidad
              fechaEnvioCliente: firstEnvio || undefined as any,
              fechaPago: firstPago || undefined as any,
              referenciaPago: firstRef || undefined as any,
              observacionesFacturacion: obs,
            }
          : embarque
      );

      if (mounted.current) {
        setEmbarquesAsignados(embarquesActualizados);
        localStorage.setItem(
          "embarquesAsignados",
          JSON.stringify(embarquesActualizados)
        );

        // Si el detalle abierto corresponde al embarque editado, sincronizarlo también
        if (embarqueDetalle && embarqueDetalle.id === embarqueFacturacion.id) {
          setEmbarqueDetalle({
            ...embarqueDetalle,
            facturas_json: facturasConDatos,
            foliosFactura: {
              folio1: facturasConDatos[0]?.numero || "",
              folio2: facturasConDatos[1]?.numero || "",
              folio3: facturasConDatos[2]?.numero || "",
              folio4: facturasConDatos[3]?.numero || "",
            },
            // Campos principales para compatibilidad
            fecha_envio_cliente: firstEnvio || undefined,
            fecha_pago: firstPago || undefined,
            referencia_pago: firstRef || undefined,
            observacionesFacturacion: obs,
          } as any);
        }

  setShowFacturacionModal(false);
        setEmbarqueFacturacion(null);

        // Mostrar toast de éxito al guardar facturación
        try {
          toast({ title: 'Facturas capturadas correctamente', variant: 'success' });
          toast({ title: 'Facturas capturadas correctamente', variant: 'success' });
        } catch {}

        setFacturacionData({
          facturas: [
            { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
            { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
            { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" },
            { numero: "", fecha_envio: "", fecha_pago: "", referencia: "" }
          ],
          observacionesFacturacion: "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      let msg = "";
      if (typeof error === "object" && error && "message" in error) {
        msg = (error as any).message;
      }
  toast({ title: 'Error al guardar los datos de facturación', description: msg, variant: 'destructive' });
  toast({ title: 'Error al guardar los datos de facturación', description: msg, variant: 'default' });
    } finally {
      setSavingFacturacion(false);
    }
  };

  const exportCreditDataToExcel = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestampHuman = now.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    const timestampFile = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let csv = `Gestión de Crédito de Clientes - Descargado: ${timestampHuman}\n` +
      "Cliente,Límite USD,Adeudado USD,Límite MXN,Adeudado MXN,Estado Crédito\n";
    filteredClients.forEach((cliente) => {
      const clienteEmbarquesUSD = embarquesFiltrados.filter(
        (e) =>
          e.cliente_id === cliente.id && !e.pagado && e.moneda_flete === "USD"
      );
      const clienteEmbarquesMXN = embarquesFiltrados.filter(
        (e) =>
          e.cliente_id === cliente.id &&
          !e.pagado &&
          (e.moneda_flete === "MXN" || !e.moneda_flete)
      );

  const totalPendienteUSD = clienteEmbarquesUSD.reduce((sum, e) => sum + getMontoContable(e), 0);
  const totalPendienteMXN = clienteEmbarquesMXN.reduce((sum, e) => sum + getMontoContable(e), 0);

      const limiteUSD = creditLimits[cliente.id]?.usd || 0;
      const limiteMXN = creditLimits[cliente.id]?.mxn || 0;

      const excedeUSD = totalPendienteUSD > limiteUSD && limiteUSD > 0;
      const excedeMXN = totalPendienteMXN > limiteMXN && limiteMXN > 0;
      const estadoCredito = excedeUSD || excedeMXN ? "Excedido" : "Ok";

      csv += `${cliente.nombre},${limiteUSD},${totalPendienteUSD},${limiteMXN},${totalPendienteMXN},${estadoCredito}\n`; // Corrected field name
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
  a.download = `credito_clientes_${timestampFile}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generarReporteExcel = () => {
    try {
      // Excluir embarques archivados
      const listaNoArchivados = (embarquesFiltrados || []).filter(
        (e: any) => !(e.estado_facturacion === "archivado" || archivadosIds.includes(e.id))
      );

      if (!listaNoArchivados.length) {
        toast({ title: 'No hay embarques no archivados para exportar', variant: 'destructive' });
  toast({ title: 'No hay embarques no archivados para exportar', variant: 'default' });
        return;
      }

      const headers = [
        "Folio",
        "Cliente",
        "Operador Asignado",
        "Tipo Servicio",
        "Load Number",
        "Carta Porte",
        "Tractocamión",
        "Remolque",
        "Lugar Recolecta",
        "Lugar Entrega",
        "Fecha Asignación",
        "Recolecta Hora",
        "Monto Flete",
        "Moneda Flete",
        "Descuento QuickPaid",
        "Precio QuickPaid",
        "Monto Neto",
        "Pago Operador",
        "Estado",
        "Estado Facturación",
        "Información de Facturas",
        "Observaciones Facturación",
        "Contingencia",
        "Cancelado",
        "Observaciones",
      ];

      const rows = listaNoArchivados.map((e: any) => {
        // Operador asignado
        const operador = e.operadorAsignado?.nombre || e.operadorNombre || e.operador || "";
        
        // Tipo de servicio
        const tipoServicio = e.tipo_servicio_nombre || "Sin especificar";
        
        // Vehículos
        const tracto = e.camionAsignado?.numeroEconomico || 
                       e.camionAsignado?.numero_economico || 
                       (e.tracto && (e.tracto.numero_economico || e.tracto.placas)) ||
                       e.tractoNumero || 
                       e.tractor || 
                       "";
        
        const remolque = e.remolque?.numero_economico || 
                         e.remolque_numero_economico || 
                         e.remolque_placa ||
                         (e.remolque && (e.remolque.numero_economico || e.remolque.placas)) ||
                         e.remolqueNumero || 
                         "";
        
        // Información del embarque
        const load = e.load_number || e.numeroLoad || e.load || e.loadNumber || e.numero_carga || "";
        const cartaPorte = e.carta_porte || e.cartaPorte || e.carta || "";
        
        // Direcciones
        const lugarRecolecta = e.lugar_recolecta || e.direccion_recolecta || e.recolecta || "";
        const lugarEntrega = e.lugar_entrega || e.direccion_entrega || e.direccionEntrega || e.direccion || "";
        
        // Fechas y horarios
        const fechaAsignacion = e.fechaAsignacion ? new Date(e.fechaAsignacion).toLocaleDateString("es-MX") : "";
        const recolectaHora = e.recolecta_hora || e.hora_recolecta || e.recolectaHora || "";
        
        // Montos
        const montoFlete = e.monto_flete || e.montoFlete || e.valor || 0;
        const monedaFlete = e.moneda_flete || "MXN";
        const descuentoQuick = e.quickpaid_descuento || e.quickpaidDescuento || 0;
        const precioQuick = e.precio_quickpaid || e.precioQuickPaid || 0;
        const montoNeto = getMontoContable(e) || 0;
        const pagoOperador = e.pagoOperador || e.pago_operador || 0;
        
        // Estados
        const estado = e.estado || "";
        const estadoFacturacion = e.estado_facturacion || "";
        
        // Contingencia y cancelación
        const esContingencia = e.modificadoPorEmergencia || embarquesModificadosIds.includes(e.id) ? "Sí" : "No";
        const esCancelado = (e.estado === "cancelado" || e.estado_facturacion === "cancelado") ? "Sí" : "No";
        
        // Datos de facturación formateados
        const facturacionFormateada = (() => {
          try {
            const facturas: string[] = [];
            
            if (e.facturas_json && Array.isArray(e.facturas_json) && e.facturas_json.length > 0) {
              // Usar datos JSON nuevos
              e.facturas_json.forEach((f: any, index: number) => {
                if (f && (f.numero || f.fechaEnvio || f.fechaPago || f.referenciaPago || f.monto)) {
                  const campos = [];
                  
                  if (f.numero && f.numero.trim()) {
                    campos.push(`numero: ${f.numero}`);
                  }
                  if (f.fechaEnvio && f.fechaEnvio.trim()) {
                    campos.push(`fecha_envio: ${f.fechaEnvio}`);
                  }
                  if (f.fechaPago && f.fechaPago.trim()) {
                    campos.push(`fecha_pago: ${f.fechaPago}`);
                  }
                  if (f.referenciaPago && f.referenciaPago.trim()) {
                    campos.push(`referencia: ${f.referenciaPago}`);
                  }
                  if (f.monto && f.monto > 0) {
                    campos.push(`monto: ${f.monto}`);
                  }
                  
                  if (campos.length > 0) {
                    facturas.push(`{${campos.join(', ')}}`);
                  }
                }
              });
            } else if (e.foliosFactura) {
              // Fallback para datos legacy
              const folios = [
                { num: e.foliosFactura.folio1, tipo: "Factura_1" },
                { num: e.foliosFactura.folio2, tipo: "Factura_2" },
                { num: e.foliosFactura.folio3, tipo: "Factura_3" },
                { num: e.foliosFactura.folio4, tipo: "Factura_4" }
              ];
              
              folios.forEach(({ num, tipo }) => {
                if (num && num.trim()) {
                  facturas.push(`{numero: ${num.trim()}, tipo: ${tipo}}`);
                }
              });
            }
            
            return facturas.length > 0 ? facturas.join(' | ') : "";
          } catch (error) {
            return "";
          }
        })();
        
        // Observaciones
        const observaciones = e.observaciones || 
                            e.observaciones_entrega || 
                            e.observaciones_facturacion || 
                            "";
        
        return [
          e.folio || "",
          e.clienteNombre || e.cliente || "",
          operador,
          tipoServicio,
          load,
          cartaPorte,
          tracto,
          remolque,
          lugarRecolecta,
          lugarEntrega,
          fechaAsignacion,
          recolectaHora,
          `$${Number(montoFlete).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          monedaFlete,
          `$${Number(descuentoQuick).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${Number(precioQuick).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${Number(montoNeto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${Number(pagoOperador).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          estado,
          estadoFacturacion,
          facturacionFormateada,
          e.observacionesFacturacion || e.observaciones_facturacion || "",
          esContingencia,
          esCancelado,
          observaciones,
        ];
      });

      // Build CSV (prefix cells with apostrophe so Excel treats them as text -> left-aligned)
      const csvLines = [headers.join(",")];
      rows.forEach((r) => {
        const escaped = r.map((cell) => {
          if (cell === null || cell === undefined) return "";
          const s = String(cell);
          // prefix with apostrophe to force Excel left-align (Excel hides the apostrophe)
          const withQuotePrefix = "'" + s;
          // Escape quotes for CSV
          return `"${withQuotePrefix.replace(/"/g, '""')}"`;
        });
        csvLines.push(escaped.join(","));
      });

      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const now = new Date();
      const fechaArchivo = now.toISOString().split("T")[0];
      link.download = `facturacion_report_${fechaArchivo}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      try {
        agregarAuditLog(
          "EXPORTAR",
          "Facturación",
          `Exportó reporte de embarques (no archivados) - ${listaNoArchivados.length} registros`,
        );
      } catch {}
    } catch (error) {
      console.error("Error al generar el reporte Excel:", error);
      toast({ title: 'Error al generar el reporte Excel', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al generar el reporte Excel', description: String((error as any)?.message || ''), variant: 'default' });
    }
  };

  const verDetallesEmbarque = (embarque: EmbarqueAsignado) => {
    setEmbarqueDetalle(embarque);
  setActiveDetailTab("general");

    setFacturacionFormData({
      folio1: embarque?.foliosFactura?.folio1 || "",
      folio2: embarque?.foliosFactura?.folio2 || "",
      folio3: embarque?.foliosFactura?.folio3 || "",
      folio4: embarque?.foliosFactura?.folio4 || "",
      cantidadFinalFacturada:
        embarque.cantidad_final_facturada || embarque.precioFlete || 0,
      observacionesFacturacion: embarque.observacionesFacturacion || "",
    });
  // Cargar fotos del embarque para la pestaña Fotos
  if (embarque?.id) cargarFotosDetalle(embarque.id);
    setShowDetailModal(true);
  };

  const guardarInformacionFacturacion = async () => {
    if (!embarqueDetalle) return;

    try {
      const { error } = await supabase
        .from("embarques")
        .update({
          // Legacy columns removed - using facturas_json
          cantidad_final_facturada:
            facturacionFormData.cantidadFinalFacturada || null,
          observaciones_facturacion:
            facturacionFormData.observacionesFacturacion || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", embarqueDetalle.id);

      if (error) {
        console.error("Error actualizando información de facturación:", error);
        toast({ title: 'Error al guardar la información de facturación', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al guardar la información de facturación', description: String((error as any)?.message || ''), variant: 'default' });
        return;
      }

      const embarquesActualizados = embarquesAsignados.map((embarque) =>
        embarque.id === embarqueDetalle.id
          ? {
              ...embarque,
              foliosFactura: {
                folio1: facturacionFormData.folio1,
                folio2: facturacionFormData.folio2,
                folio3: facturacionFormData.folio3,
                folio4: facturacionFormData.folio4,
              },
              // Legacy columns removed - now using only facturas_json
              cantidadFinalFacturada:
                facturacionFormData.cantidadFinalFacturada,
              observacionesFacturacion:
                facturacionFormData.observacionesFacturacion,
              cantidad_final_facturada: facturacionFormData.cantidadFinalFacturada || null,
              observaciones_facturacion: facturacionFormData.observacionesFacturacion || null,
            }
          : embarque
      );

      if (mounted.current) {
        setEmbarquesAsignados(embarquesActualizados);
        localStorage.setItem(
          "embarquesAsignados",
          JSON.stringify(embarquesActualizados)
        );

        setEmbarqueDetalle({
          ...embarqueDetalle,
          foliosFactura: {
            folio1: facturacionFormData.folio1,
            folio2: facturacionFormData.folio2,
            folio3: facturacionFormData.folio3,
            folio4: facturacionFormData.folio4,
          },
          // keep both camelCase and snake_case properties in memory for UI consistency
          cantidadFinalFacturada: facturacionFormData.cantidadFinalFacturada,
          observacionesFacturacion: facturacionFormData.observacionesFacturacion,
          cantidad_final_facturada: facturacionFormData.cantidadFinalFacturada || null,
          observaciones_facturacion: facturacionFormData.observacionesFacturacion || null,
          // Legacy columns removed - using facturas_json
        });

        setShowFacturacionEditModal(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({ title: 'Error al guardar la información de facturación', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al guardar la información de facturación', description: String((error as any)?.message || ''), variant: 'default' });
    }
  };

  const [showClientesModal, setShowClientesModal] = useState(false);
  const [activeClientesTab, setActiveClientesTab] = useState("detalle");
  const [clientesPeriodo, setClientesPeriodo] = useState({
    desde: "",
    hasta: "",
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState("todos");
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [filtroStatusCliente, setFiltroStatusCliente] = useState("todos");
  const [filtroPeriodoClientes, setFiltroPeriodoClientes] = useState("custom");

  const [loadingClienteEmbarques, setLoadingClienteEmbarques] = useState(false);
  const [embarquesClienteFiltrados, setEmbarquesClienteFiltrados] = useState<
    EmbarqueAsignado[]
  >([]);

  const [currentPageClientes, setCurrentPageClientes] = useState(1);
  const [itemsPerPageClientes, setItemsPerPageClientes] = useState(10);

  // Control Clientes
  const [showControlClientesModal, setShowControlClientesModal] = useState(false);
  const [controlClienteSeleccionado, setControlClienteSeleccionado] = useState<string | null>(null);
  const [controlClientesTab, setControlClientesTab] = useState<"activos" | "archivados">("activos");
  const [controlClientesPeriodo, setControlClientesPeriodo] = useState<{ desde: string | null; hasta: string | null }>({
    desde: null,
    hasta: null,
  });
  // Default to 'custom' so user sees all records unless they choose a range
  const [controlClientesRango, setControlClientesRango] = useState<string>("custom");
  const [controlClientesGenerado, setControlClientesGenerado] = useState(false);
  const [controlIncluirArchivados, setControlIncluirArchivados] = useState(false);
  const [controlMostrarCancelados, setControlMostrarCancelados] = useState(true); // Mostrar cancelados por defecto
  // If the user requests to include archivados, we fetch an ad-hoc dataset from the server
  // instead of relying solely on `embarquesAsignados` which may not contain archived items.
  const [controlClientesFetched, setControlClientesFetched] = useState<any[] | null>(null);

  const setRangoControlClientes = (value: string) => {
    setControlClientesRango(value);
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split("T")[0];
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
    if (value === "mes_actual") {
      setControlClientesPeriodo({ desde: toISO(startOfMonth(today)), hasta: toISO(today) });
    } else if (value === "mes_anterior") {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setControlClientesPeriodo({ desde: toISO(startOfMonth(prev)), hasta: toISO(endOfMonth(prev)) });
    } else if (value === "dos_meses_atras") {
      const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setControlClientesPeriodo({ desde: toISO(from), hasta: toISO(today) });
    } else if (value === "seis_meses_atras") {
      const from = new Date(today.getFullYear(), today.getMonth() - 6, 1);
      setControlClientesPeriodo({ desde: toISO(from), hasta: toISO(today) });
    } else {
      // custom
      setControlClientesPeriodo((p) => ({ desde: p.desde, hasta: p.hasta }));
    }
  };

  // Al abrir el modal, aplicar el rango por defecto
  useEffect(() => {
    if (showControlClientesModal) {
      setRangoControlClientes(controlClientesRango || "mes_actual");
  setControlClientesGenerado(false);
    }
  }, [showControlClientesModal]);

  // Ordenamiento en Control Clientes
  type ControlClientesSortColumn = "folio" | "load" | "tipo" | "fecha" | "monto" | "estado";
  const [controlClientesSortBy, setControlClientesSortBy] = useState<ControlClientesSortColumn>("fecha");
  const [controlClientesSortDir, setControlClientesSortDir] = useState<"asc" | "desc">("desc");
  const [itemsPerPageControl, setItemsPerPageControl] = useState<number>(10);
  const [currentPageControlActivos, setCurrentPageControlActivos] = useState<number>(1);
  const [currentPageControlArchivados, setCurrentPageControlArchivados] = useState<number>(1);
  const [controlClientesEstadoFiltro, setControlClientesEstadoFiltro] = useState<string>("todos");

  const toggleControlClientesSort = (col: ControlClientesSortColumn) => {
    setControlClientesSortBy((prev) => {
      if (prev === col) {
        setControlClientesSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setControlClientesSortDir("asc");
      return col;
    });
  };

  const renderSortHeader = (label: string, col: ControlClientesSortColumn) => {
    const isActive = controlClientesSortBy === col;
    const indicator = isActive ? (controlClientesSortDir === "asc" ? "▲" : "▼") : "↕";
    return (
      <button
        type="button"
        className="flex items-center gap-1 select-none cursor-pointer"
        onClick={() => toggleControlClientesSort(col)}
      >
        <span>{label}</span>
        <span className="text-xs text-gray-500">{indicator}</span>
      </button>
    );
  };

  const getTipoNombreFor = (e: any) =>
    tiposServicio.find((t) => t.id === (e as any).tipo_servicio_id)?.nombre ||
    (e as any).tipoServicioNombre ||
    (e as any).tipoServicio ||
    "-";

  const compareControlClientes = (a: any, b: any) => {
    const dir = controlClientesSortDir === "asc" ? 1 : -1;
    const by = controlClientesSortBy;
    const safeStr = (v: any) => (v ?? "").toString().toLowerCase();
    const safeNum = (v: any) => (typeof v === "number" ? v : Number(v) || 0);
    const dateOf = (e: any) => new Date(e.fecha_creacion || e.updated_at || 0).getTime();
  const amountOf = (e: any) => getMontoContable(e);
    let va: any;
    let vb: any;
    switch (by) {
      case "folio":
        va = safeStr(a.folio);
        vb = safeStr(b.folio);
        break;
      case "load":
        va = safeStr(a.load_number);
        vb = safeStr(b.load_number);
        break;
      case "tipo":
        va = safeStr(getTipoNombreFor(a));
        vb = safeStr(getTipoNombreFor(b));
        break;
      case "fecha":
        va = dateOf(a);
        vb = dateOf(b);
        break;
      case "monto":
        va = safeNum(amountOf(a));
        vb = safeNum(amountOf(b));
        break;
      case "estado":
        va = safeStr(a.estado_facturacion || "");
        vb = safeStr(b.estado_facturacion || "");
        break;
      default:
        va = 0;
        vb = 0;
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  };

  // Helper: date range filter for Control Clientes
  const controlClientesInRange = useCallback(
    (e: any) => {
      const fechaStr = e.fechaAsignacion || e.fecha_creacion || e.updated_at;
      if (!fechaStr) return true;
      const parseYMD = (s: string) => {
        const [y, m, d] = s.split("-").map((n) => Number(n));
        return new Date(y, (m || 1) - 1, d || 1);
      };
      const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const d = new Date(fechaStr);
      const dKey = dayStart(d).getTime();
      const desdeKey = controlClientesPeriodo.desde ? dayStart(parseYMD(controlClientesPeriodo.desde)).getTime() : null;
      const hastaKey = controlClientesPeriodo.hasta ? dayEnd(parseYMD(controlClientesPeriodo.hasta)).getTime() : null;

      if (desdeKey !== null && dKey < desdeKey) return false;
      if (hastaKey !== null && dKey > hastaKey) return false;
      return true;
    },
    [controlClientesPeriodo.desde, controlClientesPeriodo.hasta]
  );

  // Filtered/sorted lists per tab
  const controlClientesFiltradosActivos = useMemo(() => {
  if (!controlClientesGenerado) return [] as any[];
  const source = controlClientesFetched || embarquesAsignados || [];
  const base = (source as any[])
      // Excluir cancelados (a menos que el usuario solicite verlos)
      .filter((e: any) => {
        if (!controlMostrarCancelados && esCancelado(e)) return false;
        return true;
      })
      // Debe tener operador o precio asignado (permitir asignados sin precio para que usuario los revise)
      .filter((e: any) => {
        const tieneOperador = Boolean(e?.operadorAsignado?.id || e?.operadorAsignado?.nombre);
        const precio = getMontoContable(e);
        const tienePrecio = typeof precio === "number" ? precio > 0 : Number(precio) > 0;
        return tieneOperador || tienePrecio;
      })
      // Filtro por cliente si aplica
      .filter((e) => (controlClienteSeleccionado ? e.cliente_id === controlClienteSeleccionado : true))
      // Rango de fechas
      .filter(controlClientesInRange)
      // Filtro por estado unificado
      .filter((e) => {
        if (controlClientesEstadoFiltro === "todos") return true;
        if (controlClientesEstadoFiltro === "archivado") return e.estado_facturacion === "archivado";
        if (controlClientesEstadoFiltro === "pendiente_facturacion") return (e.estado_facturacion || "pendiente_facturacion") === "pendiente_facturacion";
        if (controlClientesEstadoFiltro === "pagado") return (e.estado_facturacion || "").toLowerCase().includes("pagado");
        if (controlClientesEstadoFiltro === "facturado") return (e.estado_facturacion || "").toLowerCase().includes("facturado");
        if (controlClientesEstadoFiltro === "transito") return (String(e.estado || "").toLowerCase()).includes("transit");
        return true;
      });
    // sort on a shallow copy to avoid mutating state elsewhere
    return [...base].sort(compareControlClientes);
  }, [
    embarquesAsignados,
    controlClienteSeleccionado,
    controlClientesInRange,
    controlClientesGenerado,
    controlClientesSortBy,
    controlClientesSortDir,
    tiposServicio,
  controlClientesEstadoFiltro,
  ]);

  // Total pages
  const totalPagesControlActivos = Math.max(1, Math.ceil((controlClientesFiltradosActivos.length || 0) / (itemsPerPageControl || 1)));

  // Paginated slices
  const paginatedControlActivos = useMemo(() => {
    const start = (currentPageControlActivos - 1) * itemsPerPageControl;
    return controlClientesFiltradosActivos.slice(start, start + itemsPerPageControl);
  }, [controlClientesFiltradosActivos, currentPageControlActivos, itemsPerPageControl]);


  // Reset pages when filters/sorts change
  useEffect(() => {
    setCurrentPageControlActivos(1);
    setCurrentPageControlArchivados(1);
  }, [
    controlClienteSeleccionado,
    controlClientesPeriodo.desde,
    controlClientesPeriodo.hasta,
    controlClientesSortBy,
    controlClientesSortDir,
    itemsPerPageControl,
    controlClientesGenerado,
  controlClientesEstadoFiltro,
  ]);

  const handlePeriodoClientesChange = (value: string) => {
    setFiltroPeriodoClientes(value);
    const hoy = new Date();
    let inicio = "";
    let fin = "";

    if (value === "current_month") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_month") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_2_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_3_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_6_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else {
      inicio = "";
      fin = "";
    }
    setClientesPeriodo({ desde: inicio, hasta: fin });
  };

  const consultarEmbarquesPorCliente = useCallback(async () => {
    setLoadingClienteEmbarques(true);
    if (mounted.current) setEmbarquesClienteFiltrados([]);
    try {
      let query = supabase
        .from("embarques")
        .select(
          `
        *,
        cliente:clientes(id, nombre),
        operador:operadores(id, nombre, apellidos)
      `
        )
  .eq("estado", "finalizado")
        .order("fecha_creacion", { ascending: false });

      if (clienteSeleccionado && clienteSeleccionado !== "todos") {
        query = query.eq("cliente_id", clienteSeleccionado);
      }

      if (filtroStatusCliente && filtroStatusCliente !== "todos") {
        query = query.eq("estado_facturacion", filtroStatusCliente);
      }

      if (clientesPeriodo.desde) {
        query = query.gte("fecha_creacion", clientesPeriodo.desde);
      }
      if (clientesPeriodo.hasta) {
        query = query.lte("fecha_creacion", clientesPeriodo.hasta);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al consultar embarques por cliente:", error);
        toast({ title: 'Error al consultar embarques por cliente', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al consultar embarques por cliente', description: String((error as any)?.message || ''), variant: 'default' });
        if (mounted.current) setEmbarquesClienteFiltrados([]);
        return;
      }

      const embarquesFormateados: EmbarqueAsignado[] = (data || []).map(
        (embarque: any) => ({
          ...embarque,
          clienteNombre: embarque.cliente?.nombre || "Cliente no especificado", // Corrected field name
          operadorAsignado: embarque.operador
            ? {
                id: embarque.operador.id,
                nombre: `${embarque.operador.nombre} ${
                  embarque.operador.apellidos || ""
                }`.trim(),
              }
            : { id: "", nombre: "Sin asignar" },
          modificadoPorEmergencia: embarquesModificadosIds.includes(
            embarque.id
          ),
          precioFlete: embarque.precio_flete,
          numeroLoad: embarque.load_number,
        })
      );

      const filteredBySearch = embarquesFormateados.filter((e) => {
        const searchLower = (clienteSearchTerm || "").toLowerCase();
        return (
          String(e.folio || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(e.clienteNombre || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(e.numeroLoad || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(e.operadorAsignado?.nombre || "")
            .toLowerCase()
            .includes(searchLower)
        );
      });

      if (mounted.current) {
        setEmbarquesClienteFiltrados(filteredBySearch);
        setCurrentPageClientes(1);
      }
    } catch (error) {
      console.error("Excepción al consultar embarques por cliente:", error);
      toast({ title: 'Error inesperado al consultar embarques por cliente', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error inesperado al consultar embarques por cliente', description: String((error as any)?.message || ''), variant: 'default' });
    } finally {
      if (mounted.current) setLoadingClienteEmbarques(false);
    }
  }, [
    clienteSeleccionado,
    clientesPeriodo.desde,
    clientesPeriodo.hasta,
    clienteSearchTerm,
    embarquesModificadosIds,
    filtroStatusCliente,
  ]);

  useEffect(() => {
    if (showClientesModal) {
      consultarEmbarquesPorCliente();
    }
  }, [showClientesModal, consultarEmbarquesPorCliente]);

  const exportarEmbarquesClienteExcel = () => {
    let csv =
      "Folio,Cliente,Load,Fecha,Monto Flete,Moneda,Estado,Contingencia\n";
    embarquesClienteFiltrados.forEach((e) => {
      csv += `${e.folio},${e.clienteNombre},${e.numeroLoad},${new Date(
        e.fechaAsignacion!
      ).toLocaleDateString()},${e.precioFlete},${e.moneda_flete || "MXN"},${
        e.estado_facturacion || "N/A"
      },${e.modificadoPorEmergencia ? "Sí" : "No"}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "embarques_por_cliente.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredClients = useMemo(() => {
    const searchLower = creditClientSearchTerm.toLowerCase();
    return clientes.filter((cliente) => {
      if (!cliente || !cliente.nombre) return false; // Corrected field name
      return cliente.nombre.toLowerCase().includes(searchLower); // Corrected field name
    });
  }, [clientes, creditClientSearchTerm]);

  const totalPagesCredit = Math.ceil(
    filteredClients.length / itemsPerPageCredit
  );

  const paginatedClientsCredit = useMemo(() => {
    const startIndex = (currentPageCredit - 1) * itemsPerPageCredit;
    const endIndex = startIndex + itemsPerPageCredit;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPageCredit, itemsPerPageCredit]);

  const handlePageChangeCredit = (page: number) => {
    if (page > 0 && page <= totalPagesCredit) {
      setCurrentPageCredit(page);
    }
  };

  const operacionesPorPeriodo = embarquesAsignados.filter((e) => {
    if (!clientesPeriodo.desde && !clientesPeriodo.hasta) return true;
  const fecha = new Date(e.fechaAsignacion || "");
    const desde = clientesPeriodo.desde
      ? new Date(clientesPeriodo.desde)
      : null;
    const hasta = clientesPeriodo.hasta
      ? new Date(clientesPeriodo.hasta)
      : null;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });

  const operacionesPorCliente = clientes
    .map((cliente) => ({
      cliente,
      operaciones: operacionesPorPeriodo.filter(
        (e) => e.clienteNombre === cliente.nombre
      ), // Corrected field name
    }))
    .filter((c) => c.operaciones.length > 0);

  const operacionesPorTipoServicio = tiposServicio
    .map((tipo) => ({
      tipo,
      operaciones: operacionesPorPeriodo.filter(
        (e) => e.tipoServicio === tipo.nombre
      ),
    }))
    .filter((t) => t.operaciones.length > 0);

  const handlePeriodoPagosChange = (value: string) => {
    setFiltroPeriodoPagos(value);
    const hoy = new Date();
    let inicio = "";
    let fin = "";

    if (value === "current_month") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_month") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_2_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_3_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else if (value === "last_6_months") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    } else {
      inicio = "";
      fin = "";
    }
    setFechaInicioPagos(inicio);
    setFechaFinPagos(fin);
  };

  const operadorDesgloseData = useMemo(() => {
    const desgloseMap = new Map<
      string,
      {
        operador: { id: string; nombre: string };
        totalPagos: number;
        totalPagosMesActual: number;
        cantidadEmbarques: number;
        embarquesContingencia: number;
      }
    >();

    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMesActual.setHours(23, 59, 59, 999);

    embarquesOperadorFiltrados.forEach((embarque) => {
      // Mostrar los embarques cancelados en la tabla detalle, pero NO deben afectar
      // los cálculos de desglose y contadores.
      if (esCancelado(embarque)) return;
      const fechaEmbarque = new Date(embarque.fechaAsignacion!);

      // Construir entradas por operador. En contingencia, separar Original y Reemplazo como operadores distintos.
      const entradas: Array<{ id: string; nombre: string; pago: number; esContingencia: boolean }>
        = [];

      if (embarque.modificadoPorEmergencia) {
        const montoOrig = (operadoresContingencia[embarque.id]?.original || 0);
        const montoReemp = (operadoresContingencia[embarque.id]?.reemplazo || 0);

        const nombreOriginal = embarque.operadorOriginalNombre || embarque.operadorAsignado?.nombre || "Sin asignar";
        const idOriginal = embarque.operadorOriginalId || embarque.operadorAsignado?.id || `nombre:${nombreOriginal}`;
        entradas.push({ id: idOriginal, nombre: nombreOriginal, pago: montoOrig, esContingencia: true });

        if (embarque.operadorReemplazoNombre) {
          const nombreReemplazo = embarque.operadorReemplazoNombre;
          const idReemplazo = embarque.operadorReemplazoId || `nombre:${nombreReemplazo}`;
          entradas.push({ id: idReemplazo, nombre: nombreReemplazo, pago: montoReemp, esContingencia: true });
        }
      } else {
        const id = embarque.operadorAsignado?.id || "unknown";
        const nombre = embarque.operadorAsignado?.nombre || "Sin asignar";
        const pago = embarque.pagoOperador || 0;
        entradas.push({ id, nombre, pago, esContingencia: false });
      }

      entradas.forEach((ent) => {
        if (!desgloseMap.has(ent.id)) {
          desgloseMap.set(ent.id, {
            operador: { id: ent.id, nombre: ent.nombre },
            totalPagos: 0,
            totalPagosMesActual: 0,
            cantidadEmbarques: 0,
            embarquesContingencia: 0,
          });
        }
        const data = desgloseMap.get(ent.id)!;
        data.totalPagos += ent.pago;
        data.cantidadEmbarques += 1; // contar un embarque por operador involucrado
        if (ent.esContingencia) data.embarquesContingencia += 1;
        if (fechaEmbarque >= inicioMesActual && fechaEmbarque <= finMesActual) {
          data.totalPagosMesActual += ent.pago;
        }
      });
    });

    return Array.from(desgloseMap.values());
  }, [embarquesOperadorFiltrados, operadoresContingencia]);

  const exportarDesgloseOperadoresExcel = () => {
    let csv =
      "Operador,Total Pagos,Total Pagos Mes Actual,Cantidad Embarques,Casos Contingencia\n";
    operadorDesgloseData.forEach((data) => {
      csv += `${data.operador.nombre},${data.totalPagos},${data.totalPagosMesActual},${data.cantidadEmbarques},${data.embarquesContingencia}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "desglose_operadores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPagosFiltrados = useMemo(() => {
    return embarquesOperadorFiltrados.reduce((sum, embarque) => {
      // Excluir embarques cancelados del total de pagos
      if (esCancelado(embarque)) return sum;
      const pago = embarque.modificadoPorEmergencia
        ? (operadoresContingencia[embarque.id]?.original || 0) +
          (operadoresContingencia[embarque.id]?.reemplazo || 0)
        : embarque.pagoOperador || 0;
      return sum + pago;
    }, 0);
  }, [embarquesOperadorFiltrados, operadoresContingencia]);

  const desglosePorEmpresaData = useMemo(() => {
    const dataMap = new Map<
      string,
      {
        cliente: any;
        totalFacturadoMXN: number;
        totalFacturadoUSD: number;
        totalPagadoMXN: number;
        totalPagadoUSD: number;
        totalPendienteMXN: number;
        totalPendienteUSD: number;
        numFacturas: number;
        numFacturasPagadas: number;
        numFacturasPendientes: number;
      }
    >();

    embarquesClienteFiltrados.forEach((embarque) => {
      const clienteId = embarque.cliente_id || "unknown";
      const cliente = clientes.find((c) => c.id === clienteId) || {
        nombre: "Cliente Desconocido",
      }; // Corrected field name

      if (!dataMap.has(clienteId)) {
        dataMap.set(clienteId, {
          cliente,
          totalFacturadoMXN: 0,
          totalFacturadoUSD: 0,
          totalPagadoMXN: 0,
          totalPagadoUSD: 0,
          totalPendienteMXN: 0,
          totalPendienteUSD: 0,
          numFacturas: 0,
          numFacturasPagadas: 0,
          numFacturasPendientes: 0,
        });
      }

  const entry = dataMap.get(clienteId)!;
  const monto = getMontoContable(embarque);

      entry.numFacturas++;

      if (embarque.moneda_flete === "USD") {
        entry.totalFacturadoUSD += monto;
        if (embarque.estado_facturacion === "pagado") {
          entry.totalPagadoUSD += monto;
          entry.numFacturasPagadas++;
        } else {
          entry.totalPendienteUSD += monto;
          entry.numFacturasPendientes++;
        }
      } else {
        entry.totalFacturadoMXN += monto;
        if (embarque.estado_facturacion === "pagado") {
          entry.totalPagadoMXN += monto;
          entry.numFacturasPagadas++;
        } else {
          entry.totalPendienteMXN += monto;
          entry.numFacturasPendientes++;
        }
      }
    });

    return Array.from(dataMap.values()).sort((a, b) =>
      a.cliente.nombre.localeCompare(b.cliente.nombre)
    ); // Corrected field name
  }, [embarquesClienteFiltrados, clientes]);

  const exportarDesgloseEmpresaExcel = () => {
    let csv =
      "Cliente,Total Facturado MXN,Total Pagado MXN,Total Pendiente MXN,Total Facturado USD,Total Pagado USD,Total Pendiente USD,Num Facturas,Num Facturas Pagadas,Num FacturasPendientes\n";
    desglosePorEmpresaData.forEach((data) => {
      csv += `${data.cliente.nombre},${data.totalFacturadoMXN},${data.totalPagadoMXN},${data.totalPendienteMXN},${data.totalFacturadoUSD},${data.totalPagadoUSD},${data.totalPendienteUSD},${data.numFacturas},${data.numFacturasPagadas},${data.numFacturasPendientes}\n`; // Corrected field name
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "desglose_por_empresa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleContingencyPaymentChange = (
    embarqueId: string,
    field: "original" | "reemplazo",
    value: number
  ) => {
    if (mounted.current) {
      setOperadoresContingencia((prev) => {
        const current = prev[embarqueId] || { original: 0, reemplazo: 0 };

        return {
          ...prev,
          [embarqueId]: {
            ...current,
            [field]: value,
          },
        };
      });
    }
  };

  const saveContingencyPayment = async (embarque: EmbarqueAsignado) => {
    const currentDivision = operadoresContingencia[embarque.id];
    if (!currentDivision) {
      toast({ title: 'No hay división de pago para guardar.', variant: 'destructive' });
  toast({ title: 'No hay división de pago para guardar.', variant: 'default' });
      return;
    }

    if (currentDivision.original <= 0 && currentDivision.reemplazo <= 0) {
      toast({ title: 'Asignar monto requerido', description: 'Debe asignar un monto mayor a 0 para al menos uno de los operadores.', variant: 'destructive' });
  toast({ title: 'Asignar monto requerido', description: 'Debe asignar un monto mayor a 0 para al menos uno de los operadores.', variant: 'default' });
      return;
    }

    try {
      const { error } = await supabase
        .from("operador_pagos_contingencia")
        .upsert(
          {
            embarque_id: embarque.id,
            operador_original_id:
              embarque.operadorOriginalId || embarque.operadorAsignado?.id,
            operador_reemplazo_id: embarque.operadorReemplazoId,
            monto_original: currentDivision.original,
            monto_reemplazo: currentDivision.reemplazo,
            fecha_registro: new Date().toISOString(),
            registrado_por: "Usuario Actual",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "embarque_id", ignoreDuplicates: false }
        );

        if (error) {
        console.error(
          "Error guardando división de pago de contingencia:",
          error
        );
        toast({ title: 'Error al guardar la división de pago', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al guardar la división de pago', description: String((error as any)?.message || ''), variant: 'default' });
      } else {
        toast({ title: 'División de pago guardada exitosamente', variant: 'default' });
  toast({ title: 'División de pago guardada exitosamente', variant: 'default' });
        if (mounted.current) {
          setEmbarquesOperadorFiltrados((prev) =>
            prev.map((e) =>
              e.id === embarque.id
                ? {
                    ...e,
                    montoOriginalContingencia: currentDivision.original,
                    montoReemplazoContingencia: currentDivision.reemplazo,
                  }
                : e
            )
          );
        }
      }
    } catch (error) {
      console.error("Error en saveContingencyPayment:", error);
      toast({ title: 'Error inesperado al guardar la división de pago', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error inesperado al guardar la división de pago', description: String((error as any)?.message || ''), variant: 'default' });
    }
  };

  useEffect(() => {
    if (!showAnalisisOperadoresModal || embarquesModificadosIds.length === 0) {
      return;
    }
    mounted.current = true;

    const loadContingencyPayments = async () => {
      try {
        const { data, error } = await supabase
          .from("operador_pagos_contingencia")
          .select("*")
          .in("embarque_id", embarquesModificadosIds);

        if (error) {
          console.error("Error cargando pagos de contingencia:", error);
          return;
        }

        const paymentsMap: typeof contingencyPaymentsDb = {};
        data.forEach((payment) => {
          paymentsMap[payment.embarque_id] = {
            monto_original: payment.monto_original,
            monto_reemplazo: payment.monto_reemplazo,
            operador_original_id: payment.operador_original_id,
            operador_reemplazo_id: payment.operador_reemplazo_id,
          };
        });
        if (mounted.current) setContingencyPaymentsDb(paymentsMap);

        const initialContingencyState: typeof operadoresContingencia = {};
        data.forEach((payment) => {
          initialContingencyState[payment.embarque_id] = {
            original: payment.monto_original,
            reemplazo: payment.monto_reemplazo,
          };
        });
        if (mounted.current) setOperadoresContingencia(initialContingencyState);
      } catch (error) {
        console.error("Error en loadContingencyPayments:", error);
      }
    };

    loadContingencyPayments();
    return () => {
      mounted.current = false;
    };
  }, [showAnalisisOperadoresModal, embarquesModificadosIds]);

  const consultarPagosOperador = useCallback(async () => {
    setLoadingPagos(true);
    if (mounted.current) setEmbarquesOperadorFiltrados([]);
    try {
      let query = supabase
        .from("embarques")
        .select(
          `
    *,
    cliente:clientes(nombre),
    operador:operadores(id, nombre, apellidos),
    tipo_servicio:tipos_servicio(nombre, precio_base)
  `
  )
  // Incluir finalizados y archivados (operativo); excluir sólo archivados en facturación
  .or("estado.ilike.finalizado%,estado.ilike.archivado%")
  .or("estado_facturacion.is.null,estado_facturacion.neq.archivado");

  // Nota: no filtramos por operador en el query; filtramos en cliente para considerar
  // operadores originales y de reemplazo además del asignado actual.

      if (fechaInicioPagos) {
        query = query.gte("fecha_creacion", fechaInicioPagos);
      }
      if (fechaFinPagos) {
        query = query.lte("fecha_creacion", fechaFinPagos);
      }

      const { data, error } = await query.order("fecha_creacion", {
        ascending: false,
      });

      if (error) {
        console.error("Error al consultar pagos de operador:", error);
        toast({ title: 'Error al consultar pagos de operador', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error al consultar pagos de operador', description: String((error as any)?.message || ''), variant: 'default' });
        if (mounted.current) setEmbarquesOperadorFiltrados([]);
        return;
      }

      const ids = (data || []).map((e: any) => e.id);

      // Cargar modificaciones en lote para obtener operador original y reemplazo
      let latestModsMap: Record<string, any> = {};
      try {
    const { data: modsData, error: modsError } = await supabase
          .from("embarque_modificaciones")
          .select(
      "embarque_id, operador_original_id, operador_original_nombre, operador_nuevo_id, operador_nuevo_nombre, razon, fecha_modificacion, flete_en_falso"
          )
          .in("embarque_id", ids)
          .order("fecha_modificacion", { ascending: false });
        if (!modsError && modsData) {
          for (const m of modsData) {
            if (!latestModsMap[m.embarque_id]) latestModsMap[m.embarque_id] = m;
          }
        } else if (modsError) {
          console.error("Error batch fetching modifications:", modsError);
        }
      } catch (e) {
        console.error("Excepción batch mods:", e);
      }

      // Cargar pagos de contingencia en lote
      let pagosMap: Record<string, { monto_original: number; monto_reemplazo: number }> = {};
      try {
        const { data: pagosData, error: pagosError } = await supabase
          .from("operador_pagos_contingencia")
          .select("embarque_id, monto_original, monto_reemplazo")
          .in("embarque_id", ids);
        if (!pagosError && pagosData) {
          for (const p of pagosData) pagosMap[p.embarque_id] = { monto_original: p.monto_original, monto_reemplazo: p.monto_reemplazo };
        } else if (pagosError) {
          console.error("Error batch fetching contingency payments:", pagosError);
        }
      } catch (e) {
        console.error("Excepción batch pagos:", e);
      }

      // Procesar embarques de forma asíncrona para calcular pagos correctos
      const embarquesFormateados: EmbarqueAsignado[] = [];
      
      for (const embarque of (data || [])) {
        // Calcular pago usando función asíncrona para obtener precio global de flete falso
        const pagoOperador = await calcularPagoOperadorAsync(embarque, embarque.tipo_servicio, tiposServicio);
        
        const formattedEmbarque: EmbarqueAsignado = {
          ...embarque,
          clienteNombre: embarque.cliente?.nombre || "Cliente no especificado",
          operadorAsignado: embarque.operador
            ? {
                id: embarque.operador.id,
                nombre: `${embarque.operador.nombre} ${
                  embarque.operador.apellidos || ""
                }`.trim(),
              }
            : { id: "", nombre: "Sin asignar" },
          tipoServicioNombre: embarque.tipo_servicio?.nombre || "Sin especificar",
          pagoOperador: pagoOperador,
          fechaAsignacion: embarque.fecha_creacion,
          modificadoPorEmergencia: embarquesModificadosIds.includes(embarque.id),
        };

        const mod = latestModsMap[embarque.id];
        if (mod) {
          formattedEmbarque.modificadoPorEmergencia = true;
          formattedEmbarque.operadorOriginalId = mod.operador_original_id;
          formattedEmbarque.operadorOriginalNombre = mod.operador_original_nombre;
          formattedEmbarque.operadorReemplazoId = mod.operador_nuevo_id;
          formattedEmbarque.operadorReemplazoNombre = mod.operador_nuevo_nombre;
          formattedEmbarque.motivoModificacion = mod.razon;
        }

        const pagos = pagosMap[embarque.id];
        if (formattedEmbarque.modificadoPorEmergencia) {
          if (pagos) {
            formattedEmbarque.montoOriginalContingencia = pagos.monto_original || 0;
            formattedEmbarque.montoReemplazoContingencia = pagos.monto_reemplazo || 0;
          } else {
            // Por defecto (sin división capturada): usar el pago del embarque para el operador Original
            // Esto permite que se visualice el monto del operador aunque no se haya dividido manualmente.
            formattedEmbarque.montoOriginalContingencia = formattedEmbarque.pagoOperador;
            formattedEmbarque.montoReemplazoContingencia = 0;
          }
        }

        embarquesFormateados.push(formattedEmbarque);
      }

      // Filtro por operador (cliente) que contempla asignado, original y reemplazo
      let embarquesFiltradosLocal = embarquesFormateados;
      if (filtroPagosOperadorId && filtroPagosOperadorId !== "todos") {
        if (String(filtroPagosOperadorId).startsWith("nombre:")) {
          const nombreSel = String(filtroPagosOperadorId).slice(7);
          embarquesFiltradosLocal = embarquesFormateados.filter((e) =>
            [
              e.operadorAsignado?.nombre,
              e.operadorOriginalNombre,
              e.operadorReemplazoNombre,
            ].some((n) => (n || "") === nombreSel)
          );
        } else {
          embarquesFiltradosLocal = embarquesFormateados.filter((e) =>
            [
              e.operadorAsignado?.id,
              e.operadorOriginalId,
              e.operadorReemplazoId,
            ].some((id) => (id || "") === filtroPagosOperadorId)
          );
        }
      }

      if (mounted.current) {
        setEmbarquesOperadorFiltrados(embarquesFiltradosLocal);

        const initialContingencyState: typeof operadoresContingencia = {};
        embarquesFiltradosLocal.forEach((e) => {
          if (e.modificadoPorEmergencia) {
            initialContingencyState[e.id] = {
              original: e.montoOriginalContingencia || 0,
              reemplazo: e.montoReemplazoContingencia || 0,
            };
          }
        });
        setOperadoresContingencia(initialContingencyState);
      }
    } catch (error) {
      console.error("Excepción al consultar pagos de operador:", error);
      toast({ title: 'Error inesperado al consultar pagos de operador', description: String((error as any)?.message || ''), variant: 'destructive' });
  toast({ title: 'Error inesperado al consultar pagos de operador', description: String((error as any)?.message || ''), variant: 'default' });
    } finally {
      if (mounted.current) setLoadingPagos(false);
    }
  }, [
    filtroPagosOperadorId,
    fechaInicioPagos,
    fechaFinPagos,
    embarquesModificadosIds,
    tiposServicio,
  ]);

  // Operadores para el modal de Pagos: incluir asignado, original y reemplazo del dataset cargado
  const operadoresUnicosPagos = useMemo(() => {
    const registros: Array<{ id: string; nombre: string }> = [];
    embarquesOperadorFiltrados.forEach((e) => {
      if (e.operadorAsignado?.id && e.operadorAsignado?.nombre) {
        registros.push({ id: e.operadorAsignado.id, nombre: e.operadorAsignado.nombre });
      } else if (e.operadorAsignado?.nombre) {
        registros.push({ id: `nombre:${e.operadorAsignado.nombre}`, nombre: e.operadorAsignado.nombre });
      }
      if (e.operadorOriginalId && e.operadorOriginalNombre) {
        registros.push({ id: e.operadorOriginalId, nombre: e.operadorOriginalNombre });
      } else if (e.operadorOriginalNombre) {
        registros.push({ id: `nombre:${e.operadorOriginalNombre}`, nombre: e.operadorOriginalNombre });
      }
      if (e.operadorReemplazoId && e.operadorReemplazoNombre) {
        registros.push({ id: e.operadorReemplazoId, nombre: e.operadorReemplazoNombre });
      } else if (e.operadorReemplazoNombre) {
        registros.push({ id: `nombre:${e.operadorReemplazoNombre}`, nombre: e.operadorReemplazoNombre });
      }
    });
    const map = new Map<string, { id: string; nombre: string }>();
    registros.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [embarquesOperadorFiltrados]);

  useEffect(() => {
    if (showPagosOperadoresModal) {
      consultarPagosOperador();
    }
  }, [showPagosOperadoresModal, consultarPagosOperador]);

  const totalPagesClientes = Math.ceil(
    embarquesClienteFiltrados.length / itemsPerPageClientes
  );
  const paginatedEmbarquesClientes = useMemo(() => {
    const startIndex = (currentPageClientes - 1) * itemsPerPageClientes;
    const endIndex = startIndex + itemsPerPageClientes;
    return embarquesClienteFiltrados.slice(startIndex, endIndex);
  }, [embarquesClienteFiltrados, currentPageClientes, itemsPerPageClientes]);

  const handlePageChangeClientes = (page: number) => {
    if (page > 0 && page <= totalPagesClientes) {
      setCurrentPageClientes(page);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Facturación / Cobranza
            </h1>
            <p className="text-gray-600 mt-2">
              Consultar embarques finalizados desde Asignación de Embarques,
              generar reportes y gestionar facturación
            </p>
          </div>
          <div className="flex space-x-2">
            <Dialog
              open={showAnalisisOperadoresModal}
              onOpenChange={setShowAnalisisOperadoresModal}
            >
              <DialogContent className="max-w-7xl w-[96vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Análisis de Operadores - Pagos y Rendimiento
                  </DialogTitle>
                  <DialogDescription>
                    Consultar embarques asignados por operador, calcular pagos
                    por tipo de servicio y gestionar casos de contingencia
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap justify-between gap-3 mb-4 items-end">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col">
                      <Label className="text-xs text-gray-600 mb-1">
                        Desde
                      </Label>
                      <Input
                        type="date"
                        value={fechaInicioAnalisis}
                        onChange={(e) => {
                          setFechaInicioAnalisis(e.target.value);
                          if (analisisError) setAnalisisError(null);
                          // No generar análisis automáticamente - esperar a que el usuario presione "Analizar"
                        }}
                        className="w-36"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-xs text-gray-600 mb-1">
                        Hasta
                      </Label>
                      <Input
                        type="date"
                        value={fechaFinAnalisis}
                        onChange={(e) => {
                          setFechaFinAnalisis(e.target.value);
                          if (analisisError) setAnalisisError(null);
                          // No generar análisis automáticamente - esperar a que el usuario presione "Analizar"
                        }}
                        className="w-36"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-xs text-gray-600 mb-1">
                        Operador
                      </Label>
                      <select
                        value={filtroAnalisisOperador}
                        onChange={(e) => {
                          const nuevoValor = e.target.value;
                          console.log('🔍 Operador seleccionado en dropdown:', nuevoValor);
                          
                          // Mostrar información detallada del operador seleccionado
                          if (nuevoValor !== "todos") {
                            const operadorInfo = todosOperadores.find(op => op.id === nuevoValor);
                            if (operadorInfo) {
                              const nombreCompleto = `${operadorInfo.nombre || ''} ${operadorInfo.apellidos || ''}`.trim();
                              console.log('📋 Información del operador seleccionado:', { 
                                id: nuevoValor, 
                                nombre: operadorInfo.nombre,
                                apellidos: operadorInfo.apellidos,
                                nombreCompleto,
                                estado: operadorInfo.estado
                              });
                            } else {
                              console.log('⚠️ No se encontró información para el operador ID:', nuevoValor);
                            }
                          } else {
                            console.log('📋 Seleccionado: Todos los operadores');
                          }
                          
                          setFiltroAnalisisOperador(nuevoValor);
                          
                          // Limpiar error anterior si existe
                          if (analisisError) setAnalisisError(null);
                          
                          // No generar análisis automáticamente - esperar a que el usuario presione "Analizar"
                          console.log('💡 Presiona el botón "Analizar" para generar el análisis con el operador seleccionado');
                        }}
                        className="border rounded px-3 py-2 w-56 h-10 text-sm"
                        disabled={loadingEmbarques}
                      >
                        <option value="todos">Todos los operadores</option>
                        {/* Mostrar mensaje si no hay operadores */}
                        {!todosOperadores || todosOperadores.length === 0 ? (
                          <option disabled>Cargando operadores...</option>
                        ) : (
                          todosOperadores.map((op) => {
                          const fullName = `${(op.nombre||'').toString().trim()} ${(op.apellidos||'').toString().trim()}`.trim();
                          // Usar siempre el ID si existe, sino usar un identificador único
                          const value = op.id ? op.id : `nombre:${fullName}`;
                          const displayName = fullName || 'Sin nombre';
                          const estadoSuffix = op.estado && op.estado !== 'activo' ? ` (${op.estado})` : '';
                          
                          return (
                            <option key={op.id || `name-${fullName}`} value={value}>
                              {displayName}{estadoSuffix}
                            </option>
                          );
                        })
                        )}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-xs text-gray-600 mb-1">
                        Periodo
                      </Label>
                      <div className="flex items-end gap-2">
                        <select
                          value={periodoAnalisis}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPeriodoAnalisis(val);
                            setPeriodoActual(val);
                            // No generar análisis automáticamente - esperar a que el usuario presione "Analizar"
                          }}
                          className="border rounded px-3 py-2 w-56 h-10 text-sm"
                        >
                          <option value="mes">Mes actual</option>
                          <option value="mes_anterior">Mes anterior</option>
                          <option value="dos_meses_atras">
                            Dos meses atrás
                          </option>
                          <option value="tres_meses_atras">
                            Tres meses atrás
                          </option>
                          <option value="seis_meses_atras">
                            Seis meses atrás
                          </option>
                          <option value="un_ano_atras">Un año atrás</option>
                          <option value="año">Año actual</option>
                        </select>

                        <Button
                          onClick={() => {
                            console.log('🚀 Iniciando análisis manual por solicitud del usuario');
                            generarAnalisisOperadores();
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={loadingAnalisis || !fechaInicioAnalisis || !fechaFinAnalisis}
                        >
                          {loadingAnalisis ? 'Analizando...' : 'Analizar'}
                        </Button>
                        
                        <Button
                          onClick={exportarAnalisisExcel}
                          variant="outline"
                          disabled={
                            !analisisData.embarquesFiltradosAnalisis.length
                          }
                        >
                          Exportar Excel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {analisisError && (
                  <div className="-mt-2 mb-2 text-sm text-red-600">
                    {analisisError}
                  </div>
                )}
                {loadingAnalisis ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                    <span className="ml-2 text-sm text-gray-600">
                      Generando análisis...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 gap-3">
                      <div className="flex items-center gap-2 w-full">
                        <Tabs value={activeAnalisisTab} onValueChange={setActiveAnalisisTab} className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="porOperador">Por Operador</TabsTrigger>
                            <TabsTrigger value="detalle">Detalle</TabsTrigger>
                            <TabsTrigger value="contingencia">Casos de Contingencia</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <button
                          type="button"
                          onClick={() => setShowContingenciaInfo(true)}
                          aria-label="¿Qué es contingencia?"
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="¿Qué es contingencia?"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Resumen general movido al final del tab Por Operador */}
                    </div>
                    {analisisData.resumenGeneral === null && (
                      <div className="text-center py-8 text-gray-500">
                        Por favor, selecciona las fechas y operador, luego presiona el botón "Analizar" para generar el análisis.
                      </div>
                    )}
                    {activeAnalisisTab === "resumen" &&
                      analisisData.resumenGeneral && (
                        <div className="mb-6">
                          <h3 className="font-bold text-lg mb-2">
                            Resumen General
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-gray-700 font-medium">
                                Total Operadores
                              </p>
                              <p className="text-2xl font-bold text-blue-700">
                                {analisisData.resumenGeneral.operadores}
                              </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-gray-700 font-medium">
                                Total Embarques
                              </p>
                              <p className="text-2xl font-bold text-green-700">
                                {analisisData.resumenGeneral.totalEmbarques}
                              </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="text-gray-700 font-medium">
                                Total a Pagar MXN
                              </p>
                              <p className="text-2xl font-bold text-purple-700">
                                {`$${analisisData.resumenGeneral.totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-orange-800">
                                Casos Contingencia
                              </p>
                              <p className="text-2xl font-bold text-orange-900">
                                {analisisData.resumenGeneral
                                  .casosContingencia || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    {activeAnalisisTab === "porOperador" &&
                      analisisData.analisisPorOperador.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">
                              Pagos y Embarques por Operador
                            </h3>
                            <div className="hidden md:flex items-center gap-7 text-base text-gray-700">
                              {(() => {
                                // Construir la lista base (todos o por operador) desde los embarques mostrados en análisis
                                const baseLista: any[] = analisisData.embarquesFiltradosAnalisis || [];
                                const lista =
                                  filtroAnalisisOperador === "todos"
                                    ? baseLista
                                    : baseLista.filter(
                                        (e: any) =>
                                          (e?.operadorAsignado?.nombre || "") ===
                                          (filtroAnalisisOperador || "")
                                      );

                                const embarques = lista.length;
                                const cont = lista.filter((e: any) => e.modificadoPorEmergencia).length;
                                const total = lista.reduce((sum: number, e: any) => {
                                  if (e.modificadoPorEmergencia) {
                                    const m = (operadoresContingencia as any)[e.id] || {};
                                    const monto = e.rolContingencia === "original" ? (m.original || 0) : (m.reemplazo || 0);
                                    return sum + (monto || 0);
                                  }
                                  return sum + (e.pagoOperador || 0);
                                }, 0);

                                return (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Embarques:</span>
                                      <span className="font-semibold">{embarques}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Contingencia:</span>
                                      <span className="font-semibold">{cont}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Total a pagar:</span>
                                      <span className="font-semibold">{`$${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Controles de paginación */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Renglones por página:</span>
                              <select
                                className="border rounded px-2 py-1"
                                value={itemsPerPageAnalisisOp}
                                onChange={(e) => {
                                  setItemsPerPageAnalisisOp(
                                    Number(e.target.value)
                                  );
                                  setCurrentPageAnalisisOp(1);
                                }}
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className="text-sm text-gray-600">
                              {(() => {
                                const lista = analisisData.analisisPorOperador;
                                const total = lista.length;
                                const start =
                                  (currentPageAnalisisOp - 1) *
                                    itemsPerPageAnalisisOp +
                                  1;
                                const end = Math.min(
                                  currentPageAnalisisOp *
                                    itemsPerPageAnalisisOp,
                                  total
                                );
                                return `${start}-${end} de ${total}`;
                              })()}
                            </div>
                          </div>
                          <div className="overflow-x-auto mb-4">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 text-left min-w-[100px]">
                                    Operador
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Total Pagos
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Cantidad Embarques
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Correctos
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Cancelados
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Contingencia
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Promedio/Embarque
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const lista =
                                    analisisData.analisisPorOperador;
                                  const totalPages = Math.max(
                                    1,
                                    Math.ceil(
                                      lista.length / itemsPerPageAnalisisOp
                                    )
                                  );
                                  const startIndex =
                                    (currentPageAnalisisOp - 1) *
                                    itemsPerPageAnalisisOp;
                                  const endIndex =
                                    startIndex + itemsPerPageAnalisisOp;
                                  const pageItems = lista.slice(
                                    startIndex,
                                    endIndex
                                  );
                                  return pageItems.map((op: any) => (
                                    <tr key={op.nombre} className="border-b">
                                      <td className="px-2 py-1">{op.nombre}</td>
                                      <td className="px-2 py-1 text-center">{`$${op.totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                      <td className="px-2 py-1 text-center">
                                        {op.cantidadEmbarques}
                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        {op.correctos > 0 ? (
                                          <Badge className="bg-green-100 text-green-800">
                                            {op.correctos}
                                          </Badge>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        {op.cancelados > 0 ? (
                                          <Badge className="bg-red-100 text-red-800">
                                            {op.cancelados}
                                          </Badge>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        {op.embarquesContingencia > 0 ? (
                                          <Badge variant="destructive">
                                            {op.embarquesContingencia}
                                          </Badge>
                                        ) : (
                                          "0"
                                        )}
                                      </td>
                                      <td className="px-2 py-1 text-center">{`$${op.promedioPorEmbarque.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                          {/* Controles de paginación */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm text-gray-600">
                              Página {currentPageAnalisisOp} de{" "}
                              {Math.max(
                                1,
                                Math.ceil(
                                  analisisData.analisisPorOperador.length /
                                    itemsPerPageAnalisisOp
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCurrentPageAnalisisOp((p) =>
                                    Math.max(1, p - 1)
                                  )
                                }
                                disabled={currentPageAnalisisOp === 1}
                              >
                                Anterior
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCurrentPageAnalisisOp((p) =>
                                    Math.min(
                                      Math.max(
                                        1,
                                        Math.ceil(
                                          analisisData.analisisPorOperador
                                            .length / itemsPerPageAnalisisOp
                                        )
                                      ),
                                      p + 1
                                    )
                                  )
                                }
                                disabled={
                                  currentPageAnalisisOp >=
                                  Math.max(
                                    1,
                                    Math.ceil(
                                      analisisData.analisisPorOperador.length /
                                        itemsPerPageAnalisisOp
                                    )
                                  )
                                }
                              >
                                Siguiente
                              </Button>
                            </div>
                          </div>
                          {/* Resumen simple mostrado arriba, a la derecha del título */}
                          {/* Resumen para operador específico ahora se muestra arriba, a la derecha del título */}
                          {false && filtroAnalisisOperador === "todos" && analisisData.resumenGeneral}
                        </div>
                      )}
                    {activeAnalisisTab === "detalle" &&
                      analisisData.embarquesFiltradosAnalisis.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">
                              Detalle de Embarques por Operador
                            </h3>
                            <div className="hidden md:flex items-center gap-7 text-base text-gray-700">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Embarques:</span>
                                <span className="font-semibold">{analisisData.embarquesFiltradosAnalisis.length}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Contingencia:</span>
                                <span className="font-semibold">{analisisData.embarquesFiltradosAnalisis.filter((e: any) => e.modificadoPorEmergencia).length}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Total a pagar:</span>
                                <span className="font-semibold">{(() => {
                                  const total = (analisisData.embarquesFiltradosAnalisis || []).reduce((sum: number, e: any) => {
                                    if (e.modificadoPorEmergencia) {
                                      const m = operadoresContingencia[e.id] || {} as any;
                                      const monto = e.rolContingencia === "original" ? (m.original || 0) : (m.reemplazo || 0);
                                      return sum + (monto || 0);
                                    }
                                    return sum + (e.pagoOperador || 0);
                                  }, 0);
                                  return `$${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                })()}</span>
                              </div>
                            </div>
                          </div>
                          {/* Controles de paginación (Detalle) */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Renglones por página:</span>
                              <select
                                className="border rounded px-2 py-1"
                                value={itemsPerPageAnalisisDetalle}
                                onChange={(e) => {
                                  setItemsPerPageAnalisisDetalle(
                                    Number(e.target.value)
                                  );
                                  setCurrentPageAnalisisDetalle(1);
                                }}
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className="text-sm text-gray-600">
                              {(() => {
                                const lista =
                                  analisisData.embarquesFiltradosAnalisis;
                                const total = lista.length;
                                const start =
                                  (currentPageAnalisisDetalle - 1) *
                                    itemsPerPageAnalisisDetalle +
                                  1;
                                const end = Math.min(
                                  currentPageAnalisisDetalle *
                                    itemsPerPageAnalisisDetalle,
                                  total
                                );
                                return `${start}-${end} de ${total}`;
                              })()}
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 text-left min-w-[120px]">
                                    Folio
                                  </th>
                                  <th className="px-2 py-1 text-left">
                                    Operador
                                  </th>
                                  <th className="px-2 py-1 text-left w-56">
                                    Cliente
                                  </th>
                                  <th className="px-2 py-1 text-left">Load</th>
                                  <th className="px-2 py-1 text-left">Fecha</th>
                                  <th className="px-2 py-1 text-left min-w-[24px]">
                                    Tipo Servicio
                                  </th>
                                  <th className="px-2 py-1 text-center w-40">
                                    Pago Operador
                                  </th>
                                  <th className="px-2 py-1 text-center w-40">
                                    Contingencia/Cancelado
                                  </th>
                                  <th className="px-2 py-1 text-center">
                                    Acciones
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const lista = analisisData.embarquesFiltradosAnalisis || [];
                                  const startIndex = (currentPageAnalisisDetalle - 1) * itemsPerPageAnalisisDetalle;
                                  const endIndex = startIndex + itemsPerPageAnalisisDetalle;
                                  const pageItems = lista.slice(startIndex, endIndex);
                                  return pageItems.map((e: any) => (
                                    <tr
                                      key={`${e.id}-${e.rolContingencia || "normal"}`}
                                      className="border-b"
                                    >
                                      <td className="px-2 py-1 min-w-[120px]">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono">{e.folio}</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1 min-w-[100px] break-words">
                                        {e.operadorAsignado?.nombre}
                                      </td>
                                      <td className="px-2 py-1 w-56 truncate whitespace-nowrap">
                                        {e.clienteNombre}
                                      </td>
                                      <td className="px-2 py-1 font-mono truncate">
                                        {(e as any).load_number || (e as any).numeroLoad || ""}
                                      </td>
                                      <td className="px-2 py-1">
                                        {e.fechaAsignacion
                                          ? new Date(e.fechaAsignacion).toLocaleDateString("es-MX")
                                          : ""}
                                      </td>
                                      <td className="px-2 py-1 min-w-[24px] break-words">
                                        {e.tipoServicioNombre}
                                      </td>
                                      <td className="px-2 py-1 text-center w-40 whitespace-nowrap">
                                        {(() => {
                                          const monto = Number(e.pago_operador ?? 0);
                                          const seguro = Number.isFinite(monto) ? monto : 0;
                                          return `$${seguro.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        })()}
                                      </td>
                                      <td className="px-2 py-1 text-center w-40 whitespace-nowrap">
                                        {(() => {
                                          const elementos: any[] = [];
                                          if (e.modificadoPorEmergencia) {
                                            const folio = e.folio || "";
                                            const folioShort = folio.includes("-") ? folio.split("-").slice(1).join("-") : folio;
                                            elementos.push(
                                              <Badge key="contingencia" variant="destructive">{`Sí${folioShort ? ` / ${folioShort}` : ""}`}</Badge>
                                            );
                                          } else {
                                            elementos.push(<span key="no">No</span>);
                                          }

                                          if (esCancelado(e)) {
                                            elementos.push(<span key="sep-cancelado" className="text-gray-400">/</span>);
                                            elementos.push(<Badge key="cancelado" className="bg-purple-600 text-white">Cancelado</Badge>);
                                          }

                                          return (<div className="flex items-center justify-center gap-2">{elementos}</div>);
                                        })()}
                                      </td>
                                      <td className="px-2 py-1 text-center">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => verDetallesEmbarque(e)}
                                            aria-label="Ver detalles"
                                          >
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                          {/* Controles de paginación (Detalle) */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm text-gray-600">
                              Página {currentPageAnalisisDetalle} de{" "}
                              {Math.max(
                                1,
                                Math.ceil(
                                  analisisData.embarquesFiltradosAnalisis
                                    .length / itemsPerPageAnalisisDetalle
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCurrentPageAnalisisDetalle((p) =>
                                    Math.max(1, p - 1)
                                  )
                                }
                                disabled={currentPageAnalisisDetalle === 1}
                              >
                                Anterior
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCurrentPageAnalisisDetalle((p) =>
                                    Math.min(
                                      Math.max(
                                        1,
                                        Math.ceil(
                                          analisisData
                                            .embarquesFiltradosAnalisis.length /
                                            itemsPerPageAnalisisDetalle
                                        )
                                      ),
                                      p + 1
                                    )
                                  )
                                }
                                disabled={
                                  currentPageAnalisisDetalle >=
                                  Math.max(
                                    1,
                                    Math.ceil(
                                      analisisData.embarquesFiltradosAnalisis
                                        .length / itemsPerPageAnalisisDetalle
                                    )
                                  )
                                }
                              >
                                Siguiente
                              </Button>
                            </div>
                          </div>
                          {/* Resumen del detalle se muestra arriba, a la derecha del título */}
                        </div>
                      )}
                    {activeAnalisisTab === "contingencia" &&
                      analisisData.embarquesFiltradosAnalisis.filter((e: any) =>
                        embarquesModificadosIds.includes(e.id)
                      ).length > 0 && (
                        <div className="space-y-6">

                          {/* Texto informativo removido; usar el modal de ayuda con ícono ? */}

                          {/* Casos de contingencia encontrados */}
                          {analisisData.embarquesFiltradosAnalisis && (
                            <div className="space-y-4">
                              {analisisData.embarquesFiltradosAnalisis
                                .filter((e: any) =>
                                  embarquesModificadosIds.includes(e.id)
                                )
                                // Mantener un solo card por embarque de contingencia
                                .filter(
                                  (e: any, idx: number, arr: any[]) =>
                                    idx ===
                                    arr.findIndex((x: any) => x.id === e.id)
                                )
                                .map((embarque: EmbarqueAsignado) => (
                                  <Card
                                    key={embarque.id}
                                    className="border border-gray-200 bg-white"
                                  >
                                    <CardHeader>
                                      <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg text-gray-800 flex items-center">
                                          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                                          <span className="font-medium text-red-600">Caso de Contingencia</span>
                                          <span className="ml-3 font-mono text-sm text-red-600">{embarque.folio}</span>
                                          {esCancelado(embarque) && (
                                            <Badge className="ml-2 bg-gray-700 text-white">Cancelado</Badge>
                                          )}
                                          {esFleteFalso(embarque) && (
                                            <span 
                                              className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                                              title="Este embarque está marcado como flete en falso (contingencia)"
                                            >
                                              Flete F.
                                            </span>
                                          )}
                                        </CardTitle>
                                        {/* removed 'Requiere atención' badge as requested */}
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      {/* Compacta: información clave en una cuadrícula ligera */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                                        <div>
                                          <div className="text-xs text-gray-500">Cliente</div>
                                          <div className="font-medium">{embarque.clienteNombre}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500">Fecha</div>
                                          <div className="font-medium">{new Date(embarque.fechaAsignacion || "").toLocaleDateString("es-MX")}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500">Tipo de Servicio</div>
                                          <div className="font-medium">{embarque.tipoServicioNombre || "Sin especificar"}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500">Operador Original</div>
                                          <div className="font-medium">{embarque.operadorOriginalNombre || embarque.operadorAsignado?.nombre || "No especificado"}</div>
                                        </div>
                                        {embarque.operadorReemplazoNombre && (
                                          <div>
                                            <div className="text-xs text-gray-500">Operador Reemplazo</div>
                                            <div className="font-medium">{embarque.operadorReemplazoNombre}</div>
                                          </div>
                                        )}
                                        <div>
                                          <div className="text-xs text-gray-500">Pago Base</div>
                                          <div className="font-medium">
                                            {`$${Number(
                                              (embarque.estado === 'asignado_contingencia' || embarque.modificadoPorEmergencia) 
                                                ? 0 
                                                : (embarque.pagoOperador || 0)
                                            ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            {(embarque.estado === 'asignado_contingencia' || embarque.modificadoPorEmergencia) && (
                                              <span className="text-xs text-red-600 ml-1">(Contingencia)</span>
                                            )}
                                          </div>
                                        </div>
                                        {embarque.motivoModificacion && (
                                          <div className="md:col-span-3 text-sm text-gray-600">
                                            <div className="text-xs text-gray-500">Motivo</div>
                                            <div>{embarque.motivoModificacion}</div>
                                          </div>
                                        )}
                                      </div>

                                      {/* División de Pago compacta */}
                                      <div className="flex flex-col md:flex-row md:items-center gap-3 mt-4">
                                        <div className="flex items-center gap-3">
                                          <div className="text-xs text-gray-500">Original</div>
                                          <Input
                                            type="number"
                                            id={`pago-original-${embarque.id}`}
                                            aria-label="Pago operador original"
                                            placeholder="$"
                                            value={operadoresContingencia[embarque.id]?.original || 0}
                                            onChange={(e) => {
                                              const valor = Number(e.target.value);
                                              if (!isNaN(valor)) {
                                                handleContingencyPaymentChange(embarque.id, "original", valor);
                                              }
                                            }}
                                            className="w-24 text-right text-sm"
                                          />
                                        </div>

                                        {embarque.operadorReemplazoNombre && (
                                          <div className="flex items-center gap-3">
                                            <div className="text-xs text-gray-500">Reemplazo</div>
                                            <Input
                                              type="number"
                                              id={`pago-reemplazo-${embarque.id}`}
                                              aria-label="Pago operador de reemplazo"
                                              placeholder="$"
                                              value={operadoresContingencia[embarque.id]?.reemplazo || 0}
                                              onChange={(e) => {
                                                const valor = Number(e.target.value);
                                                if (!isNaN(valor)) {
                                                  handleContingencyPaymentChange(embarque.id, "reemplazo", valor);
                                                }
                                              }}
                                              className="w-24 text-right text-sm"
                                            />
                                          </div>
                                        )}

                                        <div className="ml-auto text-right">
                                          <div className="text-sm font-medium">
                                            {(() => {
                                              const orig = operadoresContingencia[embarque.id]?.original || 0;
                                              const repl = embarque.operadorReemplazoNombre ? (operadoresContingencia[embarque.id]?.reemplazo || 0) : 0;
                                              const total = orig + repl;
                                              return `Total: $${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                            })()}
                                          </div>
                                          <div className="mt-2">
                                            <Button
                                              size="sm"
                                              onClick={() => saveContingencyPayment(embarque)}
                                              disabled={(operadoresContingencia[embarque.id]?.original || 0) <= 0 && (!!embarque.operadorReemplazoNombre ? (operadoresContingencia[embarque.id]?.reemplazo || 0) <= 0 : true)}
                                              className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                              <Save className="h-4 w-4 mr-2" />
                                              Guardar
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    {activeAnalisisTab === "contingencia" &&
                      analisisData.embarquesFiltradosAnalisis.filter((e: any) =>
                        embarquesModificadosIds.includes(e.id)
                      ).length === 0 &&
                      analisisData.resumenGeneral && (
                        <div className="text-center py-8 text-gray-500">
                          No se encontraron casos de contingencia para el
                          período y filtros seleccionados.
                        </div>
                      )}
                  </>
                )}
              </DialogContent>
            </Dialog>
            {/* Confirmation dialog for delete/deactivate tipo servicio */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {confirmAction === 'deactivate' ? 'Desactivar tipo de servicio' : 'Confirmar eliminación'}
                  </DialogTitle>
                  <DialogDescription>
                    {confirmDialogMessage}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4" />
                <DialogFooter>
                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="ghost" onClick={handleCancelConfirm}>Cancelar</Button>
                    {confirmAction === 'deactivate' ? (
                      <Button variant="default" onClick={async () => { if (tipoPending) { await performDeactivate(tipoPending); setConfirmDialogOpen(false); setTipoPending(null); } }}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={async () => { if (tipoPending) { await performDelete(tipoPending); setConfirmDialogOpen(false); setTipoPending(null); } }}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Modal discreto de ayuda para Casos de Contingencia */}
            <Dialog open={showContingenciaInfo} onOpenChange={setShowContingenciaInfo}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Casos de Contingencia — Ayuda</DialogTitle>
                  <DialogDescription>
                    Guía breve sobre cómo se muestran y gestionan.
                  </DialogDescription>
                </DialogHeader>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    Un caso de contingencia sucede cuando un embarque cambia de operador por una emergencia
                    (enfermedad, accidente, etc.).
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>El mismo folio se refleja para <strong>Operador Original</strong> y <strong>Reemplazo</strong>.</li>
                    <li>Los pagos <strong>no se calculan automáticamente</strong>; asigna montos manualmente a cada uno.</li>
                    <li>El <strong>pago base</strong> del servicio es solo <em>referencia</em>; puedes dividir como corresponda.</li>
                    <li>Aplican los filtros de <strong>Periodo</strong> y <strong>Operador</strong> del análisis.</li>
                    <li>Usa “Guardar División de Pago” para registrar los montos.</li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showPagosOperadoresModal}
              onOpenChange={setShowPagosOperadoresModal}
            >
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Pagos a Operadores</DialogTitle>
                  <DialogDescription>
                    Consulta los embarques asignados a un operador en un rango
                    de fechas para gestionar sus pagos.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-2 mb-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <Label htmlFor="select-operador-pagos">Operador</Label>
                    <Select
                      value={filtroPagosOperadorId}
                      onValueChange={(value) => setFiltroPagosOperadorId(value)}
                      disabled={loadingEmbarques}
                    >
                      <SelectTrigger id="select-operador-pagos">
                        <SelectValue placeholder="Selecciona un operador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">
                          Todos los operadores
                        </SelectItem>
                        {operadoresUnicosPagos.map((operador) => (
                          <SelectItem key={operador.id} value={operador.id}>
                            {operador.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label htmlFor="filtro-periodo-pagos">Periodo</Label>
                    <Select
                      value={filtroPeriodoPagos}
                      onValueChange={handlePeriodoPagosChange}
                    >
                      <SelectTrigger id="filtro-periodo-pagos">
                        <SelectValue placeholder="Selecciona un periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Personalizado</SelectItem>
                        <SelectItem value="current_month">
                          Mes actual
                        </SelectItem>
                        <SelectItem value="last_month">Mes anterior</SelectItem>
                        <SelectItem value="last_2_months">
                          Últimos 2 meses
                        </SelectItem>
                        <SelectItem value="last_3_months">
                          Últimos 3 meses
                        </SelectItem>
                        <SelectItem value="last_6_months">
                          Últimos 6 meses
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label htmlFor="fecha-inicio-pagos">Desde</Label>
                    <Input
                      type="date"
                      id="fecha-inicio-pagos"
                      value={fechaInicioPagos}
                      onChange={(e) => {
                        setFechaInicioPagos(e.target.value);
                        setFiltroPeriodoPagos("custom");
                      }}
                      disabled={filtroPeriodoPagos !== "custom"}
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label htmlFor="fecha-fin-pagos">Hasta</Label>
                    <Input
                      type="date"
                      id="fecha-fin-pagos"
                      value={fechaFinPagos}
                      onChange={(e) => {
                        setFechaFinPagos(e.target.value);
                        setFiltroPeriodoPagos("custom");
                      }}
                      disabled={filtroPeriodoPagos !== "custom"}
                    />
                  </div>
                  <Button
                    onClick={consultarPagosOperador}
                    disabled={loadingPagos}
                  >
                    {loadingPagos ? "Consultando..." : "Iniciar Consulta"}
                  </Button>
                </div>

                <Tabs
                  value={activePagosTab}
                  onValueChange={setActivePagosTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="detalle">
                      Detalle de Embarques
                    </TabsTrigger>
                    <TabsTrigger value="desglose">
                      Desglose Individual por Operador
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="detalle">
                    {loadingPagos ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                        <span className="ml-2 text-sm text-gray-600">
                          Cargando embarques...
                        </span>
                      </div>
                    ) : embarquesOperadorFiltrados.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No se encontraron embarques para los filtros
                        seleccionados.
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 text-right text-lg font-bold text-gray-800">
                          Total Pagos Filtrados: $
                          {totalPagosFiltrados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left">Folio</th>
                                <th className="px-2 py-1 text-left">Cliente</th>
                                <th className="px-2 py-1 text-left">
                                  Tipo de Servicio
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Fecha Asignación
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Pago Base
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Contingencia
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Operador Original
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Pago Original
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Operador Reemplazo
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Pago Reemplazo
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {embarquesOperadorFiltrados.map((embarque) => (
                                <tr key={embarque.id} className="border-b">
                                  <td className="px-2 py-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {embarque.folio}
                                      {esCancelado(embarque) && (
                                        <Badge className="bg-purple-600 text-white">Cancelado</Badge>
                                      )}
                                      {(() => {
                                        // Badge de Direcciones Múltiples
                                        if (embarqueTieneMultiplesDirecciones(embarque)) {
                                          return (
                                            <span 
                                              className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help"
                                              title="Este embarque tiene múltiples direcciones de recolección o entrega"
                                            >
                                              D. Múltiples
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {(() => {
                                        // Badge de Flete Falso
                                        if (esFleteFalso(embarque)) {
                                          return (
                                            <span 
                                              className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                                              title="Este embarque está marcado como flete en falso (contingencia)"
                                            >
                                              Flete F.
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1">
                                    {embarque.clienteNombre}
                                  </td>
                                  <td className="px-2 py-1">
                                    {embarque.tipoServicioNombre}
                                  </td>
                                  <td className="px-2 py-1">
                                    {new Date(
                                      embarque.fechaAsignacion!
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-2 py-1">
                                    $
                                    {(
                                      (embarque.estado === 'asignado_contingencia' || embarque.modificadoPorEmergencia) 
                                        ? 0 
                                        : (embarque.pagoOperador || 0)
                                    ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {(embarque.estado === 'asignado_contingencia' || embarque.modificadoPorEmergencia) && (
                                      <span className="text-xs text-red-600 ml-1">(Contingencia)</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1">
                                    {embarque.modificadoPorEmergencia ? (
                                      <Badge variant="destructive">Sí</Badge>
                                    ) : (
                                      "No"
                                    )}
                                  </td>
                                  {embarque.modificadoPorEmergencia ? (
                                    <>
                                      <td className="px-2 py-1 text-xs">
                                        {embarque.operadorOriginalNombre ||
                                          embarque.operadorAsignado?.nombre}
                                      </td>
                                      <td className="px-2 py-1">
                                        <Input
                                          type="number"
                                          value={
                                            operadoresContingencia[embarque.id]
                                              ?.original || 0
                                          }
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (!isNaN(val))
                                              handleContingencyPaymentChange(
                                                embarque.id,
                                                "original",
                                                val
                                              );
                                          }}
                                          className="w-24 text-right text-xs"
                                        />
                                      </td>
                                      <td className="px-2 py-1 text-xs">
                                        {embarque.operadorReemplazoNombre ||
                                          "N/A"}
                                      </td>
                                      <td className="px-2 py-1">
                                        <Input
                                          type="number"
                                          value={
                                            operadoresContingencia[embarque.id]
                                              ?.reemplazo || 0
                                          }
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (!isNaN(val))
                                              handleContingencyPaymentChange(
                                                embarque.id,
                                                "reemplazo",
                                                val
                                              );
                                          }}
                                          className="w-24 text-right"
                                        />
                                      </td>
                                      <td className="px-2 py-1">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            saveContingencyPayment(embarque)
                                          }
                                          disabled={
                                            (operadoresContingencia[embarque.id]
                                              ?.original || 0) <= 0 &&
                                            (operadoresContingencia[embarque.id]
                                              ?.reemplazo || 0) <= 0
                                          }
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1" colSpan={5}>
                                        {embarque.operadorAsignado?.nombre}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="desglose">
                    {loadingPagos ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                        <span className="ml-2 text-sm text-gray-600">
                          Calculando desglose...
                        </span>
                      </div>
                    ) : operadorDesgloseData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No se encontraron datos de desglose para los filtros
                        seleccionados.
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end mb-4">
                          <Button
                            onClick={exportarDesgloseOperadoresExcel}
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Desglose Excel
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left">
                                  Operador
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Total Pagos (Periodo Filtrado)
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Total Pagos (Mes Actual)
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Cantidad Embarques
                                </th>
                                <th className="px-2 py-1 text-left">
                                  Casos Contingencia
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {operadorDesgloseData.map((data) => (
                                <tr key={data.operador.id} className="border-b">
                                  <td className="px-2 py-1 font-medium">
                                    {data.operador.nombre}
                                  </td>
                                  <td className="px-2 py-1">
                                    ${data.totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-2 py-1">
                                    ${data.totalPagosMesActual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-2 py-1">
                                    {data.cantidadEmbarques}
                                  </td>
                                  <td className="px-2 py-1">
                                    {data.embarquesContingencia > 0 ? (
                                      <Badge variant="destructive">
                                        {data.embarquesContingencia}
                                      </Badge>
                                    ) : (
                                      "0"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            {/* Buttons moved next to "Servicios" below */}
          </div>

          <Dialog
            open={showArchivadosModal}
            onOpenChange={setShowArchivadosModal}
          >
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Embarques Archivados</DialogTitle>
                <DialogDescription>
                  Consulta todos los embarques archivados para consulta
                  histórica y auditoría.
                </DialogDescription>
              </DialogHeader>
              {loadingArchivados ? (
                <div className="py-8 text-center text-gray-500">
                  Cargando embarques archivados...
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-col md:flex-row md:items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="archivados-search">Buscar</Label>
                      <Input
                        id="archivados-search"
                        placeholder="Buscar por folio, cliente o load..."
                        value={archivadosSearch}
                        onChange={(e) => {
                          setArchivadosSearch(e.target.value);
                          setArchivadosPage(1);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span>Tamaño página</span>
                        <Select
                          value={String(archivadosPageSize)}
                          onValueChange={(v) => {
                            setArchivadosPageSize(Number(v));
                            setArchivadosPage(1);
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
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
                        onClick={() => {
                          // Exportar a CSV (etiquetado como Excel) con columnas solicitadas
                          // Columnas: Folio, Cliente, Load, Carta Porte, Fecha Pago, Monto Flete, Divisa, Contingencia, Operador, Tractocamión, Remolque, Fecha Creación (última)
                          let csv = "Folio,Cliente,Load,Carta Porte,Fecha Pago,Monto Flete,Divisa,Contingencia,Operador,Tractocamión,Remolque,Fecha Creación\n";
                          archivadosFilteredSorted.forEach((e) => {
                            const ea: any = e as any;
                            const currency = ea.moneda_flete || ea.currency || "MXN";
                            const rawVal =
                              typeof ea.precioFlete === "number"
                                ? ea.precioFlete
                                : typeof ea.precio_flete === "string"
                                ? Number(ea.precio_flete)
                                : typeof ea.precio_flete === "number"
                                ? ea.precio_flete
                                : 0;
                            const monto = Number.isFinite(rawVal) ? rawVal : 0;
                            const cartaPorte = ea.carta_porte || ea.cartaPorte || "";
                            const load = ea.load_number || ea.numeroLoad || "";
                            const fechaCreacion = ea.fecha_creacion
                              ? new Date(ea.fecha_creacion).toLocaleDateString()
                              : "";
                            const fechaPago = ea.fecha_pago
                              ? new Date(ea.fecha_pago).toLocaleDateString()
                              : "";
                            const contingencia = (ea.modificadoPorEmergencia || (embarquesModificadosIds || []).includes(e.id)) ? "Sí" : "No";
                            const operadorNombre = ea.operador
                              ? `${ea.operador?.nombre || ""} ${ea.operador?.apellidos || ""}`.trim()
                              : ea.operadorNombre || "";
                            const tracto = ea.camion?.numero_economico || ea.camionAsignado?.numeroEconomico || "";
                            const remolque = ea.remolque?.numero_economico || ea.remolque_numero_economico || "";
                            const row = [
                              e.folio,
                              e.clienteNombre,
                              load,
                              cartaPorte,
                              fechaPago,
                              monto.toFixed(2),
                              currency,
                              contingencia,
                              operadorNombre,
                              tracto,
                              remolque,
                              fechaCreacion,
                            ]
                              .map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`)
                              .join(",");
                            csv += row + "\n";
                          });
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          const now = new Date();
                          const pad = (n: number) => String(n).padStart(2, "0");
                          const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
                          a.download = `embarques_archivados_facturacion_${stamp}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Descargar Excel
                      </Button>
                    </div>
                  </div>

                  {/* Periodos rápidos */}
                  <div className="mt-2 mb-3 flex flex-wrap gap-2">
                    <Button
                      variant={archivadosPeriodo === "todo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("todo")}
                    >
                      Todo
                    </Button>
                    <Button
                      variant={archivadosPeriodo === "mes_actual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("mes_actual")}
                    >
                      Mes actual
                    </Button>
                    <Button
                      variant={archivadosPeriodo === "mes_anterior" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("mes_anterior")}
                    >
                      Mes anterior
                    </Button>
                    <Button
                      variant={archivadosPeriodo === "ultimos_3" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("ultimos_3")}
                    >
                      Últ. 3 meses
                    </Button>
                    <Button
                      variant={archivadosPeriodo === "ultimos_6" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("ultimos_6")}
                    >
                      Últ. 6 meses
                    </Button>
                    <Button
                      variant={archivadosPeriodo === "este_anio" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setArchivadosPeriodo("este_anio")}
                    >
                      Este año
                    </Button>
                  </div>

                  <div className="mb-3 text-sm text-gray-600 flex items-center gap-2">
                    <span>
                      Mostrando {totalArchivados === 0 ? 0 : startIdx + 1}–{endIdx} 
                      {totalArchivadosReal !== null 
                        ? ` de ${totalArchivadosReal.toLocaleString('es-MX')}` 
                        : ` (página ${archivadosPage})`
                      }
                    </span>
                    {loadingArchivados && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm table-fixed">
                      <thead>
                        <tr className="bg-purple-50">
                          <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-32 md:w-40 cursor-pointer select-none" onClick={() => toggleSortArchivados("folio")}>
                            Folio{sortIndicatorArchivados("folio")}
                          </th>
                          <th className="px-0 py-1 text-left font-semibold w-40 md:w-48 truncate cursor-pointer select-none" onClick={() => toggleSortArchivados("cliente")}>
                            Cliente{sortIndicatorArchivados("cliente")}
                          </th>
                          <th className="px-2 py-1 text-left font-semibold w-14 md:w-16 cursor-pointer select-none" onClick={() => toggleSortArchivados("load")}>
                            Load{sortIndicatorArchivados("load")}
                          </th>
                          <th className="px-2 py-1 text-left font-semibold w-36 truncate cursor-pointer select-none" onClick={() => toggleSortArchivados("valor")}>
                            Valor Facturado{sortIndicatorArchivados("valor")}
                          </th>
                          <th className="px-0 py-1 text-left font-semibold w-24 cursor-pointer select-none" onClick={() => toggleSortArchivados("fechaPago")}>
                            Fecha Pago Factura{sortIndicatorArchivados("fechaPago")}
                          </th>
                          <th className="px-2 py-1 text-left font-semibold w-24">Acciones</th>
                          <th className="px-2 py-1 text-left font-semibold w-28">Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingArchivados ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12">
                              <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3"></div>
                                <span className="text-sm text-gray-600">⚡ Cargando archivados optimizado...</span>
                                <span className="text-xs text-gray-500 mt-1">Paginación en servidor activa</span>
                              </div>
                            </td>
                          </tr>
                        ) : paginatedArchivados.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">
                              No hay embarques archivados.
                            </td>
                          </tr>
                        ) : (
                          paginatedArchivados.map((embarque) => (
                            <tr
                              key={embarque.id}
                              className={`border-b hover:bg-purple-50 ${esCancelado(embarque) ? 'bg-red-50 border-l-4 border-red-200' : ''}`}
                            >
                              <td className="px-1 py-1 whitespace-nowrap w-32 md:w-40">
                                <div className="flex items-center flex-wrap">
                                  <span className="font-mono">{embarque.folio}</span>
                                  {esCancelado(embarque) && (
                                    <Badge className="ml-2 bg-purple-600 text-white">Cancelado</Badge>
                                  )}
                                  {(() => {
                                    // Badge de Direcciones Múltiples
                                    if (embarqueTieneMultiplesDirecciones(embarque)) {
                                      return (
                                        <span 
                                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help"
                                          title="Este embarque tiene múltiples direcciones de recolección o entrega"
                                        >
                                          D. Múltiples
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(() => {
                                    // Badge de Flete Falso
                                    if (esFleteFalso(embarque)) {
                                      return (
                                        <span 
                                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help"
                                          title="Este embarque está marcado como flete en falso (contingencia)"
                                        >
                                          Flete F.
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </td>
                              <td className="px-0 py-1 w-40 md:w-48 truncate">{embarque.clienteNombre}</td>
                              <td className="px-2 py-1 w-14 md:w-16 truncate text-left font-mono">{(embarque as any).load_number || embarque.numeroLoad || ""}</td>
                              <td className="px-2 py-1 w-36 truncate">
                                {(() => {
                                  const currency = (embarque as any).moneda_flete || "MXN";
                                  const raw =
                                    typeof (embarque as any).precioFlete === "number"
                                      ? (embarque as any).precioFlete
                                      : typeof (embarque as any).precio_flete === "string"
                                      ? Number((embarque as any).precio_flete)
                                      : typeof (embarque as any).precio_flete === "number"
                                      ? (embarque as any).precio_flete
                                      : 0;
                                  const amount = Number.isFinite(raw) ? raw : 0;
                                  return (
                                    <>
                                      ${amount.toLocaleString('es-MX', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })} {currency}
                                    </>
                                  );
                                })()}
                              </td>
                              <td className="px-0 py-1 w-24 whitespace-nowrap text-left">
                                {embarque.fecha_pago
                                  ? new Date(embarque.fecha_pago).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td className="px-2 py-1 text-left">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEmbarqueDetalle(embarque);
                                    setShowDetailModal(true);
                                  }}
                                  title="Ver detalles"
                                  aria-label="Ver detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="px-2 py-1 text-left">
                                    {(() => {
                                      const disponibleAhora = puedeEliminarArchivadoFC(embarque);
                                      const fechaStr = (embarque as any).fecha_archivado || embarque.fechaArchivado || embarque.fecha_creacion || embarque.updated_at;
                                      let title = '';
                                      if (embarque.id === globalMasViejoArchivadoId) {
                                        title = 'Registro más antiguo: eliminación disponible';
                                      } else {
                                        title = 'Solo el registro más antiguo puede eliminarse';
                                      }
                                      return (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => { setEmbarqueAEliminar(embarque); setShowConfirmDeleteDialog(true); }}
                                          disabled={!disponibleAhora}
                                          title={title}
                                          aria-label="Eliminar embarque"
                                          className={`border-gray-400 text-black bg-white hover:bg-gray-100 hover:text-black${
                                            !disponibleAhora ? " opacity-50 cursor-not-allowed" : ""
                                          }`}
                                        >
                                          <Trash className="h-4 w-4 text-red-600" />
                                        </Button>
                                      );
                                    })()}
                                  </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {totalArchivadosPaginas > 1 && (
                      <div className="flex items-center justify-between p-3 text-sm">
                        <div>
                          Página {clampedPage} de {totalArchivadosPaginas}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setArchivadosPage((p) => Math.max(1, p - 1))}
                            disabled={clampedPage <= 1}
                          >
                            ◀ Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setArchivadosPage((p) =>
                                Math.min(totalArchivadosPaginas, p + 1)
                              )
                            }
                            disabled={clampedPage >= totalArchivadosPaginas}
                          >
                            Siguiente ▶
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Confirmar eliminación permanente de archivado (reemplaza window.confirm) */}
          <Dialog open={showConfirmDeleteDialog} onOpenChange={(v) => { if(!v) { setShowConfirmDeleteDialog(false); setEmbarqueAEliminar(null); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Eliminar registro definitivamente</DialogTitle>
                <DialogDescription>
                  Esta acción eliminará el embarque seleccionado de la base de datos de forma permanente. No se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <p className="font-medium">Folio: {embarqueAEliminar?.folio || "-"}</p>
                <p className="text-sm text-gray-600">Cliente: {embarqueAEliminar?.clienteNombre || embarqueAEliminar?.cliente_id || '-'}</p>
                <p className="text-sm text-gray-600">Operador: {embarqueAEliminar?.operadorAsignado?.nombre || '-'}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowConfirmDeleteDialog(false); setEmbarqueAEliminar(null); }}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
                  const emb = embarqueAEliminar;
                  if (!emb) return;
                  setShowConfirmDeleteDialog(false);
                  try {
                    await eliminarArchivadoDefinitivoFC(emb);
                    // Eliminación: notificar en rojo
                    toast({ title: 'Embarque eliminado', description: `Folio: ${emb.folio}`, variant: 'destructive' });
                  } catch (err: any) {
                    console.error('Error eliminando embarque:', err);
                    toast({ title: 'Error al eliminar', description: err?.message || String(err), variant: 'destructive' });
                  } finally {
                    setEmbarqueAEliminar(null);
                  }
                }}>Eliminar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Botón Clientes: abre gestión de crédito de clientes */}
          <Dialog open={showClientesModal} onOpenChange={setShowClientesModal}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestión de Crédito de Clientes</DialogTitle>
                <DialogDescription>
                  Configurar límites de crédito y monitorear el estado de pagos
                  por cliente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="search-credit-client"
                      placeholder="Buscar empresa..."
                      value={creditClientSearchTerm}
                      onChange={(e) => setCreditClientSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="items-per-page-credit" className="text-sm">Registros por página:</Label>
                    <Select
                      value={String(itemsPerPageCredit)}
                      onValueChange={(value) => setItemsPerPageCredit(Number(value))}
                    >
                      <SelectTrigger id="items-per-page-credit" className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button onClick={exportCreditDataToExcel} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Crédito Excel
                    </Button>
                  </div>
                </div>

                {loadingEmbarques ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                    <span className="ml-2 text-sm text-gray-600">
                      Cargando clientes...
                    </span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No se encontraron clientes</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Asegúrate de que los clientes estén registrados y activos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="mb-4 text-sm text-gray-600">
                      Mostrando {paginatedClientsCredit.length} de {filteredClients.length} registros.
                    </div>
                    <table className="min-w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Cliente
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Límite USD
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Adeudado USD
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Límite MXN
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Adeudado MXN
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Acciones
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">
                            Estado Crédito
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClientsCredit.map((cliente) => {
                          if (!cliente) return null;
                          const rowState = creditRowState[cliente.id] || { locked: true, usd: String(creditLimits[cliente.id]?.usd || 0), mxn: String(creditLimits[cliente.id]?.mxn || 0) };

                          const clienteEmbarquesUSD = embarquesFiltrados.filter(
                            (e) =>
                              e.cliente_id === cliente.id &&
                              !e.pagado &&
                              e.moneda_flete === "USD"
                          );
                          const clienteEmbarquesMXN = embarquesFiltrados.filter(
                            (e) =>
                              e.cliente_id === cliente.id &&
                              !e.pagado &&
                              (e.moneda_flete === "MXN" || !e.moneda_flete)
                          );

                          const totalPendienteUSD = clienteEmbarquesUSD.reduce((sum, e) => sum + getMontoContable(e), 0);
                          const totalPendienteMXN = clienteEmbarquesMXN.reduce((sum, e) => sum + getMontoContable(e), 0);

                          const limiteUSD = creditLimits[cliente.id]?.usd || 0;
                          const limiteMXN = creditLimits[cliente.id]?.mxn || 0;

                          const excedeUSD =
                            totalPendienteUSD > limiteUSD && limiteUSD > 0;
                          const excedeMXN =
                            totalPendienteMXN > limiteMXN && limiteMXN > 0;

                          return (
                            <tr
                              key={cliente.id}
                              className={`border-b border-gray-100 ${
                                excedeUSD || excedeMXN ? "bg-red-50" : ""
                              }`}
                            >
                              <td className="px-4 py-1 font-medium text-gray-800">
                                <span>{cliente.nombre}</span>
                              </td>
                              {/* Corrected field name */}
                              <td className="px-4 py-1">
                                {/* USD limit input always present to avoid column shift; simple text input (no spinners) */}
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={rowState.usd ?? String(limiteUSD)}
                                  onChange={(e) => setCreditRowState(prev => ({ ...prev, [cliente.id]: { ...(prev[cliente.id] || {}), usd: e.target.value } }))}
                                  readOnly={rowState.locked}
                                  className={rowState.locked ? "w-28 text-right text-sm px-2 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded" : "w-28 text-right text-sm border rounded px-2 py-1.5 bg-white"}
                                />
                              </td>
                              <td className="px-4 py-1">
                                <span
                                  className={`font-bold ${
                                    excedeUSD ? "text-red-600" : "text-gray-600"
                                  }`}
                                >
                                  ${totalPendienteUSD.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-4 py-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rowState.mxn ?? String(limiteMXN)}
                                    onChange={(e) => setCreditRowState(prev => ({ ...prev, [cliente.id]: { ...(prev[cliente.id] || {}), mxn: e.target.value } }))}
                                    readOnly={rowState.locked}
                                    className={rowState.locked ? "w-28 text-right text-sm px-2 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded" : "w-28 text-right text-sm border rounded px-2 py-1.5 bg-white"}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-1">
                                <span
                                  className={`font-bold ${
                                    excedeMXN ? "text-red-600" : "text-gray-600"
                                  }`}
                                >
                                  ${totalPendienteMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              {/* Actions column: lock + guardar placed between Adeudado MXN and Estado Crédito */}
                              <td className="px-4 py-1">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setCreditRowState(prev => {
                                      const existing = prev[cliente.id];
                                      const usdDefault = String(limiteUSD);
                                      const mxnDefault = String(limiteMXN);
                                      return {
                                        ...prev,
                                        [cliente.id]: {
                                          ...(existing || { usd: usdDefault, mxn: mxnDefault }),
                                          locked: !((existing || { locked: true }).locked),
                                        },
                                      };
                                    })}
                                    title={rowState.locked ? "Desbloquear fila" : "Bloquear fila"}
                                  >
                                    {rowState.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={async () => {
                                      const vUSD = Number((creditRowState[cliente.id]?.usd) || limiteUSD) || 0;
                                      const vMXN = Number((creditRowState[cliente.id]?.mxn) || limiteMXN) || 0;
                                      try {
                                        await saveCreditLimits(cliente.id, vUSD, vMXN);
                                        setCreditRowState(prev => ({ ...prev, [cliente.id]: { ...(prev[cliente.id] || {}), usd: String(vUSD), mxn: String(vMXN), locked: true } }));
                                        toast({ title: 'Límite de Crédito Capturado Correctamente', variant: 'success' });
                                      } catch (e) {
                                        console.error('Error guardando créditos fila', e);
                                        toast({ title: 'Error al guardar crédito', variant: 'destructive' });
                                      }
                                    }}
                                  >Guardar</Button>
                                </div>
                              </td>
                              <td className="px-4 py-1">
                                {excedeUSD || excedeMXN ? (
                                  <Badge
                                    variant="outline"
                                    className="flex items-center justify-center bg-orange-100 text-orange-800 border-orange-300"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1 text-orange-600" /> Excedido
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="flex items-center justify-center"
                                  >
                                    Ok
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex justify-center items-center space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChangeCredit(currentPageCredit - 1)
                        }
                        disabled={currentPageCredit === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-700">
                        Página {currentPageCredit} de {totalPagesCredit}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChangeCredit(currentPageCredit + 1)
                        }
                        disabled={currentPageCredit === totalPagesCredit}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Nota anual para KPIs */}
          <div className="md:col-span-6 -mb-2">
            <p className="text-xs text-gray-500">
              Indicadores del año {currentYear}. El Flete Año es acumulado anual e incluye archivados. Al cambiar el año, el contador se reinicia.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Embarques
                  </p>
                  <p className="text-2xl font-bold">
                    {embarquesFiltrados.length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Flete Año MXN
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${yearlyFleteMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Flete Año USD
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${yearlyFleteUSD.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      embarquesFiltrados.filter(
                        (e) => e.estado_facturacion === "pendiente_facturacion"
                      ).length
                    }
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-8">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Facturados</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {
                        embarquesFiltrados.filter(
                          (e) => e.estado_facturacion === "facturado"
                        ).length
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagados</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {
                        embarquesFiltrados.filter(
                          (e) => e.estado_facturacion === "pagado"
                        ).length
                      }
                    </p>
                  </div>
                </div>
                {/* Icon removed as requested */}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Archivados</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {archivadosIds.length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 max-w-xl md:max-w-2xl">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por folio, cliente, load, operador..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setListaPage(1); }}
                className="pl-8"
              />
            </div>
          </div>
          {/* Pagination moved up to sit beside search */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-700">Página {listaPage} de {totalListaPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setListaPage(p => Math.max(1, p - 1))} disabled={listaPage <= 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setListaPage(p => Math.min(totalListaPages, p + 1))} disabled={listaPage >= totalListaPages}>Siguiente</Button>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Por página:</span>
              <Select value={String(listaPageSize)} onValueChange={(v) => { const n = Number.parseInt(v, 10); setListaPageSize(n); setListaPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Por página" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 por página</SelectItem>
                  <SelectItem value="12">12 por página</SelectItem>
                  <SelectItem value="18">18 por página</SelectItem>
                  <SelectItem value="24">24 por página</SelectItem>
                  <SelectItem value="48">48 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Estado:</span>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Modal para actualizar precio (instanciado una vez en la página) */}
        <UpdatePriceModal
          open={showUpdatePriceModal}
          onOpenChange={(v: boolean) => {
            setShowUpdatePriceModal(v);
            if (!v) setInitialRazonForModal(null);
          }}
          embarque={selectedEmbarqueForUpdate}
          initialRazon={initialRazonForModal ?? undefined}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Embarques Asignados</CardTitle>
                <CardDescription>
                  Lista detallada de todos los embarques con asignación
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={generarReporteExcel} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reportes
                </Button>
                <Button
                  onClick={() => setShowAnalisisOperadoresModal(true)}
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2 text-green-700" />
                  Operadores
                </Button>
                <Button
                  onClick={() => setShowClientesModal(true)}
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Crédito Clientes
                </Button>
                <Button
                  onClick={() => setShowControlClientesModal(true)}
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Control Clientes
                </Button>
                {/* <Button
                  onClick={() => setShowPagosOperadoresModal(true)}
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4 mr-2 text-blue-700" />
                  Pagos Operadores
                </Button> */}
                <Button
                  onClick={() => setShowTiposServicioModal(true)}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Servicios
                </Button>
                {/* Precio Flete en Falso button moved into Tipos de Servicio modal */}
                <Button
                  onClick={() => setShowArchivadosModal(true)}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2 text-purple-600" />
                  Archivados
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEmbarques ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Cargando embarques...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {embarquesPaginados.map((embarque) => (
                    <div
                      key={embarque.id}
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        embarquesModificadosIds.includes(embarque.id)
                          ? "border-red-500"
                          : ""
                      } ${
                        embarque.estado_facturacion === "facturado"
                          ? "bg-blue-50 border-blue-200"
                          : embarque.estado_facturacion === "pagado"
                          ? "bg-green-50 border-green-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Package className="h-8 w-8 text-blue-600" />
                          <div>
                            <div className="flex items-center">
                              <div className="flex items-center">
                                <p className="font-bold text-lg text-blue-600">
                                  {embarque.folio}
                                </p>
                                {esCancelado(embarque) && (
                                  <Badge className="ml-2 bg-purple-600 text-white">Cancelado</Badge>
                                )}
                              </div>
                              {embarquesModificadosIds.includes(
                                embarque.id
                              ) && (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 bg-red-600 text-white"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Contingencia
                                </Badge>
                              )}
                              {(() => {
                                const creditCheck = checkCreditExceeded(
                                  embarque.clienteNombre,
                                  embarque.montoFacturado ?? (embarque as any)?.precioFlete ?? 0,
                                  embarque.moneda_flete
                                );
                                return (
                                  creditCheck.exceeded && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-white text-xs">
                                      {creditCheck.message}
                                    </span>
                                  )
                                );
                              })()}

                            </div>
                            <p className="text-sm text-gray-500">
                              Load: {embarque.load_number || "-"}
                            </p>
                          </div>
                          {embarque.modificadoPorEmergencia && (
                            <Badge
                              variant="destructive"
                              className="ml-2 bg-red-600 text-white"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              MODIFICADO POR EMERGENCIA
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {embarque.quickpaid_enabled && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center px-2 py-1 mr-2">
                              <span className="mr-1">QuickPaid</span>
                              <Coins className="h-4 w-4 text-yellow-500" />
                            </Badge>
                          )}
                          {(() => {
                            // Badge de Direcciones Múltiples
                            if (embarqueTieneMultiplesDirecciones(embarque)) {
                              return (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold cursor-help mr-2"
                                  title="Este embarque tiene múltiples direcciones de recolección o entrega"
                                >
                                  D. Múltiples
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            // Badge de Flete Falso
                            if (esFleteFalso(embarque)) {
                              return (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold cursor-help mr-2"
                                  title="Este embarque está marcado como flete en falso (contingencia)"
                                >
                                  Flete F.
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <Select
                            value={
                              embarque.estado_facturacion ||
                              "pendiente_facturacion"
                            }
                            onValueChange={async (value) => {
                              try {
                                const v = (
                                  [
                                    "pendiente_facturacion",
                                    "facturado",
                                    "pagado",
                                  ] as const
                                ).includes(value as any)
                                  ? (value as
                                      | "pendiente_facturacion"
                                      | "facturado"
                                      | "pagado")
                                  : "pendiente_facturacion";
                                const embarquesActualizados =
                                  embarquesAsignados.map((e) =>
                                    e.id === embarque.id
                                      ? { ...e, estado_facturacion: v }
                                      : e
                                  );
                                if (mounted.current) {
                                  setEmbarquesAsignados(embarquesActualizados);
                                  localStorage.setItem(
                                    "embarquesAsignados",
                                    JSON.stringify(embarquesActualizados)
                                  );
                                }
                                await supabase
                                  .from("embarques")
                                  .update({
                                    estado_facturacion: v,
                                    updated_at: new Date().toISOString(),
                                  })
                                  .eq("id", embarque.id);
                              } catch (error) {
                                console.error(
                                  "Error actualizando estado de facturación:",
                                  error
                                );
                                toast({ title: 'Error al actualizar el estado de facturación', description: String((error as any)?.message || ''), variant: 'default' });
                              }
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente_facturacion">
                                Pendiente Facturación
                              </SelectItem>
                              <SelectItem value="facturado">
                                Facturado
                              </SelectItem>
                              <SelectItem value="pagado">Pagado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalFacturacion(embarque)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Facturación
                          </Button>
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Abrir prompt de justificación primero
                                setSelectedEmbarqueForUpdate(embarque);
                                setJustificacionDraft('');
                                setShowJustificacionPrompt(true);
                              }}
                              title="Actualizar precio"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Precio
                            </Button>
                            {/* Prompt pequeño que solicita justificación antes de abrir el modal principal */}
                                            <Dialog open={showJustificacionPrompt && selectedEmbarqueForUpdate?.id === embarque.id} onOpenChange={(v) => { if(!v) { setShowJustificacionPrompt(false); setSelectedEmbarqueForUpdate(null); } }}>
                              <DialogContent className="max-w-lg bg-red-50 border border-red-300">
                                <DialogHeader>
                                  <DialogTitle className="text-red-800">Confirmar actualización de precio</DialogTitle>
                                  <DialogDescription className="text-red-700">
                                    Estás a punto de cambiar el precio del embarque {embarque.folio || embarque.id}. Por favor ingresa una justificación breve antes de continuar.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Justificación</Label>
                                    <Textarea value={justificacionDraft} onChange={(ev) => setJustificacionDraft(ev.target.value)} placeholder="Explica brevemente por qué se actualizará el precio" />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => { setShowJustificacionPrompt(false); setSelectedEmbarqueForUpdate(null); }}>Cancelar</Button>
                                  <Button variant="destructive" onClick={() => {
                                    if (!justificacionDraft || justificacionDraft.trim().length < 3) {
                                      toast({ title: 'Ingresa una justificación (mínimo 3 caracteres)', variant: 'destructive' });
                                      return;
                                    }
                                    // Abrir modal principal para editar precio, pasando la justificación inicial
                                    setInitialRazonForModal(justificacionDraft.trim());
                                    setShowJustificacionPrompt(false);
                                    setShowUpdatePriceModal(true);
                                  }}>
                                    Aceptar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verDetallesEmbarque(embarque)}
                            aria-label="Ver detalles"
                          >
                            <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                            Detalles
                          </Button>
                          {/* Botón Modificar oculto según requerimiento */}
                          {(embarque.estado_facturacion === "pagado" ||
                            (embarque.pagado &&
                              (embarque as any).estado_facturacion == null) ||
                            esCancelado(embarque)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Open confirm dialog instead of blocking window.confirm
                                setEmbarqueAArchivar(embarque);
                                setShowConfirmArchivarDialog(true);
                              }}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Archivar
                            </Button>
                          )}
                          {/* Botón Cancelar - disponible para embarques finalizados que no estén ya cancelados */}
                          {(embarque.estado?.startsWith("finalizado") || 
                            embarque.estado === "asignado" || 
                            embarque.estado === "en-transito") && 
                            !esCancelado(embarque) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEmbarqueACancelar(embarque);
                                setCancelReason(""); // Limpiar el campo de justificación
                                setShowConfirmCancelarDialog(true);
                              }}
                              disabled={cancelingEmbarque}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Cliente:</p>
                          <p className="text-gray-600">
                            {clientes.find((c) => c.id === embarque.cliente_id)
                              ?.nombre ||
                              embarque.clienteNombre ||
                              embarque.cliente_id}
                            {(embarque?.info_representante?.nombre ||
                              embarque?.representante_cliente) && (
                              <span className="text-gray-500">
                                {" "}
                                — Rep.:{" "}
                                {embarque.info_representante?.nombre ||
                                  embarque.representante_cliente}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Operador:</p>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-600">
                              {embarque.operadorAsignado?.nombre ||
                                "Sin asignar"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">
                            Tipo de Servicio:
                          </p>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-purple-600" />
                            <span className="text-gray-600 text-sm">
                              {(() => {
                                if (embarque.tipo_servicio_id) {
                                  const tipoServicio = tiposServicio.find(
                                    (t) => t.id === embarque.tipo_servicio_id
                                  );
                                  return tipoServicio
                                    ? tipoServicio.nombre
                                    : `ID: ${embarque.tipo_servicio_id}`;
                                }
                                return "No asignado";
                              })()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Camión:</p>
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span className="text-gray-600">
                              <strong>Camión:</strong>{" "}
                              {embarque.camionAsignado?.marca || "Sin asignar"}{" "}
                              {embarque.camionAsignado?.modelo || ""} (
                              {embarque.camionAsignado?.numeroEconomico || ""}){" "}
                              • <strong>Remolque:</strong>{" "}
                              {embarque.remolque?.numero_economico ||
                                embarque.remolque_numero_economico ||
                                "-"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">
                            Carta Porte:
                          </p>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {embarque.carta_porte || "-"}
                            </span>
                          </div>
                        </div>
                        {embarque.quickpaid_enabled ? (
                          <div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-gray-700">Monto Flete:</p>
                                <p className="text-gray-600 font-bold">
                                  {(() => {
                                    const currency = embarque.moneda_flete || "MXN";
                                    // Mostrar el precio flete original (no el monto contable QuickPaid)
                                    const candidates: Array<number | undefined> = [
                                      typeof embarque.cantidad_final_facturada === 'number'
                                        ? embarque.cantidad_final_facturada
                                        : typeof (embarque as any).cantidad_final_facturada === 'string'
                                        ? Number((embarque as any).cantidad_final_facturada)
                                        : undefined,
                                      typeof (embarque as any).precio_flete === 'string'
                                        ? Number((embarque as any).precio_flete)
                                        : typeof (embarque as any).precio_flete === 'number'
                                        ? (embarque as any).precio_flete
                                        : undefined,
                                      typeof (embarque as any).montoFacturado === 'string'
                                        ? Number((embarque as any).montoFacturado)
                                        : typeof (embarque as any).montoFacturado === 'number'
                                        ? (embarque as any).montoFacturado
                                        : undefined,
                                      typeof (embarque as any).precioFlete === 'string'
                                        ? Number((embarque as any).precioFlete)
                                        : typeof (embarque as any).precioFlete === 'number'
                                        ? (embarque as any).precioFlete
                                        : undefined,
                                    ];
                                    const amountCandidate = candidates.find(
                                      (v) => typeof v === 'number' && !isNaN(v)
                                    );
                                    const amount = typeof amountCandidate === 'number' ? amountCandidate : 0;
                                    return (
                                      <>
                                        ${amount.toLocaleString('es-MX', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} {currency}
                                      </>
                                    );
                                  })()}
                                </p>
                              </div>

                              <div className="flex-1 text-center">
                                <p className="font-medium text-gray-700">Descuento</p>
                                {typeof embarque.quickpaid_descuento === "number" && embarque.quickpaid_descuento > 0 ? (
                                  <div>
                                    <p className="text-yellow-700 font-semibold">
                                      -${embarque.quickpaid_descuento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{(embarque.moneda_flete || 'MXN')}</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-500">-</p>
                                )}
                              </div>

                              <div className="flex-1 text-right">
                                <p className="font-medium text-gray-700">Precio QuickPaid</p>
                                {typeof embarque.precio_quickpaid === "number" && embarque.precio_quickpaid > 0 ? (
                                  <div>
                                    <p className="text-yellow-900 font-semibold">
                                      ${embarque.precio_quickpaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{(embarque.moneda_flete || 'MXN')}</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-500">-</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-4">
                              <div className="w-full">
                                <p className="font-medium text-gray-700">Monto Flete:</p>
                                <p className="text-gray-600 font-bold">
                                  {(() => {
                                    const currency = embarque.moneda_flete || "MXN";
                                    const candidates: Array<number | undefined> = [
                                      typeof embarque.cantidad_final_facturada ===
                                      "number"
                                        ? embarque.cantidad_final_facturada
                                        : typeof (embarque as any)
                                            .cantidad_final_facturada === "string"
                                        ? Number(
                                            (embarque as any)
                                              .cantidad_final_facturada
                                          )
                                        : undefined,
                                      typeof (embarque as any).precio_flete ===
                                      "string"
                                        ? Number((embarque as any).precio_flete)
                                        : typeof (embarque as any).precio_flete ===
                                          "number"
                                        ? (embarque as any).precio_flete
                                        : undefined,
                                      typeof (embarque as any).montoFacturado ===
                                      "string"
                                        ? Number((embarque as any).montoFacturado)
                                        : typeof (embarque as any).montoFacturado ===
                                          "number"
                                        ? (embarque as any).montoFacturado
                                        : undefined,
                                      typeof (embarque as any).precioFlete ===
                                      "string"
                                        ? Number((embarque as any).precioFlete)
                                        : typeof (embarque as any).precioFlete ===
                                          "number"
                                        ? (embarque as any).precioFlete
                                        : undefined,
                                    ];
                                    const amountCandidate = candidates.find(
                                      (v) => typeof v === "number" && !isNaN(v)
                                    );
                                    const amount =
                                      typeof amountCandidate === "number"
                                        ? amountCandidate
                                        : 0;
                                    return (
                                      <>
                                        ${amount.toLocaleString('es-MX', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} {currency}
                                      </>
                                    );
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {embarque.fechaEntrega && (
                          <div>
                            <p className="font-medium text-gray-700">
                              Fecha Entrega:
                            </p>
                            <p className="text-gray-600">
                              {new Date(
                                embarque.fechaEntrega
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="font-medium text-gray-700 text-sm">
                            Dirección de Recolecta:
                          </p>
                          <div className="flex items-start space-x-2 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="text-gray-600 text-sm">
                              {embarque.direccionRecolecta}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">
                            Dirección de Enganche:
                          </p>
                          <div className="flex items-start space-x-2 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <p className="text-gray-600 text-sm">
                              {embarque.direccion_entrega}
                            </p>
                          </div>
                        </div>
                      </div>
                      {embarque.observacionesFacturacion && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium text-gray-700 text-sm mb-1">
                            Observaciones de Facturación:
                          </p>
                          <p className="text-gray-600 text-sm">
                            {embarque.observacionesFacturacion}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                {embarquesFiltrados.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                      No se encontraron embarques asignados
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Los embarques asignados desde "Asignación de Embarques"
                      aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

  {/* Modal eliminado: precio flete en falso ahora se edita desde "Gestión de Tipos de Servicio" */}

        {/* Control Clientes */}
        <Dialog open={showControlClientesModal} onOpenChange={setShowControlClientesModal}>
  <DialogContent className="max-w-[1400px] w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Control de Clientes</DialogTitle>
              <DialogDescription>
                Consulta los embarques no archivados por cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col gap-3 w-full">
                  {/* Primera fila: Cliente + Periodo + Estado + Acciones */}
                  <div className="flex flex-wrap items-end gap-3 w-full">
                    <div className="flex flex-col">
                      <Label htmlFor="control-cliente" className="text-xs text-gray-600 mb-1">Cliente</Label>
                      <Select
                        value={controlClienteSeleccionado ?? "todos"}
                        onValueChange={(value) => setControlClienteSeleccionado(value === "todos" ? null : value)}
                      >
                        <SelectTrigger id="control-cliente" className="w-[320px]">
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los clientes</SelectItem>
                          {clientesOrdenadosPorNombre.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Rango rápido */}
                    <div className="flex flex-col">
                      <Label className="text-xs text-gray-600 mb-1">Periodo</Label>
                      <Select value={controlClientesRango} onValueChange={(v) => setRangoControlClientes(v)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecciona un periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mes_actual">Mes actual</SelectItem>
                          <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                          <SelectItem value="dos_meses_atras">Dos meses atrás</SelectItem>
                          <SelectItem value="seis_meses_atras">Seis meses atrás</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="control-estado" className="text-xs text-gray-600 mb-1">Estado</Label>
                      <Select value={controlClientesEstadoFiltro} onValueChange={setControlClientesEstadoFiltro}>
                        <SelectTrigger id="control-estado" className="w-[240px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {/* Orden lógico: Todos, Pendiente, Facturados, Pagados, En tránsito, Archivados */}
                          <SelectItem value="pendiente_facturacion">Pendiente de facturar</SelectItem>
                          <SelectItem value="facturado">Facturados</SelectItem>
                          <SelectItem value="pagado">Pagados</SelectItem>
                          <SelectItem value="transito">En tránsito</SelectItem>
                          <SelectItem value="archivado">Archivados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Acciones en la misma fila, alineadas con Periodo */}
                    <div className="ml-auto flex items-end gap-3">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          const desde = controlClientesPeriodo.desde;
                          const hasta = controlClientesPeriodo.hasta;
                            try {
                              setLoadingClienteEmbarques(true);
                              console.log("control clientes - fetching raw dataset desde:", desde, "hasta:", hasta, "cliente:", controlClienteSeleccionado, "incluirArchivados:", controlIncluirArchivados);
                              // Fetch a broader dataset server-side and apply the inclusion rules client-side
                              let query = supabase
                                .from("embarques")
                                .select(`
                                *,
                                cliente:clientes(id, nombre),
                                operador:operadores(id, nombre, apellidos)
                              `)
                                .order("fecha_creacion", { ascending: false });

                            if (controlClienteSeleccionado) query = query.eq("cliente_id", controlClienteSeleccionado);
                            if (controlClientesEstadoFiltro && controlClientesEstadoFiltro !== "todos") {
                              query = query.eq("estado_facturacion", controlClientesEstadoFiltro);
                            }
                            if (desde) query = query.gte("fecha_creacion", desde);
                            if (hasta) query = query.lte("fecha_creacion", hasta);

                            const { data, error } = await query;
                            if (error) {
                              console.error("Error fetching control clientes:", error);
                              setControlClientesFetched([]);
                            } else {
                              console.log("control clientes - raw rows returned:", (data || []).length);
                              const formattedRaw = (data || []).map((embarque: any) => ({
                                ...embarque,
                                clienteNombre: embarque.cliente?.nombre || "Cliente no especificado",
                                operadorAsignado: embarque.operador
                                  ? { id: embarque.operador.id, nombre: `${embarque.operador.nombre} ${embarque.operador.apellidos || ""}`.trim() }
                                  : { id: "", nombre: "Sin asignar" },
                                precioFlete: getMontoContable(embarque),
                                fechaAsignacion: embarque.fecha_creacion,
                              }));

                              // Apply inclusion rules client-side: include 'asignado' OR 'finalizado',
                              // or any record that participates in facturación (estado_facturacion not null and not 'archivado')
                              // or records that have a precio_quickpaid (fallback). Archivados en facturación se incluyen sólo si checkbox está activo.
                              const filtered = (formattedRaw || []).filter((e: any) => {
                                if (!controlMostrarCancelados && esCancelado(e)) return false;
                                const estadoNorm = String(e?.estado || "").toLowerCase();
                                const isAssigned = /asignado/.test(estadoNorm);
                                const isFinalizado = /finalizado/.test(estadoNorm);
                                const estadoFact = String(e?.estado_facturacion || "").toLowerCase();
                                const inFacturacion = e?.estado_facturacion != null;
                                const isArchivedInFact = estadoFact === "archivado";
                                // Detectar precio_quickpaid robusto (number o string con valor)
                                const hasPrecioQuickpaid = (e?.precio_quickpaid !== null && e?.precio_quickpaid !== undefined && String(e.precio_quickpaid).trim() !== "") || false;

                                // Include if assigned or finalizado
                                if (isAssigned || isFinalizado) return true;

                                // Include if it's part of facturación flow (but exclude archived unless user requested it)
                                if (inFacturacion) {
                                  if (isArchivedInFact) {
                                    return controlIncluirArchivados === true;
                                  }
                                  return true;
                                }

                                // Include if quickpaid price exists (fallback for records that only have quickpaid)
                                if (hasPrecioQuickpaid) return true;

                                // Otherwise exclude
                                return false;
                              });

                              console.log('control clientes - filtered rows count:', filtered.length);
                              try {
                                console.log('control clientes - filtered folios:', (filtered || []).map((r: any) => r.folio).slice(0,50));
                              } catch (e) {}
                              setControlClientesFetched(filtered);
                            }
                          } catch (err) {
                            console.error(err);
                            setControlClientesFetched([]);
                          } finally {
                            setLoadingClienteEmbarques(false);
                            setControlClientesGenerado(true);
                            console.log('control clientes - generation completed, generated flag set = true');
                            setCurrentPageControlActivos(1);
                          }
                        }}
                      >
                        Generar
                      </Button>
                      <Button
                        variant="outline"
                          onClick={() => {
                          const inRange = (e: any) => {
                            const fechaStr = e.fechaAsignacion || e.fecha_creacion || e.updated_at;
                            if (!fechaStr) return true;
                            const d = new Date(fechaStr);
                            const desde = controlClientesPeriodo.desde
                              ? new Date(controlClientesPeriodo.desde)
                              : null;
                            const hasta = controlClientesPeriodo.hasta
                              ? new Date(controlClientesPeriodo.hasta + "T23:59:59")
                              : null;
                            if (desde && d < desde) return false;
                            if (hasta && d > hasta) return false;
                            return true;
                          };

                          // Use the filtered memo when available to respect all UI filters/sorts
                          const primarySource = controlClientesFetched ? controlClientesFetched : controlClientesFiltradosActivos;
                          const base = (primarySource || []).filter((e: any) => (controlClienteSeleccionado ? e.cliente_id === controlClienteSeleccionado : true)).filter(inRange).filter((e) => {
                            if (controlClientesEstadoFiltro === "todos") return true;
                            if (controlClientesEstadoFiltro === "archivado") return e.estado_facturacion === "archivado";
                            if (controlClientesEstadoFiltro === "pendiente_facturacion") return (e.estado_facturacion || "pendiente_facturacion") === "pendiente_facturacion";
                            if (controlClientesEstadoFiltro === "pagado") return (e.estado_facturacion || "").toLowerCase().includes("pagado");
                            if (controlClientesEstadoFiltro === "facturado") return (e.estado_facturacion || "").toLowerCase().includes("facturado");
                            if (controlClientesEstadoFiltro === "transito") return (String(e.estado || "").toLowerCase()).includes("transit");
                            return true;
                          }).sort(compareControlClientes);

                          // If user requested to include canceled, append canceled records from the broader source
                          let rowsSource = [...base];
                          if (controlMostrarCancelados) {
                            const broader = (controlClientesFetched || embarquesAsignados || controlClientesFiltradosActivos || []) as any[];
                            const canceledOnly = broader.filter((e) => esCancelado(e));
                            // append canceled rows not already present
                            const existingIds = new Set(rowsSource.map((r: any) => r.id));
                            for (const c of canceledOnly) {
                              if (!existingIds.has(c.id)) rowsSource.push(c);
                            }
                          }

                          // Map to a detailed row shape
                          const mapped = (rowsSource || []).map((e: any) => ({
                            folio: e.folio || "",
                            cliente: e.clienteNombre || (e.cliente && e.cliente.nombre) || "",
                            load: e.load_number || e.numeroLoad || "",
                            tipo: (tiposServicio.find((t) => t.id === (e as any).tipo_servicio_id)?.nombre) || e.tipoServicioNombre || e.tipoServicio || "",
                            fecha: new Date(e.fechaAsignacion || e.fecha_creacion || e.updated_at || Date.now()).toLocaleDateString(),
                            monto: getMontoContable(e) || 0,
                            moneda: e.moneda_flete || "MXN",
                            estado_operativo: e.estado || "",
                            estado_facturacion: e.estado_facturacion || "",
                            quickpaid_enabled: !!e.quickpaid_enabled,
                            precio_quickpaid: e.precio_quickpaid ?? "",
                            precio_flete: e.precio_flete ?? e.precioFlete ?? "",
                            operador: e.operadorAsignado?.nombre || (e.operador && `${e.operador.nombre} ${e.operador.apellidos || ''}`) || "",
                            camion: e.camionAsignado?.numeroEconomico || (e.camion && e.camion.numero_economico) || e.camion_numero_economico || "",
                            remolque: (e.remolque && e.remolque.numero_economico) || e.remolque_numero_economico || e.remolque_placa || "",
                            observaciones: e.observacionesFacturacion || e.observaciones_facturacion || e.observaciones || "",
                            fecha_pago: e.fecha_pago || e.fechaPago || "",
                            fecha_archivado: e.fecha_archivado || e.fechaArchivado || "",
                            id: e.id || "",
                          }));

                          // CSV build with escaping
                          const esc = (v: any) => {
                            const s = v == null ? "" : String(v);
                            return '"' + s.replace(/"/g, '""') + '"';
                          };

                          const headers = [
                            "Folio",
                            "Cliente",
                            "Load",
                            "Tipo Servicio",
                            "Fecha",
                            "Monto",
                            "Moneda",
                            "Estado Operativo",
                            "Estado Facturacion",
                            "QuickPaid",
                            "Precio QuickPaid",
                            "Precio Flete",
                            "Operador",
                            "Camion",
                            "Remolque",
                            "Observaciones",
                            "Fecha Pago",
                            "Fecha Archivado",
                            "ID",
                          ];

                          let csv = headers.map(esc).join(",") + "\n";
                          mapped.forEach((r) => {
                            const row = [
                              esc(r.folio),
                              esc(r.cliente),
                              esc(r.load),
                              esc(r.tipo),
                              esc(r.fecha),
                              esc(r.monto),
                              esc(r.moneda),
                              esc(r.estado_operativo),
                              esc(r.estado_facturacion),
                              esc(r.quickpaid_enabled),
                              esc(r.precio_quickpaid),
                              esc(r.precio_flete),
                              esc(r.operador),
                              esc(r.camion),
                              esc(r.remolque),
                              esc(r.observaciones),
                              esc(r.fecha_pago),
                              esc(r.fecha_archivado),
                              esc(r.id),
                            ].join(",");
                            csv += row + "\n";
                          });

                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `control_clientes_${controlClientesTab}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" /> Exportar
                      </Button>
                    </div>
                  </div>

                  {/* Segunda fila: Periodo Desde / Hasta debajo de Cliente */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col">
                      <Label htmlFor="control-desde" className="text-xs text-gray-600 mb-1">Desde</Label>
                      <Input
                        id="control-desde"
                        type="date"
                        className="w-[160px]"
                        value={controlClientesPeriodo.desde || ""}
                        onChange={(e) => {
                          setControlClientesPeriodo((p) => ({ ...p, desde: e.target.value || null }));
                          setControlClientesRango("custom");
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="control-hasta" className="text-xs text-gray-600 mb-1">Hasta</Label>
                      <Input
                        id="control-hasta"
                        type="date"
                        className="w-[160px]"
                        value={controlClientesPeriodo.hasta || ""}
                        onChange={(e) => {
                          setControlClientesPeriodo((p) => ({ ...p, hasta: e.target.value || null }));
                          setControlClientesRango("custom");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-4 ml-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={controlIncluirArchivados}
                          onChange={(e) => setControlIncluirArchivados(e.target.checked)}
                        />
                        <span className="text-sm">Incluir archivados</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={controlMostrarCancelados}
                          onChange={(e) => setControlMostrarCancelados(e.target.checked)}
                        />
                        <span className="text-sm">Mostrar cancelados</span>
                      </label>
                    </div>

                    {/* Controles de paginación */}
                    <div className="flex items-center gap-2 text-sm ml-auto">
                      <Label htmlFor="items-per-page-control-act" className="text-sm">Registros por página:</Label>
                      <Select
                        value={String(itemsPerPageControl)}
                        onValueChange={(v) => setItemsPerPageControl(Number(v))}
                      >
                        <SelectTrigger id="items-per-page-control-act" className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25, 50, 100].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageControlActivos(p => Math.max(1, p - 1))}
                        disabled={currentPageControlActivos <= 1}
                      >
                        Anterior
                      </Button>
                      <span>
                        Página {currentPageControlActivos} de {totalPagesControlActivos}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageControlActivos(p => Math.min(totalPagesControlActivos, p + 1))}
                        disabled={currentPageControlActivos >= totalPagesControlActivos}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </div>

                
              </div>

      <div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm border-collapse divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[60px]">{renderSortHeader("Folio", "folio")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Empresa</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">{renderSortHeader("Load", "load")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[130px]">{renderSortHeader("Tipo Servicio", "tipo")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">{renderSortHeader("Fecha", "fecha")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">{renderSortHeader("Monto", "monto")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[120px]">{renderSortHeader("Estado", "estado")}</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
        {controlClientesGenerado && (controlClientesFetched ? (
                          // When fetched dataset is present, paginate that instead
                          controlClientesFetched.slice((currentPageControlActivos - 1) * itemsPerPageControl, (currentPageControlActivos - 1) * itemsPerPageControl + itemsPerPageControl).map((e: any) => {
                          
                          const tipoNombre = getTipoNombreFor(e as any);
                          const amount = typeof e.precioFlete === 'number' ? e.precioFlete : Number(e.precioFlete || 0);
                          return (
                            <tr key={e.id} className={`border-b ${esCancelado(e) ? 'bg-red-50 border-red-200' : 'border-gray-100'}`}>
                              <td className="px-3 py-2 text-blue-700 font-medium w-[60px] whitespace-nowrap">{e.folio}</td>
                              <td className="px-3 py-2 text-gray-700">{(e as any).clienteNombre || "-"}</td>
                              <td className="px-3 py-2 text-gray-700">{e.load_number || "-"}</td>
                              <td className="px-3 py-2 text-gray-700 w-[130px]">{tipoNombre}</td>
                              <td className="px-3 py-2 text-gray-700">{new Date(e.fechaAsignacion || e.fecha_creacion || e.updated_at || Date.now()).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-gray-800 font-semibold">${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {e.moneda_flete || 'MXN'}</td>
                              <td className="px-3 py-2 text-gray-700 w-[120px]">
                                <div className="whitespace-nowrap">{e.estado_facturacion || "pendiente_facturacion"}</div>
                                {!String(e.estado || e.estado_facturacion || "").toLowerCase().includes("finalizado") && (
                                  <div className="text-xs text-yellow-700 font-medium mt-1">Aún no finalizado</div>
                                )}
                              </td>
                              <td className="px-3 py-2 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => verDetallesEmbarque(e as any)} aria-label="Ver detalles">
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </td>
                            </tr>
                          );
                          })
                        ) : (
                          paginatedControlActivos.map((e) => {
                            const currency = e.moneda_flete || "MXN";
                            const amount =
                              (typeof (e as any).montoFacturado === "number"
                                ? (e as any).montoFacturado
                                : typeof (e as any).montoFacturado === "string"
                                ? Number((e as any).montoFacturado)
                                : undefined) ??
                              (typeof (e as any).precioFlete === "number"
                                ? (e as any).precioFlete
                                : typeof (e as any).precioFlete === "string"
                                ? Number((e as any).precioFlete)
                                : 0);
                            const tipoNombre = getTipoNombreFor(e as any);
                            return (
                              <tr key={e.id} className={`border-b ${esCancelado(e) ? 'bg-red-50 border-red-200' : 'border-gray-100'}`}>
                                <td className="px-3 py-2 text-blue-700 font-medium w-[60px] whitespace-nowrap">{e.folio}</td>
                                <td className="px-3 py-2 text-gray-700">{(e as any).clienteNombre || "-"}</td>
                                <td className="px-3 py-2 text-gray-700">{e.load_number || "-"}</td>
                                <td className="px-3 py-2 text-gray-700 w-[130px]">{tipoNombre}</td>
                                <td className="px-3 py-2 text-gray-700">{new Date(e.fechaAsignacion || e.fecha_creacion || e.updated_at || Date.now()).toLocaleDateString()}</td>
                                <td className="px-3 py-2 text-gray-800 font-semibold">
                                  ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                </td>
            <td className="px-3 py-2 text-gray-700 w-[120px]">
              <div className="whitespace-nowrap">{e.estado_facturacion || "pendiente_facturacion"}</div>
              {!String(e.estado || e.estado_facturacion || "").toLowerCase().includes("finalizado") && (
                <div className="text-xs text-yellow-700 font-medium mt-1">Aún no finalizado</div>
              )}
            </td>
                                <td className="px-3 py-2">
                                  <Button size="sm" variant="outline" onClick={() => verDetallesEmbarque(e as any)} aria-label="Ver detalles">
                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        ))}
                      </tbody>
                    </table>
                  </div>
      </div>

            </div>
          </DialogContent>
          </Dialog>

          {/* Confirmar archivado: reutilizable dialog */}
          <Dialog open={showConfirmArchivarDialog} onOpenChange={(v) => { if(!v) { setShowConfirmArchivarDialog(false); setEmbarqueAArchivar(null); } }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmar archivado</DialogTitle>
                <DialogDescription>
                  ¿Seguro que deseas archivar este embarque? Se moverá al historial de archivados.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <p className="font-medium">Folio: {embarqueAArchivar?.folio || "-"}</p>
                <p className="text-sm text-gray-600">Cliente: {embarqueAArchivar?.clienteNombre || embarqueAArchivar?.cliente_id || '-'}</p>
                <p className="text-sm text-gray-600">Operador: {embarqueAArchivar?.operadorAsignado?.nombre || '-'}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowConfirmArchivarDialog(false); setEmbarqueAArchivar(null); }}>Cancelar</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                  const emb = embarqueAArchivar;
                  if (!emb) return;
                  setShowConfirmArchivarDialog(false);
                  try {
                    await archivarEmbarque(emb);
                    toast({ title: 'Embarque archivado', description: `Folio: ${emb.folio}`, variant: 'success' });
                  } catch (err: any) {
                    console.error('Error archivando embarque:', err);
                    toast({ title: 'Error al archivar', description: err?.message || String(err), variant: 'destructive' });
                  } finally {
                    setEmbarqueAArchivar(null);
                  }
                }}>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirmar cancelación: dialog para cancelar embarques */}
          <Dialog open={showConfirmCancelarDialog} onOpenChange={(v) => { 
            if(!v) { 
              setShowConfirmCancelarDialog(false); 
              setEmbarqueACancelar(null); 
              setCancelReason(""); 
            } 
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cancelar Embarque</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas cancelar el embarque {embarqueACancelar?.folio}?
                  <br />
                  <strong>Esta acción no se puede deshacer.</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Folio:</span> {embarqueACancelar?.folio || "-"}</p>
                    <p><span className="font-medium">Cliente:</span> {embarqueACancelar?.clienteNombre || '-'}</p>
                    <p><span className="font-medium">Operador:</span> {embarqueACancelar?.operadorAsignado?.nombre || '-'}</p>
                    <p><span className="font-medium">Estado:</span> {embarqueACancelar?.estado || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-reason-facturacion">
                    Justificación de la cancelación *
                  </Label>
                  <Textarea
                    id="cancel-reason-facturacion"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ingresa la razón por la cual se cancela este embarque..."
                    rows={4}
                    className="resize-none"
                    disabled={cancelingEmbarque}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmCancelarDialog(false);
                    setEmbarqueACancelar(null);
                    setCancelReason("");
                  }}
                  disabled={cancelingEmbarque}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={async () => {
                    const emb = embarqueACancelar;
                    if (!emb || !cancelReason.trim()) return;
                    
                    setCancelingEmbarque(true);
                    setShowConfirmCancelarDialog(false);
                    
                    try {
                      await cancelarEmbarque(emb, cancelReason.trim());
                      toast({ 
                        title: 'Embarque cancelado exitosamente', 
                        description: `El embarque ${emb.folio} ha sido cancelado y marcado con badge "Cancelado".`,
                        variant: 'success' 
                      });
                    } catch (err: any) {
                      console.error('Error cancelando embarque:', err);
                      
                      // Manejo mejorado de errores en el botón
                      let errorDescription = 'Error desconocido en la cancelación';
                      
                      if (err instanceof Error) {
                        errorDescription = err.message || 'Error sin mensaje específico';
                      } else if (typeof err === 'string') {
                        errorDescription = err;
                      } else if (err && typeof err === 'object') {
                        if (err.message) {
                          errorDescription = String(err.message);
                        } else {
                          errorDescription = 'Error del sistema - por favor intente de nuevo';
                        }
                      }
                      
                      toast({ 
                        title: 'Error al cancelar', 
                        description: errorDescription, 
                        variant: 'destructive' 
                      });
                    } finally {
                      setCancelingEmbarque(false);
                      setEmbarqueACancelar(null);
                      setCancelReason("");
                    }
                  }}
                  disabled={cancelingEmbarque || !cancelReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {cancelingEmbarque ? (
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

        <Dialog
          open={showTiposServicioModal}
          onOpenChange={setShowTiposServicioModal}
        >
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de Tipos de Servicio</DialogTitle>
              <DialogDescription>
                Asignar precios a cada tipo de servicio para calcular
                automáticamente los pagos a operadores
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowTiposInfo(true)}
                    title="Información"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                  <div className="text-sm text-gray-600 hidden md:block">
                    Puedes crear nuevos tipos de servicio y ajustar sus pagos.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="items-per-page-tipos" className="text-sm">Registros por página:</Label>
                    <Select
                      value={String(itemsPerPageTipos)}
                      onValueChange={(value) => {
                        setItemsPerPageTipos(Number(value));
                        setCurrentPageTipos(1);
                      }}
                    >
                      <SelectTrigger id="items-per-page-tipos" className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportarTiposServicioExcel()}
                  >
                    <Download className="h-4 w-4 mr-2" /> Exportar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfigurarFleteModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Flete en Falso
                  </Button>
                  <Button
                    onClick={() => setShowCrearTipoModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    + Agregar Tipo de Servicio
                  </Button>
                  
                </div>
              </div>

              {/* Input de búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tipos de servicio por nombre, descripción, categoría..."
                  value={searchTipos}
                  onChange={(e) => setSearchTipos(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Modal informativo con el texto azul */}
              <Dialog open={showTiposInfo} onOpenChange={setShowTiposInfo}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Gestión de Tipos de Servicio - Información</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Tabulador de Pagos a Operadores</h4>
                      <p className="text-sm text-blue-800">
                        Define el monto que pagarás a tus operadores por cada tipo de
                        servicio. Cuando asignes un embarque con un tipo de servicio
                        específico, el sistema calculará automáticamente el pago
                        correspondiente al operador basándose en estos valores.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        • Los montos se establecen en pesos mexicanos (MXN) • Los
                        cambios se guardan automáticamente en la base de datos
                      </p>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">Reglas de Eliminación</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-green-800">Se puede eliminar:</span>
                            <p className="text-gray-700">Tipos de servicio sin referencias activas en embarques, servicios o registros financieros.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-red-800">NO se puede eliminar:</span>
                            <div className="text-gray-700">
                              <p>• Tipos con embarques activos en el sistema</p>
                              <p>• Tipos referenciados en configuraciones de servicios</p>
                              <p>• Tipos con registros financieros asociados</p>
                              <p>• El único tipo de servicio activo restante</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">Alternativa Segura</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          Si no se puede eliminar, el sistema desactivará automáticamente el tipo para ocultarlo sin perder datos históricos.
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {loadingTiposServicio ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                  <span className="ml-2 text-sm text-gray-600">
                    Cargando tipos de servicio...
                  </span>
                </div>
              ) : tiposServicio.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    No se encontraron tipos de servicio
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Los tipos de servicio configurados aparecerán aquí
                  </p>
                </div>
              ) : tiposFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    No se encontraron tipos de servicio que coincidan con "{searchTipos}"
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Intenta con otros términos de búsqueda
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th
                          className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                          onClick={() => {
                            setCurrentPageTipos(1);
                            if (tiposSortBy === 'tipo') setTiposSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                            else { setTiposSortBy('tipo'); setTiposSortDir('asc'); }
                          }}
                        >
                          Tipo{tiposSortBy === 'tipo' ? (tiposSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">
                          Descripción
                        </th>
                        <th
                          className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                          onClick={() => {
                            setCurrentPageTipos(1);
                            if (tiposSortBy === 'categoria') setTiposSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                            else { setTiposSortBy('categoria'); setTiposSortDir('asc'); }
                          }}
                        >
                          Categoría{tiposSortBy === 'categoria' ? (tiposSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-32">
                          Subcategoría
                        </th>
                        <th
                          className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer select-none"
                          onClick={() => {
                            setCurrentPageTipos(1);
                            if (tiposSortBy === 'pago') setTiposSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                            else { setTiposSortBy('pago'); setTiposSortDir('desc'); }
                          }}
                        >
                          Pago Operador (MXN){tiposSortBy === 'pago' ? (tiposSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">
                          Estado
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">
                          Detalles
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTipos.map((tipo) => (
                        <tr key={tipo.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {tipo.nombre}
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[480px]">
                            {tipo.descripcion || "Sin descripción"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {tipo.categoria || "General"}
                          </td>
                          <td className="px-3 py-2 text-gray-700 w-32 max-w-[8rem]">
                            <span className="block truncate" title={tipo.subcategoria || "-"}>
                              {tipo.subcategoria || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800 font-medium">
                            {(() => {
                              const montoActivo = obtenerMontoTipoServicio(tipo);
                              const formatted = `$${montoActivo.toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`;
                              return (
                                <div className="flex flex-col items-end">
                                  <span>{formatted}</span>
                                </div>
                              );
                            })()}
                          </td>
                          {/* Nueva columna de Estado */}
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center">
                              {loadingValidation ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                              ) : tipoValidationInfo?.[tipo.id] ? (
                                tipoValidationInfo[tipo.id].canDelete ? (
                                  <div className="flex items-center gap-1 text-green-600" title={tipoValidationInfo[tipo.id].reason}>
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium">Eliminar</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-600" title={tipoValidationInfo[tipo.id].reason}>
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium">
                                      {tipoValidationInfo[tipo.id].embarquesCount > 0 && `${tipoValidationInfo[tipo.id].embarquesCount} refs`}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="text-gray-400 text-xs">-</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {/* Detalles column: lock + edit + save */}
                            <DetallesTipoRow
                              tipo={tipo}
                              onSave={(nuevoMonto: number) => {
                                guardarTipoServicio(tipo.id, nuevoMonto);
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                                onClick={() => cargarUsosTipo(tipo)}
                                title="Ver usos"
                                aria-label="Ver usos"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => abrirEditarTipo(tipo)}
                                title="Editar nombre y datos"
                                aria-label="Editar"
                                className="border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => eliminarTipoServicio(tipo)}
                                title={
                                  tipoValidationInfo?.[tipo.id]
                                    ? tipoValidationInfo[tipo.id].canDelete
                                      ? "Eliminar tipo de servicio"
                                      : `No se puede eliminar: ${tipoValidationInfo[tipo.id].reason}`
                                    : loadingValidation
                                    ? "Validando..."
                                    : "Eliminar"
                                }
                                aria-label="Eliminar"
                                disabled={
                                  loadingValidation || 
                                  (tipoValidationInfo?.[tipo.id] && !tipoValidationInfo[tipo.id].canDelete)
                                }
                                className={`border-red-300 ${
                                  tipoValidationInfo?.[tipo.id] && !tipoValidationInfo[tipo.id].canDelete
                                    ? "text-red-300 bg-red-50 cursor-not-allowed opacity-50"
                                    : "text-red-600 hover:text-red-700 hover:bg-red-50"
                                }`}
                              >
                                {loadingValidation ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPagesTipos > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageTipos((p) => Math.max(1, p - 1))}
                        disabled={currentPageTipos === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-700">
                        Página {currentPageTipos} de {totalPagesTipos}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageTipos((p) => Math.min(totalPagesTipos, p + 1))}
                        disabled={currentPageTipos === totalPagesTipos}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Configurar Flete en Falso */}
        <Dialog open={showConfigurarFleteModal} onOpenChange={setShowConfigurarFleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Precio de Flete en Falso</DialogTitle>
              <DialogDescription>
                Establece el precio único para todos los fletes en falso (contingencias).
                Este precio se aplicará automáticamente cuando se marque un embarque como "flete en falso".
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="text-amber-600">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Precio Global</p>
                    <p className="text-xs text-amber-700">
                      Este precio se aplicará a TODOS los embarques marcados como flete en falso,
                      independientemente del tipo de servicio.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="precioFlete">Precio del Operador (MXN)</Label>
                <Input
                  id="precioFlete"
                  type="text"
                  value={precioFleteFalso}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir solo números, comas y puntos
                    const cleaned = value.replace(/[^\d.,]/g, '');
                    
                    // Si es un número válido, formatearlo
                    const num = parsearPrecioMexicano(cleaned);
                    if (!isNaN(num) && num >= 0) {
                      setPrecioFleteFalso(formatearPrecioMexicano(num));
                    } else if (cleaned === '' || cleaned === '0' || /^\d*\.?\d{0,2}$/.test(cleaned)) {
                      // Permitir entrada intermedia válida
                      setPrecioFleteFalso(cleaned);
                    }
                  }}
                  onBlur={() => {
                    // Al perder el foco, asegurar formato correcto
                    const num = parsearPrecioMexicano(precioFleteFalso);
                    if (!isNaN(num) && num >= 0) {
                      setPrecioFleteFalso(formatearPrecioMexicano(num));
                    } else {
                      setPrecioFleteFalso('800.00');
                    }
                  }}
                  placeholder="800.00"
                  className="text-right"
                  disabled={guardandoPrecioFlete}
                />
                <p className="text-xs text-gray-600">
                  Este será el monto que se pagará automáticamente a los operadores
                  cuando un embarque se marque como "flete en falso".
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfigurarFleteModal(false)}
                disabled={guardandoPrecioFlete}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarPrecioFleteFalso}
                disabled={guardandoPrecioFlete}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {guardandoPrecioFlete ? 'Guardando...' : 'Guardar Precio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Crear Tipo de Servicio */}
        <Dialog open={showCrearTipoModal} onOpenChange={setShowCrearTipoModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nuevo Tipo de Servicio</DialogTitle>
              <DialogDescription>
                Completa los campos para agregar un nuevo tipo de servicio.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={nuevoTipo.nombre}
                  onChange={(e) =>
                    setNuevoTipo((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej. EXPORTACIÓN CARGADA - CAJA SECA 240"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={nuevoTipo.descripcion}
                  onChange={(e) =>
                    setNuevoTipo((p) => ({ ...p, descripcion: e.target.value }))
                  }
                  placeholder="Describe el servicio"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={nuevoTipo.categoria}
                    onChange={(e) =>
                      setNuevoTipo((p) => ({ ...p, categoria: e.target.value }))
                    }
                    placeholder="Ej. Servicios de Aduana"
                  />
                </div>
                <div>
                  <Label>Subcategoría</Label>
                  <Input
                    value={nuevoTipo.subcategoria}
                    onChange={(e) =>
                      setNuevoTipo((p) => ({
                        ...p,
                        subcategoria: e.target.value,
                      }))
                    }
                    placeholder="Ej. Exportación 240"
                  />
                </div>
              </div>
              <div>
                <Label>Pago Operador (MXN)</Label>
                <Input
                  type="number"
                  value={String(nuevoTipo.precio_base)}
                  onChange={(e) =>
                    setNuevoTipo((p) => ({
                      ...p,
                      precio_base: Number(e.target.value || 0),
                    }))
                  }
                  min={0}
                />
              </div>
              {/* Eliminado: configuración por tipo para flete en falso (precio ahora es global) */}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCrearTipoModal(false)}
                disabled={guardandoNuevoTipo}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearNuevoTipoServicio}
                disabled={guardandoNuevoTipo}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {guardandoNuevoTipo ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Editar Tipo de Servicio */}
        <Dialog open={showEditarTipoModal} onOpenChange={(v) => { setShowEditarTipoModal(v); if (!v) setTipoEditando(null); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar Tipo de Servicio</DialogTitle>
              <DialogDescription>
                Actualiza el nombre y los datos del tipo de servicio.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={editarTipo.nombre}
                  onChange={(e) => setEditarTipo((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. EXPORTACIÓN CARGADA - CAJA SECA 240"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={editarTipo.descripcion}
                  onChange={(e) => setEditarTipo((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe el servicio"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={editarTipo.categoria}
                    onChange={(e) => setEditarTipo((p) => ({ ...p, categoria: e.target.value }))}
                    placeholder="Ej. Servicios de Aduana"
                  />
                </div>
                <div>
                  <Label>Subcategoría</Label>
                  <Input
                    value={editarTipo.subcategoria}
                    onChange={(e) => setEditarTipo((p) => ({ ...p, subcategoria: e.target.value }))}
                    placeholder="Ej. Exportación 240"
                  />
                </div>
              </div>
              {/* Eliminado: configuración por tipo para flete en falso (precio ahora es global) */}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => { setShowEditarTipoModal(false); setTipoEditando(null); }}
                disabled={guardandoEdicionTipo}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarEdicionTipo}
                disabled={guardandoEdicionTipo}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {guardandoEdicionTipo ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Ver usos de Tipo de Servicio */}
        <Dialog open={showUsosModal} onOpenChange={setShowUsosModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Embarques en uso — {usosTipo?.nombre || ''}</DialogTitle>
              <DialogDescription>
                Se muestran todos los embarques que referencian este tipo. Los embarques archivados o cancelados no bloquean la eliminación.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-[160px]">
              {usosLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-600">Cargando…</div>
              ) : usosEmbarques.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Sin embarques que refieran este tipo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="px-2 py-1 text-sm text-gray-600">Embarques que bloquean eliminación: <strong>{usosEmbarques.filter((u) => u.bloquea).length}</strong></div>
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border text-left">Folio</th>
                        <th className="px-2 py-1 border text-left">Estado Operativo</th>
                        <th className="px-2 py-1 border text-left">Estado Facturación</th>
                        <th className="px-2 py-1 border text-left">Bloquea</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usosEmbarques.map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="px-2 py-1 border">{e.folio || e.id}</td>
                          <td className="px-2 py-1 border">{e.estado || '-'}</td>
                          <td className="px-2 py-1 border">{e.estado_facturacion || '-'}</td>
                          <td className="px-2 py-1 border">{e.bloquea ? 'Sí' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUsosModal(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
  <DialogContent className={`max-w-7xl w-full ${activeDetailTab === "modificaciones" ? "h-[70vh]" : activeDetailTab === "transportacion" ? "h-[45vh]" : activeDetailTab === "facturacion" ? "h-[65vh]" : "h-[50vh]"} overflow-hidden flex flex-col`}>
            <DialogHeader>
              <DialogTitle>
                Detalles del Embarque - {embarqueDetalle?.folio}
              </DialogTitle>
            </DialogHeader>

            {embarqueDetalle && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="border-b flex items-center justify-between gap-2">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "general"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("general")}
                    >
                      Información General
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "entrega"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("entrega")}
                    >
                      Ubicaciones
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "transportacion"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("transportacion")}
                    >
                      Transportación
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "facturacion"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("facturacion")}
                    >
                      Facturación
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "cliente"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("cliente")}
                    >
                      Contacto del Cliente
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "modificaciones"
                          ? "border-red-500 text-red-600"
                          : "border-transparent text-red-500 hover:text-red-700"
                      }`}
                      onClick={() => setActiveDetailTab("modificaciones")}
                    >
                      Historial de Cambios
                    </button>
                    <button
                      className={`border-b-2 py-2 px-1 text-sm font-medium ${
                        activeDetailTab === "fotos"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveDetailTab("fotos")}
                    >
                      Fotos ({fotosDetalle.length})
                    </button>
                  </nav>
                  {/* Botón Exportar oculto por solicitud */}
                  {/* <div className="-mb-px">
                    <Button size="sm" variant="outline" onClick={exportarDetalleEmbarqueExcel}>
                      <Download className="h-4 w-4 mr-2" /> Exportar
                    </Button>
                  </div> */}
                </div>

                <div className="mt-4 min-h-[420px]">
                  {activeDetailTab === "general" && (
                    <div className="space-y-6">
                      {/* Información del Embarque */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                          Información del Embarque
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          {/* Columna izquierda: datos del embarque */}
                          <div className="space-y-1">
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Folio:</span>
                              <span>{embarqueDetalle.folio}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Cliente:</span>
                              <span>{embarqueDetalle.clienteNombre}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Cliente del Embarque:</span>
                              <span>{(embarqueDetalle as any).dueno_mercancia || "-"}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Load:</span>
                              <span>{embarqueDetalle.load_number}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Fecha Creación:</span>
                              <span>
                                {new Date(embarqueDetalle.updated_at!).toLocaleDateString()}
                              </span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Carta Porte:</span>
                              <span>{(embarqueDetalle as any).carta_porte || "-"}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Tipo de Servicio:</span>
                              <span>
                                {embarqueDetalle.tipoServicioNombre ||
                                  (tiposServicio.find((t) => t.id === (embarqueDetalle as any).tipo_servicio_id)?.nombre || "Sin especificar")}
                              </span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Contenido:</span>
                              <span>{(embarqueDetalle as any).contenido || "-"}</span>
                            </p>
                            <p className="grid grid-cols-2 text-sm">
                              <span className="text-gray-500 font-semibold">Observaciones:</span>
                              <span>
                                {embarqueDetalle.comentarios ||
                                  embarqueDetalle.observacionesFacturacion ||
                                  (embarqueDetalle as any).observaciones_facturacion ||
                                  "-"}
                              </span>
                            </p>
                          </div>

                          {/* Columna derecha: Total facturado grande */}
                          <div className="flex md:justify-end md:pr-8">
                            <div className="text-right">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Facturado</div>
                              <div className="text-3xl md:text-4xl font-bold text-blue-600 leading-tight">
                                ${(() => {
                                  const isQuick = (embarqueDetalle as any)?.quickpaid_enabled;
                                  const quick = (embarqueDetalle as any)?.precio_quickpaid;
                                  const base = (embarqueDetalle.cantidad_final_facturada ?? embarqueDetalle.precio_flete ?? 0) as number;
                                  const amount = isQuick && (typeof quick === 'number' || typeof quick === 'string') ? (typeof quick === 'number' ? quick : Number(quick) || 0) : base;
                                  return amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()} {embarqueDetalle.moneda_flete || "MXN"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {monedaNombre(embarqueDetalle.moneda_flete)}
                              </div>

                              {(embarqueDetalle as any).quickpaid_enabled ? (
                                <div className="mt-4">
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-end gap-4">
                                    <div className="text-right md:text-right">
                                      <p className="text-sm text-gray-500">Monto Flete</p>
                                      <p className="font-semibold text-gray-900">${((embarqueDetalle.cantidad_final_facturada ?? embarqueDetalle.precio_flete ?? 0) as number).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {embarqueDetalle.moneda_flete || 'MXN'}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">{monedaNombre(embarqueDetalle.moneda_flete)}</p>
                                    </div>

                                    <div className="text-right md:text-right">
                                      <p className="text-sm text-gray-500">Descuento</p>
                                      {(embarqueDetalle as any).quickpaid_enabled && typeof (embarqueDetalle as any).quickpaid_descuento === 'number' && (embarqueDetalle as any).quickpaid_descuento > 0 ? (
                                        <>
                                          <p className="font-semibold text-yellow-700">-${(embarqueDetalle as any).quickpaid_descuento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">{monedaNombre((embarqueDetalle as any).moneda_flete)}</p>
                                        </>
                                      ) : (
                                        <p className="text-gray-500">-</p>
                                      )}
                                    </div>

                                    <div className="text-right md:text-right">
                                      <p className="text-sm text-gray-500">Precio QuickPaid</p>
                                      {(embarqueDetalle as any).quickpaid_enabled && typeof (embarqueDetalle as any).precio_quickpaid === 'number' && (embarqueDetalle as any).precio_quickpaid > 0 ? (
                                        <>
                                          <p className="font-semibold text-yellow-900">${(embarqueDetalle as any).precio_quickpaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">{monedaNombre((embarqueDetalle as any).moneda_flete)}</p>
                                        </>
                                      ) : (
                                        <p className="text-gray-500">-</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      

                      {embarqueDetalle.comentarios && (
                        <div className="border-t pt-4 mt-4">
                          <h3 className="font-medium text-gray-900 mb-2">Comentarios</h3>
                          <p className="text-sm text-gray-600">{embarqueDetalle.comentarios}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === "facturacion" && (
                    <div className="space-y-6 flex-1 overflow-y-auto px-1 md:px-4 py-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b pb-2">Información de Facturación</h3>
                      {/* Resumen compacto en una fila + botón editar alineado */}
                          <div className="flex flex-col md:flex-row md:items-center md:gap-6 text-sm">
                        <div className="flex-1 flex items-center justify-between md:justify-start md:gap-2 py-1">
                          <span className="text-gray-500">Valor Facturado</span>
                          <span className="font-semibold text-gray-900">
                            ${ getMontoContable(embarqueDetalle).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) } {embarqueDetalle.moneda_flete}
                            <span className="block text-xs text-gray-500">{monedaNombre(embarqueDetalle.moneda_flete)}</span>
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-between md:justify-start md:gap-2 py-1">
                          <span className="text-gray-500">Estado facturación</span>
                          <div className="flex items-center">
                            <Select
                              value={embarqueDetalle.estado_facturacion || "pendiente_facturacion"}
                              onValueChange={async (value) => {
                                  try {
                                    // If user selected 'archivar' from the detalle select,
                                    // open the confirm dialog for this embarque instead of
                                    // immediately updating the DB.
                                    if (value === 'archivar') {
                                      setEmbarqueAArchivar(embarqueDetalle);
                                      setShowConfirmArchivarDialog(true);
                                      return;
                                    }
                                    const v = (["pendiente_facturacion", "facturado", "pagado"] as const).includes(value as any)
                                      ? (value as "pendiente_facturacion" | "facturado" | "pagado")
                                      : "pendiente_facturacion";
                                    const embarquesActualizados = embarquesAsignados.map((e) =>
                                      e.id === embarqueDetalle.id ? { ...e, estado_facturacion: v } : e
                                    );
                                    if (mounted.current) {
                                      setEmbarquesAsignados(embarquesActualizados);
                                      localStorage.setItem(
                                        "embarquesAsignados",
                                        JSON.stringify(embarquesActualizados)
                                      );
                                      setEmbarqueDetalle({ ...embarqueDetalle, estado_facturacion: v });
                                    }
                                    await supabase
                                      .from("embarques")
                                      .update({ estado_facturacion: v, updated_at: new Date().toISOString() })
                                      .eq("id", embarqueDetalle.id);
                                  } catch (error) {
                                    console.error("Error actualizando estado de facturación:", error);
                                    toast({ title: 'Error al actualizar el estado de facturación', description: String((error as any)?.message || ''), variant: 'default' });
                                  }
                                }}
                            >
                              <SelectTrigger className="w-44 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente_facturacion">Pendiente Facturación</SelectItem>
                                <SelectItem value="facturado">Facturado</SelectItem>
                                <SelectItem value="pagado">Pagado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                          <div className="flex-1 flex items-center justify-between md:justify-start md:gap-2 py-1">
                          <span className="text-gray-500">Pago</span>
                          <span className="flex items-center gap-2">
                            <Badge variant={embarqueDetalle.pagado ? "default" : "secondary"}>
                              {embarqueDetalle.pagado ? "Pagado" : "Pendiente"}
                            </Badge>
                            <span className="text-xs text-gray-600">
                              {embarqueDetalle.fecha_pago ? formatDateMatamoros(normalizeDate((embarqueDetalle as any).fecha_pago) || (embarqueDetalle as any).fecha_pago) : "Sin fecha"}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 md:mt-0 md:ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => embarqueDetalle && abrirModalFacturacion(embarqueDetalle)}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Editar Facturación
                          </Button>
                        </div>
                      </div>

                      {(embarqueDetalle as any).quickpaid_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <p className="flex justify-between md:block"><span className="text-gray-500">Precio Flete</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).precio_flete != null ? `${Number((embarqueDetalle as any).precio_flete).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(embarqueDetalle as any).moneda_flete || 'MXN'}` : ((embarqueDetalle as any).precioFlete != null ? `${Number((embarqueDetalle as any).precioFlete).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(embarqueDetalle as any).moneda_flete || 'MXN'}` : '-')}</span><span className="block text-xs text-gray-500">{monedaNombre((embarqueDetalle as any).moneda_flete)}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Descuento QuickPaid</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).quickpaid_descuento != null ? `-${Number((embarqueDetalle as any).quickpaid_descuento).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(embarqueDetalle as any).moneda_flete || 'MXN'}` : "-"}</span><span className="block text-xs text-gray-500">{monedaNombre((embarqueDetalle as any).moneda_flete)}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Precio QuickPaid</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).precio_quickpaid != null ? `${Number((embarqueDetalle as any).precio_quickpaid).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(embarqueDetalle as any).moneda_flete || 'MXN'}` : "-"}</span><span className="block text-xs text-gray-500">{monedaNombre((embarqueDetalle as any).moneda_flete)}</span></p>
                          <div></div>
                        </div>
                      )}

                      {/* Listado de facturas en filas */}
                      <div className="space-y-3">
                        {/* Etiqueta 'Facturas (1 a 4)' removida por solicitud */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left">Factura</th>
                                <th className="px-2 py-1 text-left">Folio</th>
                                <th className="px-2 py-1 text-left">Referencia</th>
                                <th className="px-2 py-1 text-left">Fecha envío</th>
                                <th className="px-2 py-1 text-left">Fecha pago</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Leer datos desde facturas_json (nueva fuente de verdad)
                                const facturas = embarqueDetalle?.facturas_json || [];
                                
                                const f = [1,2,3,4].map((i) => {
                                  const factura = facturas[i-1]; // Array es 0-indexed
                                  const anyDet = embarqueDetalle as any;
                                  
                                  return {
                                    n: i,
                                    folio: 
                                      factura?.numero ||
                                      (anyDet.foliosFactura && anyDet.foliosFactura[`folio${i}`]) ||
                                      "",
                                    envio: factura?.fecha_envio || "",
                                    pago: factura?.fecha_pago || (i === 1 ? anyDet["fecha_pago"] : ""),
                                    ref: factura?.referencia || "",
                                  };
                                });
                                return f.map((row) => (
                                  <tr key={row.n} className="border-b">
                                    <td className="px-2 py-1">Factura {row.n}</td>
                                    <td className="px-2 py-1">{row.folio || "-"}</td>
                                    <td className="px-2 py-1">{row.ref || "-"}</td>
                                    <td className="px-2 py-1">{row.envio ? formatDateMatamoros(normalizeDate(row.envio) || row.envio) : "-"}</td>
                                    <td className="px-2 py-1">{row.pago ? formatDateMatamoros(normalizeDate(row.pago) || row.pago) : "-"}</td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {(embarqueDetalle.observacionesFacturacion || (embarqueDetalle as any).observaciones_facturacion) && (
                        <div className="border-t pt-4 mt-2">
                          <h3 className="font-medium text-gray-900 mb-2">Observaciones</h3>
                          <p className="text-sm text-gray-600">
                            {embarqueDetalle.observacionesFacturacion || (embarqueDetalle as any).observaciones_facturacion}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === "transportacion" && (
                    <div className="space-y-6">
                      {/* Detalles de Operación (movido a este tab) */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b pb-2">Detalles de Operación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <p className="flex justify-between md:block"><span className="text-gray-500">Operador</span><span className="md:block md:mt-1 font-medium text-gray-900">{embarqueDetalle.operadorAsignado?.nombre || "Sin asignar"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Unidad (Tractocamión)</span><span className="md:block md:mt-1 font-medium text-gray-900">{embarqueDetalle.camionAsignado?.numeroEconomico || (embarqueDetalle as any).camion?.numero_economico || "N/A"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Remolque</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).remolque?.numero_economico || (embarqueDetalle as any).remolque_numero_economico || (embarqueDetalle as any).remolque_placa || "N/A"}</span></p>
                        </div>
                      </div>

                      {/* Información de Transportación */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b pb-2">Información de Transportación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <p className="flex justify-between md:block"><span className="text-gray-500">Patente Agente Aduana</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).patente_agente_aduanal || "-"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Aduana de Cruce</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).aduana_cruce || "-"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Cliente del Embarque</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).dueno_mercancia || "-"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Contenido</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).contenido || "-"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Peso (kg)</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).peso ?? (embarqueDetalle as any).peso_kg ?? "-"}</span></p>
                          <p className="flex justify-between md:block"><span className="text-gray-500">Carta Porte</span><span className="md:block md:mt-1 font-medium text-gray-900">{(embarqueDetalle as any).carta_porte || "-"}</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "cliente" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b pb-2">Contacto del Cliente</h3>
                      {(() => {
                        const c = getClienteById(embarqueDetalle.cliente_id);
                        const anyDet: any = embarqueDetalle;
                        const contactoNombre = anyDet.info_representante?.nombre || anyDet.representante_cliente || c?.contacto || c?.nombre_contacto || "";
                        const contactoTel = anyDet.info_representante?.telefono || c?.telefono || c?.telefono_contacto || "";
                        const contactoEmail = anyDet.info_representante?.email || c?.correo || c?.correo_contacto || "";
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <p className="flex justify-between md:block"><span className="text-gray-500">Cliente</span><span className="md:block md:mt-1 font-medium text-gray-900">{c?.nombre || embarqueDetalle.clienteNombre}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">RFC</span><span className="md:block md:mt-1 font-medium text-gray-900">{c?.rfc || "-"}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">Divisa de pago</span><span className="md:block md:mt-1 font-medium text-gray-900">{c?.divisa_pago || c?.moneda_preferida || "-"}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">Empresa facturadora</span><span className="md:block md:mt-1 font-medium text-gray-900">{c?.empresa_facturadora || c?.razon_social || c?.nombre_comercial || "-"}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">Contacto</span><span className="md:block md:mt-1 font-medium text-gray-900">{contactoNombre || "-"}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">Teléfono</span><span className="md:block md:mt-1 font-medium text-gray-900">{contactoTel || "-"}</span></p>
                            <p className="flex justify-between md:block"><span className="text-gray-500">Correo</span><span className="md:block md:mt-1 font-medium text-gray-900">{contactoEmail || "-"}</span></p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activeDetailTab === "entrega" && (
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Direcciones de Recolecta y Entrega</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">Dirección de Recolecta</label>
                            <div className="bg-gray-50 border rounded-lg p-4">
                              <p className="text-sm text-gray-900 leading-relaxed">
                                {(embarqueDetalle as any).direccion_recolecta || (embarqueDetalle as any).direccionRecolecta || "No especificada"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</label>
                                <p className="text-sm text-gray-700">{(embarqueDetalle as any).fecha_recolecta ? formatDateMatamoros(normalizeDate((embarqueDetalle as any).fecha_recolecta) || (embarqueDetalle as any).fecha_recolecta) : "Sin fecha"}</p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora</label>
                                <p className="text-sm text-gray-700">{(embarqueDetalle as any).hora_recolecta || "Sin hora"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700">Dirección de Entrega</label>
                            <div className="bg-gray-50 border rounded-lg p-4">
                              <p className="text-sm text-gray-900 leading-relaxed">
                                {(embarqueDetalle as any).direccion_entrega || (embarqueDetalle as any).direccionEnganche || "No especificada"}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</label>
                                <p className="text-sm text-gray-700">{(embarqueDetalle as any).fecha_entrega ? formatDateMatamoros(normalizeDate((embarqueDetalle as any).fecha_entrega) || (embarqueDetalle as any).fecha_entrega) : ((embarqueDetalle as any).fechaEntrega || "Sin fecha")}</p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora</label>
                                <p className="text-sm text-gray-700">{(embarqueDetalle as any).hora_entrega || "Sin hora"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === "fotos" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b pb-2">Fotos de Evidencia del Embarque</h3>
                      {loadingFotosDetalle ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                          <span className="ml-2 text-sm text-gray-600">Cargando fotos...</span>
                        </div>
                      ) : fotosDetalle.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {fotosDetalle.map((foto) => (
                            <div key={foto.id} className="border rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                className="block w-full aspect-square bg-gray-50"
                                onClick={() => setSelectedImage(foto.url_blob)}
                                title={foto.nombre_archivo}
                              >
                                <img
                                  src={foto.url_blob}
                                  alt={foto.nombre_archivo}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                              <div className="p-2 text-xs text-gray-600">
                                <div className="truncate" title={foto.nombre_archivo}>{foto.nombre_archivo}</div>
                                <div className="flex justify-between mt-1">
                                  <span>{foto.fecha_subida ? new Date(foto.fecha_subida).toLocaleDateString() : ""}</span>
                                  {typeof foto.tamano_bytes === "number" && (
                                    <span>
                                      {Math.max(1, Math.round(foto.tamano_bytes / 1024))} KB
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  <a
                                    href={foto.url_blob}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Ver
                                  </a>
                                  <a href={foto.url_blob} download className="text-gray-700 hover:underline">
                                    Descargar
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-gray-600">
                          No hay fotos de evidencia para este embarque.
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === "modificaciones" && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">
                        Historial de Modificaciones
                      </h3>
                      <ModificacionesHistory embarqueId={embarqueDetalle.id} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer actions: Cerrar, Exportar, Modificar */}
            <div className="border-t pt-3 mt-3 flex items-center justify-start gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailModal(false)}
                aria-label="Cerrar detalles"
              >
                Cerrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarDetalleEmbarqueExcel}
                aria-label="Exportar detalles"
              >
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
              {/* Botón Modificar oculto por solicitud */}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showFacturacionEditModal}
          onOpenChange={setShowFacturacionEditModal}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Editar Información de Facturación</DialogTitle>
              <DialogDescription>
                Actualizar los folios de factura y montos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="folio1">Folio Factura 1:</Label>
                  <Input
                    id="folio1"
                    value={facturacionFormData.folio1}
                    onChange={(e) =>
                      setFacturacionFormData((prev) => ({
                        ...prev,
                        folio1: e.target.value,
                      }))
                    }
                    placeholder="Folio 1"
                  />
                </div>
                <div>
                  <Label htmlFor="folio2">Folio Factura 2:</Label>
                  <Input
                    id="folio2"
                    value={facturacionFormData.folio2}
                    onChange={(e) =>
                      setFacturacionFormData((prev) => ({
                        ...prev,
                        folio2: e.target.value,
                      }))
                    }
                    placeholder="Folio 2"
                  />
                </div>
                <div>
                  <Label htmlFor="folio3">Folio Factura 3:</Label>
                  <Input
                    id="folio3"
                    value={facturacionFormData.folio3}
                    onChange={(e) =>
                      setFacturacionFormData((prev) => ({
                        ...prev,
                        folio3: e.target.value,
                      }))
                    }
                    placeholder="Folio 3"
                  />
                </div>
                <div>
                  <Label htmlFor="folio4">Folio Factura 4:</Label>
                  <Input
                    id="folio4"
                    value={facturacionFormData.folio4}
                    onChange={(e) =>
                      setFacturacionFormData((prev) => ({
                        ...prev,
                        folio4: e.target.value,
                      }))
                    }
                    placeholder="Folio 4"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cantidad-final">
                  Cantidad Final Facturada:
                </Label>
                <Input
                  type="number"
                  id="cantidad-final"
                  value={facturacionFormData.cantidadFinalFacturada}
                  onChange={(e) =>
                    setFacturacionFormData((prev) => ({
                      ...prev,
                      cantidadFinalFacturada: Number(e.target.value),
                    }))
                  }
                  placeholder="Cantidad Final"
                />
              </div>
              <div>
                <Label htmlFor="observaciones">Observaciones:</Label>
                <Textarea
                  id="observaciones"
                  value={facturacionFormData.observacionesFacturacion}
                  onChange={(e) =>
                    setFacturacionFormData((prev) => ({
                      ...prev,
                      observacionesFacturacion: e.target.value,
                    }))
                  }
                  placeholder="Observaciones sobre la facturación"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFacturacionEditModal(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={guardarInformacionFacturacion}>
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Embarque</DialogTitle>
              <DialogDescription>
                Actualizar información del embarque
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="montoFacturado">Monto Facturado</Label>
                <Input
                  type="number"
                  id="montoFacturado"
                  value={formData.montoFacturado}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      montoFacturado: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fechaEntrega">Fecha Entrega</Label>
                <Input
                  type="date"
                  id="fechaEntrega"
                  value={formData.fechaEntrega}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaEntrega: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="observacionesFacturacion">
                  Observaciones Facturación
                </Label>
                <Textarea
                  id="observacionesFacturacion"
                  value={formData.observacionesFacturacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      observacionesFacturacion: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="pagado">Pagado</Label>
                <Input
                  type="checkbox"
                  id="pagado"
                  checked={formData.pagado}
                  onChange={(e) =>
                    setFormData({ ...formData, pagado: e.target.checked })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fechaPago">Fecha Pago</Label>
                <Input
                  type="date"
                  id="fechaPago"
                  value={formData.fechaPago}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaPago: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="estado_facturacion">Estado Facturación</Label>
                  <Select
                  value={formData.estado_facturacion}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      estado_facturacion: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente_facturacion">
                      Pendiente Facturación
                    </SelectItem>
                    <SelectItem value="facturado">Facturado</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="numeroFactura1">Número Factura 1</Label>
                <Input
                  type="text"
                  id="numeroFactura1"
                  value={formData.numeroFactura1}
                  onChange={(e) =>
                    setFormData({ ...formData, numeroFactura1: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="numeroFactura2">Número Factura 2</Label>
                <Input
                  type="text"
                  id="numeroFactura2"
                  value={formData.numeroFactura2}
                  onChange={(e) =>
                    setFormData({ ...formData, numeroFactura2: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="numeroFactura3">Número Factura 3</Label>
                <Input
                  type="text"
                  id="numeroFactura3"
                  value={formData.numeroFactura3}
                  onChange={(e) =>
                    setFormData({ ...formData, numeroFactura3: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fechaEnvioCliente">Fecha Envío Cliente</Label>
                <Input
                  type="date"
                  id="fechaEnvioCliente"
                  value={formData.fechaEnvioCliente}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fechaEnvioCliente: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="referenciaPago">Referencia Pago</Label>
                <Input
                  type="text"
                  id="referenciaPago"
                  value={formData.referenciaPago}
                  onChange={(e) =>
                    setFormData({ ...formData, referenciaPago: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={guardarCambios}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogo global: Captura de Facturación */}
        <Dialog open={showFacturacionModal} onOpenChange={setShowFacturacionModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Captura de Facturación</DialogTitle>
              <DialogDescription>
                Registra hasta 4 folios de factura, fechas y referencia de pago.
              </DialogDescription>
            </DialogHeader>

            {/* Controles de generación aleatoria removidos */}

            <div className="space-y-3">
              <div className="hidden md:grid md:grid-cols-4 gap-2 text-xs text-gray-600">
                <div>Folio</div>
                <div>Fecha envío</div>
                <div>Fecha pago</div>
                <div>Referencia</div>
              </div>

              {/* Rows dinámicas basadas en el array de facturas */}
              {facturacionData.facturas.map((factura, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <div>
                    <Label className="md:hidden" htmlFor={`numeroFactura${index + 1}`}>
                      Número Factura {index + 1}
                    </Label>
                    <Input
                      id={`numeroFactura${index + 1}`}
                      value={factura.numero}
                      onChange={(e) => {
                        const nuevasFacturas = [...facturacionData.facturas];
                        nuevasFacturas[index] = { ...factura, numero: e.target.value };
                        setFacturacionData({
                          ...facturacionData,
                          facturas: nuevasFacturas,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden" htmlFor={`fechaEnvioCliente${index + 1}`}>
                      Fecha envío al cliente
                    </Label>
                    <Input
                      type="date"
                      id={`fechaEnvioCliente${index + 1}`}
                      value={factura.fecha_envio || ""}
                      onChange={(e) => {
                        const nuevasFacturas = [...facturacionData.facturas];
                        nuevasFacturas[index] = { ...factura, fecha_envio: e.target.value };
                        setFacturacionData({
                          ...facturacionData,
                          facturas: nuevasFacturas,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden" htmlFor={`fechaPagoCliente${index + 1}`}>
                      Fecha de pago
                    </Label>
                    <Input
                      type="date"
                      id={`fechaPagoCliente${index + 1}`}
                      value={factura.fecha_pago || ""}
                      onChange={(e) => {
                        const nuevasFacturas = [...facturacionData.facturas];
                        nuevasFacturas[index] = { ...factura, fecha_pago: e.target.value };
                        setFacturacionData({
                          ...facturacionData,
                          facturas: nuevasFacturas,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden" htmlFor={`referenciaPago${index + 1}`}>
                      Referencia de pago
                    </Label>
                    <Input
                      id={`referenciaPago${index + 1}`}
                      value={factura.referencia || ""}
                      onChange={(e) => {
                        const nuevasFacturas = [...facturacionData.facturas];
                        nuevasFacturas[index] = { ...factura, referencia: e.target.value };
                        setFacturacionData({
                          ...facturacionData,
                          facturas: nuevasFacturas,
                        });
                      }}
                    />
                  </div>
                </div>
              ))}




              <div>
                <Label htmlFor="observacionesFacturacion">Observaciones</Label>
                <Textarea
                  id="observacionesFacturacion"
                  value={facturacionData.observacionesFacturacion}
                  onChange={(e) =>
                    setFacturacionData({
                      ...facturacionData,
                      observacionesFacturacion: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFacturacionModal(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={guardarDatosFacturacion} disabled={savingFacturacion} className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                {savingFacturacion ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
