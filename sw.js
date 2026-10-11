// Smart Tech Zone কাস্টমার সার্ভিস ওয়ার্কার: অ্যাডমিন চ্যাটে রিপ্লাই দিলে (কাস্টমার সাইটে না থাকলে)
// ব্রাউজার পুশ নোটিফিকেশন দেখায়, ট্যাপ করলে সাইটের চ্যাট খুলে দেয়। এটা সাইটের root-এ (/sw.js) থাকতে হবে।
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
    var data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
    var title = data.title || 'Smart Tech Zone';
    event.waitUntil(self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/images/logo.png',
        badge: '/images/favicon.png',
        tag: data.tag || 'stz-chat',
        renotify: true,
        data: { url: data.url || '/account.html?openChat=1' }
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var url = (event.notification.data && event.notification.data.url) || '/account.html?openChat=1';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
                    return c.focus().then(function (w) { return w && 'navigate' in w ? w.navigate(url) : w; });
                }
            }
            return self.clients.openWindow ? self.clients.openWindow(url) : null;
        })
    );
});
