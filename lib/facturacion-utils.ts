// Utilidades para manejar la estructura JSON de facturación
// Similar al patrón usado para direcciones múltiples

import { FacturaData } from './supabase';

/**
 * Convierte datos legacy de facturación a formato JSON
 * Nota: Después de la migración, solo se usa para datos de foliosFactura
 */
export function convertirFacturacionLegacyAJson(embarque: any): FacturaData[] {
  const facturas: FacturaData[] = [];
  
  // Intentar obtener de foliosFactura (estructura legacy del frontend)
  if (embarque.foliosFactura) {
    const folios = ['folio1', 'folio2', 'folio3', 'folio4'];
    folios.forEach((folio, index) => {
      const numero = embarque.foliosFactura[folio] || "";
      if (numero.trim()) {
        facturas.push({
          numero: numero.trim(),
          fecha_envio: index === 0 ? embarque.fecha_envio_cliente || null : null,
          fecha_pago: index === 0 ? embarque.fecha_pago || null : null,
          referencia: index === 0 ? embarque.referencia_pago || null : null,
        });
      }
    });
  }
  
  // Fallback para campos individuales si aún existen
  const numeroDirecto = embarque.numero_factura_1 || "";
  if (numeroDirecto.trim() && facturas.length === 0) {
    facturas.push({
      numero: numeroDirecto.trim(),
      fecha_envio: embarque.fecha_envio_cliente || null,
      fecha_pago: embarque.fecha_pago || null,
      referencia: embarque.referencia_pago || null,
    });
  }
  
  return facturas;
}

/**
 * Convierte formato JSON a estructura foliosFactura para compatibilidad del frontend
 */
export function convertirFacturacionJsonALegacy(facturas: FacturaData[]) {
  const legacy: any = {
    foliosFactura: {
      folio1: "",
      folio2: "",
      folio3: "",
      folio4: "",
    }
  };
  
  // Rellenar foliosFactura con datos del JSON
  facturas.forEach((factura, index) => {
    if (index < 4) {
      const folioKey = `folio${index + 1}` as keyof typeof legacy.foliosFactura;
      legacy.foliosFactura[folioKey] = factura.numero || "";
    }
  });
  
  // Campos principales (compatibilidad)
  const primera = facturas[0];
  if (primera) {
    legacy.fecha_envio_cliente = primera.fecha_envio;
    legacy.fecha_pago = primera.fecha_pago;
    legacy.referencia_pago = primera.referencia;
  }
  
  return legacy;
}

/**
 * Obtiene todas las facturas de un embarque (JSON + legacy)
 */
export function obtenerFacturasEmbarque(embarque: any): FacturaData[] {
  // Priorizar JSON si existe
  if (embarque.facturas_json && Array.isArray(embarque.facturas_json) && embarque.facturas_json.length > 0) {
    return embarque.facturas_json;
  }
  
  // Fallback a datos legacy
  return convertirFacturacionLegacyAJson(embarque);
}

/**
 * Valida estructura de factura
 */
export function validarFactura(factura: Partial<FacturaData>): boolean {
  return !!(factura.numero && factura.numero.trim());
}

/**
 * Limpia facturas vacías del array
 */
export function limpiarFacturasVacias(facturas: FacturaData[]): FacturaData[] {
  return facturas.filter(validarFactura);
}

/**
 * Normaliza formato de fecha
 */
export function normalizarFechaFactura(fecha: string | null | undefined): string | null {
  if (!fecha || fecha.trim() === "") return null;
  
  // Ya está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }
  
  // Intentar parsear otros formatos
  const parsed = new Date(fecha);
  if (isNaN(parsed.getTime())) return null;
  
  return parsed.toISOString().split('T')[0];
}

/**
 * Crear array inicial para formulario
 */
export function crearFacturasIniciales(): FacturaData[] {
  return Array.from({ length: 4 }, () => ({
    numero: "",
    fecha_envio: "",
    fecha_pago: "",
    referencia: ""
  }));
}

/**
 * Buscar embarque por número de factura en array JSON
 */
export function buscarPorNumeroFactura(embarques: any[], numeroFactura: string): any[] {
  const numero = numeroFactura.trim().toLowerCase();
  if (!numero) return [];
  
  return embarques.filter(embarque => {
    const facturas = obtenerFacturasEmbarque(embarque);
    return facturas.some(f => 
      f.numero && f.numero.toLowerCase().includes(numero)
    );
  });
}

/**
 * Estadísticas de facturas por embarque
 */
export function obtenerEstadisticasFacturacion(embarques: any[]) {
  let totalEmbarques = 0;
  let embarquesConFacturas = 0;
  let totalFacturas = 0;
  let facturasConFechaEnvio = 0;
  let facturasConFechaPago = 0;
  
  embarques.forEach(embarque => {
    totalEmbarques++;
    const facturas = obtenerFacturasEmbarque(embarque);
    
    if (facturas.length > 0) {
      embarquesConFacturas++;
      totalFacturas += facturas.length;
      
      facturas.forEach(f => {
        if (f.fecha_envio) facturasConFechaEnvio++;
        if (f.fecha_pago) facturasConFechaPago++;
      });
    }
  });
  
  return {
    totalEmbarques,
    embarquesConFacturas,
    embarquesSinFacturas: totalEmbarques - embarquesConFacturas,
    totalFacturas,
    facturasConFechaEnvio,
    facturasConFechaPago,
    porcentajeConFacturas: totalEmbarques > 0 ? (embarquesConFacturas / totalEmbarques) * 100 : 0,
    promedioFacturasPorEmbarque: embarquesConFacturas > 0 ? totalFacturas / embarquesConFacturas : 0
  };
}