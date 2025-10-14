# 📍 Sistema de Ubicación de Operadores - Resumen de Configuración

## ✅ Estado Actual

### Google Maps API
- **Estado**: ✅ Activada y funcionando
- **API Key**: Configurada en `.env.local`
- **Carga del mapa**: ✅ Exitosa

### Base de Datos
- **Tabla locations**: ✅ Creada y con datos de prueba
- **Operadores configurados**: 5 operadores con `operator_number` asignados (001-005)
- **Ubicaciones disponibles**: 5 ubicaciones en Ciudad de México

### Embarque de Prueba
- **Folio**: `PRUEBA-UBI-1110-2251`
- **Operador**: Luis (operator_number: 001)
- **Estado**: en_transito
- **Ubicación disponible**: ✅ Sí (Centro Histórico CDMX)

## 🔍 Cómo Probar el Sistema

### 1. Abrir la página
```
http://localhost:3002/asignar-operadores
```

### 2. Buscar el embarque de prueba
- En el buscador, escribe: `PRUEBA-UBI-1110-2251`
- O busca embarques con operador "Luis"

### 3. Hacer click en "Ubicación"
- En la tarjeta del embarque, busca el botón "Ubicación del Operador"
- Haz click en el botón
- Se abrirá un modal con Google Maps

### 4. Ver los logs en la consola del navegador
Abre las herramientas de desarrollo (F12 o Cmd+Option+I) y ve a la pestaña "Console".

Deberías ver logs como:
```
🔍 [DEBUG] ====== INICIO handleMostrarUbicacion ======
🔍 [DEBUG] Embarque.folio: PRUEBA-UBI-1110-2251
🔍 [DEBUG] Operador.operator_number: 001
✅ [DEBUG] Ubicación encontrada!
✅ [DEBUG] Latitud: 19.432608
✅ [DEBUG] Longitud: -99.133209
🗺️  [MODAL] isOpen: true
🗺️  [MODAL] ubicacion: {...}
```

## 📊 Datos de Prueba Disponibles

### Operadores con Ubicación

| Operador | Número | Nombre | Ubicación |
|----------|--------|--------|-----------|
| 001 | 001 | Luis | Centro Histórico CDMX (19.432608, -99.133209) |
| 002 | 002 | Luis González | Polanco (19.433731, -99.171631) |
| 003 | 003 | Ana Sofía | Roma Norte (19.418792, -99.162789) |
| 004 | 004 | Guillermo | Aeropuerto (19.436303, -99.072097) |
| 005 | 005 | Luis Miguel | Santa Fe (19.359838, -99.25915) |

## 🛠️ Scripts Disponibles

### Ver ubicaciones disponibles
```bash
node scripts/diagnostico-estructura-tablas.js
```

### Crear más ubicaciones de prueba
```bash
node scripts/insertar-ubicacion-prueba.js
```

### Crear embarques de prueba con ubicación
```bash
node scripts/crear-embarque-con-ubicacion.js
```

### Asignar operator_number a operadores
```bash
node scripts/asignar-operator-number.js
```

### Verificar configuración de Google Maps
```bash
node scripts/diagnostico-google-maps.js
```

## 🔧 Troubleshooting

### El mapa no se muestra
1. Verifica que la API key esté en `.env.local`
2. Reinicia el servidor Next.js
3. Limpia el caché del navegador (Ctrl+Shift+Delete)
4. Verifica en la consola si hay errores de Google Maps

### No aparecen las coordenadas
1. Verifica que el operador tenga `operator_number` asignado
2. Verifica que exista una ubicación en la tabla `locations` para ese `operator_number`
3. Revisa los logs en la consola del navegador
4. Ejecuta el script de diagnóstico:
```bash
node scripts/diagnostico-estructura-tablas.js
```

### El botón "Ubicación" no aparece
El botón solo aparece para embarques con estado:
- `asignado*`
- `en-transito*`
- `listo-para-asignar*`

## 📝 Flujo Completo del Sistema

```
1. Usuario hace click en "Ubicación del Operador"
   ↓
2. Se ejecuta handleMostrarUbicacion(embarque)
   ↓
3. Se extrae operator_number del embarque.operador
   ↓
4. Se llama a obtenerUltimaUbicacionOperador(operator_number)
   ↓
5. Se consulta la tabla locations con ese operator_number
   ↓
6. Se obtiene la última ubicación (ordenada por captured_at DESC)
   ↓
7. Se abre el modal con los datos
   ↓
8. El modal inicializa Google Maps
   ↓
9. Se muestra el marcador en las coordenadas
   ↓
10. Usuario ve el mapa con la ubicación del operador
```

## 🎯 Próximos Pasos

### Para Producción
1. Agregar API real de captura de ubicaciones desde app móvil
2. Implementar actualizaciones en tiempo real (WebSockets o Polling)
3. Agregar historial de ubicaciones
4. Implementar rutas y tracking en tiempo real
5. Agregar notificaciones cuando el operador llegue a destino

### Mejoras Opcionales
- [ ] Mostrar múltiples operadores en el mismo mapa
- [ ] Agregar filtros de tiempo (última hora, último día, etc.)
- [ ] Mostrar ruta desde origen hasta destino
- [ ] Calcular ETA basado en ubicación actual
- [ ] Agregar geocodificación inversa (dirección legible)

## 📚 Archivos Importantes

```
CRMMonarca/
├── .env.local                           # API Keys
├── app/
│   └── asignar-operadores/
│       └── page.tsx                     # Página principal (handleMostrarUbicacion)
├── components/
│   └── ModalUbicacionOperador.tsx       # Modal con Google Maps
├── lib/
│   └── ubicacion.ts                     # Función obtenerUltimaUbicacionOperador
└── scripts/
    ├── diagnostico-estructura-tablas.js # Diagnóstico completo
    ├── crear-embarque-con-ubicacion.js  # Crear embarques de prueba
    ├── asignar-operator-number.js       # Asignar números a operadores
    └── insertar-ubicacion-prueba.js     # Insertar ubicaciones de prueba
```

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del navegador (F12)
2. Ejecuta el script de diagnóstico
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de que el servidor Next.js esté corriendo en el puerto 3002

---

**Última actualización**: 11 de Octubre, 2025  
**Estado del sistema**: ✅ Operacional  
**Versión**: 1.0.0
