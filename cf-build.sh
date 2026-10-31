#!/usr/bin/env bash
# Cloudflare Pages-এ ডাইরেক্ট আপলোডের জন্য ডিপ্লয় ফোল্ডার বানায়:
#   স্ট্যাটিক ফাইল + wrangler দিয়ে কম্পাইল করা _worker.js (functions/ থেকে) + _routes.json
# ব্যবহার: WRANGLER=/path/to/wrangler OUT=/path/cf-dist ./cf-build.sh   (OUT.zip ও তৈরি হয়)
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
WRANGLER="${WRANGLER:-wrangler}"
OUT="${OUT:-$HOME/cf-dist}"
TMP="$(mktemp -d)"
rm -rf "$OUT" "$OUT.zip" && mkdir -p "$OUT"
cd "$SRC"
tar --exclude=./cf-dist --exclude=./.git --exclude=./node_modules --exclude=./netlify --exclude=./functions \
    --exclude=./cf-lib --exclude=./.wrangler --exclude=./.vscode --exclude=./.gitignore --exclude=./bak \
    --exclude='./Claude outputs' --exclude=./_to_delete --exclude=./netlify.toml --exclude=./cf-build.sh \
    --exclude='*.md' -cf - . | tar -xf - -C "$OUT"
rm -f "$OUT/_redirects"   # Netlify-র প্রক্সি/রিরাইট রুল Cloudflare-এ দরকার নেই (functions/ ও pretty URL দেখে)
( cd "$TMP" && "$WRANGLER" pages functions build "$SRC/functions" --outdir "$TMP/w" --output-routes-path "$OUT/_routes.json" --output-config-path "$TMP/cfg.json" >/dev/null )
W="$TMP/w/index.js"
[ -s "$W" ] || { echo "worker bundle পাওয়া যায়নি"; exit 1; }
cp "$W" "$OUT/_worker.js"
( cd "$OUT" && zip -qr "$OUT.zip" . )
echo "ready: $OUT ($(find "$OUT" -type f | wc -l) files), zip: $OUT.zip"
