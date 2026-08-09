#!/usr/bin/env bash
# backup_research_db.sh — Ngày 6. Dump toàn bộ research DB thành file JSON.
#
# Chạy:
#   bash research/backup_research_db.sh                    # backup vào research/backups/
#   bash research/backup_research_db.sh /path/to/dir       # backup vào dir khác
#
# Yêu cầu: mongodump (từ MongoDB Database Tools).
#   macOS:  brew install mongodb/brew/mongodb-database-tools
#   Ubuntu: apt-get install mongodb-database-tools
#   Windows: https://www.mongodb.com/try/download/database-tools
#
# Khuyến nghị lịch: chạy hằng ngày qua Windows Task Scheduler / cron.
# Ví dụ crontab (Linux):
#   0 3 * * * cd /path/to/voichat1012 && bash research/backup_research_db.sh >> research/backups/cron.log 2>&1

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.research ]]; then
    echo "❌ .env.research not found"
    exit 1
fi

# shellcheck disable=SC1091
set -a; source .env.research; set +a

URI="${RESEARCH_MONGO_URI:-${MONGO_URI:-}}"
if [[ -z "$URI" ]]; then
    echo "❌ MONGO_URI (or RESEARCH_MONGO_URI) not set in .env.research"
    exit 1
fi

DB="${RESEARCH_MONGO_DB:-${MONGO_DB:-viettalk_research}}"
if [[ "$DB" == "viettalk" ]]; then
    echo "❌ Refusing to backup production DB"
    exit 1
fi

OUT_DIR="${1:-research/backups}"
STAMP=$(date +%Y%m%d_%H%M%S)
TARGET="$OUT_DIR/$DB-$STAMP"

mkdir -p "$TARGET"

if ! command -v mongodump >/dev/null 2>&1; then
    echo "❌ mongodump not found. Install MongoDB Database Tools."
    echo "   https://www.mongodb.com/try/download/database-tools"
    exit 2
fi

echo "Dumping $DB → $TARGET/ (may take 1-5 min)..."
mongodump --uri="$URI" --db="$DB" --out="$TARGET" --quiet

# Compress
tar -czf "$TARGET.tar.gz" -C "$OUT_DIR" "$(basename "$TARGET")"
rm -rf "$TARGET"

SIZE=$(du -h "$TARGET.tar.gz" | cut -f1)
echo "✅ Backup done: $TARGET.tar.gz ($SIZE)"

# Retention: keep 30 days on disk
find "$OUT_DIR" -name "$DB-*.tar.gz" -mtime +30 -print -delete 2>/dev/null || true

echo "Older backups (>30 days) purged."
