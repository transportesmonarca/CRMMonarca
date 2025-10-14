# 🎯 GUÍA VISUAL: Activar Google Maps JavaScript API

## 🚨 EL PROBLEMA

Error: `ApiNotActivatedMapError`

**Causa:** La API de Google Maps JavaScript **NO está activada** en tu proyecto de Google Cloud.

---

## ✅ SOLUCIÓN PASO A PASO (Con Imágenes)

### **📍 PASO 1: Abrir Google Cloud Console**

Ve a una de estas páginas (ya las abrí en tu navegador):

1. **Activar API**: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
2. **Dashboard**: https://console.cloud.google.com/apis/dashboard
3. **Credenciales**: https://console.cloud.google.com/apis/credentials

---

### **📍 PASO 2: Seleccionar el Proyecto Correcto**

```
┌─────────────────────────────────────────┐
│  Google Cloud Console                   │
│  ┌───────────────────────────────────┐  │
│  │ [📁 Mi Proyecto ▼]  🔔  👤       │  │  ← Haz clic aquí
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

1. En la **parte superior izquierda**, verás el nombre de tu proyecto
2. Haz clic en el nombre del proyecto
3. Si no ves tu proyecto, créalo:
   - Clic en **"Nuevo Proyecto"**
   - Nombre: "Monarca CRM" (o el que prefieras)
   - Clic en **"Crear"**

---

### **📍 PASO 3: Buscar "Maps JavaScript API"**

Si no estás en la página de la API:

1. En el menú lateral ☰, ve a:
   ```
   APIs y servicios → Biblioteca
   ```

2. En el buscador, escribe:
   ```
   Maps JavaScript API
   ```

3. Haz clic en el resultado **"Maps JavaScript API"**

---

### **📍 PASO 4: Habilitar la API**

```
┌──────────────────────────────────────────────┐
│  Maps JavaScript API                         │
│                                              │
│  Estado: ❌ No habilitada                   │
│                                              │
│  ┌────────────────────┐                     │
│  │   HABILITAR        │  ← HAZ CLIC AQUÍ   │
│  └────────────────────┘                     │
└──────────────────────────────────────────────┘
```

1. Verás un botón grande que dice **"HABILITAR"** o **"ENABLE"**
2. **HAZ CLIC EN ÉL**
3. Espera a que aparezca: ✅ "API habilitada"

---

### **📍 PASO 5: Verificar que se Activó**

Ve al Dashboard: https://console.cloud.google.com/apis/dashboard

Deberías ver algo así:

```
┌──────────────────────────────────────────────┐
│  APIs Habilitadas                            │
│                                              │
│  ✅ Maps JavaScript API                     │
│     Solicitudes (últimas 24h): 0            │
│     Estado: Habilitada                       │
│                                              │
│  ✅ Geocoding API                           │
│  ✅ Places API                              │
└──────────────────────────────────────────────┘
```

---

### **📍 PASO 6: Verificar Restricciones de la API Key**

Ve a Credenciales: https://console.cloud.google.com/apis/credentials

```
┌──────────────────────────────────────────────┐
│  Credenciales                                │
│                                              │
│  Claves de API                               │
│  ┌────────────────────────────────────────┐ │
│  │ AIzaSyAY...                    ✏️      │ │  ← Haz clic en ✏️
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

1. Busca tu API key (empieza con `AIzaSyAY...`)
2. Haz clic en el **ícono de lápiz ✏️** para editar
3. Verifica las **Restricciones de aplicación**:

#### **Opción A: Sin Restricciones (Para Testing)**
```
┌────────────────────────────────────────┐
│ Restricciones de aplicación           │
│                                        │
│ ⚪ Ninguna (no recomendado)           │  ← Selecciona esta
│ ⚪ Referentes HTTP (sitios web)       │
│ ⚪ Direcciones IP                      │
│ ⚪ Aplicaciones de Android             │
│ ⚪ Aplicaciones de iOS                 │
└────────────────────────────────────────┘
```

#### **Opción B: Referentes HTTP (Recomendado)**
```
┌────────────────────────────────────────┐
│ Restricciones de aplicación           │
│                                        │
│ ⚪ Ninguna                             │
│ ⚫ Referentes HTTP (sitios web)       │  ← Selecciona esta
│                                        │
│ Referentes del sitio web:              │
│ ┌────────────────────────────────────┐ │
│ │ http://localhost:*                 │ │  ← Agrega estas líneas
│ │ https://tudominio.com/*            │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

4. Verifica las **Restricciones de API**:

```
┌────────────────────────────────────────┐
│ Restricciones de API                   │
│                                        │
│ ⚪ No restringir clave                │
│ ⚫ Restringir clave                   │  ← Selecciona esta
│                                        │
│ ☑️ Maps JavaScript API                │  ← Debe estar marcada
│ ☑️ Geocoding API                      │
│ ☑️ Places API                         │
└────────────────────────────────────────┘
```

5. **Haz clic en GUARDAR**

---

### **📍 PASO 7: Esperar y Recargar**

```
⏱️  ESPERA 2-5 MINUTOS
```

Los cambios pueden tardar en propagarse.

Mientras tanto:

1. Ve a tu CRM: http://localhost:3002/asignar-operadores
2. **Recarga la página** (Cmd+R o Ctrl+R)
3. Haz clic en **"📍 Ubicación"**
4. ¡Debería funcionar! 🎉

---

## 🐛 Si Sigue sin Funcionar

### 1️⃣ Limpia el caché del navegador

**Chrome/Edge:**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

**Safari:**
- Mac: `Cmd + Option + R`

### 2️⃣ Verifica la consola del navegador

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **"Console"**
3. Busca errores en rojo
4. Copia el error completo

### 3️⃣ Verifica que la API key sea correcta

En `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo
```

Debe coincidir EXACTAMENTE con la key en Google Cloud Console.

### 4️⃣ Reinicia el servidor

```bash
# En la terminal, presiona Ctrl+C
# Luego:
npm run dev
```

### 5️⃣ Ejecuta el diagnóstico

```bash
node scripts/diagnostico-google-maps.js
```

---

## 💡 Solución Alternativa (Temporal)

Si no puedes activar la API ahora, usa OpenStreetMap:

1. Abre: `app/asignar-operadores/page.tsx`
2. Línea 52, cambia:
   ```typescript
   // De:
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperador";
   
   // A:
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperadorOSM";
   ```
3. Guarda y recarga

---

## 📞 ¿Necesitas Ayuda?

**Ejecuta este script para abrir todas las páginas necesarias:**
```bash
bash scripts/abrir-google-cloud.sh
```

**Enlaces directos:**
- Activar API: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- Dashboard: https://console.cloud.google.com/apis/dashboard
- Credenciales: https://console.cloud.google.com/apis/credentials
- Documentación: https://developers.google.com/maps/documentation/javascript/get-api-key

---

## ✅ Checklist Final

- [ ] Proyecto correcto seleccionado en Google Cloud
- [ ] Maps JavaScript API habilitada
- [ ] API key sin restricciones O con `http://localhost:*` permitido
- [ ] Esperé 5 minutos
- [ ] Recargué la página del CRM
- [ ] Limpia el caché del navegador
- [ ] Reinicié el servidor (`npm run dev`)

---

**¡Una vez que sigas estos pasos, el mapa funcionará correctamente!** 🗺️✨
