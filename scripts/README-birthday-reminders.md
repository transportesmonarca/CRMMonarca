Quick steps: ejecutar la función de recordatorios de cumpleaños

1) Ejecutar la RPC ahora (localmente) usando el script incluido

En macOS / zsh, desde la raíz del proyecto:

```bash
# exporta tus variables de entorno (no pegues keys en chats públicos)
export SUPABASE_URL="https://<tu-proyecto>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"

# ejecutar
./scripts/run-birthday-reminders.sh
```

El script hace una petición POST al endpoint RPC `crear_recordatorios_cumpleanos` y mostrará la respuesta (cantidad de recordatorios creados).

2) Verificar en la base de datos (usa SQL editor de Supabase)

```sql
SELECT id, titulo, descripcion, fecha_vencimiento, estado, operador_id, fecha_creacion
FROM recordatorios
WHERE tipo = 'cumpleanos'
ORDER BY fecha_creacion DESC
LIMIT 100;
```

3) Si prefieres no usar el service role key, puedes ejecutar directamente desde el SQL editor de Supabase:

```sql
SELECT crear_recordatorios_cumpleanos(2);
```

Notas de seguridad:
- El script usa la service role key, que puede modificar datos. Guarda la key como secret en tu entorno y no la subas al repo.
- Alternativa más segura: crear un Job en Supabase o usar la UI del scheduler.
