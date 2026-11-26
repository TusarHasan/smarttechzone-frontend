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

// খরচ কমানো: Cloudflare প্রতিটা আলাদা (ছবি × সাইজ) জুটির জন্য আলাদা ট্রান্সফর্মেশন গোনে (মাসে ৫ হাজার ফ্রি, তারপর প্রতি হাজারে $0.50)।
// তাই পণ্যের কার্ড/থাম্বনেইলের পুরনো সাইজগুলো (হোম ৩৬০, শপ-সার্চ-ব্র্যান্ড ২০০, কার্ট ১৪০) একটাই সাইজে (৩২০ বর্গ) মেলানো হলো —
// একটা পণ্যের ছবি এখন এক সাইজে বানানো হয়, আর পেজ বদলালেও ব্রাউজার ক্যাশের একই ছবি পায়। ক্যাটাগরি/ব্র্যান্ড আইকন (১২৮/৮০) ও ব্যানার (৬৪০/৩২০, h ছাড়া) আগের মতোই।
var STZ_CARD_IMG = 320;
var STZ_CARD_SIZES = { 360: 1, 200: 1, 140: 1 };
function stzImg(abs, w, h) {
    if (!w) return abs;
    if (h && STZ_CARD_SIZES[w]) { w = STZ_CARD_IMG; h = STZ_CARD_IMG; }
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
        // ধাপ ২: মূল ছবি (img.smarttechzone.com.bd বা পুরনো pub-xxxx.r2.dev) লোড না হলে নিজের ডোমেইনের /img/ পথে একবার আবার চেষ্টা (functions/img)।
        // stopImmediatePropagation: নইলে ছবির নিজের inline onerror সঙ্গে সঙ্গে "No Image" প্লেসহোল্ডার বসিয়ে দেয়।
        var m = src.match(/^https:\/\/(?:pub-[0-9a-f]+\.r2\.dev|img\.smarttechzone\.com\.bd)\/(uploads\/[^?#]+)/i);
        if (m && !el.dataset.stzImgFb2) { el.dataset.stzImgFb2 = '1'; el.src = '/img/' + m[1]; e.stopImmediatePropagation(); }
    }, true);
}


// ============================================================================
// অর্ডার কোথা থেকে এসেছে (UTM / Meta fbclid / Google gclid / রেফারার) — ল্যান্ডিং URL থেকে ৩০ দিনের জন্য ব্রাউজারে রাখা হয়,
// চেকআউটে অর্ডারের সাথে যায় (backend/utils/attribution.js), অ্যাডমিন Orders-এ ব্যাজ হিসেবে দেখায়।
//   - URL-এ UTM/fbclid থাকলে সেটাই নতুন "সূত্র" (পরের বিজ্ঞাপন-ক্লিক আগেরটা বদলে দেয়)।
//   - পরে অন্য পেজ ঘুরলে বা আবার সরাসরি এলেও ৩০ দিন পর্যন্ত আগের সূত্র থাকে, তাই অর্ডার দিলেও বিজ্ঞাপন চেনা যায়।
//   - UTM না থাকলে শুধু বাইরের রেফারার (যেমন google.com) রাখা হয়। কোনো ব্যক্তিগত তথ্য রাখা হয় না।
// কোনো কারণে ব্রাউজারে স্টোরেজ বন্ধ থাকলেও (প্রাইভেট মোড ইত্যাদি) পেজ কখনো আটকায় না।
// ============================================================================
(function () {
    try {
        var KEY = 'stz_attr_v1', TTL = 30 * 24 * 3600 * 1000, now = Date.now();
        var q = new URLSearchParams(location.search);
        var g = function (n) { return (q.get(n) || '').trim().slice(0, 150); };
        var refHost = function () {
            try {
                var h = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase();
                var me = location.hostname.replace(/^www\./, '').toLowerCase();
                return !h || h === me ? '' : h;
            } catch (e) { return ''; }
        };
        var cur = null;
        try { cur = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { cur = null; }
        if (cur && now - (cur.ts || 0) > TTL) cur = null;
        // Google Ads অটো-ট্যাগিংয়ের ক্লিক আইডি (gclid/gbraid/wbraid): ডেলিভারড অর্ডার Google Ads-এ ফেরত পাঠাতে লাগে
        var gid = function (n) { var v = (q.get(n) || '').trim(); return /^[A-Za-z0-9_\-]{10,200}$/.test(v) ? v : ''; };
        var hasParam = g('utm_source') || g('utm_medium') || g('utm_campaign') || g('fbclid') || gid('gclid') || gid('gbraid') || gid('wbraid');
        if (hasParam) {
            cur = { source: g('utm_source'), medium: g('utm_medium'), campaign: g('utm_campaign'), content: g('utm_content'), term: g('utm_term'), fbclid: !!g('fbclid'), gclid: gid('gclid'), gbraid: gid('gbraid'), wbraid: gid('wbraid'), ref: refHost(), landing: location.pathname, ts: now };
        } else if (!cur) {
            var r = refHost();
            if (r) cur = { ref: r, landing: location.pathname, ts: now };
        }
        if (cur) { try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {} }
        // checkout.html এটা ডাকে। Meta-র _fbc কুকি থাকলে (fbclid থেকে বসে) সেটাও Facebook-ক্লিকের প্রমাণ।
        window.STZ_getAttribution = function () {
            var a = cur ? JSON.parse(JSON.stringify(cur)) : null;
            try {
                if (document.cookie.indexOf('_fbc=') !== -1) { a = a || { ts: now }; a.fbclid = true; }
            } catch (e) {}
            return a || undefined;
        };
    } catch (e) { window.STZ_getAttribution = function () { return undefined; }; }
})();
