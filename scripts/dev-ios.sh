#!/bin/bash

# Script para desarrollo móvil con HTTPS (iOS compatible)

echo "📱 Configurando servidor HTTPS para iOS..."

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado. Instalando..."
    npm install -g ngrok
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando ngrok. Instálalo manualmente:"
        echo "   npm install -g ngrok"
        exit 1
    fi
fi

echo ""
echo "🚀 Iniciando servidor en puerto 3001..."

# Iniciar el servidor Next.js en background
npm run dev:host &
SERVER_PID=$!

# Esperar a que el servidor esté listo
sleep 5

echo ""
echo "🔗 Iniciando túnel HTTPS con ngrok..."

# Crear túnel HTTPS
ngrok http 3001 --log=stdout &
NGROK_PID=$!

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Cerrando servicios..."
    kill $SERVER_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit 0
}

# Capturar señales de salida
trap cleanup SIGINT SIGTERM

echo ""
echo "📋 Instrucciones:"
echo "   1. Busca la URL HTTPS de ngrok (ej: https://abc123.ngrok.io)"
echo "   2. Abre esa URL en Safari en tu iPhone"
echo "   3. La geolocalización funcionará correctamente"
echo ""
echo "💡 Presiona Ctrl+C para cerrar ambos servicios"
echo ""

# Esperar indefinidamente
wait