# Validation — 2 November 2026

Reference: MDM Figma page 8 (229:431), Overview (229:58), Journey Studio (261:87), and product-state variants. Header artwork, Elm logo and metric icons are bundled from the source design.

## Passed

- 10 Python unit/integration tests, including Streamlit AppTest mounting the actual app without exceptions.
- Default totals reconcile by customer, product and month: 600,530 transactions, 76 customers, 7 inactive customers.
- Featured customer 390,000 transactions; YAKEEN 12,000. Unlinked Product 08 has no invented transaction figures.
- Product filters, future-customer exclusion, incomplete comparison periods, duplicate-upload rejection and assistant scope checked by tests.
- JavaScript syntax check and Python compilation.
- Browser visual review of the exact HTML/CSS/JS component with the Excel-derived payload at desktop, tablet (885px content) and mobile widths. No horizontal overflow at 375px mobile width or 1363px desktop viewport. Customer selection, locked state and product-list scrolling reviewed.

## Scope and limitations

The managed browser preview runtime could not run Python. Browser layout review used the same component and data with a small test bridge; Streamlit backend mounting and analytics were tested separately using AppTest. A live browser session against the complete Python server, optional external AI service, and Windows batch launcher was not available in this environment.

The interface adapts spacing to available width rather than scaling a Figma screenshot. The screenshots' product-state variants are interactive states of one workspace, with a separate All products table view, rather than duplicated independent pages. Placeholder product names and all workbook values are synthetic. The local assistant is a focused analytics assistant, not an unrestricted conversational model.

## Focused revision

Removed layout selector and requested subtitles. Added All products navigation, searchable 20-row table, View product and Back to journey actions; browser checked search and return navigation. Inactive customers show all seven rows without internal scrolling (385px width = scrollWidth; 323px height = scrollHeight). Contribution rows now label transaction counts and customer share. Python tests: 10 passed.


Focused formatting/export update: 10 Python tests passed. Browser component checks passed for Overview/customer monthly transaction-share labels, removed portfolio captions, Covered products, monthly CSV download, assistant answer CSV, and supporting-data CSV. Shares use filtered totals; assistant exports retain the question scope.
