# Job Management System - AI Coding Agent Guide

## Architecture Overview

This is a **Next.js 16 manufacturing job management application** (Pages Router only) with SQLite database for tracking jobs, customers, assemblies, and production workflows. The system uses server-side database operations via API routes and client-side React Query for state synchronization.

**Chat Language:**
- All response messages are in Chinese Simplified.
- Coding snippets use English for comments and identifiers.

**Tech Stack:**
- **Frontend**: React 19.2, Next.js 16 (Pages Router), Material-UI v7, Emotion CSS-in-JS
- **Backend**: Next.js API Routes (Node.js runtime), better-sqlite3 v12.5 for SQLite
- **State Management**: TanStack React Query v5 (5min staleTime, 10min gcTime), local React state for UI
- **Database**: SQLite at `data/jobs.db`, versioned migrations in `scripts/migrations/`

## Key Architectural Patterns

### Database Layer ([src/lib/db.js](src/lib/db.js))
- **Singleton Pattern**: `getDB()` returns cached instance; must be imported in all API routes
- **Database Path**: Uses `process.env.DB_PATH || path.join(process.cwd(), 'data', 'jobs.db')`
  - ⚠️ **Critical**: Use `process.cwd()` not `__dirname` (Next.js compilation quirk)
- **Pragmas** configured: `journal_mode = DELETE`, `foreign_keys = ON`, `transaction_isolation = IMMEDIATE`
- **Database initialization** in `src/lib/db.js` runs automatically on first `getDB()` call
- All queries use `.prepare().all()`, `.run()`, or `.get()` - synchronous only

### API Routes Pattern ([src/pages/api/jobs/](src/pages/api/jobs/))
- **Handler function**: `export default function handler(req, res)` in each file
- **Database import**: `import getDB from '@/lib/db'` at the top
- **Structure**: GET in `index.js`, mutations in `update.js`, detailed operations in `*-create.js|update.js|delete.js`
- **Error handling**: `try-catch` wrapping all DB operations, respond with `{ error: message }` and status 500
- **Method validation**: Check `req.method` and respond with 405 for unsupported methods
- **Response format**: JSON with status code (200 OK, 405 Method Not Allowed, 500 Server Error)

### Frontend State Management
- **React Query**: Configure stale/gc times in [src/lib/queryClient.js](src/lib/queryClient.js)
  - Default: `staleTime: 5min, gcTime: 10min`
  - Import `queryClient` in `_app.js` wrapped with `QueryClientProvider`
- **Local UI State**: React hooks for drawer expansion, form visibility, modal open/close
- **Data Fetching**: Use `useQuery` for reads, `useMutation` for writes
- **Cache Invalidation**: After mutations, call `queryClient.invalidateQueries()` to refresh

### Component Architecture
- **Layout** ([src/components/layout/](src/components/layout/)): `AppHeader`, `Sidebar`, modals (`JobEditModal`, `CreateJobModal`, `PartEditModal`)
- **Forms** ([src/components/forms/](src/components/forms/)): `JobForm` (reusable create/edit), `PartEditForm`
- **Tables** ([src/components/table/](src/components/table/)): `JobTable`, `JobTableRow`, `JobDetailRow` for expandable details
- **Shared UI** ([src/components/shared/](src/components/shared/)): Reusable components like badges, chips, cards
- **Legacy** ([src/components/legacy/](src/components/legacy/)): Old versions - avoid; use `table/` and `shared/` instead

### Sidebar Navigation Pattern
- **Component**: [src/components/layout/Sidebar.jsx](src/components/layout/Sidebar.jsx) with collapsible drawer
- **State Tracking**: `DashboardSidebarContext.js` stores expanded/collapsed state
- **Route Matching**: Use `matchPath()` helper from [src/helpers/matchPath.js](src/helpers/matchPath.js)
- **Animations**: Transition mixins from [src/helpers/mixins.js](src/helpers/mixins.js)
  - Use `getDrawerSxTransitionMixin(isExpanded, property)` for smooth drawer transitions

## Database & Migrations

### Migration System ([scripts/migrate.js](scripts/migrate.js))
- **Commands**: 
  - `npm run db:migrate` - Apply all pending migrations (up)
  - `npm run db:migrate:down` - Rollback last migration
  - `npm run db:migrate:status` - Show migration status
- **File structure**: `scripts/migrations/NNN_description.js` (numbered sequentially, 001-009 exist)
- **Migration tracking**: Applied migrations stored in `data/migrations.json` with timestamps
- **Pattern**: Each migration exports `name`, `up(db)`, and `down(db)` functions
  - Check for table/column existence before creating to allow re-running
  - Use `db.pragma('table_info(table_name)')` to check columns
  - Use `db.prepare().get()` for existence checks

**Current Migrations** (in order):
1. `001_add_priority_column_to_jobs_table` - Added priority column with 'Normal' default
2. `002_create_detail_drawing_and_assembly_detail_tables` - Created drawing and assembly metadata tables
3. `003_populate_detail_drawing_and_assembly_detail_from_assemblies` - Migrated legacy assembly data
4. `004_add_file_location_to_jobs` - Added file path tracking
5. `005_populate_file_location_in_jobs` - Backfilled file locations
6. `006_add_has_assembly_details_column_to_jobs` - Flag for assembly presence
7. `007-009_normalize_date_formats` - Standardized date handling in multiple tables

### Table Structure
- **jobs**: Main table with `priority` (TEXT), `file_location` (TEXT), `has_assembly_details` (INTEGER)
- **detail_drawing**: Metadata for drawings (drawing_number, description, revision, isAssembly)
- **assembly_detail**: Assembly line details (linked to jobs via job_id)
- All tables: `created_at`, `updated_at` with default `datetime('now','localtime')`
- Date format: **YYYY-MM-DD** for consistency (see normalization migrations 007-009)

