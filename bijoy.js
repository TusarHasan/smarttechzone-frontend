/* বিজয়ের মাস (ডিসেম্বর) থিম: সব রিটেইল পেজে ব্যানার, হোমপেজে অফার সেকশন।
   footer.js শুধু নভেম্বর-ডিসেম্বরে (বা ?bijoy=preview দিলে) এটা লোড করে। অফার সত্যিই চালু কিনা সার্ভার বলে (/api/orders/promo)।
   ফেরাতে/বন্ধ করতে: footer.js-এর "বিজয়ের মাস" ব্লকটা মুছুন, বা ব্যাকএন্ডে BIJOY_PROMO_OFF=1 দিন। */
(function () {
    'use strict';
    if (window.self !== window.top || /^\/wholesale(\/|$)/.test(location.pathname) || window.__bijoyLoaded) return;
    window.__bijoyLoaded = true;

    var CODE = 'BIJOY71', PERCENT = 16, MIN = 550;
    var preview = /[?&]bijoy=preview\b/.test(location.search);

    // mode: 'live' = অফার চলছে (ব্যানার + হোমপেজ সেকশন + হিরো স্লাইড); 'teaser' = ১ ডিসেম্বরের আগে শুধু হিরো স্লাইডে "১ ডিসেম্বর থেকে" প্রচারণা
    function start(cfg, mode) {
        if (cfg) { CODE = cfg.couponCode || CODE; PERCENT = cfg.couponPercent || PERCENT; MIN = cfg.freeDeliveryMin || MIN; }
        injectCss();
        if (mode === 'live') { document.documentElement.className += ' bj-live'; addRibbon(); addHomeSection(); }
        addHeroSlides(mode);
    }

    function flag(w) {
        return '<svg class="bj-flag" width="' + w + '" height="' + Math.round(w * 0.6) + '" viewBox="0 0 100 60" role="img" aria-label="বাংলাদেশের পতাকা"><rect width="100" height="60" fill="#006a4e"/><circle cx="45" cy="30" r="20" fill="#f42a41"/></svg>';
    }

    function injectCss() {
        var css = document.createElement('style');
        css.id = 'bijoyCss';
        css.textContent =
            '.bj-ribbon{position:relative;background:#006a4e;color:#fff;text-align:center;padding:8px 14px;font:600 13px/1.6 "Segoe UI","Noto Sans Bengali",Arial,sans-serif}' +
            '.bj-ribbon a{color:inherit;text-decoration:none;display:inline-block}' +
            '.bj-ribbon .bj-flag{vertical-align:-3px;margin-right:6px;border-radius:2px}' +
            '.bj-ribbon .bj-code{display:inline-block;background:#f42a41;color:#fff;padding:0 8px;border-radius:4px;letter-spacing:.5px;margin:0 2px}' +
            '.bj-ribbon .bj-sep{opacity:.55;margin:0 8px}' +
            '.bj-live .navbar{box-shadow:0 3px 0 0 #006a4e,0 6px 0 0 #f42a41 !important}' +
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
            '.bj-slide .bj-chip{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.55);color:#fff;font:700 12.5px/1 "Segoe UI","Noto Sans Bengali",Arial,sans-serif;padding:6px 12px;border-radius:999px;margin-bottom:12px}' +
            '.bj-slide .bj-code{background:#fff;color:#c81e36;border-radius:5px;padding:1px 8px;letter-spacing:.5px;white-space:nowrap}' +
            '.bj-slide .hero-slide-visual{background:transparent!important;box-shadow:none!important;border:none!important}' +
            '.bj-slide .hero-slide-visual svg{width:100%;height:auto;display:block;border:3px solid #fff;box-sizing:border-box;border-radius:6px;box-shadow:0 8px 22px rgba(0,0,0,.28)}' +
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

    // হিরো স্লাইডারের শুরুতে ডিসেম্বর ক্যাম্পেইনের ২টা স্লাইড (শুধু হোমপেজে)
    function addHeroSlides(mode) {
        var wrap = document.getElementById('heroSlides');
        if (!wrap || wrap.querySelector('.bj-slide')) return;
        var live = mode === 'live';
        var chip = live ? 'বিজয়ের মাসের অফার চলছে' : '১ ডিসেম্বর থেকে শুরু';
        var s1 = '<div class="hero-slide bj-slide" style="background:linear-gradient(135deg,#064e3b 0%,#006a4e 55%,#0fa37a 100%);"><div class="hero-slide-inner"><div class="hero-slide-text">' +
            '<span class="bj-chip">' + chip + '</span>' +
            '<h2>বিজয়ের মাস ডিসেম্বরে ' + PERCENT + '% ছাড়!</h2>' +
            '<p>' + (live ? 'চেকআউটে কোড' : 'সারা ডিসেম্বর কোড') + ' <strong class="bj-code">' + CODE + '</strong> দিন, পণ্যের দামে ' + PERCENT + '% ছাড় পান।</p>' +
            '<a href="' + (live ? '#bijoy-offers' : 'shop.html') + '" class="hero-slide-btn" style="color:#006a4e;">' + (live ? 'অফার দেখুন →' : 'এখনই দেখে রাখুন →') + '</a>' +
            '</div><div class="hero-slide-visual">' + flag(132) + '</div></div></div>';
        var s2 = '<div class="hero-slide bj-slide" style="background:linear-gradient(135deg,#7f1224 0%,#c81e36 55%,#f42a41 100%);"><div class="hero-slide-inner"><div class="hero-slide-text">' +
            '<span class="bj-chip">' + chip + '</span>' +
            '<h2>৳' + MIN + '+ অর্ডারে ফ্রি ডেলিভারি</h2>' +
            '<p>বিজয়ের মাসে সারা বাংলাদেশে ' + MIN + ' টাকা বা এর বেশি দামের পণ্য কিনলে ডেলিভারি চার্জ লাগবে না।</p>' +
            '<a href="shop.html" class="hero-slide-btn" style="color:#c81e36;">কেনাকাটা করুন →</a>' +
            '</div><div class="hero-slide-visual"><i class="fa-solid fa-truck-fast"></i></div></div></div>';
        wrap.insertAdjacentHTML('afterbegin', s1 + s2);
        wrap.querySelectorAll('.hero-slide.active').forEach(function (el) { el.classList.remove('active'); });
        wrap.querySelector('.bj-slide').classList.add('active');
        // index.html-এর হিরো স্ক্রিপ্ট stzHeroRebuild (global let) দেয়; ডট ও স্লাইড নতুন করে গোছানো
        function rebuild() { try { if (typeof stzHeroRebuild === 'function') { stzHeroRebuild(true); return true; } } catch (e) {} return false; }
        if (!rebuild()) window.addEventListener('load', rebuild);
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

    if (preview) { start(null, 'live'); return; }
    try {
        fetch(((typeof BACKEND_URL !== 'undefined' && BACKEND_URL) || '') + '/api/orders/promo')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (p) {
                if (!p) return;
                if (p.bijoy === true) start(p, 'live');
                else if (p.teaser === true) start(p, 'teaser');
            })
            .catch(function () {});
    } catch (e) {}
})();
