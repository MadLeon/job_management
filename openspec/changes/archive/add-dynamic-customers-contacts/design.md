<!-- 已归档（Archived）：见 ARCHIVE.md（2025-12-27） -->
## Context
- Current client filter uses static `customerList` from `data/data.js`, while contacts derive from `jobs` data via `useJobs` hook.
- Goal: DB-backed `customers` and `contacts` with usage-based ordering; UI management in `all-customers` is explicitly deferred to a future change.

## Goals / Non-Goals
- Goals: Introduce persistent tables, APIs, hooks, and filter ordering by `usage_count` desc then alphabetic asc; wire usage updates from job creation.
- Non-Goals: Changing existing `jobs`/`job_history` schema or removing current fields; heavy analytics beyond usage counts; implementing `all-customers` UI in this change.

## Data Model
- `customers`: `customer_id` INTEGER PK AUTOINCREMENT; `customer_name` TEXT UNIQUE NOT NULL; `pdf_folder_path` TEXT NULL; `is_active` INTEGER DEFAULT 1; `usage_count` INTEGER DEFAULT 0; `last_used` TEXT DEFAULT CURRENT_TIMESTAMP; `created_at` TEXT DEFAULT CURRENT_TIMESTAMP; `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP.
- `contacts`: `contact_id` INTEGER PK AUTOINCREMENT; `contact_name` TEXT NOT NULL; `customer_name` TEXT NULL (string FK for compatibility); `usage_count` INTEGER DEFAULT 0; `last_used` TEXT DEFAULT CURRENT_TIMESTAMP; `is_active` INTEGER DEFAULT 1; `created_at` TEXT DEFAULT CURRENT_TIMESTAMP; `updated_at` TEXT DEFAULT CURRENT_TIMESTAMP.
- Soft delete via `is_active=0`; no hard deletes.
- Backfill sources: `customer_folder_map` + `data/data.js` (customers); distinct `customer_contact` from `jobs` + `job_history` (contacts).

## Sorting Rules
- Customers: order by `usage_count` DESC, then `LOWER(customer_name)` ASC.
- Contacts: order by `usage_count` DESC, then `LOWER(contact_name)` ASC; optional `WHERE customer_name = ?` for scoped lists.

## API Surface (proposed)
- `GET /api/customers`: returns active customers with ordering above; optional `sort=name|usage|recent` fallback to default ordering.
- `POST /api/customers`: create customer (name unique); default `usage_count=0`, `is_active=1`.
- `PUT /api/customers/:id`: update name/path/is_active.
- `PUT /api/customers/:id/usage`: increment usage_count and set `last_used = job_created_at` (called from job creation flow).
- `GET /api/contacts`: optional `customer_name` filter; ordered as above.
- `POST /api/contacts`: create contact with optional `customer_name`.
- `PUT /api/contacts/:id`: update contact_name/customer_name/is_active.
- `PUT /api/contacts/:id/usage`: increment usage_count and set `last_used = job_created_at` (called from job creation flow).

## Frontend Consumption
- Hooks: `useCustomers`, `useContacts` via React Query; cache by query params (`customer_name`, `sort`).
- Filters: `ClientAutocomplete` uses `useCustomers` list; `ContactAutocomplete` uses `useContacts` (scoped when client selected). Ensure deterministic ordering and show loading states.
- Usage bump: only from job creation flow; filters do not trigger usage updates.

## Migration Plan
1) Create `customers` table; seed from `customer_folder_map` and `customerList` (dedupe by lower-cased name), default usage_count=0.
2) Create `contacts` table; seed distinct `customer_contact` from `jobs` + `job_history`; default usage_count=0.
3) Backfill `usage_count` and `last_used` by counting occurrences in `jobs` + `job_history`; `last_used` should use the latest job creation timestamp where the entity appears.
4) Add indexes: `customers(customer_name UNIQUE)`, `contacts(contact_name, customer_name)` (non-unique) plus optional `contacts(contact_name)` for sorting.
5) Verify `db:migrate:status` and sample queries.

## Risks / Trade-offs
- String-based `customer_name` link in `contacts` is simpler for migration but less strict than FK; plan future FK once data is clean.
- Usage bumps happen only on job creation; ensure job-create codepath reliably triggers usage updates.
- Need to ensure case-insensitive uniqueness on `customer_name` to avoid duplicates; migration should normalize casing.

## Open Questions
- Should `last_used` default to `created_at` or stay NULL until first use? (default to `created_at`)
- Should contact uniqueness be `(contact_name, customer_name)` to prevent cross-customer collisions? (Assume non-unique contact_name globally, but consider scoped uniqueness.)
