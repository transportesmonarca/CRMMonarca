# 📋 MAPEO DE CAMPOS ACTUALES A TABLAS NORMALIZADAS

## 🎯 **TABLA ACTUAL `embarques` → NUEVAS TABLAS**

### **1. EMBARQUES_CORE (Datos Esenciales)**
```sql
-- Campos que van a embarques_core
ACTUAL → NUEVA TABLA
-----------------------------------------------
id                    → embarques_core.id
folio                 → embarques_core.folio  
cliente_id            → embarques_core.cliente_id
operador_id           → embarques_core.operador_id
camion_id             → embarques_core.camion_id
remolque_id           → embarques_core.remolque_id
origen                → embarques_core.origen
destino               → embarques_core.destino
contenido             → embarques_core.contenido
peso                  → embarques_core.peso
estado                → embarques_core.estado
fecha_creacion        → embarques_core.fecha_creacion
updated_at            → embarques_core.updated_at
```

### **2. EMBARQUES_LOGISTICA (Datos de Transporte)**
```sql
-- Campos que van a embarques_logistica
ACTUAL → NUEVA TABLA
-----------------------------------------------
lugar_recolecta       → embarques_logistica.lugar_recolecta
direccion_recolecta   → embarques_logistica.direccion_recolecta
fecha_recolecta       → embarques_logistica.fecha_recolecta
hora_recolecta        → embarques_logistica.hora_recolecta
tiempo_recolecta      → embarques_logistica.tiempo_recolecta
direccion_entrega     → embarques_logistica.direccion_entrega
fecha_entrega         → embarques_logistica.fecha_entrega
hora_entrega          → embarques_logistica.hora_entrega
tiempo_entrega        → embarques_logistica.tiempo_entrega
carta_porte           → embarques_logistica.carta_porte
load_number           → embarques_logistica.load_number
patente_agente_aduanal → embarques_logistica.patente_agente_aduanal
aduana_cruce          → embarques_logistica.aduana_cruce
dueno_mercancia       → embarques_logistica.dueno_mercancia

-- Campos relacionados a remolques manuales
remolque_manual       → embarques_logistica.remolque_manual
remolque_numero_economico → embarques_logistica.remolque_numero_economico
remolque_placa        → embarques_logistica.remolque_placa
```

### **3. EMBARQUES_SERVICIOS (Datos Comerciales)**
```sql
-- Campos que van a embarques_servicios
ACTUAL → NUEVA TABLA
-----------------------------------------------
tipo_servicio_id      → embarques_servicios.tipo_servicio_id
precio_flete          → embarques_servicios.precio_flete
moneda_flete          → embarques_servicios.moneda_flete
currency              → embarques_servicios.moneda_flete (fallback)
quickpaid_enabled     → embarques_servicios.quickpaid_enabled
quickpaid_percent     → embarques_servicios.quickpaid_percent
quickpaid_descuento   → embarques_servicios.quickpaid_descuento
precio_quickpaid      → embarques_servicios.precio_quickpaid
flete_falso           → embarques_servicios.flete_falso
modificado            → embarques_servicios.modificado
pago_operador         → embarques_servicios.pago_operador
```

### **4. EMBARQUES_FACTURACION (Control Administrativo)**
```sql
-- Campos que van a embarques_facturacion
ACTUAL → NUEVA TABLA
-----------------------------------------------
estado_facturacion    → embarques_facturacion.estado_facturacion
fecha_archivado       → embarques_facturacion.fecha_archivado
usuario_archivo       → embarques_facturacion.usuario_archivo
motivo_archivo        → embarques_facturacion.motivo_archivo
observaciones_archivo → embarques_facturacion.observaciones_archivo
fecha_cancelacion     → embarques_facturacion.fecha_cancelacion
cancelado_por         → embarques_facturacion.cancelado_por
motivo_cancelacion    → embarques_facturacion.motivo_cancelacion
fecha_finalizacion    → embarques_facturacion.fecha_finalizacion
```

