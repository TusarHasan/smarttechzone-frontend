import edge from '../../netlify/edge-functions/brand-seo.js';
import { adaptEdge } from '../../cf-lib/adapt.js';
export const onRequest = adaptEdge(edge, { page: '/brands/brand.html' });
