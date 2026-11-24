// ===== কাস্টমার লগইন সেশন — সব পেজে (নেভবার Login/অ্যাকাউন্ট লিংক দেখানো সহ) শেয়ার করা হয় =====
// সাইনআপ/সোশ্যাল লগইনের সময় ব্যাকএন্ডে পাঠানোর ডিভাইস-হিন্ট (ব্রাউজার নিজে যা দেয়; Android Chrome এ মডেল পাওয়া যায়)
window.STZ_DEVICE = {};
try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        navigator.userAgentData.getHighEntropyValues(['model', 'platform']).then(function (v) {
            window.STZ_DEVICE = { model: String(v.model || '').slice(0, 60), platform: String(v.platform || '').slice(0, 20) };
        }).catch(function () { });
    }
} catch (e) { }

const CUSTOMER_TOKEN_KEY = 'customerToken';
const CUSTOMER_DATA_KEY = 'customerData';

// ব্রাউজার সাইট-ডেটা আটকে রাখলে (কুকি/সাইট ডেটা ব্লক, কিছু ইন-অ্যাপ বা প্রাইভেসি ব্রাউজার) localStorage-এ হাত দিলেই
// "Access is denied for this document" (SecurityError) আসে। আগে সেশন সেভ করতে গিয়ে এটাই লগইন ভেঙে দিত।
// এখন localStorage না চললে sessionStorage-এ রাখা হয়; দুটোই বন্ধ হলে পরিষ্কার বাংলা মেসেজ দিয়ে থামানো হয়।
function stzStores() {
    var list = [];
    try { list.push(window.localStorage); } catch (e) { }
    try { list.push(window.sessionStorage); } catch (e) { }
    return list;
}

function stzReadStored(key) {
    var list = stzStores();
    for (var i = 0; i < list.length; i++) {
        try { var v = list[i].getItem(key); if (v != null) return v; } catch (e) { }
    }
    return null;
}

function stzRemoveStored(key) {
    var list = stzStores();
    for (var i = 0; i < list.length; i++) {
        try { list[i].removeItem(key); } catch (e) { }
    }
}

function getCustomerToken() {
    return stzReadStored(CUSTOMER_TOKEN_KEY);
}

function getCustomerData() {
    try { return JSON.parse(stzReadStored(CUSTOMER_DATA_KEY) || 'null'); } catch (e) { return null; }
}

function setCustomerSession(token, customer) {
    var list = stzStores();
    for (var i = 0; i < list.length; i++) {
        try {
            list[i].setItem(CUSTOMER_TOKEN_KEY, token);
            list[i].setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer));
            return;
        } catch (e) { /* এই স্টোরেজ বন্ধ, পরেরটা চেষ্টা */ }
    }
    throw new Error('আপনার ব্রাউজার সাইট ডেটা সংরক্ষণ করতে দিচ্ছে না, তাই লগইন ধরে রাখা যাচ্ছে না। সাইটটা Chrome বা অন্য ব্রাউজারে খুলুন, অথবা ব্রাউজারের সেটিংসে এই সাইটের কুকি/সাইট ডেটা চালু করুন।');
}

async function customerLogout() {
    // চ্যাট উইজেট থাকলে এই ব্রাউজারের পুশ সাবস্ক্রিপশন আগে বাদ দেওয়া (টোকেন থাকতে থাকতেই), ১.৫ সেকেন্ডের বেশি আটকাবে না
    try {
        if (typeof window.stzChatBeforeLogout === 'function') {
            await Promise.race([window.stzChatBeforeLogout(), new Promise(function (r) { setTimeout(r, 1500); })]);
        }
    } catch (e) { /* লগআউট কখনো আটকাবে না */ }
    // Google One Tap লগআউটের পরপর আবার নিজে থেকে ঢুকিয়ে না দেয়: ব্রাউজারের অটো-সাইন-ইন বন্ধ করা +
    // পরের পেজে (যেখানে Google লাইব্রেরি লোড হবে) disableAutoSelect চালানোর জন্য চিহ্ন রাখা
    try { localStorage.setItem('stzNoAutoSelect', '1'); } catch (e) { }
    try { if (navigator.credentials && navigator.credentials.preventSilentAccess) await navigator.credentials.preventSilentAccess(); } catch (e) { }
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { }
    stzRemoveStored(CUSTOMER_TOKEN_KEY);
    stzRemoveStored(CUSTOMER_DATA_KEY);
    window.location.href = getAuthBasePath() + 'index.html';
}

// অথেনটিকেটেড API কল — টোকেন থাকলে Authorization হেডারে যোগ হয়
async function customerAuthFetch(url, options = {}) {
    const token = getCustomerToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, Object.assign({}, options, { headers }));
}

