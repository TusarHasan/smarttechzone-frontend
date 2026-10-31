// node cf-lib/test/adapt.test.mjs — Pages Functions অ্যাডাপ্টার যাচাই (ASSETS ও ব্যাকএন্ড মক করে)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { onRequest as productFn } from '../../functions/product.js';
import { onRequest as productPretty } from '../../functions/product/[[path]].js';
import { onRequest as brandFn } from '../../functions/brands/brand.js';
import { onRequest as modelFn } from '../../functions/models/model.js';
import { onRequest as sitemapFn } from '../../functions/sitemap.xml.js';
import { onRequest as shortFn } from '../../functions/s/[[path]].js';

const files = { '/product': 'product.html', '/brands/brand': 'brands/brand.html', '/models/model': 'models/model.html' };
const env = { ASSETS: { async fetch(req) {
    const u = new URL(req.url);
    if (/\.html$/.test(u.pathname)) return new Response(null, { status: 308, headers: { location: u.pathname.replace(/\.html$/, '') + u.search } });
    const f = files[u.pathname];
    if (!f) return new Response('nf', { status: 404 });
    return new Response(fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8'), { headers: { 'content-type': 'text/html' } });
} } };

const fakeProduct = { _id: '507f1f77bcf86cd799439011', name: 'Samsung A54 Display Combo', price: 4500, description: 'ভালো ডিসপ্লে', images: ['/uploads/a.jpg'], status: 'published', stock: 5, category: 'Display', brand: 'Samsung' };
const realFetch = globalThis.fetch; const calls = [];
globalThis.fetch = async (url, opts) => {
    url = String(url); calls.push(url);
    if (url.includes('/api/products/507f1f77bcf86cd799439011')) return new Response(JSON.stringify(fakeProduct), { headers: { 'content-type': 'application/json' } });
    if (url.includes('/api/products?')) return new Response('[]', { headers: { 'content-type': 'application/json' } });
    if (url.includes('/api/products/model/')) return new Response('[]', { headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/sitemap.xml')) return new Response('<urlset/>', { headers: { 'content-type': 'application/xml' } });
    if (url.includes('/s/abc')) return new Response('<html>og</html>', { headers: { 'content-type': 'text/html' } });
    return new Response('{}', { status: 404 });
};
const mk = (u) => ({ request: new Request(u), env, params: {} });

// 1) পুরোনো ?id= URL
let r = await productFn(mk('https://x.pages.dev/product?id=507f1f77bcf86cd799439011'));
let t = await r.text();
assert.equal(r.status, 200); assert.match(t, /Samsung A54/); assert.match(t, /application\/ld\+json/);
// 2) সুন্দর URL
r = await productPretty(mk('https://x.pages.dev/product/samsung-a54-display-combo-i507f1f77bcf86cd799439011'));
t = await r.text(); assert.equal(r.status, 200); assert.match(t, /Samsung A54/); assert.match(t, /rel="canonical"/);
// 3) ?id ছাড়া — আসল পেজই
r = await productFn(mk('https://x.pages.dev/product'));
assert.equal(r.status, 200);
// 4) ব্র্যান্ড ও মডেল
r = await brandFn(mk('https://x.pages.dev/brands/brand?name=Samsung')); t = await r.text();
assert.match(t, /Samsung মোবাইল রিপ্লেসমেন্ট পার্টস/);
r = await modelFn(mk('https://x.pages.dev/models/model?brand=Samsung&model=A54')); t = await r.text();
assert.equal(r.status, 200); assert.match(t, /A54/);
// 5) প্রক্সি
r = await sitemapFn(mk('https://x.pages.dev/sitemap.xml')); assert.equal(await r.text(), '<urlset/>');
r = await shortFn({ ...mk('https://x.pages.dev/s/abc'), params: { path: ['abc'] } }); assert.match(await r.text(), /og/);
// 6) প্রোডাক্ট না থাকলে 404 + noindex
globalThis.fetch = async () => new Response('{}', { status: 404 });
r = await productPretty(mk('https://x.pages.dev/product/foo-i507f1f77bcf86cd799439099'));
console.log('missing product status:', r.status, r.headers.get('x-robots-tag'));
globalThis.fetch = realFetch;
console.log('ALL OK');
