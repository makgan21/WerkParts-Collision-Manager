# Changelog

All notable changes to WerkParts Collision Manager will be documented here.

## Version 0.1.0 - Initial Stable Release

### Added
- Dashboard
- Invoice Management
- Parts Management
- CSV Part Import
- Reports
- Settings
- Company Logo on Printed Invoices
- Light/Dark Theme

## Version 0.2.0 - Parts & Invoice Workflow Improvements

### Added

- Automatic part lookup while creating invoices
  - Typing an Auveco part number automatically fills the part description and cost.
  - Customer pricing is automatically calculated using a 40% gross profit margin.
- Expanded parts import functionality
  - Import parts from CSV files.
  - Import parts from XLSX/Excel files.
  - Imported over 10,000 Auveco part numbers into the parts catalog.
- Parts database updates to support expanded pricing and catalog information.
- Parts catalog cross-reference functionality.
  - Added support for linking OEM part numbers to catalog parts.
  - Invoice part lookup can search using OEM part numbers.
  - OEM lookups automatically fill the corresponding part information.
- Invoice draft workflow.
  - Saving an invoice creates a draft instead of immediately locking it.
  - Draft invoices can be edited.
  - Added invoice finalization workflow.
  - Finalized invoices are locked and can only be printed.
- RO lookup functionality.
  - Search past invoices by RO number.
  - Matching RO information automatically fills available insurance and vehicle information on new invoices.
- Added more reports

### Improved

- Parts lookup and invoice entry workflow.
- Invoice editing and finalization process.
- Parts catalog import capabilities.
- Pricing automation.
- Reuse of information from previous repair orders.

### Notes

This version represents a major expansion of the original WerkParts baseline, with improved parts lookup, automated pricing, expanded catalog importing, cross-reference support, and a draft/finalized invoice workflow.

The cross-reference system is currently in place but has not yet been populated with OEM-to-catalog part relationships.
