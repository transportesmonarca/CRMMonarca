# 🤖 PROMPT PARA AGENTE DE ANDROID STUDIO

## 📋 Contexto de lo que Hicimos

Hemos optimizado la tabla `locations` en Supabase para el sistema de tracking de operadores del CRM Monarca. El problema era que la app móvil estaba creando un **nuevo registro (INSERT)** cada vez que enviaba una ubicación, causando **duplicados masivos** (197 registros para solo 4 operadores).

### ✅ Lo que YA se Hizo en el Backend (Supabase)

1. ✅ Eliminamos 193 registros duplicados
2. ✅ Dejamos solo 1 ubicación por operador (la más reciente)
3. ✅ Agregamos un constraint UNIQUE en `operator_id` para prevenir duplicados
4. ✅ Creamos índices para optimizar consultas
5. ✅ Agregamos nuevas columnas: `speed`, `accuracy`, `altitude`, `heading`, `updated_at`

### Estructura Actual de la Tabla `locations` en Supabase

```sql
locations
├── id (UUID, primary key)
├── operator_id (TEXT/UUID, UNIQUE) ← Debe ser el UUID del operador
├── operator_number (TEXT) ← Número visible del operador (ej: "OP007")
├── latitude (NUMERIC)
├── longitude (NUMERIC)
├── captured_at (TIMESTAMP)
├── device_id (TEXT)
├── speed (NUMERIC) ← NUEVA
├── accuracy (NUMERIC) ← NUEVA
├── altitude (NUMERIC) ← NUEVA
├── heading (NUMERIC) ← NUEVA
├── updated_at (TIMESTAMP) ← NUEVA
└── created_at (TIMESTAMP)
```

### 🚨 Problema Actual Detectado

La app móvil tiene 2 problemas:

1. **Usa INSERT en lugar de UPSERT**
   - INSERT crea un nuevo registro cada vez
   - Ahora que hay constraint UNIQUE, INSERT fallará
   - Debe cambiarse a UPSERT (actualiza si existe, inserta si no)

2. **operator_id contiene el número del operador en lugar del UUID**
   - La app envía: `operator_id = "OP007"`
   - Debería enviar: `operator_id = "d3b1506a-6cb2-4275-bf62-da19d7385029"` (UUID real)
   - Y por separado: `operator_number = "OP007"`

---

## 🎯 LO QUE NECESITO QUE HAGAS EN ANDROID STUDIO

### ⚠️ ESTADO ACTUAL VERIFICADO (12 Oct 2025 - 4:37 AM)

**✅ Lo que YA funciona:**
- UPSERT está funcionando (solo hay 1 registro por operador)
- No hay duplicados
- Las ubicaciones se están actualizando correctamente

**❌ Lo que FALTA corregir:**
1. `operator_id` todavía contiene el número ("OP007") en lugar del UUID
2. `operator_number` está NULL (vacío)
3. Los campos nuevos están NULL: `accuracy`, `speed`, `altitude`, `heading`

### Tarea 1: ✅ UPSERT ya implementado (COMPLETADO)

Ya se cambió INSERT por UPSERT - **No necesitas hacer nada aquí**.

El código actual ya tiene:
```kotlin
supabase.from("locations").upsert(location)
```

### Tarea 2: 🚨 URGENTE - Corregir los Datos que se Envían

**Código ACTUAL detectado (incorrecto):**
```kotlin
// ❌ ESTO ES LO QUE LA APP ESTÁ ENVIANDO AHORA (VERIFICADO)
val location = mapOf(
    "operator_id" to "OP007",  // ← Está mal: debe ser UUID
    "operator_number" to null,  // ← Está NULL, debe tener valor
    "latitude" to latitude,
    "longitude" to longitude,
    "captured_at" to timestamp,
    "device_id" to deviceId
    // ← Faltan: accuracy, speed, altitude, heading
)

supabase.from("locations").upsert(location)  // ✅ UPSERT ya está bien
```

**🔍 DEBES BUSCAR Y ENCONTRAR DÓNDE ESTÁ ESTE CÓDIGO EN EL PROYECTO:**
- El código existe y está funcionando (envía ubicaciones)
- Busca en: `LocationService.kt`, `GPSTracker.kt`, `LocationManager.kt`, `LocationRepository.kt`
- Busca: `supabase.from("locations").upsert`
- O busca: `"operator_id"` y `"latitude"`

