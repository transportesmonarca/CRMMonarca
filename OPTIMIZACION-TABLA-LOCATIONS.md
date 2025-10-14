# 📊 ESTRATEGIA DE OPTIMIZACIÓN: Tabla Locations

## 🚨 Problema Identificado

La app móvil Android está creando un **nuevo registro** en la tabla `locations` cada vez que captura una ubicación. Esto puede causar:

- 📈 **Crecimiento exponencial** de la tabla
- 💾 **Saturación de almacenamiento** en Supabase
- 🐢 **Consultas lentas** al buscar ubicaciones
- 💰 **Costos elevados** de base de datos

### Ejemplo de Crecimiento
```
Si la app envía ubicación cada 1 minuto:
- 1 hora = 60 registros
- 1 día = 1,440 registros
- 1 mes = 43,200 registros
- 1 año = 525,600 registros

Con 10 operadores activos:
- 1 año = 5,256,000 registros 😱
```

## ✅ Soluciones Propuestas

### 📍 Opción 1: UPDATE en lugar de INSERT (Recomendada para Inicio)

**Ventaja**: Solo 1 registro por operador, siempre actualizado.

#### Modificar la App Móvil Android
```kotlin
// ❌ ANTES (INSERT - crea nuevo registro cada vez)
suspend fun sendLocation(location: Location) {
    supabase.from("locations")
        .insert(location)
}

// ✅ DESPUÉS (UPSERT - actualiza si existe, inserta si no)
suspend fun sendLocation(location: Location) {
    supabase.from("locations")
        .upsert(location, onConflict = "operator_id")
}
```

#### Crear Constraint en Supabase
```sql
-- Asegurar que solo haya 1 ubicación por operador
ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

-- Índice para búsquedas rápidas
CREATE INDEX idx_locations_operator_id 
ON locations(operator_id);
```

**Pros**:
- ✅ Tabla pequeña (1 registro por operador)
- ✅ Consultas ultra rápidas
- ✅ Sin mantenimiento necesario
- ✅ Costos mínimos

**Contras**:
- ❌ No hay historial de ubicaciones
- ❌ No se puede ver ruta recorrida

---

### 📍 Opción 2: Tabla de Historial + Tabla Actual (Recomendada para Producción)

**Ventaja**: Ubicación actual rápida + historial completo.

#### Estructura de Tablas

**Tabla `locations` (solo ubicación actual)**
```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID UNIQUE NOT NULL,
    operator_number TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    captured_at TIMESTAMP NOT NULL,
    device_id TEXT,
    speed NUMERIC,
    accuracy NUMERIC,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_operator_id ON locations(operator_id);
```

**Tabla `locations_history` (historial completo)**
```sql
CREATE TABLE locations_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL,
    operator_number TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    captured_at TIMESTAMP NOT NULL,
    device_id TEXT,
    speed NUMERIC,
    accuracy NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_history_operator_captured ON locations_history(operator_id, captured_at DESC);
CREATE INDEX idx_history_captured_at ON locations_history(captured_at DESC);
```

#### Trigger Automático para Historial
```sql
-- Función que copia a historial antes de actualizar
CREATE OR REPLACE FUNCTION archive_location_to_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Copiar el registro anterior a historial
    INSERT INTO locations_history (
        operator_id,
        operator_number,
        latitude,
        longitude,
        captured_at,
        device_id,
        speed,
        accuracy
    )
    VALUES (
        OLD.operator_id,
        OLD.operator_number,
        OLD.latitude,
        OLD.longitude,
        OLD.captured_at,
        OLD.device_id,
        OLD.speed,
        OLD.accuracy
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta antes de UPDATE
CREATE TRIGGER trigger_archive_location
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION archive_location_to_history();
```

#### Modificar App Móvil
```kotlin
suspend fun sendLocation(location: Location) {
    // UPSERT en locations (actualiza ubicación actual)
    supabase.from("locations")
        .upsert(location, onConflict = "operator_id")
    
    // El trigger automáticamente guarda en historial
}
```

**Pros**:
- ✅ Consultas rápidas de ubicación actual
- ✅ Historial completo disponible
- ✅ Automático (trigger hace el trabajo)
- ✅ Escalable

**Contras**:
- ⚠️  Requiere mantenimiento del historial
- ⚠️  Costos moderados de almacenamiento

---

### 📍 Opción 3: Limpieza Automática con Retención (Híbrida)

**Ventaja**: Mantiene solo ubicaciones recientes.

#### Función de Limpieza Automática
```sql
-- Función que elimina ubicaciones antiguas
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
    -- Mantener solo las últimas 3 ubicaciones por operador
    DELETE FROM locations
    WHERE id NOT IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY operator_id 
                       ORDER BY captured_at DESC
                   ) as rn
            FROM locations
        ) ranked
        WHERE rn <= 3
    );
    
    -- O eliminar ubicaciones más antiguas de 7 días
    DELETE FROM locations
    WHERE captured_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Programar ejecución diaria
-- (Usar pg_cron o Edge Functions de Supabase)
```

#### Edge Function para Limpieza Programada
```typescript
// Supabase Edge Function: cleanup-locations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Mantener solo últimas 10 ubicaciones por operador
  const { data, error } = await supabase.rpc('cleanup_old_locations')

  return new Response(
    JSON.stringify({ success: !error, data }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

**Pros**:
- ✅ Balance entre historial y tamaño
- ✅ Mantenimiento automático
- ✅ Flexible (configurable días/cantidad)

**Contras**:
- ⚠️  Pierde historial antiguo
- ⚠️  Requiere configuración de Edge Function

---

### 📍 Opción 4: Throttling en la App (Complementaria)

**Ventaja**: Reduce envíos innecesarios desde el origen.

#### Implementar en App Android
```kotlin
class LocationManager {
    private var lastSentLocation: Location? = null
    private var lastSentTime: Long = 0
    
