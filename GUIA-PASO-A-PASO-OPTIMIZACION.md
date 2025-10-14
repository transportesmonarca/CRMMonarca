# 🚀 GUÍA PASO A PASO: Optimización de Tabla Locations

## 📋 Instrucciones para Ejecutar en Supabase

### 🔑 Paso 0: Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto de Monarca
4. En el menú lateral, haz click en **"SQL Editor"**

---

### 📊 PASO 1: Análisis Previo (SEGURO - Solo lectura)

**Copiar y ejecutar este código:**

```sql
-- Ver estado actual de la tabla
SELECT 
    'Estado actual de locations' as titulo,
    COUNT(*) as total_registros,
    COUNT(DISTINCT operator_id) as operadores_unicos,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla;
```

**Resultado esperado:**
```
titulo                          | total_registros | operadores_unicos | tamano_tabla
Estado actual de locations      | 150            | 5                 | 48 kB
```

**¿Qué hacer?**
- ✅ Anota el `total_registros` actual
- ✅ Anota cuántos `operadores_unicos` hay

---

**Ver duplicados por operador:**

```sql
SELECT 
    operator_id,
    COUNT(*) as total_ubicaciones,
    MIN(captured_at) as primera,
    MAX(captured_at) as ultima
FROM locations
WHERE operator_id IS NOT NULL
GROUP BY operator_id
HAVING COUNT(*) > 1
ORDER BY total_ubicaciones DESC
LIMIT 10;
```

**Resultado esperado:**
```
operator_id | total_ubicaciones | primera              | ultima
OP007       | 45               | 2025-10-11 09:00:00  | 2025-10-11 11:00:00
001         | 20               | 2025-10-11 10:00:00  | 2025-10-11 10:30:00
```

**¿Qué hacer?**
- ⚠️ Si ves operadores con más de 10 ubicaciones → hay duplicados
- ⚠️ Si todos tienen 1 ubicación → ¡ya está optimizado!

---

### 💾 PASO 2: Crear Backup (IMPORTANTE)

**Copiar y ejecutar:**

```sql
-- Crear tabla de respaldo
DROP TABLE IF EXISTS locations_backup_20251011;
CREATE TABLE locations_backup_20251011 AS 
SELECT * FROM locations;

-- Verificar que se creó
SELECT 
    'Backup creado' as mensaje,
    COUNT(*) as registros_respaldados 
FROM locations_backup_20251011;
```

**Resultado esperado:**
```
mensaje        | registros_respaldados
Backup creado  | 150
```

**¿Qué hacer?**
- ✅ Asegúrate que `registros_respaldados` coincide con el total del Paso 1
- ✅ Si algo sale mal, puedes restaurar con:
  ```sql
  DROP TABLE locations;
  ALTER TABLE locations_backup_20251011 RENAME TO locations;
  ```

---

### 🔍 PASO 3: Vista Previa de Eliminación (SEGURO)

**Ver cuántos registros se eliminarán:**

```sql
SELECT 
    'Registros que se eliminarán' as mensaje,
    COUNT(*) as total
FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    WHERE operator_id IS NOT NULL
    ORDER BY operator_id, captured_at DESC NULLS LAST
);
```

**Resultado esperado:**
```
mensaje                          | total
Registros que se eliminarán      | 140
```

**¿Qué hacer?**
- 📝 Anota cuántos se eliminarán
- ⚠️ Se mantendrá solo la ubicación más reciente de cada operador
- ✅ Si el número te parece correcto, continúa

---

### 🗑️ PASO 4: Eliminar Duplicados (CUIDADO)

**⚠️ IMPORTANTE: Este paso ELIMINA datos. Asegúrate de haber hecho el backup.**

```sql
-- Eliminar duplicados (mantiene solo el más reciente)
DELETE FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    WHERE operator_id IS NOT NULL
    ORDER BY operator_id, captured_at DESC NULLS LAST
);

-- Limpiar registros sin operator_id
DELETE FROM locations
WHERE operator_id IS NULL OR operator_id = '';

-- Verificar resultado
SELECT 
    'Después de limpieza' as mensaje,
    COUNT(*) as registros_restantes,
    COUNT(DISTINCT operator_id) as operadores_unicos
FROM locations;
```

**Resultado esperado:**
```
mensaje                  | registros_restantes | operadores_unicos
Después de limpieza      | 10                 | 10
```

**¿Qué hacer?**
- ✅ `registros_restantes` debe ser igual a `operadores_unicos`
- ✅ Esto significa 1 ubicación por operador
- 🎉 Si coincide, ¡perfecto!

---

### 🔒 PASO 5: Agregar Constraint UNIQUE

**Prevenir duplicados futuros:**

```sql
-- Agregar constraint
ALTER TABLE locations 
DROP CONSTRAINT IF EXISTS unique_operator_location;

ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

SELECT 'Constraint UNIQUE agregado correctamente' as mensaje;
```

**Resultado esperado:**
```
mensaje
Constraint UNIQUE agregado correctamente
```

**¿Qué hace?**
- 🔒 Impide que se creen múltiples ubicaciones para el mismo operador
- 🚫 Si la app intenta hacer INSERT con un operator_id existente, dará error
- ✅ Forzará a usar UPSERT (que es lo correcto)

