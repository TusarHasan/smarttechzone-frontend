// ===== লগইন পপ-আপ (দারাজ-স্টাইল) =====
// কোনো পেজে "Login" লিংকে ক্লিক করলে আলাদা login.html পেজে না গিয়ে একই পেজের ওপর এই পপ-আপ খোলে।
// লগইন সফল হলে (পাসওয়ার্ড / Google / Facebook) পেজটা রিলোড হয়ে লগইন-করা অবস্থায় ফিরে আসে।
// customer-auth.js এই ফাইল (আর login-popup.css) দরকার হলে লোড করে এবং লিংক-ক্লিক ধরে (stzOpenLogin)।
// কিছু ভাঙলে বা ফাইল না এলে আগের login.html পেজই ফলব্যাক হিসেবে কাজ করে।
(function () {
    'use strict';
    if (window.stzLoginPopup) return;

    var FB_APP_ID = '1736164367676120';
    var els = null;
    var state = { redirect: null, lastFocus: null, busy: false, open: false, googleWidth: 0 };

    function apiBase() { return (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : ''; }
    function basePath() { return (typeof getAuthBasePath === 'function') ? getAuthBasePath() : ''; }

    // বর্তমান পেজ (বা দেওয়া URL)-এর সাইট-রুট থেকে আপেক্ষিক পাথ — register/forgot লিংকের ?redirect= এর জন্য
    function rootRelative(href) {
        try {
            var u = new URL(href || location.href, location.href);
            var root = new URL(basePath() || './', location.href).pathname;
            var p = u.pathname.indexOf(root) === 0 ? u.pathname.slice(root.length) : u.pathname.split('/').pop();
            return (p || 'index.html') + u.search;
        } catch (e) { return 'index.html'; }
    }

    function build() {
        if (els) return els;
        var wrap = document.createElement('div');
        wrap.className = 'stzlp-overlay';
        wrap.id = 'stzlpOverlay';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML =
            '<div class="stzlp-dialog" role="dialog" aria-modal="true" aria-labelledby="stzlpTitle">' +
            '<button type="button" class="stzlp-close" aria-label="বন্ধ করুন"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
            '<div class="stzlp-head"><img src="' + basePath() + 'images/logo.png" alt="Smart Tech Zone" onerror="this.style.display=\'none\'">' +
            '<h2 class="stzlp-title" id="stzlpTitle">লগইন করুন</h2><p class="stzlp-sub">Smart Tech Zone-এ স্বাগতম!</p></div>' +
            '<p class="stzlp-note" id="stzlpNote" role="status"></p>' +
            '<form id="stzlpForm" autocomplete="on" novalidate>' +
            '<div class="stzlp-field"><label for="stzlpUser">ফোন নম্বর অথবা ইমেইল</label>' +
            '<div class="stzlp-input-wrap"><input class="stzlp-input" id="stzlpUser" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="আপনার ফোন নম্বর অথবা ইমেইল"></div></div>' +
            '<div class="stzlp-field"><label for="stzlpPass">পাসওয়ার্ড</label>' +
            '<div class="stzlp-input-wrap"><input class="stzlp-input stzlp-has-toggle" id="stzlpPass" name="password" type="password" autocomplete="current-password" placeholder="আপনার পাসওয়ার্ড">' +
            '<button type="button" class="stzlp-eye" id="stzlpEye" aria-label="পাসওয়ার্ড দেখান" aria-pressed="false" aria-controls="stzlpPass">' +
            '<svg class="stzlp-eye-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
            '<svg class="stzlp-eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/></svg>' +
            '</button></div></div>' +
            '<div class="stzlp-forgot-row"><a class="stzlp-link" id="stzlpForgot" href="forgot-password.html">পাসওয়ার্ড ভুলে গেছেন?</a></div>' +
            '<button type="submit" class="stzlp-submit" id="stzlpSubmit"><span class="stzlp-spin" aria-hidden="true"></span><span id="stzlpSubmitText">লগইন করুন</span></button>' +
            '</form>' +
            '<div class="stzlp-msg" id="stzlpMsg" role="status" aria-live="polite" aria-atomic="true"></div>' +
            '<p class="stzlp-reg">নতুন কাস্টমার? <a class="stzlp-link" id="stzlpReg" href="register.html">রেজিস্টার করুন</a></p>' +
            '<div class="stzlp-divider">অথবা</div>' +
            '<div class="stzlp-social"><div class="stzlp-google" id="stzlpGoogle"></div>' +
            '<button type="button" class="stzlp-fb" id="stzlpFb"><svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><path d="M22 12.06C22 6.48 17.52 2 12 2S2 6.48 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>Facebook দিয়ে লগইন</button></div>' +
            '</div>';
        document.body.appendChild(wrap);

        els = {
            overlay: wrap,
            dialog: wrap.querySelector('.stzlp-dialog'),
            close: wrap.querySelector('.stzlp-close'),
            note: wrap.querySelector('#stzlpNote'),
            form: wrap.querySelector('#stzlpForm'),
            user: wrap.querySelector('#stzlpUser'),
            pass: wrap.querySelector('#stzlpPass'),
            eye: wrap.querySelector('#stzlpEye'),
            submit: wrap.querySelector('#stzlpSubmit'),
            submitText: wrap.querySelector('#stzlpSubmitText'),
            msg: wrap.querySelector('#stzlpMsg'),
            forgot: wrap.querySelector('#stzlpForgot'),
            reg: wrap.querySelector('#stzlpReg'),
            google: wrap.querySelector('#stzlpGoogle'),
            fb: wrap.querySelector('#stzlpFb')
        };

        els.close.addEventListener('click', close);
        // ওভারলের ফাঁকা জায়গায় ক্লিক করলে বন্ধ (ভেতরে ক্লিক বা টেক্সট সিলেক্টের টানাটানিতে নয়)
        var downOnOverlay = false;
        wrap.addEventListener('mousedown', function (e) { downOnOverlay = (e.target === wrap); });
        wrap.addEventListener('click', function (e) { if (e.target === wrap && downOnOverlay) close(); });
        wrap.addEventListener('keydown', onKeydown);
        els.form.addEventListener('submit', function (e) { e.preventDefault(); doLogin(); });
        els.eye.addEventListener('click', function () {
            var show = els.pass.type === 'password';
            els.pass.type = show ? 'text' : 'password';
            els.eye.setAttribute('aria-pressed', show ? 'true' : 'false');
            els.eye.setAttribute('aria-label', show ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান');
        });
        els.fb.addEventListener('click', facebookLogin);
        return els;
    }

    function focusables() {
        return Array.prototype.filter.call(
            els.dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'),
            function (n) { return n.offsetParent !== null || n === document.activeElement; }
        );
    }
    function onKeydown(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        if (e.key !== 'Tab') return;
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function setMsg(text, kind) {
        if (!els) return;
        els.msg.className = 'stzlp-msg' + (kind === 'ok' ? ' stzlp-ok' : '');
        els.msg.textContent = text || '';
    }
    function setBusy(on, label) {
        state.busy = !!on;
        els.submit.disabled = !!on;
        els.fb.disabled = !!on;
        els.submitText.textContent = on ? (label || 'লগইন হচ্ছে...') : 'লগইন করুন';
    }

    function afterLogin() {
        if (typeof stzAfterLogin === 'function') stzAfterLogin(state.redirect);
        else location.reload();
    }

    function doLogin() {
        if (state.busy) return;
        var u = els.user.value.trim(), p = els.pass.value;
        if (!u || !p) {
            setMsg('ফোন নম্বর অথবা ইমেইল এবং পাসওয়ার্ড দুটোই দিন।');
            (u ? els.pass : els.user).focus();
            return;
        }
        setMsg('');
        setBusy(true);
        fetch(apiBase() + '/api/customer-auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: u, password: p })
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
        }).then(function (res) {
            if (!res.ok) { var e = new Error(res.d.error || 'লগইন করা যায়নি।'); e.code = res.d.code; throw e; }
            setCustomerSession(res.d.token, res.d.customer);
            setMsg('লগইন হয়েছে। একটু অপেক্ষা করুন...', 'ok');
            afterLogin();
        }).catch(function (err) {
            setBusy(false);
            var text = (err instanceof TypeError) ? 'সংযোগে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।' : err.message;
            setMsg('❌ ' + text);
            if (err.code === 'NO_ACCOUNT') {
                var a = document.createElement('a');
                a.href = els.reg.href;
                a.textContent = ' রেজিস্টার করুন →';
                els.msg.appendChild(a);
            }
        });
    }

    // ---- Google: বাটন গুগলের লাইব্রেরি এঁকে দেয়; ক্লিকের ফল customer-auth.js-এর stzHandleGoogleCredential-এ যায় ----
    function renderGoogle() {
        if (typeof stzLoadGsi !== 'function') return;
        stzLoadGsi().then(function () {
            stzInitGoogle();
            var width = Math.max(200, Math.min(400, Math.floor(els.google.getBoundingClientRect().width) || 376));
            if (width === state.googleWidth && els.google.firstChild) return;
            state.googleWidth = width;
            els.google.replaceChildren();
            google.accounts.id.renderButton(els.google, {
                type: 'standard', theme: 'outline', size: 'large', text: 'signin_with',
                shape: 'rectangular', logo_alignment: 'center', locale: 'en', width: width
            });
        }).catch(function () { els.google.style.display = 'none'; });
    }

    // ---- Facebook ----
    function loadFacebookSdk() {
        if (window.FB || document.getElementById('facebook-jssdk')) return;
        window.fbAsyncInit = function () { FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v21.0' }); };
        var s = document.createElement('script');
        s.id = 'facebook-jssdk'; s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
        s.src = 'https://connect.facebook.net/en_US/sdk.js';
        document.head.appendChild(s);
    }
    function facebookLogin() {
        if (state.busy) return;
        if (typeof FB === 'undefined') { setMsg('❌ Facebook এখনো লোড হয়নি, একটু পর আবার চেষ্টা করুন।'); return; }
        FB.login(function (response) {
            if (!response || !response.authResponse) { setMsg('❌ Facebook লগইন বাতিল করা হয়েছে।'); return; }
            setMsg(''); setBusy(true);
            fetch(apiBase() + '/api/customer-auth/facebook', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: response.authResponse.accessToken, device: window.STZ_DEVICE || {} })
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
            }).then(function (res) {
                if (!res.ok) throw new Error(res.d.error || 'Facebook লগইন ব্যর্থ হয়েছে।');
                setCustomerSession(res.d.token, res.d.customer);
                setMsg('লগইন হয়েছে। একটু অপেক্ষা করুন...', 'ok');
                afterLogin();
            }).catch(function (err) {
                setBusy(false);
                setMsg('❌ ' + (err instanceof TypeError ? 'সংযোগে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।' : err.message));
            });
        }, { scope: 'email' });
    }

    // ---- খোলা / বন্ধ ----
    // opts.redirect: লগইনের পর যেখানে যাবে (পূর্ণ URL); null হলে এই পেজেই থাকবে (রিলোড হবে)
    // opts.message: ওপরে একটা ছোট কারণ-বার্তা (যেমন "উইশলিস্টে যোগ করতে আগে লগইন করুন।")
    function open(opts) {
        opts = opts || {};
        build();
        state.redirect = opts.redirect || null;
        window.__stzLoginRedirect = state.redirect;
        var back = encodeURIComponent(rootRelative(state.redirect || location.href));
        els.reg.href = basePath() + 'register.html?redirect=' + back;
        els.forgot.href = basePath() + 'forgot-password.html?redirect=' + back;
        els.note.textContent = opts.message || '';
        els.note.classList.toggle('stzlp-show', !!opts.message);
        setMsg('');
        setBusy(false);
        if (!state.open) {
            state.lastFocus = document.activeElement;
            document.documentElement.classList.add('stzlp-lock');
        }
        state.open = true;
        els.overlay.setAttribute('aria-hidden', 'false');
        // transition চালু হওয়ার জন্য এক ফ্রেম পরে ক্লাস বসানো
        requestAnimationFrame(function () { els.overlay.classList.add('stzlp-open'); });
        loadFacebookSdk();
        renderGoogle();
        // শুরুতে ফোন/ইমেইল ঘরে ফোকাস — তবে ইউজার এর মধ্যে নিজেই কোনো ঘরে চলে গেলে সেটা কেড়ে নেওয়া হয় না
        setTimeout(function () {
            var ae = document.activeElement;
            if (state.open && !(ae && els.dialog.contains(ae) && /^(INPUT|BUTTON)$/.test(ae.tagName))) els.user.focus();
        }, 60);
    }

    function close() {
        if (!els || !state.open) return;
        state.open = false;
        window.__stzLoginRedirect = null;
        els.overlay.classList.remove('stzlp-open');
        els.overlay.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('stzlp-lock');
        els.pass.value = '';
        els.pass.type = 'password';
        els.eye.setAttribute('aria-pressed', 'false');
        try { if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus(); } catch (e) { }
    }

    window.stzLoginPopup = {
        open: open,
        close: close,
        isOpen: function () { return state.open; },
        // Google কলব্যাকের ত্রুটি এখানে দেখানো হয়
        showMessage: function (text, kind) { if (els) { setBusy(false); setMsg(text, kind); } },
        setBusy: function (on) { if (els) setBusy(on, 'লগইন হচ্ছে...'); }
    };
})();

// পাসওয়ার্ড দেখান/লুকান (ফেসবুকের মতো চোখের আইকন): পপআপের পাসওয়ার্ড ফিল্ডেও বসে
;(function () { if (window.__stzPwEye || document.querySelector('script[data-pw-eye]')) return; var s = document.createElement('script'); s.src = '/pw-eye.js'; s.defer = true; s.setAttribute('data-pw-eye', '1'); document.head.appendChild(s); })();
