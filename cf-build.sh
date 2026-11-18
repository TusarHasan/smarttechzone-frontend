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
tar --exclude=./cf-dist --exclude=./cf-dist.zip --exclude=./.git --exclude=./.github --exclude=./node_modules --exclude=./netlify --exclude=./functions \
    --exclude=./cf-lib --exclude=./.wrangler --exclude=./.vscode --exclude=./.gitignore --exclude=./bak \
    --exclude='./Claude outputs' --exclude=./_to_delete --exclude=./netlify.toml --exclude=./cf-build.sh \
    --exclude='*.md' -cf - . | tar -xf - -C "$OUT"
rm -f "$OUT/_redirects"   # Netlify-র প্রক্সি/রিরাইট রুল Cloudflare-এ দরকার নেই (functions/ ও pretty URL দেখে)
# পুরনো ব্রাউজার (Chrome 51-ধরনের পুরনো ফোন) সাপোর্ট: স্ক্রিপ্ট ES2015-এ নামায় + ছোট polyfill বসায়।
# এটা routes-exclude.js-এর আগে চলতে হবে, যাতে /legacy-polyfills.js স্ট্যাটিক ফাইল হিসেবে ধরা পড়ে।
# ফেইল-সফট: esbuild ইনস্টল বা রূপান্তর ব্যর্থ হলে আসল ফাইল নিয়েই ডিপ্লয় চলে।
LEG="$TMP/legacy"; mkdir -p "$LEG"
if ( cd "$LEG" && npm init -y >/dev/null 2>&1 && npm install esbuild@0.25.12 --silent --no-audit --no-fund >/dev/null 2>&1 ); then
  NODE_PATH="$LEG/node_modules" node "$SRC/cf-lib/legacy-build.js" "$OUT" || echo "legacy-build ব্যর্থ, রূপান্তর ছাড়াই চলছে"
else
  echo "esbuild ইনস্টল হয়নি, পুরনো ব্রাউজার রূপান্তর বাদ"
fi
( cd "$TMP" && "$WRANGLER" pages functions build "$SRC/functions" --outdir "$TMP/w" --output-routes-path "$OUT/_routes.json" --output-config-path "$TMP/cfg.json" >/dev/null )
# রুট ক্যাচ-অল (ভেন্ডরের Shop Link: functions/[[path]].js) থাকলে static ফাইলগুলো _routes.json-এ exclude করে দেয়
node "$SRC/cf-lib/routes-exclude.js" "$OUT" "$SRC/functions"
W="$TMP/w/index.js"
[ -s "$W" ] || { echo "worker bundle পাওয়া যায়নি"; exit 1; }
cp "$W" "$OUT/_worker.js"
( cd "$OUT" && zip -qr "$OUT.zip" . )
echo "ready: $OUT ($(find "$OUT" -type f | wc -l) files), zip: $OUT.zip"
