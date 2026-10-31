import { proxyTo } from '../cf-lib/adapt.js';
// sitemap.xml ব্যাকএন্ড থেকে লাইভ জেনারেট হয় — নিজের ডোমেইনে দেখানোর জন্য প্রক্সি
export const onRequest = (ctx) => proxyTo(ctx.request, 'https://smarttechzone-backend.onrender.com/sitemap.xml');
