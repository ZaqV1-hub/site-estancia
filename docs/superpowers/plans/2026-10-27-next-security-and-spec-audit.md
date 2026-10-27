# Next.js security correction and specification audit

> **For agentic workers:** Use the applicable Superpowers execution and independent review workflow; existing user authorization covers execution and develop/main/production publication.

**Goal:** Remove the critical Next.js advisory from the deployed Windows application and verify the calendar implementation against the two user HTML references.
**Architecture:** Keep the current Next.js App Router, React19.2.4 and standalone IIS service. Upgrade only next/eslint-config-next to stable16.4.3 plus their lockfile dependencies; preserve business rules, prices, data and session boundaries.
**Tech Stack:** Node20.19.5, Next16, React19, Postgres, Vitest, Windows/IIS.
**Spec:** User Downloads Documento de Especificação.html and Protótipo Calendário Estância.html; conversation decisions supersede document examples.

## Constraints and initial state
- Base513fe3cf886205ee24b23928df30c15106afc67c, clean develop tracking origin/codex/develop. Use this user-selected checkout.
- Windows CVE-2026-75604 fixed16.3.3; current npm audit also reports newer critical ranges through16.4.0, recommending16.4.3. Official stable16.4.3 release and Node/React peer compatibility verified. Context7 lacks indexed16.4, so official release/package metadata and installed docs supplement it.
- No existing Graphify graph; use source/callers/tests directly. No new analysis services, providers, hooks, migrations or application dependencies.
- Keep writes isolated to estancia_calendar_local/localhost, SMTP and external payments disabled. Production checks are read-only; short manager session removed after navigation.
- No Next HML exists; unrelated PHP HML is excluded.
- Root owns package/lock/config/build/ports/database/Git/VM; independent audit worker reads docs/source and owns only private next-spec-audit.md.

## Task1 — dependency correction
Files package.json/package-lock.json.
- [x] Establish failing gate: npm audit --omit=dev --json reports9vulnerable packages, including critical next and Windows advisory. Save private next-audit-before.json.
- [x] Stop verified local Node79848, remove only generated .next to recover build space.
- [x] Run npm install --save-exact next@16.4.3 eslint-config-next@16.4.3; keep dependency/devDependency placement and React unchanged. Inspect lock diff for unexpected additions.
- [x] Run npm audit --omit=dev --json, assert next absent and critical0; separately enumerate remaining warnings without claiming all dependency vulnerabilities fixed.

## Task2 — specification and prototype audit
Files: source/components/lib/tests and both HTMLs read-only; report docs/superpowers/plans/2026-10-27-next-security-and-spec-audit.md, private next-spec-audit.md.
- [x] Map all six fronts and acceptance requirements to implementation/tests; distinguish illustrative prices/records and deferred features.
- [x] Compare browser1440/390 clear/dark to original prototype: calendar/report/date/event/reschedule/detail/customer. Validate unavailable products warning, validity, history and post-move totals through isolated integration.
- [x] Correct concrete in-scope gaps if found with a failing regression first; preserve user-approved behavior and record residual limits.

## Task3 — local proof and independent review
- [x] npm test -- --reporter=json --outputFile=.local/calendar-validation/next-unit-tests.json; npm run lint; npm run build (includes types). Run once each, repeat only affected checks after fixes.
- [x] Copy public/static into standalone and start local3002 with existing isolated env/storage root. Run scripts/test-operational-calendar.mjs and scripts/test-purchase-summary.mjs; inspect actual PDF content/pagination without changing generation scope.
- [x] Independent read-only final dependency diff/review, browser runtime/console and protected401 checks.

## Task4 — publication
- [x] Verify VM main513fe3c clean/Running/version/build, take fresh private database/availability/build backup.
- [ ] Commit, push HEAD:codex/develop, verify SHA; fast-forward main and push; return local develop.
- [ ] VM fast-forward exact release and use scripts/deploy-windows.ps1 with rollback. Confirm installed and standalone next16.4.3, Windows build/types, serviceRunning, health200 and no critical next audit.
- [ ] Run protected/public read-only production smoke and HTTPS browser checks, compare real PDF, remove temporary session and verify401. Record evidence and limits.

