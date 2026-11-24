// ===== Daraz-স্টাইল প্রোডাক্ট কার্ড (হোমপেজ, সার্চ, শপ পেজ — তিন জায়গায় একই কার্ড) =====
// দারাজের সার্চ পেজের কার্ড মেপে বানানো: বড় বর্গাকার ছবি, নামের ২ লাইন, কমলা দাম, "N% Off", তারপর
// "N sold | ★★★★★ (রিভিউ সংখ্যা)"। স্টাইল style.css-এর .dzc রুলে। কার্ডের ভেতরের HTML এখান থেকেই আসে, যাতে
// তিন পেজে আলাদা আলাদা কোড রাখতে না হয়।
// opts: img (ছবির URL), nameHtml (হাইলাইটসহ নাম, ইতিমধ্যে escape করা), price/old (ফ্ল্যাশ দামের জন্য),
//       vendor (ডান পাশের ছোট লেখা), extraHtml (কার্ডের নিচের বাটন ইত্যাদি)
(function () {
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fmtSold(n) {
        n = Number(n) || 0;
        if (n <= 0) return '';
        if (n >= 1000) return (Math.floor(n / 100) / 10) + 'K+ sold';
        return n + ' sold';
    }
    // তারা: নিচে ধূসর ৫টা, উপরে সোনালি ৫টা — গড় রেটিং অনুযায়ী width কেটে আংশিক ভরাট
    function stars(avg) {
        var pct = Math.max(0, Math.min(100, (Number(avg) || 0) / 5 * 100));
        return '<span class="dzc-stars" aria-label="' + Number(avg || 0).toFixed(1) + ' out of 5"><span class="dzc-stars-fill" style="width:' + pct + '%">★★★★★</span>★★★★★</span>';
    }
    window.stzFmtSold = fmtSold;
    window.stzCardHtml = function (p, opts) {
        opts = opts || {};
        var price = opts.price != null ? opts.price : p.price;
        var old = opts.old != null ? opts.old : ((p.originalPrice && p.originalPrice > p.price) ? p.originalPrice : 0);
        var pct = (old && old > price) ? Math.round((old - price) / old * 100) : 0;
        var heart = typeof stzWishlistHeartHtml === 'function' ? stzWishlistHeartHtml(p._id) : '';
        var img = opts.img || 'https://via.placeholder.com/200';
        var sold = fmtSold(p.soldCount);
        var cnt = Number(p.reviewCount) || 0;
        var rate = '<span class="dzc-rate">' + stars(cnt > 0 ? p.ratingAvg : 0) + '<span class="dzc-cnt">(' + cnt + ')</span></span>';
        var vendor = opts.vendor ? '<span class="dzc-vendor">' + esc(opts.vendor) + '</span>' : '';
        return '<div class="dzc-img">' + heart +
            '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" onerror="this.src=\'https://via.placeholder.com/200\'"></div>' +
            '<div class="dzc-body">' +
            '<h3 class="dzc-name">' + (opts.nameHtml != null ? opts.nameHtml : esc(p.name)) + '</h3>' +
            '<div class="dzc-price">৳ ' + price + '</div>' +
            (pct > 0 ? '<div class="dzc-off"><del>৳ ' + old + '</del><span>' + pct + '% Off</span></div>' : '') +
            '<div class="dzc-meta">' + (sold ? '<span class="dzc-sold">' + sold + '</span><span class="dzc-sep"></span>' : '') + rate + vendor + '</div>' +
            (opts.extraHtml || '') +
            '</div>';
    };
})();
