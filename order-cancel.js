// কাস্টমারের নিজে অর্ডার ক্যান্সেল করার পপআপ (Daraz-এর "Request Cancellation"-এর মতো)।
// ব্যবহার: STZCancel.open({ mode: 'account', orderId, orderNumber, items, onDone })
//          STZCancel.open({ mode: 'track', phone, orderNumber, items, onDone })
// account = লগইন করা কাস্টমার (customerAuthFetch), track = ট্র্যাকিং পেজে ফোন + অর্ডার নম্বর দিয়ে।
// কখন ক্যান্সেল করা যায় সেটা সার্ভার ঠিক করে (canCancel ফ্ল্যাগ ও চূড়ান্ত যাচাই), এই ফাইল শুধু UI।
(function () {
    'use strict';

    // কী-গুলো সার্ভারের (routes/orders.js CUSTOMER_CANCEL_REASONS) সাথে হুবহু মিলতে হবে
    var REASONS = [
        ['more_items', 'আরও বা অন্য আইটেম নিয়ে নতুন অর্ডার দিতে চাই'],
        ['delivery_slow', 'ডেলিভারির সময় অনেক বেশি'],
        ['duplicate', 'ডুপ্লিকেট অর্ডার'],
        ['change_address', 'ডেলিভারি ঠিকানা বদলাতে চাই'],
        ['shipping_cost', 'ডেলিভারি চার্জ বেশি'],
        ['dont_want', 'এই অর্ডার আর চাই না'],
        ['alternative', 'অন্য প্রোডাক্ট বেছে নিয়েছি'],
        ['cheaper', 'অন্য জায়গায় কম দামে পেয়েছি'],
        ['other', 'অন্য কারণ']
    ];

    var CSS = '' +
        '.stzc-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:16px;z-index:10001;font-family:Arial,sans-serif}' +
        '.stzc-bg.open{display:flex}' +
        '.stzc-box{background:#fff;border-radius:12px;max-width:480px;width:100%;max-height:92vh;overflow-y:auto;padding:20px 20px 16px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
        '.stzc-box h3{margin:0 0 4px;font-size:17px;color:#222}' +
        '.stzc-sub{font-size:13px;color:#777;margin:0 0 12px}' +
        '.stzc-items{border:1px solid #eee;border-radius:8px;padding:6px 10px;margin-bottom:14px;max-height:190px;overflow-y:auto}' +
        '.stzc-item{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333}' +
        '.stzc-item:last-child{border-bottom:none}' +
        '.stzc-item img{width:38px;height:38px;object-fit:cover;border-radius:4px;flex:none;background:#f3f3f3}' +
        '.stzc-item .nm{flex:1;min-width:0;line-height:1.35}' +
        '.stzc-item .qt{color:#888;flex:none}' +
        '.stzc-box label{display:block;font-size:13px;font-weight:bold;color:#333;margin:12px 0 6px}' +
        '.stzc-box label .rq{color:#e74c3c}' +
        '.stzc-box select,.stzc-box textarea{width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:6px;padding:10px;font-size:14px;font-family:inherit;background:#fff}' +
        '.stzc-box textarea{min-height:64px;resize:vertical}' +
        '.stzc-warn{font-size:12.5px;color:#a15c00;background:#fff7e6;border:1px solid #ffe2a8;border-radius:6px;padding:8px 10px;margin-top:12px}' +
        '.stzc-err{color:#e74c3c;font-size:13px;margin-top:10px;min-height:0}' +
        '.stzc-row{display:flex;gap:8px;margin-top:14px}' +
        '.stzc-btn{flex:1;padding:11px 12px;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;border:1.5px solid transparent;font-family:inherit}' +
        '.stzc-btn.go{background:#e74c3c;color:#fff}' +
        '.stzc-btn.go:disabled{opacity:.55;cursor:not-allowed}' +
        '.stzc-btn.back{background:#fff;color:#555;border-color:#ccc}' +
        '.stzc-done{text-align:center;padding:10px 4px}' +
        '.stzc-done .ic{width:46px;height:46px;border-radius:50%;background:#e8f7ee;color:#1e9e55;font-size:26px;line-height:46px;margin:0 auto 10px}' +
        '.stzc-done p{font-size:14px;color:#333;margin:0 0 4px}' +
        '.order-cancel-btn,.stz-cancel-order-btn{display:inline-block;margin-top:10px;background:#fff;color:#e74c3c;border:1.5px solid #e74c3c;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer;font-family:inherit}' +
        '.order-cancel-btn:hover,.stz-cancel-order-btn:hover{background:#fdf6f5}';

    var state = null;
    var els = null;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function base() {
        return (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : '';
    }

    function imgUrl(u) {
        if (!u) return '';
        return /^https?:/.test(u) ? u : base() + u;
    }

    function build() {
        if (els) return;
        var st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);

        var bg = document.createElement('div');
        bg.className = 'stzc-bg';
        bg.setAttribute('role', 'dialog');
        bg.setAttribute('aria-modal', 'true');
        bg.setAttribute('aria-labelledby', 'stzcTitle');
        bg.innerHTML =
            '<div class="stzc-box">' +
              '<div id="stzcForm">' +
                '<h3 id="stzcTitle">অর্ডার ক্যান্সেল করুন / Request Cancellation</h3>' +
                '<p class="stzc-sub" id="stzcOrderNo"></p>' +
                '<div class="stzc-items" id="stzcItems"></div>' +
                '<label for="stzcReason">ক্যান্সেলের কারণ <span class="rq">*</span></label>' +
                '<select id="stzcReason"><option value="">কারণ বেছে নিন / Select a reason</option>' +
                REASONS.map(function (r) { return '<option value="' + r[0] + '">' + esc(r[1]) + '</option>'; }).join('') +
                '</select>' +
                '<label for="stzcComment">মন্তব্য (ঐচ্ছিক)</label>' +
                '<textarea id="stzcComment" maxlength="300" placeholder="চাইলে কারণ লিখুন"></textarea>' +
                '<div class="stzc-warn">অর্ডারের সব আইটেম একসাথে ক্যান্সেল হবে, আর ক্যান্সেল করার পর ফেরানো যাবে না। চাইলে নতুন করে অর্ডার করতে পারবেন।</div>' +
                '<div class="stzc-err" id="stzcErr" role="alert"></div>' +
                '<div class="stzc-row">' +
                  '<button type="button" class="stzc-btn back" id="stzcBack">ফিরে যান</button>' +
                  '<button type="button" class="stzc-btn go" id="stzcGo" disabled>ক্যান্সেল করুন</button>' +
                '</div>' +
              '</div>' +
              '<div id="stzcDone" class="stzc-done" style="display:none">' +
                '<div class="ic">&#10003;</div>' +
                '<p id="stzcDoneMsg"></p>' +
                '<div class="stzc-row"><button type="button" class="stzc-btn go" id="stzcOk">ঠিক আছে</button></div>' +
              '</div>' +
            '</div>';
        document.body.appendChild(bg);

        els = {
            bg: bg,
            form: bg.querySelector('#stzcForm'),
            done: bg.querySelector('#stzcDone'),
            orderNo: bg.querySelector('#stzcOrderNo'),
            items: bg.querySelector('#stzcItems'),
            reason: bg.querySelector('#stzcReason'),
            comment: bg.querySelector('#stzcComment'),
            err: bg.querySelector('#stzcErr'),
            go: bg.querySelector('#stzcGo'),
            back: bg.querySelector('#stzcBack'),
            ok: bg.querySelector('#stzcOk'),
            doneMsg: bg.querySelector('#stzcDoneMsg')
        };

        els.reason.addEventListener('change', function () {
            els.go.disabled = !els.reason.value;
            els.err.textContent = '';
        });
        els.back.addEventListener('click', close);
        bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && els.bg.classList.contains('open')) close(); });
        els.go.addEventListener('click', submit);
        els.ok.addEventListener('click', function () {
            var cb = state && state.onDone;
            close();
            if (typeof cb === 'function') cb();
        });
    }

    function close() {
        if (els) els.bg.classList.remove('open');
    }

    function open(opts) {
        build();
        state = opts || {};
        els.form.style.display = '';
        els.done.style.display = 'none';
        els.err.textContent = '';
        els.reason.value = '';
        els.comment.value = '';
        els.go.disabled = true;
        els.go.textContent = 'ক্যান্সেল করুন';
        els.orderNo.textContent = 'অর্ডার নাম্বার: ' + (state.orderNumber || '');
        var items = Array.isArray(state.items) ? state.items : [];
        els.items.style.display = items.length ? '' : 'none';
        els.items.innerHTML = items.map(function (i) {
            var im = imgUrl(i.image);
            return '<div class="stzc-item">' +
                (im ? '<img src="' + esc(im) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
                '<div class="nm">' + esc(i.name) + (i.variantLabel ? ' <span style="color:#888">(' + esc(i.variantLabel) + ')</span>' : '') + '</div>' +
                '<div class="qt">&times; ' + esc(i.quantity) + '</div></div>';
        }).join('');
        els.bg.classList.add('open');
        els.reason.focus();
    }

    async function submit() {
        if (!state || !els.reason.value) return;
        els.go.disabled = true;
        els.go.textContent = 'অপেক্ষা করুন...';
        els.err.textContent = '';
        try {
            var payload = { reason: els.reason.value, comment: els.comment.value.trim() };
            var res;
            if (state.mode === 'account') {
                res = await customerAuthFetch(base() + '/api/orders/' + encodeURIComponent(state.orderId) + '/customer-cancel', {
                    method: 'POST', body: JSON.stringify(payload)
                });
            } else {
                payload.phone = state.phone;
                payload.orderNumber = state.orderNumber;
                res = await fetch(base() + '/api/orders/customer-cancel-by-track', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
            }
            var data = {};
            try { data = await res.json(); } catch (e) {}
            if (!res.ok) throw new Error(data.error || 'ক্যান্সেল করা যায়নি।');
            els.doneMsg.textContent = data.message || 'আপনার অর্ডার ক্যান্সেল হয়েছে।';
            els.form.style.display = 'none';
            els.done.style.display = '';
        } catch (err) {
            els.err.textContent = (err instanceof TypeError)
                ? 'ইন্টারনেট সংযোগ বা সার্ভারে সমস্যা। একটু পরে আবার চেষ্টা করুন।'
                : err.message;
            els.go.disabled = !els.reason.value;
            els.go.textContent = 'ক্যান্সেল করুন';
        }
    }

    window.STZCancel = { open: open, close: close };
})();
