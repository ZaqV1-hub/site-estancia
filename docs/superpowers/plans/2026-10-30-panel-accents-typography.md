# Administrative panel accents and typography

Date: 2026-10-30. Status: complete.

## Objective and scope

Correct Portuguese accents and align administrative typography with Purchases. Synchronize develop and main, preserve Isaac's production changes, validate locally and publish to the existing Windows/IIS production site. No redesign, schema changes or new dependencies beyond Isaac's existing ExcelJS dependency.

Baseline: `f47132de68c9f4fbbada484c7969b63d0d8ad8af`.
Application release: `ebc96ce378e9d9306df2683e6f374ea343c12e08`.
Production build: `8vHcEV5rUMHpjyEJ60ehO`, Next.js 16.4.3.

## Completed plan

- [x] Pull main and develop with fast-forward only. Both remote branches were already current; Isaac's changes existed only as uncommitted files on the VM.
- [x] Capture and import the complete VM binary patch, 16 tracked changes and 14 new source/font files. Preserve generated build backups, environment, data and uploads. Recheck every captured source hash immediately before reconciliation.
- [x] Correct visible component text, metadata and API messages. Preserve routes, enums, database values, SQL, CSV import headers and authorization contracts. Display the legacy Funcionario role as Funcionário without changing the role enum.
- [x] Decode named Portuguese accent entities in parameter textareas for display. Preserve password values, placeholders and untouched stored messages; keep existing save validation and transactions.
- [x] Diagnose typography in the browser. Rubik was already shared; legacy sizes and weights differed. Scope the correction to panel screen styles: primary headings 24/700, table headers 11/700, table body 14, labels 13.5/600 and controls 14.5/400. Preserve print styles and intentional monospace values.
- [x] Correct the observed dark calendar contrast issue caused by Isaac's light backgrounds combined with dark-theme text. Preserve calendar colors and behavior in light mode.
- [x] Reconcile existing tests with Isaac's deployed export/UI contracts. Open real XLSX files in tests rather than mocking the obsolete HTML exporter.
- [x] Complete local checks and independent read-only review. Review the imported source, human-only string changes, parameter adapter, CSS and test deltas; resolve the relevant findings.
- [x] Back up VM sources, environment, availability and the production database privately. Verify the database archive list and SHA-256 before publication.
- [x] Push develop, verify its release SHA, then fast-forward and push main. Return the local checkout to develop.
- [x] Reconcile only unchanged, backed-up VM source paths and fast-forward the exact release. Deploy through the existing Windows rollback script.
- [x] Verify production runtime, public/protected routes, administrative typography, accents, exports and B2B reads. End the short verification session and confirm protected access returns 401.

## Verification evidence

- 258 test files and 808 tests passed. Focused export/API checks passed. Fresh production build and explicit TypeScript check passed. ESLint reported zero errors and 10 existing warnings. Git whitespace checks passed, including the imported files.
- Fifteen isolated local calendar HTTP/SQL scenarios passed. Five purchase-summary fixtures produced valid PDFs, including day-use, school, large school, pending and cancelled purchases. Real XLSX, printable HTML reports and unauthenticated export rejection passed.
- Ten desktop and ten mobile local pages were checked against the compiled build, without injected CSS. Rubik and the intended sizes/weights were confirmed. Document widths matched 1440 and 390 pixels; no replacement characters or literal accent entities remained in the checked UI. Dark calendar text contrast measured 11.88:1.
- Production passed 35 read-only HTTP checks: public pages, 11 administrative pages, unauthenticated 401 responses, matching calendar/day/list totals, day reports, purchase/voucher XLSX and printable reports, used-voucher details and real purchase-summary PDFs.
- The production B2B connection is available. School trip 27/18, participant filters, its 24-row Excel export and printable report passed. B2B was intentionally unavailable in the isolated local environment; its unavailable state was verified there.
- HTTPS browser checks confirmed administrative accents, parameter Unicode, Rubik and the purchase typography scale on desktop and mobile. No document overflow was observed. Dark calendar backgrounds and gray used-voucher cells were confirmed. No console errors appeared on the final detail page.
- The service is Running, tracked VM sources are clean, availability is byte-identical to the pre-reconciliation snapshot and the report font matches its standalone copy.
- Logout returned 200, subsequent protected calendar access returned 401 and the browser session cookie was removed.

Private evidence is in `.local/panel-polish-20261030/`. No secrets, database archives or production source snapshots were added to Git.

## Deployment notes and remaining limits

The first remote wrapper stopped on an npm deprecation warning because it piped native stderr through a PowerShell caller using Stop. Confirmed that no deploy process remained, restored the previous build and verified HTTP 200. The retry used Start-Process with separate OS-level log files and completed successfully. Windows compilation took 5.3 minutes. An OEM log-decoding error was handled by reading the successful completion log safely and independently checking the runtime; it did not trigger another deployment.

The previous build remains available as `.next-deploy-backup-20261030124109`. No production business writes, real payments or email sends were performed by verification. The final follow-up commit changes only this record; application sources remain the tested release above. The local standalone server remains available at `http://127.0.0.1:3002` (PID 33195, session 1512); no further background work is claimed.
