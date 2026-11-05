# Changelog

All notable changes to **Hardware Pit** are documented here.

## Version 1.0.1 - Few other changes (Planned)

### Added

- Add a markup setting into the settings (defaults to 40%)
- Lock down the portable app

### Improved

- Change how the customer price is calculated
- Make reports more interactive with the ability to view all the way down to individual invoices

## Version 1.0.0 - Hardware Pit Portable Desktop Release

### Added

- Hardware Pit application branding and updated interface layout.
- Electron-based Windows desktop application.
- Portable Windows application build.
- Windows installer build.
- SQLite database definitions and migration logic.
- Database seed data for the current development build.
- Application settings functionality.
- Invoice generation functionality.
- Report generation functionality.
- Updated API schemas and database definitions.

### Improved

- Updated application layout and branding.
- Improved invoice and report generation endpoints and schemas.
- Updated database migration and initialization logic.
- Updated project configuration and dependencies.
- Added desktop application packaging and build configuration.

### Notes

This version represents a major milestone for Hardware Pit, moving the project toward a portable Windows desktop application.

The application uses a local SQLite database and supports both portable application and installer builds. The current development build includes catalog seed data.

---

## Version 0.3.0 - Reports Improvements

### Fixed

- Fixed issues with the Reports page.
- Updated report routing to support report detail pages.
- Updated report API route handling.

### Added

- Added a dedicated report detail page.
- Added report definitions to support report navigation and detail views.
- Improved access to individual reports through the Reports interface.

### Improved

- Refined the Reports page layout and navigation.
- Improved the overall reporting workflow.

---

## Version 0.2.0 - Parts & Invoice Workflow Improvements

### Added

- Automatic part lookup while creating invoices.
  - Typing an Auveco part number automatically fills the part description and cost.
  - Customer pricing is automatically calculated using a 40% gross profit margin.
- Expanded parts import functionality.
  - Import parts from CSV files.
  - Import parts from XLS/XLSX/Excel files.
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
- Added more reports.

### Improved

- Parts lookup and invoice entry workflow.
- Invoice editing and finalization process.
- Parts catalog import capabilities.
- Pricing automation.
- Reuse of information from previous repair orders.

### Notes

This version represents a major expansion of the original WerkParts baseline, with improved parts lookup, automated pricing, expanded catalog importing, cross-reference support, and a draft/finalized invoice workflow.

The cross-reference system is currently in place but has not yet been populated with OEM-to-catalog part relationships.

---

## Version 0.1.0 - Initial Stable Release

### Added

- Dashboard.
- Invoice Management.
- Parts Management.
- CSV Part Import.
- Reports.
- Settings.
- Company Logo on Printed Invoices.
- Light/Dark Theme.
