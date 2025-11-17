/**
 * Script para ELIMINAR los registros de prueba insertados
 * 
 * ⚠️ ADVERTENCIA: Este script eliminará registros de la base de datos.
 * Solo elimina registros que coincidan con los patrones de datos de prueba.
 * 
 * Ejecutar con: node eliminar-datos-prueba.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para confirmar acción
const confirmar = (pregunta) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si');
    });
  });
};

// Función para eliminar clientes de prueba
async function eliminarClientesPrueba() {
  console.log('\n🔍 Buscando clientes de prueba...');
  
  // Buscar clientes que coincidan con los nombres de prueba
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

  const { data: clientesEncontrados, error: errorBuscar } = await supabase
    .from('clientes')
    .select('id, nombre, rfc, created_at')
    .in('nombre', nombresClientes);

  if (errorBuscar) {
    console.error('❌ Error buscando clientes:', errorBuscar);
    return 0;
  }

  if (!clientesEncontrados || clientesEncontrados.length === 0) {
    console.log('✅ No se encontraron clientes de prueba para eliminar');
    return 0;
  }

  console.log(`\n📋 Encontrados ${clientesEncontrados.length} clientes:`);
  clientesEncontrados.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.nombre} (${c.rfc}) - Creado: ${new Date(c.created_at).toLocaleString()}`);
  });

  const confirmarClientes = await confirmar('\n❓ ¿Deseas eliminar estos clientes? (s/n): ');
  
  if (!confirmarClientes) {
    console.log('⏭️  Clientes no eliminados');
    return 0;
  }

  const idsClientes = clientesEncontrados.map(c => c.id);
  
  const { error: errorEliminar } = await supabase
    .from('clientes')
    .delete()
    .in('id', idsClientes);

  if (errorEliminar) {
    console.error('❌ Error eliminando clientes:', errorEliminar);
    return 0;
  }

  console.log(`✅ ${clientesEncontrados.length} clientes eliminados correctamente`);
  return clientesEncontrados.length;
}

// Función para eliminar camiones de prueba
async function eliminarCamionesPrueba() {
  console.log('\n🔍 Buscando camiones de prueba...');
  
  // Buscar camiones con patrón TRA-XXX
  const { data: camionesEncontrados, error: errorBuscar } = await supabase
    .from('camiones')
    .select('id, numero_economico, marca, modelo, created_at')
    .like('numero_economico', 'TRA-%');

  if (errorBuscar) {
    console.error('❌ Error buscando camiones:', errorBuscar);
    return 0;
  }

  if (!camionesEncontrados || camionesEncontrados.length === 0) {
    console.log('✅ No se encontraron camiones de prueba para eliminar');
    return 0;
  }

  console.log(`\n📋 Encontrados ${camionesEncontrados.length} camiones:`);
  camionesEncontrados.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.numero_economico} - ${c.marca} ${c.modelo} - Creado: ${new Date(c.created_at).toLocaleString()}`);
  });

  const confirmarCamiones = await confirmar('\n❓ ¿Deseas eliminar estos camiones? (s/n): ');
  
  if (!confirmarCamiones) {
    console.log('⏭️  Camiones no eliminados');
    return 0;
  }

  const idsCamiones = camionesEncontrados.map(c => c.id);
  
  const { error: errorEliminar } = await supabase
    .from('camiones')
    .delete()
    .in('id', idsCamiones);

  if (errorEliminar) {
    console.error('❌ Error eliminando camiones:', errorEliminar);
    return 0;
  }

  console.log(`✅ ${camionesEncontrados.length} camiones eliminados correctamente`);
  return camionesEncontrados.length;
}

// Función para eliminar remolques de prueba
async function eliminarRemolquesPrueba() {
  console.log('\n🔍 Buscando remolques de prueba...');
  
  // Buscar remolques con patrón REM-XXX
  const { data: remolquesEncontrados, error: errorBuscar } = await supabase
    .from('remolques')
    .select('id, numero_economico, tipo, created_at')
    .like('numero_economico', 'REM-%');

  if (errorBuscar) {
    console.error('❌ Error buscando remolques:', errorBuscar);
    return 0;
  }

  if (!remolquesEncontrados || remolquesEncontrados.length === 0) {
    console.log('✅ No se encontraron remolques de prueba para eliminar');
    return 0;
  }

  console.log(`\n📋 Encontrados ${remolquesEncontrados.length} remolques:`);
  remolquesEncontrados.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.numero_economico} - ${r.tipo} - Creado: ${new Date(r.created_at).toLocaleString()}`);
  });

  const confirmarRemolques = await confirmar('\n❓ ¿Deseas eliminar estos remolques? (s/n): ');
  
  if (!confirmarRemolques) {
    console.log('⏭️  Remolques no eliminados');
    return 0;
  }

  const idsRemolques = remolquesEncontrados.map(r => r.id);
  
  const { error: errorEliminar } = await supabase
    .from('remolques')
    .delete()
    .in('id', idsRemolques);

  if (errorEliminar) {
    console.error('❌ Error eliminando remolques:', errorEliminar);
    return 0;
  }

  console.log(`✅ ${remolquesEncontrados.length} remolques eliminados correctamente`);
  return remolquesEncontrados.length;
}

// Función para eliminar operadores de prueba
async function eliminarOperadoresPrueba() {
  console.log('\n🔍 Buscando operadores de prueba...');
  
  // Lista de nombres de operadores de prueba
  const nombresOperadores = [
    'Juan', 'Carlos', 'José', 'Luis', 'Miguel', 
    'Antonio', 'Fernando', 'Ricardo', 'Pedro', 'Roberto'
  ];

  const { data: operadoresEncontrados, error: errorBuscar } = await supabase
    .from('operadores')
    .select('id, nombre, apellidos, licencia, created_at')
    .in('nombre', nombresOperadores);

  if (errorBuscar) {
    console.error('❌ Error buscando operadores:', errorBuscar);
    return 0;
  }

  if (!operadoresEncontrados || operadoresEncontrados.length === 0) {
    console.log('✅ No se encontraron operadores de prueba para eliminar');
    return 0;
  }

  console.log(`\n📋 Encontrados ${operadoresEncontrados.length} operadores:`);
  operadoresEncontrados.forEach((o, i) => {
    console.log(`   ${i + 1}. ${o.nombre} ${o.apellidos} - Lic: ${o.licencia} - Creado: ${new Date(o.created_at).toLocaleString()}`);
  });

  const confirmarOperadores = await confirmar('\n❓ ¿Deseas eliminar estos operadores? (s/n): ');
  
  if (!confirmarOperadores) {
    console.log('⏭️  Operadores no eliminados');
    return 0;
  }

  const idsOperadores = operadoresEncontrados.map(o => o.id);
  
  const { error: errorEliminar } = await supabase
    .from('operadores')
    .delete()
    .in('id', idsOperadores);

  if (errorEliminar) {
    console.error('❌ Error eliminando operadores:', errorEliminar);
    return 0;
  }

  console.log(`✅ ${operadoresEncontrados.length} operadores eliminados correctamente`);
  return operadoresEncontrados.length;
}

// Función principal
async function main() {
  console.log('🗑️  Script de Eliminación de Datos de Prueba\n');
  console.log('=' .repeat(60));
  console.log('\n⚠️  ADVERTENCIA: Este script eliminará registros de la base de datos.');
  console.log('Solo se eliminarán registros que coincidan con los patrones de prueba.\n');

  const continuarGlobal = await confirmar('¿Deseas continuar? (s/n): ');

  if (!continuarGlobal) {
    console.log('\n❌ Operación cancelada por el usuario.');
    process.exit(0);
  }

  try {
    const clientesEliminados = await eliminarClientesPrueba();
    const camionesEliminados = await eliminarCamionesPrueba();
    const remolquesEliminados = await eliminarRemolquesPrueba();
    const operadoresEliminados = await eliminarOperadoresPrueba();

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Proceso completado\n');
    console.log('Resumen de eliminaciones:');
    console.log(`  • Clientes: ${clientesEliminados}`);
    console.log(`  • Camiones: ${camionesEliminados}`);
    console.log(`  • Remolques: ${remolquesEliminados}`);
    console.log(`  • Operadores: ${operadoresEliminados}`);
    console.log(`\n📊 Total eliminados: ${clientesEliminados + camionesEliminados + remolquesEliminados + operadoresEliminados} registros\n`);
    
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();
