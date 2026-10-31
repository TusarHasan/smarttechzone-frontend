import { proxyTo } from '../../cf-lib/adapt.js';
// প্রোডাক্ট শেয়ারের ছোট লিংক /s/<id> — ব্যাকএন্ডের OG প্রিভিউ পেজ
export const onRequest = (ctx) => {
    const p = ctx.params && ctx.params.path;
    const rest = Array.isArray(p) ? p.join('/') : (p || '');
    return proxyTo(ctx.request, 'https://smarttechzone-backend.onrender.com/s/' + rest);
};
