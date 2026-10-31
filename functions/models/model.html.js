import edge from '../../netlify/edge-functions/model-seo.js';
import { adaptEdge } from '../../cf-lib/adapt.js';
export const onRequest = adaptEdge(edge, { page: '/models/model.html' });
