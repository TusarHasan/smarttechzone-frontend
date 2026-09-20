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

    document.addEventListener('DOMContentLoaded', function () {
        ensureFontAwesome();
        const target = document.getElementById('siteFooter');
        if (target) {
            target.innerHTML = footerHtml;
        }
    });
})();