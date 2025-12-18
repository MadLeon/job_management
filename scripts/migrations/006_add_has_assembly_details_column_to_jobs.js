/**
 * Migration 006: Add has_assembly_details column to jobs table
 */

export function up(db) {
  console.log('Migration 006: Adding has_assembly_details column to jobs table...');
  try {
    db.prepare(`
      ALTER TABLE jobs ADD COLUMN has_assembly_details INTEGER DEFAULT 0
    `).run();
    console.log('✓ Migration 006 completed successfully!');
  } catch (error) {
    console.error('✗ Migration 006 failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Migration 006: Removing has_assembly_details column from jobs table...');
  try {
    db.prepare(`
      ALTER TABLE jobs DROP COLUMN has_assembly_details
    `).run();
    console.log('✓ Migration 006 rolled back successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
}
