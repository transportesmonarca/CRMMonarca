import * as XLSX from "xlsx";
import { Operador } from "@/lib/supabase";

export function exportOperadoresToExcel(operadores: Operador[]) {
  // Definir cabeceras en el orden solicitado
  const headers = [
    "id",
    "nombre",
    "apellidos",
    "fecha de nacimiento",
    "direccion",
    "telefono",
    "email",
    "curp",
    "rfc",
    "nss",
    "licencia de conducir",
    "vencimiento de lic. de conducir",
    "apto medico",
    "vencimiento apto medico",
    "visa",
    "vencimiento visa",
    "fast",
    "vencimiento fast",
    "contacto de emergencia",
    "telefonos de emergencia",
    "observaciones",
    "estado",
    "fecha de registro",
  ];

  // Construir filas en el mismo orden
  const rows = operadores.map((op) => {
    // Normalizar contactos de emergencia a una cadena legible (nombres)
    let contactos = "";
    try {
      if (op.contactos_emergencia) {
        const parsed = typeof op.contactos_emergencia === "string" ? JSON.parse(op.contactos_emergencia) : op.contactos_emergencia;
        if (Array.isArray(parsed)) {
          contactos = parsed.map((c: any) => c.nombre || "").filter(Boolean).join(", ");
        } else if (typeof parsed === "string") {
          contactos = parsed;
        }
      }
    } catch (e) {
      contactos = String(op.contactos_emergencia || "");
    }

    const telefonosEmergencia = op.telefono_emergencia || "";

    return [
      op.id,
      op.nombre || "",
      op.apellidos || "",
      op.fecha_nacimiento || "",
      op.direccion || "",
      op.telefono || "",
      op.email || "",
      op.curp || "",
      op.rfc || "",
      op.nss || "",
      op.licencia || "",
      op.fecha_vencimiento_licencia || "",
      op.numero_apto_medico || "",
      op.fecha_vencimiento_apto_medico || "",
      op.numero_visa || "",
      op.fecha_vencimiento_visa || "",
      op.numero_fast || "",
      op.fecha_vencimiento_fast || "",
      contactos,
      telefonosEmergencia,
      op.observaciones || "",
      op.estado || "",
      op.fecha_registro || "",
    ];
  });

  // Crear hoja con encabezado y filas
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Operadores");
  XLSX.writeFile(wb, "operadores.xlsx");
}

