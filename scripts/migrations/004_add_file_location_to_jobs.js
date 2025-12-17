export const up = (db) => {
  db.exec(`
    ALTER TABLE jobs ADD COLUMN file_location TEXT;
  `);
};

export const down = (db) => {
  db.exec(`ALTER TABLE jobs DROP COLUMN file_location`);
  console.log('✓ 删除 file_location 列');
};
