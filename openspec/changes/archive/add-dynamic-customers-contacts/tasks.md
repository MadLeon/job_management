<!-- 已归档（Archived）：见 ARCHIVE.md（2025-12-27） -->
## 1. Migrations
- [x] 1.1 Create `customers` table (schema: customer_id PK, customer_name UNIQUE, is_active DEFAULT 1, usage_count DEFAULT 0, last_used TEXT DEFAULT CURRENT_TIMESTAMP, created_at, updated_at) and backfill from `data/data.js` `customerList` only.
- [x] 1.2 Create `contacts` table (schema: contact_id PK, contact_name, customer_name, is_active DEFAULT 1, usage_count DEFAULT 0, last_used TEXT DEFAULT CURRENT_TIMESTAMP, created_at, updated_at) and backfill unique contacts from `jobs`/`job_history`.
- [x] 1.3 Add usage_count and last_used backfill scripts (counts from `jobs`/`job_history` using latest job creation date for last_used).
- [x] 1.4 Validate migrations with `npm run db:migrate` and `node scripts/check-db.js`.

## 2. API Layer
- [x] 2.1 Add `GET /api/customers` with sorting (`usage_count` DESC, then `LOWER(customer_name)` ASC) and `is_active=1` filtering.
- [x] 2.2 Add `GET /api/contacts` with optional `customer_name` filter; sorting (`usage_count` DESC, then `LOWER(contact_name)` ASC), `is_active=1`.
- [x] 2.3 Add usage update integration: increment usage_count and set last_used only when a new job is created (wired in job-create flow).
- [x] 2.4 Add `POST/PUT` for customers/contacts (create/update/soft delete) to support future management UI (API-only in this change).

## 3. Frontend Hooks & Filters
- [x] 3.1 Add React Query hooks `useCustomers` and `useContacts` for sorted, cached data.
- [x] 3.2 Update `ClientAutocomplete` to consume API data and maintain ordering; handle loading/errors.
- [x] 3.3 Update `ContactAutocomplete` to consume API data，支持 `selectedCustomer` 作用域，并按客户进行分组 `groupBy(customer_name)`；客户组排序遵循与 `ClientAutocomplete` 相同的规则（客户 `usage_count` 降序，然后客户名字母升序），实现通过 `useCustomers` 的 `usage_count` 映射；同一客户组内联系人按 `usage_count` 降序、名字母升序。
- [x] 3.4 Wire usage updates from the job creation flow (not from filter selection) to increment usage_count/set last_used.

## 4. Validation
- [ ] 4.1 Add unit/integration tests for API sorting and filters.
- [ ] 4.2 Add UI tests for autocompletes ordering and usage bump behavior.
- [x] 4.3 Document runbooks/README updates for new endpoints and migrations (see `IMPLEMENTATION_NOTES.md`).

---

### Notes / Deltas from original plan
- Removed `pdf_folder_path` from `customers` schema and API.
- `customers` backfill source is `data/data.js` `customerList` only; not using `customer_folder_map`.
- `last_used` defaults to `CURRENT_TIMESTAMP` on both tables.
- Usage increments happen only on new job creation; filter selection does not affect usage.
- Contact grouping added: groups ordered by customer `usage_count` DESC then name ASC; within-group contacts ordered by `usage_count` DESC then name ASC.
