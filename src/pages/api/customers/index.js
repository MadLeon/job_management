/**
 * API: GET /api/customers
 * 
 * 获取活跃客户列表，按 usage_count 降序、customer_name 升序（不区分大小写）排序。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = getDB();
    
    // 查询所有活跃客户，按使用计数降序、名称升序排序
    const customers = db.prepare(`
      SELECT 
        customer_id,
        customer_name,
        is_active,
        usage_count,
        last_used,
        created_at,
        updated_at
      FROM customers
      WHERE is_active = 1
      ORDER BY usage_count DESC, LOWER(customer_name) ASC
    `).all();

    res.status(200).json({
      customers,
      total: customers.length
    });
  } catch (error) {
    console.error('API Error (GET /api/customers):', error);
    res.status(500).json({ error: error.message });
  }
}
