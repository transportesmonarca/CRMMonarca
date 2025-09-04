#!/usr/bin/env bash
# Ejecuta la RPC crear_recordatorios_cumpleanos en Supabase (usa SERVICE ROLE KEY)
# Uso:
#   SUPABASE_URL="https://xyzcompany.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" ./scripts/run-birthday-reminders.sh

set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: debes exportar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar."
  echo "Ejemplo: SUPABASE_URL=\"https://xyz.supabase.co\" SUPABASE_SERVICE_ROLE_KEY=\"<key>\" $0"
  exit 2
fi

ENDPOINT="$SUPABASE_URL/rest/v1/rpc/crear_recordatorios_cumpleanos"

# Llamada POST al endpoint RPC de PostgREST
RESPONSE=$(curl -sS -X POST "$ENDPOINT" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dias_anticipacion": 2}')

# Mostrar respuesta
printf "Respuesta del RPC crear_recordatorios_cumpleanos:\n%s\n" "$RESPONSE"

# Nota: la respuesta normalmente será un número (cantidad de recordatorios creados)

exit 0
