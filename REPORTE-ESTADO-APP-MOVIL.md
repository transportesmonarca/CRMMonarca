# 🚨 REPORTE: Estado de la Integración App Móvil - Supabase

**Fecha:** 12 de Octubre 2025, 4:37 AM  
**Estado:** ⚠️ PARCIALMENTE FUNCIONAL

---

## ✅ Lo que SÍ funciona

1. **UPSERT implementado correctamente**
   - La app usa `.upsert()` en lugar de `.insert()`
   - Solo hay 1 registro por operador (no hay duplicados)
   - Las ubicaciones se actualizan correctamente

2. **Campos básicos funcionando**
   - ✅ latitude
   - ✅ longitude
   - ✅ device_id
   - ✅ captured_at
   - ✅ updated_at

3. **Constraint UNIQUE funcionando**
   - No permite duplicados
   - Base de datos optimizada

---

## ❌ Lo que NO funciona

### 🚨 Problema #1: operator_id incorrecto (CRÍTICO)

**Estado actual:**
```
operator_id = "OP007"  ❌ Número del operador
```

**Estado requerido:**
```
operator_id = "d3b1506a-6cb2-4275-bf62-da19d7385029"  ✅ UUID real
```

**Impacto:** El CRM web NO puede encontrar las ubicaciones porque busca por UUID del operador.

---

### 🚨 Problema #2: operator_number está NULL

**Estado actual:**
```
operator_number = null  ❌
```

**Estado requerido:**
```
operator_number = "OP007"  ✅
```

**Impacto:** No hay forma de identificar visualmente qué operador es.

---

### ⚠️ Problema #3: Campos adicionales vacíos

**Campos faltantes:**
- `accuracy` = NULL (debería ser la precisión del GPS en metros)
- `speed` = NULL (debería ser la velocidad en m/s)
- `altitude` = NULL (debería ser la altitud en metros)
- `heading` = NULL (debería ser el rumbo en grados 0-360)

**Impacto:** Información de calidad de GPS no disponible.

---

## 📊 Datos Actuales en Supabase

```
Total de registros: 4
Operadores únicos: 4
Promedio por operador: 1.00 ✅

Últimos registros:
┌─────┬─────────┬──────────────────────┬─────────────────────────┐
│ ID  │ Op Num  │ operator_id          │ Última actualización    │
├─────┼─────────┼──────────────────────┼─────────────────────────┤
│ 1   │ N/A     │ OP007 ❌             │ 12/10/2025, 4:37:20 AM  │
│ 2   │ N/A     │ OP008 ❌             │ 12/10/2025, 4:37:20 AM  │
│ 3   │ N/A     │ ID_DE_OPERADOR_REAL ❌│ 12/10/2025, 4:37:20 AM  │
│ 4   │ N/A     │ OP-001 ❌            │ 12/10/2025, 4:37:20 AM  │
└─────┴─────────┴──────────────────────┴─────────────────────────┘

⚠️ Ningún registro tiene UUID válido en operator_id
⚠️ Todos tienen operator_number = NULL
```

---

## 🎯 Solución Requerida

### En Android Studio:

#### 1. Obtener el UUID del operador

**Al iniciar sesión:**
```kotlin
suspend fun loginOperator(numero: String) {
    val operator = supabase.from("operadores")
        .select("id, numero_operador")
        .eq("numero_operador", numero)
        .single()
        .execute()
    
    // Guardar para uso posterior
    SharedPrefs.saveOperatorUUID(operator.data.id)
    SharedPrefs.saveOperatorNumber(operator.data.numero_operador)
}
```

#### 2. Modificar el envío de ubicación

**Código actual (incorrecto):**
```kotlin
val location = mapOf(
    "operator_id" to "OP007",  // ❌
    "operator_number" to null,  // ❌
    "latitude" to lat,
    "longitude" to lng
    // Faltan campos
)
```

**Código correcto:**
```kotlin
val operatorUUID = SharedPrefs.getOperatorUUID()  // Obtener UUID guardado
val operatorNumber = SharedPrefs.getOperatorNumber()  // Obtener número guardado

val location = mapOf(
    "operator_id" to operatorUUID,  // ✅ UUID real
    "operator_number" to operatorNumber,  // ✅ "OP007"
    "latitude" to loc.latitude,
    "longitude" to loc.longitude,
    "accuracy" to loc.accuracy,  // ✅ Nuevo
    "speed" to loc.speed,  // ✅ Nuevo
    "altitude" to loc.altitude,  // ✅ Nuevo
    "heading" to loc.bearing,  // ✅ Nuevo
    "captured_at" to System.currentTimeMillis(),
    "device_id" to deviceId
)

supabase.from("locations").upsert(location).execute()  // ✅ UPSERT ya está bien
```

---

## 📝 Checklist para Android Studio

```
✅ COMPLETADO:
[✅] Cambiar INSERT por UPSERT

❌ PENDIENTE:
[❌] Obtener UUID del operador (consultar tabla operadores)
[❌] Guardar UUID en SharedPreferences/DataStore
[❌] Cambiar operator_id de "OP007" a UUID real
[❌] Agregar valor a operator_number ("OP007")
[❌] Agregar campo accuracy
[❌] Agregar campo speed
[❌] Agregar campo altitude
[❌] Agregar campo heading
[⚠️] Implementar throttling (opcional pero recomendado)

🧪 TESTING:
[❌] Compilar y probar en dispositivo real
[❌] Verificar logs que muestren UUID correcto
[❌] Verificar en Supabase que operator_id sea UUID
[❌] Verificar que operator_number tenga valor
[❌] Verificar que campos adicionales tengan datos
```

---

## 🔍 Dónde Buscar en el Proyecto Android

**Archivos probables:**
- `LocationService.kt`
- `GPSTracker.kt`
- `LocationManager.kt`
- `LocationRepository.kt`
- `SupabaseClient.kt`

**Buscar por:**
- `supabase.from("locations")`
- `.upsert(`
- `"operator_id"`
- `"latitude"`

---

## 📞 Información de Soporte

**Tabla Supabase:** `locations`
**Constraint:** `unique_operator_location` en columna `operator_id`
**Tipo de dato operator_id:** TEXT (acepta UUID)
**Formato UUID esperado:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Ejemplo de UUID válido:**
```
d3b1506a-6cb2-4275-bf62-da19d7385029
```

**Ejemplos de valores incorrectos:**
```
❌ "OP007"
❌ "OP008"
❌ "ID_DE_OPERADOR_REAL"
❌ "OP-001"
```

---

## 🚀 Próximos Pasos

1. **Inmediato:** Abrir el proyecto Android en Android Studio
2. **Usar el agente:** Copiar el contenido de `PROMPT-PARA-ANDROID-STUDIO.md`
3. **Implementar:** Los cambios sugeridos por el agente
4. **Probar:** Compilar y verificar en dispositivo real
5. **Validar:** Ejecutar `verificar-estado-locations.js` para confirmar

---

## ✅ Criterio de Éxito

La implementación será exitosa cuando:

```
✅ operator_id contenga UUID válido (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
✅ operator_number contenga el número visible ("OP007", "OP008", etc.)
✅ accuracy tenga valor numérico en metros
✅ speed tenga valor numérico en m/s
✅ altitude tenga valor numérico en metros
✅ heading tenga valor numérico en grados (0-360)
✅ Solo 1 registro por operador en la tabla locations
✅ El CRM web pueda mostrar las ubicaciones correctamente
```

---

**Generado:** 12 de Octubre 2025  
**Script de verificación:** `scripts/verificar-estado-locations.js`
