# 📚 Manual de Usuario Completo - CRM Monarca

> **Versión:** 8.0  
> **Fecha:** Octubre 2024  
> **Sistema:** CRM Transportes Monarca  

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Panel Principal](#panel-principal)
4. [Módulo de Embarques](#módulo-de-embarques)
5. [Asignación de Operadores](#asignación-de-operadores)
6. [Gestión de Operadores](#gestión-de-operadores)
7. [Gestión de Camiones](#gestión-de-camiones)
8. [Gestión de Remolques](#gestión-de-remolques)
9. [Gestión de Clientes](#gestión-de-clientes)
10. [Facturación y Cobranza](#facturación-y-cobranza)
11. [Recordatorios](#recordatorios)
12. [Subir Fotos de Embarques](#subir-fotos-de-embarques)
13. [Configuración del Sistema](#configuración-del-sistema)
14. [Consultas e Informes](#consultas-e-informes)
15. [Solución de Problemas](#solución-de-problemas)
16. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🚀 Introducción

### ¿Qué es CRM Monarca?

El CRM (Customer Relationship Management) Monarca es un sistema integral de gestión para empresas de transporte que permite:

- **Gestión completa de embarques** desde creación hasta entrega
- **Control de operadores** y asignaciones de viajes
- **Administración de flotas** (camiones y remolques)
- **Facturación automatizada** y control de cobranzas
- **Seguimiento fotográfico** de mercancías
- **Recordatorios automáticos** para mantenimientos y documentos
- **Reportes y consultas** en tiempo real

### Tecnologías Utilizadas

- **Frontend:** Next.js 15 con React 19
- **Base de Datos:** Supabase (PostgreSQL)
- **Almacenamiento:** Vercel Blob Storage
- **UI Components:** Radix UI + Tailwind CSS
- **Hosting:** Vercel Platform

### Usuarios del Sistema

El sistema está diseñado para diferentes roles:
- **Administradores:** Acceso completo al sistema
- **Operadores de Oficina:** Gestión de embarques y asignaciones
- **Supervisores:** Monitoreo y reportes
- **Contabilidad:** Módulo de facturación y cobranza

---

## 🔐 Acceso al Sistema

### Iniciar Sesión

1. **Abrir el navegador** y dirigirse a la URL del sistema
2. **Introducir credenciales:**
   - Usuario
   - Contraseña
3. **Hacer clic en "Iniciar Sesión"**

### Recuperar Contraseña

Si olvidaste tu contraseña:
1. Contactar al administrador del sistema
2. El administrador puede restablecer tu contraseña desde **Configuración → Usuarios**

### Seguridad

- **Sesión automática:** El sistema cierra automáticamente después de inactividad
- **Intentos fallidos:** Se bloquea temporalmente después de varios intentos incorrectos
- **Audit log:** Todas las acciones quedan registradas para auditoría

---

## 🏠 Panel Principal

### Dashboard Inicial

Al iniciar sesión verás:

#### Métricas Principales
- **Embarques Activos:** Total de embarques en proceso
- **Operadores Disponibles:** Conductores sin asignación
- **Camiones en Servicio:** Vehículos operando
- **Pendientes de Facturar:** Embarques listos para facturación

#### Navegación Principal

El menú lateral contiene:
- **🚛 Embarques:** Crear y gestionar embarques
- **👥 Asignar Operadores:** Asignar conductores a embarques
- **👤 Operadores:** Gestión de conductores
- **🚚 Camiones:** Administrar vehículos
- **🚛 Remolques:** Gestión de remolques
- **👥 Clientes:** Base de datos de clientes
- **💰 Facturación:** Módulo de facturación y cobranza
- **📸 Subir Fotos:** Cargar evidencias fotográficas
- **⏰ Recordatorios:** Gestión de recordatorios automáticos
- **⚙️ Configuración:** Configuraciones del sistema

---

## 📦 Módulo de Embarques

### Crear Nuevo Embarque

#### Paso 1: Información Básica
1. **Hacer clic en "Nuevo Embarque"**
2. **Completar campos obligatorios:**
   - **Folio:** Se genera automáticamente
   - **Cliente:** Seleccionar de la lista
   - **Tipo de Servicio:** Importación/Exportación/Nacional
   - **Fecha de Recolección:** Fecha programada
   - **Hora de Recolección:** Hora programada

#### Paso 2: Direcciones de Recolección y Entrega

**Recolección Única:**
- Dirección completa
- Contacto en origen
- Teléfono de contacto
- Observaciones especiales

**Recolecciones Múltiples:**
- **Hacer clic en "Agregar Dirección"**
- Repetir para cada punto de recolección
- Especificar orden de recolección
- Horarios específicos por ubicación

**Entrega:**
- Dirección de destino
- Contacto receptor
- Horario de entrega preferido

#### Paso 3: Mercancía y Servicios
- **Descripción:** Detalle de la mercancía
- **Peso:** En toneladas o kilogramos
- **Dimensiones:** Largo, ancho, alto
- **Valor Declarado:** Para seguro
- **Servicios Adicionales:** Maniobras especiales, escolta, etc.

#### Paso 4: Precios y Facturación
- **Precio Base:** Flete principal
- **Combustible:** Porcentaje sobre precio base
- **Maniobras:** Costos adicionales
- **Total:** Cálculo automático
- **Condiciones de Pago:** Crédito/Contado

### Estados del Embarque

Los embarques pasan por diferentes estados:

1. **Creado** 🆕
   - Recién registrado
   - Pendiente de asignación
   - Puede editarse libremente

2. **Listo para Asignar** ⏳
   - Información completa
   - Listo para asignar operador
   - Precios confirmados

3. **Asignado** 👤
   - Operador y vehículo asignados
   - Fechas confirmadas
   - En preparación para salida

4. **En Tránsito** 🚛
   - Viaje iniciado
   - Mercancía en movimiento
   - Seguimiento activo

5. **Completado** ✅
   - Entrega realizada
   - Evidencias subidas
   - Listo para facturación

6. **Facturado** 💰
   - Factura generada
   - En proceso de cobranza
   - Expediente completo

7. **Archivado** 📁
   - Proceso completado
   - Solo consulta
   - Historial preservado

### Buscar y Filtrar Embarques

#### Filtros Disponibles:
- **Por Estado:** Seleccionar uno o múltiples estados
- **Por Fecha:** Rango de fechas
- **Por Cliente:** Cliente específico
- **Por Operador:** Conductor asignado
- **Por Folio:** Búsqueda exacta

#### Búsqueda Avanzada:
- **Texto Libre:** Busca en observaciones y descripciones
- **Múltiples Criterios:** Combinar varios filtros
- **Exportar Resultados:** Descargar en Excel

### Editar Embarques

#### Reglas de Edición:
- **Estado Creado:** Edición completa
- **Listo para Asignar:** Solo ajustes menores
- **Asignado:** Solo observaciones y fechas
- **En Tránsito:** Solo observaciones
- **Completado/Facturado:** Solo consulta

#### Proceso de Edición:
1. **Seleccionar embarque** de la lista
2. **Hacer clic en "Editar"** (ícono lápiz)
3. **Modificar campos** permitidos
4. **Guardar cambios**
5. **Confirmar** modificaciones

### Cancelar Embarques

#### Cuándo Cancelar:
- Cliente cancela el servicio
- Problemas operativos
- Cambios de última hora

#### Proceso de Cancelación:
1. **Seleccionar embarque**
2. **Hacer clic en "Cancelar"**
3. **Especificar motivo** de cancelación
4. **Confirmar cancelación**
5. El embarque pasa a estado **"Cancelado"**

#### Efectos de la Cancelación:
- Libera operador asignado
- Libera vehículo asignado
- Mantiene registro para auditoría
- No genera facturación

---

## 👤 Asignación de Operadores

### Panel de Asignaciones

#### Vista Principal:
- **Embarques Pendientes:** Lista de embarques listos para asignar
- **Operadores Disponibles:** Conductores sin asignación activa
- **Asignaciones Activas:** Embarques ya asignados en proceso

### Proceso de Asignación

#### Paso 1: Seleccionar Embarque
1. **Revisar embarques** en estado "Listo para Asignar"
2. **Verificar información:** fechas, destino, tipo de carga
3. **Hacer clic en "Asignar"**

#### Paso 2: Seleccionar Operador
- **Ver lista de operadores disponibles**
- **Revisar información:**
  - Estado de documentos (licencia, aptitud psicofísica)
  - Experiencia con tipo de carga
  - Disponibilidad de fechas
  - Ubicación actual

#### Paso 3: Asignar Vehículo

**Camión:**
- Seleccionar de lista de camiones disponibles
- Verificar:
  - Capacidad de carga
  - Estado de documentos
  - Mantenimientos al día
  - Ubicación actual

**Remolque:**
- **Remolque Propio:** Seleccionar de inventario
- **Remolque Manual:** Capturar placas y número económico
- **Sin Remolque:** Para cargas que no requieren

#### Paso 4: Configurar Pagos

**Pago al Operador:**
- **Porcentaje:** % sobre precio base
- **Cantidad Fija:** Monto específico
- **Gastos:** Combustible, casetas, viáticos
- **Anticipos:** Montos adelantados

#### Paso 5: Confirmar Asignación
- **Revisar resumen** de asignación
- **Verificar fechas** y horarios
- **Confirmar asignación**
- **Notificar al operador** (opcional)

### Modificar Asignaciones

#### Cambiar Operador:
1. **Seleccionar embarque asignado**
2. **Hacer clic en "Modificar Asignación"**
3. **Seleccionar nuevo operador**
4. **Especificar motivo del cambio**
5. **Confirmar modificación**

#### Cambiar Vehículo:
- Similar al proceso anterior
- Verificar disponibilidad del nuevo vehículo
- Actualizar información de la unidad

#### Ajustar Pagos:
- Modificar porcentajes o montos
- Agregar gastos adicionales
- Registrar anticipos entregados

### Seguimiento de Asignaciones

#### Dashboard de Seguimiento:
- **En Preparación:** Asignados pendientes de salir
- **En Tránsito:** Viajes activos
- **Por Llegar:** Próximos a completar
- **Atrasados:** Con retrasos reportados

#### Alertas Automáticas:
- Vencimiento de documentos del operador
- Vencimiento de documentos del vehículo
- Retrasos en entregas programadas
- Falta de confirmación de operadores

---

## 👥 Gestión de Operadores

### Registro de Nuevos Operadores

#### Información Personal:
- **Nombre Completo**
- **Fecha de Nacimiento**
- **CURP/RFC**
- **Teléfono Principal**
- **Teléfono de Emergencia**
- **Dirección Completa**
- **Estado Civil**
- **Contacto de Emergencia**

#### Documentación Requerida:
- **Licencia de Conducir**
  - Número de licencia
  - Fecha de vencimiento
  - Tipo de licencia
  - Estado emisor

- **Aptitud Psicofísica**
  - Número de certificado
  - Fecha de vencimiento
  - Médico certificante

- **Curso de Manejo Defensivo**
  - Certificado
  - Fecha de vencimiento
  - Institución

#### Información Bancaria:
- **Banco**
- **Número de Cuenta**
- **CLABE Interbancaria**
- **Beneficiario**

#### Contactos de Referencia:
- **Referencias Personales**
- **Referencias Laborales**
- **Contactos de Emergencia**

### Gestión Documental

#### Subir Documentos:
1. **Seleccionar operador**
2. **Hacer clic en "Documentos"**
3. **Seleccionar tipo de documento**
4. **Arrastrar archivo o hacer clic para examinar**
5. **Confirmar carga**

#### Tipos de Documentos:
- Licencia de Conducir
- Aptitud Psicofísica
- INE/IFE
- CURP
- RFC
- Comprobante de Domicilio
- Certificados de Cursos
- Contratos Laborales

#### Control de Vencimientos:
- **Alertas Automáticas:** 30, 15, y 5 días antes del vencimiento
- **Notificaciones:** Email y sistema interno
- **Reportes:** Lista de documentos próximos a vencer

### Fotografía de Perfil

#### Subir Foto:
1. **Hacer clic en zona de foto**
2. **Seleccionar imagen** (formato JPG, PNG)
3. **Ajustar encuadre** si es necesario
4. **Confirmar carga**

#### Especificaciones:
- **Tamaño máximo:** 5MB
- **Formatos:** JPG, PNG, WebP
- **Resolución recomendada:** 400x400 píxeles
- **Compresión automática:** Para optimizar almacenamiento

### Sistema de Comentarios

#### Agregar Comentarios:
1. **Seleccionar operador**
2. **Ir a pestaña "Comentarios"**
3. **Escribir observación**
4. **Hacer clic en "Agregar"**

#### Tipos de Comentarios:
- **Evaluaciones de Desempeño**
- **Incidentes Reportados**
- **Reconocimientos**
- **Observaciones Generales**
- **Cambios en Información**

#### Funciones Avanzadas:
- **Editar comentarios** propios
- **Eliminar comentarios** (con permisos)
- **Filtrar por fecha**
- **Buscar en comentarios**
- **Exportar historial**

### Estados del Operador

#### Estados Disponibles:
- **Activo** ✅: Disponible para asignaciones
- **Ocupado** 🚛: Con embarque asignado
- **Inactivo** ⏸️: Temporalmente no disponible
- **Suspendido** ❌: No puede recibir asignaciones
- **De Baja** 📋: Ya no trabaja en la empresa

#### Cambiar Estados:
1. **Seleccionar operador**
2. **Hacer clic en estado actual**
3. **Seleccionar nuevo estado**
4. **Especificar motivo** (si aplica)
5. **Confirmar cambio**

### Reportes de Operadores

#### Exportar Lista:
- **Excel:** Lista completa con filtros aplicados
- **Incluye:** Información personal, documentos, estados
- **Filtros disponibles:** Estado, vencimientos, fechas

#### Reporte Individual:
- **Información completa del operador**
- **Historial de embarques**
- **Evaluaciones de desempeño**
- **Documentos adjuntos**

---

## 🚚 Gestión de Camiones

### Registro de Vehículos

#### Información Básica:
- **Número Económico:** Identificador interno
- **Marca:** Fabricante del vehículo
- **Modelo:** Modelo específico
- **Año:** Año de fabricación
- **Placas:** Matrícula oficial
- **Número de Serie (VIN)**
- **Color:** Color predominante
- **Tipo de Combustible:** Diésel/Gasolina

#### Especificaciones Técnicas:
- **Capacidad de Carga:** En toneladas
- **Peso Vehicular:** Peso del camión vacío
- **Dimensiones:** Largo, ancho, alto
- **Tipo de Caja:** Cerrada, abierta, refrigerada
- **Configuración:** Sencillo, torton, tractocamión

#### Documentación Vehicular:
- **Tarjeta de Circulación**
  - Número de folio
  - Fecha de vencimiento
  - Estado emisor

- **Póliza de Seguro**
  - Aseguradora
  - Número de póliza
  - Vigencia
  - Cobertura

- **Verificación Vehicular**
  - Fecha de última verificación
  - Próxima verificación
  - Resultado

- **Permisos SCT**
  - Número de permiso
  - Vigencia
  - Rutas autorizadas

### Mantenimientos

#### Tipos de Mantenimiento:
- **Preventivo:** Programado por kilometraje/tiempo
- **Correctivo:** Por fallas o averías
- **Predictivo:** Basado en diagnósticos
- **Emergencia:** Reparaciones urgentes

#### Programar Mantenimiento:
1. **Seleccionar vehículo**
2. **Hacer clic en "Mantenimientos"**
3. **Seleccionar tipo**
4. **Especificar:**
   - Fecha programada
   - Tipo de servicio
   - Taller responsable
   - Costo estimado
   - Observaciones

#### Servicios Comunes:
- **Cambio de Aceite:** Cada 10,000-15,000 km
- **Revisión de Frenos:** Cada 20,000 km
- **Alineación y Balanceo:** Según desgaste
- **Cambio de Filtros:** Según especificaciones
- **Revisión de Sistema Eléctrico**
- **Verificación de Llantas**

#### Historial de Mantenimientos:
- **Registro completo** de servicios realizados
- **Costos acumulados** por período
- **Próximos servicios** programados
- **Alertas automáticas** de vencimientos

### Control de Combustible

#### Registro de Cargas:
- **Fecha y Hora**
- **Estación de Servicio**
- **Litros Cargados**
- **Precio por Litro**
- **Costo Total**
- **Kilometraje Actual**
- **Operador**

#### Reportes de Consumo:
- **Rendimiento por kilómetro**
- **Consumo promedio mensual**
- **Comparativa entre vehículos**
- **Tendencias de consumo**
- **Alertas por consumo anormal**

### Estados del Vehículo

#### Estados Disponibles:
- **Disponible** ✅: Listo para asignación
- **Asignado** 🚛: En servicio activo
- **Mantenimiento** 🔧: En reparación/servicio
- **Fuera de Servicio** ❌: No operativo
- **Vendido/Dado de Baja** 📋: Fuera del inventario

### Documentos y Archivos

#### Gestión de Documentos:
- **Subir archivos:** PDF, imágenes, documentos
- **Categorizar documentos:** Por tipo y fecha
- **Vencimientos:** Control automático de fechas
- **Alertas:** Notificaciones preventivas

#### Tipos de Archivos:
- Tarjeta de Circulación
- Pólizas de Seguro
- Facturas de Mantenimiento
- Permisos y Autorizaciones
- Fotografías del Vehículo
- Reportes de Inspección

---

## 🚛 Gestión de Remolques

### Características Específicas

Los remolques tienen gestión similar a camiones pero con particularidades:

#### Tipos de Remolques:
- **Caja Seca:** Para carga general
- **Plataforma:** Para carga sobredimensionada  
- **Tolva:** Para granos y materiales a granel
- **Cisterna:** Para líquidos
- **Refrigerado:** Para productos que requieren frío
- **Especializado:** Para cargas específicas

#### Información Específica:
- **Configuración de Ejes**
- **Capacidad de Carga Útil**
- **Altura Libre Interior**
- **Sistema de Enganche**
- **Equipamiento Especial**

### Gestión Integrada

#### Asignación Automática:
- Compatible con tipos de carga
- Disponibilidad en tiempo real
- Historial de uso y mantenimiento
- Ubicación actual

#### Remolques Externos:
- **Captura manual** de placas
- **Registro temporal** para embarques específicos
- **Sin afectar inventario** interno
- **Solo para referencia** en documentación

---

## 👥 Gestión de Clientes

### Registro de Clientes

#### Información Empresarial:
- **Razón Social Completa**
- **RFC con Homoclave**
- **Domicilio Fiscal Completo**
- **Giro Comercial**
- **Tamaño de Empresa**
- **Años en el Mercado**

#### Datos de Contacto:
- **Teléfonos:** Principal, alternativo, fax
- **Correos Electrónicos:** General, facturación, operaciones
- **Sitio Web**
- **Redes Sociales**

#### Información Comercial:
- **Límite de Crédito**
- **Días de Crédito**
- **Condiciones Especiales**
- **Descuentos Aplicables**
- **Forma de Pago Preferida**

### Contactos del Cliente

#### Gestión de Contactos:
Cada cliente puede tener múltiples contactos especializados:

#### Tipos de Contactos:
- **Gerencia General**
- **Tráfico y Logística**
- **Facturación**
- **Cuentas por Pagar**
- **Operaciones**
- **Servicio al Cliente**

#### Información por Contacto:
- **Nombre Completo**
- **Cargo/Puesto**
- **Teléfono Directo**
- **Extensión**
- **Correo Electrónico**
- **Área de Responsabilidad**
- **Horario de Atención**
- **Observaciones Especiales**

### Direcciones de Servicio

#### Gestión de Ubicaciones:
Los clientes pueden tener múltiples direcciones:

#### Tipos de Direcciones:
- **Fiscal:** Para facturación
- **Recolección:** Donde se origina la carga
- **Entrega:** Destinos de mercancía
- **Corporativa:** Oficinas principales
- **Sucursales:** Ubicaciones adicionales

#### Información por Dirección:
- **Nombre de la Ubicación**
- **Dirección Completa**
- **Referencias de Ubicación**
- **Contacto en Sitio**
- **Teléfono Local**
- **Horarios de Atención**
- **Restricciones de Acceso**
- **Servicios Disponibles**

### Representantes y Vendedores

#### Asignación de Responsables:
- **Ejecutivo de Cuenta:** Responsable principal
- **Vendedor Asignado:** Para nuevos negocios
- **Soporte Técnico:** Para consultas especializadas
- **Administrador de Cuenta:** Para facturación

#### Información del Representante:
- **Nombre del Ejecutivo**
- **Área de Cobertura**
- **Comisión Asignada**
- **Metas de Ventas**
- **Historial de Resultados**

### Formas de Facturación

#### Configuración de Facturación:
Cada cliente puede tener múltiples esquemas:

#### Tipos de Facturación:
- **Por Embarque:** Factura individual por servicio
- **Consolidada Semanal:** Una factura por semana
- **Consolidada Quincenal:** Dos facturas por mes
- **Consolidada Mensual:** Una factura por mes
- **Por Proyecto:** Facturación específica

#### Configuración Específica:
- **Datos Fiscales Alternos**
- **Conceptos Específicos**
- **Impuestos Especiales**
- **Formas de Pago**
- **Métodos de Entrega**
- **Observaciones Fiscales**

### Historial Crediticio

#### Seguimiento Financiero:
- **Límite de Crédito Autorizado**
- **Crédito Utilizado**
- **Crédito Disponible**
- **Días de Retraso Promedio**
- **Comportamiento de Pago**

#### Alertas Crediticias:
- **Límite de Crédito Rebasado**
- **Facturas Vencidas**
- **Patrones de Pago Irregular**
- **Necesidad de Revisión de Límites**

---

## 💰 Facturación y Cobranza

### Panel de Facturación

#### Vista Principal:
El módulo de facturación presenta embarques listos para facturar organizados por:
- **Estado de Facturación**
- **Cliente**
- **Fecha de Completado**
- **Monto Pendiente**

### Proceso de Facturación

#### Embarques Listos para Facturar:
Solo aparecen embarques en estado **"Completado"** con:
- ✅ Entrega confirmada
- ✅ Fotos de evidencia subidas
- ✅ Confirmación del operador
- ✅ Información completa de precios

#### Crear Factura Individual:

**Paso 1: Seleccionar Embarque**
1. **Buscar embarque** por folio o cliente
2. **Verificar información** de servicios
3. **Hacer clic en "Facturar"**

**Paso 2: Configurar Factura**
- **Datos del Cliente:** Pre-cargados automáticamente
- **Conceptos de Facturación:**
  - Flete base
  - Combustible
  - Maniobras especiales
  - Seguros
  - Otros servicios
- **Impuestos:** IVA automático según configuración
- **Método de Pago:** Efectivo, transferencia, cheque
- **Forma de Pago:** Contado, crédito

**Paso 3: Generar Factura**
- **Previsualizar** documento fiscal
- **Verificar totales** e información fiscal
- **Confirmar generación**
- **Descargar PDF** para envío

#### Facturación Consolidada:

Para clientes con múltiples embarques:

**Selección Múltiple:**
1. **Filtrar por cliente**
2. **Seleccionar embarques** del período
3. **Hacer clic en "Facturar Seleccionados"**

**Agrupación de Conceptos:**
- **Por tipo de servicio**
- **Por ruta**
- **Por fecha**
- **Totales consolidados**

### Control de Cobranza

#### Estados de Facturación:
- **Pendiente** 🕒: Recién facturada
- **Enviada** 📧: Entregada al cliente
- **En Revisión** 👀: Cliente revisando
- **Observaciones** ⚠️: Con comentarios del cliente
- **Pagada** ✅: Cobranza completada
- **Vencida** ❌: Fuera de términos de crédito

#### Seguimiento de Cobranza:

**Panel de Cuentas por Cobrar:**
- **Por Antigüedad:** 0-30, 31-60, 61-90, +90 días
- **Por Cliente:** Concentrado por cliente
- **Por Monto:** Ordenado por importancia
- **Por Vencimiento:** Próximas a vencer

**Acciones de Cobranza:**
1. **Llamada de Seguimiento**
   - Registrar fecha y hora
   - Contacto que atendió
   - Compromisos de pago
   - Próxima acción

2. **Envío de Estados de Cuenta**
   - Generación automática
   - Envío por email
   - Registro de entrega

3. **Escalamiento de Cobranza**
   - Gerencia del cliente
   - Departamento legal
   - Suspensión temporal de servicios

### Reportes Financieros

#### Reporte de Ventas:
- **Por Período:** Diario, semanal, mensual, anual
- **Por Cliente:** Concentrado por cliente
- **Por Servicio:** Análisis de productos
- **Por Vendedor:** Performance comercial

#### Antigüedad de Saldos:
- **Estructura de Edades**
- **Análisis de Riesgo**
- **Provisiones Necesarias**
- **Acciones Recomendadas**

#### Flujo de Efectivo:
- **Ingresos Proyectados**
- **Fechas de Cobro Estimadas**
- **Análisis de Tendencias**
- **Alertas de Liquidez**

---

## ⏰ Recordatorios

### Tipos de Recordatorios

#### Automáticos del Sistema:
El sistema genera automáticamente recordatorios para:

**Operadores:**
- 📄 Vencimiento de licencia de conducir
- 🏥 Vencimiento de aptitud psicofísica
- 🎓 Renovación de cursos obligatorios
- 📋 Documentos próximos a vencer
- 🎂 Cumpleaños de operadores

**Vehículos:**
- 🚗 Vencimiento de tarjeta de circulación
- 🛡️ Vencimiento de póliza de seguro
- 🔧 Mantenimientos programados
- ✅ Verificación vehicular
- 📋 Permisos SCT

**Clientes:**
- 💰 Facturas próximas a vencer
- 📞 Seguimientos comerciales programados
- 📋 Renovación de contratos
- 🎂 Fechas especiales

#### Recordatorios Manuales:
Los usuarios pueden crear recordatorios personalizados:

### Crear Recordatorio Manual

**Paso 1: Información Básica**
1. **Hacer clic en "Nuevo Recordatorio"**
2. **Completar campos:**
   - **Título:** Descripción breve
   - **Descripción:** Detalles del recordatorio
   - **Fecha y Hora:** Cuándo debe ejecutarse
   - **Prioridad:** Alta, Media, Baja

**Paso 2: Configuración**
- **Tipo de Recordatorio:**
  - Personal: Solo para ti
  - Departamental: Para tu área
  - General: Para todos los usuarios
- **Repetición:**
  - Una vez
  - Diario
  - Semanal
  - Mensual
  - Anual
- **Alertas:**
  - Notificación en sistema
  - Email
  - SMS (si está configurado)

**Paso 3: Asignación**
- **Responsable:** Usuario asignado
- **Supervisores:** Quienes reciben copia
- **Área Responsable:** Departamento encargado

### Gestión de Recordatorios

#### Panel Principal:
- **Recordatorios Hoy** 📅: Vencen hoy
- **Próximos 7 Días** 📆: Próximos a vencer
- **Vencidos** ⚠️: No atendidos a tiempo
- **Completados** ✅: Ya resueltos

#### Acciones Disponibles:
1. **Marcar como Completado**
   - Agregar notas de resolución
   - Subir evidencias (archivos)
   - Fecha de completado

2. **Posponer**
   - Nueva fecha de vencimiento
   - Motivo de posposición
   - Autorización requerida

3. **Reasignar**
   - Nuevo responsable
   - Motivo del cambio
   - Notificación automática

4. **Cancelar**
   - Ya no necesario
   - Motivo de cancelación
   - Autorización requerida

### Configuración de Alertas

#### Tiempos de Alerta:
Configurable por tipo de recordatorio:
- **Documentos Críticos:** 30, 15, 7, 1 día antes
- **Mantenimientos:** 15, 7, 3 días antes
- **Comerciales:** 5, 2, 1 día antes
- **Administrativos:** 3, 1 día antes

#### Métodos de Notificación:
- **Sistema:** Notificación en dashboard
- **Email:** Correo electrónico automático
- **SMS:** Mensaje de texto (opcional)
- **WhatsApp:** Integración disponible

### Reportes de Recordatorios

#### Efectividad:
- **Porcentaje de cumplimiento** por área
- **Tiempo promedio** de resolución
- **Recordatorios más frecuentes**
- **Usuarios con mejor performance**

#### Análisis de Tendencias:
- **Picos de vencimientos** por período
- **Áreas con más incumplimientos**
- **Tipos de recordatorios** más críticos
- **Necesidades de capacitación**

---

## 📸 Subir Fotos de Embarques

### Importancia de las Evidencias Fotográficas

Las fotos son **obligatorias** para completar un embarque y sirven para:
- ✅ **Comprobar estado** de la mercancía
- 📋 **Documentar entregas**
- 🛡️ **Respaldo legal** ante reclamaciones
- 📊 **Auditorías de calidad**
- 🤝 **Transparencia con clientes**

### Proceso de Subida

#### Acceso al Módulo:
1. **Opción 1:** Desde "Subir Fotos" en menú principal
2. **Opción 2:** Desde el embarque específico
3. **Opción 3:** Desde asignación del operador

#### Buscar Embarque:
- **Por Folio:** Número de embarque
- **Por Cliente:** Seleccionar de lista
- **Por Operador:** Embarques asignados
- **Por Fecha:** Rango de fechas

### Tipos de Fotos Requeridas

#### Fotos de Recolección:
- **Antes de Cargar:** Estado inicial de mercancía
- **Proceso de Carga:** Documentar el cargado
- **Después de Cargar:** Mercancía ya en vehículo
- **Sellado/Asegurado:** Candados, flejes, protecciones

#### Fotos de Tránsito:
- **Paradas de Inspección:** Si las autoridades revisan
- **Cambios de Ruta:** Documentar desviaciones
- **Incidentes:** Cualquier eventualidad
- **Mantenimiento:** Si se requiere servicio

#### Fotos de Entrega:
- **Antes de Descargar:** Estado al llegar
- **Proceso de Descarga:** Documentar descarga
- **Después de Descarga:** Mercancía entregada
- **Documentos:** POD firmado, remisiones
- **Evidencia de Recepción:** Con personal receptor

### Funciones de Compresión

#### Compresión Automática:
El sistema optimiza automáticamente las imágenes:
- **Reduce tamaño** hasta 80% sin perder calidad visual
- **Formatos soportados:** JPG, PNG, WebP, HEIC
- **Calidad adaptativa** según tipo de imagen
- **Metadatos preservados:** Fecha, hora, ubicación GPS

#### Configuración Manual:
- **Calidad Personalizada:** 10% a 100%
- **Resolución Máxima:** Límite de píxeles
- **Tamaño de Archivo:** Límite en MB
- **Formato de Salida:** Conversión automática

### Organización de Fotos

#### Categorías Automáticas:
- **Recolección:** Fotos del origen
- **Tránsito:** Durante el viaje
- **Entrega:** En destino
- **Documentos:** Papelería y firmas
- **Incidentes:** Eventualidades

#### Metadatos Capturados:
- **Fecha y Hora:** Timestamp preciso
- **Ubicación GPS:** Coordenadas del lugar
- **Dispositivo:** Cámara utilizada
- **Usuario:** Quien subió la foto
- **Embarque:** Folio asociado

### Validaciones y Controles

#### Validaciones Automáticas:
- **Formato de Archivo:** Solo imágenes válidas
- **Tamaño Máximo:** Por foto y total
- **Cantidad Mínima:** Al menos 3 fotos por embarque
- **Calidad Mínima:** Resolución suficiente para evidencia

#### Controles de Seguridad:
- **Watermark:** Marca de agua automática
- **Hash de Integridad:** Previene modificaciones
- **Backup Automático:** Respaldo en múltiples ubicaciones
- **Historial de Cambios:** Registro de todas las acciones

### Confirmación del Operador

#### Proceso de Confirmación:
Una vez subidas las fotos, el operador debe:
1. **Revisar todas las imágenes**
2. **Confirmar que son correctas**
3. **Agregar observaciones** si es necesario
4. **Hacer clic en "Confirmar Entrega"**

#### Efectos de la Confirmación:
- 🔒 **Bloquea edición** de fotos
- ✅ **Cambia estado** a "Completado"
- 📧 **Notifica** a facturación
- 💰 **Habilita** para cobrar

### Visualización y Descargas

#### Galería Integrada:
- **Vista de Miniaturas:** Todas las fotos del embarque
- **Vista Ampliada:** Imagen completa con detalles
- **Zoom Digital:** Para examinar detalles
- **Rotación:** Ajustar orientación si es necesario

#### Opciones de Descarga:
- **Foto Individual:** Archivo original
- **Album Completo:** ZIP con todas las fotos
- **PDF Integrado:** Reporte con fotos incluidas
- **Enlaces Públicos:** Para compartir con clientes

---

## ⚙️ Configuración del Sistema

### Acceso a Configuración

Solo usuarios con rol de **Administrador** pueden acceder a:
- 👥 **Gestión de Usuarios**
- 🔒 **Configuración de Seguridad**
- ⚠️ **Configuración de Alertas**
- 📊 **Auditoría del Sistema**
- 🎨 **Personalización de Interfaz**

### Gestión de Usuarios

#### Crear Nuevo Usuario:
1. **Hacer clic en "Nuevo Usuario"**
2. **Completar información:**
   - Nombre de usuario (único)
   - Nombre completo
   - Contraseña inicial
   - Rol del sistema
   - Estado (activo/inactivo)

#### Roles Disponibles:
- **admin:** Acceso completo al sistema
- **operador:** Gestión operativa y embarques
- **facturacion:** Solo módulos financieros
- **consulta:** Solo lectura de información

#### Gestión de Contraseñas:
- **Restablecer:** Generar nueva contraseña temporal
- **Expirar:** Forzar cambio en próximo login
- **Políticas:** Longitud mínima, complejidad requerida
- **Historial:** Evitar reutilización de contraseñas anteriores

### Configuración de Seguridad

#### Parámetros de Seguridad:
- **Intentos Fallidos Máximos:** Antes de bloqueo temporal
- **Tiempo de Bloqueo:** Minutos de suspensión
- **Timeout de Sesión:** Minutos de inactividad permitidos
- **Renovación Automática:** Período de renovación de token

#### Políticas de Contraseñas:
- **Longitud Mínima:** Caracteres requeridos
- **Complejidad:** Mayúsculas, números, símbolos
- **Expiración:** Días de vigencia
- **Historial:** Contraseñas anteriores no permitidas

### Configuración de Alertas

#### Umbrales de Alerta:
Configurar días de anticipación para:

**Documentos de Operadores:**
- **Crítico:** 30 días (licencia, aptitud)
- **Importante:** 15 días (cursos, certificados)
- **Normal:** 7 días (otros documentos)

**Documentos de Vehículos:**
- **Crítico:** 30 días (seguros, permisos)
- **Importante:** 15 días (verificaciones)
- **Normal:** 7 días (otros documentos)

**Mantenimientos:**
- **Preventivo:** 7 días antes de fecha programada
- **Por Kilometraje:** 1000 km antes del límite
- **Por Tiempo:** 15 días antes de vencimiento

#### Métodos de Notificación:
- **Dashboard:** Siempre activo
- **Email:** Configurar servidores SMTP
- **SMS:** Integración con servicios externos
- **Push:** Notificaciones del navegador

### Auditoría del Sistema

#### Registro de Actividades:
El sistema registra automáticamente:
- **Inicios de Sesión:** Usuario, fecha, IP
- **Modificaciones:** Qué cambió, quién, cuándo
- **Eliminaciones:** Registros borrados (soft delete)
- **Accesos:** Consultas a información sensible
- **Errores:** Fallos del sistema y errores de usuario

#### Consulta de Auditoría:
**Filtros Disponibles:**
- **Por Usuario:** Actividades de usuario específico
- **Por Fecha:** Rango temporal
- **Por Acción:** Tipo de actividad
- **Por Módulo:** Área del sistema
- **Por Resultado:** Exitosas/Fallidas

#### Exportar Logs:
- **Formato Excel:** Para análisis externo
- **Formato PDF:** Para reportes ejecutivos
- **Formato CSV:** Para procesamiento automático
- **Backup:** Respaldo de logs históricos

### Personalización de Interfaz

#### Configuración Visual:
- **Logo de la Empresa:** Subir logotipo personalizado
- **Colores Corporativos:** Palette de colores
- **Fondos de Login:** Imágenes de fondo personalizadas
- **Nombres de Módulos:** Personalizar nomenclaturas

#### Configuración Funcional:
- **Campos Obligatorios:** Por tipo de registro
- **Validaciones Personalizadas:** Reglas de negocio
- **Formatos de Documentos:** Templates personalizados
- **Flujos de Trabajo:** Automatizaciones específicas

---

## 📊 Consultas e Informes

### Tipos de Consultas

#### Consultas Operativas:
- **Embarques por Estado**
- **Asignaciones Activas**
- **Operadores Disponibles**
- **Vehículos en Servicio**
- **Rendimiento por Ruta**

#### Consultas Comerciales:
- **Ventas por Cliente**
- **Análisis de Rentabilidad**
- **Comparativas de Períodos**
- **Performance de Vendedores**
- **Productos Más Demandados**

#### Consultas Financieras:
- **Cuentas por Cobrar**
- **Antigüedad de Saldos**
- **Flujo de Efectivo**
- **Análisis de Márgenes**
- **Provisiones de Cobranza**

### Generador de Reportes

#### Reportes Predefinidos:
- **Reporte de Embarques**
- **Reporte de Operadores**
- **Reporte de Vehículos**
- **Reporte Financiero**
- **Reporte de Clientes**

#### Personalización de Reportes:
1. **Seleccionar Campos:** Información a incluir
2. **Definir Filtros:** Criterios de selección
3. **Configurar Agrupación:** Organización de datos
4. **Establecer Ordenamiento:** Secuencia de presentación
5. **Formato de Salida:** Excel, PDF, CSV

### Dashboards Ejecutivos

#### Indicadores Clave (KPIs):
- **Embarques Completados:** Por período
- **Eficiencia Operativa:** % de entregas a tiempo
- **Utilización de Flota:** % de vehículos activos
- **Satisfacción del Cliente:** Calificaciones recibidas
- **Rentabilidad por Servicio:** Margen por tipo

#### Gráficos y Tendencias:
- **Evolución de Ventas:** Líneas de tendencia
- **Distribución por Cliente:** Gráficos de pastel
- **Comparativas Mensuales:** Gráficos de barras
- **Mapas de Calor:** Rutas más frecuentes
- **Análisis de Estacionalidad:** Patrones temporales

---

## 🔧 Solución de Problemas

### Problemas Comunes

#### No Puedo Iniciar Sesión:
**Posibles Causas:**
- Contraseña incorrecta
- Usuario bloqueado por intentos fallidos
- Sesión expirada
- Problemas de conexión

**Soluciones:**
1. Verificar usuario y contraseña
2. Esperar tiempo de desbloqueo automático
3. Contactar al administrador para restablecer
4. Verificar conexión a internet
5. Limpiar caché del navegador

#### Las Fotos No Se Suben:
**Posibles Causas:**
- Archivo muy grande
- Formato no compatible
- Conexión lenta
- Espacio de almacenamiento lleno

**Soluciones:**
1. Comprimir la imagen antes de subir
2. Usar formatos JPG, PNG, WebP
3. Verificar velocidad de internet
4. Contactar soporte técnico
5. Intentar desde otro dispositivo

#### El Sistema Está Lento:
**Posibles Causas:**
- Muchos usuarios conectados
- Consultas complejas ejecutándose
- Problemas de servidor
- Conexión de internet lenta

**Soluciones:**
1. Cerrar pestañas no utilizadas
2. Actualizar página (F5)
3. Cerrar y reabrir navegador
4. Verificar velocidad de internet
5. Reportar al administrador

#### No Aparecen Mis Embarques:
**Posibles Causas:**
- Filtros aplicados incorrectamente
- Embarques en estado no visible
- Permisos de usuario limitados
- Información no sincronizada

**Soluciones:**
1. Limpiar todos los filtros
2. Verificar estados seleccionados
3. Contactar al administrador
4. Actualizar página completamente
5. Verificar fechas del filtro

### Mensajes de Error Frecuentes

#### "Sesión Expirada"
**Causa:** El tiempo de sesión venció por inactividad
**Solución:** Iniciar sesión nuevamente

#### "No Tienes Permisos"
**Causa:** Intentas acceder a función no autorizada
**Solución:** Contactar al administrador para verificar permisos

#### "Error de Conexión"
**Causa:** Problemas de red o servidor
**Solución:** Verificar internet y reintentar

#### "Archivo Muy Grande"
**Causa:** El archivo supera el límite permitido
**Solución:** Comprimir archivo o usar formato más eficiente

### Contactar Soporte Técnico

#### Información a Proporcionar:
- **Usuario que experimenta el problema**
- **Hora exacta del incidente**
- **Pasos que llevaron al error**
- **Mensaje de error completo**
- **Navegador y versión utilizada**
- **Capturas de pantalla si es posible**

#### Canales de Soporte:
- **Email de Soporte:** [soporte@empresa.com]
- **Teléfono de Emergencia:** [Número]
- **Sistema de Tickets:** Función integrada
- **Chat en Vivo:** Horario de oficina
- **Documentación:** Base de conocimientos

---

## ❓ Preguntas Frecuentes

### Generales

**P: ¿Desde qué dispositivos puedo acceder?**
R: El sistema funciona en cualquier dispositivo con navegador web: computadoras, tablets, smartphones. Se recomienda usar Chrome, Firefox, Safari o Edge actualizados.

**P: ¿Puedo trabajar sin internet?**
R: No, el sistema requiere conexión a internet constante. Los datos se almacenan en la nube para mayor seguridad y accesibilidad.

**P: ¿Los datos están seguros?**
R: Sí, usamos encriptación de grado militar, backups automáticos diarios y servidores con certificaciones internacionales de seguridad.

### Embarques

**P: ¿Puedo cancelar un embarque ya asignado?**
R: Sí, pero requiere autorización del supervisor. El operador y vehículo quedan automáticamente disponibles.

**P: ¿Cómo cambio el operador de un embarque?**
R: Desde "Asignar Operadores", selecciona el embarque y usa "Modificar Asignación". Especifica el motivo del cambio.

**P: ¿Puedo tener múltiples direcciones de recolección?**
R: Sí, el sistema soporta direcciones múltiples. Cada una puede tener horarios y contactos específicos.

### Facturación

**P: ¿Puedo facturar varios embarques juntos?**
R: Sí, selecciona múltiples embarques del mismo cliente y usa "Facturar Seleccionados" para crear una factura consolidada.

**P: ¿Cómo corrijo una factura con error?**
R: Las facturas ya emitidas no se pueden modificar. Se debe crear una nota de crédito y emitir nueva factura correcta.

### Fotos y Documentos

**P: ¿Cuántas fotos debo subir por embarque?**
R: Mínimo 3 fotos (origen, tránsito, destino), pero se recomiendan al menos 5-8 fotos para mejor documentación.

**P: ¿Qué hago si las fotos son muy grandes?**
R: El sistema comprime automáticamente, pero puedes usar la función de compresión manual para mayor control.

### Usuarios y Permisos

**P: ¿Puedo cambiar mi contraseña?**
R: Actualmente las contraseñas las gestiona el administrador. Solicita el cambio al área de sistemas.

**P: ¿Qué hago si olvido mi usuario?**
R: Contacta al administrador con tu nombre completo y área de trabajo para que te proporcione tu usuario.

### Mantenimiento y Recordatorios

**P: ¿Los recordatorios llegan por email?**
R: Si está configurado, recibirás notificaciones por email además de las alertas en el sistema.

**P: ¿Puedo crear recordatorios personalizados?**
R: Sí, en el módulo de Recordatorios puedes crear recordatorios manuales con la configuración que necesites.

---

## 📞 Soporte y Contacto

### Equipo de Soporte

**Soporte Técnico:**
- 📧 Email: soporte@transportesmonarca.com
- 📱 Teléfono: [Número de soporte]
- 🕐 Horario: Lunes a Viernes 8:00 AM - 6:00 PM

**Administrador del Sistema:**
- 👤 [Nombre del Administrador]
- 📧 Email: admin@transportesmonarca.com
- 📱 Extensión: [Número]

**Capacitación:**
- 📚 Sesiones de entrenamiento disponibles
- 📖 Documentación actualizada constantemente
- 🎥 Videos tutoriales en desarrollo

### Actualizaciones del Sistema

El sistema se actualiza regularmente con:
- 🆕 Nuevas funcionalidades
- 🔧 Correcciones de errores
- 🚀 Mejoras de rendimiento
- 🔒 Actualizaciones de seguridad

Las actualizaciones se realizan fuera del horario laboral para minimizar interrupciones.

---

## 📝 Notas de Versión

### Versión Actual: 8.0
**Fecha de Lanzamiento:** Octubre 2024

#### Nuevas Características:
- ✨ Interfaz completamente renovada
- 📱 Diseño responsive para móviles
- 🤖 Compresión automática de imágenes
- 📊 Dashboards ejecutivos mejorados
- 🔄 Sincronización en tiempo real

#### Mejoras:
- ⚡ Rendimiento optimizado en 40%
- 🔒 Seguridad mejorada con nuevas validaciones
- 📈 Reportes más rápidos y detallados
- 🎯 UX simplificada basada en feedback de usuarios

#### Correcciones:
- 🐛 Solucionados problemas de carga de fotos
- 🔧 Mejorada estabilidad en navegadores móviles
- 📊 Corregidos cálculos en reportes financieros

---

**📚 Manual creado por:** Equipo de Desarrollo CRM Monarca  
**📅 Última actualización:** Octubre 2024  
**📖 Versión del manual:** 1.0  

---

*Este manual será actualizado regularmente conforme el sistema evolucione. Para sugerencias de mejora o correcciones, contacta al equipo de soporte.*