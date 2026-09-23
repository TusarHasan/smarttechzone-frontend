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

function buildProductJsonLd(product, images, pageUrl, desc) {
    const mainImage = images.length ? images[0] : `${SITE_URL}/images/logo.png`;
    const variants = product.variants || [];
    // ভ্যারিয়েন্ট থাকলে সবগুলোর স্টক যোগ করে মোট স্টক বের করা হয়, নাহলে বেস প্রোডাক্টের নিজের স্টক
    // (দেখুন backend/models/product.js — ভ্যারিয়েন্ট আর নন-ভ্যারিয়েন্ট প্রোডাক্টের ডেটা শেপ আলাদা)
    const totalStock = variants.length
        ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
        : (Number(product.stock) || 0);
    const availability = totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: images.length ? images : [mainImage],
        description: desc,
        offers: {
            '@type': 'Offer',
            url: pageUrl,
            priceCurrency: 'BDT',
            price: product.price,
            availability
        }
    };
    if (product.brand) jsonLd.brand = { '@type': 'Brand', name: product.brand };
    if (product.sku) jsonLd.sku = product.sku;
    // রিভিউ ডেটা এখানে নেই (এক্সট্রা ব্যাকএন্ড কল এড়াতে) — client-side JS-ই যেমন আগে করতো, রিভিউ
    // লোড হওয়ার পর aggregateRating যোগ হবে; raw HTML-এ শুধু বেস তথ্যটুকু ঠিকভাবে থাকাই যথেষ্ট
    return jsonLd;
}

function computeSeoFields(product) {
    const images = (product.images && product.images.length) ? product.images.map(resolveImageUrl) : [];
    const mainImage = images.length ? images[0] : `${SITE_URL}/images/logo.png`;
    const title = `${product.name} - Smart Tech Zone`;
    const desc = (stripHtml(product.description) || `${product.name} — Smart Tech Zone থেকে কিনুন, সারা বাংলাদেশে হোম ডেলিভারি।`).substring(0, 160);
    // canonical সবসময় নতুন সুন্দর URL-টাই দেখাবে — যেভাবেই পেজটা রিকোয়েস্ট হোক না কেন (পুরোনো
    // product.html?id= বা নতুন /product/<slug>-i<id>), যাতে Google একটাই URL-কে "আসল" ধরে
    const pageUrl = `${SITE_URL}${buildProductPath(product.name, product._id)}`;
    const jsonLd = buildProductJsonLd(product, images, pageUrl, desc);
    return { images, mainImage, title, desc, pageUrl, jsonLd };
}

function injectSeoIntoHtml(html, product) {
    const { mainImage, title, desc, pageUrl, jsonLd } = computeSeoFields(product);
    let out = html;
    out = setTagTextById(out, 'title', 'pageTitle', escapeHtml(title));
    out = setAttrById(out, 'metaDescription', 'content', escapeAttr(desc));
    out = setAttrById(out, 'ogTitleTag', 'content', escapeAttr(title));
    out = setAttrById(out, 'ogDescTag', 'content', escapeAttr(desc));
    out = setAttrById(out, 'ogImageTag', 'content', escapeAttr(mainImage));
    out = setAttrById(out, 'canonicalTag', 'href', escapeAttr(pageUrl));
    out = setTagTextById(out, 'script', 'productJsonLd', JSON.stringify(jsonLd));

    // Google Image Search-এর জন্য: raw HTML-এ H1 (id="productName") আগে খালি থাকতো, আর মূল
    // ছবির (id="mainImage") src/alt-ও খালি থাকতো — দুটোই শুধু JS রান হওয়ার পরে বসতো। এখন সার্ভার
    // লেভেলেই বসিয়ে দেওয়া হচ্ছে, ঠিক client-side renderProduct() যা করে তারই সমতুল্য।
    out = setTagTextById(out, 'h1', 'productName', escapeHtml(product.name));
    out = setAttrById(out, 'mainImage', 'src', escapeAttr(mainImage));
    out = setAttrById(out, 'mainImage', 'alt', escapeAttr(product.name));
    return out;
}

