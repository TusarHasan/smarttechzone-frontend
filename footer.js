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
    </style>

    <footer class="site-footer">
        <div class="site-footer-top">
            <div class="site-footer-inner">
                <div class="site-footer-col">
                    <h4>Customer Care</h4>
                    <ul>
                        <li><a href="#">Help Center</a></li>
                        <li><a href="#">How to Order</a></li>
                        <li><a href="#">Returns &amp; Refunds</a></li>
                        <li><a href="tel:+8801718381066">Contact Us</a></li>
                        <li><a href="#">Terms &amp; Conditions</a></li>
                    </ul>
                </div>
                <div class="site-footer-col">
                    <img src="/images/logo.png" alt="Smart Tech Zone" style="height:34px; width:auto; display:block; margin-bottom:10px;">
                    <ul>
                        <li><a href="/index.html">Home</a></li>
                        <li><a href="/index.html#brands">Shop by Brand</a></li>
                        <li><a href="#">About Us</a></li>
                        <li><a href="#">Track Order</a></li>
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
                        <a href="https://www.facebook.com/smarttechzonedhaka" target="_blank" title="Facebook">f</a>
                        <a href="https://wa.me/8801718381066" target="_blank" title="WhatsApp">w</a>
                        <a href="https://www.youtube.com/@SmartTechZoneDhaka" target="_blank" title="YouTube">y</a>
                    </div>
                </div>
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

    document.addEventListener('DOMContentLoaded', function () {
        const target = document.getElementById('siteFooter');
        if (target) {
            target.innerHTML = footerHtml;
        }
    });
})();