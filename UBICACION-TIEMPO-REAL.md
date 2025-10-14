# 📍 Sistema de Ubicación en Tiempo Real - CRM Monarca

## 🚀 Funcionalidades Implementadas

### 1. **Botón de Ubicación en Asignación de Embarques**
- Ubicado en los cards de embarques en estado "asignado", "en-transito" o "listo-para-asignar"
- Al hacer clic, consulta automáticamente la última ubicación del operador asignado

### 2. **Modal Interactivo con Google Maps**
- **Información del operador**: Nombre completo, número de operador, teléfono
- **Mapa de Google Maps**: Centrado en la ubicación del operador con marcador personalizado
- **Timestamp**: Muestra cuándo fue capturada la ubicación (ej: "Hace 5 minutos")
- **Coordenadas**: Latitud y longitud exactas

### 3. **Manejo de Errores Robusto**
- Operador sin ubicación disponible
- Errores de conexión con Supabase
- Errores de carga de Google Maps
- Coordenadas inválidas

## 📋 Configuración Requerida

### 1. **Base de Datos (Supabase)**

#### Ejecutar migración de operador_number:
```sql
-- En Supabase SQL Editor
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS operator_number TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_operadores_operator_number_unique 
ON operadores (operator_number) WHERE operator_number IS NOT NULL;
```

#### Crear tabla locations:
```sql
-- Ejecutar script: scripts/create-locations-table.sql
-- Incluye la creación de tabla, índices y ejemplos de datos de prueba
```

### 2. **API Keys Configuradas**
- ✅ **Google Maps API**: `AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo`
- ✅ **Supabase URL**: `https://gtuficayhiyzpfkvqgip.supabase.co`

## 🔄 Flujo de Uso

1. **Usuario va a "Asignar Operadores"**
2. **Selecciona un embarque con operador asignado**
3. **Hace clic en botón "Ubicación"**
4. **El sistema:**
   - Identifica automáticamente el operador del embarque
   - Consulta la última ubicación desde tabla `locations`
   - Abre modal con mapa centrado en las coordenadas
   - Muestra información completa del operador

## 📱 Integración con App Móvil

### Estructura de datos locations:
```sql
locations {
  id: UUID (Primary Key)
  operator_id: UUID (Foreign Key → operadores.id)
  latitude: DECIMAL(10,8)
  longitude: DECIMAL(11,8) 
  captured_at: TIMESTAMP WITH TIME ZONE
  device_id: TEXT (opcional)
}
```

### Para que la app móvil envíe ubicaciones:
```javascript
// Ejemplo de endpoint para recibir ubicaciones
POST /api/locations
{
  "operator_id": "uuid-del-operador",
  "latitude": 19.432608,
  "longitude": -99.133209,
  "device_id": "android_device_123"
}
```

## 🛠 Archivos Creados/Modificados

### **Nuevos archivos:**
- `lib/ubicacion.ts` - Funciones para consultar ubicaciones
- `components/ModalUbicacionOperador.tsx` - Componente modal con Google Maps  
- `scripts/create-locations-table.sql` - Script de migración de BD

### **Archivos modificados:**
- `app/asignar-operadores/page.tsx` - Integración completa del botón y modal
- `app/embarques/page.tsx` - Número de operador en detalles del embarque
- `app/operadores/page.tsx` - Sistema completo de numeración automática

## 🎯 Estados del Botón

- **"Ubicación"** - Estado normal, listo para consultar
- **"Cargando..."** - Consultando ubicación en Supabase
- **Deshabilitado** - Durante la carga para evitar múltiples consultas

## ⚡ Optimizaciones Implementadas

- **Consulta eficiente**: `ORDER BY captured_at DESC LIMIT 1` para última ubicación
- **Índices de BD**: Optimizados para `operator_id` y `captured_at`
- **Carga condicional**: Google Maps se carga solo cuando es necesario
- **Caché de componentes**: Modal se reutiliza para múltiples consultas

## 🔧 Resolución de Problemas

### Modal no abre:
- Verificar que el embarque tiene `operator_id` asignado
- Revisar console.log para errores de Supabase

### Mapa no carga:
- Verificar API Key de Google Maps activa
- Revisar permisos de dominio en Google Cloud Console
- Verificar conexión a internet

### No se encuentra ubicación:
- Verificar que existen registros en tabla `locations` para el operador
- Asegurar que `operator_id` coincide con ID real del operador

## 🚀 Próximos Pasos Sugeridos

1. **API endpoint** para recibir ubicaciones desde app móvil
2. **Actualización automática** de ubicaciones cada X minutos
3. **Historial de ubicaciones** con trayectoria en el mapa
4. **Notificaciones** cuando operador llega a destino
5. **Geofencing** para áreas específicas

---

¡La funcionalidad está completamente implementada y lista para usar! 🎉