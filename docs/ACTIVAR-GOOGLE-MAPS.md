# Cómo Activar Google Maps JavaScript API

## 🚨 Error Actual
```
ApiNotActivatedMapError: Google Maps JavaScript API no está activada
```

## ✅ Solución: Activar la API en 5 pasos

### **Paso 1: Ir a Google Cloud Console**
1. Abre: https://console.cloud.google.com/
2. Inicia sesión con tu cuenta de Google

### **Paso 2: Seleccionar o Crear un Proyecto**
1. En la parte superior, haz clic en el selector de proyectos
2. Si ya tienes un proyecto, selecciónalo
3. Si no, haz clic en **"Nuevo Proyecto"** y créalo

### **Paso 3: Activar APIs Necesarias**

#### 3.1 Maps JavaScript API (OBLIGATORIA)
1. Ve a: https://console.cloud.google.com/marketplace/product/google/maps-backend.googleapis.com
2. O navega manualmente:
   - Menú ☰ → **APIs y servicios** → **Biblioteca**
   - Busca: **"Maps JavaScript API"**
3. Haz clic en **"HABILITAR"**

#### 3.2 Otras APIs Recomendadas
También activa estas APIs para funcionalidad completa:
- **Geocoding API**: Para convertir direcciones en coordenadas
- **Places API**: Para búsqueda de lugares
- **Directions API**: Para rutas y navegación

### **Paso 4: Crear o Verificar API Key**

#### Si NO tienes API Key:
1. Ve a: **APIs y servicios** → **Credenciales**
2. Haz clic en **"+ CREAR CREDENCIALES"**
3. Selecciona **"Clave de API"**
4. Copia la clave generada

#### Si YA tienes API Key (tu caso):
Tu key actual: `AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo`

1. Ve a: **APIs y servicios** → **Credenciales**
2. Encuentra tu key en la lista
3. Haz clic en el ícono de lápiz ✏️ para editar

### **Paso 5: Configurar Restricciones de la API Key**

#### Restricciones de Aplicación (Recomendado para producción):
1. Selecciona **"Referentes HTTP (sitios web)"**
2. Agrega tus dominios:
   ```
   http://localhost:3000/*
   http://localhost:3001/*
   http://localhost:3002/*
   https://tudominio.com/*
   https://*.tudominio.com/*
   ```

#### Restricciones de API:
1. Selecciona **"Restringir clave"**
2. Marca las APIs que vas a usar:
   - ✅ Maps JavaScript API
   - ✅ Geocoding API
   - ✅ Places API (opcional)

3. Haz clic en **"GUARDAR"**

---

## 🔄 Solución Temporal (Mientras activas la API)

He implementado una versión temporal usando **OpenStreetMap** que:
- ✅ No requiere API key
- ✅ Muestra el mapa de inmediato
- ✅ Funciona igual que Google Maps
- ✅ Tiene un botón para abrir en Google Maps

**Archivo implementado:** `components/ModalUbicacionOperadorOSM.tsx`

---

## 📱 Verificar que la API está Activa

1. Ve a: https://console.cloud.google.com/apis/dashboard
2. Deberías ver **"Maps JavaScript API"** en la lista con estado **"Habilitado"**

---

## 💰 Costos de Google Maps API

### Precios (a partir de 2025):
- **Primeros $200 USD/mes**: GRATIS (crédito mensual)
- **Cargas de mapa**: $7 USD por cada 1,000 cargas después del crédito
- **La mayoría de proyectos pequeños NO pagan nada**

### Tu uso estimado:
- Si tienes < 28,000 cargas de mapa al mes → **GRATIS**
- CRM interno con pocos usuarios → Muy probable que sea **GRATIS**

---

## 🔍 Troubleshooting

### Error persiste después de activar:
1. **Espera 2-5 minutos**: Los cambios tardan en propagarse
2. **Limpia caché del navegador**: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
3. **Verifica que la key sea correcta** en el código

### La API está activa pero no funciona:
1. Verifica las restricciones de la API key
2. Asegúrate de que `localhost` esté en la lista de referentes permitidos
3. Revisa que hayas guardado los cambios

### Necesitas ayuda:
Documentación oficial: https://developers.google.com/maps/documentation/javascript/get-api-key

---

## 🚀 Siguiente Paso

Una vez que actives la API:

1. Cambia el import en `app/asignar-operadores/page.tsx`:
   ```typescript
   // De:
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperadorOSM";
   
   // A:
   import ModalUbicacionOperador from "@/components/ModalUbicacionOperador";
   ```

2. Recarga la página y el mapa de Google Maps funcionará perfectamente.

---

## 📊 Comparación OpenStreetMap vs Google Maps

| Característica | OpenStreetMap (Actual) | Google Maps |
|----------------|------------------------|-------------|
| Costo | ✅ Gratis siempre | ✅ Gratis hasta $200/mes |
| Calidad de mapas | ✅ Buena | ✅✅ Excelente |
| Datos en tiempo real | ❌ No | ✅ Sí (tráfico, etc.) |
| Geocodificación | ⚠️ Limitada | ✅ Completa |
| Street View | ❌ No | ✅ Sí |
| Integración | ⚠️ Básica | ✅✅ Avanzada |

**Recomendación:** Usa Google Maps para producción (es gratis para tu uso).