// Exportar un solo operador con el mismo orden de columnas que el reporte general
export function exportOperadorDetalleToExcel(op: Operador) {
  // Nueva estructura: la hoja principal tendrá los encabezados del operador
  // con "id" como primera columna (A). Los contactos se colocarán más abajo:
  // la fila 6 contendrá los encabezados de contacto (A6,B6,C6) y la fila 7
  // las filas de datos de contactos (A7,B7,C7, ...).
  const headers = [
    // columnas principales del operador (id primero)
    "id",
    "nombre",
    "apellidos",
    "fecha de nacimiento",
    "direccion",
    "telefono",
    "email",
    "curp",
    "rfc",
    "nss",
    "licencia de conducir",
    "vencimiento de lic. de conducir",
    "apto medico",
    "vencimiento apto medico",
    "visa",
    "vencimiento visa",
    "fast",
    "vencimiento fast",
    // campos adicionales al final
    "contacto de emergencia",
    "telefonos de emergencia",
    "contactos_emergencia_detalle",
    "observaciones",
    "estado",
    "fecha de registro",
  ];

  // Normalizar contactos de emergencia a: 1) lista corta de nombres; 2) detalle expandido
  let contactos = "";
  let contactosDetalle = "";
  let contactosArray: any[] = [];
  try {
    if (op.contactos_emergencia) {
      const parsed = typeof op.contactos_emergencia === "string" ? JSON.parse(op.contactos_emergencia) : op.contactos_emergencia;
      if (Array.isArray(parsed)) {
        contactosArray = parsed;
        contactos = parsed.map((c: any) => c?.nombre || "").filter(Boolean).join(", ");
        // detalle: cada contacto como Nombre|Relación|Dirección|Teléfono|Correo, separado por ' || '
        contactosDetalle = parsed.map((c: any) => {
          const nombre = (c?.nombre || '').toString().replace(/\n/g, ' ');
          const relacion = (c?.relacion || '').toString().replace(/\n/g, ' ');
          const direccion = (c?.direccion || '').toString().replace(/\n/g, ' ');
          const telefono = (c?.telefono || '').toString().replace(/\n/g, ' ');
          const correo = (c?.correo || c?.email || '').toString().replace(/\n/g, ' ');
          return `${nombre}|${relacion}|${direccion}|${telefono}|${correo}`;
        }).filter(Boolean).join(' || ');
      } else if (typeof parsed === "string") {
        contactos = parsed;
        contactosDetalle = parsed;
      }
    }
  } catch (e) {
    contactos = String(op.contactos_emergencia || "");
    contactosDetalle = contactos;
    contactosArray = [];
  }

  const telefonosEmergencia = (op as any).telefono_emergencia || "";

  // fila principal del operador: alineada con el array `headers` (id como primera columna)
  const row = [
    op.id,
    op.nombre || "",
    op.apellidos || "",
    op.fecha_nacimiento || "",
    op.direccion || "",
    op.telefono || "",
    op.email || "",
    op.curp || "",
    op.rfc || "",
    op.nss || "",
    op.licencia || "",
    op.fecha_vencimiento_licencia || "",
    op.numero_apto_medico || "",
    op.fecha_vencimiento_apto_medico || "",
    op.numero_visa || "",
    op.fecha_vencimiento_visa || "",
    op.numero_fast || "",
    op.fecha_vencimiento_fast || "",
    contactos,
    telefonosEmergencia,
    contactosDetalle,
    (op.observaciones as any) || "",
    op.estado || "",
    (op as any).fecha_registro || "",
  ];

  // Si hay varios contactos, añadir una fila por cada contacto, pero dejando 3 filas en blanco entre la fila del operador y los contactos
  const contactRowsForMainSheet: any[] = [];
  if (Array.isArray(contactosArray) && contactosArray.length > 0) {
    for (const c of contactosArray) {
      const r = new Array(headers.length).fill("");
      // queremos que los datos de contacto queden en las 3 primeras columnas (A,B,C)
      r[0] = (c?.nombre || "").toString();
      r[1] = (c?.relacion || "").toString();
      r[2] = (c?.telefono || "").toString();
      contactRowsForMainSheet.push(r);
    }
  }

  // Construir el AOA de la hoja principal.
  //  - fila 0: encabezados principales (`headers`)
  //  - fila 1: datos del operador (`row`)
  //  - filas 2..4: filas vacías para dejar espacio
  //  - fila 5 (Excel fila 6): encabezado de contactos (A6,B6,C6)
  //  - fila 6..: datos de contactos (A7,B7,C7...)
  const emptyRow = new Array(headers.length).fill("");
  const aoa: any[] = [];
  aoa.push(headers);
  aoa.push(row);
  // llenar hasta tener la posición 5 disponible para el encabezado de contactos
  while (aoa.length < 5) {
    aoa.push([...emptyRow]);
  }
  // encabezado de contactos en fila 6 (índice 5)
  const contactHeaderRow = new Array(headers.length).fill("");
  contactHeaderRow[0] = 'contacto_nombre';
  contactHeaderRow[1] = 'contacto_relacion';
  contactHeaderRow[2] = 'contacto_telefono';
  aoa.push(contactHeaderRow);
  // añadir las filas de contacto empezando en la fila 7 (índice 6)
  aoa.push(...contactRowsForMainSheet);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Ajustar anchos de columna (un poco más amplios para evitar celdas muy justas)
  const colWidths = [
    { wch: 30 }, // contacto_nombre
    { wch: 20 }, // contacto_relacion
    { wch: 18 }, // contacto_telefono
    { wch: 6 },  // sep_1
    { wch: 6 },  // sep_2
    { wch: 6 },  // sep_3
    { wch: 6 },  // sep_4
    { wch: 12 }, // id
    { wch: 25 }, // nombre
    { wch: 25 }, // apellidos
    { wch: 15 }, // fecha nacimiento
    { wch: 50 }, // direccion
    { wch: 18 }, // telefono
    { wch: 30 }, // email
    { wch: 18 }, // curp
    { wch: 18 }, // rfc
    { wch: 18 }, // nss
    { wch: 22 }, // licencia
    { wch: 18 }, // vencimiento licencia
    { wch: 18 }, // apto medico
    { wch: 18 }, // vencimiento apto medico
    { wch: 18 }, // visa
    { wch: 18 }, // vencimiento visa
    { wch: 18 }, // fast
    { wch: 18 }, // vencimiento fast
    { wch: 30 }, // contacto de emergencia (nombres concatenados)
    { wch: 18 }, // telefonos emergencia
    { wch: 80 }, // contactos_emergencia_detalle (muy ancho)
    { wch: 60 }, // observaciones
    { wch: 12 }, // estado
    { wch: 22 }, // fecha de registro
  ];
  ws['!cols'] = colWidths;
  // Mejoras de presentación: encabezados en negrita con fondo claro, freeze en la primera fila y autofiltro
  try {
    const headerRow = 0;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      if (!ws[addr]) continue;
      // aplicar estilo básico al encabezado (si la versión de SheetJS lo soporta)
      try {
        ws[addr].s = ws[addr].s || {};
        ws[addr].s.font = { bold: true, sz: 12 };
        ws[addr].s.fill = { fgColor: { rgb: "FFF3F4F6" } };
        ws[addr].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
      } catch (e) {
        // no crítico si la librería no soporta estilos
      }
    }

    // freeze primera fila
    (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };

    // habilitar autofiltro para la fila de encabezado
    try {
      ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) } as any;
    } catch (e) {}

    // Formatear columnas de fecha: convertir cadenas ISO a objeto Date y aplicar formato dd/mm/yyyy
    const dateCols = [
      headers.indexOf("fecha de nacimiento"),
      headers.indexOf("vencimiento de lic. de conducir"),
      headers.indexOf("vencimiento apto medico") >= 0 ? headers.indexOf("vencimiento apto medico") : headers.indexOf("vencimiento apto medico"),
      headers.indexOf("vencimiento visa"),
      headers.indexOf("vencimiento fast"),
      headers.indexOf("fecha de registro"),
    ].filter((i) => i >= 0);

    // Recorrer filas a partir de la fila 1 (datos)
    const range = XLSX.utils.decode_range(ws['!ref'] || XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } }));
    for (let R = 1; R <= range.e.r; ++R) {
      for (const c of dateCols) {
        try {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c });
          const cell = ws[cellAddr];
          if (!cell || cell.v == null) continue;
          // intentar parsear como fecha ISO
          const val = cell.v;
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            cell.v = d;
            cell.t = 'd' as any;
            cell.z = 'dd/mm/yyyy';
          }
        } catch (e) {
          // ignora errores de parseo
        }
      }
    }
  } catch (e) {
    // no crítico
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Operador");

  // Crear hoja separada con contactos de emergencia (una fila por contacto)
  try {
    const contactosSheetHeaders = ["operador_id", "operador_nombre", "contacto_nombre", "relacion", "direccion", "telefono", "correo"];
    const contactosParsed = op.contactos_emergencia ? (typeof op.contactos_emergencia === 'string' ? JSON.parse(op.contactos_emergencia) : op.contactos_emergencia) : [];
    const contactosRows: any[] = [];
    if (Array.isArray(contactosParsed) && contactosParsed.length > 0) {
      for (const c of contactosParsed) {
        contactosRows.push([
          op.id || "",
          `${op.nombre || ""} ${op.apellidos || ""}`.trim(),
          (c?.nombre || "").toString(),
          (c?.relacion || "").toString(),
          (c?.direccion || "").toString(),
          (c?.telefono || "").toString(),
          (c?.correo || c?.email || "").toString(),
        ]);
      }
    }

    const contactosAoa = [contactosSheetHeaders, ...contactosRows];
    const wsContacts = XLSX.utils.aoa_to_sheet(contactosAoa);
    wsContacts['!cols'] = [
      { wch: 20 }, // operador_id
      { wch: 30 }, // operador_nombre
      { wch: 30 }, // contacto_nombre
      { wch: 18 }, // relacion
      { wch: 50 }, // direccion
      { wch: 18 }, // telefono
      { wch: 30 }, // correo
    ];
    // aplicar estilo sencillo al encabezado de contactos
    try {
      for (let c = 0; c < wsContacts['!cols'].length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (!wsContacts[addr]) continue;
        try {
          wsContacts[addr].s = wsContacts[addr].s || {};
          wsContacts[addr].s.font = { bold: true, sz: 12 };
          wsContacts[addr].s.fill = { fgColor: { rgb: 'FFF3F4F6' } };
          wsContacts[addr].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        } catch (e) {}
      }
      (wsContacts as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
    } catch (e) {}
    XLSX.utils.book_append_sheet(wb, wsContacts, 'Contactos Emergencia');
  } catch (e) {
    // si falla el parse, no evitar la descarga del archivo principal
    console.warn('No se pudieron generar los contactos en hoja separada:', e);
  }

  XLSX.writeFile(wb, `operador_${op.id}.xlsx`);
}
