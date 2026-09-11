// ============================================================
// SmartTechZone শপিং কার্ট — localStorage ভিত্তিক
// সব পেজে config.js এর পরে এই ফাইলটা include করতে হবে
// ============================================================

const CART_KEY = 'stz_cart';

function getCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

// item: { productId, name, price, variantLabel, image, quantity, maxStock }
function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(c => c.productId === item.productId && c.variantLabel === item.variantLabel);

    if (existing) {
        existing.quantity += item.quantity;
    } else {
        cart.push(item);
    }
    saveCart(cart);
    return cart;
}

function removeFromCart(productId, variantLabel) {
    let cart = getCart();
    cart = cart.filter(c => !(c.productId === productId && c.variantLabel === variantLabel));
    saveCart(cart);
    return cart;
}

function updateCartQty(productId, variantLabel, quantity) {
    const cart = getCart();
    const item = cart.find(c => c.productId === productId && c.variantLabel === variantLabel);
    if (item) {
        item.quantity = Math.max(1, quantity);
    }
    saveCart(cart);
    return cart;
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = getCartCount();
}

// ===== "Add to Cart" ভিজ্যুয়াল অ্যানিমেশন — alert() পপ-আপের বদলে প্রোডাক্টের ছবি+নাম
// উড়ে গিয়ে কার্ট আইকনে যুক্ত হওয়ার Daraz-স্টাইল ইফেক্ট =====
function injectFlyToCartStyles() {
    if (document.getElementById('stzFlyToCartStyles')) return;
    const style = document.createElement('style');
    style.id = 'stzFlyToCartStyles';
    style.textContent = `
        .stz-fly-card {
            position: fixed; z-index: 99999; display: flex; align-items: center; gap: 8px;
            background: #fff; border-radius: 22px; padding: 6px 14px 6px 6px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.22); pointer-events: none;
            font: 600 12.5px Arial, sans-serif; color: #333;
            transition: transform .75s cubic-bezier(.32,.64,.3,1), opacity .75s ease .05s;
            will-change: transform, opacity;
        }
        .stz-fly-card img { width: 30px; height: 30px; object-fit: cover; border-radius: 8px; flex-shrink: 0; display: block; }
        .stz-fly-card span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
        @keyframes stzCartBump {
            0% { transform: scale(1); }
            35% { transform: scale(1.35); }
            65% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }
        .nav-icons a.stz-cart-bump { display: inline-block; animation: stzCartBump .4s ease; }
    `;
    document.head.appendChild(style);
}

// sourceEl: যে এলিমেন্ট (যেমন প্রোডাক্টের ছবি) থেকে অ্যানিমেশনটা উড়া শুরু করবে —
// না পেলে অ্যানিমেশন স্কিপ হয়ে যায়, কিন্তু কার্টে যোগ হওয়াটা এর উপর নির্ভর করে না
function flyToCart(imageUrl, title, sourceEl) {
    try {
        const cartIcon = document.querySelector('.nav-icons a[href="cart.html"]');
        if (!cartIcon || !sourceEl) return;
        injectFlyToCartStyles();

        const startRect = sourceEl.getBoundingClientRect();
        if (startRect.width === 0 && startRect.height === 0) return; // এলিমেন্টটা দৃশ্যমান নয়

        const card = document.createElement('div');
        card.className = 'stz-fly-card';
        card.style.left = startRect.left + 'px';
        card.style.top = (startRect.top + startRect.height / 2 - 21) + 'px';
        card.innerHTML = `${imageUrl ? `<img src="${imageUrl}" onerror="this.remove()">` : ''}<span>${(title || 'প্রোডাক্ট').slice(0, 30)}</span>`;
        document.body.appendChild(card);

        const cardRect = card.getBoundingClientRect();
        const endRect = cartIcon.getBoundingClientRect();
        const dx = (endRect.left + endRect.width / 2) - (cardRect.left + cardRect.width / 2);
        const dy = (endRect.top + endRect.height / 2) - (cardRect.top + cardRect.height / 2);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.style.transform = `translate(${dx}px, ${dy}px) scale(0.12)`;
                card.style.opacity = '0.15';
            });
        });

        setTimeout(() => {
            card.remove();
            cartIcon.classList.add('stz-cart-bump');
            setTimeout(() => cartIcon.classList.remove('stz-cart-bump'), 400);
        }, 780);
    } catch (e) { /* এটা শুধু ভিজ্যুয়াল ইফেক্ট — সমস্যা হলেও কার্ট ঠিকই কাজ করবে */ }
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
