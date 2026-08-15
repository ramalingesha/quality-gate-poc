# Quality Gate Runner — Project Plan

A small, working proof of concept for the "contracts, adapters, runners" architecture described in
[*Building a Frontend Quality Platform*](../blog-app/src/mockdata/blogs/frontend-quality-platform) (Chapter 3
of *UI Quality Gate & Testing*). This document is the implementation guide — scope, modules, design, and a
step-by-step build order. Anyone should be able to pick this up and build it from here without extra context.

---

## 1. Project scope

### 1.1 What this proves

One shared **contract** (a YAML file describing what "correct" looks like for a UI component) is executed by
one **runner** against three **consumer apps** built in three different stacks — React, Angular, and plain
HTML/CSS/JS — using a thin, per-app **adapter**. The runner never imports React or Angular. It only drives a
real browser via Playwright, so it is framework-agnostic by construction, not by claim.

The end state: run one command, get one report, covering three unrelated frontend stacks.

```
quality-gate run --contract contracts/account-menu.yaml --all-adapters
```

### 1.2 The demo component

All three consumer apps implement the same UI concept: an **account menu** — a trigger button that opens a
dropdown with a few links. This is the same example already used in the blog's Design chapter, so the repo and
the article share one running example instead of introducing a new one. The three implementations are
deliberately *not* identical in markup or selector strategy (see §5) — that inconsistency is what the adapter
layer exists to absorb.

### 1.3 In scope for v1

- A contract file format (YAML) covering states, steps, and masking.
- A runner that can: launch a browser, navigate, click, wait, capture a screenshot, run an accessibility check.
- Screenshot diffing against a stored baseline (pixel-level, no perceptual/AI diffing).
- Accessibility checks via `axe-core`.
- A failure classifier and a policy engine that turns raw results into a ship / hold / needs-approval decision.
- A human-readable + machine-readable report.
- Three tiny consumer apps (React, Angular, plain HTML) and one adapter per app.
- A GitHub Actions workflow that runs the gate on every push and fails the build on any non-`SHIP` decision.

### 1.4 Explicitly out of scope for v1

Per Chapter 6 of the blog series ("report before you block, prove the model before you grow it"):

- No dashboard or web UI — the report is a Markdown/JSON file.
- No visual explorer / auto-discovery of UI states — every state is scripted in the contract.
- No AI summarization of failures.
- No multi-browser matrix (Chromium only for v1).
- No approval workflow beyond a CLI flag (`update-baselines`) and a git-committed PNG.

These are natural "v2" ideas, not missing pieces of v1. Do not build them until v1 is running in CI and the
report is something you'd actually trust.

---

## 2. Core design vocabulary

Same three concepts as the blog, kept intentionally identical so the article can point at both:

| Concept | Answers | Lives in |
|---|---|---|
| **Contract** | What should be checked, and what counts as blocking | `contracts/*.yaml` |
| **Adapter** | How to reach and prepare *this* consumer app | `adapters/*.adapter.ts` |
| **Runner** | How the check actually executes, for any consumer | `runner/src/*` |
| **Policy** | What decision a result set produces | `runner/src/policy.ts` |

A contract refers to elements by **logical name** (`account-menu-trigger`), never by CSS selector. Each
adapter maps logical names to whatever selector strategy that app actually uses. This one indirection is what
makes the same contract runnable against React, Angular, and plain HTML without modification.

---

## 3. Tech stack

| Purpose | Choice | Why |
|---|---|---|
| Language | TypeScript 5, run via `tsx` | No build step needed for a CLI-driven POC |
| Browser automation | `playwright` (core package, not `@playwright/test`) | We need our own orchestration and report format, not Playwright's test runner/reporter |
| Accessibility | `axe-core` | Industry-standard, free, well understood by reviewers |
| Image diffing | `pixelmatch` + `pngjs` | Small, dependency-light, does exactly one job |
| Contract parsing | `js-yaml` | Standard YAML parser |
| CLI | `commander` | Minimal, well-documented argument parsing |
| CI | GitHub Actions | Free on public repos, and the actual "evidence" artifact for the article |
| Example apps | Vite (React), Angular CLI (Angular), zero tooling (plain HTML) | Fastest way to stand up three tiny, genuinely different apps |

Node 20+ throughout.

---

## 4. Repository structure

