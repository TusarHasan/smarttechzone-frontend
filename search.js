// সার্চ বার — index.html, brands/*.html, models/model.html সব পেজে navbar এর সার্চ বক্স সক্রিয় করে
(function () {
    // ===== সার্চ হিস্ট্রি (Daraz-এর মতো) — সার্চ বক্সে ক্লিক করলে আগের সার্চ করা টার্মগুলোর একটা
    // ড্রপডাউন দেখায়, ক্লিক করলে সরাসরি সেই টার্ম দিয়ে সার্চ হয়ে যায়। localStorage-এ ব্রাউজার-ভিত্তিক
    // সেভ থাকে (লগইন লাগে না, guest/customer সবার জন্যই কাজ করে)।
    const HISTORY_KEY = 'stz_search_history';
    const MAX_HISTORY = 10; // Daraz-এর মতোই সর্বোচ্চ ১০টা সাম্প্রতিক টার্ম

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
    }

    function saveHistoryList(list) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* নন-ক্রিটিক্যাল */ }
    }

    // নতুন সার্চ করা টার্ম সবার উপরে যোগ হয় — আগে একই টার্ম (কেস-ইনসেনসিটিভ) থাকলে সেটা সরিয়ে
    // আবার নতুন করে সবার উপরে বসানো হয়, যাতে ডুপ্লিকেট না থাকে আর সবচেয়ে সাম্প্রতিকটা সবসময় প্রথমে থাকে
    function addToHistory(term) {
        const clean = (term || '').trim();
        if (!clean) return;
        let list = getHistory().filter(t => t.toLowerCase() !== clean.toLowerCase());
        list.unshift(clean);
        if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
        saveHistoryList(list);
    }

    function clearHistory() {
        saveHistoryList([]);
    }

    function escapeHtml(str) {
        return (str || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function initSearchBar() {
        const bar = document.querySelector('.search-bar');
        if (!bar) return;
        const input = bar.querySelector('input');
        const button = bar.querySelector('button');
        if (!input || !button) return;

        const inSubfolder = window.location.pathname.includes('/brands/') || window.location.pathname.includes('/models/');
        const searchPage = inSubfolder ? '../search.html' : 'search.html';

        // search.html-এ থাকলে বর্তমান কোয়েরিটা বক্সে বসিয়ে দেওয়া হয়
        if (window.location.pathname.endsWith('search.html')) {
            const params = new URLSearchParams(window.location.search);
            const currentQuery = params.get('q');
            if (currentQuery) input.value = currentQuery;
        }

        let dropdown = null;

        function renderHistoryDropdown() {
            const history = getHistory();
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.className = 'stz-search-history-dropdown';
                bar.appendChild(dropdown);
            }
            if (!history.length) {
                dropdown.innerHTML = '';
                return;
            }
            dropdown.innerHTML = `
                <div class="stz-sh-header">
                    <span>Search History</span>
                    <span class="stz-sh-clear">CLEAR</span>
                </div>
                ${history.map(term => `<div class="stz-sh-item">${escapeHtml(term)}</div>`).join('')}
            `;

            // mousedown এ preventDefault() করা হচ্ছে যাতে ক্লিক করার সাথে সাথে input থেকে blur হয়ে
            // ড্রপডাউন লুকিয়ে না যায় (blur আগে ফায়ার করলে click ইভেন্টটাই আর কিছুর উপর পড়তো না)
            const clearBtn = dropdown.querySelector('.stz-sh-clear');
            if (clearBtn) {
                clearBtn.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    clearHistory();
                    renderHistoryDropdown();
                });
            }
            dropdown.querySelectorAll('.stz-sh-item').forEach(el => {
                el.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    runSearch(el.textContent);
                });
            });
        }

        function showHistoryDropdown() {
            renderHistoryDropdown();
            if (dropdown) dropdown.style.display = getHistory().length ? 'block' : 'none';
        }

        function hideHistoryDropdown() {
            if (dropdown) dropdown.style.display = 'none';
        }

        function runSearch(term) {
            const q = (term !== undefined ? term : input.value).trim();
            if (!q) return;
            addToHistory(q);
            hideHistoryDropdown();
            window.location.href = `${searchPage}?q=${encodeURIComponent(q)}`;
        }

        input.addEventListener('focus', showHistoryDropdown);
        // সরাসরি blur-এ লুকালে উপরের mousedown preventDefault()-এর সাথে রেস কন্ডিশন এড়াতে সামান্য
        // দেরি করে লুকানো হচ্ছে (fallback হিসেবে — বেশিরভাগ ক্ষেত্রে preventDefault()-ই যথেষ্ট)
        input.addEventListener('blur', function () {
            setTimeout(hideHistoryDropdown, 150);
        });

        button.addEventListener('click', () => runSearch());
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') runSearch();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearchBar);
    } else {
        initSearchBar();
    }
})();
