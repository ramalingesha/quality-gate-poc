# Quality Gate Runner

**One UI contract → three frontend stacks → one release decision.**

This is a small, working proof of concept for a frontend quality platform. A single YAML contract describes an
account menu’s expected states. One framework-agnostic Playwright runner executes it against React, Angular,
and plain HTML through thin app-specific adapters, then turns screenshots and accessibility findings into a
clear `SHIP`, `HOLD`, or `NEEDS_APPROVAL` decision.

```text
contract (what correct means)
            │
            ▼
runner (browser + accessibility + image diff + policy)
            │
            ▼
adapters (how each app is reached)
      ┌─────┼─────┐
      ▼     ▼     ▼
   React  Angular  HTML
```

The design rationale is in [Building a Frontend Quality Platform](https://www.jslipi.com/blog/frontend-quality-platform/the-design-contracts-adapters-and-runners).

## What it proves

- The contract uses logical names such as `account-menu-trigger`, never CSS selectors.
- Every app owns its selector strategy: React uses `data-testid`, Angular uses `data-cy`, and HTML uses IDs.
- The runner imports neither React nor Angular. It only drives Chromium and consumes the adapter interface.
- A policy converts raw evidence into a release signal instead of leaving a reviewer with “the screenshot test failed.”

## Run it locally

Use Node 20 or 22 LTS. The project keeps the pinned Playwright browser inside `node_modules`, so local and CI
runs use the same browser revision.

```bash
npm ci
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run dev:all
```

In a second terminal, create the first reviewable baselines, then run the gate:

```bash
npm run quality:update-baselines
npm run quality:run
```

The commands write screenshots, pixel diffs, and `report.json` / `report.md` to `artifacts/`. Baselines are
stored under `baselines/<adapter>/<contract>/` and should be committed only after normal code review. Pixel
diffs are sensitive to OS and font rendering, so this POC’s workflow deliberately runs on macOS too. If you
change the CI runner OS, regenerate and review the baselines in that environment.

Run just one consumer when developing an adapter:

```bash
npm run quality-gate -- run --contract contracts/account-menu.yaml --adapter react-app
# or an adapter file:
npm run quality-gate -- run --contract contracts/account-menu.yaml --adapter adapters/react-app.adapter.ts
```

## Decision model

| Evidence | Contract severity | Decision |
| --- | --- | --- |
| Accessibility violation | `blocking` | `HOLD` |
| Accessibility violation | `warn` / `informational` | `NEEDS_APPROVAL` |
| Visual difference | any | `NEEDS_APPROVAL` |
| Missing baseline | any | `NEEDS_APPROVAL` |
| Matching baseline and no a11y findings | any | `SHIP` |

In this v1, `NEEDS_APPROVAL` intentionally fails the CI check. There is no separate approval service: an
approved visual change is made explicit by running `quality:update-baselines` and reviewing the committed PNG
change in the pull request. That keeps governance visible and small.

See [the report format](docs/report-example.md) for the human-readable output. `report.json` contains the same
data for another CI system or future dashboard.

## Repository map

```text
contracts/       The shared expectation
adapters/        Per-app selector and route mappings
runner/src/      Generic execution, diff, classification, policy, report, CLI
examples/        The React, Angular, and plain-HTML consumers
baselines/       Reviewable approved screenshots
artifacts/       Latest run evidence (ignored by git)
```

## CI

The GitHub Actions workflow starts all three apps on macOS, runs the contract, and uploads every screenshot,
diff, and report as an artifact. A `HOLD` or `NEEDS_APPROVAL` result makes the check fail; a clean run is
`SHIP`.

## Scope

This deliberately does not include a dashboard, AI failure summaries, multi-browser coverage, or a custom
approval workflow. It proves the contract → adapter → runner model before expanding it.

MIT licensed.
