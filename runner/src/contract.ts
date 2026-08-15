import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { z } from 'zod';

import type { Contract } from './types.js';

const stepSchema = z.union([
  z.object({ click: z.string().min(1) }).strict(),
  z.object({ wait_for: z.string().min(1) }).strict(),
  z.object({ tab_to: z.string().min(1) }).strict(),
  z.object({ press: z.string().min(1) }).strict(),
  z.object({ capture: z.string().min(1) }).strict(),
  z.object({ check_accessibility: z.string().min(1) }).strict(),
]);

const contractSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'must use lowercase kebab-case'),
  description: z.string().min(1),
  owner: z.string().min(1),
  severity: z.enum(['blocking', 'warn', 'informational']),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).strict(),
  mask: z.array(z.string().min(1)).default([]),
  states: z.array(z.object({
    name: z.string().min(1),
    steps: z.array(stepSchema).min(1),
  }).strict()).min(1),
}).strict();

export async function loadContract(contractPath: string): Promise<Contract> {
  const source = await readFile(contractPath, 'utf8');
  const parsedYaml = load(source);
  const parsedContract = contractSchema.safeParse(parsedYaml);

  if (!parsedContract.success) {
    const detail = parsedContract.error.issues
      .map((issue) => `${issue.path.join('.') || 'contract'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid contract at ${contractPath}: ${detail}`);
  }

  return parsedContract.data;
}
