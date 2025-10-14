# 🚨 ERROR: ApiNotActivatedMapError - SOLUCIÓN

## ❌ El Problema

Google Maps JavaScript API **NO está activada** en tu proyecto de Google Cloud.

Tu API key es válida, pero la API no está habilitada.

---

## ✅ SOLUCIÓN EN 5 PASOS:

### **Paso 1: Abrir Google Cloud Console**

Ve a: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

O busca manualmente:
1. https://console.cloud.google.com/
2. Menú ☰ → **APIs y servicios** → **Biblioteca**
3. Busca: **"Maps JavaScript API"**

---

### **Paso 2: Seleccionar tu Proyecto**

En la parte superior, verifica que estés en el proyecto correcto.

Si no tienes un proyecto, créalo:
1. Haz clic en el selector de proyectos (parte superior)
2. Clic en **"Nuevo Proyecto"**
3. Dale un nombre (ejemplo: "Monarca CRM")
4. Haz clic en **"Crear"**

---

### **Paso 3: Habilitar la API**

1. Una vez en la página de **Maps JavaScript API**
2. Haz clic en el botón **"HABILITAR"** (o "ENABLE")
3. Espera que se complete (aparecerá un mensaje de confirmación)

**⏱️ IMPORTANTE:** Espera 2-5 minutos para que se propague el cambio

---

### **Paso 4: Verificar que se Activó**

Ve a: https://console.cloud.google.com/apis/dashboard

Deberías ver **"Maps JavaScript API"** en la lista con estado **"Habilitado"**

---

### **Paso 5: Actualizar la Página del CRM**

1. Vuelve a: http://localhost:3002/asignar-operadores
2. **Recarga la página** (Cmd+R o Ctrl+R)
3. Haz clic en **"📍 Ubicación"**
4. ¡Debería funcionar! 🎉

---

## 🔍 Otras APIs Recomendadas (Opcionales)

Mientras estás en Google Cloud Console, también activa:

1. **Geocoding API** - Para convertir direcciones en coordenadas
2. **Places API** - Para búsqueda de lugares
3. **Directions API** - Para rutas y navegación

---

## 💰 ¿Cuánto Cuesta?

**¡GRATIS para tu uso!**

- Google te da **$200 USD de crédito GRATIS cada mes**
- Eso equivale a **~28,000 cargas de mapa al mes**
- Para un CRM interno con pocos usuarios: **100% GRATIS**

---

## 🐛 Si Sigue sin Funcionar

### 1. Espera 5 minutos
Los cambios pueden tardar en propagarse.

### 2. Limpia el caché del navegador
- **Chrome/Edge**: Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)
- **Safari**: Cmd+Option+R

### 3. Verifica tu API Key
Asegúrate de que la key en `.env.local` sea la misma que en Google Cloud Console:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo
```

### 4. Reinicia el servidor
```bash
# Ctrl+C para detener
npm run dev
```

---

## 📞 Enlaces Útiles

- **Activar API**: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
- **Dashboard**: https://console.cloud.google.com/apis/dashboard
- **Credenciales**: https://console.cloud.google.com/apis/credentials
- **Documentación**: https://developers.google.com/maps/documentation/javascript/get-api-key

---

## ⚡ Solución Temporal

Si no puedes activar la API ahora, puedes usar **OpenStreetMap** temporalmente:

1. Abre: `app/asignar-operadores/page.tsx`
2. Cambia la línea 52 de:
   ```typescript
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperador";
   ```
   A:
   ```typescript
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperadorOSM";
   ```
3. Guarda y recarga

OpenStreetMap es gratis y funciona sin API key, pero no tiene las funciones avanzadas de Google Maps.

---

## ✅ Checklist

Marca cuando completes cada paso:

- [ ] Ir a Google Cloud Console
- [ ] Seleccionar/Crear proyecto
- [ ] Habilitar "Maps JavaScript API"
- [ ] Esperar 2-5 minutos
- [ ] Recargar página del CRM
- [ ] ¡Ver el mapa funcionando! 🎉

---

**Última actualización:** 11 de octubre de 2025
**Proyecto:** Monarca CRM - Sistema de Ubicación en Tiempo Real
