// ছবির ব্যাকআপ-পথ: smarttechzone.com.bd/img/uploads/<ফাইল>  →  R2 বাকেটের একই ফাইল (Cloudflare এজে ক্যাশ হয়)
// কেন: ছবির মূল লিংক pub-xxxx.r2.dev (Cloudflare-এর ডেভেলপমেন্ট লিংক, ক্যাশ নেই, লিমিটেড) — কিছু কাস্টমারের নেটওয়ার্কে/সময়ে লোড হয় না।
// config.js এর ছবি-এরর লিসনার মূল লিংক ব্যর্থ হলে শুধু তখনই এই পথে আবার চেষ্টা করে, তাই সব ছবি এই ফাংশন দিয়ে যায় না।
// শুধু uploads/ এর ভেতরের ছবি (jpg, png, webp, gif, avif) চলে; অন্য কিছু বা ".." থাকলে 404।
// বাকেটের পাবলিক লিংক বদলালে Pages-এর Environment variable R2_PUBLIC_BASE দিন (যেমন https://img.example.com/)।
const DEFAULT_BASE = 'https://pub-f78e57542fa046658cbdb164b93f08e0.r2.dev/';

export const onRequestGet = async ({ params, env }) => {
    const p = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
    if (p.includes('..') || !/^uploads\/[A-Za-z0-9._\-\/]+\.(jpe?g|png|webp|gif|avif)$/i.test(p)) {
        return new Response('Not found', { status: 404 });
    }
    let base = (env && env.R2_PUBLIC_BASE) || DEFAULT_BASE;
    if (!base.endsWith('/')) base += '/';
    let up;
    try {
        up = await fetch(base + p, { cf: { cacheEverything: true, cacheTtl: 2592000 } });
    } catch (e) {
        return new Response('Bad gateway', { status: 502 });
    }
    if (!up.ok) return new Response('Not found', { status: up.status === 404 ? 404 : 502 });
    const h = new Headers();
    h.set('Content-Type', up.headers.get('Content-Type') || 'image/jpeg');
    h.set('Cache-Control', 'public, max-age=2592000');
    h.set('X-Content-Type-Options', 'nosniff');
    return new Response(up.body, { status: 200, headers: h });
};
