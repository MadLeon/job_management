###### **customer**

id (PK)
customer\_name

usage\_count

last\_used
created\_at
updated\_at



```sql



CREATE TABLE customer (

&nbsp;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;   customer\_name TEXT NOT NULL,

&nbsp;   usage\_count INTEGER DEFAULT 0,

&nbsp;   last\_used TEXT DEFAULT '',

&nbsp;   created\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   updated\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))

);



```



note:



1. update usage\_count with updated\_at



###### **customer\_contact**

id (PK)
customer\_id (FK -> customer.id)
contact\_name
contact\_email
usage\_count
last\_used
created\_at
updated\_at



```sql



CREATE TABLE customer\_contact (

&nbsp;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;   customer\_id INTEGER NOT NULL,

&nbsp;   contact\_name TEXT NOT NULL,

&nbsp;   contact\_email TEXT,

&nbsp;   usage\_count INTEGER DEFAULT 0,

&nbsp;   last\_used TEXT DEFAULT '',

&nbsp;   created\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   updated\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   FOREIGN KEY (customer\_id) REFERENCES customer(id) ON DELETE CASCADE

);



```



###### **purchase\_order**

id (PK)
po\_number
oe\_number
contact\_id (FK -> customer\_contact.id)

is\_archived

closed\_at
created\_at
updated\_at



```sql

CREATE TABLE purchase\_order (

&nbsp;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;   po\_number TEXT NOT NULL,

&nbsp;   oe\_number TEXT,

&nbsp;   contact\_id INTEGER NOT NULL,

&nbsp;   is\_active INTEGER DEFAULT 1, -- 0: Archived, 1: Active

&nbsp;   closed\_at TEXT,

&nbsp;   created\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   updated\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   FOREIGN KEY (contact\_id) REFERENCES customer\_contact(id)

);

```



###### **job**

id (PK)
job\_number (UK)
po\_id (FK -> purchase\_order.id)
priorit
created\_at
updated\_at



```sql

CREATE TABLE job (

&nbsp;   id INTEGER PRIMARY KEY AUTOINCREMENT,

&nbsp;   job\_number TEXT UNIQUE NOT NULL,

&nbsp;   po\_id INTEGER NOT NULL,

&nbsp;   priority TEXT DEFAULT 'Normal',

&nbsp;   created\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   updated\_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

&nbsp;   FOREIGN KEY (po\_id) REFERENCES purchase\_order(id) ON DELETE CASCADE

);

```



###### **order\_item**

id (PK)
job\_id (FK -> production\_job.id)
part\_id (FK ->part.id)
line\_number
order\_quantity

actual\_price

\* *production\_hour*
\* *administrative\_hour*

*\* status*
drawing\_release\_date
delivery\_required\_date
created\_at
updated\_at



```sql







```



###### **shipment**

id (PK)
packing\_slip\_number (unique)
invoice\_number
delivery\_shipped\_date
created\_at
updated\_at



```sql







```



###### **shipment\_item**

id (PK)
order\_item\_id (FK -> order\_item.id)
shipment\_id (FK -> shipment.id)
shipped\_quantity
note: text
created\_at
updated\_at



```sql







```



###### **part**

id (PK)

previous\_id (FK -> part.id)
drawing\_number
revision
description

is\_assembly
\* *production\_count*
\* *total\_production\_hour*
\* *total\_administrative\_hour*
unit\_price
created\_at
updated\_at



```sql







```



###### **part\_tree**

id (PK)

parent\_id (FK -> part.id)

child\_id (FK -> part.id)

quantity

created\_at
updated\_at



```sql







```



###### **part\_attachment**

id (PK)

part\_id (FK -> part.id)

order\_item\_id (FK -> order\_item.id)

type

file\_name

file\_path

is\_active

last\_modified\_at

created\_at

updated\_at



```sql







```



###### **drawing\_file**

id (PK)

part\_id (FK -> part.id)

file\_name

file\_path

is\_active

last\_modified\_at

created\_at

updated\_at



```sql







```



###### **folder\_mapping**

id (PK)

customer\_id (FK -> customer.id)

folder\_name

is\_verified

created\_at

updated\_at



```sql







```



###### **process\_template**

id (PK)

part\_id (FK -> part.id)

row\_number

shop\_code

description

remark

created\_at

updated\_at



```sql







```



###### **step\_tracker**

id (PK)

order\_item\_id (FK -> order\_item.id)

process\_template\_id (FK -> process\_template.id)

operator\_id

machine\_id

status

start\_time

end\_time



```sql







```







