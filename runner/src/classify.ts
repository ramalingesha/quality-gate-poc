import type { Classification } from './types.js';

export function classifyResult(input: {
  accessibilityViolationCount: number;
  baselineExists: boolean;
  visualDifference: boolean;
}): Classification {
  if (input.accessibilityViolationCount > 0) {
    return 'accessibility-violation';
  }

  if (!input.baselineExists) {
    return 'missing-baseline';
  }

  if (input.visualDifference) {
    return 'visual-difference';
  }

  return 'pass';
}
