import type { Page } from 'playwright';

export type Severity = 'blocking' | 'warn' | 'informational';
export type Classification =
  | 'accessibility-violation'
  | 'missing-baseline'
  | 'visual-difference'
  | 'pass';
export type Decision = 'SHIP' | 'HOLD' | 'NEEDS_APPROVAL';

export type ContractStep =
  | { click: string }
  | { wait_for: string }
  | { tab_to: string }
  | { press: string }
  | { capture: string }
  | { check_accessibility: string };

export interface ContractState {
  name: string;
  steps: ContractStep[];
}

export interface Contract {
  id: string;
  description: string;
  owner: string;
  severity: Severity;
  viewport: {
    width: number;
    height: number;
  };
  mask: string[];
  states: ContractState[];
}

export interface ConsumerAdapter {
  id: string;
  baseUrl: string;
  route: string;
  selectors: Record<string, string>;
  readySelector?: string;
  authenticate?: (page: Page) => Promise<void>;
}

export interface AccessibilityViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: number;
}

export interface CaptureResult {
  adapterId: string;
  contractId: string;
  state: string;
  artifact: string;
  classification: Classification;
  decision: Decision;
  diffPercentage: number | null;
  accessibilityViolations: AccessibilityViolation[];
  screenshotPath: string;
  baselinePath: string;
  diffPath: string | null;
}

export interface GateReport {
  generatedAt: string;
  contract: {
    id: string;
    owner: string;
    severity: Severity;
  };
  results: CaptureResult[];
  summary: {
    total: number;
    ship: number;
    hold: number;
    needsApproval: number;
    decision: Decision;
  };
}

export interface StateExecution {
  captures: Array<{ artifact: string; screenshotPath: string }>;
  accessibilityViolations: AccessibilityViolation[];
}
