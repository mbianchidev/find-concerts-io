# Private concert workbooks

Create an account and open `/import`. Upload an `.xlsx` copy; Apple Numbers
documents must first be exported as Excel. The importer inspects all worksheets,
shows their headings and sample rows, and asks you to confirm selected sheets
and field mappings before saving anything.

Supported display fields are title, concert date, location as written, optional
city/country, attendance/travel dates, original price, attendance status, and
notes. Every original cell in an imported row is also preserved under its
original column heading, including blank values, numbers, and whitespace.
The original workbook is never modified.

Limits are 5 MB compressed, 30 MB actually expanded, 20 sheets, 5,000 rows per
sheet, and 100 columns. ZIP entries are validated and inflated with bounded
output before XML parsing; encrypted or inconsistent archives are rejected.

## Dates and row counts

Excel-formatted dates, 1900-system serials, unambiguous ISO dates, English month
names, and same-month date ranges are supported. The library handles workbook
date-system metadata. Excel's fictitious 1900 leap day is not invented.
Ambiguous slash dates require a chosen day-first or month-first mapping.
Uncertain text and missing dates remain unconfirmed, with their original text
preserved and an explicit warning. No placeholder date or venue is fabricated.

Year-only section headings, including numeric year cells, are reported as
skipped. Blank rows inside the data range are reported as skipped; entirely
empty trailing spreadsheet rows are outside the parser's data-row count.
Invalid rows have sheet/row errors and an explicit error count (a subset of skipped rows). `imported + duplicates + skipped = total`
for the selected data rows. Unselected sheets are identified in the preview
and are not silently counted as imported.

## Duplicates and conflicts

Identity is scoped to the account and derived from normalized title, original
date value, and location. Repeating an unchanged import skips exact duplicates.
If an existing identity has different fields, the row is skipped with a conflict
warning; it is not overwritten. Different date representations can be distinct
identities, so review the preview before importing a reformatted source.
Unconfirmed dates remain searchable in the private import list.

Public pages, sitemaps, provider searches, and deployment artifacts never include
the imported records. Export or delete them through `/account`. No raw workbook
file is retained on the server after the request; only private row data and
reports are saved.

## Server-console import

For a private, local one-off import:

```bash
npm run import:workbook -- --file /private/concerts.xlsx --inspect
npm run import:workbook -- --file /private/concerts.xlsx --username existing-account
```

The console shows headings and mapping for inspection, not sample row contents.
The import prints imported/duplicate/skipped/error information and verifies raw
field roundtrips against persisted private rows. Use `--mapping /private/mapping.json`
with an array of the inspected mapping objects if the suggested mapping is
not correct. Never pass passwords as command-line arguments, commit a workbook,
use real records as automated fixtures, or attach private data to a public issue.
