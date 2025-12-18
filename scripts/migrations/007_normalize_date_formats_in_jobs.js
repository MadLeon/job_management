/**
 * Migration 007: Normalize date formats in jobs table to ISO 8601 (YYYY-MM-DD)
 * Uses JavaScript for accurate date conversion instead of complex SQL
 */

function convertDrawingReleaseDate(dateStr) {
  if (!dateStr || dateStr === '') return null;

  // Correct corrupted dates first
  if (dateStr === '0109/25') dateStr = '01/09/25';
  if (dateStr === '02/1125') dateStr = '02/11/25';
  if (dateStr === '62/25') dateStr = '6/2/25';

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // M/D/YY format (e.g., "4/6/23", "11/13/25")
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    year = parseInt(year);

    // Convert 2-digit year: 00-30 → 2000-2030, 31-99 → 1931-1999
    if (year <= 30) {
      year += 2000;
    } else {
      year += 1900;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

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

function convertDeliveryShippedDate(dateStr) {
  if (!dateStr || dateStr === '') return null;

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // M/D/YY format (e.g., "12/11/25")
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    year = parseInt(year);

    // Convert 2-digit year: 00-30 → 2000-2030, 31-99 → 1931-1999
    if (year <= 30) {
      year += 2000;
    } else {
      year += 1900;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

export function up(db) {
  console.log('Migration 007: Starting date normalization in jobs table...');

  try {
    // Step 1: Create temporary new columns
    console.log('  Step 1: Creating temporary columns...');
    db.prepare(`ALTER TABLE jobs ADD COLUMN drawing_release_new TEXT`).run();
    db.prepare(`ALTER TABLE jobs ADD COLUMN delivery_required_date_new TEXT`).run();
    db.prepare(`ALTER TABLE jobs ADD COLUMN delivery_shipped_date_new TEXT`).run();

    // Step 2: Fetch all jobs and convert dates using JavaScript
    console.log('  Step 2: Converting dates using JavaScript...');
    const jobs = db.prepare('SELECT job_id, drawing_release, delivery_required_date, delivery_shipped_date FROM jobs').all();

    const updateDrawing = db.prepare('UPDATE jobs SET drawing_release_new = ? WHERE job_id = ?');
    const updateDelivReq = db.prepare('UPDATE jobs SET delivery_required_date_new = ? WHERE job_id = ?');
    const updateDelivShip = db.prepare('UPDATE jobs SET delivery_shipped_date_new = ? WHERE job_id = ?');

    let convertedCount = { drawing: 0, delivReq: 0, delivShip: 0 };

    jobs.forEach(job => {
      const newDrawing = convertDrawingReleaseDate(job.drawing_release);
      updateDrawing.run(newDrawing, job.job_id);
      convertedCount.drawing++;

      const newDelivReq = convertDeliveryRequiredDate(job.delivery_required_date);
      updateDelivReq.run(newDelivReq, job.job_id);
      convertedCount.delivReq++;

      const newDelivShip = convertDeliveryShippedDate(job.delivery_shipped_date);
      updateDelivShip.run(newDelivShip, job.job_id);
      convertedCount.delivShip++;
    });

    console.log(`    - drawing_release: ${convertedCount.drawing} records converted`);
    console.log(`    - delivery_required_date: ${convertedCount.delivReq} records converted`);
    console.log(`    - delivery_shipped_date: ${convertedCount.delivShip} records converted`);

    // Step 3: Backup old columns by renaming them
    console.log('  Step 3: Backing up old columns...');
    db.prepare(`ALTER TABLE jobs RENAME COLUMN drawing_release TO drawing_release_old`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_required_date TO delivery_required_date_old`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_shipped_date TO delivery_shipped_date_old`).run();

    // Step 4: Rename new columns to original names
    console.log('  Step 4: Renaming new columns to original names...');
    db.prepare(`ALTER TABLE jobs RENAME COLUMN drawing_release_new TO drawing_release`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_required_date_new TO delivery_required_date`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_shipped_date_new TO delivery_shipped_date`).run();

    console.log('✓ Migration 007 completed successfully!');
    console.log('  Note: Backup columns preserved (_old suffix) for manual review');
  } catch (error) {
    console.error('✗ Migration 007 failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Migration 007: Rolling back date normalization in jobs table...');

  try {
    // Step 1: Restore old columns from backup
    console.log('  Step 1: Restoring old columns from backup...');
    db.prepare(`ALTER TABLE jobs RENAME COLUMN drawing_release TO drawing_release_new`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_required_date TO delivery_required_date_new`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_shipped_date TO delivery_shipped_date_new`).run();

    // Step 2: Rename backup columns back to original names
    console.log('  Step 2: Renaming backup columns to original names...');
    db.prepare(`ALTER TABLE jobs RENAME COLUMN drawing_release_old TO drawing_release`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_required_date_old TO delivery_required_date`).run();
    db.prepare(`ALTER TABLE jobs RENAME COLUMN delivery_shipped_date_old TO delivery_shipped_date`).run();

    // Step 3: Drop converted columns
    console.log('  Step 3: Dropping converted columns...');
    db.prepare(`ALTER TABLE jobs DROP COLUMN drawing_release_new`).run();
    db.prepare(`ALTER TABLE jobs DROP COLUMN delivery_required_date_new`).run();
    db.prepare(`ALTER TABLE jobs DROP COLUMN delivery_shipped_date_new`).run();

    console.log('✓ Migration 007 rolled back successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
}
