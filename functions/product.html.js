import edge from '../netlify/edge-functions/product-seo.js';
import { adaptEdge } from '../cf-lib/adapt.js';
export const onRequest = adaptEdge(edge, { page: '/product.html', normalizePath: true });
