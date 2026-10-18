// ===== হোলসেল জোনের প্রচার: সবার উপরে সংবাদের শিরোনামের মতো ডান থেকে বামে চলা লেখা =====
// footer.js সব কাস্টমার-facing পেজে লোড হয়, তাই এই একটা জায়গা থেকেই পুরো সাইটে বসে। এখানে কোনো দাম বা সংখ্যা ইচ্ছা করে নেই,
// দাম ও ক্যাটালগ শুধু /wholesale/ জোনের ভেতরে, ভেরিফাইড মেম্বারদের জন্য। ক্লিক করলে /wholesale/ খোলে (সেখানকার পেজ নিজেই
// দেখায় সাইন ইন, আবেদন, রিভিউ চলছে, নাকি মেম্বার)। রিডাইরেক্ট/পেমেন্টের পেজে (চেকআউট, অর্ডার সফল/ব্যর্থ) আর /wholesale/ পেজে দেখানো হয় না।
// লিংকে rel="nofollow" দেওয়া আছে আর লেখাটা JS দিয়ে বসে, তাই সার্চ ইঞ্জিনের কাছে পেজের কনটেন্টে কিছু যোগ হয় না।
// লেখা বদলাতে চাইলে নিচের WS_TICKER_MESSAGES বদলান।
(function () {
    try {
        var path = location.pathname.toLowerCase();
        if (/^\/wholesale(\/|$)/.test(path) || /\/(checkout|order-success|order-failed)(\.html)?$/.test(path)) return;
        if (window.self !== window.top || document.getElementById('stzWsTicker')) return;

        var WS_TICKER_MESSAGES = [
            'দোকানদার ও বাল্ক ক্রেতাদের জন্য ভেরিফাইড হোলসেল জোন চালু হয়েছে',
            'হোলসেল দাম শুধু ভেরিফাইড সদস্যদের জন্য',
            'ট্রেড লাইসেন্স ও NID দিয়ে ভেরিফাই হয়ে আজই আবেদন করুন',
            'ডকুমেন্ট ভেরিফিকেশন ছাড়া হোলসেল জোনে প্রবেশ করা যাবে না'
        ];

        var css = document.createElement('style');
        css.textContent =
            '.stz-ws-ticker{display:flex;align-items:center;background:#1f2937;color:#fff;text-decoration:none;font-family:"Segoe UI","Noto Sans Bengali","Hind Siliguri",Arial,sans-serif;font-size:13.5px;line-height:1;height:36px;overflow:hidden;position:sticky;top:0;z-index:101}' +
            '.stz-ws-ticker:hover,.stz-ws-ticker:focus-visible{background:#111827}' +
            '.stz-ws-badge{flex:none;background:#e74c3c;color:#fff;font-weight:700;letter-spacing:.3px;padding:0 14px;height:100%;display:flex;align-items:center;position:relative;z-index:2;box-shadow:6px 0 8px -4px rgba(0,0,0,.35)}' +
            '.stz-ws-view{flex:1;overflow:hidden;height:100%;display:flex;align-items:center;min-width:0}' +
            '.stz-ws-track{display:inline-flex;white-space:nowrap;will-change:transform;animation:stzWsScroll var(--stz-ws-dur,60s) linear infinite}' +
            '.stz-ws-ticker:hover .stz-ws-track{animation-play-state:paused}' +
            '.stz-ws-item{display:inline-flex;align-items:center;padding:0 22px}' +
            '.stz-ws-item::after{content:"";width:5px;height:5px;border-radius:50%;background:#e74c3c;margin-left:44px;flex:none}' +
            '.stz-ws-cta{flex:none;margin:0 12px 0 8px;padding:5px 12px;border:1px solid #6b7280;border-radius:999px;font-size:12px;font-weight:700;position:relative;z-index:2;background:#1f2937}' +
            '.stz-ws-ticker:hover .stz-ws-cta{border-color:#e74c3c;color:#fff}' +
            '@keyframes stzWsScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
            '.navbar{top:36px!important}' +
            '@media (max-width:640px){.navbar{top:34px!important}.stz-ws-ticker{font-size:12.5px;height:34px}.stz-ws-badge{padding:0 10px}.stz-ws-cta{display:none}}' +
            '@media (prefers-reduced-motion:reduce){.stz-ws-track{animation:none}.stz-ws-view{overflow:hidden}.stz-ws-item+.stz-ws-item,.stz-ws-track .stz-ws-dup{display:none}.stz-ws-item::after{display:none}}';
        document.head.appendChild(css);

        var a = document.createElement('a');
        a.id = 'stzWsTicker';
        a.className = 'stz-ws-ticker';
        a.href = '/wholesale/';
        a.rel = 'nofollow';
        a.setAttribute('aria-label', 'হোলসেল জোন: ' + WS_TICKER_MESSAGES[0]);

        var badge = document.createElement('span');
        badge.className = 'stz-ws-badge';
        badge.textContent = 'হোলসেল';
        var view = document.createElement('span');
        view.className = 'stz-ws-view';
        var track = document.createElement('span');
        track.className = 'stz-ws-track';
        track.setAttribute('aria-hidden', 'true');
        // একই লেখা দুবার বসানো, যাতে -50% পর্যন্ত গিয়ে লুপ হলে কোনো ফাঁক না দেখা যায়
        for (var round = 0; round < 2; round++) {
            WS_TICKER_MESSAGES.forEach(function (m) {
                var it = document.createElement('span');
                it.className = 'stz-ws-item' + (round ? ' stz-ws-dup' : '');
                it.textContent = m;
                track.appendChild(it);
            });
        }
        view.appendChild(track);
        var cta = document.createElement('span');
        cta.className = 'stz-ws-cta';
        cta.textContent = 'বিস্তারিত দেখুন';
        a.appendChild(badge); a.appendChild(view); a.appendChild(cta);

        // সবার আগে, নেভবারের উপরে। বারটা sticky, তাই স্ক্রল করলেও সবার উপরে থেকে যায়, আর নেভবার (top: বারের উচ্চতা) ঠিক এর নিচে আটকে থাকে
        document.body.insertBefore(a, document.body.firstChild);

        // গতি স্থির রাখা: লেখা যত লম্বা, সময় তত বেশি (প্রায় ৫০ পিক্সেল/সেকেন্ড)
        var w = track.scrollWidth / 2;
        if (w > 0) track.style.setProperty('--stz-ws-dur', Math.max(25, Math.round(w / 50)) + 's');
    } catch (e) { /* প্রচারের লেখা কোনোভাবেই পেজের বাকি কাজ আটকাবে না */ }
})();

