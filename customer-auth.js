// ===== কাস্টমার লগইন সেশন — সব পেজে (নেভবার Login/অ্যাকাউন্ট লিংক দেখানো সহ) শেয়ার করা হয় =====
const CUSTOMER_TOKEN_KEY = 'customerToken';
const CUSTOMER_DATA_KEY = 'customerData';

function getCustomerToken() {
    try { return localStorage.getItem(CUSTOMER_TOKEN_KEY); } catch (e) { return null; }
}

function getCustomerData() {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_DATA_KEY) || 'null'); } catch (e) { return null; }
}

function setCustomerSession(token, customer) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(customer));
}

function customerLogout() {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_DATA_KEY);
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
                <a href="${base}account.html" class="stz-profile-trigger">${firstName} <span class="stz-caret">&#9662;</span></a>
                <div class="stz-profile-dropdown">
                    <div class="stz-profile-header">
                        <div class="stz-profile-avatar">${initial}</div>
                        <div class="stz-profile-welcome">স্বাগতম,<br><strong>${firstName}</strong></div>
                    </div>
                    <a href="javascript:void(0)" onclick="customerLogout()" class="stz-signout-link">Sign Out</a>
                    <div class="stz-dropdown-divider"></div>
                    <a href="${base}account.html" class="stz-dropdown-item">📦 My Orders</a>
                    <a href="javascript:void(0)" onclick="stzOpenMessageCenter()" class="stz-dropdown-item">💬 Message Center <span id="stzNavUnreadBadge" class="stz-unread-badge" style="display:none;"></span></a>
                    <a href="${base}account.html#paymentSection" class="stz-dropdown-item">💳 Payment</a>
                </div>
            </div>
        `;
        loadNavUnreadCount();
    } else {
        el.innerHTML = `<a href="${base}login.html" class="stz-login-icon-link" title="লগইন করুন"><img src="${base}images/login-icon.png" alt="Login" class="stz-login-icon"></a>`;
    }
}

document.addEventListener('DOMContentLoaded', renderNavAuth);
