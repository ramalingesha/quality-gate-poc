import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { loadContract } from '../src/contract.js';

test('the account-menu contract loads as a typed three-state contract', async () => {
  const contract = await loadContract(resolve('contracts/account-menu.yaml'));

  assert.equal(contract.id, 'account-menu');
  assert.deepEqual(contract.states.map((state) => state.name), ['closed', 'open', 'keyboard-focus']);
  assert.equal(contract.mask[0], 'user-avatar');
  assert.deepEqual(contract.states[2]?.steps[0], { tab_to: 'account-menu-trigger' });
});
