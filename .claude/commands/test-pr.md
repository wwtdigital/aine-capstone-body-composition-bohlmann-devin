Run the Test Before PR checklist. Do not open a PR or mark work complete until this passes.

Steps:
1. Run: `npm test`
2. Run: `npx tsc --noEmit`
3. Check coverage — must stay at or above 75% overall
4. If tests fail due to your changes: fix them before proceeding
5. If tests were already failing on main: document in PR description
6. Never open a PR with failing tests without an explicit note

Report results: pass/fail for each step, coverage %, any failures with file:line.
