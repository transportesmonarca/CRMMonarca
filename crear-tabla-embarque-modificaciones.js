const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function crearTablaEmbarqueModificaciones() {
  console.log('🔨 Creando tabla embarque_modificaciones...');
  
  const sqlScript = `
    -- Crear tabla para registrar modificaciones de embarques
    CREATE TABLE IF NOT EXISTS embarque_modificaciones (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        embarque_id UUID NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
        fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        razon TEXT NOT NULL,
        
        -- Información del operador original
        operador_original_id UUID REFERENCES operadores(id),
        operador_original_nombre TEXT,
        sueldo_operador_original DECIMAL(10,2),
        moneda_sueldo_operador_original VARCHAR(3) DEFAULT 'MXN',
        
        -- Información del operador nuevo
        operador_nuevo_id UUID REFERENCES operadores(id),
        operador_nuevo_nombre TEXT,
        sueldo_operador_nuevo DECIMAL(10,2),
        moneda_sueldo_operador_nuevo VARCHAR(3) DEFAULT 'MXN',
        
        -- Información del camión original
        camion_original_id UUID REFERENCES camiones(id),
        camion_original_numero TEXT,
        
        -- Información del camión nuevo
        camion_nuevo_id UUID REFERENCES camiones(id),
        camion_nuevo_numero TEXT,
        
        -- Información del remolque original
        remolque_original_id UUID REFERENCES remolques(id),
        remolque_original_numero TEXT,
        
        -- Información del remolque nuevo
        remolque_nuevo_id UUID REFERENCES remolques(id),
        remolque_nuevo_numero TEXT,
        
        -- Información del flete
        precio_flete_original DECIMAL(10,2),
        precio_flete_nuevo DECIMAL(10,2),
        moneda_flete_original VARCHAR(3) DEFAULT 'MXN',
        moneda_flete_nueva VARCHAR(3) DEFAULT 'MXN',
        
        -- Marcadores especiales
        flete_en_falso BOOLEAN DEFAULT FALSE,
        
        -- Auditoría
        usuario_modificacion TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      // Si no hay función exec_sql, intentar creación paso a paso
      console.log('🔄 Intentando creación alternativa...');
      
      // Usar el endpoint de query directo (esto puede no funcionar según la configuración)
      const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ sql: sqlScript })
      });
      
      if (!response.ok) {
        throw new Error('No se pudo ejecutar el SQL: ' + response.statusText);
      }
      
      console.log('✅ Tabla creada usando endpoint REST');
    } else {
      console.log('✅ Tabla embarque_modificaciones creada exitosamente');
    }

    // Crear índices
    console.log('🔨 Creando índices...');
    
    const indices = [
      "CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_embarque_id ON embarque_modificaciones(embarque_id);",
      "CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_fecha ON embarque_modificaciones(fecha_modificacion);",
      "CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_operador_original ON embarque_modificaciones(operador_original_id);",
      "CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_operador_nuevo ON embarque_modificaciones(operador_nuevo_id);"
    ];

    for (const indice of indices) {
      try {
        await supabase.rpc('exec_sql', { sql: indice });
        console.log('✅ Índice creado');
      } catch (e) {
        console.log('⚠️ Error creando índice (posiblemente ya existe):', e.message);
      }
    }

    // Verificar que la tabla se creó correctamente
    console.log('\n🔍 Verificando tabla creada...');
    const { data: testData, error: testError } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error verificando tabla creada:', testError);
    } else {
      console.log('✅ Tabla embarque_modificaciones verificada y funcional');
      console.log('📊 Registros actuales:', testData ? testData.length : 0);
    }

  } catch (e) {
    console.error('❌ Error general:', {
      message: e.message,
      stack: e.stack
    });
    
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('Si este script no puede crear la tabla automáticamente,');
    console.log('ejecuta manualmente el siguiente SQL en tu consola de Supabase:');
    console.log('\n' + sqlScript);
  }
}

crearTablaEmbarqueModificaciones();