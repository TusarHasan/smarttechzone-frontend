// ===== সাইটজুড়ে চ্যাট উইজেট =====
// টপ-রাইট কর্নারে ভাসমান "সাপোর্ট" বাটন (Super Admin/প্ল্যাটফর্ম চ্যাট) + product.html থেকে
// window.openVendorChat() কল করে ভেন্ডর চ্যাট খোলার সুযোগ — শুধু লগইন করা কাস্টমারদের জন্য।
// socket.io-client (CDN script) এই ফাইলের আগে লোড হওয়া লাগবে — customer-auth.js এর পরে, এই ফাইলটা।
(function () {
    // এই স্ক্রিপ্টটা root থেকে (chat-widget.js) নাকি সাবফোল্ডার থেকে (../chat-widget.js) লোড হয়েছে
    // সেটা নিজে থেকে বের করে নেয়, যাতে login.html রিডাইরেক্ট লিংক সব পেজেই সঠিক পথে যায়
    function getBasePath() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].getAttribute('src') || '';
            if (src.indexOf('chat-widget.js') !== -1) {
                return src.slice(0, src.lastIndexOf('chat-widget.js'));
            }
        }
        return '';
    }
    const BASE_PATH = getBasePath();

    let socket = null;
    let imgComposer = null; // ছবি পাঠানোর কম্পোজার (chat-images.js লোড হলে তৈরি হয়)
    let imgBtn = null;
    function loadImgLib(cb) {
        if (window.STZChatImages) return cb();
        const sc = document.createElement('script');
        sc.src = BASE_PATH + 'chat-images.js';
        sc.onload = cb;
        document.head.appendChild(sc);
    }
    let currentThread = null; // এখন প্যানেলে যে থ্রেড খোলা আছে
    let panelOpen = false;

    function isLoggedIn() {
        return !!(typeof getCustomerToken === 'function' && getCustomerToken() && typeof getCustomerData === 'function' && getCustomerData());
    }

    function goToLogin() {
        const redirect = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
        window.location.href = `${BASE_PATH}login.html?redirect=${redirect}`;
    }

    // ===================== UI তৈরি =====================
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes stzSway {
                0%, 100% { transform: rotate(-7deg); }
                50% { transform: rotate(7deg); }
            }
            /* আগে Netlify হোস্টিং "Powered by Netlify" ব্যাজ bottom-right কোণায় বসিয়ে দিচ্ছিল
               বলে চ্যাট বাটনের bottom অফসেট বাড়িয়ে (86px/74px) রাখা হয়েছিল, যাতে বাটনটা ব্যাজের
               সাথে না মিলে যায়। এখন Netlify Project configuration থেকে সেই ব্যাজ বন্ধ করে দেওয়া
               হয়েছে (আর দেখা যায় না), তাই বাটনটা আবার আগের জায়গায় (নিচে) ফিরিয়ে আনা হলো। */
            #stzChatFab {
                position: fixed; bottom: 22px; right: 22px; z-index: 9998;
                width: 64px; height: 64px; padding: 0;
                background: transparent; border: none; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                filter: drop-shadow(0 6px 14px rgba(0,0,0,0.3));
                transform-origin: 50% 100%;
                animation: stzSway 2.4s ease-in-out infinite;
            }
            #stzChatFab img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; }
            #stzChatFab:hover {
                animation-play-state: paused;
                filter: drop-shadow(0 10px 20px rgba(0,0,0,0.38));
            }
            @media (prefers-reduced-motion: reduce) {
                #stzChatFab { animation: none; }
            }
            #stzChatFab .stz-dot {
                position: absolute; top: -2px; right: 4px; width: 13px; height: 13px;
                background: #ffd400; border: 2px solid #fff; border-radius: 50%; display: none;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            @media (max-width: 700px) {
                #stzChatFab { bottom: 16px; right: 14px; width: 52px; height: 52px; }
            }
            #stzChatPanel {
                position: fixed; bottom: 96px; right: 18px; z-index: 9999;
                width: 368px; max-width: calc(100vw - 24px); height: 540px; max-height: calc(100vh - 130px);
                background: #fff; border-radius: 18px; overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 6px 20px rgba(0,0,0,0.12);
                display: flex; flex-direction: column; font-family: Arial, sans-serif;
                transform-origin: bottom right;
                transform: scale(0.9) translateY(16px); opacity: 0; visibility: hidden; pointer-events: none;
                transition: transform .2s cubic-bezier(.2,.9,.3,1.2), opacity .18s ease, visibility 0s linear .2s;
            }
            #stzChatPanel.open {
                transform: scale(1) translateY(0); opacity: 1; visibility: visible; pointer-events: auto;
                transition: transform .2s cubic-bezier(.2,.9,.3,1.2), opacity .18s ease, visibility 0s;
            }
            @media (max-width: 700px) {
                #stzChatPanel {
                    bottom: 0; right: 0; left: 0; width: 100%; max-width: 100%;
                    height: 78vh; max-height: 78vh; border-radius: 18px 18px 0 0;
                    transform-origin: bottom center; transform: scale(0.96) translateY(24px);
                }
                #stzChatPanel.open { transform: scale(1) translateY(0); }
            }
            #stzChatPanelHeader {
                background: linear-gradient(120deg, #ff5c46, #d6321f); color: #fff; padding: 16px 18px; font-weight: bold; font-size: 14.5px;
                display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
            }
            #stzChatPanelHeader small { display: block; font-weight: normal; font-size: 11px; opacity: .9; margin-top: 3px; }
            #stzChatClose {
                background: rgba(255,255,255,0.18); border: none; color: #fff; font-size: 18px; cursor: pointer;
                line-height: 1; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center; transition: background .15s;
            }
            #stzChatClose:hover { background: rgba(255,255,255,0.32); }
            #stzChatMessages { flex: 1; overflow-y: auto; padding: 14px; background: #f6f7f9; }
            .stz-msg { max-width: 80%; margin-bottom: 10px; padding: 9px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; word-wrap: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
            .stz-msg.customer { background: #e74c3c; color: #fff; margin-left: auto; border-bottom-right-radius: 4px; }
            .stz-msg.admin { background: #fff; color: #333; border: 1px solid #ececec; margin-right: auto; border-bottom-left-radius: 4px; }
            .stz-msg-time { font-size: 10px; opacity: .7; margin-top: 3px; }

            /* অ্যাডমিন Message Buyer থেকে দারাজ-স্টাইল অর্ডার-কার্ড পাঠালে — সাধারণ টেক্সটের বদলে
               ছবি/নাম/দাম সহ একটা মিনি প্রোডাক্ট কার্ড, এই ফ্লোটিং উইজেটেই সবচেয়ে বেশি দেখা হয় */
            .stz-msg.order-card-bubble { padding: 0; overflow: hidden; max-width: 88%; }
            .stz-oc-body { display: flex; gap: 9px; padding: 10px 11px 7px; }
            .stz-oc-body img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; flex-shrink: 0; background: #fafafa; }
            .stz-oc-info { min-width: 0; flex: 1; }
            .stz-oc-name { font-size: 12px; font-weight: 700; color: #222; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; }
            .stz-oc-meta { font-size: 10.5px; color: #888; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .stz-oc-price { font-size: 12px; font-weight: 800; color: #e74c3c; margin-top: 3px; }
            .stz-oc-footer { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 6px 11px; background: #fafafa; border-top: 1px solid #f0f0f0; }
            .stz-oc-order-no { font-size: 10.5px; color: #777; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .stz-oc-track-link { font-size: 10.5px; color: #fff; background: #e74c3c; padding: 3px 9px; border-radius: 10px; font-weight: 700; text-decoration: none; white-space: nowrap; }
            .stz-msg.order-card-bubble .stz-msg-time { padding: 0 11px 7px; opacity: .55; }
            #stzChatEmpty { color: #999; font-size: 13px; text-align: center; margin-top: 30px; }
            #stzChatInputRow { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: #fff; flex-shrink: 0; }
            #stzChatInput { flex: 1; border: 1px solid #e2e2e2; border-radius: 22px; padding: 10px 15px; font-size: 13.5px; font-family: Arial, sans-serif; background: #f6f7f9; }
            #stzChatInput:focus { outline: none; border-color: #e74c3c; background: #fff; }
            #stzChatSend {
                background: linear-gradient(145deg, #ff5c46, #e0301e); color: #fff; border: none; border-radius: 50%;
                width: 40px; height: 40px; cursor: pointer; font-size: 15px; flex-shrink: 0;
                box-shadow: 0 3px 8px rgba(231,76,60,0.35);
            }
            #stzChatSend:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
            #stzChatNotif { display: none; flex-shrink: 0; padding: 8px 14px; background: #fff7f5; border-bottom: 1px solid #f3dcd8; font-size: 12px; color: #7a3b32; align-items: center; justify-content: space-between; gap: 8px; }
            #stzChatNotif.show { display: flex; }
            #stzChatNotif button { background: #e74c3c; color: #fff; border: none; border-radius: 14px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
            #stzChatNotif button.link { background: none; color: #b0382a; text-decoration: underline; padding: 0; font-weight: 600; }
            #stzChatNotif button:disabled { opacity: .6; cursor: default; }
        `;
        document.head.appendChild(style);
    }

    function injectDom() {
        const fab = document.createElement('button');
        fab.id = 'stzChatFab';
        fab.title = 'Smart Tech Zone সাপোর্টের সাথে চ্যাট করুন';
        fab.innerHTML = `<img src="${BASE_PATH}images/chat-icon.png" alt="চ্যাট"><span class="stz-dot" id="stzChatDot"></span>`;
        fab.onclick = function () { openPlatformChat(); };
        document.body.appendChild(fab);

        const panel = document.createElement('div');
        panel.id = 'stzChatPanel';
        panel.innerHTML = `
            <div id="stzChatPanelHeader">
                <div>
                    <span id="stzChatTitle">Smart Tech Zone সাপোর্ট</span>
                    <small id="stzChatSubtitle"></small>
                </div>
                <button id="stzChatClose">×</button>
            </div>
            <div id="stzChatNotif"></div>
            <div id="stzChatMessages"><div id="stzChatEmpty">মেসেজ লোড হচ্ছে...</div></div>
            <div class="stzimg-strip" id="stzChatImgStrip"></div>
            <div id="stzChatInputRow">
                <input type="text" id="stzChatInput" placeholder="মেসেজ লিখুন..." maxlength="2000">
                <button id="stzChatSend">➤</button>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('stzChatClose').onclick = closePanel;
        document.getElementById('stzChatSend').onclick = sendMessage;

        // ছবি পাঠানোর বাটন (সর্বোচ্চ ৪টা) — শেয়ার্ড chat-images.js এই ফাইলের পাশ থেকেই নিজে লোড হয়, তাই
        // যে পেজে চ্যাট উইজেট আছে সেখানে আলাদা script ট্যাগ বসাতে হয় না
        loadImgLib(function () {
            imgComposer = STZChatImages.create({
                strip: document.getElementById('stzChatImgStrip'),
                uploadUrl: `${BACKEND_URL}/api/chat/upload`,
                fetcher: function (url, init) {
                    const token = typeof getCustomerToken === 'function' ? getCustomerToken() : '';
                    return fetch(url, Object.assign({}, init, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
                }
            });
            const b = STZChatImages.buildButton(function (files) { imgComposer.add(files); });
            imgBtn = b.btn;
            const row = document.getElementById('stzChatInputRow');
            row.insertBefore(b.btn, document.getElementById('stzChatInput'));
            row.appendChild(b.input);
            STZChatImages.bindLightbox(document.getElementById('stzChatMessages'));
        });
        document.getElementById('stzChatInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') sendMessage();
        });
    }

    function openPanel() {
        panelOpen = true;
        document.getElementById('stzChatPanel').classList.add('open');
        document.getElementById('stzChatDot').style.display = 'none';
        refreshNotifStrip();
    }
    function closePanel() {
        panelOpen = false;
        document.getElementById('stzChatPanel').classList.remove('open');
    }

    function escapeHtml(s) {
        return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function timeLabel(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    }

    function fmtPrice(n) {
        return Number(n || 0).toLocaleString('en-US');
    }
    function resolveImgSrc(url) {
        if (!url) return '';
        return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    }

    // সাধারণ টেক্সট বা অ্যাডমিনের পাঠানো রিচ অর্ডার-কার্ড — দুটোর জন্যই একই জায়গা থেকে HTML বানানো
    // হয় (renderMessages আর appendMessage দুই জায়গাতেই ব্যবহার হয়)
    function messageBubbleHtml(m) {
        if (m.type === 'order_card' && m.orderCard) {
            const c = m.orderCard;
            const img = resolveImgSrc(c.itemImage);
            return `
                <div class="stz-oc-body">
                    ${img ? `<img src="${img}" alt="" onerror="this.style.display='none'">` : ''}
                    <div class="stz-oc-info">
                        <div class="stz-oc-name">${escapeHtml(c.itemName)}</div>
                        ${c.itemVariant ? `<div class="stz-oc-meta">Color Family: ${escapeHtml(c.itemVariant)}</div>` : ''}
                        <div class="stz-oc-price">৳${fmtPrice(c.itemPrice)} × ${c.itemQuantity}${c.extraItemsCount > 0 ? ` <span style="color:#999;font-weight:400;">+${c.extraItemsCount} আরো</span>` : ''}</div>
                    </div>
                </div>
                <div class="stz-oc-footer">
                    <span class="stz-oc-order-no">অর্ডার #${escapeHtml(c.orderNumber)} · মোট ৳${fmtPrice(c.totalPrice)}</span>
                    <a class="stz-oc-track-link" href="${BASE_PATH}track.html?order=${encodeURIComponent(c.orderNumber)}">ট্র্যাক করুন</a>
                </div>
                <div class="stz-msg-time">${timeLabel(m.createdAt)}</div>
            `;
        }
        if (m.type === 'product_card' && m.productCard) {
            const c = m.productCard;
            const img = resolveImgSrc(c.image);
            return `
                <div class="stz-oc-body">
                    ${img ? `<img src="${img}" alt="" onerror="this.style.display='none'">` : ''}
                    <div class="stz-oc-info">
                        <div class="stz-oc-name">${escapeHtml(c.name)}</div>
                        ${c.variantLabel ? `<div class="stz-oc-meta">${escapeHtml(c.variantLabel)}</div>` : ''}
                        <div class="stz-oc-price">৳${fmtPrice(c.price)}${c.originalPrice > c.price ? ` <span style="color:#aaa;font-weight:400;text-decoration:line-through;">৳${fmtPrice(c.originalPrice)}</span>` : ''}</div>
                    </div>
                </div>
                <div class="stz-oc-footer">
                    <span class="stz-oc-order-no">প্রোডাক্ট</span>
                    <a class="stz-oc-track-link" href="${escapeHtml(c.path || '#')}">প্রোডাক্ট দেখুন</a>
                </div>
                <div class="stz-msg-time">${timeLabel(m.createdAt)}</div>
            `;
        }
        const grid = window.STZChatImages ? STZChatImages.gridHtml(m.images, resolveImgSrc) : '';
        return `${grid}${m.text ? `<div>${escapeHtml(m.text)}</div>` : ''}<div class="stz-msg-time">${timeLabel(m.createdAt)}</div>`;
    }
    function messageBubbleClass(m) {
        return `stz-msg ${m.senderType}${(m.type === 'order_card' || m.type === 'product_card') ? ' order-card-bubble' : ''}`;
    }

    function renderMessages(messages) {
        const wrap = document.getElementById('stzChatMessages');
        if (!messages || messages.length === 0) {
            wrap.innerHTML = '<div id="stzChatEmpty">এখনো কোনো মেসেজ নেই — নিচে লিখে শুরু করুন।</div>';
            return;
        }
        wrap.innerHTML = messages.map((m) => `
            <div class="${messageBubbleClass(m)}">
                ${messageBubbleHtml(m)}
            </div>
        `).join('');
        wrap.scrollTop = wrap.scrollHeight;
    }

    function appendMessage(m) {
        const wrap = document.getElementById('stzChatMessages');
        const empty = document.getElementById('stzChatEmpty');
        if (empty) empty.remove();
        const div = document.createElement('div');
        div.className = messageBubbleClass(m);
        div.innerHTML = messageBubbleHtml(m);
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
    }

    // ===================== API কল =====================
    async function openThread(type, productId, productName) {
        const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads`, {
            method: 'POST',
            body: JSON.stringify({ type, productId: productId || undefined, productName: productName || undefined })
        });
        if (!res.ok) throw new Error('থ্রেড খোলা যায়নি');
        const data = await res.json();
        return data.thread;
    }

    async function loadMessages(threadId) {
        const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads/${threadId}/messages`);
        if (!res.ok) throw new Error('মেসেজ লোড করা যায়নি');
        return res.json();
    }

    async function markRead(threadId) {
        try { await customerAuthFetch(`${BACKEND_URL}/api/chat/threads/${threadId}/read`, { method: 'POST' }); } catch (e) { /* নন-ক্রিটিক্যাল */ }
    }

    async function openPlatformChat() {
        if (!isLoggedIn()) return goToLogin();
        openPanel();
        document.getElementById('stzChatTitle').textContent = 'Smart Tech Zone সাপোর্ট';
        document.getElementById('stzChatSubtitle').textContent = '';
        document.getElementById('stzChatMessages').innerHTML = '<div id="stzChatEmpty">মেসেজ লোড হচ্ছে...</div>';
        try {
            currentThread = await openThread('platform');
            if (imgComposer) imgComposer.clear();
            const messages = await loadMessages(currentThread._id);
            renderMessages(messages);
            markRead(currentThread._id);
        } catch (e) {
            document.getElementById('stzChatMessages').innerHTML = '<div id="stzChatEmpty">চ্যাট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</div>';
        }
    }

    // product.html-এর "চ্যাট করুন" বাটন থেকে কল হয়
    window.openVendorChat = async function (productId, productName) {
        if (!isLoggedIn()) return goToLogin();
        openPanel();
        document.getElementById('stzChatTitle').textContent = 'Smart Tech Zone (ভেন্ডর)';
        document.getElementById('stzChatSubtitle').textContent = productName ? `প্রসঙ্গ: ${productName}` : '';
        document.getElementById('stzChatMessages').innerHTML = '<div id="stzChatEmpty">মেসেজ লোড হচ্ছে...</div>';
        try {
            currentThread = await openThread('vendor', productId, productName);
            if (imgComposer) imgComposer.clear();
            const messages = await loadMessages(currentThread._id);
            renderMessages(messages);
            markRead(currentThread._id);
        } catch (e) {
            document.getElementById('stzChatMessages').innerHTML = '<div id="stzChatEmpty">চ্যাট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</div>';
        }
    };

    async function sendMessage() {
        const input = document.getElementById('stzChatInput');
        const text = input.value.trim();
        const hasImages = !!(imgComposer && imgComposer.count() > 0);
        if ((!text && !hasImages) || !currentThread) return;
        const sendBtn = document.getElementById('stzChatSend');
        sendBtn.disabled = true;
        if (imgBtn) imgBtn.disabled = true;
        try {
            const images = hasImages ? await imgComposer.upload() : [];
            const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads/${currentThread._id}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text, images })
            });
            if (res.ok) {
                const data = await res.json();
                appendMessage(data.message);
                input.value = '';
                if (imgComposer) imgComposer.clear();
            } else if (imgComposer) {
                const d = await res.json().catch(() => ({}));
                imgComposer.setNote(d.error || 'মেসেজ পাঠানো যায়নি');
            }
        } catch (e) {
            if (imgComposer) imgComposer.setNote(e.message || 'মেসেজ পাঠানো যায়নি');
        }
        sendBtn.disabled = false;
        if (imgBtn) imgBtn.disabled = false;
        input.focus();
    }

    // ===================== Browser push notifications =====================
    // কাস্টমার সাইটে না থাকলে (ট্যাব বন্ধ) অ্যাডমিনের রিপ্লাই ব্রাউজার নোটিফিকেশনে আসে। চ্যাট প্যানেলের ওপরে
    // "Turn on notifications" বাটনে চাপলে তবেই ব্রাউজার Allow জিজ্ঞেস করে (জোর করে পপআপ আসে না)।
    // সার্ভারে VAPID কী সেট না থাকলে এই স্ট্রিপ কিছুই দেখায় না।
    let pushPublicKey = null;
    function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
    function b64ToU8(b64) {
        const pad = '='.repeat((4 - b64.length % 4) % 4);
        const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }
    async function pushServerKey() {
        if (pushPublicKey !== null) return pushPublicKey;
        try {
            const r = await fetch(`${BACKEND_URL}/api/chat/push/public-key`);
            const d = await r.json();
            pushPublicKey = d.enabled ? d.publicKey : '';
        } catch (e) { pushPublicKey = ''; }
        return pushPublicKey;
    }
    async function currentPushSub() {
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            return reg ? await reg.pushManager.getSubscription() : null;
        } catch (e) { return null; }
    }
    async function savePushSub(sub) {
        await customerAuthFetch(`${BACKEND_URL}/api/chat/push/subscribe`, { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
    }
    async function enablePush() {
        const key = await pushServerKey();
        if (!key) return;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
        await savePushSub(sub);
    }
    async function disablePush() {
        const sub = await currentPushSub();
        if (!sub) return;
        try { await customerAuthFetch(`${BACKEND_URL}/api/chat/push/unsubscribe`, { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch (e) { /* নন-ক্রিটিক্যাল */ }
        try { await sub.unsubscribe(); } catch (e) { /* নন-ক্রিটিক্যাল */ }
    }
    async function refreshNotifStrip() {
        const box = document.getElementById('stzChatNotif');
        if (!box) return;
        box.classList.remove('show');
        box.innerHTML = '';
        if (!pushSupported() || !isLoggedIn()) return;
        if (!(await pushServerKey())) return;
        if (Notification.permission === 'denied') {
            box.innerHTML = '<span>Notifications are blocked in your browser settings.</span>';
            box.classList.add('show');
            return;
        }
        const sub = Notification.permission === 'granted' ? await currentPushSub() : null;
        if (sub) {
            box.innerHTML = '<span>&#128276; Notifications are on</span><button type="button" class="link" id="stzNotifOff">Turn off</button>';
            document.getElementById('stzNotifOff').onclick = async function () { this.disabled = true; await disablePush(); refreshNotifStrip(); };
        } else {
            box.innerHTML = '<span>Get notified when we reply</span><button type="button" id="stzNotifOn">Turn on notifications</button>';
            document.getElementById('stzNotifOn').onclick = async function () {
                this.disabled = true;
                try { await enablePush(); } catch (e) { /* ব্যর্থ হলে বাটন আবার আসবে */ }
                refreshNotifStrip();
            };
        }
        box.classList.add('show');
    }
    // একই ব্রাউজারে অন্য কাস্টমার লগইন করলে (বা সাবস্ক্রিপশন বদলালে) সার্ভারের রেকর্ড ঠিক রাখা
    async function syncPushSubscription() {
        if (!pushSupported() || Notification.permission !== 'granted') return;
        const sub = await currentPushSub();
        if (sub) { try { await savePushSub(sub); } catch (e) { /* নন-ক্রিটিক্যাল */ } }
    }
    // লগআউটের আগে customer-auth.js এটা ডাকে — লগআউট করা ব্রাউজারে আর অন্যের মেসেজ প্রিভিউ আসবে না
    window.stzChatBeforeLogout = async function () {
        if (!pushSupported()) return;
        await disablePush();
    };

    // ===================== রিয়েল-টাইম (Socket.io) =====================
    function connectSocket() {
        if (typeof io === 'undefined') return; // CDN স্ক্রিপ্ট লোড না হলে চ্যাট প্যানেল তবু কাজ করবে (শুধু রিয়েল-টাইম পুশ ছাড়া)
        const token = getCustomerToken();
        socket = io(BACKEND_URL, { auth: { token } });
        socket.on('chat:new', function (payload) {
            const msg = payload && payload.message;
            const thread = payload && payload.thread;
            if (!msg || !thread) return;
            if (panelOpen && currentThread && String(currentThread._id) === String(thread._id)) {
                appendMessage(msg);
                markRead(thread._id);
            } else {
                document.getElementById('stzChatDot').style.display = 'block';
            }
        });
    }

    async function seedUnreadBadge() {
        try {
            const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads`);
            if (!res.ok) return;
            const threads = await res.json();
            if (threads.some((t) => t.unreadByCustomer)) {
                document.getElementById('stzChatDot').style.display = 'block';
            }
        } catch (e) { /* নন-ক্রিটিক্যাল */ }
    }

    function init() {
        if (typeof BACKEND_URL === 'undefined') return; // config.js লোড না থাকলে চ্যাট উইজেট চুপচাপ কিছু করবে না
        injectStyles();
        injectDom();
        if (isLoggedIn()) {
            connectSocket();
            seedUnreadBadge();
            syncPushSubscription();
            // পুশ নোটিফিকেশনে ট্যাপ করলে /account.html?openChat=1 — সরাসরি সাপোর্ট চ্যাট খুলে দেয়
            if (new URLSearchParams(window.location.search).get('openChat') === '1') openPlatformChat();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
