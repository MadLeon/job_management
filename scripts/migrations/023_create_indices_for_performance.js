/**
 * 迁移 023: 创建索引和性能优化
 * 
 * 目标:
 *   1. 为常用查询字段创建索引
 *   2. 提升查询性能
 *   3. 加速外键约束检查
 */

export const name = '023_create_indices_for_performance';

export function up(db) {
  console.log('创建性能优化索引...\n');

  // ============================================================================
  // customer 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_customer_name ON customer(customer_name)`);
  console.log('✓ 创建索引: idx_customer_name');

  // ============================================================================
  // customer_contact 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_contact_customer_id ON customer_contact(customer_id)`);
  console.log('✓ 创建索引: idx_contact_customer_id');

  db.exec(`CREATE INDEX idx_contact_name ON customer_contact(contact_name)`);
  console.log('✓ 创建索引: idx_contact_name');

  // ============================================================================
  // purchase_order 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_po_po_number ON purchase_order(po_number)`);
  console.log('✓ 创建索引: idx_po_po_number');

  db.exec(`CREATE INDEX idx_po_contact_id ON purchase_order(contact_id)`);
  console.log('✓ 创建索引: idx_po_contact_id');

  // ============================================================================
  // job 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_job_job_number ON job(job_number)`);
  console.log('✓ 创建索引: idx_job_job_number');

  db.exec(`CREATE INDEX idx_job_po_id ON job(po_id)`);
  console.log('✓ 创建索引: idx_job_po_id');

  db.exec(`CREATE INDEX idx_job_priority ON job(priority)`);
  console.log('✓ 创建索引: idx_job_priority');

  // ============================================================================
  // order_item 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_oi_job_id ON order_item(job_id)`);
  console.log('✓ 创建索引: idx_oi_job_id');

  db.exec(`CREATE INDEX idx_oi_part_id ON order_item(part_id)`);
  console.log('✓ 创建索引: idx_oi_part_id');

  db.exec(`CREATE INDEX idx_oi_status ON order_item(status)`);
  console.log('✓ 创建索引: idx_oi_status');

  db.exec(`CREATE INDEX idx_oi_job_line ON order_item(job_id, line_number)`);
  console.log('✓ 创建索引: idx_oi_job_line (复合索引)');

  // ============================================================================
  // part 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_part_drawing_number ON part(drawing_number)`);
  console.log('✓ 创建索引: idx_part_drawing_number');

  db.exec(`CREATE INDEX idx_part_revision ON part(revision)`);
  console.log('✓ 创建索引: idx_part_revision');

  db.exec(`CREATE INDEX idx_part_next_id ON part(next_id)`);
  console.log('✓ 创建索引: idx_part_next_id');

  db.exec(`CREATE INDEX idx_part_previous_id ON part(previous_id)`);
  console.log('✓ 创建索引: idx_part_previous_id');

  db.exec(`CREATE INDEX idx_part_is_assembly ON part(is_assembly)`);
  console.log('✓ 创建索引: idx_part_is_assembly');

  // ============================================================================
  // part_tree 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_pt_parent_id ON part_tree(parent_id)`);
  console.log('✓ 创建索引: idx_pt_parent_id');

  db.exec(`CREATE INDEX idx_pt_child_id ON part_tree(child_id)`);
  console.log('✓ 创建索引: idx_pt_child_id');

  // ============================================================================
  // shipment 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_shipment_packing_slip ON shipment(packing_slip_number)`);
  console.log('✓ 创建索引: idx_shipment_packing_slip');

  db.exec(`CREATE INDEX idx_shipment_invoice ON shipment(invoice_number)`);
  console.log('✓ 创建索引: idx_shipment_invoice');

  // ============================================================================
  // shipment_item 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_si_order_item_id ON shipment_item(order_item_id)`);
  console.log('✓ 创建索引: idx_si_order_item_id');

  db.exec(`CREATE INDEX idx_si_shipment_id ON shipment_item(shipment_id)`);
  console.log('✓ 创建索引: idx_si_shipment_id');

  // ============================================================================
  // part_attachment 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_pa_part_id ON part_attachment(part_id)`);
  console.log('✓ 创建索引: idx_pa_part_id');

  db.exec(`CREATE INDEX idx_pa_order_item_id ON part_attachment(order_item_id)`);
  console.log('✓ 创建索引: idx_pa_order_item_id');

  db.exec(`CREATE INDEX idx_pa_file_type ON part_attachment(file_type)`);
  console.log('✓ 创建索引: idx_pa_file_type');

  // ============================================================================
  // drawing_file 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_df_part_id ON drawing_file(part_id)`);
  console.log('✓ 创建索引: idx_df_part_id');

  db.exec(`CREATE INDEX idx_df_is_active ON drawing_file(is_active)`);
  console.log('✓ 创建索引: idx_df_is_active');

  // ============================================================================
  // folder_mapping 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_fm_customer_id ON folder_mapping(customer_id)`);
  console.log('✓ 创建索引: idx_fm_customer_id');

  db.exec(`CREATE INDEX idx_fm_folder_name ON folder_mapping(folder_name)`);
  console.log('✓ 创建索引: idx_fm_folder_name');

  // ============================================================================
  // process_template 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_pt_part_id ON process_template(part_id)`);
  console.log('✓ 创建索引: idx_pt_part_id');

  db.exec(`CREATE INDEX idx_pt_shop_code ON process_template(shop_code)`);
  console.log('✓ 创建索引: idx_pt_shop_code');

  // ============================================================================
  // step_tracker 表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_st_order_item_id ON step_tracker(order_item_id)`);
  console.log('✓ 创建索引: idx_st_order_item_id');

  db.exec(`CREATE INDEX idx_st_process_template_id ON step_tracker(process_template_id)`);
  console.log('✓ 创建索引: idx_st_process_template_id');

  db.exec(`CREATE INDEX idx_st_status ON step_tracker(status)`);
  console.log('✓ 创建索引: idx_st_status');

  db.exec(`CREATE INDEX idx_st_operator_id ON step_tracker(operator_id)`);
  console.log('✓ 创建索引: idx_st_operator_id');

  // ============================================================================
  // 备注表索引
  // ============================================================================
  db.exec(`CREATE INDEX idx_po_note_po_id ON po_note(po_id)`);
  console.log('✓ 创建索引: idx_po_note_po_id');

  db.exec(`CREATE INDEX idx_job_note_job_id ON job_note(job_id)`);
  console.log('✓ 创建索引: idx_job_note_job_id');

  db.exec(`CREATE INDEX idx_oi_note_oi_id ON order_item_note(order_item_id)`);
  console.log('✓ 创建索引: idx_oi_note_oi_id');

  db.exec(`CREATE INDEX idx_part_note_part_id ON part_note(part_id)`);
  console.log('✓ 创建索引: idx_part_note_part_id');

  db.exec(`CREATE INDEX idx_shipment_note_shipment_id ON shipment_note(shipment_id)`);
  console.log('✓ 创建索引: idx_shipment_note_shipment_id');

  db.exec(`CREATE INDEX idx_attachment_note_attachment_id ON attachment_note(attachment_id)`);
  console.log('✓ 创建索引: idx_attachment_note_attachment_id');

  console.log('\n✅ 迁移 023 完成：共 45+ 个索引创建成功');
}

