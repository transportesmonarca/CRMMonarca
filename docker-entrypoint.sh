#!/bin/sh

# Script de inicio para contenedor Docker

# Configuración de colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${GREEN}🚀 Iniciando Monarca CRM...${NC}"

# Verificar variables de entorno requeridas
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_URL no está configurada${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada${NC}"
    exit 1
fi

echo "${GREEN}✅ Variables de entorno configuradas correctamente${NC}"

# Mostrar información del contenedor
echo "${YELLOW}📦 Información del contenedor:${NC}"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Ambiente: ${NODE_ENV:-production}"
echo "Puerto: ${PORT:-3000}"

# Iniciar la aplicación
echo "${GREEN}🎯 Iniciando servidor Next.js...${NC}"
exec "$@"