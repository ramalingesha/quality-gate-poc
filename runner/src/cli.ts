#!/usr/bin/env node
import { Command } from 'commander';

import { adapters, loadAdapter } from '../../adapters/index.js';
import { runGate } from './run.js';

interface CommandOptions {
  contract: string;
  adapter?: string;
  allAdapters?: boolean;
}

async function selectedAdapters(options: CommandOptions) {
  if (options.adapter && options.allAdapters) {
    throw new Error('Choose either --adapter or --all-adapters, not both.');
  }
  if (options.allAdapters) return adapters;
  if (options.adapter) return [await loadAdapter(options.adapter)];
  throw new Error('Provide --adapter <id-or-file> or --all-adapters.');
}

async function execute(options: CommandOptions, updateBaselines: boolean): Promise<void> {
  const selected = await selectedAdapters(options);
  const report = await runGate({
    contractPath: options.contract,
    adapters: selected,
    updateBaselines,
  });

  console.log(`Quality gate verdict: ${report.summary.decision}`);
  console.log(`Report: artifacts/report.md`);

  if (!updateBaselines && report.summary.decision !== 'SHIP') {
    process.exitCode = 1;
  }
}

const program = new Command();
program
  .name('quality-gate')
  .description('Run a frontend quality contract through one or more consumer adapters.')
  .showHelpAfterError();

program.command('run')
  .requiredOption('-c, --contract <path>', 'Path to the quality contract YAML file')
  .option('-a, --adapter <id-or-file>', 'Registered adapter id or adapter module path')
  .option('--all-adapters', 'Run the contract against every registered adapter')
  .action((options: CommandOptions) => execute(options, false));

program.command('update-baselines')
  .requiredOption('-c, --contract <path>', 'Path to the quality contract YAML file')
  .option('-a, --adapter <id-or-file>', 'Registered adapter id or adapter module path')
  .option('--all-adapters', 'Update baselines for every registered adapter')
  .action((options: CommandOptions) => execute(options, true));

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