// এই ফাইলটা সব কাস্টমার-facing পেজে (product.html, index.html, brand/model পেজ ইত্যাদি) একবার করে
// <script src="footer.js"></script> দিয়ে যোগ করলেই footer টা স্বয়ংক্রিয়ভাবে বসে যাবে।
// পেজে অবশ্যই <div id="siteFooter"></div> থাকতে হবে যেখানে footer টা বসবে।

(function () {
    const footerHtml = `
    <style>
        .site-footer { background: #fff; color: #333; font-family: Arial, sans-serif; margin-top: 40px; }
        .site-footer-top { background: #f5f5f5; padding: 36px 20px; border-top: 1px solid #eee; }
        .site-footer-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 30px; }
        .site-footer-col { flex: 1; min-width: 180px; }
        .site-footer-col h4 { color: #333; font-size: 14px; margin: 0 0 14px; font-weight: bold; }
        .site-footer-col p { font-size: 13px; line-height: 1.7; color: #777; margin: 0 0 12px; }
        .site-footer-col ul { list-style: none; padding: 0; margin: 0; }
        .site-footer-col ul li { margin-bottom: 10px; font-size: 13px; }
        .site-footer-col ul li a { color: #666; text-decoration: none; }
        .site-footer-col ul li a:hover { color: #e74c3c; text-decoration: underline; }

        .site-footer-social { display: flex; gap: 10px; margin-top: 12px; }
        .site-footer-social a {
            width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 1px solid #ddd; display: flex;
            align-items: center; justify-content: center; color: #666; text-decoration: none; font-size: 13px;
        }
        .site-footer-social a:hover { border-color: #e74c3c; color: #e74c3c; }

        .site-footer-payment { background: #fff; padding: 30px 20px; border-top: 1px solid #eee; }
        .site-footer-payment-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 40px; }
        .payment-block h4 { font-size: 13px; color: #333; margin: 0 0 12px; font-weight: bold; }
        .payment-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .payment-badge {
            border: 1px solid #ddd; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: bold;
            color: #555; background: #fafafa;
        }

        .site-footer-bottom { text-align: center; padding: 16px 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }

        .site-footer-verified { background: #f0faf4; border-top: 1px solid #d8f0e0; padding: 12px 20px; }
        .site-footer-verified-inner {
            max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 8px;
            font-size: 12.5px; color: #2a7a4a; flex-wrap: wrap;
        }
        .site-footer-verified-inner i { color: #2a9d5c; font-size: 14px; flex-shrink: 0; }
    </style>

    <footer class="site-footer">
        <div class="site-footer-top">
            <div class="site-footer-inner">
                <div class="site-footer-col">
                    <h4>Customer Care</h4>
                    <ul>
                        <li><a href="/help-center.html">Help Center</a></li>
                        <li><a href="/how-to-order.html">How to Order</a></li>
                        <li><a href="/returns-refunds.html">Returns &amp; Refunds</a></li>
                        <li><a href="tel:+8801718381066">Contact Us</a></li>
                        <li><a href="/terms-of-service.html">Terms &amp; Conditions</a></li>
                    </ul>
                </div>
                <div class="site-footer-col">
                    <img src="/images/logo.png" alt="Smart Tech Zone" style="height:34px; width:auto; display:block; margin-bottom:10px;">
                    <ul>
                        <li><a href="/index.html">Home</a></li>
                        <li><a href="/index.html#brands">Shop by Brand</a></li>
                        <li><a href="/about.html">About Us</a></li>
                        <li><a href="/why-choose-us.html">Why Choose Us</a></li>
                        <li><a href="/track.html">Track Order</a></li>
                    </ul>
                </div>
                <div class="site-footer-col">
                    <h4>Contact</h4>
                    <p>Ataur Rahman Villa, House 49, Road 13, Mohammadpur, Dhaka-1207</p>
                    <p><a href="tel:+8801718381066">01718381066</a><br><a href="mailto:mahmud88789@gmail.com">mahmud88789@gmail.com</a></p>
                </div>
                <div class="site-footer-col">
                    <h4>Follow Us</h4>
                    <div class="site-footer-social">
                        <a href="https://www.facebook.com/smarttechzonedhaka" target="_blank" title="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                        <a href="https://wa.me/8801718381066" target="_blank" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                        <a href="https://www.youtube.com/@SmartTechZoneDhaka" target="_blank" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
                        <!-- Instagram/TikTok প্রোফাইলের URL এখনো পাওয়া যায়নি, তাই এখানে যোগ করা হয়নি —
                             পেলে এখানে একইভাবে <a><i class="fa-brands fa-instagram/fa-tiktok"></i></a> যোগ করা যাবে -->
                    </div>
                </div>
            </div>
        </div>

        <div class="site-footer-verified">
            <div class="site-footer-verified-inner">
                <i class="fa-solid fa-circle-check"></i>
                <span>Verified Business — Smart Tech Zone, Trade License No. TRAD/DNCC/030240/2025, Approved by Dhaka North City Corporation</span>
            </div>
        </div>

        <div class="site-footer-payment">
            <div class="site-footer-payment-inner">
                <div class="payment-block">
                    <h4>Payment Methods</h4>
                    <div class="payment-badges">
                        <span class="payment-badge">Cash on Delivery</span>
                        <span class="payment-badge">bKash</span>
                        <span class="payment-badge">Nagad</span>
                        <span class="payment-badge">Rocket</span>
                        <span class="payment-badge">Card</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="site-footer-bottom">
            &copy; 2026 Smart Tech Zone. All rights reserved.
        </div>
    </footer>
    `;

    // পুরো সাইটের সব পেজেই footer.js এক জায়গা থেকে লোড হয়, কিন্তু Font Awesome আইকন CDN
    // এখন পর্যন্ত শুধু index.html এ যোগ করা ছিল — footer.js নিজে থেকেই CDN লিংক ইনজেক্ট করে
    // দেয় (যদি আগে থেকে না থাকে) যাতে সব পেজেই Follow Us আইকন ঠিকভাবে দেখা যায়
    function ensureFontAwesome() {
        if (document.querySelector('link[data-stz-fa]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
        link.setAttribute('data-stz-fa', '1');
        document.head.appendChild(link);
    }

    // গ্লোবাল "অর্ডার ট্র্যাক" ফ্লোটিং উইজেট — footer.js যেখানে আছে সেখানেই (track-widget.js একই ফোল্ডারে)
    (function loadTrackWidget() {
        const self = document.currentScript || document.querySelector('script[src$="footer.js"]');
        if (!self || !self.src) return;
        const s = document.createElement('script');
        s.src = self.src.replace(/footer\.js.*$/, 'track-widget.js');
        s.defer = true;
        document.head.appendChild(s);
    })();

    document.addEventListener('DOMContentLoaded', function () {
        ensureFontAwesome();
        const target = document.getElementById('siteFooter');
        if (target) {
            target.innerHTML = footerHtml;
        }
    });
})();