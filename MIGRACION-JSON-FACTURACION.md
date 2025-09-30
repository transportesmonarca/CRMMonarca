# Migración a Estructura JSON para Facturación

## 🎯 Objetivo

Migrar el diseño de la base de datos para el modal de "Captura de Facturación" de columnas separadas (`folio_factura_1`, `folio_factura_2`, etc.) a una estructura JSON similar al patrón usado para direcciones múltiples.

## 📋 Estructura Actual vs Nueva

### Estructura Anterior (Columnas Separadas)
```sql
-- Columnas individuales en la tabla embarques
folio_factura_1 VARCHAR(100)
folio_factura_2 VARCHAR(100)
folio_factura_3 VARCHAR(100)
folio_factura_4 VARCHAR(100)
fecha_envio_cliente_1 DATE
fecha_envio_cliente_2 DATE
fecha_envio_cliente_3 DATE
fecha_envio_cliente_4 DATE
fecha_pago_1 DATE
fecha_pago_2 DATE
fecha_pago_3 DATE
fecha_pago_4 DATE
referencia_pago_1 VARCHAR(100)
referencia_pago_2 VARCHAR(100)
referencia_pago_3 VARCHAR(100)
referencia_pago_4 VARCHAR(100)
```

### Nueva Estructura (JSON)
```sql
-- Una sola columna JSON que contiene todos los datos
facturas_json JSONB DEFAULT '[]'::jsonb
```

```json
[
  {
    "numero": "FACT-001",
    "fecha_envio": "2025-01-15",
    "fecha_pago": "2025-01-30",
    "referencia": "REF-001"
  },
  {
    "numero": "FACT-002", 
    "fecha_envio": "2025-02-10",
    "fecha_pago": null,
    "referencia": "REF-002"
  }
]
```

## 🚀 Proceso de Migración

### 1. **¡IMPORTANTE! Crear Backup Primero**
```bash
# PASO 1: Ejecutar backup en Supabase SQL Editor
# EJECUTAR-EN-SUPABASE-json-facturacion.sql eliminará las columnas legacy
\i BACKUP-ANTES-MIGRACION-JSON.sql
```

### 2. Ejecutar Script de Migración
```bash
# PASO 2: Ejecutar migración en Supabase SQL Editor
\i EJECUTAR-EN-SUPABASE-json-facturacion.sql
```

### 3. Probar la Migración
```bash
# Instalar dependencias si es necesario
npm install @supabase/supabase-js

# Ejecutar script de prueba
node probar-json-facturacion.js
```

### 4. Verificar en la UI
- Abrir modal "Captura de Facturación"
- Verificar que los campos se cargan correctamente
- Probar guardado de datos
- Confirmar compatibilidad con datos existentes

## 🔧 Componentes Actualizados

#### Backend (Base de Datos)
- ✅ Nueva columna `facturas_json JSONB` 
- ✅ Función de migración automática de datos legacy
- ✅ **Eliminación completa de columnas legacy** (16 columnas → 1 columna)
- ✅ Vista de compatibilidad para código que espere campos individuales
- ✅ Índices optimizados para búsquedas JSON
- ✅ Backup automático antes de eliminar columnas

### Frontend (React/TypeScript)
- ✅ Interface `FacturaData` actualizada
- ✅ Componente modal refactorizado
- ✅ Estado del formulario simplificado
- ✅ Funciones de carga y guardado adaptadas
- ✅ Utilities helper para conversión

### Archivos Creados/Modificados
```
BACKUP-ANTES-MIGRACION-JSON.sql        - ⚠️  Script de backup (EJECUTAR PRIMERO)
EJECUTAR-EN-SUPABASE-json-facturacion.sql - Script de migración principal
lib/supabase.ts                         - Interface FacturaData
lib/facturacion-utils.ts                - Utilities de conversión
app/facturacion-cobranza/page.tsx       - Modal actualizado
probar-json-facturacion.js              - Script de pruebas
```

## 💡 Ventajas del Nuevo Diseño

### Flexibilidad
- ✅ Fácil agregar/quitar facturas sin cambios de esquema
- ✅ Campos adicionales sin migraciones
- ✅ Estructura más limpia y escalable

### Performance
- ✅ Menos JOIN's en consultas
- ✅ Índices GIN optimizados para JSON
- ✅ Búsquedas más eficientes

