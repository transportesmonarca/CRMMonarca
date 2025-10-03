# Monarca CRM - Guía Docker

Esta guía te ayudará a ejecutar Monarca CRM usando Docker para desarrollo y producción.

## 📋 Prerrequisitos

- Docker Desktop instalado
- Docker Compose instalado
- Acceso a Supabase (URL y Anon Key)

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.docker.example .env.docker
```

Edita `.env.docker` con tus credenciales de Supabase:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Application Settings
NODE_ENV=production
PORT=3000
```

### 2. Desarrollo (Con Hot Reload)

Para desarrollo con recarga automática:

```bash
# Construir y ejecutar en modo desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Ejecutar en segundo plano
docker-compose -f docker-compose.dev.yml up -d --build
```

La aplicación estará disponible en: http://localhost:3000

### 3. Producción

Para un entorno de producción con Nginx:

```bash
# Construir y ejecutar en modo producción
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build
```

La aplicación estará disponible en: http://localhost

## 🛠️ Comandos Útiles

### Gestión de Contenedores

```bash
# Ver logs de la aplicación
docker-compose logs -f app

# Ver logs de desarrollo
docker-compose -f docker-compose.dev.yml logs -f app

# Detener servicios
docker-compose down

# Detener y limpiar volúmenes
docker-compose down -v

# Reconstruir sin caché
docker-compose build --no-cache
```

### Desarrollo

```bash
# Entrar al contenedor de desarrollo
docker-compose -f docker-compose.dev.yml exec app /bin/sh

# Instalar nuevas dependencias (requiere rebuild)
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build
```

### Producción

```bash
# Ver estado de servicios
docker-compose ps

# Reiniciar servicios
docker-compose restart

# Ver logs de Nginx
docker-compose logs nginx
```

## 🔍 Health Check

Puedes verificar el estado de la aplicación visitando:
- Desarrollo: http://localhost:3000/api/health
- Producción: http://localhost/api/health

## 📊 Monitoreo

### Logs de Nginx (Producción)

Los logs de Nginx se almacenan en volúmenes Docker:

```bash
# Ver logs de acceso
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Ver logs de errores
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

### Métricas de Contenedores

```bash
# Ver uso de recursos
docker stats

# Ver información detallada
docker-compose ps
docker inspect monarca-app
```

## 🔧 Troubleshooting

### Problemas Comunes

#### Error de Variables de Entorno

```bash
# Verificar que las variables estén configuradas
docker-compose exec app printenv | grep SUPABASE
```

#### Puerto en Uso

```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Usar puerto 3001 en lugar de 3000
```

#### Problemas de Construcción

```bash
# Limpiar caché de Docker
docker system prune -f
docker-compose build --no-cache
```

#### Reiniciar Completamente

```bash
# Detener todo y limpiar
docker-compose down -v
docker system prune -f

# Reconstruir desde cero
docker-compose up --build
```

## 🚢 Despliegue en Servidor

### Usando Docker Compose

1. Copia los archivos necesarios al servidor:
   - `docker-compose.yml`
   - `nginx.conf`
   - `.env.docker` (con tus variables)

2. Ejecuta en el servidor:

```bash
# Construir y ejecutar
docker-compose up -d --build

# Verificar estado
docker-compose ps
docker-compose logs -f
```

### Variables de Entorno para Producción

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=tu_url_produccion
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_produccion
```

## 📝 Notas Importantes

1. **Seguridad**: Nunca commits archivos `.env` con credenciales reales
2. **Performance**: El modo producción incluye optimizaciones de Next.js
3. **Logs**: Los logs se almacenan en volúmenes Docker para persistencia
4. **Backup**: Considera hacer backup de los volúmenes de logs si es necesario

## 🆘 Soporte

Si encuentras problemas:

1. Verifica que Docker esté ejecutándose
2. Confirma que las variables de entorno estén configuradas
3. Revisa los logs con `docker-compose logs`
4. Verifica el health check endpoint
5. Consulta la sección de troubleshooting

¡Listo! Tu aplicación Monarca CRM debería estar ejecutándose en Docker. 🎉