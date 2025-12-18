# Job Management System - AI Coding Agent Guide

## Architecture Overview

This is a **Next.js job management application** (Pages Router, not App Router) with a SQLite backend for tracking manufacturing jobs. The system manages job scheduling, customer data, assembly details, and production workflows.

**Chat Language:**
- All response messages are in Chinese Simplified.
- Coding snippets use English for comments and identifiers.

**Tech Stack:**
- **Frontend**: React 19.2, Next.js 16, Material-UI (MUI 7), Emotion CSS-in-JS
- **Backend**: Next.js API Routes, better-sqlite3 for database
- **State Management**: TanStack React Query v5 for server state, React local state for UI
- **Database**: SQLite with migration system in `scripts/migrations/`

## Key Architectural Patterns

### Database Layer (`src/lib/db.js`)
- **Singleton pattern**: `getDB()` returns a cached database instance
- **Database path**: Resolves to `data/jobs.db` from project root (uses `process.cwd()` for correct path resolution in Next.js)
- **Pragmas**: `journal_mode = DELETE`, `foreign_keys = ON`, `transaction_isolation = IMMEDIATE`
- Always ensure DB operations handle errors gracefully and log database state changes

### API Routes (`src/pages/api/jobs/`)
- Standard Next.js API handler pattern: `export default function handler(req, res)`
- **Routing structure**: `/api/jobs/index.js` → GET all jobs
- Related routes: `/jobs/update.js`, `/jobs/assemblies.js`, `/jobs/assembly-detail-create.js|update.js|delete.js`, `/jobs/drawing-file-location.js`, `/jobs/next-numbers.js`, `/jobs/pdf.js`
- All routes directly import `getDB()` and use prepared statements with `.prepare()` and `.all()/.run()/.get()`
- Error handling: Wrap in try-catch and respond with `{ error: message }`

### Frontend State Management
- **React Query**: Configure in `src/lib/queryClient.js` with `staleTime: 5min, gcTime: 10min`
- **Local UI state**: Use React hooks for drawer expansion, form visibility, etc.
- **Theme**: Centralized in `src/theme.js` with custom palette colors and typography variants

### Component Structure
- **Layout**: `src/components/layout/` contains `AppHeader.jsx`, `Sidebar.jsx`, modals for job/part editing
- **Forms**: `src/components/forms/` has `JobForm.jsx` and `PartEditForm.jsx`; use Material-UI components
- **Table Components**: `src/components/table/` for job display with detail rows
- **Shared**: `src/components/shared/` for reusable UI like `BadgeAvata`, `DateCard`, `PriorityChip`
- **Legacy**: Old component versions in `src/components/legacy/` - prefer new versions in `table/` and `shared/`

### Sidebar Navigation
- Drawer-based collapsible sidebar in `Sidebar.jsx`
- Uses transition mixins from `src/helpers/mixins.js` (`getDrawerSxTransitionMixin`, `getDrawerWidthTransitionMixin`)
- Routes matched via `matchPath()` helper from `src/helpers/matchPath.js`
- Context: `DashboardSidebarContext.js` for sidebar state

## Database & Migrations

### Migration System (`scripts/migrate.js`)
- Run migrations: `npm run db:migrate` (up), `npm run db:migrate:down` (down), `npm run db:migrate:status`
- Migration files in `scripts/migrations/NNN_description.js` (numbered sequentially)
- Applied migrations tracked in `data/migrations.json` with timestamps
- Each migration file must export `up(db)` and `down(db)` functions that use prepared statements

### Current Tables
Based on applied migrations:
- `jobs` - core job table with `priority` column
- `detail_drawing` - drawing details linked to jobs
- `assembly_detail` - assembly information with file locations
- All tables have `file_location` column and `has_assembly_details` boolean flag

### Database Initialization
- `npm run db:init` - creates fresh database from `scripts/db-init.js`
- Script generates initial schema and can extract CREATE TABLE statements from existing databases

## Development Workflow

### Setup
```bash
npm install           # Install dependencies
npm run db:init      # Initialize database (creates jobs.db in data/)
npm run db:migrate   # Apply pending migrations
npm run dev          # Start dev server on http://localhost:3000
```

### Key Commands
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run lint` - Run ESLint (configured in `eslint.config.mjs`)
- Database commands: `npm run db:migrate`, `npm run db:migrate:down`, `npm run db:migrate:status`

### Database Debugging
- Check database directly: Use better-sqlite3 CLI tools or scripts in `check-db.js`, `test-db.js`, `check-sqlite-version.js`
- Never manually edit `data/migrations.json` - it's managed by the migration system

## Project-Specific Conventions

### Data Models
- **Customer options**: `['Candu', 'Kinectrics', 'ATI']` hardcoded in `JobForm.jsx`
- **Priorities**: Imported from `data/data.js` as `priorityOptions` object
- **Date formatting**: Use `YYYY-MM-DD` format internally (see `formatDateForInput()` in `JobForm.jsx`)

### Form Patterns
- Forms use MUI `TextField`, `MenuItem` (for selects), `Button`, `Stack`, `Grid`
- File upload inputs use `ref` to trigger hidden file input elements
- Buttons: "Save" (submit), "Cancel" (close), "Delete" (with confirmation dialog)
- Confirmation dialogs: `DeleteConfirmDialog.jsx` component

### UI/Styling
- **Spacing**: Material-UI spacing system (theme breakpoints, sx prop)
- **Colors**: Primary blue `#03229F`, custom dark red/orange from palette
- **Typography variants**: `regularBold`, `grayCaption`, `h1`, `h2` defined in theme
- Use Emotion CSS-in-JS via `sx` prop on MUI components, not separate CSS files

### Error Handling
- API routes: Always wrap database calls in try-catch, return status codes (200, 405, 500)
- Frontend: React Query handles async errors, show toast/dialog to user
- Log errors with context: `console.error('Operation:', error)`

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