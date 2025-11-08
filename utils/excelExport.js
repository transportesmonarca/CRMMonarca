import ExcelJS from 'exceljs';

/**
 * Exporta datos a Excel usando ExcelJS (alternativa segura a XLSX)
 * @param {Array} data - Array de datos a exportar
 * @param {String} filename - Nombre del archivo sin extensión
 * @param {Array} columns - Configuración de columnas (opcional)
 */
export const exportToExcel = async (data, filename, columns = null) => {
  try {
    // Crear un nuevo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    if (columns) {
      // Si se proporcionan columnas personalizadas
      worksheet.columns = columns;
    } else {
      // Auto-generar columnas basadas en el primer objeto
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        worksheet.columns = keys.map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1),
          key: key,
          width: 15
        }));
      }
    }

    // Agregar los datos
    data.forEach(row => {
      worksheet.addRow(row);
    });

    // Estilo para el header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Generar el archivo y descargarlo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    throw error;
  }
};

/**
 * Configuraciones de columnas para diferentes tipos de export
 */
export const columnConfigs = {
  embarques: [
    { header: 'Número', key: 'numero_embarque', width: 15 },
    { header: 'Cliente', key: 'cliente_nombre', width: 25 },
    { header: 'Origen', key: 'origen', width: 20 },
    { header: 'Destino', key: 'destino', width: 20 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Fecha Creación', key: 'created_at', width: 18 },
    { header: 'Precio Base', key: 'precio_base', width: 12 },
    { header: 'Comisión', key: 'comision_monarca', width: 12 }
  ],
  recordatorios: [
    { header: 'Título', key: 'titulo', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Fecha', key: 'fecha_recordatorio', width: 18 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Usuario', key: 'usuario_nombre', width: 20 }
  ]
};