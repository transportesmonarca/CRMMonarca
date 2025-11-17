#!/bin/bash

echo "📱 CONFIGURACIÓN AUTOMÁTICA PARA iOS"
echo "================================================="

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Cerrando servicios..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
    fi
    exit 0
}

# Capturar señales de salida
trap cleanup SIGINT SIGTERM

# Iniciar el servidor Next.js en background
echo "🚀 Iniciando servidor en puerto 3001..."
npm run dev:host > /dev/null 2>&1 &
SERVER_PID=$!

# Esperar a que el servidor esté listo
echo "⏳ Esperando a que el servidor esté listo..."
sleep 8

echo "🔗 Iniciando túnel HTTPS con ngrok..."

# Crear túnel HTTPS y capturar la URL
ngrok http 3001 --log=stdout 2>&1 | grep -o "https://[a-z0-9]*\.ngrok[a-z\.-]*" | head -1 > /tmp/ngrok_url &
NGROK_PID=$!

# Esperar a que ngrok genere la URL
sleep 5

# Leer la URL de ngrok
if [ -f /tmp/ngrok_url ]; then
    NGROK_URL=$(cat /tmp/ngrok_url)
    rm /tmp/ngrok_url
else
    NGROK_URL=""
fi

echo ""
echo "✅ SERVICIOS ACTIVOS"
echo "================================================="
echo "🖥️  Servidor local: http://localhost:3001"
echo "📱 URL para iPhone: $NGROK_URL"
echo ""

if [ ! -z "$NGROK_URL" ]; then
    echo "📋 INSTRUCCIONES:"
    echo "1. Abre Safari en tu iPhone"
    echo "2. Ve a: $NGROK_URL"
    echo "3. La geolocalización funcionará correctamente"
    echo ""
    echo "$NGROK_URL" | pbcopy
    echo "✅ URL copiada al portapapeles"
else
    echo "⚠️  No se pudo obtener la URL de ngrok automáticamente"
    echo "   Revisa manualmente en http://localhost:4040"
fi

echo ""
echo "💡 Presiona Ctrl+C para cerrar ambos servicios"
echo "================================================="

# Esperar indefinidamente
wait