### **5. EMBARQUES_ENVIOS_CLIENTE (Comunicaciones)**
```sql
-- Campos que se DESCOMPONEN en múltiples registros
ACTUAL → NUEVA TABLA (MÚLTIPLES REGISTROS)
-----------------------------------------------
fecha_envio_cliente   → embarques_envios_cliente (numero_envio=0, fecha_envio)
fecha_envio_cliente_1 → embarques_envios_cliente (numero_envio=1, fecha_envio)
fecha_envio_cliente_2 → embarques_envios_cliente (numero_envio=2, fecha_envio)
fecha_envio_cliente_3 → embarques_envios_cliente (numero_envio=3, fecha_envio)
fecha_envio_cliente_4 → embarques_envios_cliente (numero_envio=4, fecha_envio)

-- Ejemplo de migración:
-- Si fecha_envio_cliente_1 = '2025-01-01' y fecha_envio_cliente_2 = '2025-01-15'
-- Se crean 2 registros en embarques_envios_cliente:
INSERT INTO embarques_envios_cliente VALUES 
  ('uuid1', 'embarque_id', 1, '2025-01-01', 'factura', NULL),
  ('uuid2', 'embarque_id', 2, '2025-01-15', 'seguimiento', NULL);
```

### **6. EMBARQUES_PAGOS (Historial de Pagos)**
```sql
-- Campos que se DESCOMPONEN en múltiples registros
ACTUAL → NUEVA TABLA (MÚLTIPLES REGISTROS)
-----------------------------------------------
referencia_pago       → embarques_pagos (numero_pago=0, referencia_pago)
fecha_pago_1          → embarques_pagos (numero_pago=1, fecha_pago)
referencia_pago_1     → embarques_pagos (numero_pago=1, referencia_pago)
fecha_pago_2          → embarques_pagos (numero_pago=2, fecha_pago)
referencia_pago_2     → embarques_pagos (numero_pago=2, referencia_pago)
fecha_pago_3          → embarques_pagos (numero_pago=3, fecha_pago)
referencia_pago_3     → embarques_pagos (numero_pago=3, referencia_pago)
fecha_pago_4          → embarques_pagos (numero_pago=4, fecha_pago)
referencia_pago_4     → embarques_pagos (numero_pago=4, referencia_pago)

-- Ejemplo de migración:
-- Si fecha_pago_1='2025-01-10', referencia_pago_1='REF001'
-- y fecha_pago_2='2025-01-20', referencia_pago_2='REF002'
-- Se crean 2 registros en embarques_pagos:
INSERT INTO embarques_pagos VALUES 
  ('uuid1', 'embarque_id', 1, '2025-01-10', 'REF001', NULL, 'MXN', NULL, NULL, NULL),
  ('uuid2', 'embarque_id', 2, '2025-01-20', 'REF002', NULL, 'MXN', NULL, NULL, NULL);
```

### **7. EMBARQUES_OBSERVACIONES (Notas y Comentarios)**
```sql
-- Campos que van a embarques_observaciones
ACTUAL → NUEVA TABLA
-----------------------------------------------
observaciones         → embarques_observaciones (tipo_observacion='general', observacion, fecha_creacion)

-- Ejemplo de migración:
-- Si observaciones = 'Cliente solicita entrega urgente'
-- Se crea 1 registro:
INSERT INTO embarques_observaciones VALUES 
  ('uuid', 'embarque_id', 'general', 'Cliente solicita entrega urgente', 'sistema', NOW());
```

### **8. EMBARQUES_REPRESENTANTES (Info de Contactos)**
```sql
-- Campos que van a embarques_representantes
ACTUAL → NUEVA TABLA
-----------------------------------------------
representante_cliente → embarques_representantes.representante_cliente_id
info_representante    → embarques_representantes.info_representante
```

---

## 🔄 **CAMPOS QUE CAMBIAN DE ESTRUCTURA**

### **❌ DE COLUMNAS MÚLTIPLES → ✅ A REGISTROS MÚLTIPLES**

