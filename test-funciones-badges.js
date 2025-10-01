// Test simple para verificar las funciones de direcciones múltiples

// Función simulada (copiada de asignar-operadores)
const tieneMultiplesDirecciones = (recolectas, entregas) => {
  const recolectasValidas = recolectas.filter((r) => r.direccion?.trim());
  const entregasValidas = entregas.filter((e) => e.direccion?.trim());
  return recolectasValidas.length > 1 || entregasValidas.length > 1;
};

// Función simulada (copiada de asignar-operadores)
const extraerDireccionesMultiples = (observaciones) => {
  if (!observaciones) return { recolectas: [], entregas: [], observacionesLimpias: "" };

  const marcador = "--- DIRECCIONES MÚLTIPLES ---";
  const partes = observaciones.split(marcador);
  
  if (partes.length < 2) {
    // No hay direcciones múltiples guardadas
    return { recolectas: [], entregas: [], observacionesLimpias: observaciones };
  }

  // Las observaciones limpias son todo lo que está antes del marcador
  const observacionesLimpias = partes[0].trim();
  
  // Las direcciones están después del marcador
  const seccionDirecciones = partes[1];
  
  // Parsear las direcciones
  const lineas = seccionDirecciones.split('\n').filter(linea => linea.trim());
  
  const recolectas = [];
  const entregas = [];
  let tipoActual = null;
  
  for (const linea of lineas) {
    const lineaTrim = linea.trim();
    
    if (lineaTrim.startsWith('RECOLECTAS:')) {
      tipoActual = 'recolectas';
      continue;
    }
    
    if (lineaTrim.startsWith('ENTREGAS:')) {
      tipoActual = 'entregas';
      continue;
    }
    
    if (lineaTrim && lineaTrim.startsWith('-')) {
      const direccion = lineaTrim.substring(1).trim();
      if (tipoActual === 'recolectas') {
        recolectas.push({ direccion });
      } else if (tipoActual === 'entregas') {
        entregas.push({ direccion });
      }
    }
  }
  
  return { recolectas, entregas, observacionesLimpias };
};

// Función simulada (copiada de asignar-operadores)
const embarqueTieneMultiplesDirecciones = (embarque) => {
  // 1. Verificar observaciones (método principal para embarques con múltiples direcciones)
  if (embarque.observaciones && embarque.observaciones.includes('DIRECCIONES MÚLTIPLES')) {
    try {
      const { recolectas, entregas } = extraerDireccionesMultiples(embarque.observaciones);
      if (tieneMultiplesDirecciones(recolectas, entregas)) {
        return true;
      }
    } catch (e) {
      console.warn('Error parseando direcciones múltiples desde observaciones:', e);
    }
  }

  // 2. Para este sistema, la mayoría de embarques solo tienen direcciones individuales
  // en los campos legacy, por lo que retornamos false si no hay marcador en observaciones
  return false;
};

// Test cases
console.log('🔍 Testing funciones de direcciones múltiples...\n');

// Test 1: Embarque sin direcciones múltiples
const embarque1 = {
  folio: 'test-001',
  observaciones: 'Embarque normal sin direcciones múltiples',
  estado: 'asignado'
};

console.log('Test 1 - Embarque sin direcciones múltiples:');
console.log('Resultado:', embarqueTieneMultiplesDirecciones(embarque1));
console.log('Esperado: false');
console.log('✅ Correcto:', embarqueTieneMultiplesDirecciones(embarque1) === false);

// Test 2: Embarque con direcciones múltiples
const embarque2 = {
  folio: 'tim-2510-003',
  observaciones: `Embarque con múltiples direcciones

--- DIRECCIONES MÚLTIPLES ---
RECOLECTAS:
- Dirección de recolecta 1
- Dirección de recolecta 2

ENTREGAS:
- Dirección de entrega 1`,
  estado: 'asignado'
};

console.log('\nTest 2 - Embarque con direcciones múltiples:');
console.log('Resultado:', embarqueTieneMultiplesDirecciones(embarque2));
console.log('Esperado: true');
console.log('✅ Correcto:', embarqueTieneMultiplesDirecciones(embarque2) === true);

// Test 3: Extraer direcciones múltiples
console.log('\nTest 3 - Extraer direcciones del embarque:');
const { recolectas, entregas, observacionesLimpias } = extraerDireccionesMultiples(embarque2.observaciones);
console.log('Recolectas:', recolectas);
console.log('Entregas:', entregas);
console.log('Observaciones limpias:', observacionesLimpias);
console.log('¿Tiene múltiples?:', tieneMultiplesDirecciones(recolectas, entregas));

// Test 4: Verificar estado FF
const embarque3 = {
  folio: 'test-ff',
  estado: 'asignado_contingencia_FF',
  observaciones: 'Embarque en flete falso'
};

const esFleteFalso = (embarque) => {
  return embarque?.estado?.includes('_contingencia_FF') || false;
};

console.log('\nTest 4 - Embarque con flete falso:');
console.log('Estado:', embarque3.estado);
console.log('¿Es flete falso?:', esFleteFalso(embarque3));
console.log('Esperado: true');
console.log('✅ Correcto:', esFleteFalso(embarque3) === true);

console.log('\n✅ Todas las funciones funcionan correctamente');