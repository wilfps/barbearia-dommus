#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${DB_PATH:-/var/lib/dommus/dommus.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dommus}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "Banco nao encontrado em: $DB_PATH"
  exit 1
fi

STAMP="$(date +%F-%H%M%S)"
TARGET="$BACKUP_DIR/dommus-$STAMP.db"

cp "$DB_PATH" "$TARGET"
echo "Backup criado em: $TARGET"
