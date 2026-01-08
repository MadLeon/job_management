/**
 * 迁移 005: 创建索引以提高查询性能
 * 
 * 为常用查询字段创建索引：
 * - customer: customer_name
 * - purchase_order: po_number, is_active
 * - job: job_number, po_id
 * - order_item: job_id, part_id, status
 * - part: drawing_number, is_assembly
 * - shipment: packing_slip_number
 * - 以及各备注表的外键索引
 */

export const name = '005_create_indices';

export function up(db) {
  // =====================================================
  // customer 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_customer_name ON customer(customer_name);`);
  db.exec(`CREATE INDEX idx_customer_last_used ON customer(last_used);`);

  // =====================================================
  // customer_contact 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_customer_contact_customer_id ON customer_contact(customer_id);`);
  db.exec(`CREATE INDEX idx_customer_contact_name ON customer_contact(contact_name);`);

  // =====================================================
  // purchase_order 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_purchase_order_po_number ON purchase_order(po_number);`);
  db.exec(`CREATE INDEX idx_purchase_order_contact_id ON purchase_order(contact_id);`);
  db.exec(`CREATE INDEX idx_purchase_order_is_active ON purchase_order(is_active);`);

  // =====================================================
  // job 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_job_job_number ON job(job_number);`);
  db.exec(`CREATE INDEX idx_job_po_id ON job(po_id);`);
  db.exec(`CREATE INDEX idx_job_priority ON job(priority);`);

  // =====================================================
  // order_item 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_order_item_job_id ON order_item(job_id);`);
  db.exec(`CREATE INDEX idx_order_item_part_id ON order_item(part_id);`);
  db.exec(`CREATE INDEX idx_order_item_status ON order_item(status);`);
  db.exec(`CREATE INDEX idx_order_item_line_number ON order_item(line_number);`);

  // =====================================================
  // part 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_part_drawing_number ON part(drawing_number);`);
  db.exec(`CREATE INDEX idx_part_revision ON part(revision);`);
  db.exec(`CREATE INDEX idx_part_is_assembly ON part(is_assembly);`);
  db.exec(`CREATE INDEX idx_part_previous_id ON part(previous_id);`);
  db.exec(`CREATE INDEX idx_part_next_id ON part(next_id);`);

  // =====================================================
  // part_tree 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_part_tree_parent_id ON part_tree(parent_id);`);
  db.exec(`CREATE INDEX idx_part_tree_child_id ON part_tree(child_id);`);

  // =====================================================
  // drawing_file 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_drawing_file_part_id ON drawing_file(part_id);`);
  db.exec(`CREATE INDEX idx_drawing_file_is_active ON drawing_file(is_active);`);

  // =====================================================
  // part_attachment 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_part_attachment_part_id ON part_attachment(part_id);`);
  db.exec(`CREATE INDEX idx_part_attachment_order_item_id ON part_attachment(order_item_id);`);
  db.exec(`CREATE INDEX idx_part_attachment_file_type ON part_attachment(file_type);`);

  // =====================================================
  // shipment 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_shipment_packing_slip_number ON shipment(packing_slip_number);`);
  db.exec(`CREATE INDEX idx_shipment_invoice_number ON shipment(invoice_number);`);

  // =====================================================
  // shipment_item 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_shipment_item_order_item_id ON shipment_item(order_item_id);`);
  db.exec(`CREATE INDEX idx_shipment_item_shipment_id ON shipment_item(shipment_id);`);

  // =====================================================
  // folder_mapping 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_folder_mapping_customer_id ON folder_mapping(customer_id);`);

  // =====================================================
  // process_template 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_process_template_part_id ON process_template(part_id);`);

  // =====================================================
  // step_tracker 表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_step_tracker_order_item_id ON step_tracker(order_item_id);`);
  db.exec(`CREATE INDEX idx_step_tracker_process_template_id ON step_tracker(process_template_id);`);
  db.exec(`CREATE INDEX idx_step_tracker_status ON step_tracker(status);`);

  // =====================================================
  // 各备注表索引
  // =====================================================
  db.exec(`CREATE INDEX idx_po_note_po_id ON po_note(po_id);`);
  db.exec(`CREATE INDEX idx_job_note_job_id ON job_note(job_id);`);
  db.exec(`CREATE INDEX idx_order_item_note_order_item_id ON order_item_note(order_item_id);`);
  db.exec(`CREATE INDEX idx_part_note_part_id ON part_note(part_id);`);
  db.exec(`CREATE INDEX idx_shipment_note_shipment_id ON shipment_note(shipment_id);`);
  db.exec(`CREATE INDEX idx_attachment_note_attachment_id ON attachment_note(attachment_id);`);
}

export function down(db) {
  // 删除所有索引
  const indices = [
    'idx_customer_name',
    'idx_customer_last_used',
    'idx_customer_contact_customer_id',
    'idx_customer_contact_name',
    'idx_purchase_order_po_number',
    'idx_purchase_order_contact_id',
    'idx_purchase_order_is_active',
    'idx_job_job_number',
    'idx_job_po_id',
    'idx_job_priority',
    'idx_order_item_job_id',
    'idx_order_item_part_id',
    'idx_order_item_status',
    'idx_order_item_line_number',
    'idx_part_drawing_number',
    'idx_part_revision',
    'idx_part_is_assembly',
    'idx_part_previous_id',
    'idx_part_next_id',
    'idx_part_tree_parent_id',
    'idx_part_tree_child_id',
    'idx_drawing_file_part_id',
    'idx_drawing_file_is_active',
    'idx_part_attachment_part_id',
    'idx_part_attachment_order_item_id',
    'idx_part_attachment_file_type',
    'idx_shipment_packing_slip_number',
    'idx_shipment_invoice_number',
    'idx_shipment_item_order_item_id',
    'idx_shipment_item_shipment_id',
    'idx_folder_mapping_customer_id',
    'idx_process_template_part_id',
    'idx_step_tracker_order_item_id',
    'idx_step_tracker_process_template_id',
    'idx_step_tracker_status',
    'idx_po_note_po_id',
    'idx_job_note_job_id',
    'idx_order_item_note_order_item_id',
    'idx_part_note_part_id',
    'idx_shipment_note_shipment_id',
    'idx_attachment_note_attachment_id',
  ];

  indices.forEach(indexName => {
    db.exec(`DROP INDEX IF EXISTS ${indexName};`);
  });
}
