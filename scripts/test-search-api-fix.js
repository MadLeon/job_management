import getDB from "../src/lib/db.js";

const db = getDB();

// 模拟 API 搜索逻辑
function testSearch(searchQuery) {
  const searchTerm = `%${searchQuery.trim()}%`;

  console.log(`\n搜索关键词: "${searchQuery}"`);
  console.log("=".repeat(60));

  // 从jobs表中搜索
  const jobResults = db
    .prepare(
      `
    SELECT
      j.job_id,
      j.job_number,
      j.po_number,
      j.part_number,
      j.customer_name,
      j.line_number,
      j.unique_key,
      j.priority,
      j.create_timestamp,
      'job_number' as matched_field
    FROM jobs j
    WHERE 
      j.job_number LIKE ? 
      OR j.po_number LIKE ? 
      OR j.part_number LIKE ?
  `
    )
    .all(searchTerm, searchTerm, searchTerm);

  // 从assembly_detail表搜索drawing_number
  const drawingResults = db
    .prepare(
      `
    SELECT DISTINCT
      j.job_id,
      j.job_number,
      j.po_number,
      j.part_number,
      j.customer_name,
      j.line_number,
      j.unique_key,
      j.priority,
      j.create_timestamp,
      'drawing_number' as matched_field
    FROM jobs j
    INNER JOIN assembly_detail ad ON j.part_number = ad.part_number
    WHERE ad.drawing_number LIKE ?
  `
    )
    .all(searchTerm);

  // 合并结果
  const mergedResults = [];
  const seenUniqueKeys = new Set();

  for (const result of jobResults) {
    if (!seenUniqueKeys.has(result.unique_key)) {
      seenUniqueKeys.add(result.unique_key);
      mergedResults.push(result);
    }
  }

  for (const result of drawingResults) {
    if (!seenUniqueKeys.has(result.unique_key)) {
      seenUniqueKeys.add(result.unique_key);
      mergedResults.push(result);
    }
  }

  console.log(`Job搜索结果: ${jobResults.length}`);
  console.log(`Drawing搜索结果: ${drawingResults.length}`);
  console.log(`合并后总结果: ${mergedResults.length}`);

  if (mergedResults.length > 0) {
    console.log("\n搜索结果:");
    mergedResults.forEach((r, i) => {
      console.log(
        `${i + 1}. Job ${r.job_number} (Line ${r.line_number}) - ${
          r.customer_name
        }`
      );
    });
  } else {
    console.log("无匹配结果");
  }
}

// 测试 job 71669 的 detail numbers
console.log("测试 Job 71669 的 Detail Numbers 搜索");
console.log("=".repeat(60));

const job = db.prepare("SELECT * FROM jobs WHERE job_number = ?").get("71669");
const details = db
  .prepare("SELECT * FROM assembly_detail WHERE part_number = ?")
  .all(job.part_number);

console.log(`\nJob 71669 有 ${details.length} 个 detail numbers:`);
details.forEach((d, i) => {
  console.log(`${i + 1}. ${d.drawing_number}`);
});

// 测试搜索几个 detail numbers
testSearch("RT38-16300-033_000-0000-001-01-DD-B");
testSearch("RT38-87920-0651-1-DD-B");
testSearch("RT-87920-0352-01-DD-D");

// 测试部分搜索
testSearch("RT38-16300");
testSearch("0651");
