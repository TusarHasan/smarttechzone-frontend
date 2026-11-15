// smarttechzone.com.bd/<shop-name> — ভেন্ডরের Shop Link (যেমন /sharattelecom)।
// Cloudflare Pages-এর রুট ক্যাচ-অল: আগে সাধারণ static ফাইল/পেজ চেষ্টা করে (সেগুলো যেমন ছিল তেমনই চলে);
// না পেলে (404) এবং পথটা এক অংশের ছোট নাম হলে ব্যাকএন্ডে জিজ্ঞেস করে "এই নামে Active শপ আছে কি?" —
// থাকলে ভেতরে ভেতরে shop.html সার্ভ হয় (ঠিকানা বারে /sharattelecom-ই থাকে; পেজ নিজেই URL থেকে নাম পড়ে)।
// হ্যাঁ/না উত্তর ২ মিনিট ক্যাশ হয়, যাতে বট/ভুল URL বারবার ব্যাকএন্ডে ধাক্কা না দেয়।
// *** cf-build.sh রুটের static ফাইলগুলো _routes.json-এ exclude করে দেয় (cf-lib/routes-exclude.js), তাই এই ফাংশন সব ছবি/JS/CSS-এ চলে না ***
const BACKEND = 'https://smarttechzone-backend.onrender.com';
const SLUG = /^\/([a-z0-9]{3,40})\/?$/i;
const TTL = 120;

async function shopExists(slug) {
    const cache = caches.default;
    const key = new Request('https://shop-lookup.stz.internal/' + slug);
    const hit = await cache.match(key);
    if (hit) return (await hit.text()) === '1';
    let status;
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(BACKEND + '/api/shop/' + encodeURIComponent(slug), { signal: ctl.signal, headers: { accept: 'application/json' } });
        clearTimeout(t);
        status = r.status;
    } catch (e) { return null; } // ব্যাকএন্ড ধরা যায়নি — ক্যাশ না করে সাধারণ 404 দেখানো হবে
    if (status !== 200 && status !== 404) return null;
    await cache.put(key, new Response(status === 200 ? '1' : '0', { headers: { 'Cache-Control': 'public, max-age=' + TTL } }));
    return status === 200;
}

async function shopPage(env, origin, search, request) {
    let target = new URL('/shop', origin);
    target.search = search;
    for (let i = 0; i < 4; i++) {
        const res = await env.ASSETS.fetch(new Request(target.toString(), { method: 'GET', headers: request.headers }));
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { target = new URL(res.headers.get('location'), target); continue; }
        return res;
    }
    return null;
}

export async function onRequest({ request, env }) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;
    const url = new URL(request.url);
    const m = SLUG.exec(url.pathname);
    if (!m) return res;
    const slug = m[1].toLowerCase();
    if (!(await shopExists(slug))) return res;
    if (slug !== m[1]) return Response.redirect(url.origin + '/' + slug + url.search, 301); // /SharatTelecom -> /sharattelecom
    const page = await shopPage(env, url.origin, url.search, request);
    if (!page || page.status !== 200) return res;
    return new Response(request.method === 'HEAD' ? null : page.body, { status: 200, headers: page.headers });
}
