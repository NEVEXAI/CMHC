# QRAOS v4.1 Validation Report

Validation completed July 30, 2026.

## Automated checks passed

- JavaScript syntax validation with `node --check`
- 14 financial and edge-case regression tests
- 127 unique user-editable input paths verified against the default saved-project schema
- All 17 application view renderers returned valid markup
- Affordable rent applies only to Affordable A/B rows
- Residential and commercial schedules remain separate
- Stabilized occupancy and vacancy reconcile conservatively
- Residential and non-residential LTC split correctly
- Residential and non-residential DCR capacity split correctly
- Actual-rate debt service differs correctly from qualification-rate debt service
- Construction carry changes with duration, rate and draw profile
- Rent and expense growth affect annual NOI
- Sale costs reduce net proceeds
- Discount rate affects NPV
- Construction, residential absorption, commercial absorption, lease-up and hold periods determine monthly DCF length
- Commercial and residential ramped NOI both reduce lease-up interest carry
- Extreme inputs remain finite and are clamped or warned where appropriate

## Files used for validation

- `tests/model_tests.js`
- `tests/input_path_audit.js`
- `tests/reference_case_results.json`

## Model scope

The model includes preliminary development cash flow, financing and equity-return calculations. It intentionally excludes income taxes, depreciation, GST/QST recovery timing, partnership waterfalls, preferred returns, construction retainage, detailed lender advance conditions, insurance premiums, renewal pricing, refinancing fees and legal enforceability. Those items require separate professional models or future modules.

## Certification statement

The code has been systematically tested for its intended screening functions, but no software package can honestly be guaranteed error-free or lender-approved. Users must validate assumptions against current CMHC materials, an approved lender, professional reports and the official project assessment workbook.
