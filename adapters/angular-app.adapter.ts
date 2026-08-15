import type { ConsumerAdapter } from '../runner/src/types.js';

export const angularAppAdapter: ConsumerAdapter = {
  id: 'angular-app',
  baseUrl: process.env.QUALITY_GATE_ANGULAR_URL ?? 'http://127.0.0.1:4200',
  route: '/',
  readySelector: '[data-quality-ready="true"]',
  selectors: {
    'account-menu-trigger': '[data-cy="account-menu-trigger"]',
    'account-menu': '[data-cy="account-menu"]',
    'user-avatar': '[data-cy="user-avatar"]',
  },
};
