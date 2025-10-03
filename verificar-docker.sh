#!/bin/bash

# Script de verificación Docker para Monarca CRM
# Uso: ./verificar-docker.sh [dev|prod]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Determinar modo
MODE=${1:-dev}
if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    print_error "Modo inválido. Usa 'dev' o 'prod'"
    exit 1
fi

# URLs según el modo
if [ "$MODE" = "dev" ]; then
    BASE_URL="http://localhost:3000"
    COMPOSE_FILE="docker-compose.dev.yml"
    SERVICE_NAME="monarca-dev"
else
    BASE_URL="http://localhost"
    COMPOSE_FILE="docker-compose.yml"
    SERVICE_NAME="monarca-app"
fi

print_step "Verificando configuración Docker para modo: $MODE"

# 1. Verificar que Docker esté ejecutándose
print_step "Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker no está ejecutándose. Inicia Docker Desktop."
    exit 1
fi
print_success "Docker está ejecutándose"

# 2. Verificar archivo de variables de entorno
print_step "Verificando archivo de configuración..."
if [ ! -f ".env.docker" ]; then
    print_warning "Archivo .env.docker no encontrado. Creando desde template..."
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env.docker
        print_warning "Edita .env.docker con tus credenciales de Supabase antes de continuar"
        exit 1
    else
        print_error "No se encontró .env.docker.example"
        exit 1
    fi
fi

# 3. Verificar variables de entorno críticas
print_step "Verificando variables de entorno..."
source .env.docker

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "tu_supabase_url" ]; then
    print_error "NEXT_PUBLIC_SUPABASE_URL no está configurada correctamente en .env.docker"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" = "tu_supabase_anon_key" ]; then
    print_error "NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada correctamente en .env.docker"
    exit 1
fi

print_success "Variables de entorno configuradas"

# 4. Construir y ejecutar contenedores
print_step "Construyendo y ejecutando contenedores..."
if [ "$MODE" = "dev" ]; then
    docker-compose -f docker-compose.dev.yml up -d --build
else
    docker-compose up -d --build
fi

# 5. Esperar a que los servicios estén listos
print_step "Esperando a que los servicios estén listos..."
sleep 10

# 6. Verificar que los contenedores estén ejecutándose
print_step "Verificando estado de contenedores..."
if [ "$MODE" = "dev" ]; then
    if ! docker-compose -f docker-compose.dev.yml ps | grep "Up" > /dev/null; then
        print_error "Los contenedores no están ejecutándose correctamente"
        print_step "Logs de la aplicación:"
        docker-compose -f docker-compose.dev.yml logs app
        exit 1
    fi
else
    if ! docker-compose ps | grep "Up" > /dev/null; then
        print_error "Los contenedores no están ejecutándose correctamente"
        print_step "Logs de la aplicación:"
        docker-compose logs app
        exit 1
    fi
fi

print_success "Contenedores ejecutándose correctamente"

# 7. Probar health check endpoint
print_step "Probando health check endpoint..."
for i in {1..30}; do
    if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
        if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
            print_success "Health check exitoso"
            echo "Respuesta: $HEALTH_RESPONSE"
            break
        fi
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Health check falló después de 30 intentos"
        print_step "Revisando logs..."
        if [ "$MODE" = "dev" ]; then
            docker-compose -f docker-compose.dev.yml logs --tail=20 app
        else
            docker-compose logs --tail=20 app
        fi
        exit 1
    fi
    
    echo -n "."
    sleep 2
done

# 8. Probar página principal
print_step "Probando página principal..."
if curl -s "$BASE_URL" | grep -q "Monarca\|CRM\|html" > /dev/null 2>&1; then
    print_success "Página principal responde correctamente"
else
    print_warning "La página principal podría tener problemas"
fi

# 9. Mostrar información final
echo
echo "🎉 ¡Verificación completada exitosamente!"
echo
echo "📊 Información de servicios:"
if [ "$MODE" = "dev" ]; then
    docker-compose -f docker-compose.dev.yml ps
    echo
    echo "🔗 URLs disponibles:"
    echo "   • Aplicación: http://localhost:3000"
    echo "   • Health Check: http://localhost:3000/api/health"
    echo
    echo "📝 Comandos útiles:"
    echo "   • Ver logs: docker-compose -f docker-compose.dev.yml logs -f app"
    echo "   • Detener: docker-compose -f docker-compose.dev.yml down"
else
    docker-compose ps
    echo
    echo "🔗 URLs disponibles:"
    echo "   • Aplicación: http://localhost"
    echo "   • Health Check: http://localhost/api/health"
    echo
    echo "📝 Comandos útiles:"
    echo "   • Ver logs app: docker-compose logs -f app"
    echo "   • Ver logs nginx: docker-compose logs -f nginx"
    echo "   • Detener: docker-compose down"
fi

echo
print_success "¡Monarca CRM está ejecutándose en Docker!"