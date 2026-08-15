import type { ConsumerAdapter } from '../runner/src/types.js';

export const reactAppAdapter: ConsumerAdapter = {
  id: 'react-app',
  baseUrl: process.env.QUALITY_GATE_REACT_URL ?? 'http://127.0.0.1:5173',
  route: '/',
  readySelector: '[data-quality-ready="true"]',
  selectors: {
    'account-menu-trigger': '[data-testid="account-menu-trigger"]',
    'account-menu': '[data-testid="account-menu"]',
    'user-avatar': '[data-testid="user-avatar"]',
  },
};
