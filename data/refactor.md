###### **customer**

id (PK)
customer_name
usage_count
last_used
created_at
updated_at

```sql

CREATE TABLE customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

```

note:

1. update usage_count with updated_at

###### **customer_contact**

id (PK)
customer_id (FK -> customer.id)
contact_name
contact_email
usage_count
last_used
created_at
updated_at

```sql

CREATE TABLE customer_contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

```

###### **purchase_order**

id (PK)
po_number
oe_number
contact_id (FK -> customer_contact.id)
is_active
closed_at
created_at
updated_at

```sql

CREATE TABLE purchase_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL,
    oe_number TEXT,
    contact_id INTEGER NULL,
    is_active INTEGER DEFAULT 1, -- 1: Active, 0: Archived
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (contact_id) REFERENCES customer_contact(id)
);

```

###### **job**

id (PK)
job_number (UK)
po_id (FK -> purchase_order.id)
priorit
created_at
updated_at

```sql

CREATE TABLE job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_number TEXT UNIQUE NOT NULL,
    po_id INTEGER NOT NULL,
    priority TEXT DEFAULT 'Normal',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);

```

###### **order_item**

id (PK)
job_id (FK -> production_job.id)
part_id (FK ->part.id)
line_number
quantity
actual_price
* *production_hour*
* *administrative_hour*
* *status*
drawing_release_date
delivery_required_date
created_at
updated_at

```sql

CREATE TABLE order_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  actual_price REAL,
  production_hour REAL DEFAULT 0,
  administrative_hour REAL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  drawing_release_date TEXT,
  delivery_required_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES part(id)
);

```

###### **shipment**

id (PK)
packing_slip_number (unique)
invoice_number
delivery_shipped_date
created_at
updated_at

```sql

CREATE TABLE shipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packing_slip_number TEXT UNIQUE NOT NULL,
    invoice_number TEXT,
    delivery_shipped_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

```

###### **shipment_item**
发货明细表
id (PK)
order_item_id (FK -> order_item.id)
shipment_id (FK -> shipment.id)
shipped_quantity
created_at
updated_at

```sql

CREATE TABLE shipment_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  shipment_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id),
  FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
);

```

###### **part**

id (PK)
previous_id (FK -> part.id)
drawing_number
revision
description
is_assembly
* *production_count*
* *total_production_hour*
* *total_administrative_hour*
unit_price
created_at
updated_at

```sql

CREATE TABLE part (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  previous_id INTEGER,
  next_id INTEGER,
  drawing_number TEXT NOT NULL,
  revision TEXT NULL,
  description TEXT,
  is_assembly INTEGER DEFAULT 0,
  production_count INTEGER DEFAULT 0,
  total_production_hour REAL DEFAULT 0,
  total_administrative_hour REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (previous_id) REFERENCES part(id),
  UNIQUE(drawing_number, revision)
);

```

###### **part_tree**
零件组成关系表 (BOM)
id (PK)
parent_id (FK -> part.id)
child_id (FK -> part.id)
quantity
created_at
updated_at

```sql

CREATE TABLE part_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (parent_id) REFERENCES part(id),
  FOREIGN KEY (child_id) REFERENCES part(id)
);

```

###### **part_attachment**
零件附件表 (图纸PDF, 质检报告等)
id (PK)
part_id (FK -> part.id)
order_item_id (FK -> order_item.id)
type
file_name
file_path
is_active
last_modified_at
created_at
updated_at

```sql

CREATE TABLE part_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER,
  order_item_id INTEGER,
  file_type         TEXT    NOT NULL, -- 如 INSPECTION, MTR, DEVIATION
  file_name         TEXT    NOT NULL,
  file_path         TEXT    NOT NULL UNIQUE,
  is_active         INTEGER DEFAULT 0,
  last_modified_at  TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id)
);

```

###### **drawing_file**
图纸文件路径表 
id (PK)
part_id (FK -> part.id)
file_name
file_path
is_active - 最新版本图纸标记
last_modified_at
created_at
updated_at

```sql

CREATE TABLE drawing_file (
    id                INTEGER   PRIMARY KEY AUTOINCREMENT,
    part_id           INTEGER   NOT NULL,
    file_name         TEXT      NOT NULL,
    file_path         TEXT      NOT NULL UNIQUE,
    is_active         INTEGER   DEFAULT 1,
    last_modified_at  TEXT,
    created_at        TEXT      NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at        TEXT      NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (part_id) REFERENCES part(id)
);

```

###### **folder_mapping**
客户文件夹映射表
id (PK)
customer_id (FK -> customer.id)
folder_name
is_verified
created_at
updated_at

```sql

CREATE TABLE folder_mapping (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  folder_name TEXT    NOT NULL,
  is_verified INTEGER DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

```

###### **process_template**
生产工艺模板表 (从 Excel 抓取)
id (PK)
part_id (FK -> part.id)
row_number
shop_code
description
remark
created_at
updated_at

```sql

CREATE TABLE process_template (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id     INTEGER NOT NULL,
  row_number  INTEGER NOT NULL,
  shop_code   TEXT    NOT NULL,
  description TEXT,
  remark      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id)
);

```

###### **step_tracker**
步骤追踪执行表 (条码扫描记录)
id (PK)
order_item_id (FK -> order_item.id)
process_template_id (FK -> process_template.id)
operator_id
machine_id
status
start_time
end_time

```sql

CREATE TABLE step_tracker (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id       INTEGER NOT NULL,
  process_template_id INTEGER NOT NULL,
  operator_id         TEXT,
  machine_id          TEXT,
  status              TEXT DEFAULT 'PENDING',
  start_time          TEXT,
  end_time            TEXT,
  FOREIGN KEY (order_item_id)       REFERENCES order_item(id)       ON DELETE CASCADE,
  FOREIGN KEY (process_template_id) REFERENCES process_template(id)
);

```
###### **step_tracker**
通用备注表 (管理所有对象的注释)

```sql

  CREATE TABLE note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 关联维度：填入哪个 ID 就代表是对哪个对象的备注
    po_id          INTEGER, -- 关联 purchase_order
    part_id        INTEGER, -- 关联 part
    job_id         INTEGER, -- 关联 job
    order_item_id  INTEGER, -- 关联 order_item
    shipment_id    INTEGER, -- 关联 shipment
    attachment_id  INTEGER, -- 关联 part_attachment (零件附件表)
    
    content        TEXT NOT NULL, -- 备注的具体内容
    author         TEXT,          -- 记录是谁写的备注（可选）
    
    created_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    
    -- 外键约束，当主表删除时，对应的备注也会被自动清理 (ON DELETE CASCADE)
    FOREIGN KEY (po_id)         REFERENCES purchase_order(id)   ON DELETE CASCADE,
    FOREIGN KEY (part_id)       REFERENCES part(id)             ON DELETE CASCADE,
    FOREIGN KEY (job_id)        REFERENCES job(id)              ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_item(id)       ON DELETE CASCADE,
    FOREIGN KEY (shipment_id)   REFERENCES shipment(id)         ON DELETE CASCADE,
    FOREIGN KEY (attachment_id) REFERENCES part_attachment(id)  ON DELETE CASCADE
  );

```