// Packaging Proof স্ক্রিনশট গ্যালারি (কাস্টমার-সাইড): track.html ও account.html এ ভিডিওর ঠিক নিচে দেখায়।
// প্যাকিং স্টেশনে রেকর্ডিং চলাকালীন প্রতি ১০ সেকেন্ডে তোলা ছবি, সময়ের ব্যাজসহ (00:10, 00:20 ...)।
// ছবিতে ক্লিক করলে বড় করে দেখা যায় (তীর, কিবোর্ড ও সোয়াইপ দিয়ে এগোনো-পেছানো)।
// ব্যবহার: STZProof.html(frames, resolveFn, key) → HTML স্ট্রিং; STZProof.open(key, index) লাইটবক্স খোলে।
(function () {
    var sets = {};
    var cur = { key: null, i: 0 };

    function clock(sec) {
        sec = Math.max(0, Math.round(Number(sec) || 0));
        return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function injectCss() {
        if (document.getElementById('stzProofCss')) return;
        var st = document.createElement('style');
        st.id = 'stzProofCss';
        st.textContent = [
            '.pp-gallery{margin-top:12px;}',
            '.pp-gallery-title{font-size:12.5px;font-weight:700;color:#555;margin:0 0 8px;}',
            '.pp-strip{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;}',
            '.pp-strip::-webkit-scrollbar{height:6px;}',
            '.pp-strip::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px;}',
            '.pp-shot{flex:0 0 auto;position:relative;width:132px;padding:0;border:none;border-radius:12px;overflow:hidden;background:#000;cursor:pointer;scroll-snap-align:start;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .15s, box-shadow .15s;}',
            '.pp-shot:hover{transform:translateY(-2px);box-shadow:0 5px 14px rgba(0,0,0,.25);}',
            '.pp-shot img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;}',
            '.pp-shot span{position:absolute;left:6px;bottom:6px;background:rgba(0,0,0,.72);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;letter-spacing:.3px;}',
            '.pp-lb{display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.93);align-items:center;justify-content:center;flex-direction:column;padding:14px;touch-action:pan-y;}',
            '.pp-lb.open{display:flex;}',
            '.pp-lb img{max-width:100%;max-height:78vh;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);}',
            '.pp-lb-bar{display:flex;align-items:center;gap:14px;margin-top:14px;color:#fff;font-size:13px;font-weight:700;}',
            '.pp-lb button{background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:22px;padding:10px 18px;font-size:16px;cursor:pointer;}',
            '.pp-lb-close{position:absolute;top:12px;right:12px;}'
        ].join('');
        document.head.appendChild(st);
    }

    function ensureLb() {
        var lb = document.getElementById('stzProofLb');
        if (lb) return lb;
        lb = document.createElement('div');
        lb.id = 'stzProofLb';
        lb.className = 'pp-lb';
        lb.innerHTML = '<button type="button" class="pp-lb-close" aria-label="বন্ধ করুন">✕</button>' +
            '<img id="stzProofLbImg" alt="Packaging Proof">' +
            '<div class="pp-lb-bar"><button type="button" data-d="-1" aria-label="আগের ছবি">‹</button><span id="stzProofLbLabel"></span><button type="button" data-d="1" aria-label="পরের ছবি">›</button></div>';
        document.body.appendChild(lb);
        lb.addEventListener('click', function (e) {
            if (e.target === lb || e.target.classList.contains('pp-lb-close')) { STZProof.close(); return; }
            var d = e.target.getAttribute && e.target.getAttribute('data-d');
            if (d) STZProof.step(Number(d));
        });
        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') STZProof.close();
            else if (e.key === 'ArrowLeft') STZProof.step(-1);
            else if (e.key === 'ArrowRight') STZProof.step(1);
        });
        var sx = null;
        lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener('touchend', function (e) {
            if (sx == null) return;
            var dx = e.changedTouches[0].clientX - sx; sx = null;
            if (Math.abs(dx) > 50) STZProof.step(dx < 0 ? 1 : -1);
        }, { passive: true });
        return lb;
    }

    window.STZProof = {
        // frames = [{ url, t }], resolveFn = পেজের নিজস্ব resolveImg, key = অর্ডার প্রতি আলাদা নাম
        html: function (frames, resolveFn, key) {
            if (!frames || !frames.length) return '';
            injectCss();
            var list = frames.map(function (f) { return { url: resolveFn ? resolveFn(f.url) : f.url, t: f.t }; });
            sets[key] = list;
            return '<div class="pp-gallery" id="pp-gal-' + esc(key) + '" style="display:none;">' +
                '<div class="pp-gallery-title">📸 প্যাকিংয়ের সময়ের ছবি (প্রতি ১০ সেকেন্ডে)</div>' +
                '<div class="pp-strip">' + list.map(function (f, i) {
                    return '<button type="button" class="pp-shot" onclick="STZProof.open(\'' + esc(key) + '\',' + i + ')" title="' + clock(f.t) + '">' +
                        '<img loading="lazy" src="' + esc(f.url) + '" alt="প্যাকিংয়ের ছবি ' + clock(f.t) + '"><span>' + clock(f.t) + '</span></button>';
                }).join('') + '</div></div>';
        },
        toggle: function (key, show) {
            var g = document.getElementById('pp-gal-' + key);
            if (g) g.style.display = show ? 'block' : 'none';
        },
        open: function (key, i) {
            var list = sets[key]; if (!list || !list.length) return;
            injectCss();
            var lb = ensureLb();
            cur.key = key; cur.i = (i + list.length) % list.length;
            document.getElementById('stzProofLbImg').src = list[cur.i].url;
            document.getElementById('stzProofLbLabel').textContent = clock(list[cur.i].t) + ' · ' + (cur.i + 1) + '/' + list.length;
            lb.classList.add('open');
        },
        step: function (d) { if (cur.key) this.open(cur.key, cur.i + d); },
        close: function () { var lb = document.getElementById('stzProofLb'); if (lb) lb.classList.remove('open'); }
    };
})();
