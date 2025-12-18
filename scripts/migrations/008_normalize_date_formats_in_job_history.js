/**
 * Migration 008: Normalize date formats in job_history table to ISO 8601 (YYYY-MM-DD)
 * Same format standardization as Migration 007, applied to job_history table
 * Note: job_history is currently empty (0 records), so this just updates the column structure
 */

export function up(db) {
  console.log('Migration 008: Starting date normalization in job_history table...');

  try {
    // Step 1: Create temporary new columns
    console.log('  Step 1: Creating temporary columns...');
    db.prepare(`ALTER TABLE job_history ADD COLUMN drawing_release_new TEXT`).run();
    db.prepare(`ALTER TABLE job_history ADD COLUMN delivery_required_date_new TEXT`).run();
    db.prepare(`ALTER TABLE job_history ADD COLUMN delivery_shipped_date_new TEXT`).run();

    // Step 2: job_history is empty, so no data conversion needed
    console.log('  Step 2: Skipping data conversion (table is empty)');
    const count = db.prepare('SELECT COUNT(*) as cnt FROM job_history').get();
    console.log(`    - job_history current record count: ${count.cnt}`);

    // Step 3: Backup old columns by renaming them
    console.log('  Step 3: Backing up old columns...');
    db.prepare(`ALTER TABLE job_history RENAME COLUMN drawing_release TO drawing_release_old`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_required_date TO delivery_required_date_old`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_shipped_date TO delivery_shipped_date_old`).run();

    // Step 4: Rename new columns to original names
    console.log('  Step 4: Renaming new columns to original names...');
    db.prepare(`ALTER TABLE job_history RENAME COLUMN drawing_release_new TO drawing_release`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_required_date_new TO delivery_required_date`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_shipped_date_new TO delivery_shipped_date`).run();

    console.log('✓ Migration 008 completed successfully!');
    console.log('  Note: Backup columns preserved (_old suffix) for structural consistency');
  } catch (error) {
    console.error('✗ Migration 008 failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Migration 008: Rolling back date normalization in job_history table...');

  try {
    // Step 1: Restore old columns from backup
    console.log('  Step 1: Restoring old columns from backup...');
    db.prepare(`ALTER TABLE job_history RENAME COLUMN drawing_release TO drawing_release_new`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_required_date TO delivery_required_date_new`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_shipped_date TO delivery_shipped_date_new`).run();

    // Step 2: Rename backup columns back to original names
    console.log('  Step 2: Renaming backup columns to original names...');
    db.prepare(`ALTER TABLE job_history RENAME COLUMN drawing_release_old TO drawing_release`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_required_date_old TO delivery_required_date`).run();
    db.prepare(`ALTER TABLE job_history RENAME COLUMN delivery_shipped_date_old TO delivery_shipped_date`).run();

    // Step 3: Drop converted columns
    console.log('  Step 3: Dropping converted columns...');
    db.prepare(`ALTER TABLE job_history DROP COLUMN drawing_release_new`).run();
    db.prepare(`ALTER TABLE job_history DROP COLUMN delivery_required_date_new`).run();
    db.prepare(`ALTER TABLE job_history DROP COLUMN delivery_shipped_date_new`).run();

    console.log('✓ Migration 008 rolled back successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
}
