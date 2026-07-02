#!/bin/bash
# Export the full database to a SQL dump for deployment
# Usage: ./scripts/export_db.sh [db_name] [db_user]

set -e

DB_NAME="${1:-matdaaniq_db}"
DB_USER="${2:-root}"
OUTPUT="db_dump.sql"

echo "Exporting database '$DB_NAME' to $OUTPUT ..."
mysqldump -u "$DB_USER" -p "$DB_NAME" --single-transaction --no-tablespaces > "$OUTPUT"
echo "Done! File: $OUTPUT ($(wc -c < "$OUTPUT") bytes)"
echo ""
echo "To import on production:"
echo "  docker compose exec -T db sh -c 'exec mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\"' < db_dump.sql"
