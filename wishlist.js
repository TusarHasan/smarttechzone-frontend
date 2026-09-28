// ===== উইশলিস্ট (❤️/🤍 হার্ট বাটন) — শুধু লগইন করা কাস্টমারদের জন্য কাজ করে, গেস্ট উইশলিস্ট নেই।
// প্রোডাক্ট কার্ড (index.html/search.html/brands/brand.html/models/model.html) ও প্রোডাক্ট
// ডিটেইল পেজে (product.html) হার্ট বাটন বসানোর জন্য শেয়ার্ড ফাইল — customer-auth.js/footer.js
// এর মতোই প্রতিটা পেজে <script src="wishlist.js"></script> দিয়ে যোগ করতে হবে, তবে অবশ্যই
// config.js ও customer-auth.js এর পরে (BACKEND_URL/customerAuthFetch/getCustomerToken দরকার)।
// account.html এর নিজস্ব "আমার উইশলিস্ট" সেকশন এই ফাইল ব্যবহার করে না — ওখানে শুধু তালিকা +
// রিমুভ বাটন লাগে বলে সরাসরি account.html এর নিজের কোডেই লেখা হয়েছে।

const stzWishlistIds = new Set();

async function stzLoadWishlistIds() {
    if (!getCustomerToken()) return;
    try {
        const res = await customerAuthFetch(`${BACKEND_URL}/api/customer-auth/wishlist`);
        if (!res.ok) return;
        const data = await res.json();
        stzWishlistIds.clear();
        (data || []).forEach(p => stzWishlistIds.add(String(p.id)));
        stzRefreshWishlistButtons();
    } catch (e) { /* নন-ক্রিটিক্যাল — হার্ট আইকন ফাঁকা (🤍) অবস্থাতেই থেকে যাবে */ }
}

function stzIsWishlisted(productId) {
    return stzWishlistIds.has(String(productId));
}

// একটা হার্ট/উইশলিস্ট বাটনকে active/inactive অবস্থা অনুযায়ী দেখায় — ছোট ওভারলে বাটন হলে শুধু
// ইমোজি বদলায়, product.html এর বড় বাটনে data-label-on/off অ্যাট্রিবিউট দেওয়া থাকলে সেটার
// লেবেলসহ টেক্সট বসায়
function stzApplyWishlistBtnState(btn, active) {
    btn.classList.toggle('active', active);
    const onLabel = btn.getAttribute('data-label-on');
    const offLabel = btn.getAttribute('data-label-off');
    if (onLabel || offLabel) {
        btn.innerHTML = active ? (onLabel || '❤️') : (offLabel || '🤍');
    } else {
        btn.textContent = active ? '❤️' : '🤍';
    }
}

// পেজে ইতিমধ্যে রেন্ডার হওয়া সব হার্ট/উইশলিস্ট বাটন (data-wishlist-id অ্যাট্রিবিউটসহ) সঠিক
// অবস্থায় আপডেট করে — প্রোডাক্ট কার্ড সাধারণত উইশলিস্ট ডেটা লোড হওয়ার আগেই রেন্ডার হয়ে যায়,
// তাই ডেটা আসার পর এই ফাংশনটা আবার সবগুলো বাটনকে ঠিক অবস্থায় বসিয়ে দেয়
function stzRefreshWishlistButtons() {
    document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
        const id = btn.getAttribute('data-wishlist-id');
        if (!id) return;
        stzApplyWishlistBtnState(btn, stzIsWishlisted(id));
    });
}

// কার্ডের ওপর বসানোর ছোট ওভারলে হার্ট বাটনের HTML — index/search/brand/model পেজের রেন্ডার
// ফাংশনগুলোতে প্রোডাক্ট কার্ডের innerHTML এর ভেতরে সরাসরি বসানো যায়
function stzWishlistHeartHtml(productId) {
    const active = stzIsWishlisted(productId);
    return `<button type="button" class="wishlist-heart-btn${active ? ' active' : ''}" data-wishlist-id="${productId}" title="উইশলিস্টে যোগ/বাদ দিন" onclick="event.stopPropagation(); stzToggleWishlist('${productId}', this)">${active ? '❤️' : '🤍'}</button>`;
}

// প্রকৃত API কল — শুধু সার্ভারে পাঠায় ও stzWishlistIds সেট আপডেট করে, DOM ছোঁয় না (সফল হলে true)
async function stzSetWishlisted(productId, shouldAdd) {
    try {
        const res = await customerAuthFetch(
            `${BACKEND_URL}/api/customer-auth/wishlist${shouldAdd ? '' : '/' + productId}`,
            { method: shouldAdd ? 'POST' : 'DELETE', body: shouldAdd ? JSON.stringify({ productId }) : undefined }
        );
        if (!res.ok) return false;
        if (shouldAdd) stzWishlistIds.add(String(productId)); else stzWishlistIds.delete(String(productId));
        return true;
    } catch (e) { return false; }
}

// হার্ট/উইশলিস্ট বাটনে ক্লিক করলে কল হয় — লগইন না থাকলে লগইন পেজে পাঠায়, লগইন থাকলে অপ্টিমিস্টিক
// UI আপডেট করে সার্ভারে পাঠায়, ব্যর্থ হলে আগের অবস্থায় ফিরিয়ে দেয়
async function stzToggleWishlist(productId, btnEl) {
    if (!getCustomerToken()) {
        if (confirm('উইশলিস্টে যোগ করতে আগে লগইন করতে হবে। এখন লগইন পেজে যেতে চান?')) {
            const base = (typeof getAuthBasePath === 'function') ? getAuthBasePath() : '';
            window.location.href = `${base}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return;
    }
    const wasActive = stzIsWishlisted(productId);
    if (btnEl) stzApplyWishlistBtnState(btnEl, !wasActive);
    const ok = await stzSetWishlisted(productId, !wasActive);
    if (!ok && btnEl) stzApplyWishlistBtnState(btnEl, wasActive);
}

document.addEventListener('DOMContentLoaded', stzLoadWishlistIds);
