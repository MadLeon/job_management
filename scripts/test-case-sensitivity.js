import getDB from "../src/lib/db.js";

const db = getDB();

// 测试不同大小写的搜索
const testCases = [
  "RT38-163",
  "rt38-163",
  "Rt38-163",
  "RT38-16300",
  "rt38-16300",
];

console.log("测试大小写敏感性搜索");
console.log("=".repeat(60));

testCases.forEach((searchQuery) => {
  const searchTerm = `%${searchQuery.trim()}%`;

  // 从assembly_detail表搜索drawing_number
  const drawingResults = db
    .prepare(
      `
    SELECT DISTINCT
      j.job_id,
      j.job_number,
      j.line_number,
      ad.drawing_number
    FROM jobs j
    INNER JOIN assembly_detail ad ON j.part_number = ad.part_number
    WHERE ad.drawing_number LIKE ?
    LIMIT 3
  `
    )
    .all(searchTerm);

  console.log(`\n搜索词: "${searchQuery}"`);
  console.log(`结果数量: ${drawingResults.length}`);
  if (drawingResults.length > 0) {
    drawingResults.forEach((r) => {
      console.log(
        `  - Job ${r.job_number} (Line ${r.line_number}): ${r.drawing_number}`
      );
    });
  }
});

// 检查实际的 drawing_number 值
console.log('\n\n检查包含 "163" 的所有 drawing_number:');
console.log("=".repeat(60));
const allDrawings = db
  .prepare(
    `
  SELECT DISTINCT drawing_number 
  FROM assembly_detail 
  WHERE drawing_number LIKE '%163%'
  LIMIT 10
`
  )
  .all();

allDrawings.forEach((d) => {
  console.log(d.drawing_number);
});
