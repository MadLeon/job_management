# 前端/API 架构重设计方案

**日期**: 2026-01-09  
**项目**: Job Management System  
**当前状态**: 数据库迁移完成，规划API和前端重设计

## 目录

1. [现状分析](#现状分析)
2. [数据结构对比](#数据结构对比)
3. [架构方案](#架构方案)
4. [API 设计](#api-设计)
5. [前端组件设计](#前端组件设计)
6. [创新UI视图](#创新ui视图)
7. [实现路线图](#实现路线图)
8. [决策矩阵](#决策矩阵)

---

## 现状分析

### 数据库迁移完成状态
- **新数据库**: `data/record.db` (SQLite3)
- **总记录数**: 141,493 条
- **表数量**: 20 张表（9个已填充，11个预留）
- **核心关系**: Customer → Contact → PurchaseOrder → Job → OrderItem → Part

### 当前前端特点
- **架构**: React + Next.js + MUI
- **状态管理**: React Query + Context API
- **数据模型**: Job-centric（以Job为根实体）
- **主要页面**: Job List, Job Detail, Job Parts, Assemblies
- **API层**: `/src/pages/api/jobs` 系列端点

### 业务逻辑特点
- **驱动力**: PO（采购订单）驱动，而非Job
- **关键实体关系**:
  - 1个PO含多个Job（平均~2个）
  - 1个Job含多个OrderItem（平均~2个）
  - 1个OrderItem涉及多个Part
  - 1个Part有多个Revision版本

---

## 数据结构对比

### 旧设计：Job-Centric (jobs.db)

```
查询示例：
SELECT * FROM jobs WHERE id = ?
结果: 平面数据结构，难以表现PO->Job->Item->Part的层级关系
```

**问题**:
- ❌ 不能直观表现PO的概念（PO是订单的真正来源）
- ❌ 难以支持按PO统计和管理
- ❌ OrderItem信息缺失或分散
- ❌ 成本分析困难（无法按PO聚合）

### 新设计：PO-Centric (record.db)

```
层级结构:
Customer (24个)
  └─ CustomerContact (69个)
      └─ PurchaseOrder (172个)
          ├─ Job (339个)
          │  └─ OrderItem (358个)
          │     └─ Part (1,657个)
          └─ Shipment (5/10个)
             └─ ShipmentItem
```

**优势**:
- ✅ PO是显式的一等公民实体
- ✅ 支持多维度分析（按客户、按PO、按Job）
- ✅ 成本管理清晰（每个OrderItem有price_per_unit）
- ✅ 发货管理明确（Shipment与PO直接关联）
- ✅ 符合实际业务流程

---

## 架构方案

### 方案A：最小改动方案 - API适配器模式

**概念**: 保持前端不变，API层做数据转换

```javascript
// 适配器将新数据结构转换为老格式
// GET /api/jobs (新API)
// 内部:
//   1. 从record.db查询: purchase_order, job, order_item
//   2. 构建老格式的job对象
//   3. 返回前端

// 示例代码
async function getJobsAsLegacy() {
  const jobs = db.prepare(`
    SELECT j.*, po.id as po_id, po.po_number, oi.id as item_id, oi.description
    FROM job j
    JOIN purchase_order po ON j.po_id = po.id
    LEFT JOIN order_item oi ON j.id = oi.job_id
  `).all();
  
  // 转换为前端期望的格式
  return transformToLegacyFormat(jobs);
}
```

**优点**:
- 📈 改动最小，风险低
- ⏱️ 实施速度快（1-2周）
- 💰 成本最低
- 📚 现有前端代码无需改动

**缺点**:
- ❌ 业务逻辑仍然以Job为中心，不符合实际
- ❌ PO级别的功能难以实现
- ❌ 数据冗余和多次查询
- ❌ 无法充分利用新的数据结构优势
- ⚠️ 后期扩展困难

---

### 方案B：完整重设计方案 - PO-Centric 架构

**概念**: 前端重构为以PO为根实体，支持多维度视图

#### B1. 多表关联设计详解

**核心思想**: 前端不再处理平面数据，而是处理**树形数据结构**

```javascript
// 数据结构示例：PO及其所有相关数据
const purchaseOrderWithDetails = {
  id: 1,
  po_number: "PO-2024-001",
  customer_id: 5,
  customer_name: "ABC Corporation",
  contact_id: 12,
  contact_name: "John Doe",
  po_date: "2024-01-15",
  
  // 嵌套的Job数组
  jobs: [
    {
      id: 10,
      po_id: 1,
      customer_part_no: "PART-001",
      description: "Machined Component",
      
      // 嵌套的OrderItem数组
      order_items: [
        {
          id: 100,
          job_id: 10,
          part_id: 50,
          quantity: 100,
          price_per_unit: 25.50,
          total_price: 2550.00,
          
          // 嵌套的Part信息
          part: {
            id: 50,
            part_number: "P-001",
            description: "Base Component",
            category: "Machined"
          }
        }
      ]
    },
    {
      id: 11,
      po_id: 1,
      customer_part_no: "PART-002",
      // ... 其他Job信息
    }
  ],
  
  // 嵌套的Shipment数组
  shipments: [
    {
      id: 1,
      po_id: 1,
      shipment_date: "2024-01-25",
      items: [
        { id: 200, shipment_id: 1, order_item_id: 100, qty_shipped: 50 }
      ]
    }
  ],
  
  // 元数据
  summary: {
    total_jobs: 2,
    total_items: 3,
    total_cost: 5000.00,
    items_shipped: 50,
    items_pending: 50,
    status: "in-progress"
  }
};
```

**实现技术**:

```javascript
// 单个SQL查询获取完整的PO树
const getPurchaseOrderTree = db.prepare(`
  SELECT 
    po.id, po.po_number, po.customer_id, po.po_date,
    c.company_name as customer_name,
    cc.name as contact_name,
    j.id as job_id, j.customer_part_no, j.description,
    oi.id as item_id, oi.quantity, oi.price_per_unit,
    p.id as part_id, p.part_number, p.description as part_desc
  FROM purchase_order po
  JOIN customer c ON po.customer_id = c.id
  JOIN customer_contact cc ON po.contact_id = cc.id
  LEFT JOIN job j ON po.id = j.po_id
  LEFT JOIN order_item oi ON j.id = oi.job_id
  LEFT JOIN part p ON oi.part_id = p.id
  WHERE po.id = ?
`).all(poId);

// 前端数据转换（或后端完成）
function buildPOTree(flatData) {
  const po = {};
  const jobMap = {};
  
  flatData.forEach(row => {
    // 初始化PO
    if (!po.id) {
      Object.assign(po, {
        id: row.id,
        po_number: row.po_number,
        customer_name: row.customer_name,
        contact_name: row.contact_name,
        jobs: []
      });
    }
    
    // 初始化或获取Job
    if (row.job_id && !jobMap[row.job_id]) {
      jobMap[row.job_id] = {
        id: row.job_id,
        description: row.description,
        order_items: []
      };
      po.jobs.push(jobMap[row.job_id]);
    }
    
    // 添加OrderItem
    if (row.item_id && row.job_id) {
      jobMap[row.job_id].order_items.push({
        id: row.item_id,
        quantity: row.quantity,
        price_per_unit: row.price_per_unit,
        part: {
          id: row.part_id,
          part_number: row.part_number
        }
      });
    }
  });
  
  return po;
}
```

#### B2. API 嵌套资源设计

```
API路由结构 (RESTful Nested Resources):

/api/purchase-orders
  ├─ GET    获取所有PO列表
  ├─ POST   创建新PO
  │
  └─ /api/purchase-orders/{poId}
      ├─ GET    获取PO详情（含所有嵌套数据）
      ├─ PUT    更新PO
      ├─ DELETE 删除PO
      │
      ├─ /api/purchase-orders/{poId}/jobs
      │  ├─ GET    该PO的所有Job
      │  ├─ POST   为该PO创建新Job
      │  │
      │  └─ /api/purchase-orders/{poId}/jobs/{jobId}
      │     ├─ GET    获取特定Job详情
      │     ├─ PUT    更新Job
      │     ├─ DELETE 删除Job
      │     │
      │     └─ /api/purchase-orders/{poId}/jobs/{jobId}/items
      │        ├─ GET    该Job的所有OrderItem
      │        ├─ POST   添加OrderItem
      │        │
      │        └─ /api/purchase-orders/{poId}/jobs/{jobId}/items/{itemId}
      │           ├─ GET    获取OrderItem详情
      │           ├─ PUT    更新OrderItem
      │           └─ DELETE 删除OrderItem
      │
      └─ /api/purchase-orders/{poId}/shipments
         ├─ GET    该PO的所有发货记录
         ├─ POST   创建新发货记录
         │
         └─ /api/purchase-orders/{poId}/shipments/{shipmentId}
            ├─ GET    获取发货详情
            └─ PUT    更新发货状态
```

**API实现示例**:

```javascript
// pages/api/purchase-orders/[poId]/jobs/[jobId]/items/[itemId].js

export default async function handler(req, res) {
  const { poId, jobId, itemId } = req.query;
  
  try {
    if (req.method === 'GET') {
      const item = db.prepare(`
        SELECT oi.*, j.po_id, p.part_number, p.description
        FROM order_item oi
        JOIN job j ON oi.job_id = j.id
        LEFT JOIN part p ON oi.part_id = p.id
        WHERE oi.id = ? AND j.id = ? AND j.po_id = ?
      `).get(itemId, jobId, poId);
      
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.json(item);
    }
    
    if (req.method === 'PUT') {
      const { quantity, price_per_unit } = req.body;
      db.prepare(`
        UPDATE order_item 
        SET quantity = ?, price_per_unit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(quantity, price_per_unit, itemId);
      
      return res.json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

#### B3. 前端组件层级设计

```
组件树结构 (PO-Centric):

<PODashboard>           // 主容器
  ├─ <POSelector>       // PO选择器，展示PO列表
  ├─ <POSummary>        // PO汇总面板（总成本、状态、进度）
  └─ <PODetails>        // PO详情容器
      ├─ <JobsSection>  // Jobs列表
      │   └─ <JobCard>  // 单个Job卡片
      │       └─ <ItemsTable>  // OrderItems表格
      │           └─ <ItemRow>  // 单个Item行
      │
      ├─ <ShipmentsSection>  // 发货部分
      │   └─ <ShipmentCard>
      │
      └─ <PONotesSection>  // PO笔记
```

**优点**:
- ✅ 架构清晰，与业务逻辑一致
- ✅ 支持PO级别的所有操作
- ✅ 成本管理和分析功能完整
- ✅ 可扩展性强，易于添加新功能
- ✅ 前端数据流清晰（树形结构）

**缺点**:
- ❌ 改动范围大（需要重写多个组件）
- ⏱️ 实施周期长（3-4周）
- 💰 成本较高
- ⚠️ 需要修改现有业务逻辑理解

---

## API 设计

### 核心端点设计

#### 1. 采购订单管理

```javascript
// GET /api/purchase-orders
// 列表视图，支持过滤和搜索
响应: {
  success: true,
  data: [
    {
      id: 1,
      po_number: "PO-2024-001",
      customer_name: "ABC Corp",
      po_date: "2024-01-15",
      total_cost: 5000.00,
      status: "in-progress",
      job_count: 2,
      item_count: 5
    }
  ],
  total: 172,
  page: 1,
  limit: 20
}

// GET /api/purchase-orders/:poId
// 完整详情（包含所有嵌套数据）
响应: {
  success: true,
  data: {
    id: 1,
    po_number: "PO-2024-001",
    customer: { id: 5, company_name: "ABC Corp" },
    contact: { id: 12, name: "John Doe", email: "john@abc.com" },
    jobs: [...],        // 嵌套的Job数组
    shipments: [...],   // 嵌套的Shipment数组
    summary: {
      total_jobs: 2,
      total_items: 5,
      total_cost: 5000.00,
      items_shipped: 50,
      items_pending: 450,
      status_breakdown: { "pending": 2, "in-progress": 2, "completed": 1 }
    }
  }
}
```

#### 2. Job管理

```javascript
// GET /api/purchase-orders/:poId/jobs
// 获取该PO的所有Job
响应: {
  success: true,
  data: [
    {
      id: 10,
      po_id: 1,
      customer_part_no: "PART-001",
      description: "Machined Component",
      status: "in-progress",
      item_count: 3,
      total_cost: 2550.00
    }
  ]
}

// POST /api/purchase-orders/:poId/jobs
// 创建新Job
请求体: {
  customer_part_no: "PART-003",
  description: "New Component"
}
```

#### 3. OrderItem管理

```javascript
// GET /api/purchase-orders/:poId/jobs/:jobId/items
// 获取该Job的所有OrderItem
响应: {
  success: true,
  data: [
    {
      id: 100,
      job_id: 10,
      part_id: 50,
      part_number: "P-001",
      quantity: 100,
      price_per_unit: 25.50,
      total_price: 2550.00,
      status: "pending"
    }
  ]
}

// PUT /api/purchase-orders/:poId/jobs/:jobId/items/:itemId
// 更新OrderItem（如数量、价格）
请求体: {
  quantity: 120,
  price_per_unit: 26.00
}
```

#### 4. 发货管理

```javascript
// POST /api/purchase-orders/:poId/shipments
// 创建发货记录
请求体: {
  shipment_date: "2024-01-25",
  notes: "First batch"
}

// POST /api/purchase-orders/:poId/shipments/:shipmentId/items
// 添加发货项目（关联OrderItem）
请求体: {
  order_item_id: 100,
  qty_shipped: 50
}
```

---

## 前端组件设计

### React Hooks 设计

```javascript
// hooks/usePurchaseOrder.js
export function usePurchaseOrder(poId) {
  const { data, isLoading, error } = useQuery(
    ['purchase-order', poId],
    () => fetch(`/api/purchase-orders/${poId}`).then(r => r.json())
  );
  return { po: data?.data, isLoading, error };
}

// hooks/usePOJobs.js
export function usePOJobs(poId) {
  const { data } = useQuery(
    ['po-jobs', poId],
    () => fetch(`/api/purchase-orders/${poId}/jobs`).then(r => r.json())
  );
  return { jobs: data?.data || [] };
}

// hooks/useOrderItems.js
export function useOrderItems(poId, jobId) {
  const { data } = useQuery(
    ['order-items', poId, jobId],
    () => fetch(`/api/purchase-orders/${poId}/jobs/${jobId}/items`).then(r => r.json())
  );
  return { items: data?.data || [] };
}
```

### 组件示例

```javascript
// components/PODashboard.jsx
export default function PODashboard() {
  const [selectedPoId, setSelectedPoId] = useState(null);
  const { po, isLoading } = usePurchaseOrder(selectedPoId);
  
  if (!selectedPoId) return <POSelector onSelect={setSelectedPoId} />;
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="po-dashboard">
      <POHeader po={po} />
      <POSummary po={po} />
      <JobsSection poId={selectedPoId} />
      <ShipmentsSection poId={selectedPoId} />
    </div>
  );
}

// components/JobsSection.jsx
export default function JobsSection({ poId }) {
  const { jobs } = usePOJobs(poId);
  
  return (
    <div className="jobs-section">
      <h2>Jobs ({jobs.length})</h2>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} poId={poId} />
      ))}
    </div>
  );
}

// components/JobCard.jsx
export default function JobCard({ job, poId }) {
  const { items } = useOrderItems(poId, job.id);
  
  return (
    <Card>
      <CardHeader title={job.customer_part_no} />
      <CardContent>
        <ItemsTable items={items} poId={poId} jobId={job.id} />
      </CardContent>
    </Card>
  );
}
```

---

## 创新UI视图

### 1. PO Dashboard（采购订单仪表板）

```
┌─────────────────────────────────────────────────┐
│ PO-2024-001 | ABC Corporation | John Doe        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐   │
│  │ $5,000  │  │    2     │  │ 10% shipped │   │
│  │ Total   │  │  Jobs    │  │  50/500qty  │   │
│  │ Cost    │  │          │  │             │   │
│  └─────────┘  └──────────┘  └─────────────┘   │
│                                                 │
│  Status Breakdown:                             │
│  ● Pending: 2 jobs     ● In Progress: 2 jobs  │
│  ● Completed: 1 job                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**功能**:
- 实时成本总计
- Job进度跟踪
- 发货百分比
- 状态分布图

---

### 2. Production Pipeline（生产流水线）

```
Job List                  Manufacturing               Shipping
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│ PART-001    │────────▶│ Pending      │────────▶│ Ready to Ship│
│ 100 units   │         │ 95 units     │         │ 5 units      │
└─────────────┘         └──────────────┘         └──────────────┘
     ▲                        ▲                         ▲
     │                        │                         │
  Drag to                  In Progress              Complete
  reorder                  Update qty
```

**功能**:
- 拖拽排序Job优先级
- 实时更新制造进度
- 发货准备状态
- 瓶颈识别（显示延迟的Job）

---

### 3. Cost Analysis（成本分析）

```
PO Cost Breakdown:

By Job:
  ├─ PART-001  $2,550  (100 units × $25.50)
  └─ PART-002  $2,450  (50 units × $49.00)

By Status:
  ├─ Pending      $1,000  (40%)
  ├─ In Progress  $2,500  (50%)
  └─ Completed    $1,500  (10%)

By Part:
  ├─ P-001  $1,275  (10% of PO)
  ├─ P-002  $1,275  (10% of PO)
  └─ ...

Export: CSV | PDF | Excel
```

**功能**:
- 多维度成本分析
- 成本预算跟踪
- 成本趋势分析
- 导出报表

---

### 4. Real-time Notifications（实时通知）

```
通知面板:
┌──────────────────────────────────┐
│ 🔴 Job #10 missed deadline       │ 2 min ago
│    PART-001 was due 5 min ago    │
├──────────────────────────────────┤
│ 🟢 Shipment #5 completed         │ 15 min ago
│    50 units of P-001 shipped     │
├──────────────────────────────────┤
│ 🟡 Order Item #100 in review     │ 1 hour ago
│    Awaiting approval for revision│
└──────────────────────────────────┘

功能:
- WebSocket 实时推送
- 可配置的警报规则
- 历史消息查看
- 订阅特定PO的通知
```

---

## 实现路线图

### 阶段1：快速启动（2-3周）

**目标**: 最小化可行产品

```
Week 1:
  ✓ 实现 /api/purchase-orders 基础端点
  ✓ 实现 /api/purchase-orders/:poId 详情端点
  ✓ 创建 usePurchaseOrder hook

Week 2:
  ✓ 创建 PODashboard 基础组件
  ✓ 创建 POSelector 列表组件
  ✓ 创建 POSummary 汇总组件

Week 3:
  ✓ 创建 JobsSection 和 JobCard 组件
  ✓ 集成数据到前端
  ✓ 基础测试和调试
```

**交付物**:
- 可查看PO及其Jobs的基础UI
- REST API 3个核心端点
- 数据能完整展示

---

### 阶段2：功能完整化（3-4周）

**目标**: 完整的CRUD操作

```
Week 1:
  ✓ 实现 Job CRUD API 端点
  ✓ 实现 OrderItem CRUD API 端点
  ✓ 实现嵌套资源路由

Week 2:
  ✓ 创建 ItemsTable 和编辑组件
  ✓ 创建 Job 添加/编辑对话框
  ✓ 集成表单验证

Week 3:
  ✓ 实现发货管理 API
  ✓ 创建 ShipmentsSection 组件
  ✓ 成本计算和验证

Week 4:
  ✓ 完整测试覆盖
  ✓ 性能优化
  ✓ 文档编写
```

**交付物**:
- 完整的PO/Job/Item管理功能
- 发货管理功能
- 15+ API端点

---

### 阶段3：创新功能（4-5周）

**目标**: 高价值的增强功能

```
Week 1-2:
  ✓ 实现 Production Pipeline 视图
  ✓ 拖拽排序功能
  ✓ 实时进度更新

Week 2-3:
  ✓ 实现 Cost Analysis Dashboard
  ✓ 多维度分析查询
  ✓ 报表导出功能

Week 3-4:
  ✓ 实现实时通知系统
  ✓ WebSocket 集成
  ✓ 推送通知规则配置

Week 4-5:
  ✓ 高级搜索和过滤
  ✓ 性能优化 (缓存、分页)
  ✓ 最终集成测试
```

**交付物**:
- Pipeline 和 Cost Analysis UI
- 实时通知系统
- 高级查询功能

---

## 决策矩阵

### 对比：方案A vs 方案B

| 维度 | 方案A（最小改动） | 方案B（完整重设计） |
|------|-----------------|-------------------|
| **实施时间** | 1-2周 | 8-12周 |
| **开发成本** | 低 | 高 |
| **代码改动** | 5-10% | 40-60% |
| **技术风险** | 低 | 中 |
| **功能完整性** | 60% | 95% |
| **业务对齐度** | 低（仍为Job-centric） | 高（PO-centric） |
| **后期扩展成本** | 高 | 低 |
| **PO级别功能** | 困难 | 原生支持 |
| **成本分析** | 困难 | 完整 |
| **发货管理** | 部分 | 完整 |
| **用户体验** | 一致但过时 | 现代且直观 |

### 建议方案

**推荐：方案B（完整重设计）**

**理由**:
1. 虽然前期投入大，但长期收益更高
2. 与新的数据库设计完全对齐
3. 为后续创新功能奠定基础
4. 后期维护和扩展成本更低
5. 能够充分利用已有的数据资产

**分阶段实施建议**:
- 阶段1（2-3周）：快速交付基础功能，验证设计
- 阶段2（3-4周）：完整CRUD功能，确保业务流程闭合
- 阶段3（4-5周）：创新功能，提升竞争力

---

## 技术栈补充

### 后端技术
- **框架**: Next.js API Routes
- **数据库**: SQLite3 + better-sqlite3
- **验证**: Express-validator 或自定义
- **错误处理**: 统一的错误响应格式
- **日志**: Console + 可选的日志服务

### 前端技术
- **框架**: React 18 + Next.js
- **状态**: React Query (TanStack Query)
- **组件库**: MUI (Material-UI)
- **样式**: CSS-in-JS (Emotion)
- **表单**: React Hook Form + MUI
- **表格**: 自定义或 MUI DataGrid

### 可选增强
- **实时**: Socket.io / WebSocket
- **导出**: jsPDF / xlsx / papaparse
- **拖拽**: react-beautiful-dnd / dnd-kit
- **动画**: Framer Motion
- **图表**: Recharts / Chart.js

---

## 实施步骤清单

### 准备阶段
- [ ] 确认选择方案（A或B）
- [ ] 建立开发和测试数据库
- [ ] 编写API文档
- [ ] 设计UI原型/交互稿

### 阶段1
- [ ] 创建API路由结构
- [ ] 实现PO列表/详情API
- [ ] 创建基础前端组件
- [ ] 集成React Query

### 阶段2
- [ ] 实现Job CRUD API
- [ ] 实现Item CRUD API
- [ ] 创建编辑表单
- [ ] 测试和调试

### 阶段3
- [ ] 创意功能开发
- [ ] 性能优化
- [ ] 完整测试覆盖
- [ ] 上线准备

---

## 参考资源

### API设计最佳实践
- RESTful API 设计指南
- JSON API Specification
- OpenAPI/Swagger 规范

### React最佳实践
- React Query 官方文档
- Custom Hooks 模式
- Performance Optimization

### 数据库设计
- 当前文档: `data/structure.txt`
- 迁移记录: `data/migrations.json`
- 设计规范: `data/refactor.md`

---

**文档版本**: 1.0  
**最后更新**: 2026-01-09  
**维护者**: AI 编码代理
