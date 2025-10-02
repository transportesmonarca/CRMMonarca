# 🎯 CONFIGURACIÓN EMBARQUES CANCELADOS - FACTURACIÓN Y COBRANZA

## ✅ Cambios Implementados

### 1. **Visualización de Embarques Cancelados**
- **Antes**: Los embarques cancelados se ocultaban completamente de la lista
- **Después**: Los embarques cancelados se mantienen visibles con badge "Cancelado"

### 2. **Control de Visualización**
```typescript
// CAMBIO: Por defecto mostrar embarques cancelados
const [controlMostrarCancelados, setControlMostrarCancelados] = useState(true); // ✅ true por defecto
```

### 3. **Actualización del Estado Local**
```typescript
// ANTES: Remover embarque de la lista
const actualizados = embarquesAsignados.filter((e) => e.id !== embarque.id);

// DESPUÉS: Mantener embarque y marcar como cancelado
const actualizados = embarquesAsignados.map((e) => 
  e.id === embarque.id 
    ? { 
        ...e, 
        estado: "cancelado",
        estado_facturacion: "archivado",
        fecha_cancelacion: fechaCancelacion,
        usuario_cancelacion: usuarioCancelacion,
        motivo_cancelacion: motivo || "Cancelado desde facturación y cobranza",
        updated_at: fechaCancelacion
      }
    : e
);
```

### 4. **Lógica de Botones (YA EXISTÍA)**
La lógica de botones ya estaba correctamente implementada:

```typescript
// Botón ARCHIVAR - se muestra cuando el embarque está cancelado
{(embarque.estado_facturacion === "pagado" ||
  (embarque.pagado && (embarque as any).estado_facturacion == null) ||
  esCancelado(embarque)) && (
  <Button onClick={archivar}>Archivar</Button>
)}

// Botón CANCELAR - se oculta cuando el embarque está cancelado  
{(embarque.estado?.startsWith("finalizado") || 
  embarque.estado === "asignado" || 
  embarque.estado === "en-transito") && 
  !esCancelado(embarque) && (
  <Button onClick={cancelar}>Cancelar</Button>
)}
```

### 5. **Badge "Cancelado" (YA EXISTÍA)**
El badge ya estaba implementado correctamente:

```typescript
{esCancelado(e) && (
  <Badge className="bg-purple-600 text-white">Cancelado</Badge>
)}
```

## 🔍 Función de Detección `esCancelado()` (YA EXISTÍA)

La función ya era robusta y detecta embarques cancelados por múltiples criterios:

```typescript
const esCancelado = (emb: any) => {
  const estado = (emb.estado || emb.estado_facturacion || "").toString().toLowerCase();
  const hasCancelDate = Boolean(emb.fecha_cancelacion || emb.fechaCancelacion);
  const hasCancelBy = Boolean(emb.cancelado_por || emb.usuario_cancelacion);
  const containsCancelKeyword = /CANCELA|CANCELADO|CANCELACIÓN/.test(observaciones);
  
  return Boolean(
    estado.includes('cancel') ||
    estado === 'cancelado' ||
    hasCancelDate ||
    hasCancelBy ||
    containsCancelKeyword
  );
};
```

## 🎯 Comportamiento Final

### **Embarque Normal (No Cancelado)**
- ❌ Sin badge "Cancelado"
- ✅ Botón "Cancelar" visible (si cumple condiciones)
- ❌ Botón "Archivar" oculto (a menos que esté pagado)

### **Embarque Cancelado**
- ✅ Badge "Cancelado" morado visible
- ❌ Botón "Cancelar" oculto
- ✅ Botón "Archivar" visible y habilitado

### **Checkbox de Control**
- ✅ Por defecto marcado (muestra cancelados)
- ✅ Usuario puede desmarcarlo para ocultarlos
- ✅ Funciona tanto en vista desktop como móvil

## 📱 Compatibilidad Multi-Dispositivo

### **Vista Desktop**
- ✅ Badge en columna "Contingencia"
- ✅ Botones en columna "Acciones"
- ✅ Control checkbox en filtros

### **Vista Móvil** 
- ✅ Badge junto al folio
- ✅ Botones en card footer
- ✅ Misma lógica aplicada

## 🧪 Validación Realizada

### **Script de Verificación**: `verificar-cancelados-ui.js`
- ✅ Encontrado 1 embarque cancelado: `TIM-2509-002`
- ✅ Badge "Cancelado": Mostrado correctamente
- ✅ Botón "Archivar": Habilitado 
- ✅ Botón "Cancelar": Oculto correctamente
- ✅ Embarques normales: Comportamiento esperado

## 🚀 Resultado

Los embarques cancelados ahora:

1. **SE MANTIENEN VISIBLES** en la lista por defecto
2. **MUESTRAN BADGE MORADO** "Cancelado" 
3. **HABILITAN BOTÓN "Archivar"** para moverlos al historial
4. **OCULTAN BOTÓN "Cancelar"** para evitar doble cancelación
5. **RESPETAN EL CONTROL** checkbox para mostrar/ocultar

La funcionalidad está **completamente implementada y funcionando** según los requerimientos.