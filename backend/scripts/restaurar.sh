#!/usr/bin/env bash
# Restauracion reproducible de un respaldo creado con npm run db:backup.
# Uso:  npm run db:restore -- ruta/al/respaldo.sql.gz
#   o   npm run db:restore -- --latest
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL (base de destino) para restaurar}"

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
zcat "$ARCHIVO" | psql -v ON_ERROR_STOP=1 "$DATABASE_URL"
echo "=== Restauracion completada"