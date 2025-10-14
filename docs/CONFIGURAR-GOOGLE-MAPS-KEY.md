# 🔐 Configuración Segura de Google Maps API Key

## ⚠️ NUNCA compartas tu API key públicamente

## 📝 Pasos para Configurar tu API Key

### **1. Agregar la API Key al archivo .env.local**

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega esta línea al final:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
```

3. Reemplaza `TU_API_KEY_AQUI` con tu API key real de Google Maps
4. Guarda el archivo

### **Ejemplo de cómo debería verse tu .env.local:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gtuficayhiyzpfkvqgip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

---

## 🔄 2. Reiniciar el Servidor de Desarrollo

Después de agregar la API key, **DEBES reiniciar el servidor**:

```bash
# Detener el servidor actual (Ctrl+C)
# Luego iniciar de nuevo:
npm run dev
```

---

## ✅ 3. Verificar que Funciona

1. Abre tu navegador en `http://localhost:3000/asignar-operadores`
2. Haz clic en el botón "📍 Ubicación" de cualquier embarque
3. Deberías ver el mapa de Google Maps cargando correctamente

---

## 🛡️ Seguridad de la API Key

### ✅ Buenas Prácticas Implementadas:

1. **Variable de entorno**: La key está en `.env.local`, no en el código
2. **Prefijo NEXT_PUBLIC_**: Solo se expone en el cliente cuando es necesario
3. **Gitignore**: El archivo `.env.local` NO se sube a GitHub
4. **Restricciones de dominio**: Configura restricciones en Google Cloud Console

### 🔒 Configurar Restricciones en Google Cloud:

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Selecciona tu API key
3. En "Restricciones de aplicación", selecciona **"Referentes HTTP (sitios web)"**
4. Agrega:
   ```
   http://localhost:*
   https://tudominio.com/*
   https://*.tudominio.com/*
   ```
5. En "Restricciones de API", selecciona:
   - ✅ Maps JavaScript API
   - ✅ Geocoding API (opcional)
   - ✅ Places API (opcional)

---

## 🚀 Despliegue en Producción (Vercel)

Cuando despliegues en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value**: Tu API key
   - **Environments**: Marca Production, Preview, Development
4. Redeploy tu aplicación

---

## 🐛 Troubleshooting

### Error: "API key not found"
- ✅ Verifica que agregaste `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.local`
- ✅ Reinicia el servidor con `npm run dev`
- ✅ Verifica que no haya espacios antes o después de la key

### Error: "ApiNotActivatedMapError"
- ✅ Activa la API en Google Cloud Console (ver `docs/ACTIVAR-GOOGLE-MAPS.md`)
- ✅ Espera 2-5 minutos para que se propague

### Error: "RefererNotAllowedMapError"
- ✅ Agrega `http://localhost:*` en las restricciones de referentes
- ✅ Guarda los cambios en Google Cloud Console

---

## 📖 Recursos

- [Documentación de Google Maps API](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Variables de Entorno en Next.js](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Mejores Prácticas de Seguridad](https://developers.google.com/maps/api-security-best-practices)

---

## ⚡ Alternativa Temporal

Si no quieres usar Google Maps aún, el sistema ya tiene implementado **OpenStreetMap** como alternativa gratuita:

```typescript
// En app/asignar-operadores/page.tsx
import ModalUbicacionOperador from "@/components/ModalUbicacionOperadorOSM"; // OpenStreetMap
// import ModalUbicacionOperador from "@/components/ModalUbicacionOperador"; // Google Maps
```

---

## 🎉 ¡Listo!

Una vez configurada la API key, tendrás:
- ✅ Mapa interactivo de Google Maps
- ✅ Marcadores personalizados
- ✅ Info Windows con información del operador
- ✅ Controles de zoom y navegación
- ✅ Street View y más funcionalidades
