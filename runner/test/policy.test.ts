import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyResult } from '../src/classify.js';
import { decide } from '../src/policy.js';

test('classification gives accessibility findings the highest priority', () => {
  assert.equal(classifyResult({
    accessibilityViolationCount: 1,
    baselineExists: false,
    visualDifference: true,
  }), 'accessibility-violation');
});

test('blocking accessibility findings hold a release', () => {
  assert.equal(decide('accessibility-violation', { severity: 'blocking' }), 'HOLD');
});

test('visual change requires approval even for an informational contract', () => {
  assert.equal(decide('visual-difference', { severity: 'informational' }), 'NEEDS_APPROVAL');
});

test('a matching baseline ships', () => {
  assert.equal(classifyResult({
    accessibilityViolationCount: 0,
    baselineExists: true,
    visualDifference: false,
  }), 'pass');
  assert.equal(decide('pass', { severity: 'blocking' }), 'SHIP');
});