```
quality-gate-poc/
├── README.md                              ← public-facing summary; what a stranger reads first
├── PROJECT_PLAN.md                        ← this file
├── package.json
├── tsconfig.json
├── contracts/
│   └── account-menu.yaml
├── adapters/
│   ├── react-app.adapter.ts
│   ├── angular-app.adapter.ts
│   └── html-app.adapter.ts
├── runner/
│   └── src/
│       ├── types.ts                       ← Contract, Adapter, StepResult, Report types
│       ├── contract.ts                    ← load + validate a contract YAML
│       ├── steps.ts                       ← click / wait_for / press / capture / check_accessibility
│       ├── stability.ts                   ← disable animations, freeze time, wait for network idle
│       ├── diff.ts                        ← pixelmatch wrapper, baseline read/write
│       ├── classify.ts                    ← raw result -> classification
│       ├── policy.ts                      ← classification -> ship / hold / needs-approval
│       ├── report.ts                      ← writes report.json + report.md
│       └── run.ts                         ← orchestrates one contract x one adapter
│       └── cli.ts                         ← argument parsing, entry point
├── baselines/
│   ├── react-app/account-menu/*.png
│   ├── angular-app/account-menu/*.png
│   └── html-app/account-menu/*.png
├── artifacts/                             ← gitignored; latest run's screenshots + diffs + report
├── examples/
│   ├── react-app/                         ← Vite + React, account menu #1
│   ├── angular-app/                       ← Angular CLI, account menu #2
│   └── html-app/                          ← index.html + style.css + script.js, account menu #3
├── docs/
│   └── report-example.md                  ← a real sample report, committed, for the README/article
└── .github/
    └── workflows/
        └── quality-gate.yml
```

---

## 5. Module design

### 5.1 Contract (`contracts/account-menu.yaml`)

```yaml
id: account-menu
description: >
  Account menu must open, be reachable by keyboard, and match its approved
  look in every consumer.
owner: design-system-team
severity: blocking          # blocking | warn | informational

viewport:
  width: 1280
  height: 800

mask:
  - user-avatar             # logical name of a dynamic region to blank out before capture

states:
  - name: closed
    steps:
      - capture: account-menu-closed

  - name: open
    steps:
      - click: account-menu-trigger
      - wait_for: account-menu
      - capture: account-menu-open
      - check_accessibility: account-menu

  - name: keyboard-focus
    steps:
      - press: Tab
      - press: Enter
      - wait_for: account-menu
      - capture: account-menu-keyboard-open
      - check_accessibility: account-menu
```

`contract.ts` loads this with `js-yaml`, validates it against a small Zod (or hand-written) schema, and
exposes a typed `Contract` object. Fail loudly on an invalid contract — do not attempt to auto-correct one.

### 5.2 Adapter (`adapters/react-app.adapter.ts`)

```typescript
export interface ConsumerAdapter {
  id: string;
  baseUrl: string;
  route: string;                            // where the contract's "start" state lives
  selectors: Record<string, string>;        // logical name -> real CSS selector
  authenticate?: (page: Page) => Promise<void>;
}

export const reactAppAdapter: ConsumerAdapter = {
  id: 'react-app',
  baseUrl: 'http://localhost:5173',
  route: '/',
  selectors: {
    'account-menu-trigger': '[data-testid="account-menu-trigger"]',
    'account-menu': '[data-testid="account-menu"]',
    'user-avatar': '[data-testid="user-avatar"]',
  },
};
```

Each of the three adapters is 15-20 lines. The `angular-app` adapter might key off `[data-cy=...]` and the
`html-app` adapter off plain `#account-menu` — the point of the demo is that the selector *strategy* is allowed
to differ per app; the contract does not care.

### 5.3 Steps executor (`runner/src/steps.ts`)

One function per verb, all operating on a Playwright `Page` plus the active adapter's `selectors` map:

| Verb | Behavior |
|---|---|
| `click: <name>` | `page.click(selectors[name])` |
| `wait_for: <name>` | `page.waitForSelector(selectors[name], { state: 'visible' })` |
| `press: <key>` | `page.keyboard.press(key)` |
| `capture: <artifactName>` | mask elements listed in the contract's `mask`, then `page.screenshot()`, save under `artifacts/<adapter>/<contract>/<state>/<artifactName>.png` |
| `check_accessibility: <name>` | run `axe-core` scoped to `selectors[name]`, collect violations into the result |

Unknown verbs should fail the run immediately with a clear error naming the contract and line — never silently
skip a step.

### 5.4 Stability layer (`runner/src/stability.ts`)

Runs once per page load, before any step executes:

- Inject CSS disabling `animation` and `transition` globally.
- `page.waitForLoadState('networkidle')`.
- `document.fonts.ready` before any capture.
- Freeze `Date.now` / `Math.random` only if the contract declares it needs deterministic data (v1: skip unless
  a consumer app actually needs it — don't build this until a real flaky run demonstrates the need).

### 5.5 Diffing (`runner/src/diff.ts`)

- If no baseline PNG exists for this artifact name → classification `missing-baseline`.
- Otherwise, `pixelmatch(baselinePng, currentPng, diffPng, width, height, { threshold: 0.1 })`.
- Diff percentage above a small threshold (start at 0.1%) → visual difference; otherwise → match.
- Always write the diff PNG to `artifacts/.../diff/`, even on a pass, so a reviewer can sanity-check the
  threshold later.

### 5.6 Classification (`runner/src/classify.ts`)

Deterministic, in this priority order:

1. Any accessibility violation → `accessibility-violation`
2. No baseline exists → `missing-baseline`
3. Diff percentage over threshold → `visual-difference`
4. Otherwise → `pass`

### 5.7 Policy (`runner/src/policy.ts`)

| Classification | Contract severity | Decision |
|---|---|---|
| `accessibility-violation` | `blocking` | **HOLD** |
| `accessibility-violation` | `warn` | **NEEDS_APPROVAL** |
| `visual-difference` | any | **NEEDS_APPROVAL** |
| `missing-baseline` | any | **NEEDS_APPROVAL** (treated as "new baseline candidate") |
| `pass` | any | **SHIP** |

`policy.ts` should be one small pure function: `(classification, contract) => Decision`. Keep it boring and
easy to unit test — this is the piece a reader will scrutinize hardest.

### 5.8 Report (`runner/src/report.ts`)

Writes two files per run:

- `artifacts/report.json` — machine-readable, one row per (adapter, state, artifact): classification, decision,
  diff %, a11y violation count, screenshot paths.
- `artifacts/report.md` — a table version of the same data, plus a one-line overall verdict
  (`SHIP` only if every row is `SHIP`), meant to be pasted into a PR comment or read directly.

### 5.9 CLI (`runner/src/cli.ts`)

```bash
quality-gate run --contract contracts/account-menu.yaml --adapter adapters/react-app.adapter.ts
quality-gate run --contract contracts/account-menu.yaml --all-adapters
quality-gate update-baselines --contract contracts/account-menu.yaml --adapter adapters/react-app.adapter.ts
```

`update-baselines` re-runs captures and overwrites the baseline PNGs — the only "approval" mechanism in v1.
The overwritten files then go through normal code review as a diff of two images, which is itself a nice
detail for the article (approval-as-a-PR-review, no separate tool needed).

---

## 6. The three example apps

Each app renders the same concept — a header with an avatar and an account menu trigger that opens a dropdown
with 3-4 links — but each is free to differ in markup, styling approach, and selector strategy:

| App | Stack | Selector strategy |
|---|---|---|
| `examples/react-app` | Vite + React, function component, CSS modules | `data-testid` attributes |
| `examples/angular-app` | Angular CLI, standalone component | `data-cy` attributes (common Angular/Cypress convention) |
| `examples/html-app` | Plain HTML + CSS + vanilla JS, no build step | plain `id` attributes |

Keep every app genuinely minimal — a header, the menu, and just enough content below it to prove it's a real
page. Do not add routing, state management, or a backend. Each app should `npm run dev` (or, for the HTML app,
be servable with any static file server) and be reachable at a fixed local port.

---

## 7. CI workflow (`.github/workflows/quality-gate.yml`)

1. Checkout, install Node + dependencies (root + each `examples/*` app).
2. Start all three example apps in the background (`npm run dev &` per app), wait for their ports to respond.
3. `npx playwright install --with-deps chromium`.
4. Run `quality-gate run --contract contracts/account-menu.yaml --all-adapters`.
5. Upload `artifacts/` as a workflow artifact (screenshots + diffs + report) regardless of outcome.
6. Fail the job if `report.json` contains any non-`SHIP` decision. In v1, `NEEDS_APPROVAL` is resolved by a
   reviewed `update-baselines` commit; there is no separate approval service yet.

The green/red Actions badge in the README, plus a downloadable artifacts bundle from a real run, is the
concrete "evidence" piece for the LinkedIn article — more convincing than any screenshot you'd take locally.

---

## 8. Detailed implementation steps

Work through these milestones in order. Each one should be independently runnable and worth a screenshot
before moving to the next — do not start milestone *N+1* until *N*'s acceptance check passes.

### Milestone 1 — Runner core, single consumer

1. `npm init`, add TypeScript, `tsx`, `playwright`, `js-yaml`, `commander`, `pixelmatch`, `pngjs`, `axe-core`
   as dependencies.
2. Scaffold `examples/react-app` with Vite (`npm create vite@latest -- --template react-ts`). Build the
   account menu: a header with `data-testid="user-avatar"`, a button `data-testid="account-menu-trigger"`,
   and a dropdown `data-testid="account-menu"` with 3-4 plain links, toggled by React state.
3. Write `contracts/account-menu.yaml` as shown in §5.1.
4. Write `adapters/react-app.adapter.ts` as shown in §5.2.
5. Implement `runner/src/types.ts`, `contract.ts`, `steps.ts`, `stability.ts`, `run.ts`, `cli.ts` — enough to
   execute the `open` state end to end against the running React app and write a raw screenshot to
   `artifacts/react-app/account-menu/open/account-menu-open.png`.
6. Add `check_accessibility` via `axe-core` injected into the page (`axe.run(selector)`); log violation count.
7. **Acceptance check:** `npm run dev` in `examples/react-app` (separate terminal), then
   `quality-gate run --contract contracts/account-menu.yaml --adapter adapters/react-app.adapter.ts`
   produces a screenshot and prints an accessibility violation count with zero crashes.

### Milestone 2 — Multi-framework proof

1. Scaffold `examples/angular-app` (Angular CLI, standalone component) with the same visual account menu,
   using `data-cy` attributes instead of `data-testid`.
2. Scaffold `examples/html-app` as a single `index.html` + `style.css` + `script.js`, same visual menu, plain
   `id` attributes, toggled with vanilla JS.
3. Write `adapters/angular-app.adapter.ts` and `adapters/html-app.adapter.ts`.
4. Add `--all-adapters` to the CLI: run the same contract against every adapter in `adapters/`, sequentially.
5. **Acceptance check:** with all three example apps running locally on their own ports,
   `quality-gate run --contract contracts/account-menu.yaml --all-adapters` produces three sets of screenshots
   with zero changes to `runner/src/*` from Milestone 1 — only new adapters and example apps were added.

### Milestone 3 — Baselines, diffing, policy

1. Implement `diff.ts`: read/write baseline PNGs under `baselines/<adapter>/<contract>/`, run `pixelmatch`.
2. Implement `classify.ts` and `policy.ts` per §5.6-5.7.
3. Implement `update-baselines` CLI command.
4. Run `update-baselines` once for all three adapters to create the initial baseline set; commit those PNGs.
5. Make one deliberate visual change in `examples/react-app` (e.g. change the menu's border radius) and
   re-run `quality-gate run` — confirm it reports `visual-difference` / `NEEDS_APPROVAL` for that consumer only,
   and `pass` / `SHIP` for the other two.
6. **Acceptance check:** a real, intentional UI change is correctly caught, correctly scoped to one consumer,
   and does not false-positive on the other two.

### Milestone 4 — CI

1. Write `.github/workflows/quality-gate.yml` per §7.
2. Push to GitHub, confirm the workflow runs and uploads artifacts on a clean commit (expect `SHIP`).
3. Push a deliberate visual regression on a branch, open a PR, confirm the workflow fails the check and the
   artifact bundle contains the diff image.
4. **Acceptance check:** a red/green badge exists in the README, backed by a real workflow run either can be
   linked to from GitHub.

### Milestone 5 — Documentation

1. Write `README.md`: what this is, the "1 contract → 3 frameworks → 1 command" hook near the top, how to run
   it locally, how CI enforces it, and an explicit link back to the blog chapter for the design rationale.
2. Copy a real `report.md` from a Milestone 3 or 4 run into `docs/report-example.md`, lightly annotated.
3. **Acceptance check:** someone with no prior context can clone the repo, follow the README, and get a
   passing run locally within a few minutes.

---

## 9. Open items to decide before scaffolding

- **Repo name** — suggest `quality-gate-runner`, `contract-gate`, or keep `quality-gate-poc`.
- **License** — MIT is the default expectation for a public demo repo; call it out explicitly if choosing
  otherwise.
- **npm package name**, if the CLI is ever published — not required for the POC; a local `tsx runner/src/cli.ts`
  invocation is enough for v1.
