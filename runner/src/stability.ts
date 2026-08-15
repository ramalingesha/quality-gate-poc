import type { Page } from 'playwright';

import type { ConsumerAdapter } from './types.js';

const STABLE_UI_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    caret-color: transparent !important;
  }
`;

export async function prepareStablePage(page: Page, adapter: ConsumerAdapter): Promise<void> {
  const destination = new URL(adapter.route, adapter.baseUrl).toString();
  await page.goto(destination, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: STABLE_UI_CSS });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

  if (adapter.readySelector) {
    await page.locator(adapter.readySelector).waitFor({ state: 'visible' });
  }

  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  });
}
