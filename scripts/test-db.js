import getDB, { closeDB, getJobNumbers } from './src/lib/db.js';

try {
  const db = getDB();
  const jobs = getJobNumbers();

  console.log(`✓ Retrieved ${jobs.length} jobs`);
  if (jobs.length > 0) {
    console.log(jobs.slice(0, 2));
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  closeDB();
}
