import { adaptEdge } from '../../cf-lib/adapt.js';
// /shop/<seller-code> — ভেন্ডরের পাবলিক শপ পেজ। static ফাইল নেই, ভেতরে ভেতরে shop.html সার্ভ হয়
// (ব্রাউজারের ঠিকানা বারে /shop/stz-s0001 টাই থাকে; পেজটা নিজেই URL থেকে কোড পড়ে)
const edge = (request, context) => context.rewrite('/shop.html');
export const onRequest = adaptEdge(edge, { page: '/shop.html' });
