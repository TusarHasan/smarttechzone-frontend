import { proxyTo } from '../cf-lib/adapt.js';
// Google Merchant Center / Meta Catalog ফিড
export const onRequest = (ctx) => proxyTo(ctx.request, 'https://smarttechzone-backend.onrender.com/product-feed.xml');
