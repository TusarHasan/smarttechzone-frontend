import edge from '../../netlify/edge-functions/product-seo.js';
import { adaptEdge } from '../../cf-lib/adapt.js';
// /product/<slug>-i<id> — static ফাইল নেই, ভেতরে ভেতরে product.html সার্ভ হয় (edge function নিজেই context.rewrite করে)
export const onRequest = adaptEdge(edge, { page: '/product.html', normalizePath: true });
