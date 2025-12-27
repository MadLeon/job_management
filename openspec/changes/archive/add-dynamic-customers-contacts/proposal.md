<!-- 已归档（Archived）：见 ARCHIVE.md（2025-12-27） -->
# Change: Add dynamic customers/contacts tables and sorted filters

## Why
- Client filter uses hardcoded `customerList` from data/data.js, causing stale data and no usage-based ordering.
- Contact filter scrapes jobs at runtime, missing a dedicated source of truth and usage metadata.
- We need DB-backed customers/contacts to serve filters with deterministic sorting and prepare for future management.

## What Changes
- Add `customers` and `contacts` tables with usage metadata (`usage_count`, `last_used`) and soft-delete (`is_active`).
- Provide API endpoints and hooks to serve customers/contacts for filters, sorted by `usage_count` (desc) then alphabetical.
- Define usage tracking so `usage_count` increments only when a new job is created; `last_used` mirrors that job's creation timestamp.
- Defer `all-customers` management UI (listing/CRUD) to a later change; current scope is data + APIs + filter consumption.

## Impact
- Affects data layer (migrations, `better-sqlite3`), API layer (Next.js API routes), and UI filters (`ClientAutocomplete`, `ContactAutocomplete`).
- Requires React Query hooks for customers/contacts and changes to filtering logic for ordering.
- Excludes `all-customers` UI changes from this change-set (will be a future proposal).

## Risks / Constraints
- Must preserve existing jobs data; no breaking changes to `jobs`/`job_history` schema.
- Sorting must remain deterministic: `usage_count` desc, then case-insensitive `customer_name`/`contact_name` asc.
- Soft delete only via `is_active`; do not hard-delete rows.
- Usage updates occur only on new job creation events.

## Open Questions
- Should `contacts` link to `customers` by `customer_name` (string) or future `customer_id` FK? (Assumed: use `customer_name` for compatibility now.)