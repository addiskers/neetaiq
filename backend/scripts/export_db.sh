#!/bin/bash
# Export the full database to a SQL dump for deployment
# Usage: ./scripts/export_db.sh

set -e

DB_NAME="${1:-netaiq_db}"
DB_USER="${2:-postgres}"
OUTPUT="db_dump.sql"

echo "Exporting database '$DB_NAME' to $OUTPUT ..."
pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --if-exists --clean > "$OUTPUT"
echo "Done! File: $OUTPUT ($(wc -c < "$OUTPUT") bytes)"
echo ""
echo "To import on production:"
echo "  docker compose exec -T db psql -U postgres -d matdaaniq_db < db_dump.sql"
