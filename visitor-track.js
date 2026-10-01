// প্রতিটা পেজ-ভিউ ব্যাকএন্ডে পাঠায় — অ্যাডমিন প্যানেলের Visitor Log ও রিয়েল-টাইম "এখন কে আছে"
// উইজেটের জন্য ডেটার উৎস (দেখুন backend/routes/track.js)। এটা Google Analytics/Clarity-এর
// (analytics.js) পরিপূরক, প্রতিস্থাপন না — ওগুলো অ্যাগ্রিগেট ট্রেন্ডের জন্য, এটা অ্যাডমিনের নিজের
// ডাটাবেজে বিস্তারিত (IP/লোকেশন/ডিভাইস) লগ রাখার জন্য। config.js-এর (BACKEND_URL) পরে লোড
// হতে হবে — তাই সব পেজে config.js-এর ঠিক পরে বসানো হয়েছে।
(function () {
    try {
        // প্রতিটা ব্রাউজার ট্যাব/সেশনে একই আইডি থাকে (ট্যাব বন্ধ করলে sessionStorage মুছে যায়,
        // তাই নতুন সেশন = নতুন আইডি) — একই ভিজিটরের একাধিক পেজ-ভিউ একসাথে গ্রুপ করার জন্য
        var sessionId = sessionStorage.getItem('stz_visit_sid');
        if (!sessionId) {
            sessionId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem('stz_visit_sid', sessionId);
        }

        var payload = JSON.stringify({
            sessionId: sessionId,
            path: location.pathname,
            referrer: document.referrer || ''
        });

        var url = (typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '') + '/api/track/pageview';

        // sendBeacon ব্যবহার করা হচ্ছে যেখানে সাপোর্ট আছে — পেজ থেকে নেভিগেট করে চলে গেলেও
        // নির্ভরযোগ্যভাবে পাঠায়, fetch-এর চেয়ে এই কাজের জন্য ভালো
        if (navigator.sendBeacon) {
            var blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else {
            fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
        }
    } catch (e) { /* ট্র্যাকিং ব্যর্থ হলেও পেজের বাকি কাজ যেন কখনো আটকে না যায় */ }
})();