    // Configuración
    private val MIN_TIME_BETWEEN_UPDATES = 60_000L // 1 minuto
    private val MIN_DISTANCE_METERS = 50f // 50 metros
    private val MIN_ACCURACY_METERS = 20f // Solo enviar si precisión < 20m
    
    suspend fun onLocationUpdate(newLocation: Location) {
        val now = System.currentTimeMillis()
        val timeDiff = now - lastSentTime
        val lastLoc = lastSentLocation
        
        // Solo enviar si cumple condiciones:
        val shouldSend = when {
            // Primera ubicación
            lastLoc == null -> true
            
            // Han pasado más de X minutos
            timeDiff > MIN_TIME_BETWEEN_UPDATES -> true
            
            // Se movió más de X metros
            lastLoc.distanceTo(newLocation) > MIN_DISTANCE_METERS -> true
            
            // Precisión muy mala
            newLocation.accuracy > MIN_ACCURACY_METERS -> false
            
            else -> false
        }
        
        if (shouldSend) {
            sendLocation(newLocation)
            lastSentLocation = newLocation
            lastSentTime = now
        } else {
            Log.d("Location", "Ubicación ignorada (throttling)")
        }
    }
}
```

**Pros**:
- ✅ Reduce tráfico de red
- ✅ Ahorra batería del dispositivo
- ✅ Menos registros en BD
- ✅ Solo envía cambios significativos

---

## 🎯 Recomendación Final

### Para Implementar AHORA (Solución Inmediata)

**Combinar Opción 1 + Opción 4**:

1. **Cambiar INSERT por UPSERT** en la app móvil
2. **Implementar throttling** inteligente
3. **Crear constraint UNIQUE** en `operator_id`

```sql
-- Ejecutar en Supabase:
ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

CREATE INDEX idx_locations_operator_id ON locations(operator_id);
CREATE INDEX idx_locations_captured_at ON locations(captured_at DESC);
```

### Para el Futuro (Cuando Necesiten Historial)

**Implementar Opción 2**: Tabla actual + historial con trigger automático.

---

## 📝 Scripts de Migración

### Script 1: Limpiar Duplicados Actuales
```sql
-- Ver duplicados actuales
SELECT operator_id, COUNT(*) as total
FROM locations
GROUP BY operator_id
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Mantener solo la ubicación más reciente por operador
DELETE FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    ORDER BY operator_id, captured_at DESC
);
```

### Script 2: Agregar Constraint
```sql
-- Agregar restricción única
ALTER TABLE locations 
DROP CONSTRAINT IF EXISTS unique_operator_location;

ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);
```

### Script 3: Crear Índices
```sql
-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_locations_operator_id 
ON locations(operator_id);

CREATE INDEX IF NOT EXISTS idx_locations_captured_at 
ON locations(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_locations_operator_captured 
ON locations(operator_id, captured_at DESC);
```

---

## 📊 Comparación de Opciones

| Criterio | Opción 1<br>(UPSERT) | Opción 2<br>(Historial) | Opción 3<br>(Limpieza) | Opción 4<br>(Throttling) |
|----------|---------------------|------------------------|----------------------|------------------------|
| **Implementación** | ⭐⭐⭐⭐⭐ Muy fácil | ⭐⭐⭐ Moderada | ⭐⭐⭐ Moderada | ⭐⭐⭐⭐ Fácil |
| **Velocidad consultas** | ⭐⭐⭐⭐⭐ Ultra rápida | ⭐⭐⭐⭐ Rápida | ⭐⭐⭐ Buena | ⭐⭐⭐⭐ Rápida |
| **Uso de espacio** | ⭐⭐⭐⭐⭐ Mínimo | ⭐⭐ Alto | ⭐⭐⭐⭐ Bajo | ⭐⭐⭐⭐⭐ Mínimo |
| **Historial** | ❌ No | ✅ Completo | ⚠️ Parcial | ❌ No |
| **Mantenimiento** | ✅ Ninguno | ⚠️ Ocasional | ✅ Automático | ✅ Ninguno |
| **Costos** | 💰 Muy bajo | 💰💰💰 Alto | 💰💰 Moderado | 💰 Muy bajo |

---

## 🚀 Plan de Implementación (3 Fases)

### Fase 1: INMEDIATO (Hoy)
```bash
✅ Ejecutar script de limpieza de duplicados
✅ Agregar constraint UNIQUE en operator_id
✅ Crear índices de optimización
✅ Documentar cambios
```

### Fase 2: CORTO PLAZO (Esta Semana)
```bash
✅ Actualizar app móvil para usar UPSERT
✅ Implementar throttling inteligente
✅ Probar con operadores reales
✅ Monitorear crecimiento de tabla
```

### Fase 3: MEDIANO PLAZO (Próximo Mes)
```bash
✅ Implementar tabla de historial
✅ Crear trigger automático
✅ Migrar datos históricos
✅ Dashboard de monitoreo
```

---

**Fecha**: 11 de Octubre, 2025  
**Prioridad**: 🔴 ALTA  
**Impacto**: 💥 CRÍTICO para escalabilidad
