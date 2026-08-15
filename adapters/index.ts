import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { angularAppAdapter } from './angular-app.adapter.js';
import { htmlAppAdapter } from './html-app.adapter.js';
import { reactAppAdapter } from './react-app.adapter.js';
import type { ConsumerAdapter } from '../runner/src/types.js';

export const adapters: ConsumerAdapter[] = [reactAppAdapter, angularAppAdapter, htmlAppAdapter];

export async function loadAdapter(reference: string): Promise<ConsumerAdapter> {
  const knownAdapter = adapters.find((adapter) => adapter.id === reference);
  if (knownAdapter) return knownAdapter;

  const moduleUrl = pathToFileURL(resolve(reference)).href;
  const module = await import(moduleUrl);
  const adapter = Object.values(module).find((value): value is ConsumerAdapter => {
    return value !== null
      && typeof value === 'object'
      && 'id' in value
      && 'baseUrl' in value
      && 'route' in value
      && 'selectors' in value;
  });

  if (!adapter) {
    throw new Error(`No ConsumerAdapter export found in ${reference}.`);
  }

  return adapter;
}