---

### ⚡ PASO 6: Crear Índices

**Optimizar velocidad de consultas:**

```sql
-- Índice principal
DROP INDEX IF EXISTS idx_locations_operator_id;
CREATE INDEX idx_locations_operator_id 
ON locations(operator_id) 
WHERE operator_id IS NOT NULL;

-- Índice por fecha
DROP INDEX IF EXISTS idx_locations_captured_at;
CREATE INDEX idx_locations_captured_at 
ON locations(captured_at DESC);

-- Índice compuesto
DROP INDEX IF EXISTS idx_locations_operator_captured;
CREATE INDEX idx_locations_operator_captured 
ON locations(operator_id, captured_at DESC)
WHERE operator_id IS NOT NULL;

SELECT 'Índices creados correctamente' as mensaje;
```

**Resultado esperado:**
```
mensaje
Índices creados correctamente
```

**¿Qué hace?**
- ⚡ Acelera las búsquedas por operator_id
- ⚡ Acelera las búsquedas por fecha
- 🎯 Las consultas serán 10-100x más rápidas

---

### 📊 PASO 7: Agregar Columnas Útiles (Opcional)

```sql
ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS speed NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accuracy NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS altitude NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS heading NUMERIC;

SELECT 'Columnas adicionales agregadas' as mensaje;
```

**¿Para qué sirven?**
- `updated_at` - Timestamp de última actualización
- `speed` - Velocidad del operador (km/h)
- `accuracy` - Precisión del GPS (metros)
- `altitude` - Altitud (metros)
- `heading` - Dirección/rumbo (grados)

---

### ✅ PASO 8: Verificación Final

```sql
SELECT 
    '✅ OPTIMIZACIÓN COMPLETADA' as resultado,
    COUNT(*) as registros_actuales,
    COUNT(DISTINCT operator_id) as operadores_con_ubicacion,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla,
    pg_size_pretty(pg_indexes_size('locations')) as tamano_indices
FROM locations;
```

**Resultado esperado:**
```
resultado                    | registros | operadores | tamano_tabla | tamano_indices
✅ OPTIMIZACIÓN COMPLETADA   | 10       | 10         | 8 kB         | 16 kB
```

**Ver ubicaciones actuales:**

```sql
SELECT 
    l.operator_id,
    l.latitude,
    l.longitude,
    l.captured_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - l.captured_at)) / 60) as minutos_atras
FROM locations l
ORDER BY l.captured_at DESC
LIMIT 10;
```

---

## 🎯 Siguiente Paso: Actualizar App Móvil

Ahora que la base de datos está optimizada, necesitas actualizar la app Android:

### En tu proyecto Android Studio:

**Ubicar el archivo donde envías ubicaciones (probablemente algo como `LocationService.kt` o `GPSTracker.kt`)**

**Cambiar de INSERT a UPSERT:**

```kotlin
// ❌ ANTES
suspend fun sendLocation(lat: Double, lng: Double) {
    val location = mapOf(
        "operator_id" to operatorNumber, // ← También corregir esto
        "latitude" to lat,
        "longitude" to lng,
        "captured_at" to System.currentTimeMillis()
    )
    
    supabase.from("locations")
        .insert(location) // ← Cambiar esto
}

// ✅ DESPUÉS
suspend fun sendLocation(lat: Double, lng: Double) {
    val location = mapOf(
        "operator_id" to operatorUUID, // ← Usar UUID del operador
        "operator_number" to operatorNumber, // ← Agregar esto
        "latitude" to lat,
        "longitude" to lng,
        "captured_at" to System.currentTimeMillis(),
        "accuracy" to gpsAccuracy, // ← Opcional
        "speed" to currentSpeed // ← Opcional
    )
    
    supabase.from("locations")
        .upsert(location) // ← Usar upsert
}
```

---

## 📞 Soporte

### Si algo sale mal:

**Restaurar backup:**
```sql
DROP TABLE locations;
ALTER TABLE locations_backup_20251011 RENAME TO locations;
```

**Ver logs de Supabase:**
- Ve a Supabase → Database → Logs
- Revisa errores recientes

### Scripts de verificación:

```bash
# Ver estado actual
node scripts/analizar-saturacion-locations.js

# Probar operador específico
node scripts/probar-busqueda-op007.js
```

---

## ✅ Checklist Final

```
✅ Ejecuté PASO 1 - Análisis previo
✅ Ejecuté PASO 2 - Backup creado
✅ Ejecuté PASO 3 - Vi cuántos se eliminarán
✅ Ejecuté PASO 4 - Eliminé duplicados
✅ Ejecuté PASO 5 - Agregué constraint UNIQUE
✅ Ejecuté PASO 6 - Creé índices
✅ Ejecuté PASO 7 - Agregué columnas
✅ Ejecuté PASO 8 - Verificación final
⬜ Actualicé app móvil Android (UPSERT)
⬜ Implementé throttling en app móvil
⬜ Probé con operadores reales
⬜ Monitoreé por 24 horas
```

---

**Tiempo estimado**: 15-20 minutos  
**Dificultad**: ⭐⭐ Fácil (solo copiar y pegar)  
**Impacto**: 🚀 Crítico para escalabilidad
