#!/usr/bin/env bash
# Respaldo reproducible de la base de datos de produccion.
# Uso:  npm run db:backup   (usa DATABASE_URL del entorno)
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL para hacer el respaldo}"

STAMP="$(date +%Y%m%d_%H%M%S)"
DEST_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DEST_DIR"
DESTINO="$DEST_DIR/crm_experta_$STAMP.sql.gz"

echo "=== Respaldo -> $DESTINO"
unset sslmode # evita confundir el autenticador si la URL trae sslmode
pg_dump --no-owner --no-privileges --commit "$DATABASE_URL" | gzip > "$DESTINO"
echo "=== Respaldo completado: $DESTINO ($(du -h "$DESTINO" | cut -f1))"