// সার্চ বার — index.html, brands/*.html, models/model.html সব পেজে navbar এর সার্চ বক্স সক্রিয় করে
(function () {
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

        function runSearch() {
            const q = input.value.trim();
            if (!q) return;
            window.location.href = `${searchPage}?q=${encodeURIComponent(q)}`;
        }

        button.addEventListener('click', runSearch);
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
