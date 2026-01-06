/**
 * Jest 测试: 数据库规范化迁移验证
 * 
 * 验证内容：
 * 1. 所有新表已创建
 * 2. 数据成功迁移
 * 3. 外键约束完整
 * 4. 数据关系一致
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'jobs.db');

describe('数据库规范化迁移验证', () => {
  let db;

  beforeAll(() => {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.close();
  });

  // ========================================================================
  // 测试 1: 表结构验证
  // ========================================================================
  describe('表结构验证', () => {
    test('应该包含 14 个核心业务表', () => {
      const tables = db
        .prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `)
        .all();

      const requiredTables = [
        'customer',
        'customer_contact',
        'purchase_order',
        'job',
        'order_item',
        'part',
        'part_tree',
        'shipment',
        'shipment_item',
        'part_attachment',
        'drawing_file',
        'folder_mapping',
        'process_template',
        'step_tracker'
      ];

      const tableNames = tables.map(t => t.name);
      for (const required of requiredTables) {
        expect(tableNames).toContain(required);
      }
    });

    test('应该包含 6 个备注表', () => {
      const tables = db
        .prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name LIKE '%_note'
        `)
        .all();

      const noteTableNames = tables.map(t => t.name);
      expect(noteTableNames.sort()).toEqual([
        'attachment_note',
        'job_note',
        'order_item_note',
        'part_note',
        'po_note',
        'shipment_note'
      ]);
    });

    test('customer 表应该有正确的列定义', () => {
      const columns = db.pragma('table_info(customer)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toEqual([
        'id',
        'customer_name',
        'usage_count',
        'last_used',
        'created_at',
        'updated_at'
      ]);
    });

    test('part 表应该有版本管理字段', () => {
      const columns = db.pragma('table_info(part)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('previous_id');
      expect(columnNames).toContain('next_id');
      expect(columnNames).toContain('drawing_number');
      expect(columnNames).toContain('revision');
    });

    test('order_item 表应该有关键字段', () => {
      const columns = db.pragma('table_info(order_item)');
      const columnNames = columns.map(c => c.name);

      expect(columnNames).toContain('job_id');
      expect(columnNames).toContain('part_id');
      expect(columnNames).toContain('line_number');
      expect(columnNames).toContain('status');
    });
  });

  // ========================================================================
  // 测试 2: 数据迁移验证
  // ========================================================================
  describe('数据迁移验证', () => {
    test('应该迁移了客户数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM customer').get();
      expect(result.cnt).toBeGreaterThan(0);
    });

    test('应该迁移了采购订单数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM purchase_order').get();
      expect(result.cnt).toBeGreaterThan(0);
    });

    test('应该迁移了零件数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM part').get();
      expect(result.cnt).toBeGreaterThan(0);
    });

    test('应该迁移了作业数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM job').get();
      expect(result.cnt).toBeGreaterThan(0);
    });

    test('应该迁移了订单明细数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM order_item').get();
      expect(result.cnt).toBeGreaterThan(0);
    });

    test('应该迁移了发货数据', () => {
      const result = db.prepare('SELECT COUNT(*) as cnt FROM shipment').get();
      // 注意：旧数据可能没有发货记录，但表应该存在
      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // 测试 3: 外键约束验证
  // ========================================================================
  describe('外键约束验证', () => {
    test('外键约束应该已启用', () => {
      const result = db.prepare('PRAGMA foreign_keys').get();
      expect(result.foreign_keys).toBe(1);
    });

    test('所有 job 记录应该引用有效的 purchase_order', () => {
      const orphaned = db
        .prepare(`
          SELECT COUNT(*) as cnt FROM job
          WHERE po_id NOT IN (SELECT id FROM purchase_order)
        `)
        .get();
      expect(orphaned.cnt).toBe(0);
    });

    test('所有 order_item 记录应该引用有效的 job', () => {
      const orphaned = db
        .prepare(`
          SELECT COUNT(*) as cnt FROM order_item
          WHERE job_id NOT IN (SELECT id FROM job)
        `)
        .get();
      expect(orphaned.cnt).toBe(0);
    });

    test('所有 order_item 记录应该引用有效的 part', () => {
      const orphaned = db
        .prepare(`
          SELECT COUNT(*) as cnt FROM order_item
          WHERE part_id NOT IN (SELECT id FROM part)
        `)
        .get();
      expect(orphaned.cnt).toBe(0);
    });

    test('所有 part_attachment 的 part_id 或 order_item_id 至少有一个有效', () => {
      // part_attachment 由于 CHECK 约束，至少有一个不为 NULL
      const allWithParent = db
        .prepare(`
          SELECT COUNT(*) as cnt FROM part_attachment
          WHERE part_id IS NOT NULL OR order_item_id IS NOT NULL
        `)
        .get();
      
      const totalCount = db
        .prepare('SELECT COUNT(*) as cnt FROM part_attachment')
        .get();
      
      expect(allWithParent.cnt).toBe(totalCount.cnt);
    });
  });

  // ========================================================================
  // 测试 4: 数据完整性验证
  // ========================================================================
  describe('数据完整性验证', () => {
    test('customer 表中的 customer_name 应该唯一', () => {
      const duplicates = db
        .prepare(`
          SELECT customer_name, COUNT(*) as cnt
          FROM customer
          GROUP BY customer_name
          HAVING cnt > 1
        `)
        .all();
      expect(duplicates.length).toBe(0);
    });

    test('purchase_order 表中的 po_number 应该唯一', () => {
      const duplicates = db
        .prepare(`
          SELECT po_number, COUNT(*) as cnt
          FROM purchase_order
          GROUP BY po_number
          HAVING cnt > 1
        `)
        .all();
      expect(duplicates.length).toBe(0);
    });

    test('job 表中的 job_number 应该唯一', () => {
      const duplicates = db
        .prepare(`
          SELECT job_number, COUNT(*) as cnt
          FROM job
          GROUP BY job_number
          HAVING cnt > 1
        `)
        .all();
      expect(duplicates.length).toBe(0);
    });

    test('order_item 中的 (job_id, line_number) 组合应该唯一', () => {
      const duplicates = db
        .prepare(`
          SELECT job_id, line_number, COUNT(*) as cnt
          FROM order_item
          GROUP BY job_id, line_number
          HAVING cnt > 1
        `)
        .all();
      expect(duplicates.length).toBe(0);
    });

    test('part 中的 (drawing_number, revision) 组合应该唯一', () => {
      const duplicates = db
        .prepare(`
          SELECT drawing_number, revision, COUNT(*) as cnt
          FROM part
          GROUP BY drawing_number, revision
          HAVING cnt > 1
        `)
        .all();
      expect(duplicates.length).toBe(0);
    });
  });

  // ========================================================================
  // 测试 5: 关系验证
  // ========================================================================
  describe('关系验证', () => {
    test('job 应该有关联的 purchase_order', () => {
      const jobWithPO = db
        .prepare(`
          SELECT j.id, j.job_number, p.po_number
          FROM job j
          JOIN purchase_order p ON j.po_id = p.id
          LIMIT 1
        `)
        .get();
      expect(jobWithPO).toBeDefined();
      expect(jobWithPO.po_number).toBeDefined();
    });

    test('order_item 应该有关联的 job 和 part', () => {
      const oi = db
        .prepare(`
          SELECT oi.id, j.job_number, p.drawing_number
          FROM order_item oi
          JOIN job j ON oi.job_id = j.id
          JOIN part p ON oi.part_id = p.id
          LIMIT 1
        `)
        .get();
      expect(oi).toBeDefined();
      expect(oi.job_number).toBeDefined();
      expect(oi.drawing_number).toBeDefined();
    });

    test('part 版本链应该正确（previous_id 和 next_id）', () => {
      // 检查版本链的一致性
      const inconsistencies = db
        .prepare(`
          SELECT COUNT(*) as cnt
          FROM part p1
          JOIN part p2 ON p1.next_id = p2.id
          WHERE p2.previous_id != p1.id
        `)
        .get();
      expect(inconsistencies.cnt).toBe(0);
    });
  });

  // ========================================================================
  // 测试 6: 索引验证
  // ========================================================================
  describe('索引验证', () => {
    test('应该创建了性能索引', () => {
      const indices = db
        .prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index' AND name LIKE 'idx_%'
        `)
        .all();
      expect(indices.length).toBeGreaterThan(30);
    });

    test('关键查询字段应该有索引', () => {
      const criticalIndices = [
        'idx_customer_name',
        'idx_job_job_number',
        'idx_oi_job_id',
        'idx_oi_part_id',
        'idx_part_drawing_number'
      ];

      const existingIndices = db
        .prepare(`
          SELECT name FROM sqlite_master
          WHERE type='index'
        `)
        .all()
        .map(i => i.name);

      for (const idx of criticalIndices) {
        expect(existingIndices).toContain(idx);
      }
    });
  });

  // ========================================================================
  // 测试 7: 时间戳字段验证
  // ========================================================================
  describe('时间戳字段验证', () => {
    test('所有新表都应该有 created_at 和 updated_at', () => {
      const tables = [
        'customer',
        'customer_contact',
        'purchase_order',
        'job',
        'order_item',
        'part',
        'part_tree',
        'shipment',
        'shipment_item',
        'part_attachment',
        'drawing_file',
        'folder_mapping',
        'process_template',
        'step_tracker'
      ];

      for (const table of tables) {
        const columns = db.pragma(`table_info(${table})`);
        const columnNames = columns.map(c => c.name);
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      }
    });

    test('created_at 应该自动填充为当前时间', () => {
      const sample = db.prepare('SELECT created_at FROM customer LIMIT 1').get();
      expect(sample.created_at).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });
});
