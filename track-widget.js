// ================= গ্লোবাল "অর্ডার ট্র্যাক" ফ্লোটিং উইজেট =================
// footer.js এর ভেতর থেকে অটো লোড হয় (সব কাস্টমার পেজে footer.js আছে), তাই আলাদা করে কোনো পেজ এডিট করতে হয় না।
// লগইন লাগে না: অর্ডার নম্বর + ফোন নম্বর দিলে পেজ রিলোড ছাড়াই (fetch দিয়ে) সর্বশেষ অবস্থা দেখায়।
// প্রাইভেসি: ফোন নম্বর কখনো URL-এ যায় না (Pixel/অ্যানালিটিক্সে লিক এড়াতে) — "পূর্ণ বিবরণ" লিংকে শুধু অর্ডার
// নম্বর যায়, ফোনটা sessionStorage দিয়ে track.html-এ পৌঁছায়।
(function () {
    if (window.__stzTrackWidget) return;
    window.__stzTrackWidget = true;
    if (/\/track\.html$/i.test(location.pathname)) return;      // ট্র্যাক পেজে নিজেই ফর্ম আছে
    if (typeof BACKEND_URL === 'undefined') return;             // config.js না থাকলে চুপচাপ বাদ

    var me = document.currentScript || document.querySelector('script[src$="track-widget.js"]');
    var base = me && me.src ? me.src.replace(/track-widget\.js.*$/, '') : '/';
    var trackUrl = base + 'track.html';

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
    function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
    function load(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }

    var css = '' +
        '#stzTwFab{position:fixed;left:16px;bottom:22px;z-index:9997;display:flex;align-items:center;gap:8px;background:#fff;color:#e74c3c;border:1.5px solid #e74c3c;border-radius:28px;padding:10px 16px;font:700 13.5px Arial,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:background .15s,color .15s}' +
        '#stzTwFab:hover{background:#e74c3c;color:#fff}' +
        '#stzTwFab svg{width:18px;height:18px}' +
        '#stzTwPanel{position:fixed;left:16px;bottom:72px;z-index:9998;width:330px;max-width:calc(100vw - 32px);background:#fff;border-radius:12px;box-shadow:0 10px 36px rgba(0,0,0,.25);font-family:Arial,sans-serif;display:none;overflow:hidden}' +
        '#stzTwPanel.open{display:block}' +
        '.stz-tw-head{background:#e74c3c;color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:14px}' +
        '.stz-tw-x{background:none;border:none;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 2px}' +
        '.stz-tw-body{padding:14px}' +
        '.stz-tw-body label{display:block;font-size:12px;font-weight:700;color:#444;margin:10px 0 4px}' +
        '.stz-tw-body label:first-child{margin-top:0}' +
        '.stz-tw-body input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px}' +
        '.stz-tw-body input:focus{outline:none;border-color:#e74c3c}' +
        '.stz-tw-go{width:100%;margin-top:12px;background:#e74c3c;color:#fff;border:none;border-radius:6px;padding:11px;font-size:14px;font-weight:700;cursor:pointer}' +
        '.stz-tw-go:disabled{opacity:.6;cursor:wait}' +
        '.stz-tw-msg{margin-top:10px;font-size:13px;color:#c0392b;line-height:1.5}' +
        '.stz-tw-res{margin-top:12px;border-top:1px solid #eee;padding-top:12px;font-size:13px;color:#333;line-height:1.55}' +
        '.stz-tw-res b{display:block;font-size:14px;margin-bottom:2px}' +
        '.stz-tw-res small{color:#777;display:block;margin-top:2px}' +
        '.stz-tw-res a{display:inline-block;margin-top:8px;color:#e74c3c;font-weight:700;text-decoration:none}' +
        '@media(max-width:600px){#stzTwFab{left:12px;bottom:16px;padding:10px 13px}#stzTwFab span{display:none}#stzTwPanel{left:12px;bottom:68px}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var fab = document.createElement('button');
    fab.id = 'stzTwFab'; fab.type = 'button'; fab.setAttribute('aria-label', 'অর্ডার ট্র্যাক করুন');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg><span>অর্ডার ট্র্যাক</span>';

    var panel = document.createElement('div');
    panel.id = 'stzTwPanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'অর্ডার ট্র্যাক');
    panel.innerHTML =
        '<div class="stz-tw-head"><span>আপনার অর্ডার ট্র্যাক করুন</span><button type="button" class="stz-tw-x" aria-label="বন্ধ করুন">&times;</button></div>' +
        '<form class="stz-tw-body" novalidate>' +
        '<label for="stzTwOrder">অর্ডার নাম্বার</label><input id="stzTwOrder" type="text" placeholder="যেমন: STZ-XXXXXXXXXXX" autocomplete="off">' +
        '<label for="stzTwPhone">ফোন নাম্বার</label><input id="stzTwPhone" type="tel" inputmode="tel" placeholder="01XXXXXXXXX" autocomplete="tel">' +
        '<button class="stz-tw-go" type="submit">ট্র্যাক করুন</button>' +
        '<div class="stz-tw-msg" aria-live="polite"></div><div class="stz-tw-res" style="display:none"></div>' +
        '</form>';

    function mount() {
        document.body.appendChild(panel);
        document.body.appendChild(fab);
        var form = panel.querySelector('form'), msg = panel.querySelector('.stz-tw-msg'), res = panel.querySelector('.stz-tw-res'), go = panel.querySelector('.stz-tw-go');
        fab.addEventListener('click', function () { panel.classList.toggle('open'); if (panel.classList.contains('open')) panel.querySelector('#stzTwOrder').focus(); });
        panel.querySelector('.stz-tw-x').addEventListener('click', function () { panel.classList.remove('open'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') panel.classList.remove('open'); });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var order = panel.querySelector('#stzTwOrder').value.trim();
            var phone = panel.querySelector('#stzTwPhone').value.trim();
            msg.textContent = ''; res.style.display = 'none';
            if (!order || !phone) { msg.textContent = 'অর্ডার নাম্বার এবং ফোন নাম্বার দুটোই দিন।'; return; }
            go.disabled = true; go.textContent = 'খোঁজা হচ্ছে...';
            fetch(BACKEND_URL + '/api/orders/track?phone=' + encodeURIComponent(phone) + '&orderNumber=' + encodeURIComponent(order))
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
                .then(function (x) {
                    if (!x.ok) throw new Error(x.d.error || 'অর্ডার পাওয়া যায়নি।');
                    var t = x.d.tracking || {};
                    store('stz_track_phone', phone);
                    res.innerHTML = '<b>' + esc(t.headline || x.d.orderStatus) + '</b>' + esc(t.detail || '') +
                        (t.latestUpdate ? '<small>সর্বশেষ আপডেট: ' + esc(t.latestUpdate) + '</small>' : '') +
                        '<a href="' + trackUrl + '?order=' + encodeURIComponent(x.d.orderNumber) + '">পূর্ণ বিবরণ দেখুন &rarr;</a>';
                    res.style.display = 'block';
                })
                .catch(function (err) { msg.textContent = (err && err.message && err.message !== 'Failed to fetch') ? err.message : 'ইন্টারনেট সংযোগ বা সার্ভারে সমস্যা। একটু পরে আবার চেষ্টা করুন।'; })
                .then(function () { go.disabled = false; go.textContent = 'ট্র্যাক করুন'; });
        });
        var savedPhone = load('stz_track_phone'); if (savedPhone) panel.querySelector('#stzTwPhone').value = savedPhone;
    }
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
