// এক জায়গায় ব্যাকএন্ডের লিংক — সাইট লাইভ করার সময় শুধু এই একটা লাইন বদলালেই হবে
const BACKEND_URL = 'https://smarttechzone-backend.onrender.com';

// ============================================================================
// ছবি রিসাইজ (CDN) — হোস্টিং অনুযায়ী এক জায়গায় নিয়ন্ত্রণ। resolveImg() সব পেজে এটাই ডাকে।
//   'netlify'    → /.netlify/images   (Netlify-তে হোস্ট থাকলে)
//   'cloudflare' → /cdn-cgi/image/    (ডোমেইন Cloudflare-এ থাকলে + Dashboard > Images > Transformations চালু থাকলে)
//   'none'       → মূল ছবি যেমন আছে (রিসাইজ ছাড়া; *.pages.dev টেস্ট URL-এ ডিফল্ট)
// কাটওভারের সময় শুধু নিচের STZ_DEFAULT_IMG_MODE লাইনটা বদলালেই হবে।
// রিসাইজড ছবি লোড ব্যর্থ হলে নিচের লিসনার স্বয়ংক্রিয়ভাবে মূল ছবিতে ফিরে যায় — ছবি কখনো ভাঙা দেখাবে না।
// ============================================================================
var STZ_DEFAULT_IMG_MODE='cloudflare';
var STZ_IMG_MODE = (typeof window !== 'undefined' && window.STZ_IMG_MODE) || (function () {
    try {
        var h = location.hostname;
        if (/\.pages\.dev$/i.test(h)) return 'none';
    } catch (e) {}
    return STZ_DEFAULT_IMG_MODE;
})();

function stzImg(abs, w, h) {
    if (!w) return abs;
    if (STZ_IMG_MODE === 'cloudflare') {
        var opt = 'width=' + w + (h ? ',height=' + h : '') + ',fit=cover,quality=75,format=auto';
        return '/cdn-cgi/image/' + opt + '/' + abs;
    }
    if (STZ_IMG_MODE === 'netlify') {
        var qs = new URLSearchParams({ url: abs, w: String(w), fit: 'cover', q: '75' });
        if (h) qs.set('h', String(h));
        return '/.netlify/images?' + qs.toString();
    }
    return abs;
}

if (typeof document !== 'undefined') {
    document.addEventListener('error', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'IMG') return;
        var src = el.getAttribute('src') || '';
        // ধাপ ১: রিসাইজড ছবি (cdn-cgi / netlify) লোড না হলে মূল ছবিতে ফেরা
        if (!el.dataset.stzImgFb && STZ_IMG_MODE !== 'none') {
            var orig = null;
            if (src.indexOf('/cdn-cgi/image/') === 0) {
                orig = src.replace(/^\/cdn-cgi\/image\/[^/]*\//, '');
            } else if (src.indexOf('/.netlify/images?') === 0) {
                try { orig = new URLSearchParams(src.split('?')[1]).get('url'); } catch (err) {}
            }
            if (orig) { el.dataset.stzImgFb = '1'; el.src = orig; e.stopImmediatePropagation(); return; }
        }
        // ধাপ ২: মূল ছবি (pub-xxxx.r2.dev) লোড না হলে নিজের ডোমেইনের /img/ পথে একবার আবার চেষ্টা (functions/img)।
        // stopImmediatePropagation: নইলে ছবির নিজের inline onerror সঙ্গে সঙ্গে "No Image" প্লেসহোল্ডার বসিয়ে দেয়।
        var m = src.match(/^https:\/\/pub-[0-9a-f]+\.r2\.dev\/(uploads\/[^?#]+)/i);
        if (m && !el.dataset.stzImgFb2) { el.dataset.stzImgFb2 = '1'; el.src = '/img/' + m[1]; e.stopImmediatePropagation(); }
    }, true);
}
