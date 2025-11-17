#!/bin/bash

# Script para iniciar el servidor de desarrollo y mostrar la URL para móvil

echo "🚀 Iniciando servidor de desarrollo para acceso móvil..."

# Obtener la IP local (WiFi)
IP=$(ifconfig en0 | grep "inet " | awk '{print $2}')

if [ -z "$IP" ]; then
    echo "❌ No se pudo obtener la IP. Asegúrate de estar conectado a WiFi."
    exit 1
fi

echo ""
echo "📱 Para acceder desde tu celular, ve a:"
echo "   http://$IP:3001"
echo ""
echo "📋 URL copiada al portapapeles (Cmd+V para pegar)"
echo "http://$IP:3001" | pbcopy

echo ""
echo "🌐 Iniciando servidor en puerto 3001..."
echo ""

# Iniciar el servidor
npm run dev:host