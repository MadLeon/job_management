/**
 * Migration 009: Normalize delivery_required_date in assembly_detail table to ISO 8601 (YYYY-MM-DD)
 * This table only has delivery_required_date column in DD-Mon-YY format
 */

function convertDeliveryRequiredDate(dateStr) {
  if (!dateStr || dateStr === '') return null;

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // DD-Mon-YY format (e.g., "21-Mar-25", "10-Aug-26")
  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  const dashMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (dashMatch) {
    let [, day, monthStr, year] = dashMatch;
    const month = monthMap[monthStr];

    if (!month) return null;

    year = parseInt(year);
    // Convert 2-digit year: 00-30 → 2000-2030, 31-99 → 1931-1999
    if (year <= 30) {
      year += 2000;
    } else {
      year += 1900;
    }

    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

export function up(db) {
  console.log('Migration 009: Starting date normalization in assembly_detail table...');

  try {
    // Step 1: Create temporary new column
    console.log('  Step 1: Creating temporary column...');
    db.prepare(`ALTER TABLE assembly_detail ADD COLUMN delivery_required_date_new TEXT`).run();

    // Step 2: Fetch all assembly_detail records and convert dates
    console.log('  Step 2: Converting delivery_required_date using JavaScript...');
    const records = db.prepare('SELECT id, delivery_required_date FROM assembly_detail').all();

    const updateQuery = db.prepare('UPDATE assembly_detail SET delivery_required_date_new = ? WHERE id = ?');

    let convertedCount = 0;
    records.forEach(record => {
      const newDate = convertDeliveryRequiredDate(record.delivery_required_date);
      updateQuery.run(newDate, record.id);
      convertedCount++;
    });

    console.log(`    - delivery_required_date: ${convertedCount} records converted`);

    // Step 3: Backup old column by renaming it
    console.log('  Step 3: Backing up old column...');
    db.prepare(`ALTER TABLE assembly_detail RENAME COLUMN delivery_required_date TO delivery_required_date_old`).run();

    // Step 4: Rename new column to original name
    console.log('  Step 4: Renaming new column to original name...');
    db.prepare(`ALTER TABLE assembly_detail RENAME COLUMN delivery_required_date_new TO delivery_required_date`).run();

    console.log('✓ Migration 009 completed successfully!');
    console.log('  Note: Backup column preserved (_old suffix) for manual review');
  } catch (error) {
    console.error('✗ Migration 009 failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Migration 009: Rolling back date normalization in assembly_detail table...');

  try {
    // Step 1: Restore old column from backup
    console.log('  Step 1: Restoring old column from backup...');
    db.prepare(`ALTER TABLE assembly_detail RENAME COLUMN delivery_required_date TO delivery_required_date_new`).run();

    // Step 2: Rename backup column back to original name
    console.log('  Step 2: Renaming backup column to original name...');
    db.prepare(`ALTER TABLE assembly_detail RENAME COLUMN delivery_required_date_old TO delivery_required_date`).run();

    // Step 3: Drop converted column
    console.log('  Step 3: Dropping converted column...');
    db.prepare(`ALTER TABLE assembly_detail DROP COLUMN delivery_required_date_new`).run();

    console.log('✓ Migration 009 rolled back successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
}
