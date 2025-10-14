# ⚡ CONFIGURACIÓN RÁPIDA - Google Maps API Key

## 🎯 Lo que debes hacer AHORA:

### **Paso 1: Editar el archivo `.env.local`**

1. Abre el archivo `.env.local` en VS Code
2. Busca la línea que dice:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
   ```
3. Pega tu API key después del `=`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo
   ```
   *(Usa TU key, no la del ejemplo)*

4. **Guarda el archivo** (Cmd+S o Ctrl+S)

---

### **Paso 2: Reiniciar el Servidor**

En la terminal, presiona:
- **Ctrl+C** para detener el servidor
- Luego ejecuta: **`npm run dev`**

---

### **Paso 3: Probar**

1. Abre: `http://localhost:3000/asignar-operadores`
2. Haz clic en cualquier botón **"📍 Ubicación"**
3. Deberías ver el mapa de Google Maps 🗺️

---

## ⚠️ IMPORTANTE: Seguridad

**NUNCA** compartas tu API key en:
- ❌ GitHub
- ❌ Chat público
- ❌ Código compartido
- ❌ Screenshots

El archivo `.env.local` ya está en `.gitignore`, así que NO se subirá a GitHub automáticamente.

---

## 🐛 Si no funciona:

### Error: "ApiNotActivatedMapError"
**Solución:**
1. Ve a: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
2. Haz clic en **"HABILITAR"**
3. Espera 2-5 minutos
4. Recarga la página

### Error: "API key not found"
**Solución:**
1. Verifica que guardaste el archivo `.env.local`
2. Verifica que no hay espacios antes o después de la key
3. Reinicia el servidor con `npm run dev`

### Error: "RefererNotAllowedMapError"
**Solución:**
1. Ve a: https://console.cloud.google.com/apis/credentials
2. Edita tu API key
3. En "Restricciones de aplicación" → "Referentes HTTP"
4. Agrega: `http://localhost:*`
5. Guarda

---

## 📖 Documentación Completa

Para más detalles, consulta:
- `docs/CONFIGURAR-GOOGLE-MAPS-KEY.md` - Guía completa
- `docs/ACTIVAR-GOOGLE-MAPS.md` - Cómo activar la API

---

## 🎉 ¡Eso es todo!

Tu configuración debería verse así:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://gtuficayhiyzpfkvqgip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⬇️ AGREGA TU KEY AQUÍ ⬇️
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_KEY_REAL_AQUI

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Una vez configurado:
✅ Guarda
✅ Reinicia con `npm run dev`
✅ ¡Listo! El mapa funcionará
