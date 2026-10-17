// netlify/edge-functions/product-seo.js
//
// ============================================================================
// কেন এই ফাইলটা লাগলো (SEO সমস্যার আসল কারণ):
// Google প্রথমবার (JavaScript রান করার আগে) product.html-এর যে raw HTML পড়ে, সেখানে
// প্রতিটা প্রোডাক্ট পেজেই একই জেনেরিক title ("Product Details - Smart Tech Zone"),
// একই generic meta description, আর canonical ট্যাগে আইডি ছাড়া খালি
// "https://smarttechzone.com.bd/product.html" বসানো থাকতো। এই ঠিক তথ্যগুলো এতদিন
// শুধু client-side JavaScript (updateSeoTags/renderProductJsonLd, product.html-এর
// ভেতরেই) দিয়ে *পরে* বসানো হতো। Google নিজেই বলে দেয় যে raw HTML-এর canonical সিগন্যাল
// সবচেয়ে বেশি গুরুত্ব পায়, আর JS দিয়ে বদলানো canonical অবিশ্বস্ত ধরা হয় — ফলে হাজারো
// আলাদা প্রোডাক্ট পেজ Google-এর চোখে একই "খালি" পেজের ডুপ্লিকেট মনে হচ্ছিলো, তাই একটাও
// আলাদাভাবে ইনডেক্স/র‍্যাংক হচ্ছিলো না।
//
// এই Netlify Edge Function ঠিক এই একই তথ্য (title/description/OG ট্যাগ/canonical/
// Product JSON-LD) এখন response পাঠানোর *আগেই*, সার্ভার লেভেলে বসিয়ে দেয় — যাতে
// Googlebot-এর প্রথম দর্শনেই প্রতিটা প্রোডাক্ট পেজ আলাদা ও সঠিক দেখায়। সাথে বোনাস হিসেবে
// WhatsApp/Facebook-এ লিংক শেয়ার করলে এখন থেকে সঠিক প্রোডাক্ট নাম-ছবি প্রিভিউ দেখাবে
// (আগে JS ছাড়া প্রিভিউ বট এই তথ্য পেতোই না)।
//
// ব্যাকএন্ড (Render.com free-tier হলে ঘুমিয়ে পড়তে পারে/স্লো হতে পারে) স্লো বা ডাউন থাকলেও
// যেন কোনো ভিজিটরকে বসে থাকতে না হয়, তাই একটা ছোট টাইমআউটের পর fail-open করে মূল
// (অপরিবর্তিত) পেজটাই পাঠিয়ে দেওয়া হয় — client-side JS আগের মতোই কাজ চালিয়ে নেবে।
// ============================================================================

const BACKEND_URL = 'https://smarttechzone-backend.onrender.com';
const SITE_URL = 'https://smarttechzone.com.bd';
const FETCH_TIMEOUT_MS = 2500;
const RELATED_TIMEOUT_MS = 1800;
const SITE_NAME = 'Smart Tech Zone';
// একই এজ-আইসোলেটে বারবার একই প্রোডাক্টের রিকোয়েস্ট এলে (Googlebot একটানা অনেক পেজ ক্রল করে) ব্যাকএন্ডে
// (Render) বারবার না গিয়ে ১০ মিনিট পর্যন্ত মেমোরি থেকে সার্ভ করা হয়
const SSR_CACHE_TTL_MS = 10 * 60 * 1000;
const SSR_CACHE_MAX = 400;
const ssrCache = new Map();

