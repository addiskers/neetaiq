#!/bin/bash
# Import a SQL dump into the Docker Postgres container
# Usage: ./scripts/import_db.sh [dump_file]

set -e

DUMP_FILE="${1:-db_dump.sql}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: $DUMP_FILE not found"
    exit 1
fi

echo "Importing $DUMP_FILE into Docker Postgres..."
docker compose exec -T db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-matdaaniq_db}" < "$DUMP_FILE"
echo "Done! Data imported successfully."
