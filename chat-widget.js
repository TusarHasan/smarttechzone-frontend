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
            <div id="stzChatMessages"><div id="stzChatEmpty">মেসেজ লোড হচ্ছে...</div></div>
            <div id="stzChatInputRow">
                <input type="text" id="stzChatInput" placeholder="মেসেজ লিখুন..." maxlength="2000">
                <button id="stzChatSend">➤</button>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('stzChatClose').onclick = closePanel;
        document.getElementById('stzChatSend').onclick = sendMessage;
        document.getElementById('stzChatInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') sendMessage();
        });
    }

    function openPanel() {
        panelOpen = true;
        document.getElementById('stzChatPanel').classList.add('open');
        document.getElementById('stzChatDot').style.display = 'none';
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
        return `<div>${escapeHtml(m.text)}</div><div class="stz-msg-time">${timeLabel(m.createdAt)}</div>`;
    }
    function messageBubbleClass(m) {
        return `stz-msg ${m.senderType}${m.type === 'order_card' ? ' order-card-bubble' : ''}`;
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
        if (!text || !currentThread) return;
        const sendBtn = document.getElementById('stzChatSend');
        sendBtn.disabled = true;
        try {
            const res = await customerAuthFetch(`${BACKEND_URL}/api/chat/threads/${currentThread._id}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                const data = await res.json();
                appendMessage(data.message);
                input.value = '';
            }
        } catch (e) { /* নেটওয়ার্ক সমস্যা হলে চুপচাপ — ইউজার আবার Send চাপতে পারবে */ }
        sendBtn.disabled = false;
        input.focus();
    }

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
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
