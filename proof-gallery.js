// Packaging Proof ছবির গ্যালারি (কাস্টমার-সাইড): track.html ও account.html এ ভিডিওর ঠিক নিচে দেখায়।
// প্যাকিং স্টেশনে রেকর্ডিং চলাকালীন প্রতি ১০ সেকেন্ডে ভিডিও থেকে তোলা ছবি, পেজে বড় করে একটার নিচে একটা।
// প্রতিটি ছবির মাথায় সময়ের বার (⏱ 00:10 · ১/২৫)। ছবিতে ট্যাপ করলে ফুলস্ক্রিনে খোলে, সেখানে জুম/পিঞ্চ/টেনে সরানো/সোয়াইপ চলে।
// ব্যবহার: STZProof.html(frames, resolveFn, key) → HTML স্ট্রিং; STZProof.toggle(key, show); STZProof.open(key, index)।
(function () {
    var sets = {};
    var cur = { key: null, i: 0 };
    var zoom = null;

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
            '.pp-list{display:flex;flex-direction:column;gap:14px;}',
            '.pp-shot{border-radius:12px;overflow:hidden;background:#000;box-shadow:0 2px 10px rgba(0,0,0,.18);}',
            '.pp-shot-bar{display:flex;align-items:center;justify-content:space-between;background:#1f2937;color:#fff;font-size:13px;font-weight:700;padding:8px 12px;border-left:4px solid #f59e0b;letter-spacing:.3px;}',
            '.pp-shot-bar span:last-child{font-size:12px;font-weight:600;opacity:.75;}',
            '.pp-shot-img{display:block;width:100%;padding:0;border:none;background:#000;cursor:zoom-in;}',
            '.pp-shot-img img{display:block;width:100%;height:auto;max-height:85vh;object-fit:contain;background:#000;}',
            '.pp-lb{display:none;position:fixed;inset:0;z-index:100000;width:100vw;height:100vh;height:100dvh;background:#000;flex-direction:column;}',
            '.pp-lb.open{display:flex;}',
            '.pp-stage{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;}',
            '.pp-lb img{width:100%;height:100%;object-fit:contain;transform-origin:center center;will-change:transform;-webkit-user-drag:none;}',
            '.pp-lb-bar{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));color:#fff;font-size:14px;font-weight:700;background:rgba(0,0,0,.85);}',
            '.pp-lb button{background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:22px;padding:10px 18px;font-size:16px;cursor:pointer;}',
            '.pp-lb-close{position:absolute;top:calc(10px + env(safe-area-inset-top));right:12px;z-index:2;}'
        ].join('');
        document.head.appendChild(st);
    }

    // জুম/সরানো: হুইল, ডাবল-ট্যাপ/ক্লিক, দুই আঙুলে পিঞ্চ, টেনে সরানো। জুম ১x হলে সোয়াইপে আগের/পরের ছবি।
    function attachZoom(stage, img, onSwipe) {
        var sc = 1, tx = 0, ty = 0;
        var pts = new Map();
        var pinch = null, drag = null, lastTap = 0, swipeX0 = null, moved = false;
        var MAX = 6;
        function limit() {
            var w = stage.clientWidth, h = stage.clientHeight;
            var mx = Math.max(0, (sc - 1) * w / 2), my = Math.max(0, (sc - 1) * h / 2);
            tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
        }
        function apply() {
            limit();
            img.style.transform = sc === 1 ? '' : 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
        }
        function zoomAt(ns, cx, cy) {
            ns = Math.max(1, Math.min(MAX, ns));
            var r = stage.getBoundingClientRect();
            var px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
            tx = px - (px - tx) * (ns / sc); ty = py - (py - ty) * (ns / sc);
            sc = ns; if (sc === 1) { tx = 0; ty = 0; }
            apply();
        }
        function arr() { return Array.from(pts.values()); }
        function dist() { var a = arr(); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
        function mid() { var a = arr(); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }
        stage.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); }, { passive: false });
        stage.addEventListener('pointerdown', function (e) {
            if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
            moved = false;
            if (pts.size === 2) { pinch = { d: dist(), sc: sc }; drag = null; swipeX0 = null; }
            else { drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; swipeX0 = e.clientX; }
        });
        stage.addEventListener('pointermove', function (e) {
            if (!pts.has(e.pointerId)) return;
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pts.size >= 2 && pinch) {
                var m = mid(); zoomAt(pinch.sc * dist() / pinch.d, m.x, m.y); moved = true;
            } else if (drag && sc > 1) {
                tx = drag.tx + (e.clientX - drag.x); ty = drag.ty + (e.clientY - drag.y); apply();
                if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6) moved = true;
            } else if (drag && Math.abs(e.clientX - drag.x) > 6) moved = true;
        });
        function up(e) {
            if (!pts.has(e.pointerId)) return;
            pts.delete(e.pointerId);
            if (pinch && pts.size < 2) { pinch = null; var r = arr()[0]; drag = r ? { x: r.x, y: r.y, tx: tx, ty: ty } : null; swipeX0 = null; return; }
            if (pts.size === 0) {
                if (sc === 1 && swipeX0 != null && Math.abs(e.clientX - swipeX0) > 60) { onSwipe(e.clientX < swipeX0 ? 1 : -1); }
                else if (!moved) {
                    var now = Date.now();
                    if (now - lastTap < 320) { zoomAt(sc > 1 ? 1 : 2.5, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
                }
                drag = null; swipeX0 = null;
            }
        }
        stage.addEventListener('pointerup', up);
        stage.addEventListener('pointercancel', up);
        return {
            reset: function () { sc = 1; tx = 0; ty = 0; pinch = null; drag = null; pts.clear(); apply(); },
            toggle: function () { var r = stage.getBoundingClientRect(); zoomAt(sc > 1 ? 1 : 2.5, r.left + r.width / 2, r.top + r.height / 2); }
        };
    }

    function ensureLb() {
        var lb = document.getElementById('stzProofLb');
        if (lb) return lb;
        lb = document.createElement('div');
        lb.id = 'stzProofLb';
        lb.className = 'pp-lb';
        lb.innerHTML = '<button type="button" class="pp-lb-close" aria-label="বন্ধ করুন">✕</button>' +
            '<div class="pp-stage" id="stzProofStage"><img id="stzProofLbImg" alt="Packaging Proof" draggable="false"></div>' +
            '<div class="pp-lb-bar"><button type="button" data-d="-1" aria-label="আগের ছবি">‹</button><span id="stzProofLbLabel"></span><button type="button" data-d="1" aria-label="পরের ছবি">›</button><button type="button" data-z="1" aria-label="জুম">🔍</button></div>';
        document.body.appendChild(lb);
        zoom = attachZoom(document.getElementById('stzProofStage'), document.getElementById('stzProofLbImg'), function (d) { STZProof.step(d); });
        lb.addEventListener('click', function (e) {
            if (e.target.classList.contains('pp-lb-close')) { STZProof.close(); return; }
            if (e.target.getAttribute && e.target.getAttribute('data-z')) { zoom.toggle(); return; }
            var d = e.target.getAttribute && e.target.getAttribute('data-d');
            if (d) STZProof.step(Number(d));
        });
        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') STZProof.close();
            else if (e.key === 'ArrowLeft') STZProof.step(-1);
            else if (e.key === 'ArrowRight') STZProof.step(1);
        });
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
                '<div class="pp-gallery-title">📸 প্যাকিংয়ের সময়ের ছবি (প্রতি ১০ সেকেন্ডে) · ছবিতে ট্যাপ করলে বড় ও জুম করা যাবে</div>' +
                '<div class="pp-list">' + list.map(function (f, i) {
                    return '<div class="pp-shot">' +
                        '<div class="pp-shot-bar"><span>⏱ ' + clock(f.t) + '</span><span>' + (i + 1) + '/' + list.length + '</span></div>' +
                        '<button type="button" class="pp-shot-img" onclick="STZProof.open(\'' + esc(key) + '\',' + i + ')" aria-label="ছবি ' + clock(f.t) + ' বড় করে দেখুন">' +
                        '<img loading="lazy" src="' + esc(f.url) + '" alt="প্যাকিংয়ের ছবি ' + clock(f.t) + '"></button></div>';
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
            if (zoom) zoom.reset();
            document.getElementById('stzProofLbImg').src = list[cur.i].url;
            document.getElementById('stzProofLbLabel').textContent = '⏱ ' + clock(list[cur.i].t) + ' · ' + (cur.i + 1) + '/' + list.length;
            lb.classList.add('open');
            document.body.style.overflow = 'hidden';
        },
        step: function (d) { if (cur.key) this.open(cur.key, cur.i + d); },
        close: function () {
            var lb = document.getElementById('stzProofLb');
            if (lb) lb.classList.remove('open');
            document.body.style.overflow = '';
        }
    };
})();
