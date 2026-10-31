// cf-lib/adapt.js
//
// Netlify Edge Function (netlify/edge-functions/*-seo.js) গুলোকে Cloudflare Pages Functions-এ চালানোর
// ছোট অ্যাডাপ্টার। মূল SEO লজিক একটুও বদলানো হয়নি — edge function গুলো শুধু `context.next()` ও
// `context.rewrite(path)` ব্যবহার করে, এখানে সেই দুটোই Pages-এর `env.ASSETS` (static ফাইল সার্ভার) দিয়ে বানানো।
// ফলে Netlify-তে আগের মতোই কাজ করবে, Cloudflare-এ এই ফাইল দিয়ে একই ফলাফল পাওয়া যাবে।

// Pages-এ `/x.html` চাইলে সে `/x`-এ 308 রিডাইরেক্ট করে — তাই রিডাইরেক্ট ফলো করে চূড়ান্ত ফাইল আনা হয়
async function fetchAsset(env, origin, path, search, request) {
    let target = new URL(path, origin);
    if (search) target.search = search;
    for (let i = 0; i < 4; i++) {
        const res = await env.ASSETS.fetch(new Request(target.toString(), {
            method: 'GET',
            headers: request.headers
        }));
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            target = new URL(res.headers.get('location'), target);
            continue;
        }
        return res;
    }
    throw new Error('ASSETS redirect loop: ' + path);
}

function stripHtmlExt(p) {
    return p.replace(/\.html$/i, '');
}

/**
 * @param edgeFn   Netlify edge function এর default export (request, context) => Response
 * @param opts.page        যে static পেজটা আসলে সার্ভ হবে (যেমন '/product.html')
 * @param opts.normalizePath  true হলে '/product' (Pages-এ /product.html-এর pretty রূপ) রিকোয়েস্টকে '/product.html' বানিয়ে
 *                            edge function-কে দেওয়া হয় (product-seo '/product.html' দেখে বুঝে "এটা পুরোনো ?id= URL")।
 *                            /product/[[path]] রুটও '/product' ধরে ফেলে, তাই দুটো হ্যান্ডলারেই এটা দরকার
 */
export function adaptEdge(edgeFn, opts) {
    const page = opts.page;
    return async function onRequest(ctx) {
        const { request, env } = ctx;
        if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
        const url = new URL(request.url);

        let req = request;
        if (opts.normalizePath && url.pathname === '/product') {
            const u = new URL(request.url);
            u.pathname = page;
            req = new Request(u.toString(), request);
        }

        const context = {
            next: () => fetchAsset(env, url.origin, stripHtmlExt(page), url.search, request),
            rewrite: (p) => fetchAsset(env, url.origin, stripHtmlExt(p), url.search, request)
        };
        return edgeFn(req, context);
    };
}

// ব্যাকএন্ডে সরাসরি প্রক্সি (Netlify-র _redirects এর `200` প্রক্সি রুলের বদলে)
export async function proxyTo(request, backendUrl) {
    const incoming = new URL(request.url);
    const target = new URL(backendUrl);
    target.search = incoming.search;
    const upstream = await fetch(target.toString(), {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: { 'accept': request.headers.get('accept') || '*/*', 'user-agent': request.headers.get('user-agent') || 'stz-proxy' },
        redirect: 'follow'
    });
    const headers = new Headers(upstream.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('set-cookie');
    return new Response(upstream.body, { status: upstream.status, headers });
}
