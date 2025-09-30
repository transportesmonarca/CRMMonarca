# Instrucciones para Eliminar Columnas Legacy de Facturación

## ⚠️ IMPORTANTE: Ejecutar en este orden exacto

### 1. PRIMERO: Crear backup de seguridad
```sql
-- Ejecutar en Supabase SQL Editor:
-- Copiar y pegar el contenido completo de: BACKUP-ANTES-MIGRACION-JSON.sql
```

### 2. SEGUNDO: Ejecutar migración principal
```sql
-- Ejecutar en Supabase SQL Editor:
-- Copiar y pegar el contenido completo de: EJECUTAR-EN-SUPABASE-json-facturacion.sql
```

### 3. TERCERO: Verificar que todo funcionó
```sql
-- Verificar que las columnas fueron eliminadas:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'embarques' 
  AND column_name LIKE '%factura_%'
  AND column_name != 'facturas_json';

-- Esta consulta NO debe retornar ninguna fila si la migración fue exitosa
```

### 4. Estado actual:
- ✅ Frontend preparado (sin referencias legacy)
- ❌ **Base de datos AÚN tiene las columnas legacy**
- ❌ **Migración AÚN NO ejecutada**

### 5. Después de ejecutar la migración:
- Las columnas `folio_factura_1, folio_factura_2, folio_factura_3, folio_factura_4` serán **eliminadas**
- Las columnas `numero_factura_1, numero_factura_2, numero_factura_3` serán **eliminadas**  
- Las columnas `fecha_envio_cliente_1-4, fecha_pago_1-4, referencia_pago_1-4` serán **eliminadas**
- Los datos se consolidarán en la columna `facturas_json`
- El frontend seguirá funcionando normalmente

### 6. Rollback de emergencia (si algo sale mal):
```sql
-- Usar la función de restauración del backup:
SELECT restore_from_backup_facturacion();
```