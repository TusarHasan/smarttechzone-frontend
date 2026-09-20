// netlify/edge-functions/brand-seo.js
//
// ============================================================================
// একই ধরনের সমস্যা যা product.html-এ ছিল, ঠিক সেটাই brands/brand.html-এও আছে (৮টা
// ব্র্যান্ড — Apple, Samsung, Xiaomi, Oppo, Vivo, Realme, Nokia, Symphony — সবাই এই
// একটাই টেমপ্লেট পেজ শেয়ার করে, ?name= প্যারামিটার দিয়ে)। Google প্রথমবার raw HTML
// পড়ার সময় সব ব্র্যান্ড পেজেই একই জেনেরিক title ("Brand Parts - Smart Tech Zone") ও
// canonical (আইডি/নাম ছাড়া) দেখে — যেটা client-side JS পরে ঠিক করে দিতো। এই Edge
// Function এখন সেই একই title/description/canonical/OG ট্যাগ raw HTML-এই বসিয়ে দেয়।
//
// সুবিধা: brand.html-এর SEO ট্যাগ শুধু URL-এর ?name= প্যারামিটার থেকেই বানানো যায় —
// ব্যাকএন্ডে আলাদা করে কিছু fetch করার দরকারই নেই (দেখুন brand.html-এর নিজের JS,
// লাইন ৮৭-১০৫)। তাই এখানে কোনো নেটওয়ার্ক টাইমআউট/fail-open লজিকের দরকার নেই —
// এটা সবসময় তাৎক্ষণিক ও নির্ভরযোগ্য।
// ============================================================================

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function setAttrById(html, id, attr, value) {
    const re = new RegExp(`(<[^>]*\\bid=["']${id}["'][^>]*\\s${attr}=["'])([^"']*)(["'])`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + value + post);
}
function setTagTextById(html, tag, id, text) {
    const re = new RegExp(`(<${tag}[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</${tag}>)`, 'i');
    return html.replace(re, (_m, pre, _old, post) => pre + text + post);
}

// brand.html-এর client-side JS (লাইন ৯৫-৯৭) এর সাথে হুবহু মিলিয়ে — যাতে raw HTML আর JS-রেন্ডার
// করা পেজের মধ্যে কোনো তফাত না থাকে
function computeBrandSeoFields(brand) {
    const title = `${brand} মোবাইল রিপ্লেসমেন্ট পার্টস - Smart Tech Zone`;
    const desc = `${brand} ফোনের রিপ্লেসমেন্ট পার্টস — ডিসপ্লে, ব্যাটারি, চার্জিং পোর্ট, বডি হাউজিং ও আরও অনেক কিছু। Smart Tech Zone থেকে কিনুন, সারা বাংলাদেশে হোম ডেলিভারি।`;
    const pageUrl = `https://smarttechzone.com.bd/brands/brand.html?name=${encodeURIComponent(brand)}`;
    return { title, desc, pageUrl };
}

function injectBrandSeoIntoHtml(html, brand) {
    const { title, desc, pageUrl } = computeBrandSeoFields(brand);
    let out = html;
    out = setTagTextById(out, 'title', 'pageTitle', escapeHtml(title));
    out = setAttrById(out, 'metaDescription', 'content', escapeAttr(desc));
    out = setAttrById(out, 'canonicalTag', 'href', escapeAttr(pageUrl));
    out = setAttrById(out, 'ogTitleTag', 'content', escapeAttr(title));
    out = setAttrById(out, 'ogDescTag', 'content', escapeAttr(desc));
    out = setAttrById(out, 'ogUrlTag', 'content', escapeAttr(pageUrl));
    return out;
}

export default async (request, context) => {
    const response = await context.next();

    const url = new URL(request.url);
    const brand = (url.searchParams.get('name') || '').trim();
    if (!brand) return response; // brand.html-এর নিজের JS-ও এই অবস্থায় কিছু বদলায় না

    const html = await response.text();
    const newHtml = injectBrandSeoIntoHtml(html, brand);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete('content-length');
    newHeaders.set('content-type', 'text/html; charset=UTF-8');
    return new Response(newHtml, { status: response.status, headers: newHeaders });
};

export const config = { path: '/brands/brand.html' };

export { injectBrandSeoIntoHtml, computeBrandSeoFields };