#### **Envíos al Cliente (1:N)**
```sql
-- ANTES: 5 columnas por embarque
fecha_envio_cliente, fecha_envio_cliente_1, fecha_envio_cliente_2, 
fecha_envio_cliente_3, fecha_envio_cliente_4

-- DESPUÉS: N registros por embarque
SELECT * FROM embarques_envios_cliente WHERE embarque_id = 'xxx'
-- Resultado:
-- | id | embarque_id | numero_envio | fecha_envio | tipo_envio | observaciones |
-- |----|-------------|--------------|-------------|------------|---------------|
-- | 1  | xxx         | 1            | 2025-01-01  | factura    | NULL          |
-- | 2  | xxx         | 2            | 2025-01-15  | seguimiento| NULL          |
```

#### **Pagos (1:N)**
```sql
-- ANTES: 8 columnas por embarque
fecha_pago_1, referencia_pago_1, fecha_pago_2, referencia_pago_2,
fecha_pago_3, referencia_pago_3, fecha_pago_4, referencia_pago_4

-- DESPUÉS: N registros por embarque
SELECT * FROM embarques_pagos WHERE embarque_id = 'xxx'
-- Resultado:
-- | id | embarque_id | numero_pago | fecha_pago | referencia_pago | monto_pago | moneda |
-- |----|-------------|-------------|------------|-----------------|------------|--------|
-- | 1  | xxx         | 1           | 2025-01-10 | REF001         | 15000.00   | MXN    |
-- | 2  | xxx         | 2           | 2025-01-20 | REF002         | 8500.00    | USD    |
```

---

## 🎯 **VENTAJAS DEL NUEVO MAPEO**

### **1. Escalabilidad Infinita**
```sql
-- ANTES: Limitado a 4 pagos por embarque
-- Si necesitas un 5to pago → ALTER TABLE (problemático)

-- DESPUÉS: Pagos ilimitados
-- Si necesitas un 5to pago → INSERT (simple)
INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
VALUES ('embarque_id', 5, '2025-02-01', 'REF005');
```

### **2. Consultas Más Específicas**
```sql
-- ANTES: Traer toda la tabla pesada para ver solo precios
SELECT precio_flete, moneda_flete FROM embarques WHERE folio = 'TIM-2509-028';
-- Carga 60+ columnas innecesarias

-- DESPUÉS: Consulta específica y rápida
SELECT precio_flete, moneda_flete FROM embarques_servicios es
JOIN embarques_core ec ON es.embarque_id = ec.id 
WHERE ec.folio = 'TIM-2509-028';
-- Solo carga 2 columnas necesarias
```

### **3. Mantenimiento Por Dominio**
```sql
-- ANTES: Un bug en cálculo de pagos afecta toda la tabla embarques
-- DESPUÉS: Bug en pagos solo afecta tabla embarques_pagos

-- ANTES: Backup de toda tabla embarques (pesado)  
-- DESPUÉS: Backup específico por funcionalidad
```

### **4. Integridad Referencial Mejorada**
```sql
-- ANTES: No hay validación entre fecha_pago_1 y referencia_pago_1
-- DESPUÉS: Validación a nivel de fila
ALTER TABLE embarques_pagos ADD CONSTRAINT check_pago_completo 
CHECK ((fecha_pago IS NOT NULL AND referencia_pago IS NOT NULL) OR 
       (fecha_pago IS NULL AND referencia_pago IS NULL));
```

---

## ⚡ **COMPATIBILIDAD CON CÓDIGO ACTUAL**

La vista `embarques` mantiene exactamente la misma interfaz:

```sql
-- Tu código actual seguirá funcionando igual:
SELECT folio, precio_flete, fecha_pago_1, referencia_pago_1 
FROM embarques 
WHERE estado = 'completado';

-- Pero internamente usará las tablas normalizadas para mejor rendimiento
```

**¿Te parece claro el mapeo? ¿Algún campo que te gustaría que ajustemos antes de proceder?**