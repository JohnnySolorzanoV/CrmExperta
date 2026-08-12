#!/usr/bin/env bash
# Restauracion reproducible de un respaldo creado con npm run db:backup.
# Uso:  npm run db:restore -- ruta/al/respaldo.sql.gz
#   o   npm run db:restore -- --latest
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL (base de destino) para restaurar}"

# Ejecuta un binario de PostgreSQL: prefiere el del host; si no existe, lo
# ejecuta dentro del contenedor indicado por PG_CONTAINER (p. ej. crm-pg-test).
pg_tool() {
  local bin="$1"; shift
  if command -v "$bin" >/dev/null 2>&1; then
    "$bin" "$@"
  else
    [ -n "${PG_CONTAINER:-}" ] || { echo "No se encontro '$bin' en el host y no se definio PG_CONTAINER" >&2; exit 1; }
    docker exec -i "$PG_CONTAINER" "$bin" "$@"
  fi
}

# Dentro del contenedor no existe el puerto expuesto por el host; Postgres
# escucha en 5432, asi que se reescribe la URL solo cuando se ejecuta ahi.
if ! command -v psql >/dev/null 2>&1; then
  PG_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(localhost|127\.0\.0\.1):[0-9]+#localhost:'"${PG_INTERNAL_PORT:-5432}"'#')"
else
  PG_URL="$DATABASE_URL"
fi

ARCHIVO="${1:-}"
DEST_DIR="${BACKUP_DIR:-./backups}"

if [ "$ARCHIVO" = "--latest" ] || [ -z "$ARCHIVO" ]; then
  ARCHIVO="$(ls -t "$DEST_DIR"/*.sql.gz 2>/dev/null | head -n 1 || true)"
  if [ -z "$ARCHIVO" ]; then
    echo "No hay respaldos en $DEST_DIR" >&2
    exit 1
  fi
  echo "Usando respaldo mas reciente: $ARCHIVO"
fi

[ -f "$ARCHIVO" ] || { echo "Archivo no existe: $ARCHIVO" >&2; exit 1; }

echo "=== Restaurando $ARCHIVO en DATABASE_URL"
unset sslmode
gzip -dc "$ARCHIVO" | pg_tool psql -v ON_ERROR_STOP=1 "$PG_URL"
echo "=== Restauracion completada"
