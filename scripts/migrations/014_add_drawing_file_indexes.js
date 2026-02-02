/**
 * Migration: Add indexes to drawing_file table for faster LIKE queries
 * File: scripts/migrations/014_add_drawing_file_indexes.js
 * 
 * Purpose: Optimize fuzzy matching performance in mod_CreateHyperlinks
 * Problem: LIKE queries on drawing_file.file_name and drawing_file.file_path
 *          were scanning all 137,399 records, causing 10+ second delays
 * Solution: Add indexes to speed up LIKE pattern matching
 */

export const name = '014_add_drawing_file_indexes';

/**
 * Add indexes on file_name and file_path columns for faster fuzzy matching
 */
export function up(db) {
  try {
    // Check if indexes already exist
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='drawing_file'
    `).all();
    
    const indexNames = indexes.map(idx => idx.name);
    
    // Add index on file_name if not exists
    if (!indexNames.includes('idx_drawing_file_name')) {
      db.exec('CREATE INDEX idx_drawing_file_name ON drawing_file(file_name)');
      console.log('✓ Created index idx_drawing_file_name');
    }
    
    // Add index on file_path if not exists
    if (!indexNames.includes('idx_drawing_file_path')) {
      db.exec('CREATE INDEX idx_drawing_file_path ON drawing_file(file_path)');
      console.log('✓ Created index idx_drawing_file_path');
    }
    
    // Add index on is_active for faster filtering
    if (!indexNames.includes('idx_drawing_file_active')) {
      db.exec('CREATE INDEX idx_drawing_file_active ON drawing_file(is_active)');
      console.log('✓ Created index idx_drawing_file_active');
    }
    
    // Add composite index for common query pattern
    if (!indexNames.includes('idx_drawing_file_active_modified')) {
      db.exec('CREATE INDEX idx_drawing_file_active_modified ON drawing_file(is_active, last_modified_at DESC)');
      console.log('✓ Created index idx_drawing_file_active_modified');
    }
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    throw error;
  }
}

/**
 * Drop the indexes
 */
export function down(db) {
  try {
    db.exec('DROP INDEX IF EXISTS idx_drawing_file_name');
    db.exec('DROP INDEX IF EXISTS idx_drawing_file_path');
    db.exec('DROP INDEX IF EXISTS idx_drawing_file_active');
    db.exec('DROP INDEX IF EXISTS idx_drawing_file_active_modified');
    console.log('✓ Dropped all drawing_file indexes');
  } catch (error) {
    console.error('Error dropping indexes:', error.message);
    throw error;
  }
}
