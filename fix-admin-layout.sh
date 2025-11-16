#!/usr/bin/env bash
set -e

FILE="src/app/admin/page.tsx"

echo "Backing up $FILE to $FILE.bak"
cp "$FILE" "$FILE.bak"

echo "Updating max width containers..."
sed -i '' 's/max-w-full/max-w-6xl mx-auto/g' "$FILE"

echo "Removing horizontal scroll from nav tabs..."
sed -i '' 's/space-x-6 overflow-x-auto/space-x-6/g' "$FILE"

echo "Done. Open $FILE and verify the layout."
