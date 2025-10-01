# Estado Desacoplado - Ruta Deshabilitada

## ¿Por qué está deshabilitada?

Esta ruta API fue deshabilitada porque dependía de funciones SQL que fueron eliminadas o modificadas en Supabase:

- `completar_embarque()`
- `asignar_operador()`
- `iniciar_transito()`
- `finalizar_embarque()`
- `archivar_embarque()`
- `cancelar_embarque()`

## Alternativas actuales

Para cambios de estado de embarques, usar:
- `/api/embarques/estado` - Cambios de estado estándar
- Frontend directo con Supabase client

## Para reactivar

1. Restaurar las funciones SQL en Supabase
2. Renombrar `route.ts.disabled` a `route.ts`
3. Probar los endpoints

## Estado actual

❌ **DESHABILITADA** - No afecta la funcionalidad del sistema