// সার্চ বার — index.html, brands/*.html, models/model.html সব পেজে navbar এর সার্চ বক্স সক্রিয় করে
//   • ফাঁকা বা ১ অক্ষর: আগের সার্চ হিস্ট্রি (Daraz-এর মতো)
//   • ২+ অক্ষর: লাইভ সাজেশন (প্রোডাক্ট + জনপ্রিয় সার্চ + "আপনি কি ... খুঁজছেন?"), কীবোর্ডে ↑ ↓ Enter Esc চলে
(function () {
    const HISTORY_KEY = 'stz_search_history';
    const MAX_HISTORY = 10;
    const API = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : '';

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveHistoryList(list) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* নন-ক্রিটিক্যাল */ }
    }
    function addToHistory(term) {
        const clean = (term || '').trim();
        if (!clean) return;
        let list = getHistory().filter(t => t.toLowerCase() !== clean.toLowerCase());
        list.unshift(clean);
        if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
        saveHistoryList(list);
    }
    function clearHistory() { saveHistoryList([]); }

    function escapeHtml(str) {
        return (str || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    // সার্চের শব্দগুলো লেখার মধ্যে হাইলাইট (আগে escape, তারপর <mark>)
    function highlight(text, q) {
        const words = String(q || '').toLowerCase().split(/[\s\-_,+./]+/).filter(w => w.length >= 2).slice(0, 6)
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (!words.length) return escapeHtml(text);
        const re = new RegExp('(' + words.join('|') + ')', 'ig');
        return String(text || '').split(re).map((part, i) => (i % 2 ? '<mark>' + escapeHtml(part) + '</mark>' : escapeHtml(part))).join('');
    }
    function slugifyProductName(name) {
        let s = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (s.length > 70) { const cut = s.slice(0, 70); const d = cut.lastIndexOf('-'); s = d > 20 ? cut.slice(0, d) : cut; }
        return s || 'product';
    }
    function imgUrl(u) {
        if (!u) return 'https://via.placeholder.com/60';
        const abs = u.startsWith('http') ? u : API + u;
        return (typeof stzImg === 'function') ? stzImg(abs, 80, 80) : abs;
    }

    function initSearchBar() {
        const bar = document.querySelector('.search-bar');
        if (!bar) return;
        const input = bar.querySelector('input');
        const button = bar.querySelector('button');
        if (!input || !button) return;

        const inSubfolder = window.location.pathname.includes('/brands/') || window.location.pathname.includes('/models/');
        const searchPage = inSubfolder ? '../search.html' : 'search.html';

        if (window.location.pathname.endsWith('search.html')) {
            const params = new URLSearchParams(window.location.search);
            const currentQuery = params.get('q');
            if (currentQuery) input.value = currentQuery;
        }
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('enterkeyhint', 'search');

        let dropdown = null;
        let rows = [];       // বর্তমানে দেখানো ক্লিকযোগ্য সারি: { el, run }
        let active = -1;
        let timer = null, ctrl = null, reqId = 0;

        function ensureDropdown() {
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.className = 'stz-search-history-dropdown';
                bar.appendChild(dropdown);
            }
            return dropdown;
        }
        function hideDropdown() { if (dropdown) dropdown.style.display = 'none'; active = -1; }
        function setActive(i) {
            rows.forEach((r, k) => r.el.classList.toggle('stz-active', k === i));
            active = i;
            if (rows[i] && rows[i].el.scrollIntoView) rows[i].el.scrollIntoView({ block: 'nearest' });
        }
        // সারিতে mousedown-এ preventDefault: ক্লিকের সময় input blur হয়ে ড্রপডাউন যেন লুকিয়ে না যায়
        function bindRows() {
            rows = [];
            dropdown.querySelectorAll('[data-run]').forEach(el => {
                const kind = el.getAttribute('data-run');
                const val = el.getAttribute('data-val') || '';
                const run = kind === 'url' ? () => { window.location.href = val; } : () => runSearch(val);
                rows.push({ el, run });
                el.addEventListener('mousedown', function (e) { e.preventDefault(); run(); });
            });
            active = -1;
        }

        // ---- হিস্ট্রি ----
        function showHistory() {
            const history = getHistory();
            ensureDropdown();
            if (!history.length) { dropdown.innerHTML = ''; dropdown.style.display = 'none'; rows = []; return; }
            dropdown.innerHTML = `
                <div class="stz-sh-header"><span>Search History</span><span class="stz-sh-clear">CLEAR</span></div>
                ${history.map(term => `<div class="stz-sh-item" data-run="q" data-val="${escapeHtml(term)}">${escapeHtml(term)}</div>`).join('')}`;
            const clearBtn = dropdown.querySelector('.stz-sh-clear');
            clearBtn.addEventListener('mousedown', function (e) { e.preventDefault(); clearHistory(); showHistory(); });
            bindRows();
            dropdown.style.display = 'block';
        }

        // ---- লাইভ সাজেশন ----
        async function fetchSuggest(q) {
            const my = ++reqId;
            if (ctrl) { try { ctrl.abort(); } catch (e) { } }
            ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            try {
                const res = await fetch(`${API}/api/search/suggest?q=${encodeURIComponent(q)}`, ctrl ? { signal: ctrl.signal } : {});
                if (!res.ok) throw new Error('bad');
                const d = await res.json();
                if (my !== reqId || input.value.trim() !== q) return; // পুরনো উত্তর বাদ
                renderSuggest(q, d);
            } catch (e) { /* চুপচাপ — ড্রপডাউন যেমন ছিল তেমন */ }
        }
        function renderSuggest(q, d) {
            ensureDropdown();
            const items = d.items || [], queries = d.queries || [];
            let html = '';
            if (d.didYouMean && d.didYouMean !== q.toLowerCase()) {
                html += `<div class="stz-ss-dym" data-run="q" data-val="${escapeHtml(d.didYouMean)}">আপনি কি খুঁজছেন: <b>${escapeHtml(d.didYouMean)}</b>?</div>`;
            }
            queries.forEach(t => {
                html += `<div class="stz-ss-q" data-run="q" data-val="${escapeHtml(t)}"><span class="stz-ss-qi">🔍</span>${highlight(t, q)}</div>`;
            });
            items.forEach(p => {
                const href = `/product/${slugifyProductName(p.name)}-i${p.id}`;
                html += `<div class="stz-ss-p" data-run="url" data-val="${escapeHtml(href)}">
                    <img src="${escapeHtml(imgUrl(p.image))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                    <div class="stz-ss-t"><div class="stz-ss-n">${highlight(p.name, q)}</div>
                    <div class="stz-ss-pr">৳ ${Number(p.price) || 0}${p.inStock === false ? ' <span class="stz-ss-oos">স্টক নেই</span>' : ''}</div></div></div>`;
            });
            if (!items.length && !queries.length && !d.didYouMean) {
                html += `<div class="stz-ss-none">"${escapeHtml(q)}" এর জন্য কিছু পাওয়া যায়নি</div>`;
            }
            if (d.total > items.length || !items.length) {
                html += `<div class="stz-ss-all" data-run="q" data-val="${escapeHtml(q)}">"${escapeHtml(q)}" এর সব ফলাফল দেখুন${d.total ? ' (' + d.total + ')' : ''} →</div>`;
            }
            dropdown.innerHTML = html;
            bindRows();
            dropdown.style.display = 'block';
        }

        function onInput() {
            clearTimeout(timer);
            const q = input.value.trim();
            if (q.length < 2) { reqId++; showHistory(); return; }
            timer = setTimeout(() => fetchSuggest(q), 180);
        }

        function runSearch(term) {
            const q = (term !== undefined ? term : input.value).trim();
            if (!q) return;
            addToHistory(q);
            hideDropdown();
            window.location.href = `${searchPage}?q=${encodeURIComponent(q)}`;
        }

        input.addEventListener('focus', function () {
            if (input.value.trim().length >= 2) onInput(); else showHistory();
        });
        input.addEventListener('input', onInput);
        input.addEventListener('blur', function () { setTimeout(hideDropdown, 150); });
        button.addEventListener('click', () => runSearch());
        input.addEventListener('keydown', function (e) {
            const open = dropdown && dropdown.style.display === 'block' && rows.length;
            if (e.key === 'ArrowDown' && open) { e.preventDefault(); setActive((active + 1) % rows.length); }
            else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setActive(active <= 0 ? rows.length - 1 : active - 1); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (open && active >= 0 && rows[active]) rows[active].run(); else runSearch();
            }
            else if (e.key === 'Escape') { hideDropdown(); }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearchBar);
    } else {
        initSearchBar();
    }
})();
