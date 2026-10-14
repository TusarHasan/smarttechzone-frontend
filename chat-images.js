// ===== চ্যাটে ছবি পাঠানো — অ্যাডমিন (Messages পেজ, অর্ডার চ্যাট ড্রয়ার) ও কাস্টমার (চ্যাট উইন্ডো, Messages পেজ)
// সবখানে এই একটাই ফাইল ব্যবহার হয় (admin ও SmartTechZone দুই ফোল্ডারেই একই কপি থাকে) =====
// কাজ: ছবি বাছাই → ব্রাউজারেই ১২৮০px/JPEG-এ ছোট করা (R2 স্টোরেজ ও ডেটা বাঁচাতে) → সর্বোচ্চ ৪টা প্রিভিউ স্ট্রিপে
// দেখানো (এক এক করে বাদ দেওয়া যায়) → পাঠানোর সময় আপলোড করে URL ফেরত দেওয়া। বাবলে ছবির গ্রিড ও ক্লিকে বড়
// করে দেখার Lightbox (তীর/কিবোর্ড দিয়ে ঘোরা যায়) এখান থেকেই আসে।
(function () {
    if (window.STZChatImages) return;
    var MAX = 4;

    function injectCss() {
        if (document.getElementById('stzimgCss')) return;
        var st = document.createElement('style');
        st.id = 'stzimgCss';
        st.textContent = [
            '.stzimg-btn{background:#f3f4f6!important;color:#374151!important;width:40px;height:40px;min-width:40px;padding:0!important;border:none;border-radius:50%!important;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;box-shadow:none!important;}',
            '.stzimg-btn:hover{background:#fde2df!important;color:#e74c3c!important;}',
            '.stzimg-btn:disabled{background:#eee!important;color:#aaa!important;cursor:not-allowed;}',
            '.stzimg-strip{display:none;gap:8px;padding:10px 12px 2px;border-top:1px solid #eee;background:#fff8f6;flex-wrap:wrap;}',
            '.stzimg-strip.show{display:flex;}',
            '.stzimg-item{position:relative;width:60px;height:60px;}',
            '.stzimg-item img{width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #eee;background:#fff;display:block;}',
            '.stzimg-item button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:#374151;color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0;}',
            '.stzimg-note{align-self:center;font-size:12px;color:#e74c3c;font-weight:700;}',
            '.stzimg-grid{display:grid;gap:4px;margin-bottom:4px;grid-template-columns:repeat(2,1fr);width:230px;max-width:100%;}',
            '.stzimg-grid.n1{grid-template-columns:1fr;width:210px;}',
            '.stzimg-grid img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;cursor:zoom-in;background:#f3f4f6;display:block;}',
            '.stzimg-grid.n1 img{aspect-ratio:auto;max-height:260px;}',
            '.stzimg-lb{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);z-index:2147483000;display:none;align-items:center;justify-content:center;}',
            '.stzimg-lb.open{display:flex;}',
            '.stzimg-lb img{max-width:92vw;max-height:86vh;object-fit:contain;border-radius:6px;}',
            '.stzimg-lb button{position:absolute;border:none;background:rgba(255,255,255,.18);color:#fff;width:44px;height:44px;border-radius:50%;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}',
            '.stzimg-lb .x{top:16px;right:16px;}',
            '.stzimg-lb .p{left:14px;top:50%;margin-top:-22px;}',
            '.stzimg-lb .n{right:14px;top:50%;margin-top:-22px;}',
            '.stzimg-lb .c{position:absolute;bottom:18px;left:0;right:0;text-align:center;color:#fff;font-size:13px;}'
        ].join('');
        document.head.appendChild(st);
    }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    var ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

    function compress(file) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            var src = URL.createObjectURL(file);
            img.onload = function () {
                var k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
                var w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(src);
                c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Could not process the photo')); }, 'image/jpeg', 0.82);
            };
            img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('Could not open the photo')); };
            img.src = src;
        });
    }

    // ===== Lightbox =====
    var lb = null, lbList = [], lbIdx = 0;
    function lbBuild() {
        if (lb) return lb;
        injectCss();
        lb = document.createElement('div');
        lb.className = 'stzimg-lb';
        lb.innerHTML = '<button type="button" class="x" aria-label="Close">&times;</button><button type="button" class="p" aria-label="Previous">&#8249;</button><img alt=""><button type="button" class="n" aria-label="Next">&#8250;</button><div class="c"></div>';
        document.body.appendChild(lb);
        lb.addEventListener('click', function (e) {
            if (e.target.closest('.p')) return go(-1);
            if (e.target.closest('.n')) return go(1);
            if (e.target.tagName !== 'IMG') lb.classList.remove('open');
        });
        // capture ফেজে ধরা হয়, যাতে Esc চাপলে শুধু Lightbox বন্ধ হয় — নিচের চ্যাট ড্রয়ারও বন্ধ হয়ে না যায়
        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') { lb.classList.remove('open'); e.stopPropagation(); e.stopImmediatePropagation(); }
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        }, true);
        return lb;
    }
    function lbShow() {
        var el = lbBuild();
        el.querySelector('img').src = lbList[lbIdx];
        el.querySelector('.c').textContent = lbList.length > 1 ? (lbIdx + 1) + ' / ' + lbList.length : '';
        el.querySelector('.p').style.display = el.querySelector('.n').style.display = lbList.length > 1 ? 'flex' : 'none';
        el.classList.add('open');
    }
    function go(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); }

    // ===== বাবলের ভেতরের ছবির গ্রিড (urls: মেসেজের images অ্যারে, resolve: সম্পূর্ণ URL বানানোর ফাংশন) =====
    function gridHtml(urls, resolve) {
        var list = (urls || []).filter(Boolean);
        if (!list.length) return '';
        return '<div class="stzimg-grid n' + (list.length === 1 ? 1 : 2) + '">' + list.map(function (u, i) {
            return '<img src="' + esc(resolve ? resolve(u) : u) + '" alt="" loading="lazy" data-stzimg="' + i + '">';
        }).join('') + '</div>';
    }
    // container-এর ভেতরের যেকোনো .stzimg-grid ছবিতে ক্লিক করলে সেই মেসেজের সব ছবি Lightbox-এ খোলে
    function bindLightbox(container) {
        injectCss();
        container.addEventListener('click', function (e) {
            var img = e.target.closest ? e.target.closest('.stzimg-grid img') : null;
            if (!img) return;
            var imgs = img.parentNode.querySelectorAll('img');
            lbList = []; for (var i = 0; i < imgs.length; i++) lbList.push(imgs[i].src);
            lbIdx = Number(img.getAttribute('data-stzimg')) || 0;
            lbShow();
        });
    }

    // ===== কম্পোজার কন্ট্রোলার =====
    // opts: { strip: প্রিভিউ স্ট্রিপের element, uploadUrl, fetcher(url, init) → Promise<Response>, onChange() }
    function create(opts) {
        injectCss();
        var items = []; // { blob, url }
        var note = '';
        function render() {
            var strip = opts.strip;
            if (!items.length && !note) { strip.className = 'stzimg-strip'; strip.innerHTML = ''; }
            else {
                strip.className = 'stzimg-strip show';
                strip.innerHTML = items.map(function (p, i) {
                    return '<div class="stzimg-item"><img src="' + p.url + '" alt=""><button type="button" data-rm="' + i + '" aria-label="Remove photo">&times;</button></div>';
                }).join('') + (note ? '<span class="stzimg-note">' + esc(note) + '</span>' : '');
            }
            if (opts.onChange) opts.onChange(items.length);
        }
        opts.strip.addEventListener('click', function (e) {
            var rm = e.target.closest ? e.target.closest('[data-rm]') : null;
            if (!rm) return;
            var removed = items.splice(Number(rm.getAttribute('data-rm')), 1)[0];
            if (removed) URL.revokeObjectURL(removed.url);
            note = '';
            render();
        });
        var ctl = {
            count: function () { return items.length; },
            setNote: function (t) { note = t || ''; render(); },
            add: function (fileList) {
                var files = Array.prototype.slice.call(fileList || []);
                note = '';
                return files.reduce(function (p, f) {
                    return p.then(function () {
                        if (items.length >= MAX) { note = 'Max ' + MAX + ' photos'; return; }
                        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { note = 'Only JPG, PNG or WEBP photos'; return; }
                        return compress(f).then(function (blob) { items.push({ blob: blob, url: URL.createObjectURL(blob) }); }, function (err) { note = err.message; });
                    });
                }, Promise.resolve()).then(render);
            },
            clear: function () { items.forEach(function (p) { URL.revokeObjectURL(p.url); }); items = []; note = ''; render(); },
            upload: function () {
                var fd = new FormData();
                items.forEach(function (p, i) { fd.append('images', p.blob, 'photo-' + (i + 1) + '.jpg'); });
                return opts.fetcher(opts.uploadUrl, { method: 'POST', body: fd }).then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (data) {
                        if (!res.ok) throw new Error(data.error || 'Could not upload the photo.');
                        return data.urls || [];
                    });
                });
            }
        };
        return ctl;
    }

    // বাটন + লুকানো ফাইল ইনপুট একসাথে বানিয়ে দেয় (যেকোনো কম্পোজারে বসানোর জন্য)
    function buildButton(onFiles) {
        injectCss();
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stzimg-btn';
        btn.title = 'Send photo';
        btn.setAttribute('aria-label', 'Send photo');
        btn.innerHTML = ICON;
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.multiple = true;
        input.style.display = 'none';
        btn.addEventListener('click', function () { input.click(); });
        input.addEventListener('change', function () { var f = input.files; onFiles(f); setTimeout(function () { input.value = ''; }, 0); });
        return { btn: btn, input: input };
    }

    window.STZChatImages = { create: create, buildButton: buildButton, gridHtml: gridHtml, bindLightbox: bindLightbox, MAX: MAX };
})();
