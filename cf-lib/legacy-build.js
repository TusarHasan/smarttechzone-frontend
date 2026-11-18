#!/usr/bin/env node
/* পুরনো ব্রাউজার সাপোর্ট: ডিপ্লয় ফোল্ডারের (OUT) সব .js ও HTML-এর inline <script> esbuild দিয়ে
   ES2015 লেভেলে (Chrome 51 পর্যন্ত চলে) নামায় (async/await, ?., ??, optional catch, object spread ইত্যাদি)।
   আরও: প্রতিটি HTML-এ ছোট একটা লোডার বসায়, যা শুধু পুরনো ব্রাউজারে /legacy-polyfills.js লোড করে।
   ফেইল-সফট: কোনো ফাইল রূপান্তর না হলে আসল ফাইলটাই থাকে, বিল্ড ভাঙে না।
   ব্যবহার: node cf-lib/legacy-build.js <OUT>   (esbuild NODE_PATH বা কাছের node_modules থেকে আসতে হবে) */
'use strict';
const fs = require('fs');
const path = require('path');
const out = path.resolve(process.argv[2] || '');
if (!out || !fs.existsSync(out)) { console.error('legacy-build: OUT ফোল্ডার নেই'); process.exit(0); }
let esbuild;
try { esbuild = require('esbuild'); } catch (e) { console.warn('legacy-build: esbuild পাওয়া যায়নি, রূপান্তর বাদ'); process.exit(0); }

const TARGET = ['es2015'];
const SKIP_FILES = new Set(['_worker.js', 'legacy-polyfills.js']);
const LOADER = '<script>(function(){try{var o=Object,s=String.prototype;if(!(o.entries&&o.values&&s.padStart&&Promise.prototype["finally"]&&window.AbortController&&window.IntersectionObserver&&Element.prototype.append&&Element.prototype.closest))document.write(\'<script src="/legacy-polyfills.js"><\\/script>\')}catch(e){}})()</script>';
const stat = { js: 0, inline: 0, fail: 0 };

function xform(code, label) {
  try { return esbuild.transformSync(code, { target: TARGET, loader: 'js', charset: 'utf8', logLevel: 'silent' }).code; }
  catch (e) { stat.fail++; console.warn('legacy-build: বাদ (' + label + '): ' + String(e.message).split('\n')[0]); return null; }
}
function isJsType(attrs) {
  const m = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
  return !m || /^(text|application)\/(javascript|ecmascript)$/i.test(m[1]);
}
function walk(d, fn) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n), s = fs.statSync(p);
    if (s.isDirectory()) walk(p, fn); else fn(p);
  }
}
walk(out, (p) => {
  const base = path.basename(p), rel = path.relative(out, p);
  if (/\.js$/i.test(base) && !SKIP_FILES.has(base)) {
    const src = fs.readFileSync(p, 'utf8'), res = xform(src, rel);
    if (res !== null) { fs.writeFileSync(p, res); stat.js++; }
  } else if (/\.html?$/i.test(base)) {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/(<script\b)([^>]*)(>)([\s\S]*?)(<\/script>)/gi, (all, a, attrs, c, body, e) => {
      if (/\bsrc\s*=/i.test(attrs) || !body.trim() || !isJsType(attrs)) return all;
      const res = xform(body, rel + ' (inline)');
      if (res === null) return all;
      stat.inline++;
      return a + attrs + c + '\n' + res.replace(/<\/script/gi, '<\\/script') + e;
    });
    if (!html.includes('legacy-polyfills.js')) {
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + LOADER);
      else if (/<script\b/i.test(html)) html = html.replace(/<script\b/i, (m) => LOADER + m);
    }
    fs.writeFileSync(p, html);
  }
});
fs.copyFileSync(path.join(__dirname, 'legacy-polyfills.js'), path.join(out, 'legacy-polyfills.js'));
console.log('legacy-build: js ' + stat.js + ', inline ' + stat.inline + ', বাদ ' + stat.fail);
