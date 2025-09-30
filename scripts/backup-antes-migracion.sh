#!/bin/bash

# =================================================================
# SCRIPT DE BACKUP PARA SUPABASE - MIGRACIÓN EMBARQUES
# Fecha: $(date +"%Y-%m-%d %H:%M:%S")
# =================================================================

echo "🔒 Iniciando backup de seguridad antes de migración..."

# Configuración (ajustar según tu proyecto)
PROJECT_REF="your-project-ref"  # Cambiar por tu referencia de proyecto Supabase
DB_PASSWORD="your-password"     # Cambiar por tu contraseña de base de datos

# Crear directorio de backups si no existe
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Timestamp para el archivo de backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_embarques_migracion_$TIMESTAMP.sql"

echo "📁 Archivo de backup: $BACKUP_FILE"

# ================================================================= 
# OPCIÓN 1: BACKUP COMPLETO DE SUPABASE (Recomendado)
# =================================================================

echo "📤 Creando backup completo de Supabase..."

# Usar Supabase CLI para backup completo
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI encontrado, creando backup..."
    supabase db dump --local > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup completo creado exitosamente: $BACKUP_FILE"
    else
        echo "❌ Error creando backup con Supabase CLI"
        exit 1
    fi
else
    echo "⚠️  Supabase CLI no encontrado. Intentando con pg_dump..."
    
    # OPCIÓN 2: Backup con pg_dump (manual)
    # Nota: Necesitarás la cadena de conexión de tu proyecto Supabase
    
    echo "🔗 Para hacer backup manual, necesitas:"
    echo "   1. La cadena de conexión de tu base de datos Supabase"
    echo "   2. Ejecutar este comando:"
    echo ""
    echo "   pg_dump 'postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres' > $BACKUP_FILE"
    echo ""
    echo "📋 Alternativamente, desde la interfaz web de Supabase:"
    echo "   1. Ve a Settings → Database"
    echo "   2. Busca la sección 'Database URL' o 'Connection String'"
    echo "   3. Usa esa URL con pg_dump"
fi

# =================================================================
# OPCIÓN 3: BACKUP SOLO DE LA TABLA EMBARQUES (más rápido)
# =================================================================

BACKUP_TABLE_FILE="$BACKUP_DIR/backup_tabla_embarques_$TIMESTAMP.sql"

echo ""
echo "📊 Creando backup específico de tabla embarques..."
echo "   Archivo: $BACKUP_TABLE_FILE"

# Script SQL para backup específico de embarques
cat > "$BACKUP_TABLE_FILE" << 'EOF'
-- =================================================================
-- BACKUP ESPECÍFICO TABLA EMBARQUES
-- Fecha: $(date +"%Y-%m-%d %H:%M:%S")
-- =================================================================

-- Crear tabla de respaldo
DROP TABLE IF EXISTS embarques_backup_migracion;
CREATE TABLE embarques_backup_migracion AS 
SELECT * FROM embarques;

-- Verificar conteo
SELECT 
    'embarques_original' as tabla,
    COUNT(*) as registros
FROM embarques
UNION ALL
SELECT 
    'embarques_backup' as tabla,
    COUNT(*) as registros  
FROM embarques_backup_migracion;

-- Comentarios para documentar
COMMENT ON TABLE embarques_backup_migracion IS 
'Backup de la tabla embarques antes de migración de normalización - $(date +"%Y-%m-%d")';

EOF

echo "✅ Script de backup de tabla creado: $BACKUP_TABLE_FILE"

# =================================================================
# VERIFICACIÓN DE ESPACIO EN DISCO
# =================================================================

echo ""
echo "💾 Verificando espacio disponible..."
df -h .

# Estimar tamaño de la tabla embarques
echo ""
echo "📏 Para estimar el tamaño de backup, ejecuta esta consulta en Supabase:"
echo ""
echo "   SELECT "
echo "     schemaname,"
echo "     tablename,"
echo "     attname,"
echo "     n_distinct,"
echo "     correlation,"
echo "     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size"
echo "   FROM pg_stats "
echo "   WHERE tablename = 'embarques';"
echo ""

# =================================================================
# INSTRUCCIONES FINALES
# =================================================================

echo ""
echo "🎯 INSTRUCCIONES DE BACKUP:"
echo ""
echo "1. 🔒 BACKUP COMPLETO (Recomendado):"
echo "   - Desde Supabase Dashboard > Settings > Database"
echo "   - Usar 'Export Database' o ejecutar:"
echo "     supabase db dump --project-id $PROJECT_REF > backup_completo.sql"
echo ""
echo "2. 🎯 BACKUP SOLO TABLA EMBARQUES (Más rápido):"
echo "   - Ejecutar el archivo: $BACKUP_TABLE_FILE"
echo "   - Esto creará una tabla embarques_backup_migracion"
echo ""
echo "3. ✅ VERIFICAR BACKUP:"
echo "   - Verificar que el archivo de backup no esté vacío"
echo "   - Comprobar que contiene datos de embarques"
echo "   - Verificar conteo de registros"
echo ""
echo "4. 🚀 CONTINUAR CON MIGRACIÓN:"
echo "   - Solo después de confirmar backup exitoso"
echo "   - Ejecutar script: 100-migracion-completa-embarques.sql"
echo ""
echo "⚠️  IMPORTANTE: NO proceder sin backup válido"
echo ""

# Crear archivo de comandos útiles
COMMANDS_FILE="$BACKUP_DIR/comandos_utiles_$TIMESTAMP.txt"
cat > "$COMMANDS_FILE" << EOF
# Comandos útiles para la migración

## BACKUP SUPABASE
supabase db dump --project-id YOUR-PROJECT-REF > backup_completo.sql

## RESTAURAR BACKUP (si es necesario)
supabase db reset --project-id YOUR-PROJECT-REF
psql -f backup_completo.sql "postgresql://..."

## VERIFICAR CONTEOS
SELECT COUNT(*) FROM embarques;
SELECT COUNT(*) FROM embarques_core;
SELECT * FROM validar_migracion_embarques();

## ROLLBACK (si es necesario)
DROP VIEW IF EXISTS embarques;
DROP TABLE IF EXISTS embarques_core CASCADE;
ALTER TABLE embarques_backup_migracion RENAME TO embarques;

EOF

echo "📝 Comandos útiles guardados en: $COMMANDS_FILE"

echo ""
echo "🎉 Backup preparado. ¡Puedes proceder cuando tengas el backup completo!"