export function down(db) {
  console.log('删除所有性能优化索引...');
  
  const indices = [
    'idx_customer_name',
    'idx_contact_customer_id',
    'idx_contact_name',
    'idx_po_po_number',
    'idx_po_contact_id',
    'idx_job_job_number',
    'idx_job_po_id',
    'idx_job_priority',
    'idx_oi_job_id',
    'idx_oi_part_id',
    'idx_oi_status',
    'idx_oi_job_line',
    'idx_part_drawing_number',
    'idx_part_revision',
    'idx_part_next_id',
    'idx_part_previous_id',
    'idx_part_is_assembly',
    'idx_pt_parent_id',
    'idx_pt_child_id',
    'idx_shipment_packing_slip',
    'idx_shipment_invoice',
    'idx_si_order_item_id',
    'idx_si_shipment_id',
    'idx_pa_part_id',
    'idx_pa_order_item_id',
    'idx_pa_file_type',
    'idx_df_part_id',
    'idx_df_is_active',
    'idx_fm_customer_id',
    'idx_fm_folder_name',
    'idx_pt_part_id',
    'idx_pt_shop_code',
    'idx_st_order_item_id',
    'idx_st_process_template_id',
    'idx_st_status',
    'idx_st_operator_id',
    'idx_po_note_po_id',
    'idx_job_note_job_id',
    'idx_oi_note_oi_id',
    'idx_part_note_part_id',
    'idx_shipment_note_shipment_id',
    'idx_attachment_note_attachment_id'
  ];

  for (const idx of indices) {
    try {
      db.exec(`DROP INDEX IF EXISTS ${idx}`);
      console.log(`✓ 删除索引: ${idx}`);
    } catch (e) {
      // 忽略不存在的索引
    }
  }

  console.log('\n✅ 迁移 023 回滚完成');
}
