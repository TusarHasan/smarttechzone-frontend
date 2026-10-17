/* Private Wholesale Portal — শেয়ার্ড হেল্পার (index.html ও register.html ব্যবহার করে)
   আলাদা অথ সিস্টেম নেই: সাইটের কাস্টমার লগইন (localStorage customerToken) ব্যবহার হয়। ভেরিফাইড/পেন্ডিং
   স্ট্যাটাস সবসময় সার্ভার থেকে আসে — ব্রাউজারের কোনো ফ্ল্যাগ বিশ্বাস করা হয় না। */
(function () {
    var TOKEN_KEY = 'customerToken';
    var DATA_KEY = 'customerData';
    var API = (typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '') + '/api/wholesale';

    function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
    function customer() { try { return JSON.parse(localStorage.getItem(DATA_KEY) || 'null'); } catch (e) { return null; } }
    function loginUrl() { return '/login.html?redirect=' + encodeURIComponent(location.pathname); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // সার্ভার কল — { ok, status, data } ফেরত দেয়, নেটওয়ার্ক এরর হলে status 0
    function api(path, opts) {
        opts = opts || {};
        var headers = Object.assign({}, opts.headers || {});
        var t = token();
        if (t) headers.Authorization = 'Bearer ' + t;
        return fetch(API + path, Object.assign({}, opts, { headers: headers, cache: 'no-store' }))
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
            })
            .catch(function () { return { ok: false, status: 0, data: { error: 'ইন্টারনেট সংযোগে সমস্যা। আবার চেষ্টা করুন।' } }; });
    }

    var icons = {
        lock: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
        clock: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        check: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        alert: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2v.1"/></svg>',
        shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
        box: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>'
    };

    // উপরের বার — পাবলিক সাইটের নেভিগেশন/লিংক ইচ্ছা করেই নেই; শুধু "স্টোরে ফিরুন"
    function header() {
        var c = customer();
        var name = c && c.name ? String(c.name).trim().split(' ')[0] : '';
        return '<div class="ws-top"><div class="ws-top-in">' +
            '<a class="ws-brand" href="/wholesale/"><span class="ws-brand-mark">' + icons.box + '</span><span>Smart Tech Zone<small>Business Portal</small></span></a>' +
            '<div class="ws-top-actions">' + (name ? '<span>' + esc(name) + '</span>' : '') + '<a href="/">স্টোরে ফিরুন</a></div>' +
            '</div></div>';
    }

    window.WS = { API: API, token: token, customer: customer, loginUrl: loginUrl, esc: esc, api: api, icons: icons, header: header };
})();
