#!/bin/bash

# Script para configurar túnel HTTPS con ngrok

echo "🔧 Configurando acceso HTTPS para móviles..."

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado"
    echo "📥 Instalando ngrok..."
    
    if command -v brew &> /dev/null; then
        # macOS con Homebrew
        brew install ngrok/ngrok/ngrok
    elif command -v npm &> /dev/null; then
        # Usar npm
        npm install -g ngrok
    else
        echo "⚠️  No se pudo instalar automáticamente"
        echo "🔗 Descarga ngrok desde: https://ngrok.com/download"
        echo "📖 O lee docs/HTTPS-SETUP.md para más opciones"
        exit 1
    fi
fi

# Verificar si ngrok necesita autenticación
echo "🔑 Verificando configuración de ngrok..."
if ! ngrok config check &> /dev/null; then
    echo "⚠️  ngrok necesita configuración"
    echo "1. Crea una cuenta gratuita en https://ngrok.com"
    echo "2. Obtén tu authtoken desde https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Ejecuta: ngrok config add-authtoken <tu-token>"
    echo ""
    read -p "¿Ya tienes tu authtoken? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔗 Ejecuta: ngrok config add-authtoken <tu-token>"
        echo "📖 Después ejecuta este script nuevamente"
    fi
    exit 0
fi

echo "✅ ngrok está configurado correctamente"
echo ""
echo "🚀 Iniciando servidor de desarrollo..."

# Iniciar Next.js en background
npm run dev:host &
DEV_PID=$!

# Esperar a que el servidor esté listo
echo "⏳ Esperando que el servidor esté listo..."
sleep 3

# Función de limpieza
cleanup() {
    echo ""
    echo "🛑 Deteniendo servidores..."
    kill $DEV_PID 2>/dev/null
    exit 0
}

# Manejar Ctrl+C
trap cleanup SIGINT SIGTERM

# Iniciar ngrok
echo "🌐 Iniciando túnel HTTPS..."
echo "📱 La URL HTTPS aparecerá abajo - úsala en tu móvil"
echo "⭐ Para detener, presiona Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ngrok http 3001 --log stdout