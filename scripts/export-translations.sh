#!/usr/bin/env bash
# Export all translations from the remote D1 database to JSON.
# Usage: bun run db:export-translations
# Output: translations-export.json in project root

set -euo pipefail
cd "$(dirname "$0")/../backend"

DB_NAME="live_menu"
ENV="--env=production"
OUT="../translations-export.json"

run_query() {
  bunx wrangler d1 execute "$DB_NAME" --remote $ENV --command "$1" --json 2>/dev/null
}

echo "Exporting translations from remote D1..."

# Export all translation tables in parallel
ui_settings=$(run_query "SELECT key, value FROM settings WHERE key LIKE 'ui:%' ORDER BY key")
menu_item_names=$(run_query "SELECT n.menu_item_id, n.language_code, n.name, n.description FROM menu_item_names n ORDER BY n.menu_item_id, n.language_code")
gallery_page_names=$(run_query "SELECT n.gallery_page_id, n.language_code, n.name FROM gallery_page_names n ORDER BY n.gallery_page_id, n.language_code")
trait_names=$(run_query "SELECT n.trait_id, n.language_code, n.name FROM trait_names n ORDER BY n.trait_id, n.language_code")
trait_group_names=$(run_query "SELECT n.trait_group_id, n.language_code, n.name FROM trait_group_names n ORDER BY n.trait_group_id, n.language_code")
option_group_names=$(run_query "SELECT n.option_group_id, n.language_code, n.name FROM option_group_names n ORDER BY n.option_group_id, n.language_code")
option_names=$(run_query "SELECT n.option_id, n.language_code, n.name FROM option_names n ORDER BY n.option_id, n.language_code")

# Use bun to assemble the JSON (handles escaping properly)
bun -e "
const extract = (json) => {
  const parsed = JSON.parse(json);
  // wrangler d1 --json returns an array of result sets; take first result's rows
  return parsed[0]?.results ?? [];
};

const output = {
  exported_at: new Date().toISOString(),
  ui_settings: extract(process.argv[1]),
  menu_item_names: extract(process.argv[2]),
  gallery_page_names: extract(process.argv[3]),
  trait_names: extract(process.argv[4]),
  trait_group_names: extract(process.argv[5]),
  option_group_names: extract(process.argv[6]),
  option_names: extract(process.argv[7]),
};

const counts = Object.entries(output)
  .filter(([k]) => k !== 'exported_at')
  .map(([k, v]) => '  ' + k + ': ' + v.length)
  .join('\n');

console.error('Exported:\n' + counts);
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
" "$ui_settings" "$menu_item_names" "$gallery_page_names" "$trait_names" "$trait_group_names" "$option_group_names" "$option_names" > "$OUT"

echo "Written to $OUT"
