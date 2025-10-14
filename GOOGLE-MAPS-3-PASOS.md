# 🗺️ Configurar Google Maps en 3 Pasos

## 📝 Paso 1: Editar .env.local

Abre el archivo `.env.local` y busca esta línea:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Pega tu API key después del `=`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAYUAMRWhHlo-nnlC5_XN9Xu2MZHayyrdo
```

**⚠️ Usa TU API key real, no la del ejemplo**

---

## 🔄 Paso 2: Reiniciar el Servidor

En la terminal:
1. Presiona **Ctrl+C** para detener
2. Ejecuta: `npm run dev`

---

## ✅ Paso 3: Probar

1. Abre: http://localhost:3000/asignar-operadores
2. Haz clic en **"📍 Ubicación"**
3. ¡Deberías ver el mapa! 🎉

---

## 🛠️ Verificar Configuración

Puedes ejecutar este comando para verificar:

```bash
node scripts/verificar-env.js
```

---

## 📚 Más Información

- **Guía completa**: `docs/CONFIGURAR-GOOGLE-MAPS-KEY.md`
- **Activar API**: `docs/ACTIVAR-GOOGLE-MAPS.md`
- **Instrucciones rápidas**: `INSTRUCCIONES-GOOGLE-MAPS.md`
