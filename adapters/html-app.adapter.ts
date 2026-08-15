import type { ConsumerAdapter } from '../runner/src/types.js';

export const htmlAppAdapter: ConsumerAdapter = {
  id: 'html-app',
  baseUrl: process.env.QUALITY_GATE_HTML_URL ?? 'http://127.0.0.1:4173',
  route: '/',
  readySelector: '[data-quality-ready="true"]',
  selectors: {
    'account-menu-trigger': '#account-menu-trigger',
    'account-menu': '#account-menu',
    'user-avatar': '#user-avatar',
  },
};
