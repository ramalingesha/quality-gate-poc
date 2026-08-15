import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import axe from 'axe-core';
import type { Page } from 'playwright';

import type {
  AccessibilityViolation,
  ConsumerAdapter,
  Contract,
  ContractState,
  StateExecution,
} from './types.js';

interface ExecuteStateOptions {
  page: Page;
  contract: Contract;
  state: ContractState;
  adapter: ConsumerAdapter;
  artifactRoot: string;
}

const MAX_TAB_STEPS = 20;

function selectorFor(adapter: ConsumerAdapter, logicalName: string): string {
  const selector = adapter.selectors[logicalName];
  if (!selector) {
    throw new Error(`Adapter "${adapter.id}" does not define a selector for logical element "${logicalName}".`);
  }
  return selector;
}

async function runAccessibilityCheck(page: Page, selector: string): Promise<AccessibilityViolation[]> {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async (scope) => {
    const axeWindow = window as typeof window & {
      axe: { run: (context: string) => Promise<{ violations: Array<{
        id: string;
        impact: string | null;
        help: string;
        helpUrl: string;
        nodes: unknown[];
      }> }> };
    };
    return axeWindow.axe.run(scope);
  }, selector);

  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.length,
  }));
}

async function tabTo(page: Page, selector: string, logicalName: string): Promise<void> {
  const target = page.locator(selector);

  for (let attempt = 0; attempt <= MAX_TAB_STEPS; attempt += 1) {
    const hasFocus = await target.evaluate((element) => document.activeElement === element);
    if (hasFocus) return;
    await page.keyboard.press('Tab');
  }

  throw new Error(
    `Could not reach logical element "${logicalName}" by tabbing within ${MAX_TAB_STEPS} steps. `
      + `Check the consumer's keyboard order and adapter selector.`,
  );
}

export async function executeState({
  page,
  contract,
  state,
  adapter,
  artifactRoot,
}: ExecuteStateOptions): Promise<StateExecution> {
  const captures: StateExecution['captures'] = [];
  const accessibilityViolations: AccessibilityViolation[] = [];

  for (const step of state.steps) {
    if ('click' in step) {
      await page.locator(selectorFor(adapter, step.click)).click();
      continue;
    }

    if ('wait_for' in step) {
      await page.locator(selectorFor(adapter, step.wait_for)).waitFor({ state: 'visible' });
      continue;
    }

    if ('tab_to' in step) {
      await tabTo(page, selectorFor(adapter, step.tab_to), step.tab_to);
      continue;
    }

    if ('press' in step) {
      await page.keyboard.press(step.press);
      continue;
    }

    if ('capture' in step) {
      const screenshotPath = join(artifactRoot, state.name, `${step.capture}.png`);
      const mask = contract.mask.map((logicalName) => page.locator(selectorFor(adapter, logicalName)));
      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        mask,
      });
      captures.push({ artifact: step.capture, screenshotPath });
      continue;
    }

    if ('check_accessibility' in step) {
      const violations = await runAccessibilityCheck(page, selectorFor(adapter, step.check_accessibility));
      accessibilityViolations.push(...violations);
      continue;
    }

    const unsupportedStep = JSON.stringify(step);
    throw new Error(`Unsupported step in contract "${contract.id}": ${unsupportedStep}`);
  }

  return { captures, accessibilityViolations };
}
