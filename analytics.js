// Google Analytics (GA4) ট্র্যাকিং কোড — SmartTechZone.com.bd
// সব পেজে <head>-এর ঠিক পরে <script src="analytics.js"></script> (বা সাব-ফোল্ডারে "../analytics.js") হিসেবে লোড করা হয়
(function () {
    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-GHMHK6V5SN';
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-GHMHK6V5SN');
})();

// Microsoft Clarity — ভিজিটর কোথায় ক্লিক করছে (heatmap) এবং তাদের সেশন কেমন ছিল (রেকর্ডিং,
// ভিডিওর মতো দেখা যায়) তা ট্র্যাক করার জন্য। Project: Smart Tech Zone (Project ID: ykax67effp)
(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "ykax67effp");

// Meta (Facebook) Pixel — বেস কোড, সব পেজে PageView স্বয়ংক্রিয়ভাবে ট্র্যাক করে। Dataset/Pixel ID:
// Events Manager-এ "Smart Tech Zone Event Data" (390654674084858)। ViewContent/AddToCart/
// InitiateCheckout/Purchase-এর মতো নির্দিষ্ট ইভেন্টগুলো এখানে না, বরং প্রাসঙ্গিক পেজে (product.html,
// cart.js, checkout.html, order-success.html) আলাদাভাবে fbq('track', ...) কল করে পাঠানো হয় — কারণ
// সেগুলোর জন্য প্রোডাক্ট/অর্ডারের আসল ডাটা (দাম, আইডি) দরকার যা এই সাইটওয়াইড ফাইলে থাকে না।
!function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
}(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
window.fbq('init', '390654674084858');
window.fbq('track', 'PageView');
