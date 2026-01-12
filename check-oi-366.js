import Database from 'better-sqlite3';

const db = new Database('./data/record.db');

// 查看order_item 366的完整信息
const oi = db.prepare(`
  SELECT oi.id, oi.job_id, oi.part_id, j.po_id, po.contact_id, cc.customer_id, c.customer_name, p.drawing_number
  FROM order_item oi
  JOIN job j ON oi.job_id = j.id
  JOIN purchase_order po ON j.po_id = po.id
  JOIN customer_contact cc ON po.contact_id = cc.id
  JOIN customer c ON cc.customer_id = c.id
  JOIN part p ON oi.part_id = p.id
  WHERE oi.id = 366
`).get();

console.log('Order Item 366 完整信息:', oi);

// 文件路径包含WOODBRIDGE FOAM，找找是哪个customer
const woodbridge = db.prepare(`
  SELECT id, customer_name FROM customer WHERE customer_name LIKE '%WOODBRIDGE%' OR customer_name LIKE '%FOAM%'
`).all();

console.log('\n包含WOODBRIDGE或FOAM的客户:', woodbridge);

// 检查folder_mapping中是否有WOODBRIDGE
const fm = db.prepare(`
  SELECT customer_id, folder_name FROM folder_mapping WHERE folder_name LIKE '%WOODBRIDGE%'
`).all();

console.log('\nFolder mapping中WOODBRIDGE:', fm);

db.close();