### Mantenimiento  
- ✅ Menos código duplicado
- ✅ Validación centralizada
- ✅ Estructura consistente con otros módulos

## 🔄 Compatibilidad y Backup

**¡IMPORTANTE!** Esta migración **ELIMINA PERMANENTEMENTE** las columnas legacy. Se mantiene compatibilidad mediante:

### Backup Completo
```sql
-- Tabla de backup creada automáticamente ANTES de la migración
CREATE TABLE backup_embarques_facturacion_legacy AS SELECT ...;
```

### Vista de Compatibilidad
```sql
-- Para código que espere campos individuales
CREATE VIEW embarques_facturas_legacy AS 
SELECT *, 
  facturas_json->0->>'numero' as folio_factura_1,
  facturas_json->1->>'numero' as folio_factura_2,
  ...
FROM embarques;
```

### Función de Restauración
```sql
-- En caso de emergencia, restaurar desde backup
SELECT restaurar_desde_backup_facturacion();
```

## 🔍 Funciones Disponibles

### Conversión y Utilidades
```javascript
import { 
  convertirFacturacionLegacyAJson,
  convertirFacturacionJsonALegacy,
  obtenerFacturasEmbarque,
  limpiarFacturasVacias,
  buscarPorNumeroFactura 
} from './lib/facturacion-utils';
```

### Búsquedas JSON en SQL
```sql
-- Buscar por número de factura
SELECT * FROM embarques 
WHERE facturas_json @> '[{"numero": "FACT-001"}]';

-- Usar función helper
SELECT * FROM buscar_por_numero_factura('FACT-001');
```

## 📊 Monitoring y Validación

### Script de Monitoreo
```bash
# Ver estadísticas de migración
node -e "
const { obtenerEstadisticasFacturacion } = require('./lib/facturacion-utils');
// Ejecutar análisis...
"
```

### Queries de Verificación
```sql
-- Verificar datos migrados
SELECT 
    'Embarques con facturas JSON' as tipo,
    COUNT(*) as cantidad
FROM embarques 
WHERE jsonb_array_length(facturas_json) > 0

UNION ALL

SELECT 
    'Embarques con facturas legacy' as tipo,
    COUNT(*) as cantidad  
FROM embarques
WHERE folio_factura_1 IS NOT NULL;
```

## 🚨 Consideraciones Importantes

### Pre-Migración
- [ ] **⚠️  EJECUTAR `BACKUP-ANTES-MIGRACION-JSON.sql` PRIMERO**
- [ ] **Backup completo** de la base de datos (adicional al script)
- [ ] Verificar que no hay procesos críticos ejecutándose
- [ ] Notificar al equipo sobre la eliminación de columnas

### Durante la Migración
- [ ] Monitorear logs de Supabase
- [ ] Verificar que los triggers funcionan correctamente
- [ ] Probar funcionalidad crítica

### Post-Migración  
- [ ] Validar integridad de datos
- [ ] Confirmar que la UI funciona correctamente
- [ ] Actualizar documentación del API
- [ ] Entrenar al equipo en la nueva estructura

## 🔧 Troubleshooting

### Error: "Column facturas_json does not exist"
```bash
# Verificar que el script SQL se ejecutó correctamente
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'embarques' AND column_name = 'facturas_json';
```

### Error: "Invalid JSON format"
```javascript
// Validar estructura antes de guardar
const esValido = Array.isArray(facturas) && 
  facturas.every(f => f.numero && typeof f.numero === 'string');
```

### Performance lenta en búsquedas
```sql
-- Verificar que existe el índice GIN
SELECT * FROM pg_indexes 
WHERE tablename = 'embarques' 
AND indexname LIKE '%facturas_json%';
```

## 📞 Soporte

Para dudas o problemas durante la migración:

1. **Revisar logs** de Supabase Dashboard
2. **Ejecutar script** `probar-json-facturacion.js` para diagnosticar  
3. **Consultar** este README y archivos de utilidades
4. **Contactar** al equipo de desarrollo

---

## 📝 Notas de Desarrollo

- La migración es **no destructiva** - mantiene datos legacy
- Rollback disponible eliminando columna `facturas_json`
- Compatible con versiones futuras de la aplicación
- Sigue el mismo patrón usado en direcciones múltiples