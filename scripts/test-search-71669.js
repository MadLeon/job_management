import getDB from "../src/lib/db.js";

const db = getDB();

const job = db.prepare("SELECT * FROM jobs WHERE job_number = ?").get("71669");
console.log("Job 71669:");
console.log(job);

if (job) {
  const details = db
    .prepare("SELECT * FROM assembly_detail WHERE part_number = ?")
    .all(job.part_number);
  console.log("\nAssembly details count:", details.length);
  console.log("\nAll detail drawing_numbers for this job:");
  details.forEach((d, i) => {
    console.log(`${i + 1}. ${d.drawing_number}`);
  });

  // 测试搜索一个 drawing_number
  if (details.length > 0) {
    const testDrawingNumber = details[0].drawing_number;
    console.log(`\n测试搜索 drawing_number: ${testDrawingNumber}`);

    const searchTerm = `%${testDrawingNumber}%`;
    const searchResult = db
      .prepare(
        `
      SELECT
        j.job_id,
        j.job_number,
        j.po_number,
        j.part_number,
        j.line_number,
        j.unique_key
      FROM jobs j
      INNER JOIN assembly_detail ad ON j.part_number = ad.part_number
      INNER JOIN detail_drawing dd ON ad.drawing_number = dd.drawing_number
      WHERE dd.drawing_number LIKE ?
    `
      )
      .all(searchTerm);

    console.log("搜索结果:", searchResult);
  }
}
