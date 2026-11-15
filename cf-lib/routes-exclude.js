// cf-build.sh থেকে চলে: functions/[[path]].js (রুট ক্যাচ-অল, ভেন্ডরের Shop Link) থাকলে _routes.json-এর include "/*" হয়ে যায়।
// তখন প্রতিটা ছবি/JS/CSS রিকোয়েস্টে ফাংশন চলে Pages-এর Functions কোটা খেয়ে ফেলত। তাই রুটে থাকা সব static ফাইল/ফোল্ডার
// exclude করা হয় — ফাংশন শুধু বাকি ঠিকানায় (ভেন্ডরের শপ নাম, ভুল URL, পেজের pretty URL) চলে।
// ব্যবহার: node routes-exclude.js <OUT ফোল্ডার> <functions ফোল্ডার>
const fs = require('fs');
const path = require('path');
const [out, fnDir] = process.argv.slice(2);
const routesFile = path.join(out, '_routes.json');

function fnRoutes(dir, prefix = '') {
    const list = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) { list.push(...fnRoutes(path.join(dir, e.name), prefix + '/' + e.name)); continue; }
        if (!e.name.endsWith('.js')) continue;
        const base = e.name.slice(0, -3);
        if (/^\[\[.*\]\]$/.test(base)) list.push({ p: prefix || '', wild: true });
        else if (/^\[.*\]$/.test(base)) list.push({ p: prefix, wild: true });
        else list.push({ p: base === 'index' ? prefix : prefix + '/' + base, wild: false });
    }
    return list;
}
const fns = fnRoutes(fnDir);
if (!fns.some(f => f.p === '' && f.wild)) { console.log('routes-exclude: রুট ক্যাচ-অল নেই, _routes.json যেমন ছিল তেমনই'); process.exit(0); }

const coversFn = (route, isDir) => fns.some(f => (isDir ? (f.p === route || f.p.startsWith(route + '/')) : f.p === route) && f.p !== '');
const exclude = new Set(['/']);
for (const e of fs.readdirSync(out, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const route = '/' + e.name;
    if (e.isDirectory()) { if (!coversFn(route, true)) exclude.add(route + '/*'); }
    else if (!coversFn(route, false)) exclude.add(route);
}
const list = [...exclude].sort();
if (list.length > 99) { console.error('routes-exclude: exclude নিয়ম ' + list.length + 'টা — Cloudflare-এর সীমা (মোট ১০০) পেরিয়ে গেছে'); process.exit(1); }
fs.writeFileSync(routesFile, JSON.stringify({ version: 1, include: ['/*'], exclude: list }, null, 2));
console.log('routes-exclude: include /*, exclude ' + list.length + 'টা');
