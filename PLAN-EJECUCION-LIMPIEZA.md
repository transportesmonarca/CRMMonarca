# 🚀 PLAN DE EJECUCIÓN: LIMPIEZA Y REPARACIÓN

## ✅ **LO QUE YA HICIMOS**

### **1. Scripts Creados:**
- `limpiar-tablas-normalizadas.sql` - Elimina todas las tablas/vistas normalizadas
- `reparar-vinculos-ui.js` - Identifica archivos que necesitan actualización
- `limpiar-referencias-ui.js` - Actualiza automáticamente referencias en código

### **2. APIs Reparadas:**
- `app/api/embarques/estado/route.ts` - ✅ Simplificado para usar solo tabla embarques
- `app/api/embarques/estado-desacoplado/route.ts` - ⚠️ Necesita actualización

## 🎯 **PRÓXIMOS PASOS (EN ORDEN)**

### **PASO 1: Ejecutar en Supabase (Base de Datos)**
```bash
# Ve a tu panel de Supabase → SQL Editor → Nuevo Query
# Copia y ejecuta el contenido de:
limpiar-tablas-normalizadas.sql
```
**Esto eliminará:** embarques_nuevo, embarques_completa_new, y todas las funciones normalizadas

### **PASO 2: Limpiar Referencias en UI**
```bash
# En tu terminal, ejecutar:
node limpiar-referencias-ui.js
```
**Esto creará backups y actualizará automáticamente:**
- Referencias de `embarques_nuevo` → `embarques`
- Eliminar lógica dual de tablas
- Simplificar queries

### **PASO 3: Reparar Manualmente (Crítico)**
Los siguientes archivos necesitan edición manual porque tienen lógica compleja:

#### **A. `app/embarques/page.tsx`**
```typescript
// BUSCAR Y CAMBIAR:
// Línea ~334: embarques_nuevo → embarques
// Línea ~1228: Eliminar bloque complejo de API call
// Reemplazar por: inserción directa en tabla embarques
```

#### **B. `app/api/embarques/estado-desacoplado/route.ts`**
```typescript
// BUSCAR Y CAMBIAR:
// Línea ~23: embarques_completa_new → embarques
// Eliminar llamadas a funciones SQL que ya no existen
// Simplificar a updates directos
```

### **PASO 4: Verificar Integridad**
```bash
# Ejecutar script de verificación
node reparar-vinculos-ui.js
```

### **PASO 5: Probar Funcionamiento**
```bash
# Reiniciar servidor
npm run dev

# Probar:
# 1. Crear embarque ✅
# 2. Completar y enviar ✅ (bug principal)
# 3. Cambiar estados ✅
# 4. Modal archivados ✅
```

## ⚠️ **PUNTOS CRÍTICOS**

### **1. Backup de Seguridad**
**ANTES de ejecutar PASO 1:**
```sql
-- En Supabase, crear backup:
CREATE TABLE embarques_backup_20250927 AS SELECT * FROM embarques;
```

### **2. Columnas Críticas**
Verificar que tabla `embarques` tenga:
- `fecha_completado` (para persistencia del botón)
- `fecha_cancelacion` 
- `fecha_finalizacion`
- `estado_facturacion`

### **3. Índices de Performance**
```sql
-- Asegurar índices optimizados:
CREATE INDEX IF NOT EXISTS idx_embarques_estado_fecha ON embarques(estado, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_facturacion ON embarques(estado_facturacion, fecha_archivado DESC);
```

## 🎯 **RESULTADO ESPERADO**

### **ANTES (Sistema Actual):**
- ❌ Múltiples tablas confusas
- ❌ Lógica dual compleja  
- ❌ Bug: botón revierte estado
- ❌ Performance subóptima

### **DESPUÉS (Sistema Limpio):**
- ✅ Una sola tabla: `embarques`
- ✅ Código simplificado
- ✅ Bug resuelto: estado persiste
- ✅ Mantenimiento más fácil

## 📋 **CHECKLIST DE VALIDACIÓN**

### **Base de Datos:**
- [ ] Tabla `embarques` tiene todas las columnas necesarias
- [ ] Tablas normalizadas eliminadas
- [ ] Funciones SQL normalizadas eliminadas
- [ ] Índices optimizados creados

### **Código:**
- [ ] No hay referencias a `embarques_nuevo`
- [ ] No hay referencias a `embarques_completa_new`
- [ ] APIs usan solo tabla `embarques`
- [ ] UI simplificada sin lógica dual

### **Funcionalidad:**
- [ ] Crear embarque funciona
- [ ] "Completar y Enviar" persiste estado
- [ ] Modal archivados funciona
- [ ] Cambios de estado funcionan
- [ ] Performance adecuada

## 🚨 **PLAN DE ROLLBACK (Si algo sale mal)**

```sql
-- 1. Restaurar desde backup
DROP TABLE embarques;
ALTER TABLE embarques_backup_20250927 RENAME TO embarques;

-- 2. Restaurar archivos desde backups automáticos
-- Los scripts crean backups con timestamp
-- Ejemplo: page.tsx.backup.1727434800000
```

## 🎉 **¿EMPEZAMOS?**

**¿Quieres proceder con PASO 1 (ejecutar SQL en Supabase)?**

Te guío paso a paso y verificamos cada etapa antes de continuar.