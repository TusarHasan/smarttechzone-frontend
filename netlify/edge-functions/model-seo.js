// netlify/edge-functions/model-seo.js
//
// ============================================================================
// models/model.html-এও product.html-এর মতোই সমস্যা — ?brand= আর ?model= প্যারামিটার
// দিয়ে চলা একটাই শেয়ার্ড টেমপ্লেট, raw HTML-এ সবসময় একই জেনেরিক title ("Parts -
// Smart Tech Zone")। অথচ এই পেজগুলোই (যেমন "Samsung Galaxy A54 display price")
// সবচেয়ে বেশি সম্ভাবনাময় সার্চ কোয়েরির সাথে মেলে — model.html-এর নিজের কোডেই এই
// পর্যবেক্ষণ লেখা আছে।
//
// title/description/canonical শুধু URL প্যারামিটার থেকেই বানানো যায় (নেটওয়ার্ক
// ফেচ লাগে না, model.html-এর নিজের JS লাইন ১২৪-১৩৪ দেখুন) — তাই সেই অংশটা সবসময়
// তাৎক্ষণিক ও নির্ভরযোগ্য। শুধু Product ItemList JSON-LD (রিচ রেজাল্টের জন্য বোনাস)
// বানাতে ব্যাকএন্ড থেকে প্রোডাক্ট লিস্ট আনা লাগে — সেটা ব্যর্থ/স্লো হলে (Render
// cold-start ইত্যাদি) শুধু JSON-LD অংশটাই বাদ যাবে, মূল title/description/canonical
// ফিক্সে কোনো প্রভাব পড়বে না এবং কোনো ভিজিটরকে বসে থাকতে হবে না।
// ============================================================================

const BACKEND_URL = 'https://smarttechzone-backend.onrender.com';
const SITE_URL = 'https://smarttechzone.com.bd';
const FETCH_TIMEOUT_MS = 2500;

// SEO: প্রোডাক্ট লিংকগুলো এখন কিওয়ার্ডসহ পরিষ্কার URL ব্যবহার করে (/product/<slug>-i<id>) —
// *** হুবহু কপি আছে: product.html, index.html, search.html, brands/brand.html,
// models/model.html, netlify/edge-functions/product-seo.js, backend/routes/sitemap.js ***
function slugifyProductName(name) {
    let s = String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (s.length > 70) {
        const cut = s.slice(0, 70);
        const lastDash = cut.lastIndexOf('-');
        s = lastDash > 20 ? cut.slice(0, lastDash) : cut;
    }
    return s || 'product';
}
function buildProductPath(name, id) {
    return `/product/${slugifyProductName(name)}-i${id}`;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function resolveImageUrl(url) {
    if (!url) return `${SITE_URL}/images/logo.png`;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
}
function setAttrById(html, id, attr, value) {
    const re = new RegExp(`(<[^>]*\\bid=["']${id}["'][^>]*\\s${attr}=["'])([^"']*)(["'])`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + value + post);
}
function setTagTextById(html, tag, id, text) {
    const re = new RegExp(`(<${tag}[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</${tag}>)`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + text + post);
}

// model.html-এর updateModelSeoTags() (লাইন ১২৪-১৩৪) এর সাথে হুবহু মিলিয়ে
function computeModelSeoFields(brand, model) {
    const title = `${brand} ${model} মোবাইলের রিপ্লেসমেন্ট পার্টস (ডিসপ্লে, ব্যাটারি, চার্জিং পোর্ট ও আরও) - Smart Tech Zone`;
    const desc = `${brand} ${model} মোবাইলের জন্য ডিসপ্লে, ব্যাটারি, চার্জিং পোর্ট, ক্যামেরা সহ সব ধরনের রিপ্লেসমেন্ট পার্টস — Smart Tech Zone থেকে কিনুন, সারা বাংলাদেশে হোম ডেলিভারি।`.substring(0, 160);
    const pageUrl = `${SITE_URL}/models/model.html?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`;
    return { title, desc, pageUrl };
}

// model.html-এর updateModelJsonLd() (লাইন ১৩৬-১৫৪) এর সাথে হুবহু মিলিয়ে
function buildModelJsonLd(brand, model, products, pageUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${brand} ${model} Replacement Parts`,
        url: pageUrl,
        itemListElement: products.slice(0, 30).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}${buildProductPath(p.name, p._id)}`,
            name: p.name
        }))
    };
}

function injectModelSeoIntoHtml(html, brand, model, products) {
    const { title, desc, pageUrl } = computeModelSeoFields(brand, model);
    let out = html;
    out = setTagTextById(out, 'title', 'pageTitleTag', escapeHtml(title));
    out = setAttrById(out, 'metaDescription', 'content', escapeAttr(desc));
    out = setAttrById(out, 'canonicalTag', 'href', escapeAttr(pageUrl));
    out = setAttrById(out, 'ogTitleTag', 'content', escapeAttr(title));
    out = setAttrById(out, 'ogDescTag', 'content', escapeAttr(desc));

    if (products && products.length) {
        const firstWithImage = products.find(p => p.images && p.images.length);
        if (firstWithImage) {
            out = setAttrById(out, 'ogImageTag', 'content', escapeAttr(resolveImageUrl(firstWithImage.images[0])));
        }
        out = setTagTextById(out, 'script', 'modelJsonLd', JSON.stringify(buildModelJsonLd(brand, model, products, pageUrl)));
    }
    return out;
}

export default async (request, context) => {
    const response = await context.next();

    const url = new URL(request.url);
    const brand = url.searchParams.get('brand');
    const model = url.searchParams.get('model');
    if (!brand || !model) return response; // model.html-এর নিজের JS-ও এই অবস্থায় "খুঁজে পাওয়া যায়নি" দেখায়, এখানে ছোঁয়ার দরকার নেই

    // JSON-LD-এর জন্য প্রোডাক্ট লিস্ট আনার চেষ্টা (best-effort — ব্যর্থ হলেও title/description/
    // canonical ঠিকই বসে যাবে, শুধু ItemList অংশটা বাদ যাবে)
    let products = null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const apiRes = await fetch(`${BACKEND_URL}/api/products/model/${encodeURIComponent(model)}?brand=${encodeURIComponent(brand)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (apiRes.ok) {
            const data = await apiRes.json();
            if (Array.isArray(data)) products = data;
        }
    } catch (err) {
        // ব্যাকএন্ড স্লো/ডাউন — products থাকবে null, নিচে শুধু core SEO ট্যাগগুলোই বসবে
    }

    const html = await response.text();
    const newHtml = injectModelSeoIntoHtml(html, brand, model, products);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete('content-length');
    newHeaders.set('content-type', 'text/html; charset=UTF-8');
    return new Response(newHtml, { status: response.status, headers: newHeaders });
};

// রাউটিং netlify.toml-এর [[edge_functions]] এন্ট্রি দিয়ে হয় — এখানে আলাদা export const config
// দিলে ডুপ্লিকেট হয়ে পেজে ফাংশনটা দুইবার চলতে পারতো, তাই বাদ দেওয়া হলো (product-seo.js ও
// brand-seo.js-এও একই কারণে বাদ দেওয়া হয়েছে)

export { injectModelSeoIntoHtml, computeModelSeoFields, buildModelJsonLd };
