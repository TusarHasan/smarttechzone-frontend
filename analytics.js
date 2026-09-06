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
