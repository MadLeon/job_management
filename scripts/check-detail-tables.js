import getDB from "../src/lib/db.js";

const db = getDB();

console.log("detail_drawing schema:");
console.log(db.pragma("table_info(detail_drawing)"));

console.log("\nassembly_detail schema:");
console.log(db.pragma("table_info(assembly_detail)"));

console.log("\nSample detail_drawing:");
console.log(db.prepare("SELECT * FROM detail_drawing LIMIT 3").all());

console.log("\nSample assembly_detail:");
console.log(db.prepare("SELECT * FROM assembly_detail LIMIT 3").all());
