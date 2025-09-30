# Configuración HTTPS para Desarrollo Local

## Problema
iOS Safari requiere HTTPS para acceder a la geolocalización. En desarrollo local, esto puede causar problemas.

## Soluciones

### Opción 1: Usar ngrok (Recomendado)
```bash
# Instalar ngrok globalmente
npm install -g ngrok

# Con tu app corriendo en localhost:3001
ngrok http 3001
```

### Opción 2: Configurar HTTPS local con mkcert

#### 1. Instalar mkcert
```bash
# En macOS
brew install mkcert
brew install nss # Si usas Firefox

# Instalar CA local
mkcert -install
```

#### 2. Generar certificados
```bash
# En la raíz del proyecto
mkcert localhost 127.0.0.1 192.168.1.228

# Esto creará:
# localhost+2.pem (certificado)
# localhost+2-key.pem (llave privada)
```

#### 3. Modificar package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "HTTPS=true SSL_CRT_FILE=localhost+2.pem SSL_KEY_FILE=localhost+2-key.pem next dev -p 3001"
  }
}
```

#### 4. Ejecutar con HTTPS
```bash
npm run dev:https
```

### Opción 3: Usar servidor HTTPS personalizado

Crear `server.js`:
```javascript
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync('./localhost+2-key.pem'),
  cert: fs.readFileSync('./localhost+2.pem')
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3001, (err) => {
    if (err) throw err
    console.log('> Ready on https://localhost:3001')
  })
})
```

## Verificación

1. Ve a https://localhost:3001 (o la URL de ngrok)
2. Acepta el certificado (si es local)
3. Prueba la geolocalización en iOS Safari
4. Debería funcionar sin problemas

## Troubleshooting

- **Error de certificado**: Asegúrate de instalar la CA local con `mkcert -install`
- **iOS sigue bloqueando**: Verifica que estés usando HTTPS, no HTTP
- **Ngrok lento**: Usa la versión de pago para mejor rendimiento
- **Puerto ocupado**: Cambia el puerto en los comandos

## Alternativa Rápida: Solo permitir sin GPS

Si no puedes configurar HTTPS, la aplicación ya está configurada para funcionar sin GPS. Las fotos se subirán sin coordenadas de ubicación.