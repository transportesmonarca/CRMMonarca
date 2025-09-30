# 📱 Guía para Pruebas en Dispositivos Móviles

## 🚀 Solución Rápida: Acceso desde Celular

### **Opción 1: Usar tu IP local (Más fácil)**
Tu aplicación ya está disponible en la red local:
```
http://192.168.1.228:3001
```

1. **Conecta tu celular a la misma WiFi** que tu computadora
2. **Abre el navegador** en tu celular
3. **Ve a**: `http://192.168.1.228:3001`
4. **¡Listo!** Ya puedes probar la aplicación

### **Opción 2: Túnel HTTPS (Para geolocalización en iOS)**
Si necesitas GPS en iPhone:

```bash
npm run dev:tunnel
```

Esto creará una URL HTTPS pública que funcionará con geolocalización.

## 🔧 Configuración Manual

### Si tienes problemas de conectividad:

```bash
# Ejecutar servidor accesible desde la red
npm run dev:host
```

### Para obtener tu IP nuevamente:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## 📍 Geolocalización en Móviles

### **Android**
✅ Funciona con HTTP (192.168.1.228:3001)

### **iOS (iPhone/iPad)**
⚠️ Requiere HTTPS para geolocalización

**Opciones para iOS:**
1. **Usar túnel HTTPS**: `npm run dev:tunnel`
2. **Probar sin GPS**: La app funciona sin ubicación
3. **Configurar HTTPS local**: Ver `docs/HTTPS-SETUP.md`

## 🐛 Solución de Problemas

### Error "No se puede conectar"
- ✅ Verifica que ambos dispositivos estén en la misma WiFi
- ✅ Desactiva temporalmente firewall/antivirus
- ✅ Prueba con `npm run dev:host`

### Error de geolocalización en iOS
- ✅ Ve a **Ajustes → Privacidad → Servicios de Ubicación → Safari**
- ✅ Selecciona **"Al usar la app"**
- ✅ Usa `npm run dev:tunnel` para HTTPS

### Aplicación lenta
- ✅ Verifica tu conexión WiFi
- ✅ Usa `npm run dev:tunnel` para mejor rendimiento

## 📖 Documentación Adicional

- **HTTPS Setup**: `docs/HTTPS-SETUP.md`
- **Scripts disponibles**: `package.json`

## 🎯 Comandos Útiles

```bash
# Desarrollo normal
npm run dev

# Accesible desde red local
npm run dev:host

# Con túnel HTTPS público
npm run dev:tunnel

# Ver guía de HTTPS
npm run setup:https
```