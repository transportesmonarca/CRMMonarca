#!/bin/bash

# Script para abrir todas las páginas necesarias de Google Cloud Console
# Ejecutar con: bash scripts/abrir-google-cloud.sh

echo "🚀 Abriendo Google Cloud Console..."
echo ""

# 1. Activar Maps JavaScript API
echo "1️⃣ Abriendo página para activar Maps JavaScript API..."
open "https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" || xdg-open "https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" 2>/dev/null

sleep 2

# 2. Dashboard de APIs
echo "2️⃣ Abriendo Dashboard de APIs..."
open "https://console.cloud.google.com/apis/dashboard" || xdg-open "https://console.cloud.google.com/apis/dashboard" 2>/dev/null

sleep 2

# 3. Credenciales
echo "3️⃣ Abriendo página de Credenciales..."
open "https://console.cloud.google.com/apis/credentials" || xdg-open "https://console.cloud.google.com/apis/credentials" 2>/dev/null

echo ""
echo "✅ Páginas abiertas en tu navegador"
echo ""
echo "📋 CHECKLIST:"
echo "   [ ] 1. Selecciona tu proyecto (parte superior)"
echo "   [ ] 2. En Maps JavaScript API, haz clic en HABILITAR"
echo "   [ ] 3. Verifica en Dashboard que esté habilitada"
echo "   [ ] 4. En Credenciales, verifica que tu API key no tenga restricciones que bloqueen localhost"
echo ""
echo "⏱️  Espera 2-5 minutos después de habilitar y recarga tu CRM"
echo ""
