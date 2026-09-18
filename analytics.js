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
