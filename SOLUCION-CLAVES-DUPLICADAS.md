# 🔧 CORRECCIÓN: Error de claves duplicadas en React

## 🚨 PROBLEMA IDENTIFICADO
```
Error: Encountered two children with the same key, `81cb5086-3858-4ff6-8320-dcdf0e1749de`. 
Keys should be unique so that components maintain their identity across updates.
```

## 🔍 CAUSA RAÍZ
El error ocurría porque al cargar embarques de ambas tablas (`embarques` y `embarques_nuevo`), algunos embarques podían aparecer duplicados con el mismo ID, causando claves duplicadas en los componentes React.

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. **Deduplicación en cargarDatos()**
```typescript
// Deduplicar embarques por ID (preferir normalizado sobre legacy)
const embarquesUnicos = new Map();
todosLosEmbarques.forEach(embarque => {
  const existing = embarquesUnicos.get(embarque.id);
  if (!existing) {
    // Si no existe, agregar
    embarquesUnicos.set(embarque.id, embarque);
  } else if (embarque._fuente === 'normalizado' && existing._fuente === 'legacy') {
    // Si el nuevo es normalizado y el existente es legacy, reemplazar
    embarquesUnicos.set(embarque.id, embarque);
  } else if (embarque._fuente === 'legacy' && existing._fuente === 'normalizado') {
    // Si el nuevo es legacy y el existente es normalizado, mantener el existente
    // No hacer nada
  }
});

const embarquesDeduplicated = Array.from(embarquesUnicos.values());
```

### 2. **Deduplicación en cargarEmbarquesFinalizados()**
Aplicada la misma lógica de deduplicación para embarques finalizados.

### 3. **Claves únicas en componentes React**

#### Para embarques principales:
```tsx
{embarquesPaginados.map((embarque) => (
  <Card
    key={`${embarque.id}-${(embarque as any)._fuente || 'legacy'}`}
    id={`embarque-card-${embarque.id}`}
    // ...
  >
```

#### Para embarques finalizados:
```tsx
{embarquesFinalizadosPaginados.map((embarque) => (
  <tr key={`${embarque.id}-${(embarque as any)._fuente || 'legacy'}-completed`}>
```

## 🎯 LÓGICA DE PREFERENCIA
Al encontrar embarques duplicados entre tablas:
- **Preferir `normalizado`** sobre `legacy`
- Mantener solo una instancia por ID
- Preservar información de fuente (`_fuente`)

## 🔄 FLUJO CORREGIDO

### ANTES (❌ PROBLEMÁTICO):
1. Cargar de `embarques` → `[{id: "123", _fuente: "legacy"}]`
2. Cargar de `embarques_nuevo` → `[{id: "123", _fuente: "normalizado"}]` 
3. Combinar → `[{id: "123"}, {id: "123"}]` ← ❌ DUPLICADOS
4. React render → Error de claves duplicadas

### DESPUÉS (✅ SOLUCIONADO):
1. Cargar de `embarques` → `[{id: "123", _fuente: "legacy"}]`
2. Cargar de `embarques_nuevo` → `[{id: "123", _fuente: "normalizado"}]`
3. Deduplicar → `[{id: "123", _fuente: "normalizado"}]` ← ✅ ÚNICO
4. React render → Clave única: `"123-normalizado"`

## 📊 ARCHIVOS MODIFICADOS
- ✅ `app/asignar-operadores/page.tsx` - Deduplicación y claves únicas
- ✅ `probar-flujo-listo-para-asignar.js` - Script de prueba actualizado

## 🧪 VERIFICACIÓN
El error de claves duplicadas debe estar resuelto y los embarques deben aparecer correctamente sin duplicados en la página de asignación.

## ⚡ BENEFICIOS ADICIONALES
1. **Rendimiento mejorado** - Menos elementos DOM duplicados
2. **Datos consistentes** - Preferencia por tabla normalizada
3. **Mantenibilidad** - Código más robusto ante duplicados
4. **UX mejorada** - Sin errores de consola para el usuario