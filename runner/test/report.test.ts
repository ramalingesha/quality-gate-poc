import assert from 'node:assert/strict';
import test from 'node:test';

import { createReport, renderMarkdownReport } from '../src/report.js';

test('the Markdown report renders a readable evidence row', () => {
  const report = createReport(
    { id: 'account-menu', owner: 'design-system-team', severity: 'blocking' },
    [{
      adapterId: 'react-app',
      contractId: 'account-menu',
      state: 'open',
      artifact: 'account-menu-open',
      classification: 'pass',
      decision: 'SHIP',
      diffPercentage: 0,
      accessibilityViolations: [],
      screenshotPath: `${process.cwd()}/artifacts/react-app/account-menu/open/account-menu-open.png`,
      baselinePath: `${process.cwd()}/baselines/react-app/account-menu/account-menu-open.png`,
      diffPath: `${process.cwd()}/artifacts/react-app/account-menu/open/diff/account-menu-open.diff.png`,
    }],
  );
  const markdown = renderMarkdownReport(report);

  assert.match(markdown, /\| react-app \| open \| account-menu-open \| pass \| SHIP \| 0\.000% \| 0 \|/);
  assert.doesNotMatch(markdown, /\|\|\|/);
});
