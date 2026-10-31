// অ্যাপের পুরোনো Netlify ছবির লিংক (/.netlify/images?url=&w=&q=) এখন Cloudflare-এ আসে।
// এখানে সেটাকে Cloudflare Image Transformations-এ (/cdn-cgi/image/...) পাঠানো হয়।
// শুধু চেনা হোস্টের ছবি; অন্য কিছু হলে 400 (ওপেন রিডিরেক্ট ঠেকাতে)।
const okHost = (h) =>
    /^pub-[a-z0-9]+\.r2\.dev$/.test(h) ||
    h === 'smarttechzone-backend.onrender.com' ||
    (h.startsWith('static-0') && h.endsWith('.daraz.com.bd')) ||
    h.endsWith('.slatic.net') ||
    h === 'smarttechzone.com.bd';
// Cloudflare Transformations-এ অনুমোদিত সোর্স (ড্যাশবোর্ডে যোগ করা): নিজের zone + R2। বাকিগুলো মূল ছবিতে যায়।
const cfHost = (h) => /^pub-[a-z0-9]+\.r2\.dev$/.test(h) || h === 'smarttechzone.com.bd';

export const onRequest = (ctx) => {
    const u = new URL(ctx.request.url);
    const src = u.searchParams.get('url') || '';
    let t;
    try { t = new URL(src); } catch (e) { return new Response('bad url', { status: 400 }); }
    if (t.protocol !== 'https:' || !okHost(t.hostname)) return new Response('host not allowed', { status: 400 });
    const w = Math.min(Math.max(parseInt(u.searchParams.get('w') || '0', 10) || 0, 0), 2000);
    const q = Math.min(Math.max(parseInt(u.searchParams.get('q') || '75', 10) || 75, 30), 95);
    const headers = { 'Cache-Control': 'public, max-age=86400' };
    if (!w || !cfHost(t.hostname)) {
        return new Response(null, { status: 302, headers: { ...headers, Location: t.toString() } });
    }
    const loc = '/cdn-cgi/image/width=' + w + ',quality=' + q + ',fit=scale-down,format=auto/' + t.toString();
    return new Response(null, { status: 302, headers: { ...headers, Location: loc } });
};
