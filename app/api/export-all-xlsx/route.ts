import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSheetName(name: string) {
  // Excel sheet name max 31 chars and no []:*?/\\
  return name.replace(/[\[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet";
}

// Lightweight dd/mm/yyyy formatter (mirrors formatDateMatamoros for YYYY-MM-DD inputs)
function formatDateMX(v: any): string {
  if (!v) return "";
  try {
    const s = String(v);
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    }
    return s;
  } catch {
    return String(v);
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Helper: safe select that never throws, logs and returns [] on error
    const safeSelect = async <T = any>(table: string, select: string) => {
      try {
        const res = await supabase.from(table).select(select);
        if (res.error) {
          console.warn(`export-all-xlsx: select error on ${table}:`, res.error.message);
          return [] as T[];
        }
        return (res.data || []) as T[];
      } catch (e: any) {
        console.warn(`export-all-xlsx: exception selecting ${table}:`, e?.message || e);
        return [] as T[];
      }
    };

    // Preload reference catalogs
  const [tiposServicio, clientesRaw, operadoresRaw] = await Promise.all([
      safeSelect<any>("tipos_servicio", "id, nombre, descripcion, categoria, subcategoria, precio_base, pago_operador"),
      safeSelect<any>("clientes", "id, nombre, rfc, telefono, email, direccion, estado, divisa_pago, empresa_facturadora, forma_facturacion, razon_social, direccion_fiscal"),
      safeSelect<any>("operadores", "id, nombre, apellidos, telefono, email, fecha_nacimiento, direccion, curp, rfc, nss, licencia, fecha_vencimiento_licencia, numero_apto_medico, fecha_vencimiento_apto_medico, numero_visa, fecha_vencimiento_visa, numero_fast, fecha_vencimiento_fast, contactos_emergencia, telefono_emergencia, observaciones, estado, fecha_registro"),
    ]);

    const servicioNombre = new Map<string, string>();
    for (const ts of tiposServicio) servicioNombre.set(ts.id, ts.nombre);

    // Load contactos principales de clientes (si existen)
    const contactosClientes = await safeSelect<any>("contactos_clientes", "id, cliente_id, nombre, puesto, email, telefono, notas, es_principal");
    const contactoPrincipalPorCliente = new Map<string, any>();
    for (const c of contactosClientes) {
      const existing = contactoPrincipalPorCliente.get(c.cliente_id);
      if (!existing || c.es_principal) contactoPrincipalPorCliente.set(c.cliente_id, c);
    }

    // Embarques con relaciones básicas para múltiples reportes
    const embarquesBase = await safeSelect<any>(
      "embarques",
      `*,
       clientes!embarques_cliente_id_fkey(nombre, rfc, razon_social, empresa_facturadora, divisa_pago, forma_facturacion, direccion_fiscal),
       operadores!embarques_operador_id_fkey(nombre, apellidos, telefono),
       camiones!embarques_camion_id_fkey(numero_economico, placas, marca, modelo),
       remolques!embarques_remolque_id_fkey(numero_economico, placas, marca)`
    );

    // Camiones con últimos mantenimientos
    const camiones = await safeSelect<any>("camiones", "id, numero_economico, marca, modelo, año, placas, kilometraje, estado, fecha_registro, updated_at, observaciones");
    const registrosMant = await safeSelect<any>(
      "registros_mantenimiento",
      "camion_id, fecha_mantenimiento"
    );
    const ultimaMantPorCamion = new Map<string, string>();
    for (const reg of registrosMant.sort((a, b) => (new Date(b.fecha_mantenimiento).getTime() - new Date(a.fecha_mantenimiento).getTime()))) {
      if (!ultimaMantPorCamion.has(reg.camion_id)) {
        ultimaMantPorCamion.set(reg.camion_id, reg.fecha_mantenimiento);
      }
    }

  const remolques = await safeSelect<any>(
      "remolques",
      "id, numero_economico, tipo, marca, modelo, año, numero_serie, capacidad, placas, fecha_ultima_inspeccion, proxima_inspeccion, poliza_seguro, vigencia_seguro, estado, comentarios, activo, fecha_registro"
    );

    const creditos = await safeSelect<any>(
      "creditos_clientes",
      "id, cliente_id, limite_credito_usd, limite_credito_mxn, usado_usd, usado_mxn, updated_at"
    );

    const documentosOperadores = await safeSelect<any>(
      "documentos_operadores",
      "id, operador_id, tipo_documento, descripcion, url_archivo, fecha_subida, vigente_hasta, notas"
    );

    // Extras para paridad completa
    const recordatorios = await safeSelect<any>(
      "recordatorios",
      `id, titulo, descripcion, fecha_vencimiento, tipo, prioridad, estado, fecha_creacion, updated_at,
       operadores:operadores(nombre, apellidos),
       camiones:camiones(numero_economico)`
    );
    const archivosOperadores = await safeSelect<any>(
      "archivos_operadores",
      "id, operador_id, pathname, url_blob, nombre_archivo, tamano_bytes, tipo_mime, metadata, fecha_subida, subido_por, activo, created_at"
    );
    const imagenesPerfilOperador = await safeSelect<any>(
      "imagenes_perfil_operador",
      "id, operador_id, pathname, url_blob, activo, created_at"
    );

    // Workbook
    const wb = XLSX.utils.book_new();

    // Sheet: Operadores (lista)
    try {
      const headers = [
        "id","nombre","apellidos","fecha de nacimiento","direccion","telefono","email","curp","rfc","nss","licencia de conducir","vencimiento de lic. de conducir","apto medico","vencimiento apto medico","visa","vencimiento visa","fast","vencimiento fast","contacto de emergencia","telefonos de emergencia","observaciones","estado","fecha de registro",
      ];
      const rows = operadoresRaw.map((op: any) => {
        let contactos = "";
        try {
          const parsed = typeof op.contactos_emergencia === "string" ? JSON.parse(op.contactos_emergencia) : op.contactos_emergencia;
          if (Array.isArray(parsed)) contactos = parsed.map((c: any) => c?.nombre || "").filter(Boolean).join(", ");
          else if (parsed) contactos = String(parsed);
        } catch { contactos = String(op.contactos_emergencia || ""); }
        return [
          op.id, op.nombre || "", op.apellidos || "", op.fecha_nacimiento || "", op.direccion || "", op.telefono || "", op.email || "", op.curp || "", op.rfc || "", op.nss || "", op.licencia || "", op.fecha_vencimiento_licencia || "", op.numero_apto_medico || "", op.fecha_vencimiento_apto_medico || "", op.numero_visa || "", op.fecha_vencimiento_visa || "", op.numero_fast || "", op.fecha_vencimiento_fast || "", contactos, op.telefono_emergencia || "", op.observaciones || "", op.estado || "", op.fecha_registro || "",
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Operadores"));
    } catch (e) { console.warn("Operadores sheet error", e); }

    // Sheet: Camiones (tractocamiones)
    try {
      const headers = [
        "Número Económico","Marca","Modelo","Año","Placas","Kilometraje","Estado","Número de Serie","TAG Mexicano","TAG Americano","Número Base","Póliza Mexicana","Póliza Americana","Vencimiento Seguro Mexicano","Vencimiento Seguro Americano","Último Mantenimiento","Comentarios",
      ];
      const rows = camiones.map((c: any) => {
        // Observaciones pueden contener JSON con campos específicos
        let datos: any = {};
        try { datos = c.observaciones ? JSON.parse(c.observaciones) : {}; } catch { datos = {}; }
        const ultima = ultimaMantPorCamion.get(c.id) || "";
        const ultimaFmt = ultima ? new Date(ultima).toISOString().split('T')[0] : "";
        return [
          c.numero_economico, c.marca || "", c.modelo || "", c.año || "", c.placas || "", c.kilometraje, c.estado, datos.numero_serie || "", datos.tag_mexicano || "", datos.tag_americano || "", datos.numero_base || "", datos.poliza_seguro_mexicano || "", datos.poliza_seguro_americano || "", (datos.fecha_vencimiento_seguro_mexicano || ""), (datos.fecha_vencimiento_seguro_americano || ""), ultimaFmt, datos.comentarios || "",
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Tractocamiones"));
    } catch (e) { console.warn("Camiones sheet error", e); }

    // Sheet: Remolques (lista)
    try {
      const headers = [
        "Número Económico","Tipo","Marca","Modelo","Año","Número de Serie","Capacidad","Placas","Fecha Última Inspección","Próxima Inspección","Póliza Seguro","Vigencia Seguro","Estado","Comentarios","Activo","Fecha Registro",
      ];
      const rows = remolques.map((r: any) => [
        r.numero_economico, r.tipo || "", r.marca || "", r.modelo || "", r.año || "", r.numero_serie || "", r.capacidad || "", r.placas || "", formatDateMX(r.fecha_ultima_inspeccion), formatDateMX(r.proxima_inspeccion), r.poliza_seguro || "", formatDateMX(r.vigencia_seguro), r.estado || "", r.comentarios || "", (r.activo !== false ? "Sí" : "No"), formatDateMX(r.fecha_registro),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Remolques"));
    } catch (e) { console.warn("Remolques sheet error", e); }

    // Sheet: Clientes (reporte con contacto principal)
    try {
      const headers = [
        "Nombre Comercial","RFC","Teléfono","Email","Dirección","Estado","Contacto Principal","Puesto Contacto","Correo Contacto","Teléfono Contacto","Notas Contacto","Divisa Pago Preferida","Empresa Facturadora","Forma Facturación",
      ];
      const rows = clientsToRows(clientesRaw, contactoPrincipalPorCliente);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Clientes"));
    } catch (e) { console.warn("Clientes sheet error", e); }

    // Sheet: Tipos de Servicio
    try {
      const headers = ["Tipo","Descripción","Categoría","Subcategoría","Pago Operador (MXN)"];
      const rows = tiposServicio.map((t) => [t.nombre || "", t.descripcion || "", t.categoria || "General", t.subcategoria || "", (typeof t.pago_operador === 'number' ? t.pago_operador : (typeof t.precio_base === 'number' ? t.precio_base : 0))]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("TiposServicio"));
    } catch (e) { console.warn("TiposServicio sheet error", e); }

    // Sheet: Embarques Activos (no archivados) - columnas como página Embarques
    try {
      const headers = [
        "Folio","Estado","Cliente","Load","Carta Porte","Tipo de Servicio","Dirección Recolecta","Fecha Recolecta","Hora Recolecta","Dirección Entrega","Fecha Entrega","Hora Entrega","Tractocamión","Remolque","Contenido","Peso (kg)","Observaciones","Creado","Actualizado","Patente Agente Aduanal","Aduana Cruce","Cliente del Embarque","Contacto Nombre","Contacto Puesto","Contacto Teléfono","Contacto Email","Empresa Facturadora","Divisa de Pago","Forma de Facturación","RFC","Razón Social","Dirección Fiscal",
      ];
      const rows = embarquesBase.filter((e: any) => e.estado !== 'archivado').map((e: any) => {
        const cli = (e as any).clientes || {};
        const op = (e as any).operadores || {};
        const camion = (e as any).camiones || {};
        const rem = (e as any).remolques || {};
        const contacto: any = (e as any).info_representante || {};
        const remolqueTxt = e.remolque_numero_economico ? `${e.remolque_numero_economico}${e.remolque_placa ? ` | Placas: ${e.remolque_placa}` : ''}` : (
          rem && (rem.numero_economico || rem.marca || rem.placas) ? `${rem.numero_economico || 'Sin económico'} | ${rem.marca || 'Sin marca'} | Placas: ${rem.placas || 'Sin placas'}` : ''
        );
        return [
          e.folio || "", e.estado || "", cli?.nombre || "", e.load_number || "", e.carta_porte || "", (servicioNombre.get(e.tipo_servicio_id) || ""), e.direccion_recolecta || "", e.fecha_recolecta || "", e.hora_recolecta || "", e.direccion_entrega || "", e.fecha_entrega || "", e.hora_entrega || "", camion?.numero_economico || "", remolqueTxt, e.contenido || "", (e as any).peso ?? "", e.observaciones || "", e.fecha_creacion || "", e.updated_at || "", e.patente_agente_aduanal || "", e.aduana_cruce || "", e.dueno_mercancia || "", `${contacto.nombre || ''} ${contacto.apellidos || ''}`.trim(), contacto.puesto || "", contacto.telefono || "", contacto.email || "", (cli as any)?.empresa_facturadora || (cli as any)?.razon_social || cli?.nombre || "", (cli as any)?.divisa_pago || "", (cli as any)?.forma_facturacion || "", (cli as any)?.rfc || "", (cli as any)?.razon_social || cli?.nombre || "", (cli as any)?.direccion_fiscal || "",
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Embarques Activos"));
    } catch (e) { console.warn("Embarques Activos sheet error", e); }

    // Sheet: Embarques Archivados (página Embarques)
    try {
      const headers = ["Folio","Cliente","Load","Estatus","Tipo de Servicio","Fecha Creación"];
      const rows = embarquesBase.filter((e: any) => e.estado === 'archivado' || e.estado_facturacion === 'archivado').map((e: any) => {
        const cli = (e as any).clientes || {};
        const estatus = (e.cancelado_por || e.motivo_cancelacion || e.fecha_cancelacion || ((e.observaciones || '').toUpperCase().includes('[CANCELADO]'))) ? 'Cancelado' : 'Finalizado';
        return [e.folio || '', cli?.nombre || '', e.load_number || '', estatus, (servicioNombre.get(e.tipo_servicio_id) || ''), e.fecha_creacion || ''];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Embarques Archivados"));
    } catch (e) { console.warn("Embarques Archivados sheet error", e); }

    // Sheet: Asignados (Visibles en Asignar Operadores)
  try {
      const headers = [
        "Folio","Estado","Cliente","Load","Tipo de Servicio","Origen","Destino","Fecha Recolecta","Hora Recolecta","Fecha Entrega","Hora Entrega","Operador","Teléfono Operador","Tractocamión","Remolque (No. Económico)","Remolque (Placa)","Precio Flete","Moneda","% QuickPaid","Monto Descuento QuickPaid","Precio QuickPaid","Flete en Falso","Observaciones",
      ];
      const rows = embarquesBase.filter((e: any) => e.estado !== 'archivado').map((e: any) => {
        const cli = (e as any).clientes || {};
        const op = (e as any).operadores || {};
        const camion = (e as any).camiones || {};
        const rem = (e as any).remolques || {};
        const precioFleteVal = Number(e.precio_flete) || 0;
        const descuentoAmt = typeof e.quickpaid_descuento === 'number' ? Number(e.quickpaid_descuento) : 0;
        const percent = (typeof e.quickpaid_percent === 'number' && e.quickpaid_percent > 0) ? e.quickpaid_percent : ((descuentoAmt > 0 && precioFleteVal > 0) ? (descuentoAmt / precioFleteVal) : 0);
        const precioQuick = (typeof e.precio_quickpaid === 'number' && e.precio_quickpaid > 0) ? e.precio_quickpaid : '';
        return [
          e.folio || '', e.estado || '', cli?.nombre || '', e.load_number || '', (servicioNombre.get(e.tipo_servicio_id) || ''), e.direccion_recolecta || e.origen || '', e.direccion_entrega || e.destino || '', e.fecha_recolecta || '', e.hora_recolecta || '', e.fecha_entrega || '', e.hora_entrega || '', `${op?.nombre || ''} ${op?.apellidos || ''}`.trim(), op?.telefono || '', camion?.numero_economico || '', (rem?.numero_economico || e.remolque_numero_economico || ''), (rem?.placas || e.remolque_placa || ''), (e.precio_flete ?? ''), (e.moneda_flete || ''), (percent > 0 ? (percent * 100).toFixed(2) : ''), (descuentoAmt > 0 ? descuentoAmt.toFixed(2) : ''), precioQuick, (e.flete_falso ? 'Sí' : 'No'), (e.observaciones || '').replace(/\s+/g, ' ').trim(),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Asignados Activos"));
    } catch (e) { console.warn("Asignados Activos sheet error", e); }

    // Sheet: Asignados Archivados (Registros Completados en Asignación)
    try {
      const headers = [
        "Folio","Estado","Cliente","Load","Tipo de Servicio","Origen","Destino","Fecha Recolecta","Hora Recolecta","Fecha Entrega","Hora Entrega","Operador","Teléfono Operador","Tractocamión","Remolque (No. Económico)","Remolque (Placa)","Precio Flete","Moneda","% QuickPaid","Monto Descuento QuickPaid","Precio QuickPaid","Flete en Falso","Observaciones",
      ];
      const rows = embarquesBase
        .filter((e: any) => ["finalizado","cancelado","archivado"].includes(e.estado || '') || e.estado_facturacion === 'archivado')
        .filter((e: any) => (String(e.observaciones || '').toUpperCase().includes('[ARCHIVADO-ASIGNACION]')))
        .map((e: any) => {
          const cli = (e as any).clientes || {};
          const op = (e as any).operadores || {};
          const camion = (e as any).camiones || {};
          const rem = (e as any).remolques || {};
          const precioFleteVal = Number(e.precio_flete) || 0;
          const descuentoAmt = typeof e.quickpaid_descuento === 'number' ? Number(e.quickpaid_descuento) : 0;
          const percent = (typeof e.quickpaid_percent === 'number' && e.quickpaid_percent > 0) ? e.quickpaid_percent : ((descuentoAmt > 0 && precioFleteVal > 0) ? (descuentoAmt / precioFleteVal) : 0);
          const precioQuick = (typeof e.precio_quickpaid === 'number' && e.precio_quickpaid > 0) ? e.precio_quickpaid : '';
          return [
            e.folio || '', e.estado || '', cli?.nombre || '', e.load_number || '', (servicioNombre.get(e.tipo_servicio_id) || ''), e.direccion_recolecta || e.origen || '', e.direccion_entrega || e.destino || '', e.fecha_recolecta || '', e.hora_recolecta || '', e.fecha_entrega || '', e.hora_entrega || '', `${op?.nombre || ''} ${op?.apellidos || ''}`.trim(), op?.telefono || '', camion?.numero_economico || '', (rem?.numero_economico || e.remolque_numero_economico || ''), (rem?.placas || e.remolque_placa || ''), (e.precio_flete ?? ''), (e.moneda_flete || ''), (percent > 0 ? (percent * 100).toFixed(2) : ''), (descuentoAmt > 0 ? descuentoAmt.toFixed(2) : ''), precioQuick, (e.flete_falso ? 'Sí' : 'No'), (e.observaciones || '').replace(/\s+/g, ' ').trim(),
          ];
        });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Asignados Archivados"));
    } catch (e) { console.warn("Asignados Archivados sheet error", e); }

    // Sheet: Facturación (No Archivados)
    try {
      const headers = [
        "ID","Cliente","Nombre Operador","Tipo Servicio","Monto Flete","Descuento QuickPaid","Precio QuickPaid","Fecha/Hora Recolección","Tracto","Remolque","Load","Carta Porte","Dirección Entrega","Recolecta Hora","Observaciones","Fecha Asignación","Monto Facturado","Moneda","Pagado","Estado Facturación","Folio Factura 1","Folio Factura 2","Folio Factura 3","Folio Factura 4","Observaciones Facturación",
      ];
  const rows = embarquesBase.filter((e: any) => e.estado_facturacion !== 'archivado' && e.estado !== 'archivado').map((e: any) => facturacionRow(e, servicioNombre));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Facturacion"));
    } catch (e) { console.warn("Facturacion sheet error", e); }

    // Sheet: Facturación (Archivados)
  try {
      const headers = ["Folio","Cliente","Load","Carta Porte","Fecha Pago","Monto Flete","Divisa","Contingencia","Operador","Tractocamión","Remolque","Fecha Creación"];
      const rows = embarquesBase.filter((e: any) => e.estado === 'archivado' || e.estado_facturacion === 'archivado').map((e: any) => {
        const cli = (e as any).clientes || {};
        const op = (e as any).operadores || {};
        const cam = (e as any).camiones || {};
        const rem = (e as any).remolques || {};
        const rawVal = (typeof e.precio_flete === 'number') ? e.precio_flete : (typeof e.precio_quickpaid === 'number' ? e.precio_quickpaid : 0);
        const contingencia = (e.quickpaid_enabled || e.flete_falso) ? 'Sí' : 'No';
        return [
          e.folio || '', cli?.nombre || '', e.load_number || '', e.carta_porte || '', e.fecha_pago || '', (Number.isFinite(rawVal) ? rawVal : 0), (e.moneda_flete || 'MXN'), contingencia, `${op?.nombre || ''} ${op?.apellidos || ''}`.trim(), (cam?.numero_economico || ''), (rem?.numero_economico || e.remolque_numero_economico || ''), (e.fecha_creacion || ''),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Facturacion Archivados"));
    } catch (e) { console.warn("Facturacion Archivados sheet error", e); }

    // Sheet: Créditos de Clientes (ya existía, mantener)
    try {
      const headers = ["cliente_id","limite_usd","limite_mxn","usado_usd","usado_mxn","actualizado"];
      const rows = creditos.map((c: any) => [c.cliente_id, c.limite_credito_usd ?? null, c.limite_credito_mxn ?? null, c.usado_usd ?? null, c.usado_mxn ?? null, c.updated_at ?? null]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("CreditosClientes"));
    } catch (e) { console.warn("Creditos sheet error", e); }

    // Sheet: Documentos de Operadores (archivos)
    try {
      const headers = ["id","operador_id","tipo_documento","descripcion","url_archivo","fecha_subida","vigente_hasta","notas"];
      const rows = documentosOperadores.map((d: any) => [d.id, d.operador_id, d.tipo_documento || '', d.descripcion || '', d.url_archivo || '', d.fecha_subida || '', d.vigente_hasta || '', d.notas || '']);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("DocumentosOperadores"));
    } catch (e) { console.warn("DocumentosOperadores sheet error", e); }

    // Sheet: Archivos de Operadores (metadatos)
    try {
      const headers = ["id","operador_id","pathname","url_blob","nombre_archivo","tamano_bytes","tipo_mime","metadata","fecha_subida","subido_por","activo","created_at"];
      const rows = archivosOperadores.map((a: any) => [a.id, a.operador_id, a.pathname || '', a.url_blob || '', a.nombre_archivo || '', a.tamano_bytes ?? null, a.tipo_mime || '', (a.metadata ? JSON.stringify(a.metadata) : ''), a.fecha_subida || '', a.subido_por || '', (a.activo !== false ? 'Sí' : 'No'), a.created_at || '']);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("ArchivosOperadores"));
    } catch (e) { console.warn("ArchivosOperadores sheet error", e); }

    // Sheet: Imágenes de Perfil de Operador
    try {
      const headers = ["id","operador_id","pathname","url_blob","activo","created_at"];
      const rows = imagenesPerfilOperador.map((i: any) => [i.id, i.operador_id, i.pathname || '', i.url_blob || '', (i.activo !== false ? 'Sí' : 'No'), i.created_at || '']);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("ImagenPerfilOperador"));
    } catch (e) { console.warn("ImagenPerfilOperador sheet error", e); }

    // Sheet: Recordatorios (igual a export de página)
    try {
      const headers = ["Titulo","Descripcion","Fecha_Vencimiento","Tipo","Prioridad","Estado","Operador","Camion","Fecha_Creacion","Actualizado"];
      const rows = recordatorios.map((r: any) => [
        r.titulo || '', r.descripcion || '', r.fecha_vencimiento || '', r.tipo || '', r.prioridad || '', r.estado || '',
        (r.operadores ? `${r.operadores.nombre || ''} ${r.operadores.apellidos || ''}`.trim() : ''),
        (r.camiones ? r.camiones.numero_economico || '' : ''),
        r.fecha_creacion || '', r.updated_at || ''
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Recordatorios"));
    } catch (e) { console.warn("Recordatorios sheet error", e); }

    // Sheet: Resumen Crédito Clientes (igual a export en Facturación/Cobranza)
    try {
      const headers = ["Cliente","Límite USD","Adeudado USD","Límite MXN","Adeudado MXN","Estado Crédito"];
      const creditoPorCliente = new Map<string, { usd: number; mxn: number }>();
      for (const c of creditos) {
        creditoPorCliente.set(c.cliente_id, { usd: Number(c.limite_credito_usd || 0), mxn: Number(c.limite_credito_mxn || 0) });
      }
      const rows = (clientesRaw || []).map((cliente: any) => {
        const embarquesUSD = (embarquesBase || []).filter((e: any) => e.cliente_id === cliente.id && !e.pagado && e.moneda_flete === 'USD');
        const embarquesMXN = (embarquesBase || []).filter((e: any) => e.cliente_id === cliente.id && !e.pagado && (e.moneda_flete === 'MXN' || !e.moneda_flete));
        const adeudadoUSD = embarquesUSD.reduce((sum: number, e: any) => sum + getMontoContable(e), 0);
        const adeudadoMXN = embarquesMXN.reduce((sum: number, e: any) => sum + getMontoContable(e), 0);
        const lim = creditoPorCliente.get(cliente.id) || { usd: 0, mxn: 0 };
        const excedeUSD = adeudadoUSD > lim.usd && lim.usd > 0;
        const excedeMXN = adeudadoMXN > lim.mxn && lim.mxn > 0;
        const estado = (excedeUSD || excedeMXN) ? 'Excedido' : 'Ok';
        return [cliente.nombre || '', lim.usd, adeudadoUSD, lim.mxn, adeudadoMXN, estado];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, toSheetName("Credito Clientes"));
    } catch (e) { console.warn("Credito Clientes resumen sheet error", e); }

    // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `respaldo_excel_${new Date().toISOString().slice(0,10)}.xlsx`;

    return new Response(buf as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("export-all-xlsx error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// Helpers
function clientsToRows(clientes: any[], contactoPrincipalPorCliente: Map<string, any>) {
  return (clientes || []).map((cliente: any) => {
    const contacto = contactoPrincipalPorCliente.get(cliente.id) || { nombre: '', telefono: '', puesto: '', email: '', notas: '' };
    const esc = (v: any) => (v ?? '').toString();
    return [
      esc(cliente.nombre), esc(cliente.rfc || ''), esc(cliente.telefono || ''), esc(cliente.email || ''), esc(cliente.direccion || ''), esc(cliente.estado), esc(contacto.nombre), esc(contacto.puesto || ''), esc(contacto.email || ''), esc(contacto.telefono || ''), esc(contacto.notas || ''), esc(cliente.divisa_pago || ''), esc(cliente.empresa_facturadora || ''), esc(cliente.forma_facturacion || ''),
    ];
  });
}

function facturacionRow(e: any, servicioNombre?: Map<string, string>) {
  const cli = (e as any).clientes || {};
  const op = (e as any).operadores || {};
  const cam = (e as any).camiones || {};
  const rem = (e as any).remolques || {};
  const tipoServicioNombre = (() => {
    const id = e.tipo_servicio_id;
    if (servicioNombre && id) return servicioNombre.get(id) || '';
    return '';
  })();
  const monto = getMontoContable(e) || 0;
  const descuentoQuick = (e.quickpaid_descuento != null ? e.quickpaid_descuento : 0) || 0;
  const precioQuick = (e.precio_quickpaid != null ? e.precio_quickpaid : 0) || 0;
  const recolectaQuick = (e.recoleccion_quickpaid_datetime || e.recolecta_quickpaid || e.recolectaHora || e.hora_recolecta) || '';
  const load = e.load_number || e.load || '';
  const cartaPorte = e.carta_porte || e.cartaPorte || '';
  const direccionEntrega = e.direccion_entrega || e.direccionEntrega || e.direccion || '';
  const recolectaHora = e.recolecta_hora || e.hora_recolecta || e.recolectaHora || '';
  const observaciones = e.observaciones || e.observaciones_entrega || e.observacionesFacturacion || e.observaciones_facturacion || '';
  const fechaAsignacion = e.fechaAsignacion || e.fecha_creacion || e.updated_at || '';
  const folio1 = (e.folio_factura_1 || e.numero_factura_1 || '');
  const folio2 = (e.folio_factura_2 || e.numero_factura_2 || '');
  const folio3 = (e.folio_factura_3 || e.numero_factura_3 || '');
  const folio4 = (e.folio_factura_4 || e.numero_factura_4 || '');
  return [
    e.id,
    cli?.nombre || '',
    `${op?.nombre || ''} ${op?.apellidos || ''}`.trim(),
    tipoServicioNombre,
    monto,
    descuentoQuick,
    precioQuick,
    recolectaQuick,
    cam?.numero_economico || '',
    (rem?.numero_economico || e.remolque_numero_economico || ''),
    load,
    cartaPorte,
    direccionEntrega,
    recolectaHora,
    observaciones,
    fechaAsignacion,
    monto,
    e.moneda_flete || 'MXN',
    e.pagado ? 'Sí' : 'No',
    e.estado_facturacion || '',
    folio1, folio2, folio3, folio4,
    e.observaciones_facturacion || '',
  ];
}

function getMontoContable(e: any): number {
  if (e?.quickpaid_enabled && (typeof e?.precio_quickpaid === 'number' || typeof e?.precio_quickpaid === 'string')) {
    return typeof e.precio_quickpaid === 'number' ? e.precio_quickpaid : (Number(e.precio_quickpaid) || 0);
  }
  if (typeof e?.cantidad_final_facturada === 'number') return e.cantidad_final_facturada;
  if (typeof e?.precio_flete === 'number') return e.precio_flete;
  if (typeof e?.precio_flete === 'string') return Number(e.precio_flete) || 0;
  return 0;
}
