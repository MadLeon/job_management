###### **customer**

id (PK)
customer_name
usage_count
last_used
created_at
updated_at

CREATE TABLE customer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

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

CREATE TABLE customer_contact (

  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

###### **purchase_order**

id (PK)
po_number
oe_number
contact_id (FK -> customer_contact.id)
is_archived
closed_at
created_at
updated_at

CREATE TABLE purchase_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL,
  oe_number TEXT,
  contact_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1, -- 0: Archived, 1: Active
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (contact_id) REFERENCES customer_contact(id)
);

###### **job**

id (PK)
job_number (UK)
po_id (FK -> purchase_order.id)
priorit
created_at
updated_at

CREATE TABLE job (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_number TEXT UNIQUE NOT NULL,
  po_id INTEGER NOT NULL,
  priority TEXT DEFAULT 'Normal',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);

###### **order_item**

id (PK)
job_id (FK -> production_job.id)
part_id (FK ->part.id)
line_number
order_quantity
actual_price

* *production_hour*
* *administrative_hour*
* *status*
drawing_release_date
delivery_required_date
created_at
updated_at



```sql







```



###### **shipment**

id (PK)
packing_slip_number (unique)
invoice_number
delivery_shipped_date
created_at
updated_at



```sql







```



###### **shipment_item**

id (PK)
order_item_id (FK -> order_item.id)
shipment_id (FK -> shipment.id)
shipped_quantity
note: text
created_at
updated_at



```sql







```



###### **part**

id (PK)

previous_id (FK -> part.id)
drawing_number
revision
description

is_assembly
\* *production_count*
\* *total_production_hour*
\* *total_administrative_hour*
unit_price
created_at
updated_at



```sql







```



###### **part_tree**

id (PK)

parent_id (FK -> part.id)

child_id (FK -> part.id)

quantity

created_at
updated_at



```sql







```



###### **part_attachment**

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







```



###### **drawing_file**

id (PK)

part_id (FK -> part.id)

file_name

file_path

is_active

last_modified_at

created_at

updated_at



```sql







```



###### **folder_mapping**

id (PK)

customer_id (FK -> customer.id)

folder_name

is_verified

created_at

updated_at



```sql







```



###### **process_template**

id (PK)

part_id (FK -> part.id)

row_number

shop_code

description

remark

created_at

updated_at



```sql







```



###### **step_tracker**

id (PK)

order_item_id (FK -> order_item.id)

process_template_id (FK -> process_template.id)

operator_id

machine_id

status

start_time

end_time



```sql







```







