/**
 * Script para insertar 10 registros de prueba para cada entidad:
 * - Clientes
 * - Tractocamiones (Camiones)
 * - Remolques
 * - Operadores
 * 
 * Ejecutar con: node insertar-datos-prueba.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generadores de datos aleatorios
const generarRFC = () => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  let rfc = '';
  // 4 letras
  for (let i = 0; i < 4; i++) rfc += letras[Math.floor(Math.random() * letras.length)];
  // 6 números (fecha)
  for (let i = 0; i < 6; i++) rfc += numeros[Math.floor(Math.random() * numeros.length)];
  // 3 caracteres (homoclave)
  for (let i = 0; i < 3; i++) {
    const chars = letras + numeros;
    rfc += chars[Math.floor(Math.random() * chars.length)];
  }
  return rfc; // Total: 13 caracteres
};

const generarPlaca = () => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  return `${letras[Math.floor(Math.random() * letras.length)]}${letras[Math.floor(Math.random() * letras.length)]}${letras[Math.floor(Math.random() * letras.length)]}-${numeros[Math.floor(Math.random() * numeros.length)]}${numeros[Math.floor(Math.random() * numeros.length)]}${numeros[Math.floor(Math.random() * numeros.length)]}-${numeros[Math.floor(Math.random() * numeros.length)]}`;
};

const generarTelefono = () => {
  const codigo = ['55', '81', '33', '656', '618', '664'];
  return `${codigo[Math.floor(Math.random() * codigo.length)]}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const generarEmail = (nombre, empresa) => {
  const dominio = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'empresa.mx'];
  const nombreLimpio = nombre.toLowerCase().replace(/\s+/g, '.');
  return `${nombreLimpio}@${dominio[Math.floor(Math.random() * dominio.length)]}`;
};

const generarLicencia = () => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  let licencia = '';
  for (let i = 0; i < 2; i++) licencia += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 8; i++) licencia += numeros[Math.floor(Math.random() * numeros.length)];
  return licencia;
};

// Datos para generar registros realistas
const nombresClientes = [
  'Transportes del Norte SA de CV',
  'Logística Express México',
  'Grupo Industrial Monterrey',
  'Comercializadora Nacional',
  'Distribuidora del Pacífico',
  'Alimentos y Bebidas del Centro',
  'Textiles Modernos SA',
  'Manufactura Automotriz del Bajío',
  'Electrónica y Componentes',
  'Construcción y Materiales SA'
];

const ciudades = [
  'Nuevo Laredo, Tamaulipas',
  'Monterrey, Nuevo León',
  'Guadalajara, Jalisco',
  'Ciudad de México, CDMX',
  'Querétaro, Querétaro',
  'León, Guanajuato',
  'Tijuana, Baja California',
  'Puebla, Puebla',
  'Mérida, Yucatán',
  'San Luis Potosí, SLP'
];

const calles = [
  'Av. Revolución',
  'Blvd. Insurgentes',
  'Calle Hidalgo',
  'Paseo de la Reforma',
  'Av. Juárez',
  'Calle Morelos',
  'Blvd. Constitución',
  'Av. Independencia',
  'Calle Allende',
  'Av. Guerrero'
];

const marcasCamiones = ['Kenworth', 'Freightliner', 'Volvo', 'International', 'Peterbilt', 'Mack'];
const modelosCamiones = ['T680', 'Cascadia', 'VNL', '9900i', '579', 'Anthem'];

const tiposRemolque = ['Caja Seca 53"', 'Plataforma', 'Refrigerado', 'Tolva', 'Tanque'];

const nombres = ['Juan', 'Carlos', 'José', 'Luis', 'Miguel', 'Antonio', 'Fernando', 'Ricardo', 'Pedro', 'Roberto'];
const apellidos = ['García', 'Martínez', 'López', 'Hernández', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Torres'];

// Función para insertar clientes
async function insertarClientes() {
  console.log('\n📦 Insertando 10 clientes...');
  const clientes = [];

  for (let i = 0; i < 10; i++) {
    const nombreEmpresa = nombresClientes[i];
    const ciudad = ciudades[i];
    const calle = calles[Math.floor(Math.random() * calles.length)];
    const numero = Math.floor(100 + Math.random() * 9900);
    
    clientes.push({
      nombre: nombreEmpresa,
      rfc: generarRFC(),
      direccion: `${calle} ${numero}, Col. Centro, ${ciudad}, C.P. ${Math.floor(10000 + Math.random() * 89999)}`,
      telefono: generarTelefono(),
      email: generarEmail(nombreEmpresa.split(' ')[0], nombreEmpresa),
      estado: 'activo'
    });
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert(clientes)
    .select();

  if (error) {
    console.error('❌ Error insertando clientes:', error);
    return null;
  }

  console.log(`✅ ${data.length} clientes insertados correctamente`);
  return data;
}

// Función para insertar camiones
async function insertarCamiones() {
  console.log('\n🚛 Insertando 10 tractocamiones...');
  
  // Obtener números económicos existentes
  const { data: existentes } = await supabase
    .from('camiones')
    .select('numero_economico');
  
  const numerosExistentes = new Set(existentes?.map(c => c.numero_economico) || []);
  
  const camiones = [];
  let contador = 1;

  for (let i = 0; i < 10; i++) {
    const marca = marcasCamiones[Math.floor(Math.random() * marcasCamiones.length)];
    const modelo = modelosCamiones[Math.floor(Math.random() * modelosCamiones.length)];
    const año = 2018 + Math.floor(Math.random() * 7); // Entre 2018 y 2024
    
    // Buscar un número económico único
    let numeroEconomico;
    do {
      numeroEconomico = `TRA-${String(contador).padStart(3, '0')}`;
      contador++;
    } while (numerosExistentes.has(numeroEconomico));
    
    numerosExistentes.add(numeroEconomico);
    
    camiones.push({
      numero_economico: numeroEconomico,
      marca: marca,
      modelo: modelo,
      año: año,
      placas: generarPlaca(),
      kilometraje: Math.floor(50000 + Math.random() * 450000),
      estado: 'disponible'
    });
  }

  const { data, error } = await supabase
    .from('camiones')
    .insert(camiones)
    .select();

  if (error) {
    console.error('❌ Error insertando camiones:', error);
    return null;
  }

  console.log(`✅ ${data.length} tractocamiones insertados correctamente`);
  return data;
}

// Función para insertar remolques
async function insertarRemolques() {
  console.log('\n🚚 Insertando 10 remolques...');
  
  // Obtener números económicos existentes
  const { data: existentes } = await supabase
    .from('remolques')
    .select('numero_economico');
  
  const numerosExistentes = new Set(existentes?.map(r => r.numero_economico) || []);
  
  const remolques = [];
  let contador = 1;

  for (let i = 0; i < 10; i++) {
    const tipo = tiposRemolque[Math.floor(Math.random() * tiposRemolque.length)];
    
    // Buscar un número económico único
    let numeroEconomico;
    do {
      numeroEconomico = `REM-${String(contador).padStart(3, '0')}`;
      contador++;
    } while (numerosExistentes.has(numeroEconomico));
    
    numerosExistentes.add(numeroEconomico);
    
    remolques.push({
      numero_economico: numeroEconomico,
      tipo: tipo,
      capacidad: tipo.includes('53') ? 53 : Math.floor(20 + Math.random() * 33),
      placas: generarPlaca(),
      estado: 'disponible',
      ubicacion: ciudades[Math.floor(Math.random() * ciudades.length)]
    });
  }

  const { data, error } = await supabase
    .from('remolques')
    .insert(remolques)
    .select();

  if (error) {
    console.error('❌ Error insertando remolques:', error);
    return null;
  }

  console.log(`✅ ${data.length} remolques insertados correctamente`);
  return data;
}

// Función para insertar operadores
async function insertarOperadores() {
  console.log('\n👨‍✈️ Insertando 10 operadores...');
  const operadores = [];

  for (let i = 0; i < 10; i++) {
    const nombre = nombres[i];
    const apellido = apellidos[i];
    const apellido2 = apellidos[(i + 3) % apellidos.length];
    const fechaVencimiento = new Date();
    fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + Math.floor(1 + Math.random() * 4));
    
    operadores.push({
      nombre: nombre,
      apellidos: `${apellido} ${apellido2}`,
      telefono: generarTelefono(),
      email: generarEmail(`${nombre}.${apellido}`, 'operador'),
      licencia: generarLicencia(),
      fecha_vencimiento_licencia: fechaVencimiento.toISOString().split('T')[0],
      estado: 'activo'
    });
  }

  const { data, error } = await supabase
    .from('operadores')
    .insert(operadores)
    .select();

  if (error) {
    console.error('❌ Error insertando operadores:', error);
    return null;
  }

  console.log(`✅ ${data.length} operadores insertados correctamente`);
  return data;
}

// Función principal
async function main() {
  console.log('🚀 Iniciando inserción de datos de prueba...\n');
  console.log('=' .repeat(50));

  try {
    const clientes = await insertarClientes();
    const camiones = await insertarCamiones();
    const remolques = await insertarRemolques();
    const operadores = await insertarOperadores();

    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Proceso completado exitosamente\n');
    console.log('Resumen:');
    console.log(`  • Clientes: ${clientes?.length || 0}`);
    console.log(`  • Tractocamiones: ${camiones?.length || 0}`);
    console.log(`  • Remolques: ${remolques?.length || 0}`);
    console.log(`  • Operadores: ${operadores?.length || 0}`);
    console.log('\n📝 Ahora puedes usar estos registros en el modal de nuevo embarque');
    
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();
