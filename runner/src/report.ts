import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';

import type { CaptureResult, Decision, GateReport } from './types.js';

function overallDecision(results: CaptureResult[]): Decision {
  if (results.some((result) => result.decision === 'HOLD')) return 'HOLD';
  if (results.some((result) => result.decision === 'NEEDS_APPROVAL')) return 'NEEDS_APPROVAL';
  return 'SHIP';
}

export function createReport(contract: GateReport['contract'], results: CaptureResult[]): GateReport {
  const decision = overallDecision(results);
  return {
    generatedAt: new Date().toISOString(),
    contract,
    results,
    summary: {
      total: results.length,
      ship: results.filter((result) => result.decision === 'SHIP').length,
      hold: results.filter((result) => result.decision === 'HOLD').length,
      needsApproval: results.filter((result) => result.decision === 'NEEDS_APPROVAL').length,
      decision,
    },
  };
}

function asRelative(path: string | null): string {
  return path ? `\`${relative(process.cwd(), path)}\`` : '—';
}

export function renderMarkdownReport(report: GateReport): string {
  const lines = [
    '# Quality Gate Report',
    '',
    `**Verdict: ${report.summary.decision}** · Contract: \`${report.contract.id}\` · Owner: ${report.contract.owner}`,
    '',
    `Results: ${report.summary.ship} ship, ${report.summary.needsApproval} need approval, ${report.summary.hold} hold.`,
    '',
    '| Consumer | State | Artifact | Classification | Decision | Diff | A11y | Evidence |',
    '| --- | --- | --- | --- | --- | ---: | ---: | --- |',
  ];

  for (const result of report.results) {
    const diff = result.diffPercentage === null ? '—' : `${result.diffPercentage.toFixed(3)}%`;
    lines.push(`| ${[
      result.adapterId,
      result.state,
      result.artifact,
      result.classification,
      result.decision,
      diff,
      result.accessibilityViolations.length,
      asRelative(result.screenshotPath),
    ].join(' | ')} |`);
  }

  const violations = report.results.flatMap((result) => result.accessibilityViolations.map((violation) => ({
    adapter: result.adapterId,
    state: result.state,
    ...violation,
  })));
  if (violations.length > 0) {
    lines.push('', '## Accessibility findings', '');
    for (const violation of violations) {
      lines.push(`- **${violation.adapter} / ${violation.state}** — \`${violation.id}\`: ${violation.help} (${violation.nodes} node(s))`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function writeReport(report: GateReport, artifactsDirectory: string): Promise<void> {
  await mkdir(artifactsDirectory, { recursive: true });
  await Promise.all([
    writeFile(`${artifactsDirectory}/report.json`, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(`${artifactsDirectory}/report.md`, renderMarkdownReport(report)),
  ]);
}
