# Database Design

## Current Tables

- parts
- invoices
- invoice_items
- technicians
- insurance_companies
- suppliers

## Planned Tables

### oem_cross_references

Purpose:
Stores manufacturer-specific OEM part numbers for each WerkParts part.

Fields:

- id
- part_id
- manufacturer
- oem_part_number

Relationship:

parts (1)
      │
      │
      └───────────────► many OEM Cross References
