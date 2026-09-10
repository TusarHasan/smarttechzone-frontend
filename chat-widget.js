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
            #stzChatFab {
                position: fixed; top: 90px; right: 18px; z-index: 9998;
                width: 52px; height: 52px; border-radius: 50%;
                background: #e74c3c; color: #fff; border: none; cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.25); font-size: 24px;
                display: flex; align-items: center; justify-content: center;
            }
            #stzChatFab .stz-dot {
                position: absolute; top: 2px; right: 2px; width: 12px; height: 12px;
                background: #ffd400; border: 2px solid #fff; border-radius: 50%; display: none;
            }
            @media (max-width: 700px) {
                #stzChatFab { top: auto; bottom: 18px; right: 14px; width: 46px; height: 46px; font-size: 20px; }
            }
            #stzChatPanel {
                position: fixed; top: 0; right: -360px; width: 340px; max-width: 92vw; height: 100%;
                background: #fff; z-index: 9999; box-shadow: -2px 0 16px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; transition: right .25s ease;
                font-family: Arial, sans-serif;
            }
            #stzChatPanel.open { right: 0; }
            #stzChatPanelHeader {
                background: #e74c3c; color: #fff; padding: 14px 16px; font-weight: bold; font-size: 14px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #stzChatPanelHeader small { display: block; font-weight: normal; font-size: 11px; opacity: .9; margin-top: 2px; }
            #stzChatClose { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; line-height: 1; }
            #stzChatMessages { flex: 1; overflow-y: auto; padding: 12px; background: #f7f7f7; }
            .stz-msg { max-width: 80%; margin-bottom: 10px; padding: 8px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; word-wrap: break-word; }
            .stz-msg.customer { background: #e74c3c; color: #fff; margin-left: auto; border-bottom-right-radius: 3px; }
            .stz-msg.admin { background: #fff; color: #333; border: 1px solid #eee; margin-right: auto; border-bottom-left-radius: 3px; }
            .stz-msg-time { font-size: 10px; opacity: .7; margin-top: 3px; }
            #stzChatEmpty { color: #999; font-size: 13px; text-align: center; margin-top: 30px; }
            #stzChatInputRow { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eee; }
            #stzChatInput { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 9px 14px; font-size: 13.5px; font-family: Arial, sans-serif; }
            #stzChatSend { background: #e74c3c; color: #fff; border: none; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; font-size: 15px; flex-shrink: 0; }
            #stzChatSend:disabled { background: #ccc; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    function injectDom() {
        const fab = document.createElement('button');
        fab.id = 'stzChatFab';
        fab.title = 'Smart Tech Zone সাপোর্টের সাথে চ্যাট করুন';
        fab.innerHTML = '💬<span class="stz-dot" id="stzChatDot"></span>';
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

    function renderMessages(messages) {
        const wrap = document.getElementById('stzChatMessages');
        if (!messages || messages.length === 0) {
            wrap.innerHTML = '<div id="stzChatEmpty">এখনো কোনো মেসেজ নেই — নিচে লিখে শুরু করুন।</div>';
            return;
        }
        wrap.innerHTML = messages.map((m) => `
            <div class="stz-msg ${m.senderType}">
                <div>${escapeHtml(m.text)}</div>
                <div class="stz-msg-time">${timeLabel(m.createdAt)}</div>
            </div>
        `).join('');
        wrap.scrollTop = wrap.scrollHeight;
    }

    function appendMessage(m) {
        const wrap = document.getElementById('stzChatMessages');
        const empty = document.getElementById('stzChatEmpty');
        if (empty) empty.remove();
        const div = document.createElement('div');
        div.className = `stz-msg ${m.senderType}`;
        div.innerHTML = `<div>${escapeHtml(m.text)}</div><div class="stz-msg-time">${timeLabel(m.createdAt)}</div>`;
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
