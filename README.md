# QRAOS™ Development Command Center v4

A browser-based Canadian multifamily development feasibility, CMHC ACLP screening, underwriting, due-diligence and project-management platform designed for GitHub Pages.

## v4 model upgrades

- Separate residential and commercial revenue, vacancy, expenses, reserves and NOI
- Residential and non-residential LTC calculated separately
- Residential and non-residential DCR calculated separately
- Actual-rate and qualification-rate debt service
- Monthly construction draw and calculated interest-carry estimate
- Residential and commercial pre-leasing and lease-up absorption
- Rent growth and expense growth projections
- Exit value using capitalized NOI, value growth, or a conservative comparison
- Selling costs, loan balance at exit and net sale proceeds
- Monthly equity cash flow, NPV, IRR and equity multiple
- Schema migration for imported v3 project JSON files
- Offline service-worker cache v4

## Deployment

Upload every file and folder in this package to the repository root. Then enable GitHub Pages from the `main` branch and `/(root)`.

## Validation

Run locally with Node.js:

```bash
node tests/model_tests.js
node tests/input_path_audit.js
```

The included tests validate core formula paths and all rendered input paths. See `VALIDATION_REPORT.md` and `MANUAL_VALIDATION_CASE.md`.

## Important limitation

This remains a preliminary internal decision-support model. It is not an official CMHC workbook, lender commitment, appraisal, quantity-surveyor report, legal opinion, tax model or municipal approval. Professional and lender verification is required before committing capital.