// ============ SEO: কিওয়ার্ডসহ পরিষ্কার URL — /product/<slug>-i<id> ============
// *** এই ফাংশনগুলো হুবহু (byte-for-byte) কপি আছে: product.html, index.html, search.html,
// brands/brand.html, models/model.html, netlify/edge-functions/model-seo.js,
// backend/routes/sitemap.js — এখানে বদলালে ওই সব জায়গাতেও বদলাতে হবে ***
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
function extractProductIdFromPath(pathname) {
    const m = pathname.match(/-i([a-f0-9]{24})$/);
    return m ? m[1] : null;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ব্রাউজারের DOM নেই এখানে (Edge Function-এ), তাই HTML ট্যাগ বাদ দেওয়া হচ্ছে সাধারণ regex দিয়ে —
// ঠিক product.html-এর client-side stripHtml() (আসল DOM ব্যবহার করে) যা করে, তারই সমতুল্য।
// আসল ট্যাগ (</p>, <img ...>, <br> ইত্যাদি) শুধু তখনই ধরা হয় যখন < এর পরে একটা অক্ষর/স্ল্যাশ
// থাকে — ব্রাউজারের HTML পার্সারও ঠিক এভাবেই কাজ করে, তাই বিবরণে কোথাও ভুলবশত "<100%>"-এর মতো
// টেক্সট থাকলেও সেটা ট্যাগ হিসেবে ভুল করে মুছে যাবে না
function stripHtml(html) {
    if (!html) return '';
    return String(html).replace(/<\/?[a-zA-Z][^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveImageUrl(url) {
    if (!url) return `${SITE_URL}/images/logo.png`;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
}

// <tag id="theId" ... attr="OLD">  →  attr-এর ভ্যালু বদলে দেয়, বাকি সব অপরিবর্তিত রাখে
function setAttrById(html, id, attr, value) {
    const re = new RegExp(`(<[^>]*\\bid=["']${id}["'][^>]*\\s${attr}=["'])([^"']*)(["'])`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + value + post);
}

// <tag id="theId" ...>OLD TEXT</tag>  →  ভেতরের টেক্সট বদলে দেয়
function setTagTextById(html, tag, id, text) {
    const re = new RegExp(`(<${tag}[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</${tag}>)`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + text + post);
}

// ============ SEO: শিরোনাম/বিবরণ/স্কিমা সবই এক জায়গা (এই ফাইল) থেকে ============
// product.html-এর ক্লায়েন্ট-সাইড updateSeoTags() এখন data-ssr="1" দেখলে নিজে এসব বদলায় না (শুধু রিভিউ
// রেটিং যোগ করে) — তাই raw HTML আর JS-রেন্ডার করা HTML-এ title/description/canonical একই থাকে।

function formatBdt(n) {
    const v = Number(n) || 0;
    return '৳' + v.toLocaleString('en-US');
}

// লম্বা কিওয়ার্ড-ভর্তি নাম থেকে ছোট নাম: নামের শেষে " - <মডেল কোডের তালিকা>" থাকলে সেটা বাদ, তারপর শব্দের
// সীমানায় কেটে max অক্ষরে আনা। পুরো নাম H1, Product স্কিমা ও পেজের ভেতরে অপরিবর্তিত থাকে।
function shortProductName(name, max) {
    let s = String(name || '').replace(/\s+/g, ' ').trim();
    const dash = s.indexOf(' - ');
    if (dash > 20) s = s.slice(0, dash);
    if (s.length > max) {
        const cut = s.slice(0, max);
        const sp = cut.lastIndexOf(' ');
        s = sp > 20 ? cut.slice(0, sp) : cut;
    }
    return s;
}

function trimAtWord(text, max) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:\-–(]+$/, '');
}

function linkableBrandOf(product) {
    return (product.phoneBrand && product.phoneBrand !== 'Others') ? product.phoneBrand : '';
}

// স্টক: ভ্যারিয়েন্ট থাকলে Active ভ্যারিয়েন্টগুলোর স্টক যোগফল; ভ্যারিয়েন্ট না থাকলে প্রোডাক্টের নিজের stock ফিল্ড (না থাকলে স্টকে আছে ধরা)
function activeVariantsOf(product) {
    return (product.variants || []).filter(v => v && v.isActive !== false);
}
function stockInfoOf(product) {
    const vs = activeVariantsOf(product);
    if (vs.length) {
        const total = vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        return { inStock: total > 0, total };
    }
    if (product.stock !== undefined && product.stock !== null) {
        const t = Number(product.stock) || 0;
        return { inStock: t > 0, total: t };
    }
    return { inStock: true, total: null };
}

function buildSeoTitle(product) {
    return `${shortProductName(product.name, 70)} Price in Bangladesh | ${SITE_NAME}`;
}

function buildMetaDescription(product) {
    const short = shortProductName(product.name, 80);
    const { inStock } = stockInfoOf(product);
    const brand = linkableBrandOf(product) || (product.brand && !/^no\s*brand$/i.test(product.brand) ? product.brand : '');
    const compat = [brand, product.model].filter(Boolean).join(' ').trim();
    const parts = [`Buy ${short} in Bangladesh for ${formatBdt(product.price)}.`];
    parts.push(inStock ? 'In stock.' : 'Currently out of stock.');
    if (compat) parts.push(`${product.partType ? product.partType + ' replacement' : 'Replacement part'} for ${compat}.`);
    else if (product.partType) parts.push(`${product.partType} replacement part.`);
    parts.push('Cash on delivery and home delivery all over Bangladesh from ' + SITE_NAME + '.');
    return trimAtWord(parts.join(' '), 158);
}

// ============ বিবরণের HTML নিরাপদ করা (শুধু কয়েকটা সাধারণ ট্যাগ, কোনো attribute/ছবি/স্ক্রিপ্ট নয়) ============
const ALLOWED_TAGS = new Set(['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4']);
const VOID_TAGS = new Set(['br']);
function sanitizeDescriptionHtml(html) {
    let src = String(html || '')
        .replace(/<(script|style|iframe|object|embed|svg|noscript)[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
    const stack = [];
    let out = '';
    let last = 0;
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let m;
    const pushText = (t) => { out += t.replace(/&nbsp;| /g, ' ').replace(/<(?![a-zA-Z/!])/g, '&lt;'); };
    while ((m = re.exec(src))) {
        pushText(src.slice(last, m.index));
        last = re.lastIndex;
        let tag = m[2].toLowerCase();
        const closing = m[1] === '/';
        if (tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h5' || tag === 'h6') tag = (tag === 'div') ? 'p' : 'h3';
        if (!ALLOWED_TAGS.has(tag)) { out += ' '; continue; }
        if (VOID_TAGS.has(tag)) { if (!closing) out += '<br>'; continue; }
        if (!closing) { stack.push(tag); out += `<${tag}>`; }
        else {
            const idx = stack.lastIndexOf(tag);
            if (idx === -1) continue;
            while (stack.length > idx) out += `</${stack.pop()}>`;
        }
    }
    pushText(src.slice(last));
    while (stack.length) out += `</${stack.pop()}>`;
    return out.replace(/(<p>\s*<\/p>)+/g, '').trim();
}

// প্লেইন টেক্সট বিবরণ (Key Features:/Why Choose.../Conclusion: ধরনের) → সহজ অনুচ্ছেদ/লিস্ট
function plainDescriptionToHtml(raw) {
    const HEAD = /^(Key Features:|Why Choose [^?:\n]{1,60}\?|Conclusion:|Highlights:|Specifications?:|What(?:'|’)s in the Box:?|Package Includes:?)\s*(.*)$/i;
    const lines = String(raw || '').replace(/\r\n?/g, '\n')
        .replace(/[ \t]*[•●▪]\s*/g, '\n• ')
        .split('\n').map(l => l.trim()).filter(Boolean);
    let out = '', inList = false;
    const closeList = () => { if (inList) { out += '</ul>'; inList = false; } };
    for (const line of lines) {
        const h = line.match(HEAD);
        if (h) { closeList(); out += `<h3>${escapeHtml(h[1])}</h3>`; if (h[2]) out += `<p>${escapeHtml(h[2])}</p>`; continue; }
        if (line.startsWith('• ')) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${escapeHtml(line.slice(2))}</li>`; continue; }
        closeList(); out += `<p>${escapeHtml(line)}</p>`;
    }
    closeList();
    return out;
}

function descriptionToSafeHtml(raw) {
    if (!raw) return '';
    const text = String(raw).slice(0, 12000);
    const html = /<\/?[a-zA-Z][^>]*>/.test(text) ? sanitizeDescriptionHtml(text) : plainDescriptionToHtml(text);
    return html;
}

// ============ JSON-LD (Product + BreadcrumbList) ============
function breadcrumbItems(product, pageUrl) {
    const items = [{ name: 'Home', url: `${SITE_URL}/` }];
    const brand = linkableBrandOf(product);
    if (brand) {
        items.push({ name: brand, url: `${SITE_URL}/brands/brand.html?name=${encodeURIComponent(brand)}` });
        if (product.model) items.push({ name: product.model, url: `${SITE_URL}/models/model.html?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(product.model)}` });
    }
    items.push({ name: shortProductName(product.name, 90), url: pageUrl });
    return items;
}

function buildBreadcrumbJsonLd(product, pageUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems(product, pageUrl).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }))
    };
}

function buildProductJsonLd(product, images, pageUrl, desc) {
    const mainImage = images.length ? images[0] : `${SITE_URL}/images/logo.png`;
    const { inStock } = stockInfoOf(product);
    const brandName = (product.brand && !/^no\s*brand$/i.test(product.brand)) ? product.brand : linkableBrandOf(product);
    const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const sku = product.sku || (activeVariantsOf(product).find(v => v.sku) || {}).sku || String(product._id);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: images.length ? images : [mainImage],
        description: desc,
        sku,
        offers: {
            '@type': 'Offer',
            url: pageUrl,
            priceCurrency: 'BDT',
            price: product.price,
            priceValidUntil: validUntil,
            itemCondition: 'https://schema.org/NewCondition',
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'BD',
                returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: 14
            }
        }
    };
    if (brandName) jsonLd.brand = { '@type': 'Brand', name: brandName };
    if (product.category && product.category !== 'Other Parts') jsonLd.category = product.category;
    // রিভিউ ডেটা এখানে নেই — ক্লায়েন্ট-সাইড JS রিভিউ লোড হওয়ার পর aggregateRating যোগ করে
    return jsonLd;
}

// <script type="application/ld+json">-এর ভেতরে "</script>" লেখা থাকলে JSON ভেঙে পেজ নষ্ট হতো — '<' এস্কেপ করা হচ্ছে
function jsonForScript(obj) {
    return JSON.stringify(obj).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
}

// ============ সার্ভার-রেন্ডার করা দৃশ্যমান কনটেন্ট (Googlebot-এর প্রথম পড়াতেই পুরো তথ্য) ============
function buildSsrBlock(product, related, pageUrl) {
    const brand = linkableBrandOf(product);
    const { inStock } = stockInfoOf(product);
    const crumbs = breadcrumbItems(product, pageUrl);
    const nav = '<nav aria-label="Breadcrumb" style="font-size:13px;color:#666;margin-bottom:12px;">' + crumbs.map((c, i) =>
        i === crumbs.length - 1 ? `<span>${escapeHtml(c.name)}</span>` : `<a href="${escapeAttr(c.url.replace(SITE_URL, ''))}">${escapeHtml(c.name)}</a> &rsaquo; `).join('') + '</nav>';

    const specRows = [];
    if (brand) specRows.push(['Phone brand', `<a href="/brands/brand.html?name=${encodeURIComponent(brand)}">${escapeHtml(brand)}</a>`]);
    if (product.model) specRows.push(['Model', brand ? `<a href="/models/model.html?brand=${encodeURIComponent(brand)}&amp;model=${encodeURIComponent(product.model)}">${escapeHtml(product.model)}</a>` : escapeHtml(product.model)]);
    if (product.partType) specRows.push(['Part type', escapeHtml(product.partType)]);
    if (product.brand && !/^no\s*brand$/i.test(product.brand)) specRows.push(['Brand', escapeHtml(product.brand)]);
    if (product.sku) specRows.push(['SKU', escapeHtml(product.sku)]);
    if (product.warrantyDuration) specRows.push(['Warranty', escapeHtml(product.warrantyDuration)]);
    const specs = specRows.length ? '<table style="border-collapse:collapse;margin:10px 0;">' + specRows.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#666;">${k}</td><td style="padding:4px 0;">${v}</td></tr>`).join('') + '</table>' : '';

    const vs = activeVariantsOf(product).filter(v => !(activeVariantsOf(product).length === 1 && /^default$/i.test(v.label || '')));
    const variants = vs.length ? '<h3>Available options</h3><ul>' + vs.slice(0, 40).map(v =>
        `<li>${escapeHtml(v.label)} &ndash; ${formatBdt(v.price)} &ndash; ${(Number(v.stock) || 0) > 0 ? 'In stock' : 'Out of stock'}</li>`).join('') + '</ul>' : '';

    const descHtml = descriptionToSafeHtml(product.description);
    const rel = (related && related.length) ? `<h3>More parts${product.model ? ' for ' + escapeHtml((brand ? brand + ' ' : '') + product.model) : ''}</h3><ul>` +
        related.map(r => `<li><a href="${escapeAttr(buildProductPath(r.name, r._id))}">${escapeHtml(shortProductName(r.name, 110))}</a>${r.price ? ' &ndash; ' + formatBdt(r.price) : ''}</li>`).join('') + '</ul>' : '';

    return `<div id="ssrProduct" style="text-align:left;line-height:1.6;color:#222;">${nav}` +
        `<h2 style="font-size:20px;margin:0 0 8px;">${escapeHtml(product.name)}</h2>` +
        `<p style="font-size:22px;font-weight:700;color:#e74c3c;margin:6px 0;">${formatBdt(product.price)} <span style="font-size:14px;font-weight:400;color:#555;">${inStock ? 'In stock' : 'Out of stock'}</span></p>` +
        specs + variants +
        (descHtml ? `<h3>Product details</h3><div>${descHtml}</div>` : '') +
        `<p style="font-size:13px;color:#555;">Home delivery all over Bangladesh. Cash on delivery available. Returns accepted within 14 days of delivery. Sold by ${SITE_NAME}, Mohammadpur, Dhaka.</p>` +
        rel + '</div>';
}

function computeSeoFields(product, related) {
    const images = (product.images && product.images.length) ? product.images.map(resolveImageUrl) : [];
    const mainImage = images.length ? images[0] : `${SITE_URL}/images/logo.png`;
    const title = buildSeoTitle(product);
    const desc = buildMetaDescription(product);
    // canonical সবসময় নতুন সুন্দর URL-টাই — যেভাবেই পেজটা রিকোয়েস্ট হোক (পুরোনো product.html?id= বা নতুন /product/<slug>-i<id>)
    const pageUrl = `${SITE_URL}${buildProductPath(product.name, product._id)}`;
    const schemaDesc = trimAtWord(stripHtml(product.description) || desc, 1000) || desc;
    const jsonLd = buildProductJsonLd(product, images, pageUrl, schemaDesc);
    const breadcrumbLd = buildBreadcrumbJsonLd(product, pageUrl);
    return { images, mainImage, title, desc, pageUrl, jsonLd, breadcrumbLd, related: related || [] };
}

function injectSeoIntoHtml(html, product, related) {
    const { mainImage, title, desc, pageUrl, jsonLd, breadcrumbLd } = computeSeoFields(product, related);
    let out = html;
    out = setTagTextById(out, 'title', 'pageTitle', escapeHtml(title));
    out = setAttrById(out, 'metaDescription', 'content', escapeAttr(desc));
    out = setAttrById(out, 'ogTitleTag', 'content', escapeAttr(title));
    out = setAttrById(out, 'ogDescTag', 'content', escapeAttr(desc));
    out = setAttrById(out, 'ogImageTag', 'content', escapeAttr(mainImage));
    out = setAttrById(out, 'canonicalTag', 'href', escapeAttr(pageUrl));
    out = setTagTextById(out, 'script', 'productJsonLd', jsonForScript(jsonLd));
    // ক্লায়েন্ট-সাইড JS এই চিহ্ন দেখে title/meta/canonical আর স্কিমার ভিত্তি নিজে বদলায় না
    out = out.replace(/<script id="productJsonLd"/i, '<script id="productJsonLd" data-ssr="1"');

    // Twitter Card, og:url, product:price ট্যাগ + BreadcrumbList স্কিমা + SSR কনটেন্টের স্টাইল — </head>-এর ঠিক আগে
    const extra =
        `<meta name="twitter:card" content="summary_large_image">` +
        `<meta name="twitter:title" content="${escapeAttr(title)}">` +
        `<meta name="twitter:description" content="${escapeAttr(desc)}">` +
        `<meta name="twitter:image" content="${escapeAttr(mainImage)}">` +
        `<meta property="og:url" content="${escapeAttr(pageUrl)}">` +
        `<meta property="product:price:amount" content="${escapeAttr(product.price)}">` +
        `<meta property="product:price:currency" content="BDT">` +
        `<script type="application/ld+json" id="breadcrumbJsonLd">${jsonForScript(breadcrumbLd)}</script>` +
        ((product.status && product.status !== 'published') ? '<meta name="robots" content="noindex,follow">' : '');
    out = out.replace(/<\/head>/i, extra + '</head>');

    // Google Image Search-এর জন্য: H1 ও মূল ছবির src/alt
    out = setTagTextById(out, 'h1', 'productName', escapeHtml(product.name));
    out = setAttrById(out, 'mainImage', 'src', escapeAttr(mainImage));
    out = setAttrById(out, 'mainImage', 'alt', escapeAttr(product.name));

    // "লোড হচ্ছে..." বার্তার জায়গায় পুরো পণ্যের তথ্য (দাম, স্পেক, বিবরণ, ব্রেডক্রাম্ব, সম্পর্কিত লিংক) — ভিজিটরও JS লোড হওয়া
    // পর্যন্ত এটাই দেখে, তারপর renderProduct() #loadingMsg লুকিয়ে আসল UI দেখায়
    out = out.replace(/(<div id="loadingMsg"[^>]*>)[\s\S]*?(<\/div>)/i, (_m, a, b) => a + buildSsrBlock(product, related, pageUrl) + b);
    return out;
}

// ============ ডেটা আনা (ব্যাকএন্ড) ============
async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return { status: res.status, ok: res.ok, data: res.ok ? await res.json() : null };
    } finally {
        clearTimeout(timer);
    }
}

async function fetchRelated(product) {
    const brand = linkableBrandOf(product);
    if (!brand) return [];
    const q = product.model
        ? `phoneBrand=${encodeURIComponent(brand)}&model=${encodeURIComponent(product.model)}`
        : (product.category ? `phoneBrand=${encodeURIComponent(brand)}&category=${encodeURIComponent(product.category)}` : '');
    if (!q) return [];
    try {
        const r = await fetchJson(`${BACKEND_URL}/api/products?status=published&fields=summary&${q}`, RELATED_TIMEOUT_MS);
        const list = Array.isArray(r.data) ? r.data : ((r.data && r.data.products) || []);
        return list.filter(p => p && p._id && p.name && String(p._id) !== String(product._id)).slice(0, 12);
    } catch (e) {
        return []; // সম্পর্কিত লিংক না পেলেও পেজ ঠিকই যাবে
    }
}

async function loadProductForSeo(productId) {
    const hit = ssrCache.get(productId);
    if (hit && Date.now() - hit.at < SSR_CACHE_TTL_MS) return hit;
    const r = await fetchJson(`${BACKEND_URL}/api/products/${productId}`, FETCH_TIMEOUT_MS);
    if (r.status === 404) return { notFound: true };
    if (!r.ok) return null;
    const product = r.data;
    if (!product || !product._id || !product.name) return null;
    const related = await fetchRelated(product);
    const entry = { product, related, at: Date.now() };
    if (ssrCache.size >= SSR_CACHE_MAX) ssrCache.delete(ssrCache.keys().next().value);
    ssrCache.set(productId, entry);
    return entry;
}

export default async (request, context) => {
    const url = new URL(request.url);
    // /product/<slug>-i<id> — নতুন সুন্দর URL (static ফাইল নেই, তাই product.html ভেতরে ভেতরে সার্ভ হয়);
    // /product.html?id= — পুরোনো URL (real static ফাইল)
    const isPrettyPath = url.pathname !== '/product.html';
    const productId = isPrettyPath
        ? extractProductIdFromPath(url.pathname)
        : url.searchParams.get('id');

    // পুরো লজিক try/catch-এ: SEO বসানো ব্যর্থ হলেও ভিজিটর সবসময় আসল (অপরিবর্তিত) পেজটাই পাবে, কখনো crash পেজ নয়
    try {
        const response = isPrettyPath ? await context.rewrite('/product.html') : await context.next();
        if (!productId) return response;

        let entry;
        try {
            entry = await loadProductForSeo(productId);
        } catch (err) {
            // ব্যাকএন্ড স্লো/ডাউন/টাইমআউট — মূল পেজ অপরিবর্তিত, কাউকে অপেক্ষা করানো হয় না
            return response;
        }
        if (!entry) return response;

        const html = await response.text();
        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');
        newHeaders.set('content-type', 'text/html; charset=UTF-8');

        // প্রোডাক্ট সত্যিই নেই/মুছে ফেলা/Inactive (ব্যাকএন্ড 404) — আগে পেজ 200 দিয়ে "লোড হচ্ছে" দেখাতো (Google-এর কাছে soft 404);
        // এখন আসল 404 + noindex, যাতে Google মৃত URL দ্রুত বাদ দেয়। ভিজিটর আগের মতোই "প্রোডাক্টটি খুঁজে পাওয়া যায়নি" দেখে।
        if (entry.notFound) {
            newHeaders.set('x-robots-tag', 'noindex');
            return new Response(html, { status: 404, headers: newHeaders });
        }

        const newHtml = injectSeoIntoHtml(html, entry.product, entry.related);
        return new Response(newHtml, { status: response.status, headers: newHeaders });
    } catch (err) {
        console.error('product-seo edge function এ অপ্রত্যাশিত এরর, আসল পেজ পাঠানো হচ্ছে:', err);
        try {
            return isPrettyPath ? await context.rewrite('/product.html') : await context.next();
        } catch (err2) {
            return new Response('সাময়িক সমস্যা হয়েছে, পেজটি আবার লোড করুন।', {
                status: 503,
                headers: { 'content-type': 'text/plain; charset=UTF-8' }
            });
        }
    }
};

// রাউটিং netlify.toml-এ ([[edge_functions]] এন্ট্রি /product.html ও /product/*) — এখানে আলাদা config export নেই

// টেস্টিং-এর জন্য (Node দিয়ে যাচাই) — Netlify শুধু default export ও config ব্যবহার করে
export { injectSeoIntoHtml, computeSeoFields, stripHtml, escapeHtml, escapeAttr, setAttrById, setTagTextById, buildSeoTitle, buildMetaDescription, shortProductName, sanitizeDescriptionHtml, descriptionToSafeHtml, buildSsrBlock, buildProductJsonLd, buildBreadcrumbJsonLd, stockInfoOf };
