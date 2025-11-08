#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hmrlslgwxdlhpgzzakzr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcmxzbGd3eGRsaHBnenpha3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MjgyNjUsImV4cCI6MjA0NjIwNDI2NX0.CgzJYYVpBw2LtdBrJKe_OsAHIDLYGG0RqNPCJbLKR6k'
);

async function checkTable() {
  console.log('🔍 Verificando tabla documentos_embarques...');
  
  try {
    const { data, error } = await supabase
      .from('documentos_embarques')
      .select('count');
      
    if (error) {
      console.log('❌ Error:', error.message);
      if (error.code === '42P01') {
        console.log('🚨 LA TABLA NO EXISTE');
        console.log('📋 Necesitas ejecutar este script en Supabase SQL Editor:');
        console.log('   EJECUTAR-EN-SUPABASE-documentos-embarques.sql');
      } else {
        console.log('❌ Otro error:', error.code, error.details);
      }
      return false;
    }
    
    console.log('✅ Tabla existe y funciona');
    
    // Contar registros
    const { data: docs } = await supabase
      .from('documentos_embarques')
      .select('*');
      
    console.log(`📊 Total registros: ${docs?.length || 0}`);
    return true;
    
  } catch (err) {
    console.log('❌ Error de conexión:', err.message);
    return false;
  }
}

checkTable();