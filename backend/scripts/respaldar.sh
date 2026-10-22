#!/usr/bin/env bash
# Respaldo reproducible de la base de datos de produccion.
# Uso:  npm run db:backup   (usa DATABASE_URL del entorno)
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL para hacer el respaldo}"

# Ejecuta un binario de PostgreSQL: prefiere el del host; para una base local
# puede usar PG_CONTAINER y para una base externa usa un cliente efimero.
pg_tool() {
  local bin="$1"; shift
  if command -v "$bin" >/dev/null 2>&1; then
    "$bin" "$@"
  elif [ -n "${PG_CONTAINER:-}" ]; then
    docker exec -i "$PG_CONTAINER" "$bin" "$@"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm -i "${PG_IMAGE:-postgres:16-alpine}" "$bin" "$@"
  else
    echo "No se encontro '$bin' en el host; defina PG_CONTAINER o instale/inicie Docker" >&2
    exit 1
  fi
}

# Dentro del contenedor de la base local no existe el puerto expuesto por el
# host; Postgres escucha en 5432, asi que se reescribe la URL solo ahi.
if ! command -v pg_dump >/dev/null 2>&1 && [ -n "${PG_CONTAINER:-}" ]; then
  PG_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(localhost|127\.0\.0\.1):[0-9]+#localhost:'"${PG_INTERNAL_PORT:-5432}"'#')"
else
  PG_URL="$DATABASE_URL"
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
DEST_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DEST_DIR"
DESTINO="$DEST_DIR/crm_experta_$STAMP.sql.gz"

echo "=== Respaldo -> $DESTINO"
unset sslmode # evita confundir el autenticador si la URL trae sslmode
pg_tool pg_dump --no-owner --no-privileges --clean --if-exists "$PG_URL" | gzip > "$DESTINO"
echo "=== Respaldo completado: $DESTINO ($(du -h "$DESTINO" | cut -f1))"