## Handoff
Next/eslint-config-next upgraded16.4.3; React and config unchanged. PostCSS/sharp/nanoid/SWC updated through dependency resolution, no unrelated direct additions. Audit after:0critical and no next entry; residual findings enumerated privately. Unit/lint/build running, source-only reference audit worker active. Old local server79848 stopped and generated.next removed to recover space. Publication not yet attempted.

### Audited gap — event date before step2
Prototype evNext checks future date before advancing. OperationalEventEditor admitted today in min and deferred rejection to publication. Reproduced browser acceptsToday:true and a failing year-boundary field-constraint regression. Minimal fix uses shared SãoPaulo day, min tomorrow, and rejects a new nonfuture event before advancing. Existing event edits remain permitted. Files src/components/operational-event-editor.tsx/.test.tsx. Browser proof must exercise both today rejection and future progression.

The same prototype step also rejects an already-published future date. Browser assertion RED confirmed2026-12-07 advanced to step2 before the fix. New internal creation reuses existing authenticated POST agenda/range-check (same vis_agenda permission already required at publication), stops on existingDates or network/auth failure, and preserves backend conflict authority. No new endpoint or schema. Root must verify duplicate/future/network cases in final browser build.

### Browser-found mobile title overflow
An existing event with a valid52-character title containing a long unbroken token expanded the mobile editor grid: viewport390px/document547px. Setting overflow-wrap:anywhere on the shared calendar heading in the browser reduced document390px. Applied the same one-property CSS correction; final compiled browser verification required. No new CSS-mirroring unit test.

### Browser-found past empty mobile cells
The prototype hides past empty closed cells on mobile. October in the actual implementation showed26disabled empty cells at390px versus0in the prototype. Added calendar-day-empty:disabled to the existing mobile hidden selector; enabled future new-date controls remain available in the all filter. Final compiled check must confirm0past empty visible and grid2columns.

## Local verification and audit result
- Read both HTML documents completely; independent source audit produced39requirements rows and11screens/modals/states in private next-spec-audit.md. Examples, deferred features and old unrelated admin pages are explicitly separated. Main calendar flows have no other material gap found in this review. This is not a claim of pixel identity for all legacy administrative pages.
- Fixed3concrete differences: first-step new-event future/duplicate validation; mobile long-title overflow; mobile past empty cells. Today/year-boundary test RED then GREEN. Browser duplicate transition assertion RED then GREEN. Pending date/type locked, network failure remains step1, valid future advances step2; existing/modal/external paths preserved.
- Final fresh-cache standalone build/types Next16.4.3 succeeded;802/802unit tests; ESLint0errors/10warnings (7existing plus3new rule warnings on existing location.assign navigation; no source behavior change needed). Focused editor/range-check tests6passed. Independent review of dependencies, editor/preflight and CSS: no pending findings.
- Compiled CSS initially stale in incremental local cache; fresh generated.next removal with server stopped produced the new property. Final compiled browser long52-character title viewport390/document390, wrap:anywhere; past empty cells0,2columns159px+159px, future controls28available. Sidebar260px desktop, drawer at1249, Rubik and11px/700/.18em labels, calendar/report/date/event/customer responsive without page overflow in sampled screens.
- Real isolated Postgres/HTTP15calendar scenarios and5purchase/PDF scenarios passed with Next16.4.3. Additional second move preserves original date through two moves and customer API (purchase59,10/12→11/12→12/12). Local customer login200, page displays new/original/validity. PDFs Dayuse1page, school2pages, school24vouchers5pages all have page number, fiscal disclaimer and bounds. No SMTP/payments/WhatsApp external.
- VM preflight: main513fe3c clean, Running, old Next16.2.4 root/standalone, buildSYJPV2U4BLfhFJ-4gkm4g,50.3GBfree. Fresh backup207093bytes/452noncomment archive entries, compra/voucher verified, private remote20261027-next-security/database.dump. No schema changes.
- Audit before9packages(1critical), after5packages(0critical;2high,3moderate), next absent. Remaining baseline-browser-mapping/fflate/mysql2/nodemailer/source-map-js are not claimed fixed; nodemailer needs a separate major-version compatibility cycle.
- Current local runtime standalone3002 session81079. Pending: publish exact release through codex/develop/main, Windows build/runtime version/security proof, read-only HTTPS verification and session removal.
