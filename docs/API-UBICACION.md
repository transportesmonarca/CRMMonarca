# API de Ubicación en Tiempo Real - Documentación

## Descripción General

El sistema de ubicación en tiempo real permite a las aplicaciones móviles enviar coordenadas GPS de los operadores y al CRM web mostrar estas ubicaciones en mapas interactivos usando Google Maps.

**Arquitectura:**
```
App Móvil → API REST → Supabase → CRM Web → Google Maps
```

---

## Endpoints Disponibles

### 1. Insertar/Obtener Ubicación Individual

**URL:** `/api/ubicacion`

#### POST - Insertar Nueva Ubicación
Permite a las apps móviles enviar la ubicación actual de un operador.

**Parámetros del Body (JSON):**
```json
{
  "operator_number": "001",        // Requerido: Número del operador
  "latitude": 19.432608,          // Requerido: Latitud (-90 a 90)
  "longitude": -99.133209,        // Requerido: Longitud (-180 a 180)
  "device_id": "device_001_ios"   // Opcional: Identificador del dispositivo
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Ubicación actualizada para Juan Pérez (001)",
  "data": {
    "id": 123,
    "operator_number": "001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "captured_at": "2024-01-15T14:30:00.000Z",
    "operador": {
      "nombre": "Juan",
      "apellidos": "Pérez"
    }
  }
}
```

**Errores Posibles:**
- `400`: Campos faltantes o coordenadas inválidas
- `404`: Operador no encontrado
- `500`: Error interno del servidor

#### GET - Obtener Última Ubicación
Obtiene la ubicación más reciente de un operador específico.

**Parámetros Query:**
- `operator_number`: Número del operador (requerido)

**Ejemplo:**
```
GET /api/ubicacion?operator_number=001
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "operator_number": "001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "captured_at": "2024-01-15T14:30:00.000Z",
    "device_id": "device_001_ios",
    "operador": {
      "nombre": "Juan",
      "apellidos": "Pérez",
      "telefono": "5555551234"
    }
  }
}
```

---

### 2. Ubicaciones Múltiples

**URL:** `/api/ubicacion/multiple`

#### POST - Insertar Múltiples Ubicaciones
Permite enviar múltiples ubicaciones en una sola petición (máximo 100).

**Parámetros del Body (JSON):**
```json
{
  "ubicaciones": [
    {
      "operator_number": "001",
      "latitude": 19.432608,
      "longitude": -99.133209,
      "device_id": "device_001_ios"
    },
    {
      "operator_number": "002",
      "latitude": 19.433731,
      "longitude": -99.171631,
      "device_id": "device_002_android"
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "2 ubicaciones insertadas exitosamente",
  "stats": {
    "total_enviadas": 2,
    "insertadas_exitosamente": 2,
    "operadores_rechazados": 0,
    "operadores_procesados": 2
  }
}
```

#### GET - Obtener Ubicaciones Recientes
Obtiene todas las ubicaciones capturadas en las últimas X horas.

**Parámetros Query:**
- `limit`: Número máximo de registros (default: 50, max: 500)
- `horas`: Horas hacia atrás a consultar (default: 24)

**Ejemplo:**
```
GET /api/ubicacion/multiple?limit=100&horas=12
```

**Respuesta:**
```json
{
  "success": true,
  "message": "15 ubicaciones encontradas",
  "stats": {
    "total_ubicaciones": 15,
    "horas_consultadas": 12,
    "operadores_unicos": 5
  },
  "data": [
    {
      "id": 123,
      "operator_number": "001",
      "latitude": 19.432608,
      "longitude": -99.133209,
      "captured_at": "2024-01-15T14:30:00.000Z",
      "operadores": {
        "nombre": "Juan",
        "apellidos": "Pérez",
        "telefono": "5555551234"
      }
    }
  ]
}
```

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 400 | Parámetros inválidos o faltantes |
| 404 | Operador no encontrado |
| 500 | Error interno del servidor |

---

## Ejemplos de Uso

### Desde JavaScript/TypeScript

```typescript
// Enviar ubicación individual
async function enviarUbicacion(operatorNumber: string, lat: number, lng: number) {
  const response = await fetch('/api/ubicacion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operator_number: operatorNumber,
      latitude: lat,
      longitude: lng,
      device_id: 'my_device_id'
    })
  });
  
  const result = await response.json();
  return result;
}

// Obtener última ubicación
async function obtenerUbicacion(operatorNumber: string) {
  const response = await fetch(`/api/ubicacion?operator_number=${operatorNumber}`);
  const result = await response.json();
  return result;
}
```

### Desde cURL

```bash
# Enviar ubicación
curl -X POST http://localhost:3000/api/ubicacion \
  -H "Content-Type: application/json" \
  -d '{
    "operator_number": "001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "device_id": "test_device"
  }'

# Obtener ubicación
curl "http://localhost:3000/api/ubicacion?operator_number=001"
```

---

## Base de Datos

### Tabla `locations`

```sql
CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,
    operator_number VARCHAR(10) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    device_id VARCHAR(255),
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_operator 
        FOREIGN KEY (operator_number) 
        REFERENCES operadores(operator_number)
);

-- Índices para optimizar consultas
CREATE INDEX idx_locations_operator_number ON locations(operator_number);
CREATE INDEX idx_locations_captured_at ON locations(captured_at);
CREATE INDEX idx_locations_operator_time ON locations(operator_number, captured_at);
```

---

## Seguridad y Mejores Prácticas

1. **Validación de Coordenadas:** El API valida que las coordenadas estén dentro de rangos válidos
2. **Límites de Tasa:** Se recomienda implementar rate limiting para evitar spam
3. **Autenticación:** Considerar implementar API keys para apps móviles
4. **Retención de Datos:** Implementar limpieza automática de ubicaciones antiguas
5. **Precisión:** Las coordenadas se almacenan con precisión suficiente para uso urbano

---

## Troubleshooting

### Error: "Operador no encontrado"
- Verificar que el `operator_number` exista en la tabla `operadores`
- El campo es case-sensitive

### Error: "Coordenadas no válidas"
- Latitud debe estar entre -90 y 90
- Longitud debe estar entre -180 y 180

### Ubicaciones no aparecen en el mapa
- Verificar que Google Maps API key esté configurada
- Revisar que las coordenadas sean recientes (últimas 24 horas por defecto)
- Confirmar que el operador tenga ubicaciones en la base de datos

---

## Testing

Ejecutar el script de prueba para insertar datos de ejemplo:

```sql
-- En Supabase SQL Editor o psql
\i scripts/insertar-ubicaciones-prueba-completo.sql
```

Este script insertará ubicaciones de prueba para operadores 001-010 en diferentes zonas de Ciudad de México.