**Código NUEVO (correcto) - REEMPLAZAR CON ESTO:**
```kotlin
// ✅ CORRECTO - USA ESTE CÓDIGO
val location = mapOf(
    "operator_id" to operatorUUID,  // ← UUID del operador (ej: "d3b1506a-6cb2-4275-bf62-da19d7385029")
    "operator_number" to operatorNumber,  // ← Número visible (ej: "OP007")
    "latitude" to latitude,
    "longitude" to longitude,
    "captured_at" to timestamp,
    "device_id" to deviceId,
    "accuracy" to location.accuracy,  // ← Precisión del GPS en metros
    "speed" to location.speed,  // ← Velocidad en m/s
    "heading" to location.bearing,  // ← Dirección/rumbo en grados (0-360)
    "altitude" to location.altitude  // ← Altitud en metros
)

supabase.from("locations").upsert(location)  // ✅ UPSERT ya está bien
```

**🔑 CRÍTICO - Dónde obtener operatorUUID:**

La app necesita obtener el UUID REAL del operador de la tabla `operadores` en Supabase.

**Opción 1: Al iniciar sesión**
```kotlin
// Cuando el operador inicia sesión, consultar su UUID
suspend fun loginOperator(operatorNumber: String): Operator? {
    val result = supabase.from("operadores")
        .select()
        .eq("numero_operador", operatorNumber)  // o el campo que uses
        .single()
        .execute()
    
    val operator = result.data
    
    // Guardar en SharedPreferences o DataStore
    val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    prefs.edit().apply {
        putString("operator_uuid", operator.id)  // UUID
        putString("operator_number", operator.numero_operador)  // OP007
        apply()
    }
    
    return operator
}
```

**Opción 2: Consultar antes de enviar ubicación**
```kotlin
// Si no tienes el UUID guardado, consultar
suspend fun getOperatorUUID(operatorNumber: String): String? {
    return try {
        val result = supabase.from("operadores")
            .select("id")
            .eq("numero_operador", operatorNumber)
            .single()
            .execute()
        
        result.data?.get("id") as? String
    } catch (e: Exception) {
        Log.e("GPS", "Error obteniendo UUID del operador: ${e.message}")
        null
    }
}
```

### Tarea 3: Implementar Throttling (Opcional pero RECOMENDADO)

Para no enviar ubicación en cada cambio de GPS, implementar lógica que solo envíe si:
- Pasó más de 1 minuto desde el último envío
- O se movió más de 50 metros
- Y la precisión del GPS es menor a 20 metros

**Código de ejemplo:**
```kotlin
class LocationManager {
    private var lastSentLocation: Location? = null
    private var lastSentTime: Long = 0
    
    companion object {
        const val MIN_TIME_MS = 60_000L      // 1 minuto
        const val MIN_DISTANCE_M = 50f       // 50 metros
        const val MIN_ACCURACY_M = 20f       // 20 metros precisión
    }
    
    private fun shouldSendLocation(newLocation: Location): Boolean {
        val now = System.currentTimeMillis()
        val lastLoc = lastSentLocation
        
        return when {
            // Primera ubicación siempre se envía
            lastLoc == null -> true
            
            // Si la precisión es mala, no enviar
            newLocation.accuracy > MIN_ACCURACY_M -> false
            
            // Si pasó suficiente tiempo, enviar
            (now - lastSentTime) > MIN_TIME_MS -> true
            
            // Si se movió más de 50 metros, enviar
            lastLoc.distanceTo(newLocation) > MIN_DISTANCE_M -> true
            
            // Si no cumple ninguna condición, no enviar
            else -> false
        }
    }
    
    suspend fun onLocationUpdate(location: Location) {
        if (shouldSendLocation(location)) {
            // Enviar a Supabase
            sendLocationToSupabase(location)
            
            // Actualizar última ubicación enviada
            lastSentLocation = location
            lastSentTime = System.currentTimeMillis()
            
            Log.d("GPS", "✅ Ubicación enviada: ${location.latitude}, ${location.longitude}")
        } else {
            Log.d("GPS", "⏭️  Ubicación omitida por throttling")
        }
    }
    
    private suspend fun sendLocationToSupabase(location: Location) {
        val data = mapOf(
            "operator_id" to operatorUUID,
            "operator_number" to operatorNumber,
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "captured_at" to System.currentTimeMillis(),
            "device_id" to getDeviceId(),
            "accuracy" to location.accuracy,
            "speed" to location.speed,  // m/s
            "heading" to location.bearing,  // grados
            "altitude" to location.altitude  // metros
        )
        
        try {
            supabase.from("locations")
                .upsert(data)
                .execute()
            
            Log.d("GPS", "✅ Ubicación guardada en Supabase")
        } catch (e: Exception) {
            Log.e("GPS", "❌ Error enviando ubicación: ${e.message}")
        }
    }
}
```

