/* বিজয়ের মাস (ডিসেম্বর) থিম: সব রিটেইল পেজে ব্যানার, হোমপেজে অফার সেকশন।
   footer.js শুধু ডিসেম্বরে (বা ?bijoy=preview দিলে) এটা লোড করে। অফার সত্যিই চালু কিনা সার্ভার বলে (/api/orders/promo)।
   ফেরাতে/বন্ধ করতে: footer.js-এর "বিজয়ের মাস" ব্লকটা মুছুন, বা ব্যাকএন্ডে BIJOY_PROMO_OFF=1 দিন। */
(function () {
    'use strict';
    if (window.self !== window.top || /^\/wholesale(\/|$)/.test(location.pathname) || window.__bijoyLoaded) return;
    window.__bijoyLoaded = true;

    var CODE = 'BIJOY71', PERCENT = 16, MIN = 550;
    var preview = /[?&]bijoy=preview\b/.test(location.search);

    function start(cfg) {
        if (cfg) { CODE = cfg.couponCode || CODE; PERCENT = cfg.couponPercent || PERCENT; MIN = cfg.freeDeliveryMin || MIN; }
        injectCss();
        addRibbon();
        addHomeSection();
    }

    function flag(w) {
        return '<svg class="bj-flag" width="' + w + '" height="' + Math.round(w * 0.6) + '" viewBox="0 0 100 60" role="img" aria-label="বাংলাদেশের পতাকা"><rect width="100" height="60" fill="#006a4e"/><circle cx="45" cy="30" r="20" fill="#f42a41"/></svg>';
    }

    function injectCss() {
        var css = document.createElement('style');
        css.id = 'bijoyCss';
        css.textContent =
            '.bj-ribbon{position:relative;background:#006a4e;color:#fff;text-align:center;padding:8px 14px 11px;font:600 13px/1.6 "Segoe UI","Noto Sans Bengali",Arial,sans-serif}' +
            '.bj-ribbon:after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:repeating-linear-gradient(90deg,#f42a41 0 18px,#006a4e 18px 36px)}' +
            '.bj-ribbon a{color:inherit;text-decoration:none;display:inline-block}' +
            '.bj-ribbon .bj-flag{vertical-align:-3px;margin-right:6px;border-radius:2px}' +
            '.bj-ribbon .bj-code{display:inline-block;background:#f42a41;color:#fff;padding:0 8px;border-radius:4px;letter-spacing:.5px;margin:0 2px}' +
            '.bj-ribbon .bj-sep{opacity:.55;margin:0 8px}' +
            '.navbar{box-shadow:0 3px 0 0 #006a4e,0 6px 0 0 #f42a41 !important}' +
            '.bj-offers{background:linear-gradient(180deg,#eefaf5 0%,#ffffff 100%);padding:26px 16px 30px;border-bottom:1px solid #d7efe6}' +
            '.bj-offers .bj-wrap{max-width:1200px;margin:0 auto}' +
            '.bj-offers h2{font:700 22px/1.4 "Poppins","Noto Sans Bengali",Arial,sans-serif;color:#064e3b;margin:0 0 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
            '.bj-offers .bj-sub{color:#476a5d;font-size:14px;margin:0 0 16px}' +
            '.bj-cards{display:flex;flex-wrap:wrap;margin:0 -8px}' +
            '.bj-card{flex:1 1 300px;margin:8px;border-radius:12px;padding:18px 20px;position:relative;overflow:hidden;color:#fff;min-height:132px}' +
            '.bj-card.c1{background:linear-gradient(135deg,#006a4e 0%,#0b8f6a 100%)}' +
            '.bj-card.c2{background:linear-gradient(135deg,#c81e36 0%,#f42a41 100%)}' +
            '.bj-card:before{content:"";position:absolute;right:-30px;top:-30px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.12)}' +
            '.bj-card .bj-big{font:800 30px/1.2 "Poppins","Noto Sans Bengali",Arial,sans-serif;margin:0 0 4px}' +
            '.bj-card p{margin:0;font-size:14px;line-height:1.6;opacity:.95}' +
            '.bj-card .bj-row{margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
            '.bj-card .bj-codebox{background:#fff;color:#064e3b;font:700 16px/1 "Poppins",Arial,sans-serif;letter-spacing:1px;padding:9px 14px;border-radius:6px;border:2px dashed #006a4e}' +
            '.bj-card button{border:none;cursor:pointer;background:#fff;color:#006a4e;font:700 13px/1 "Segoe UI","Noto Sans Bengali",Arial,sans-serif;padding:10px 14px;border-radius:6px}' +
            '.bj-card a.bj-btn{display:inline-block;background:#fff;color:#c81e36;font:700 13px/1 "Segoe UI","Noto Sans Bengali",Arial,sans-serif;padding:10px 14px;border-radius:6px;text-decoration:none}' +
            '@media (max-width:600px){.bj-offers h2{font-size:19px}.bj-card .bj-big{font-size:26px}}';
        document.head.appendChild(css);
    }

    function addRibbon() {
        if (document.getElementById('bijoyRibbon')) return;
        var r = document.createElement('aside');
        r.id = 'bijoyRibbon'; r.className = 'bj-ribbon'; r.setAttribute('aria-label', 'বিজয়ের মাসের অফার');
        var onHome = /^\/(index(\.html)?)?$/.test(location.pathname);
        var href = (onHome ? '' : '/') + '#bijoy-offers';
        r.innerHTML = '<a href="' + href + '">' + flag(22) + 'বিজয়ের মাস ডিসেম্বর<span class="bj-sep">|</span>কোড <span class="bj-code">' + CODE + '</span> দিলে ' + PERCENT + '% ছাড়<span class="bj-sep">|</span>৳' + MIN + '+ অর্ডারে ফ্রি ডেলিভারি</a>';
        var banner = document.getElementById('stzWelcomeBanner');
        if (banner && banner.parentNode) banner.parentNode.insertBefore(r, banner.nextSibling);
        else document.body.insertBefore(r, document.body.firstChild);
        if (!onHome) r.querySelector('a').setAttribute('href', '/index.html#bijoy-offers');
    }

    function copyCode(btn) {
        function done() { btn.textContent = 'কপি হয়েছে'; setTimeout(function () { btn.textContent = 'কোড কপি করুন'; }, 2000); }
        try {
            if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(CODE).then(done, fallback); return; }
        } catch (e) {}
        fallback();
        function fallback() {
            try {
                var t = document.createElement('textarea'); t.value = CODE; t.setAttribute('readonly', '');
                t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
                document.execCommand('copy'); document.body.removeChild(t); done();
            } catch (e) { btn.textContent = CODE; }
        }
    }

    function addHomeSection() {
        if (!/^\/(index(\.html)?)?$/.test(location.pathname) || document.getElementById('bijoy-offers')) return;
        var anchor = document.querySelector('.part-categories-section');
        if (!anchor || !anchor.parentNode) return;
        var s = document.createElement('section');
        s.id = 'bijoy-offers'; s.className = 'bj-offers';
        s.innerHTML =
            '<div class="bj-wrap">' +
            '<h2>' + flag(34) + 'বিজয়ের মাস ডিসেম্বরের অফার</h2>' +
            '<p class="bj-sub">পুরো ডিসেম্বর জুড়ে চলবে। বিজয়ের মাসে আপনার জন্য বিশেষ সুবিধা।</p>' +
            '<div class="bj-cards">' +
            '<div class="bj-card c1"><div class="bj-big">' + PERCENT + '% ছাড়</div><p>চেকআউটে কুপন কোডটি দিন, পণ্যের দামে ছাড় পান।</p>' +
            '<div class="bj-row"><span class="bj-codebox">' + CODE + '</span><button type="button" id="bjCopy">কোড কপি করুন</button></div></div>' +
            '<div class="bj-card c2"><div class="bj-big">ফ্রি ডেলিভারি</div><p>৳' + MIN + ' বা এর বেশি দামের পণ্য কিনলে সারা বাংলাদেশে ডেলিভারি চার্জ লাগবে না।</p>' +
            '<div class="bj-row"><a class="bj-btn" href="shop.html">এখনই কেনাকাটা করুন</a></div></div>' +
            '</div></div>';
        anchor.parentNode.insertBefore(s, anchor);
        var b = document.getElementById('bjCopy');
        if (b) b.addEventListener('click', function () { copyCode(b); });
        if (location.hash === '#bijoy-offers') { try { s.scrollIntoView(); } catch (e) {} }
    }

    if (preview) { start(null); return; }
    try {
        fetch(((typeof BACKEND_URL !== 'undefined' && BACKEND_URL) || '') + '/api/orders/promo')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (p) { if (p && p.bijoy === true) start(p); })
            .catch(function () {});
    } catch (e) {}
})();
