# 🔧 ERROR: TypeError: Failed to fetch - SOLUCIÓN

## ❌ **Problema Identificado**

El error `TypeError: Failed to fetch` ocurre porque **la tabla `documentos_camiones` no existe** en la base de datos de Supabase. 

### **📋 Diagnóstico del Error:**
```
TypeError: Failed to fetch
    at subirDocumentoCamion (webpack-internal:///(app-pages-browser)/./lib/blob.ts:670:32)
    at subirDocumentosCamion (webpack-internal:///(app-pages-browser)/./app/camiones/page.tsx:374:117)
    at guardarCamion (webpack-internal:///(app-pages-browser)/./app/camiones/page.tsx:597:46)
```

### **🔍 Análisis Técnico:**
1. **✅ API de Upload funciona**: Los archivos se suben correctamente a Vercel Blob
2. **❌ Inserción en BD falla**: La tabla `documentos_camiones` no existe
3. **💥 Error no manejado**: El error de base de datos causa el "Failed to fetch"

---

## ✅ **SOLUCIÓN: Ejecutar Script SQL**

### **📂 Archivo a Ejecutar:**
```sql
EJECUTAR-EN-SUPABASE-documentos-camiones.sql
```

### **🚀 Pasos para Solucionar:**

#### **1. Acceder a Supabase Dashboard**
```
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto: gtuficayhiyzpfkvqgip
3. Ir a "SQL Editor" en el menú lateral
```

#### **2. Ejecutar el Script SQL**
```sql
-- Copiar y pegar TODO el contenido del archivo:
-- EJECUTAR-EN-SUPABASE-documentos-camiones.sql

-- Script para crear tabla de documentos de camiones
-- Este script es seguro de ejecutar múltiples veces (idempotente)
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla documentos_camiones si no existe
CREATE TABLE IF NOT EXISTS documentos_camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  numero_documento TEXT,
  nombre_archivo TEXT NOT NULL,
  url_blob TEXT NOT NULL,
  pathname TEXT NOT NULL,
  tipo_archivo TEXT,
  tamano_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [... resto del script ...]
```

#### **3. Verificar Ejecución Exitosa**
Al ejecutar el script, deberías ver:
```sql
✅ Tabla documentos_camiones creada/verificada exitosamente
```

---

## 🔧 **Verificación Post-Ejecución**

### **📋 Comprobar Tabla Creada:**
```sql
-- Ejecutar en SQL Editor de Supabase para verificar:
SELECT * FROM information_schema.tables 
WHERE table_name = 'documentos_camiones';
```

### **🔍 Verificar Estructura:**
```sql
-- Verificar columnas de la tabla:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documentos_camiones';
```

---

## 🎯 **Resultado Esperado**

### **✅ Después de Ejecutar el Script:**

#### **🔄 Funcionalidad Restaurada:**
- ✅ **Upload de archivos**: Funcionará sin errores
- ✅ **Miniaturas**: Se mostrarán correctamente
- ✅ **Gestión de documentos**: CRUD completo operativo
- ✅ **Pestaña "Adjuntos"**: Totalmente funcional

#### **🖼️ Interface Habilitada:**
```
ANTES (Error):
┌─────────────────────────────────┐
│ ⚠️  Error: Failed to fetch      │
│     Tabla no existe            │
└─────────────────────────────────┘

DESPUÉS (Funcionando):
┌─────────────────────────────────┐
│ ✅ Drag & Drop habilitado       │
│ 📸 Miniaturas funcionando       │
│ 💾 Guardado en base de datos    │
└─────────────────────────────────┘
```

---

## 📝 **Instrucciones Detalladas**

### **Paso a Paso:**

1. **📥 Abrir Supabase Dashboard:**
   - Ir a https://supabase.com/dashboard
   - Iniciar sesión con tu cuenta
   - Seleccionar el proyecto correcto

2. **📝 SQL Editor:**
   - Clic en "SQL Editor" en el menú lateral izquierdo
   - Clic en "New query" o usar el editor existente

3. **📋 Copiar Script:**
   - Abrir el archivo `EJECUTAR-EN-SUPABASE-documentos-camiones.sql`
   - Seleccionar TODO el contenido (Ctrl+A)
   - Copiar (Ctrl+C)

4. **▶️ Ejecutar:**
   - Pegar en el SQL Editor de Supabase (Ctrl+V)
   - Clic en "Run" o presionar Ctrl+Enter
   - Esperar confirmación de éxito

5. **✅ Verificar:**
   - Buscar mensaje: "Tabla documentos_camiones creada/verificada exitosamente"
   - Verificar que no hay errores en la consola

---

## 🚨 **Notas Importantes**

### **⚠️ Advertencias:**
- **Script Idempotente**: Es seguro ejecutar múltiples veces
- **Sin Pérdida de Datos**: No afectará datos existentes
- **Relaciones**: Se crean automáticamente las referencias a `camiones(id)`

### **🔑 Características de la Tabla:**
```sql
- ✅ UUID como clave primaria
- ✅ Referencia a camiones con ON DELETE CASCADE
- ✅ Campos para tipo, número, nombre, URL, pathname
- ✅ Metadatos: tipo_archivo, tamano_bytes, fechas
- ✅ Índices optimizados para consultas
- ✅ Trigger automático para updated_at
```

---

## 🎉 **Confirmación de Éxito**

### **🧪 Prueba Final:**
1. **Refrescar la aplicación** en el navegador
2. **Ir a "Nuevo Camión"** → Pestaña "Adjuntos"
3. **Arrastrar una imagen** al área de drop
4. **Verificar miniatura** aparece correctamente
5. **Guardar camión** - debería funcionar sin errores
6. **Verificar pestaña "Adjuntos"** en detalles del camión

### **✅ Indicadores de Funcionamiento:**
- ✅ No más errores "Failed to fetch"
- ✅ Miniaturas se cargan instantáneamente
- ✅ Guardado exitoso con toast verde
- ✅ Documentos aparecen en pestaña "Adjuntos"

**🚀 Una vez ejecutado el script SQL, toda la funcionalidad de documentos de camiones estará completamente operativa.**