export default async (request, context) => {
    const url = new URL(request.url);
    // /product/<slug>-i<id> — নতুন সুন্দর URL, এর জন্য কোনো static ফাইল নেই, তাই product.html-এর
    // কনটেন্টই ভেতরে ভেতরে সার্ভ করা হচ্ছে (context.rewrite) — ব্রাউজারের ঠিকানা বার-এ সুন্দর
    // URL-টাই দেখা যাবে। /product.html?id= — পুরোনো URL, এটা নিজেই একটা real static ফাইল
    // (context.next())।
    const isPrettyPath = url.pathname !== '/product.html';
    const productId = isPrettyPath
        ? extractProductIdFromPath(url.pathname)
        : url.searchParams.get('id');

    // আগে এখানে থেকে নিচ পর্যন্ত কোনো try/catch ছিল না — মাঝে (context.rewrite/next,
    // response.text(), ইত্যাদি) কোথাও কোনো অপ্রত্যাশিত/transient এরর হলে (Netlify/Deno এজ
    // রানটাইমের কোনো ক্ষণস্থায়ী সমস্যা, ব্যাকএন্ড থেকে অদ্ভুত রেসপন্স, ইত্যাদি) পুরো রিকোয়েস্টটাই
    // ভিজিটরের সামনে "This edge function has crashed" এরর পেজ হয়ে যেতো — প্রথমবার প্রোডাক্ট
    // পেজে ঢুকতে গেলে এই এরর দেখা যেতো, রিলোড দিলে ঠিক হয়ে যেতো (কারণ ততক্ষণে ক্ষণস্থায়ী
    // সমস্যাটা কেটে যেতো)। এখন পুরো লজিকটা try/catch দিয়ে মোড়ানো হলো — SEO ট্যাগ বসানো ব্যর্থ
    // হলেও ভিজিটর সবসময় আসল (অপরিবর্তিত) প্রোডাক্ট পেজটাই দেখবে, কখনো crash পেজ দেখবে না।
    try {
        const response = isPrettyPath ? await context.rewrite('/product.html') : await context.next();
        if (!productId) return response;

        let product;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            const apiRes = await fetch(`${BACKEND_URL}/api/products/${productId}`, { signal: controller.signal });
            clearTimeout(timer);
            if (!apiRes.ok) return response;
            product = await apiRes.json();
        } catch (err) {
            // ব্যাকএন্ড স্লো/ডাউন/টাইমআউট — মূল পেজটাই অপরিবর্তিতভাবে পাঠিয়ে দাও, কাউকে বসিয়ে রাখা যাবে না
            return response;
        }
        if (!product || !product._id || !product.name) return response;

        const html = await response.text();
        const newHtml = injectSeoIntoHtml(html, product);

        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');
        newHeaders.set('content-type', 'text/html; charset=UTF-8');

        return new Response(newHtml, { status: response.status, headers: newHeaders });
    } catch (err) {
        // শেষ ভরসা: উপরের যেকোনো ধাপে অপ্রত্যাশিত এরর হলে সরাসরি আসল, অপরিবর্তিত পেজটাই ফেরত
        // দেওয়া হচ্ছে — ভিজিটর কখনো crash পেজ দেখবে না, বড়জোর SEO ট্যাগগুলো (title/description
        // ইত্যাদি) generic থেকে যাবে এই একটা রিকোয়েস্টের জন্য
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

// রাউটিং এখন netlify.toml-এ দুইটা আলাদা [[edge_functions]] এন্ট্রি দিয়ে হয় (/product.html আর
// /product/*, দুটোই এই একই ফাংশনে) — এখানে আলাদা করে export const config দিলে netlify.toml-এর
// এন্ট্রির সাথে ডুপ্লিকেট হয়ে /product.html-এ ফাংশনটা দুইবার চলতে পারতো, তাই এটা বাদ দেওয়া হলো

// টেস্টিং-এর জন্য (Node দিয়ে যাচাই করার সুবিধার্থে) — Netlify আসলে শুধু default export ও
// config-ই ব্যবহার করে, বাকি এক্সপোর্টগুলো deploy-এর সময় নিরাপদে উপেক্ষা করা হবে
export { injectSeoIntoHtml, computeSeoFields, stripHtml, escapeHtml, escapeAttr, setAttrById, setTagTextById };
