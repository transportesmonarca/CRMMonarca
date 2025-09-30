const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function analizarEstructuraEmbarques() {
  try {
    console.log('🔍 Analizando estructura actual de la tabla embarques...\n');
    
    const { data, error } = await supabase
      .from('embarques')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      const columnas = Object.keys(data[0]);
      console.log('📊 COLUMNAS ACTUALES EN EMBARQUES:', columnas.length, 'columnas\n');
      
      // Agrupar columnas por categorías lógicas
      const categorias = {
        'Básicas': ['id', 'numero_embarque', 'fecha', 'created_at', 'updated_at'],
        'Cliente/Destino': ['cliente_id', 'origen', 'destino', 'direccion_origen', 'direccion_destino'],
        'Servicio': ['tipo_servicio_id', 'descripcion', 'peso', 'volumen'],
        'Transporte': ['operador_id', 'camion_id', 'remolque_id'],
        'Financieras': ['precio', 'costo_combustible', 'precio_total', 'pago_operador', 'flete_falso'],
        'Estados': ['estatus', 'fecha_entrega', 'fecha_salida'],
        'Documentos': ['carta_porte', 'folio_factura', 'numero_factura'],
        'Adicionales': []
      };
      
      const columnasUsadas = new Set();
      
      Object.keys(categorias).forEach(categoria => {
        if (categoria !== 'Adicionales') {
          categorias[categoria] = categorias[categoria].filter(col => {
            if (columnas.includes(col)) {
              columnasUsadas.add(col);
              return true;
            }
            return false;
          });
        }
      });
      
      // Columnas no categorizadas van a 'Adicionales'
      categorias.Adicionales = columnas.filter(col => !columnasUsadas.has(col));
      
      Object.keys(categorias).forEach(categoria => {
        if (categorias[categoria].length > 0) {
          console.log('📂', categoria + ':', categorias[categoria].length, 'columnas');
          categorias[categoria].forEach(col => console.log('  -', col));
          console.log('');
        }
      });
      
      console.log('⚠️  TOTAL DE COLUMNAS:', columnas.length);
      if (columnas.length > 25) {
        console.log('🚨 LA TABLA ES MUY EXTENSA - SE RECOMIENDA NORMALIZACIÓN\n');
        
        console.log('💡 PROPUESTA DE NORMALIZACIÓN:');
        console.log('1. 📦 embarques (tabla principal) - columnas básicas + referencias FK');
        console.log('2. 📍 embarques_ubicaciones - origen, destino, direcciones');
        console.log('3. 💰 embarques_financiero - precios, costos, pagos');
        console.log('4. 📋 embarques_estado - estatus, fechas, tracking');
        console.log('5. 📄 embarques_documentos - carta_porte, facturas, folio');
        console.log('6. ⚡ embarques_adicional - campos extras/dinámicos');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analizarEstructuraEmbarques();