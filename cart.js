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

document.addEventListener('DOMContentLoaded', updateCartBadge);