---

## 📝 Información Adicional que Puede Necesitar el Agente

### Variables que Debe Obtener

1. **operatorUUID** (String)
   - Es el UUID del operador en la tabla `operadores` de Supabase
   - Ejemplo: `"d3b1506a-6cb2-4275-bf62-da19d7385029"`
   - Debería obtenerse al iniciar sesión o desde SharedPreferences/DataStore

2. **operatorNumber** (String)
   - Es el número visible del operador
   - Ejemplo: `"OP007"`
   - También debería estar guardado al iniciar sesión

3. **deviceId** (String)
   - ID único del dispositivo Android
   - Se puede obtener con:
     ```kotlin
     val deviceId = Settings.Secure.getString(
         context.contentResolver,
         Settings.Secure.ANDROID_ID
     )
     ```

### Dependencias de Supabase

Si el proyecto usa Supabase Kotlin Client:
```kotlin
// En build.gradle.kts
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:1.x.x")
    implementation("io.github.jan-tennert.supabase:realtime-kt:1.x.x")
}
```

### Permisos Necesarios en AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 🎯 RESUMEN DE TAREAS PARA EL AGENTE

```
✅ YA COMPLETADO:
1. ✅ UPSERT ya está implementado (funciona correctamente)
2. ✅ No hay duplicados en la BD

🚨 URGENTE - CORREGIR AHORA:
1. ❌ Cambiar operator_id de "OP007" a UUID real del operador
2. ❌ Agregar valor a operator_number (ahora está NULL)
3. ❌ Agregar campos: accuracy, speed, altitude, heading
4. ❌ Implementar obtención del UUID del operador desde la tabla operadores
5. ⚠️  Opcional: Implementar throttling

📋 PASOS ESPECÍFICOS:
1. Buscar el código que hace: supabase.from("locations").upsert()
2. Antes de enviar la ubicación, obtener el UUID del operador:
   - Opción A: Desde SharedPreferences (si se guardó al login)
   - Opción B: Consultar tabla operadores por numero_operador
3. Modificar el mapOf() para usar operatorUUID en lugar de operatorNumber
4. Agregar operator_number con el valor "OP007", "OP008", etc.
5. Agregar los campos de Location: accuracy, speed, bearing, altitude

⚠️ IMPORTANTE:
- El constraint UNIQUE en operator_id ya está en Supabase
- operator_id DEBE ser UUID (ej: d3b1506a-6cb2-4275-bf62-da19d7385029)
- operator_number es el valor visible (ej: "OP007")
- Sin UUID correcto, el sistema NO podrá encontrar las ubicaciones
```

---

## 🧪 Cómo Probar los Cambios

1. Compilar y ejecutar la app en un dispositivo real (con GPS)
2. Iniciar sesión como operador (ej: OP007)
3. Activar GPS y mover el dispositivo
4. Verificar logs para ver:
   - ✅ "Ubicación enviada"
   - ⏭️  "Ubicación omitida por throttling"
5. En Supabase, ir a Table Editor → locations
6. Verificar que solo haya 1 registro por operador
7. Verificar que el registro se actualice (no se duplique)

---

## 📞 Información de Contacto

- **Proyecto**: Monarca CRM
- **Base de datos**: Supabase
- **Tabla afectada**: `locations`
- **Constraint agregado**: `unique_operator_location` en `operator_id`
- **Fecha de optimización**: 11 de Octubre 2025
- **Registros actuales en BD**: 4 (1 por operador)

---

## 🔗 Archivos de Referencia del Backend

Si necesitas ver la implementación del backend:
- `lib/ubicacion.ts` - Función que consulta ubicaciones
- `components/ModalUbicacionOperador.tsx` - Modal que muestra el mapa
- `app/asignar-operadores/page.tsx` - Página que usa el sistema de ubicación
