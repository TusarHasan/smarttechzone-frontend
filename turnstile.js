/* Cloudflare Turnstile উইজেট সহায়ক — OTP/ফর্ম পাঠানোর আগে বট-যাচাইয়ের টোকেন দেয়।
   appearance 'interaction-only': বেশিরভাগ কাস্টমার কিছুই দেখেন না, সন্দেহ হলে শুধু তখন ছোট বক্স আসে।
   Site key গোপন নয় (Secret key শুধু Render-এ)। স্ক্রিপ্ট লোড না হলে ফর্ম আটকায় না, টোকেন ফাঁকা যায়
   (ব্যাকএন্ড report/enforce মোড অনুযায়ী সিদ্ধান্ত নেয়)। */
(function () {
    'use strict';
    var KEY = window.STZ_TURNSTILE_SITE_KEY || '0x4AAAAAAF7p38kgXK0YA6iS';
    var loading = null;
    function load() {
        if (window.turnstile) return Promise.resolve(window.turnstile);
        if (loading) return loading;
        loading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true; s.defer = true;
            s.onload = function () { resolve(window.turnstile); };
            s.onerror = function () { loading = null; reject(new Error('turnstile-load')); };
            document.head.appendChild(s);
        });
        return loading;
    }
    function mount(el) {
        var h = { token: '', id: null, waiters: [] };
        function setToken(t) {
            h.token = t || '';
            if (t) h.waiters.splice(0).forEach(function (f) { f(t); });
        }
        if (el) {
            load().then(function (ts) {
                h.id = ts.render(el, {
                    sitekey: KEY, appearance: 'interaction-only',
                    callback: setToken,
                    'expired-callback': function () { setToken(''); },
                    'error-callback': function () { setToken(''); }
                });
            }).catch(function () { /* ব্লক/অফলাইন: টোকেন ছাড়াই চলবে */ });
        }
        // টোকেন আসার জন্য সর্বোচ্চ ms অপেক্ষা; না এলে '' ফেরত
        h.waitToken = function (ms) {
            if (h.token) return Promise.resolve(h.token);
            return new Promise(function (resolve) {
                var done = false;
                var timer = setTimeout(function () { if (!done) { done = true; resolve(''); } }, ms || 8000);
                h.waiters.push(function (tok) { if (!done) { done = true; clearTimeout(timer); resolve(tok); } });
            });
        };
        // প্রতিটা টোকেন একবারই ব্যবহার করা যায় — অনুরোধের পর নতুন টোকেনের জন্য রিসেট
        h.reset = function () {
            h.token = '';
            try { if (h.id !== null && window.turnstile) window.turnstile.reset(h.id); } catch (e) { /* ignore */ }
        };
        return h;
    }
    window.stzTurnstile = { mount: mount };
})();
