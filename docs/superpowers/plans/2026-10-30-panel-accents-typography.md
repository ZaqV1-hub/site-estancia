# Panel accents and typography implementation plan

> **For agentic workers:** Use the applicable Superpowers diagnostic, parallel-work and independent review workflows. User authorized execution, branch synchronization and production publication; preserve the selected develop checkout.

**Goal:** Correct Portuguese accents and make administrative typography consistent with the purchase screen, preserving Isaac production changes.
**Architecture:** Recover the exact source snapshot from the VM because Isaac changes are not on origin, then edit presentation strings and shared scoped panel CSS. Preserve identifiers/URLs/enums/SQL/auth/data/exports. No redesign, schema or new dependencies beyond the existing Isaac snapshot.
**Stack:** Next16.4.3/React19/Rubik/Postgres/Windows standalone/IIS.
**Baseline:** f47132de68c9f4fbbada484c7969b63d0d8ad8af; clean local develop at start. Main/develop pulled fast-forward and already current.

## T1 — synchronize and protect Isaac work
- [x] Inspect origin branches and VM state read-only. Origin unchanged; VM has16tracked edits plus14newsource/assets.
- [x] Capture complete binary patch and new src/public-brand files privately. Snapshot patch149540bytes sha256868dbb60ae78d6ebc0f1b9e31f08a98fe6a580ffa3812237ca57b7becc11dc04. Do not include.next backups, secrets or uploads.
- [x] Apply exact snapshot locally after git apply --check. Keep VM source untouched until final deployment safety snapshot/reconciliation. VM mainf47132d, Running, build_yg9NOYfLzVzben2pVAW5,Next16.4.3.
- [x] Install locked dependencies added by Isaac; inspect baseline tests/build for actual compatibility regressions without undoing his feature changes.

## T2 — visible copy only
- [x] Worker1 owns src/components/painel*.tsx,school-trips-panel.tsx and corresponding presentation tests; root owns CSS. Correct visible labels/placeholders/feedback/accessibility text in Portuguese.
- [x] Worker2 owns panel/ops lib display labels/errors and corresponding tests, plus panel route metadata/visible titles. Never alter machine strings/keys/routes/status codes/data matching.
- [x] Review every diff; trivial spelling edits need no text-mirroring tests. Update existing assertions only where visible output changed.

## T3 — typography diagnosis and smallest fix
- [x] Compare computed family/weight/size/spacing for purchase and admin headings/body/forms/tables. Inspect scoped CSS, global styles and local component classes before editing.
- [x] Make only shared scoped panel changes or minimal legacy heading class adjustments required by proof. Preserve sizes where hierarchy differs intentionally, mono values where operationally needed, print/public site design and accessibility.
- [x] Verify representative users/site-users/parameters/clients/conventions/discounts/complimentary/ticket-office pages alongside purchase in desktop/mobile clear/dark, without mutating production business data.

## T4 — proof and publication
- [x] Targeted checks and full suite/lint/build/types. Fix only actual integration regressions found in the imported snapshot; preserve Isaac B2B/calendar/export behavior.
- [x] Independent read-only final revision review. Browser text/font samples and no page overflow; exports remain valid and protected.
- [x] Fresh private VM source/database/availability/build backup. Recheck Isaac snapshot hashes immediately before deployment; stop if new edits appeared.
- [ ] Commit imported source and polish; push codex/develop, verify SHA, promote main, return local develop.
- [ ] Reconcile VM only against already-backed-up unchanged snapshot, fast-forward exact release, deploy existing rollback script. Preserve all old backups/untracked generated data.
- [ ] Confirm runtime16.4.3, health/service/version, HTTPS administrative copy/font/exports read-only. End short signed verification session and verify protected401.

## Continuity
Root owns Git/package/lock/build/ports/CSS/DB/VM and final integration. Workers have disjoint files and no Git/build/server/DB/browser/VM authority. No existing Graphify graph expected; use source contracts directly. Production credentials from prior temporary account expired; do not reactivate or reset it without request. Testing local DB only, no SMTP/payments. Publication remains authorized.

## Verified integration — before publication
- Locked npm ci passed. Imported Isaac export/UI contracts reconciled in existing tests (real XLSX is opened, not mocked HTML). No operational identifiers/enums/import column names changed.
- 258 test files / 808 tests passed; focused real XLSX2/2 and APIs12/12. Fresh production build and explicit TypeScript passed. ESLint0errors/10existingwarnings; git diff --check clean.
- 15 isolated local calendar HTTP/SQL scenarios passed;5purchase summary fixtures generated valid real PDFs, parsed1/2/5pages for dayuse/school/24school and1page for pending/cancelled. Real XLSX and printable HTML exports plus protected401 and day report verified.
- Real compiled browser (no injected style):10desktop and10mobile pages, Rubik, primary titles24/700, table14, headers11/700, labels13.5/600, controls14.5/400. Width1440/1440 and390/390, no replacement characters. Params legacy named accent entities displayed correctly; existing values unchanged by read.
- Legacy Funcionario role enum preserved, sidebar display Funcionário. Additional minimal dark calendar background correction required by observed Isaac light-background/dark-ink mismatch; compiled contrast11.88:1, no horizontal overflow.
- External B2B connection intentionally absent locally; unavailable-state tested. Production B2B read verification remains required. No real payments or SMTP sent.
- Private VM source/env/availability snapshot backed up and exact16tracked+14newfiles reverified unchanged, original build preserved for deployment script rollback. Availability SHA256e6f49cba61a65823e328c70d7d26a1a557b4092c1906ce8bcc904ef3e1e0cdc4. DB archive207909bytes, pg_restore list verified, SHA2561670132ceec30c127fa364a1a2b7fe66b171ef2b83cbbc4ed072cd0feedefd7b. Exact snapshot recheck repeats immediately before reconciliation.
