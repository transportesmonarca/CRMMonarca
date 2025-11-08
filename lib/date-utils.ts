export function formatDateMatamoros(fecha: string | Date | null | undefined): string {
  if (!fecha) return "";

  // Si viene como string tipo "2025-09-10", no lo convertimos a Date
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [year, month, day] = fecha.split("-");
    return `${day}-${month}-${year}`;
  }

  try {
    // Si viene como ISO o Date, ajustamos la zona horaria
    const d = new Date(fecha as any);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());

    const formatted = d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Cambiar barras por guiones
    return formatted.replace(/\//g, "-");
  } catch (e) {
    console.error("Error formateando fecha:", fecha, e);
    return String(fecha);
  }
}

// Función auxiliar para limpiar fechas que vengan con hora 00:00:00
export function cleanDateString(fecha: string | null | undefined): string {
  if (!fecha) return "";
  
  if (typeof fecha === "string") {
    // Si ya está en formato dd-mm-yyyy, devolverlo tal cual
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(fecha.trim())) {
      return fecha.trim();
    }
    
    // Si ya está en formato dd/mm/yyyy, convertir a dd-mm-yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha.trim())) {
      return fecha.trim().replace(/\//g, '-');
    }
    
    // Remover la parte de la hora si es 00:00:00 o cualquier hora
    const cleanedDate = fecha.replace(/[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/, "");
    return formatDateMatamoros(cleanedDate);
  }
  
  return formatDateMatamoros(fecha);
}

export function normalizeDate(v?: string | null) {
  if (!v) return null;
  // If already YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // If value is an ISO timestamp that is exactly midnight (with or without Z)
  // treat it as a date-only value to avoid timezone shifts when parsing.
  // Examples matched: 2025-09-10T00:00:00, 2025-09-10T00:00:00.000, 2025-09-10T00:00:00Z
  // Match ISO timestamps that are exactly midnight in local timestamp (with optional fractional seconds
  // and optional timezone designator like Z or +00:00 or -0600). Treat these as date-only to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}[T ]00:00:00(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(v)) {
    return v.slice(0, 10);
  }
  try {
    const dt = new Date(v);
    if (isNaN(+dt)) return null;
    // convert to America/Matamoros local date (YYYY-MM-DD)
    const iso = dt.toLocaleDateString('en-CA', { timeZone: 'America/Matamoros' });
    return iso;
  } catch (e) {
    return null;
  }
}

export const todayLocalISODate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Matamoros' });
