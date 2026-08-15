import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { classifyResult } from './classify.js';
import { loadContract } from './contract.js';
import { compareImages, writeBaseline } from './diff.js';
import { decide } from './policy.js';
import { createReport, writeReport } from './report.js';
import { prepareStablePage } from './stability.js';
import { executeState } from './steps.js';
import type { ConsumerAdapter, GateReport } from './types.js';

export interface RunGateOptions {
  contractPath: string;
  adapters: ConsumerAdapter[];
  updateBaselines?: boolean;
  projectRoot?: string;
}

export async function runGate({
  contractPath,
  adapters,
  updateBaselines = false,
  projectRoot = process.cwd(),
}: RunGateOptions): Promise<GateReport> {
  const contract = await loadContract(contractPath);
  const root = resolve(projectRoot);
  const artifactsDirectory = join(root, 'artifacts');
  // Keep browser binaries inside the project by default. This makes the local
  // setup and CI use the same pinned Playwright browser revision.
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: process.env.QUALITY_GATE_HEADLESS !== 'false' });
  const results: GateReport['results'] = [];

  try {
    for (const adapter of adapters) {
      const context = await browser.newContext({
        viewport: contract.viewport,
        deviceScaleFactor: 1,
        colorScheme: 'light',
        locale: 'en-US',
        timezoneId: 'UTC',
        reducedMotion: 'reduce',
      });

      try {
        for (const state of contract.states) {
          const page = await context.newPage();
          try {
            await prepareStablePage(page, adapter);
            if (adapter.authenticate) await adapter.authenticate(page);

            const artifactRoot = join(artifactsDirectory, adapter.id, contract.id);
            const execution = await executeState({ page, contract, state, adapter, artifactRoot });

            for (const capture of execution.captures) {
              const baselinePath = join(root, 'baselines', adapter.id, contract.id, `${capture.artifact}.png`);
              const diffPath = join(artifactRoot, state.name, 'diff', `${capture.artifact}.diff.png`);

              if (updateBaselines) {
                await writeBaseline(capture.screenshotPath, baselinePath);
              }

              const diff = await compareImages(baselinePath, capture.screenshotPath, diffPath);
              const classification = classifyResult({
                accessibilityViolationCount: execution.accessibilityViolations.length,
                baselineExists: diff.baselineExists,
                visualDifference: diff.visualDifference,
              });
              results.push({
                adapterId: adapter.id,
                contractId: contract.id,
                state: state.name,
                artifact: capture.artifact,
                classification,
                decision: decide(classification, contract),
                diffPercentage: diff.diffPercentage,
                accessibilityViolations: execution.accessibilityViolations,
                screenshotPath: capture.screenshotPath,
                baselinePath,
                diffPath: diff.diffPath,
              });
            }
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await mkdir(artifactsDirectory, { recursive: true });
  const report = createReport({ id: contract.id, owner: contract.owner, severity: contract.severity }, results);
  await writeReport(report, artifactsDirectory);
  return report;
}
