# Quality Gate Report (format example)

This is the exact report shape the runner writes to `artifacts/report.md`. The first committed run should replace
this example with captured project evidence.

**Verdict: SHIP** · Contract: `account-menu` · Owner: design-system-team

Results: 9 ship, 0 need approval, 0 hold.

| Consumer | State | Artifact | Classification | Decision | Diff | A11y | Evidence |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| react-app | closed | account-menu-closed | pass | SHIP | 0.000% | 0 | `artifacts/react-app/account-menu/closed/account-menu-closed.png` |
| angular-app | open | account-menu-open | pass | SHIP | 0.000% | 0 | `artifacts/angular-app/account-menu/open/account-menu-open.png` |
| html-app | keyboard-focus | account-menu-keyboard-open | pass | SHIP | 0.000% | 0 | `artifacts/html-app/account-menu/keyboard-focus/account-menu-keyboard-open.png` |
