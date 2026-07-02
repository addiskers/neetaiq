#!/bin/bash
# Import a SQL dump into the Docker MySQL container
# Usage: ./scripts/import_db.sh [dump_file]

set -e

DUMP_FILE="${1:-db_dump.sql}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: $DUMP_FILE not found"
    exit 1
fi

echo "Importing $DUMP_FILE into Docker MySQL..."
docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < "$DUMP_FILE"
echo "Done! Data imported successfully."
