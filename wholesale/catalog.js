/* Private Wholesale Portal (ধাপ ২) — ক্যাটালগ, কার্ট, প্রোগ্রেস বার, শর্ত-মডাল, অর্ডার রিকোয়েস্ট।
   দাম ও আনলকের নিয়ম সার্ভার থেকে আসে এবং অর্ডারের সময় সার্ভার আবার যাচাই করে — এখানকার হিসাব শুধু দেখানোর জন্য।
   কার্ট ব্রাউজারের localStorage-এ থাকে (শুধু productId + কালার + পরিমাণ, দাম নয়)। */
(function () {
    var CART_KEY = 'wsCartV1';
    var PAGE = 24;
    var E = WS.esc;
    var app = document.getElementById('app');
    var $ = function (id) { return document.getElementById(id); };
    document.getElementById('hdr').innerHTML = WS.header();

    var S = { products: [], byId: {}, meta: null, cart: {}, q: '', brand: '', shown: PAGE, lastReached: 0, submitting: false };

    function money(n) { return '৳' + Number(n || 0).toLocaleString('en-US'); }
    function safeImg(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
    function bg(u) { u = safeImg(u); return u ? ' style="background-image:url(\'' + E(u) + '\')"' : ''; }
    function toast(msg, bad) { var t = $('toast'); t.textContent = msg; t.className = 'ws-toast show' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'ws-toast' + (bad ? ' bad' : ''); }, 3200); }
    function kickOut() { location.replace('/wholesale/'); }

    // ---------- কার্ট ----------
    function loadCart() {
        try { var c = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; }
    }
    function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(S.cart)); } catch (e) { /* প্রাইভেট মোডে সেভ না হলেও চলবে */ } }
    function ck(pid, key) { return pid + '|' + key; }
    function qtyOf(pid, key) { return S.cart[ck(pid, key)] || 0; }
    function setQty(pid, key, q) {
        q = Math.floor(Number(q)); if (!isFinite(q) || q < 0) q = 0; if (q > 5000) q = 5000;
        if (q) S.cart[ck(pid, key)] = q; else delete S.cart[ck(pid, key)];
        saveCart();
    }
    function cartLines() {
        var out = [];
        Object.keys(S.cart).forEach(function (k) {
            var i = k.indexOf('|'), pid = k.slice(0, i), key = k.slice(i + 1), p = S.byId[pid];
            var o = p && p.options.filter(function (x) { return x.key === key; })[0];
            if (!p || !o) return;
            out.push({ pid: pid, key: key, p: p, o: o, qty: S.cart[k], total: S.cart[k] * p.price });
        });
        return out;
    }
    function totals() {
        var qty = 0, amt = 0;
        cartLines().forEach(function (l) { qty += l.qty; amt += l.total; });
        return { qty: qty, amt: amt };
    }
    function pruneCart() {
        var changed = false;
        Object.keys(S.cart).forEach(function (k) {
            var i = k.indexOf('|'), p = S.byId[k.slice(0, i)];
            var o = p && p.options.filter(function (x) { return x.key === k.slice(i + 1); })[0];
            if (!p || !o || !o.inStock) { delete S.cart[k]; changed = true; }
        });
        if (changed) saveCart();
        return changed;
    }

    // ---------- প্রোগ্রেস বার ----------
    function progress(qty) {
        var ms = S.meta.milestones, n = ms.length, prev = 0, idx = 0;
        while (idx < n && qty >= ms[idx].qty) { prev = ms[idx].qty; idx++; }
        var next = ms[idx] || null;
        var pct = next ? ((idx + (qty - prev) / (next.qty - prev)) / n) * 100 : 100;
        return { idx: idx, next: next, remaining: next ? next.qty - qty : 0, pct: Math.max(0, Math.min(100, pct)), unlocked: qty >= S.meta.minQty };
    }
    function message(qty, pr) {
        if (!pr.next) return 'সব ধাপ পূরণ হয়েছে! আপনি ' + S.meta.milestones[S.meta.milestones.length - 1].title + ' এর যোগ্য।';
        if (!pr.unlocked) return qty ? 'আরও ' + pr.remaining + ' পিস যোগ করলে অর্ডার আনলক হবে' : 'অর্ডার আনলক করতে ' + S.meta.minQty + ' পিস বা তার বেশি যোগ করুন';
        return 'অর্ডার আনলক হয়েছে! আরও ' + pr.remaining + ' পিস যোগ করলে ' + pr.next.title + ' এর যোগ্য হবেন';
    }
    function orderTipText(qty) { return 'অর্ডার করতে ন্যূনতম ' + S.meta.minQty + ' পিস লাগবে। আপনার কার্টে এখন ' + qty + ' পিস, আরও ' + (S.meta.minQty - qty) + ' পিস যোগ করুন।'; }

    function renderMarks() {
        var ms = S.meta.milestones, n = ms.length, track = $('track'), lbl = $('marksLbl');
        Array.prototype.slice.call(track.querySelectorAll('.ws-mark')).forEach(function (x) { x.remove(); });
        var h = '', l = '';
        ms.forEach(function (m, i) {
            var left = ((i + 1) / n * 100);
            h += '<span class="ws-mark" data-m="' + i + '" style="left:' + left + '%"></span>';
            l += '<span data-ml="' + i + '" style="left:' + left + '%">' + m.qty + '<em> &middot; ' + E(m.title) + '</em></span>';
        });
        track.insertAdjacentHTML('beforeend', h);
        lbl.innerHTML = l;
    }
    function updateBar() {
        var t = totals(), pr = progress(t.qty);
        $('bar').style.display = '';
        var msg = $('meterMsg'), text = message(t.qty, pr);
        if (msg.textContent !== text) { msg.textContent = text; }
        if (pr.idx > S.lastReached) { msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop'); }
        S.lastReached = pr.idx;
        var fill = $('fill'); fill.style.width = pr.pct + '%'; fill.classList.toggle('done', !pr.next);
        Array.prototype.slice.call(document.querySelectorAll('.ws-mark')).forEach(function (el) { el.classList.toggle('on', Number(el.dataset.m) < pr.idx); });
        Array.prototype.slice.call(document.querySelectorAll('[data-ml]')).forEach(function (el) { el.classList.toggle('on', Number(el.dataset.ml) < pr.idx); });
        $('barQty').textContent = t.qty + ' পিস';
        $('barAmt').textContent = t.qty ? 'নমুনা দামে ' + money(t.amt) : 'কার্ট খালি';
        [['barOrder', 'orderTip'], ['cartOrder', 'cartTip']].forEach(function (p) {
            var b = $(p[0]), tip = $(p[1]);
            b.classList.toggle('is-off', !pr.unlocked); b.setAttribute('aria-disabled', pr.unlocked ? 'false' : 'true');
            tip.setAttribute('data-tip', pr.unlocked ? '' : orderTipText(t.qty));
            if (pr.unlocked) tip.classList.remove('show');
        });
        $('cartQty').textContent = t.qty + ' পিস';
        $('cartAmt').textContent = money(t.amt);
    }

    // ---------- ক্যাটালগ গ্রিড ----------
    function filtered() {
        var q = S.q.trim().toLowerCase();
        return S.products.filter(function (p) {
            if (S.brand && p.brand !== S.brand) return false;
            if (!q) return true;
            return (p.title + ' ' + p.codes + ' ' + p.brand).toLowerCase().indexOf(q) !== -1;
        });
    }
    function optHtml(p, o) {
        var q = qtyOf(p.id, o.key);
        return '<div class="ws-opt' + (q ? ' has' : '') + (o.inStock ? '' : ' out') + '" data-pid="' + E(p.id) + '" data-key="' + E(o.key) + '">' +
            '<span class="ws-opt-img"' + bg(o.image) + '></span><span class="ws-opt-name">' + E(o.label) + (o.inStock ? '' : '<small>স্টক নেই</small>') + '</span>' +
            '<span class="ws-step"><button type="button" data-act="minus" aria-label="কমান"' + (o.inStock && q ? '' : ' disabled') + '>&minus;</button>' +
            '<input type="number" inputmode="numeric" min="0" max="5000" value="' + q + '" data-act="input" aria-label="' + E(o.label) + ' পিস"' + (o.inStock ? '' : ' disabled') + '>' +
            '<button type="button" data-act="plus" aria-label="বাড়ান"' + (o.inStock ? '' : ' disabled') + '>+</button></span></div>';
    }
    function cardHtml(p) {
        var has = p.options.some(function (o) { return qtyOf(p.id, o.key) > 0; });
        return '<article class="ws-pcard' + (has ? ' has' : '') + '" data-card="' + E(p.id) + '"><div class="ws-phead"><div class="ws-pimg"' + bg(p.image) + '></div><div style="min-width:0">' +
            '<h3 class="ws-ptitle">' + E(p.title) + '</h3>' + (p.codes ? '<div class="ws-pcodes">' + E(p.codes) + '</div>' : '') +
            '<div class="ws-pprice"><b>' + money(p.price) + '</b> / পিস' + (p.priceRule === 'Pixel' ? '<span class="ws-ptag">Power + Volume সেট</span>' : '') + '</div></div></div>' +
            '<div class="ws-opts">' + p.options.map(function (o) { return optHtml(p, o); }).join('') + '</div></article>';
    }
    function renderGrid() {
        var list = filtered(), grid = $('grid');
        $('count').textContent = list.length + 'টা পণ্য';
        if (!list.length) { grid.innerHTML = '<div class="ws-empty" style="grid-column:1/-1">কোনো পণ্য পাওয়া যায়নি।</div>'; $('more').style.display = 'none'; return; }
        grid.innerHTML = list.slice(0, S.shown).map(cardHtml).join('');
        $('more').style.display = list.length > S.shown ? '' : 'none';
    }
    function refreshCard(pid) {
        var p = S.byId[pid], card = document.querySelector('[data-card="' + pid + '"]');
        if (!p || !card) return;
        card.classList.toggle('has', p.options.some(function (o) { return qtyOf(pid, o.key) > 0; }));
        Array.prototype.slice.call(card.querySelectorAll('.ws-opt')).forEach(function (row) {
            var q = qtyOf(pid, row.dataset.key), inp = row.querySelector('input');
            row.classList.toggle('has', q > 0);
            if (document.activeElement !== inp) inp.value = q;
            row.querySelector('[data-act=minus]').disabled = !q || inp.disabled;
        });
    }
    function onQty(pid, key, q) {
        setQty(pid, key, q);
        refreshCard(pid); updateBar();
        if ($('drawer').classList.contains('show')) renderCart();
    }

    // ---------- কার্ট ড্রয়ার ----------
    function openCart() {
        $('ov').classList.add('show'); $('drawer').classList.add('show'); renderCart();
        var items = Object.keys(S.cart).map(function (k) { var i = k.indexOf('|'); return { productId: k.slice(0, i), optionKey: k.slice(i + 1), qty: S.cart[k] }; });
        if (!items.length) return;
        WS.api('/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items }) }).then(function (r) {
            if (r.status === 401 || r.status === 403) return kickOut();
            if (!r.ok) return;
            var bad = (r.data.lines || []).filter(function (l) { return l.unavailable; });
            if (bad.length) { bad.forEach(function (l) { delete S.cart[ck(l.productId, l.optionKey)]; }); saveCart(); toast(bad.length + 'টা পণ্য আর অর্ডার করা যাচ্ছে না, কার্ট থেকে সরানো হয়েছে।', true); renderGrid(); renderCart(); updateBar(); }
        });
    }
    function closeCart() { $('ov').classList.remove('show'); $('drawer').classList.remove('show'); }
    function renderCart() {
        var lines = cartLines(), body = $('cartBody');
        if (!lines.length) { body.innerHTML = '<div class="ws-empty">কার্ট খালি। ক্যাটালগ থেকে পিস যোগ করুন।</div>'; return; }
        body.innerHTML = lines.map(function (l) {
            return '<div class="ws-line" data-pid="' + E(l.pid) + '" data-key="' + E(l.key) + '"><div class="ws-pimg"' + bg(l.o.image) + '></div><div style="min-width:0">' +
                '<div class="ws-line-t">' + E(l.p.title) + '</div><div class="ws-line-o">' + E(l.o.label) + ' &middot; ' + money(l.p.price) + ' / পিস</div>' +
                '<div class="ws-line-r"><span class="ws-step"><button type="button" data-act="minus" aria-label="কমান">&minus;</button><input type="number" inputmode="numeric" min="0" max="5000" value="' + l.qty + '" data-act="input" aria-label="পিস"><button type="button" data-act="plus" aria-label="বাড়ান">+</button></span>' +
                '<span class="ws-line-sum">' + money(l.total) + '</span><button type="button" class="ws-line-rm" data-act="remove">সরান</button></div></div></div>';
        }).join('');
    }

    // ---------- শর্ত-মডাল ও অর্ডার ----------
    function tryOrder(fromTip) {
        var t = totals();
        if (t.qty < S.meta.minQty) {
            var tip = $(fromTip); tip.classList.add('show'); clearTimeout(tip._t); tip._t = setTimeout(function () { tip.classList.remove('show'); }, 3500);
            return;
        }
        openTerms();
    }
    function openTerms() {
        var T = S.meta.terms, t = totals();
        $('termsCard').innerHTML = '<div class="hd"><h2 id="termsTitle">' + E(T.title) + '</h2></div><div class="bd">' +
            '<p class="ws-sub" style="margin:0 0 10px">' + t.qty + ' পিস &middot; নমুনা দামে ' + money(t.amt) + '। রিকোয়েস্ট জমা দেওয়ার আগে নিচের শর্তগুলো পড়ে সম্মতি দিন।</p>' +
            '<ol class="ws-terms">' + T.items.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ol>' +
            '<label class="ws-check"><input type="checkbox" id="termsChk"><span>আমি উপরের সব শর্ত পড়েছি এবং মেনে নিচ্ছি।</span></label><div class="ws-note bad" id="termsErr" style="display:none"></div></div>' +
            '<div class="ft"><button type="button" class="ws-btn ghost sm" id="termsCancel">বাতিল</button><button type="button" class="ws-btn sm is-off" id="termsGo" aria-disabled="true">অর্ডার রিকোয়েস্ট জমা দিন</button></div>';
        $('termsModal').classList.add('show');
        $('termsChk').addEventListener('change', function () { var b = $('termsGo'); b.classList.toggle('is-off', !this.checked); b.setAttribute('aria-disabled', this.checked ? 'false' : 'true'); });
        $('termsCancel').addEventListener('click', closeTerms);
        $('termsGo').addEventListener('click', submitOrder);
    }
    function closeTerms() { $('termsModal').classList.remove('show'); }
    function termsError(msg) { var e = $('termsErr'); if (!e) return toast(msg, true); e.textContent = msg; e.style.display = ''; }
    function submitOrder() {
        var chk = $('termsChk'), btn = $('termsGo');
        if (!chk.checked || S.submitting) return;
        S.submitting = true; btn.classList.add('is-off'); btn.textContent = 'জমা হচ্ছে...';
        var items = Object.keys(S.cart).map(function (k) { var i = k.indexOf('|'); return { productId: k.slice(0, i), optionKey: k.slice(i + 1), qty: S.cart[k] }; });
        WS.api('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items, note: $('note').value, termsAccepted: true, termsVersion: S.meta.terms.version }) }).then(function (r) {
            S.submitting = false;
            if (r.status === 401 || r.status === 403) return kickOut();
            if (r.ok) {
                S.cart = {}; saveCart(); $('note').value = ''; renderGrid(); renderCart(); updateBar(); closeCart();
                $('termsCard').innerHTML = '<div class="bd ws-center" style="padding:28px 20px"><div class="ws-icon-circle ok">' + WS.icons.check + '</div><h2 style="margin:0 0 6px">অর্ডার রিকোয়েস্ট জমা হয়েছে</h2>' +
                    '<p class="ws-sub" style="margin:0 0 6px">অর্ডার নম্বর: <strong>' + E(r.data.orderNumber) + '</strong></p>' +
                    '<p class="ws-sub">আমাদের টিম আসল দামসহ মেমো পাঠাবে। মেমো এলে "আমার অর্ডার" পেজে দেখতে পাবেন।</p>' +
                    '<a class="ws-btn block" href="/wholesale/orders">আমার অর্ডার দেখুন</a><button type="button" class="ws-btn ghost block" style="margin-top:8px" id="okClose">ক্যাটালগে ফিরুন</button></div>';
                $('okClose').addEventListener('click', closeTerms);
                return;
            }
            btn.textContent = 'অর্ডার রিকোয়েস্ট জমা দিন'; btn.classList.remove('is-off');
            if (r.status === 409 && r.data && r.data.quote) {
                (r.data.quote.lines || []).filter(function (l) { return l.unavailable; }).forEach(function (l) { delete S.cart[ck(l.productId, l.optionKey)]; });
                saveCart(); renderGrid(); renderCart(); updateBar(); closeTerms(); toast(r.data.error, true); return;
            }
            termsError((r.data && r.data.error) || 'রিকোয়েস্ট জমা হয়নি, আবার চেষ্টা করুন।');
        });
    }

    // ---------- ইভেন্ট ----------
    function bindQty(root) {
        root.addEventListener('click', function (e) {
            var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
            var row = b.closest('[data-pid]'); if (!row) return;
            var pid = row.dataset.pid, key = row.dataset.key, act = b.dataset.act;
            if (act === 'plus') onQty(pid, key, qtyOf(pid, key) + 1);
            else if (act === 'minus') onQty(pid, key, qtyOf(pid, key) - 1);
            else if (act === 'remove') onQty(pid, key, 0);
        });
        root.addEventListener('change', function (e) {
            var inp = e.target.closest('input[data-act=input]'); if (!inp) return;
            var row = inp.closest('[data-pid]'); onQty(row.dataset.pid, row.dataset.key, inp.value);
            inp.value = qtyOf(row.dataset.pid, row.dataset.key);
        });
    }

    function start(data) {
        S.meta = { milestones: data.milestones, minQty: data.minQty, terms: data.terms };
        S.products = data.products; data.products.forEach(function (p) { S.byId[p.id] = p; });
        S.cart = loadCart(); pruneCart();
        var brands = {}; S.products.forEach(function (p) { brands[p.brand] = (brands[p.brand] || 0) + 1; });
        app.innerHTML = '<div class="ws-toolbar"><span class="ws-cat">' + E(data.category) + '</span>' +
            '<input type="search" id="q" placeholder="মডেল বা কোড খুঁজুন (যেমন A98)" aria-label="খুঁজুন">' +
            '<select id="brand" aria-label="ব্র্যান্ড"><option value="">সব ব্র্যান্ড</option>' + Object.keys(brands).sort().map(function (b) { return '<option value="' + E(b) + '">' + E(b) + ' (' + brands[b] + ')</option>'; }).join('') + '</select>' +
            '<a class="ws-btn ghost sm" href="/wholesale/orders">আমার অর্ডার</a><span class="count" id="count"></span></div>' +
            '<div class="ws-banner">দামগুলো নমুনা (সর্বোচ্চ) দাম। অর্ডারের পরিমাণ বাড়লে আসল দাম মেমোতে জানানো হবে। যেকোনো পণ্য ১ পিস থেকেও নেওয়া যায়, প্রতিটা পিস ' + data.minQty + ' পিসের লক্ষ্যে গোনা হয়।</div>' +
            '<div class="ws-grid-products" id="grid"></div><div class="ws-more" id="more"><button type="button" class="ws-btn ghost" id="moreBtn">আরও দেখান</button></div>';
        renderMarks(); renderGrid(); updateBar();
        bindQty($('grid')); bindQty($('cartBody'));
        var timer; $('q').addEventListener('input', function () { clearTimeout(timer); var v = this.value; timer = setTimeout(function () { S.q = v; S.shown = PAGE; renderGrid(); }, 200); });
        $('brand').addEventListener('change', function () { S.brand = this.value; S.shown = PAGE; renderGrid(); });
        $('moreBtn').addEventListener('click', function () { S.shown += PAGE; renderGrid(); });
        $('openCart').addEventListener('click', openCart);
        $('closeCart').addEventListener('click', closeCart);
        $('ov').addEventListener('click', closeCart);
        $('barOrder').addEventListener('click', function () { tryOrder('orderTip'); });
        $('cartOrder').addEventListener('click', function () { tryOrder('cartTip'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeTerms(); closeCart(); } });
        window.addEventListener('storage', function (e) { if (e.key === CART_KEY) { S.cart = loadCart(); pruneCart(); renderGrid(); renderCart(); updateBar(); } });
    }

    if (!WS.token()) return kickOut();
    WS.api('/catalog').then(function (r) {
        if (r.status === 401 || r.status === 403) return kickOut();
        if (!r.ok) {
            app.innerHTML = '<div class="ws-card ws-center"><div class="ws-icon-circle bad">' + WS.icons.alert + '</div><h1>সমস্যা হয়েছে</h1><p class="ws-sub">' + E((r.data && r.data.error) || 'সার্ভারে সমস্যা হয়েছে।') + '</p><button class="ws-btn" onclick="location.reload()">আবার চেষ্টা করুন</button></div>';
            return;
        }
        start(r.data);
    });
})();