// এই স্ক্রিপ্টটা root থেকে নাকি সাবফোল্ডার থেকে (../customer-auth.js) লোড হয়েছে সেটা বের করে —
// chat-widget.js এর getBasePath() এর মতোই — যাতে লগইন আইকনের ছবির পাথ সব পেজেই ঠিক থাকে
function getAuthBasePath() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('customer-auth.js') !== -1) {
            return src.slice(0, src.lastIndexOf('customer-auth.js'));
        }
    }
    return '';
}

// নেভবারের প্রোফাইল ড্রপডাউনের "Message Center" ক্লিক করলে পূর্ণাঙ্গ মেসেজ সেন্টার পেজে নিয়ে যায়
// (আগে এখানে ছোট ফ্লোটিং চ্যাট উইজেট খুলতো — এখন থ্রেড-লিস্ট + কথোপকথন সহ আলাদা পেজ)
function stzOpenMessageCenter() {
    window.location.href = getAuthBasePath() + 'messages.html';
}

// নেভবারের প্রোফাইল ড্রপডাউনে থাকা "Message Center"-এর পাশে আনরিড থ্রেডের সংখ্যা দেখানো হয়
// (থ্রেড-লেভেলে unreadByCustomer ফ্ল্যাগ গণনা করে — চ্যাট উইজেটের ডট-ব্যাজের মতোই সোর্স)
async function loadNavUnreadCount() {
    try {
        if (!getCustomerToken() || typeof BACKEND_URL === 'undefined') return;
        const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads`);
        if (!res.ok) return;
        const threads = await res.json();
        const count = Array.isArray(threads) ? threads.filter(t => t.unreadByCustomer).length : 0;
        const badge = document.getElementById('stzNavUnreadBadge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = `(${count})`;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) { /* নন-ক্রিটিক্যাল — ব্যাজ না দেখালেও সমস্যা নেই */ }
}

// নাম/অ্যাভাটারে ক্লিক করলে Daraz-স্টাইল ফ্লোটিং মেনু খোলে/বন্ধ হয় (মোবাইলে হোভার নেই, তাই ক্লিকই ভরসা)।
// ডেস্কটপে হোভারও আগের মতো কাজ করে। বাইরে ক্লিক বা Esc চাপলে বন্ধ হয়।
let stzProfileMenuDocBound = false;
function bindProfileMenu(root) {
    const wrap = root.querySelector('.stz-profile-wrap');
    const trigger = root.querySelector('.stz-profile-trigger');
    if (!wrap || !trigger) return;
    trigger.addEventListener('click', function (e) {
        e.preventDefault();
        const open = !wrap.classList.contains('open');
        wrap.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (!stzProfileMenuDocBound) {
        stzProfileMenuDocBound = true;
        const closeAll = function () {
            document.querySelectorAll('.stz-profile-wrap.open').forEach(function (w) {
                w.classList.remove('open');
                const t = w.querySelector('.stz-profile-trigger');
                if (t) t.setAttribute('aria-expanded', 'false');
            });
        };
        document.addEventListener('click', function (e) { if (!e.target.closest('.stz-profile-wrap')) closeAll(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    }
}

// প্রতিটা পেজের নেভবারে #navAuthArea থাকলে সেটা লগইন স্টেট অনুযায়ী আপডেট করে —
// লগইন করা থাকলে হোভার করলে ড্রপডাউন (Sign Out, My Orders, Message Center, Payment),
// না থাকলে একটা Login আইকন বাটন → login.html
function renderNavAuth() {
    const el = document.getElementById('navAuthArea');
    if (!el) return;
    const customer = getCustomerData();
    const token = getCustomerToken();
    const base = getAuthBasePath();
    if (customer && token) {
        const firstName = (customer.name || '').trim().split(' ')[0] || 'অ্যাকাউন্ট';
        const initial = firstName.charAt(0).toUpperCase();
        el.innerHTML = `
            <div class="stz-profile-wrap">
                <a href="${base}account.html" class="stz-profile-trigger" aria-haspopup="true" aria-expanded="false">${firstName} <span class="stz-caret">&#9662;</span></a>
                <div class="stz-profile-dropdown">
                    <a href="${base}account.html" class="stz-profile-header">
                        <div class="stz-profile-avatar">${initial}</div>
                        <div class="stz-profile-welcome">স্বাগতম,<br><strong>${firstName}</strong></div>
                    </a>
                    <a href="javascript:void(0)" onclick="customerLogout()" class="stz-signout-link">Sign Out</a>
                    <div class="stz-dropdown-divider"></div>
                    <a href="${base}account.html#ordersSection" class="stz-dropdown-item">📦 My Orders</a>
                    <a href="${base}account.html#wishlistSection" class="stz-dropdown-item">❤️ Wishlist</a>
                    <a href="javascript:void(0)" onclick="stzOpenMessageCenter()" class="stz-dropdown-item">💬 Message Center <span id="stzNavUnreadBadge" class="stz-unread-badge" style="display:none;"></span></a>
                    <a href="${base}account.html#paymentSection" class="stz-dropdown-item">💳 Payment</a>
                </div>
            </div>
        `;
        loadNavUnreadCount();
        bindProfileMenu(el);
    } else {
        // আগে এখানে একটা glossy/3D "LOGIN" স্টক আইকন ছবি (images/login-icon.png) দেখানো হতো,
        // দেখতে দাগযুক্ত/পুরনো ধাঁচের লাগছিল। এখন একটা ক্লিন, মডার্ন pill-বাটন — ইউজার-আইকন +
        // "Login" টেক্সট, সাইটের accent কালার (#e74c3c) অনুযায়ী — বসানো হলো (ইমেজ ফাইলের বদলে
        // ইনলাইন SVG, তাই যেকোনো সাইজে ঝকঝকে দেখাবে)।
        el.innerHTML = `<a href="${base}login.html" class="stz-login-btn" title="লগইন করুন"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="stz-login-icon-svg" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Login</span></a>`;
    }
}

// ===== লগইন পপ-আপ (দারাজ-স্টাইল) + Google One Tap অটো লগইন =====
// • যেকোনো পেজে login.html-এর লিংকে ক্লিক করলে আলাদা পেজে না গিয়ে একই পেজের ওপর পপ-আপ খোলে
//   (login-popup.js/css দরকার হলে লোড হয়; না এলে আগের login.html পেজেই যায়)।
// • লগআউট অবস্থায় Google নিজে "Sign in as ..." বক্স দেখায়; আগে যে অ্যাকাউন্টে ঢোকা হয়েছে সেটা
//   Google-এর নিয়মে (১০ মিনিটে একবার, লগআউটের পর বন্ধ) নিজে থেকেও ঢুকিয়ে দিতে পারে।
const STZ_GOOGLE_CLIENT_ID = '558401107682-uh42vi22bqerhsn08j7obr6cq0n480r1.apps.googleusercontent.com';
const STZ_NO_AUTOSELECT_KEY = 'stzNoAutoSelect';

// এই পেজগুলোর নিজস্ব লগইন/রেজিস্টার ফর্ম আছে — এখানে পপ-আপ বা One Tap দরকার নেই
function stzOnAuthPage() {
    return /(^|\/)(login|register|forgot-password|reset-password)\.html$/.test(location.pathname);
}

function stzBackendUrl() { return (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : ''; }

// ---- পপ-আপের ফাইল লোড ----
let stzPopupAssetsPromise = null;
function stzLoadPopupAssets() {
    if (window.stzLoginPopup) return Promise.resolve();
    if (stzPopupAssetsPromise) return stzPopupAssetsPromise;
    const base = getAuthBasePath();
    const cssReady = new Promise(function (resolve) {
        if (document.querySelector('link[data-stzlp]')) return resolve();
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = base + 'login-popup.css'; l.setAttribute('data-stzlp', '1');
        l.onload = resolve; l.onerror = resolve; // CSS না এলেও JS চলুক; ফলব্যাক ওপেনের সময় ধরা পড়বে
        document.head.appendChild(l);
    });
    const jsReady = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = base + 'login-popup.js'; s.async = true;
        s.onload = function () { window.stzLoginPopup ? resolve() : reject(new Error('popup')); };
        s.onerror = function () { reject(new Error('popup load')); };
        document.head.appendChild(s);
    });
    stzPopupAssetsPromise = Promise.all([cssReady, jsReady]).then(function () { }).catch(function (e) {
        stzPopupAssetsPromise = null; throw e;
    });
    return stzPopupAssetsPromise;
}

// opts.redirect: লগইনের পর যাওয়ার পূর্ণ URL (না দিলে এই পেজেই থাকবে); opts.message: ওপরের ছোট কারণ-বার্তা
function stzOpenLogin(opts) {
    opts = opts || {};
    return stzLoadPopupAssets().then(function () {
        window.stzLoginPopup.open(opts);
    }).catch(function () {
        // পপ-আপ আনা যায়নি — আগের মতো আলাদা লগইন পেজ
        const here = (location.pathname.split('/').pop() || 'index.html') + location.search;
        location.href = opts.fallbackHref || (getAuthBasePath() + 'login.html?redirect=' + encodeURIComponent(here));
    });
}

// লগইন সফল হলে: নির্দিষ্ট redirect থাকলে ও সেটা অন্য পেজ হলে সেখানে, নইলে এই পেজই রিলোড (হেডার/কার্ট নতুন করে লোড হয়)
function stzAfterLogin(redirect) {
    const r = (redirect === undefined) ? window.__stzLoginRedirect : redirect;
    if (r) {
        try {
            const u = new URL(r, location.href);
            if (u.origin === location.origin && (u.pathname + u.search) !== (location.pathname + location.search)) {
                location.href = u.href;
                return;
            }
        } catch (e) { }
    }
    location.reload();
}

// ---- "Login" লিংকে ক্লিক ধরা ----
document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (stzOnAuthPage()) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin || !/(^|\/)login\.html$/.test(url.pathname)) return;
    e.preventDefault();
    const r = url.searchParams.get('redirect');
    let redirect = null;
    if (r) { try { redirect = new URL(r, url).href; } catch (err) { redirect = null; } }
    stzOpenLogin({ redirect: redirect, fallbackHref: url.href });
}, true);

// ---- Google লাইব্রেরি (পপ-আপের বাটন ও One Tap দুটোই এটা ব্যবহার করে) ----
let stzGsiPromise = null;
function stzLoadGsi() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (stzGsiPromise) return stzGsiPromise;
    stzGsiPromise = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        s.onload = function () { resolve(); };
        s.onerror = function () { stzGsiPromise = null; reject(new Error('gsi')); };
        document.head.appendChild(s);
    });
    return stzGsiPromise;
}

let stzGoogleInited = false;
function stzInitGoogle() {
    if (stzGoogleInited || !(window.google && google.accounts && google.accounts.id)) return;
    google.accounts.id.initialize({
        client_id: STZ_GOOGLE_CLIENT_ID,
        callback: stzHandleGoogleCredential,
        auto_select: true,
        cancel_on_tap_outside: false
    });
    stzGoogleInited = true;
    // আগের পেজে লগআউট করা হয়ে থাকলে অটো সাইন-ইন বন্ধ রাখা (লগআউটের সময় Google লাইব্রেরি লোড ছিল না)
    try {
        if (localStorage.getItem(STZ_NO_AUTOSELECT_KEY)) {
            google.accounts.id.disableAutoSelect();
            localStorage.removeItem(STZ_NO_AUTOSELECT_KEY);
        }
    } catch (e) { }
}

// Google-এর ফল (ID টোকেন) ব্যাকএন্ডে পাঠিয়ে লগইন/অ্যাকাউন্ট তৈরি — পপ-আপের বাটন ও One Tap দুটোর কলব্যাক এটাই
async function stzHandleGoogleCredential(response) {
    const pop = window.stzLoginPopup;
    const popupOpen = !!(pop && pop.isOpen());
    if (popupOpen) pop.setBusy(true);
    try {
        const res = await fetch(stzBackendUrl() + '/api/customer-auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential, device: window.STZ_DEVICE || {} })
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Google লগইন ব্যর্থ হয়েছে।');
        setCustomerSession(data.token, data.customer);
        if (popupOpen) pop.showMessage('লগইন হয়েছে। একটু অপেক্ষা করুন...', 'ok');
        stzAfterLogin(popupOpen ? undefined : null);
    } catch (err) {
        const text = (err instanceof TypeError) ? 'সংযোগে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করুন।' : err.message;
        if (popupOpen) pop.showMessage('❌ ' + text);
        else if (response && response.select_by !== 'auto') stzOpenLogin({ message: '❌ ' + text });
    }
}

// ---- One Tap: লগআউট অবস্থায় Google-এর "Sign in" বক্স ----
function stzStartOneTap() {
    if (getCustomerToken() || stzOnAuthPage() || window.top !== window.self) return;
    stzLoadGsi().then(function () {
        stzInitGoogle();
        try { google.accounts.id.prompt(); } catch (e) { }
    }).catch(function () { });
}

function stzSetupGuestExtras() {
    if (getCustomerToken() && getCustomerData()) return;
    if (stzOnAuthPage()) return;
    // পেজ দেখানোর গতি না কমানোর জন্য পুরো লোডের একটু পরে
    const go = function () {
        setTimeout(function () {
            stzLoadPopupAssets().catch(function () { });
            stzStartOneTap();
        }, 1200);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
}

document.addEventListener('DOMContentLoaded', function () {
    renderNavAuth();
    stzSetupGuestExtras();
});
