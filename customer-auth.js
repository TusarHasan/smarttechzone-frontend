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
    window.location.href = 'index.html';
}

// অথেনটিকেটেড API কল — টোকেন থাকলে Authorization হেডারে যোগ হয়
async function customerAuthFetch(url, options = {}) {
    const token = getCustomerToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, Object.assign({}, options, { headers }));
}

// প্রতিটা পেজের নেভবারে #navAuthArea থাকলে সেটা লগইন স্টেট অনুযায়ী আপডেট করে —
// লগইন করা থাকলে নাম দেখিয়ে account.html-এ লিংক, না থাকলে Login → login.html
function renderNavAuth() {
    const el = document.getElementById('navAuthArea');
    if (!el) return;
    const customer = getCustomerData();
    const token = getCustomerToken();
    if (customer && token) {
        const firstName = (customer.name || '').trim().split(' ')[0] || 'অ্যাকাউন্ট';
        el.innerHTML = `<a href="account.html">${firstName}</a>`;
    } else {
        el.innerHTML = `<a href="login.html">Login</a>`;
    }
}

document.addEventListener('DOMContentLoaded', renderNavAuth);
