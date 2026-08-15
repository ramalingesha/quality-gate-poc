import type { Classification, Contract, Decision } from './types.js';

export function decide(classification: Classification, contract: Pick<Contract, 'severity'>): Decision {
  switch (classification) {
    case 'accessibility-violation':
      return contract.severity === 'blocking' ? 'HOLD' : 'NEEDS_APPROVAL';
    case 'visual-difference':
    case 'missing-baseline':
      return 'NEEDS_APPROVAL';
    case 'pass':
      return 'SHIP';
  }
}
