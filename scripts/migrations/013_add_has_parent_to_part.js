/**
 * Migration: Add has_parent field to part table
 * Marks whether a part has a parent component in the assembly hierarchy
 */

export const name = '013_add_has_parent_to_part';

/**
 * UP: Add has_parent column and populate initial values
 */
export function up(db) {
  // Add has_parent column to part table
  db.exec(`ALTER TABLE part ADD COLUMN has_parent INTEGER`);

  // Populate has_parent = 1 for parts that are children in part_tree
  db.exec(`
    UPDATE part 
    SET has_parent = 1 
    WHERE id IN (SELECT DISTINCT child_id FROM part_tree)
  `);
}

/**
 * DOWN: Remove has_parent column
 */
export function down(db) {
  db.exec(`ALTER TABLE part DROP COLUMN has_parent`);
}