### Database Initialization
- **`npm run db:init`**: Creates fresh database from [scripts/db-init.js](scripts/db-init.js)
- **Never manually edit** `data/migrations.json` - migration system is the source of truth
- Test database state with helper scripts: `check-db.js`, `test-db.js`, `check-sqlite-version.js`

## Development Workflow

### Setup
```bash
npm install           # Install dependencies
npm run db:init      # Initialize database (creates jobs.db in data/)
npm run db:migrate   # Apply pending migrations
npm run dev          # Start dev server on http://localhost:3000
```

### Key Commands
- **`npm run dev`** - Development server with hot reload (http://localhost:3000)
- **`npm run build`** - Production build
- **`npm run lint`** - Run ESLint (configured in `eslint.config.mjs`)
- **Database commands**:
  - `npm run db:migrate` - Apply pending migrations
  - `npm run db:migrate:down` - Rollback last migration
  - `npm run db:migrate:status` - Show migration status
  - `npm run db:init` - Reinitialize database from scratch

### Testing & Debugging
- **Database inspection**: Use `check-db.js` for quick schema check
- **Database manipulation**: Use `test-db.js` for data testing
- **Version check**: `check-sqlite-version.js` validates better-sqlite3 setup
- Run with `node scripts/check-db.js` from project root

### Common Development Tasks
- **Add a new field to jobs**: Create migration in `scripts/migrations/` with sequential number, use `ALTER TABLE jobs ADD COLUMN...`
- **Add a new API endpoint**: Create `src/pages/api/jobs/[name].js` with handler, import `getDB()`, validate method
- **Add a new page**: Create component in `src/pages/[name].jsx` with layout (Sidebar, AppHeader from `_app.js`)
- **Create/Edit Job modal**: Use `JobEditModal.jsx` which wraps `JobForm.jsx` for reusable form logic

## Project-Specific Conventions

### Data Models
- **Customer options**: `['Candu', 'Kinectrics', 'ATI']` hardcoded in [JobForm.jsx](src/components/forms/JobForm.jsx#L17) (also expanded list in [data/data.js](data/data.js))
- **Priorities**: Imported from [data/data.js](data/data.js) as `priorityOptions` object: `Critical`, `Urgent`, `Important`, `Normal`, `Minor`, `Hold`
- **Date formatting**: Use **YYYY-MM-DD** format internally (see `formatDateForInput()` in `JobForm.jsx`)
- **API responses**: Always return JSON; use consistent error shape: `{ error: string }` with appropriate HTTP status

### Form Patterns
- Forms use MUI components: `TextField`, `MenuItem` (for selects), `Button`, `Stack`, `Grid`
- File upload inputs use `ref` to trigger hidden file input elements (see [JobForm.jsx](src/components/forms/JobForm.jsx) pattern)
- Buttons follow pattern: "Save" (submit), "Cancel" (close), "Delete" (with confirmation)
- Confirmation dialogs use `DeleteConfirmDialog.jsx` component from [src/components/common/](src/components/common/)

### UI/Styling
- **Spacing**: Material-UI spacing system (theme breakpoints, sx prop)
- **Colors**: Primary blue `#03229F`, custom dark red/orange from palette defined in [src/theme.js](src/theme.js)
- **Typography variants**: `regularBold`, `grayCaption`, `h1`, `h2` defined in theme (see [src/theme.js](src/theme.js))
- Use Emotion CSS-in-JS via `sx` prop on MUI components, not separate CSS files

### Error Handling
- **API routes**: Always wrap database calls in try-catch, return status codes (200, 405, 500)
- **Frontend**: React Query handles async errors, show toast/dialog to user
- **Logging**: Log errors with context: `console.error('Operation:', error)`
- **Database**: Connection failures handled in `getDB()` with console logging

## Critical Integration Points

1. **API → Database**: All `/api/jobs/*` routes must import `getDB()` and use prepared statements
2. **Frontend → API**: Use React Query with appropriate hooks (useQuery, useMutation)
3. **Forms → API**: `JobForm.jsx` submits to `/api/jobs/update.js`, handles response validation
4. **Assembly Details**: Linked through `assembly_detail_*` routes and reflected in `jobs.has_assembly_details` flag
5. **File Locations**: `drawing-file-location.js` API for managing file paths, displayed in UI

## Important Gotchas

- **Database path**: Always use `process.cwd()` not `__dirname` to find project root (Next.js compilation quirk)
- **Next.js Pages Router**: Routes are in `src/pages/`, not `src/app/`; no dynamic `[param]` syntax without special handling
- **React Query stale time**: 5 minutes by default - consider when data needs fresh refresh
- **Migration ordering**: Sequential number prefixes matter; if adding migration, increment from last applied
- **Theme provider**: Wrapped in `_app.js` with `CacheProvider` for Emotion SSR support
- **Database singleton**: Never create multiple Database instances; always use `getDB()`
- **Drawer animations**: Use `getDrawerSxTransitionMixin()` helper for consistent transitions

## File Structure Reference

- **API layer**: `src/pages/api/jobs/*` - all database operations
- **Components**: `src/components/` - UI organized by feature
- **Database access**: `src/lib/db.js` - singleton, never import Database directly elsewhere
- **Utilities**: `src/helpers/` - transition mixins, path matching, shared functions
- **Database schema**: Migrations in `scripts/migrations/` - one per feature
- **Configuration**: `next.config.mjs` (Next.js), `theme.js` (MUI), `queryClient.js` (React Query)
- **Database structure**: `data/structure.txt`

## Commenting Standards

- **Functions**: JSDoc style comments for all exported functions