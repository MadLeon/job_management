' mod_AddNewJobToDB.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Insert new job entry with cascading updates to multiple tables in record.db
'   - Handles: purchase_order → job → order_item → part relationships
' -------------------------------------------------------------------------------------------------
Option Explicit

' Insert or update purchase_order, then create job and order_item entries
'
' This procedure performs cascading inserts:
' 1. Find or create customer_contact by contact name and customer name
' 2. Find or create purchase_order with po_number (linked to customer_contact)
' 3. Create job entry with job_number (linked to purchase_order)
' 4. Find or create part by drawing_number, then create order_item (linked to job and part)
'
' Workflow:
' - Read form inputs from Input Form sheet
' - Validate critical data (OE, JobNum)
' - Execute multi-level insert operations
' - Write order_item ID to DELIVERY SCHEDULE column AA (column 27)
Sub AddNewJobToDB(Optional rowNumber As Long = 0)
    Dim dbPath As String, db As Object
    Dim inputWS As Worksheet
    Dim lastRowDelivery As Long
    Dim deliveryWS As Worksheet

    ' ========== Step 1: Set Object Variables and Initialize DB ==========
    dbPath = mod_PublicData.DB_PATH ' Use public constant from mod_PublicData
    Set inputWS = ThisWorkbook.Sheets("Input Form")

    ' Only initialize if not already initialized (avoid duplicate initialization)
    ' Check by attempting a simple query
    Dim testResults As Variant
    testResults = mod_SQLite.ExecuteQuery("SELECT 1")
    If IsNull(testResults) Then
        If Not mod_SQLite.InitializeSQLite(dbPath) Then
            MsgBox "Failed to initialize database: " & dbPath, vbCritical
            Exit Sub
        End If
    End If

    ' ========== Step 2: Collect Input Data ==========
    Dim oeNumber As String, jobNumber As String, customerName As String
    Dim partNumber As String, revision As String, quantity As String
    Dim poNumber As String, lineNumber As String, actualPrice As String
    Dim deliveryRequiredDate As String, customerContact As String

    oeNumber = Trim(inputWS.Range("OE").Value)
    jobNumber = Trim(inputWS.Range("JobNum").Value)
    customerName = Trim(inputWS.Range("Customer").Value)
    partNumber = Trim(inputWS.Range("Parts").Value)
    revision = Trim(inputWS.Range("Revision").Value)
    quantity = Trim(inputWS.Range("qty").Value)
    poNumber = Trim(inputWS.Range("po").Value)
    lineNumber = Trim(inputWS.Range("poline").Value)
    actualPrice = Trim(inputWS.Range("price").Value)
    deliveryRequiredDate = Trim(inputWS.Range("date").Value)
    customerContact = Trim(inputWS.Range("contact").Value)

    ' Convert delivery date format from YYYY.M.D to YYYY-MM-DD
    If deliveryRequiredDate <> "" Then
        deliveryRequiredDate = FormatDateForDatabase(deliveryRequiredDate)
    End If

    ' ========== Step 3: Validate Critical Input ==========
    If oeNumber = "" Or jobNumber = "" Or poNumber = "" Then
        MsgBox "Critical data missing: OE, JobNum, and PO are required!", vbCritical
        mod_SQLite.CloseSQLite
        Exit Sub
    End If

    On Error GoTo HandleError

    ' ========== Step 4: Cascading Insert Operations ==========

    ' 4.1 Find or Create Customer
    Dim customerId As Variant
    customerId = FindOrCreateCustomer(customerName)
    If IsNull(customerId) Then
        Debug.Print "Failed to find or create customer: " & customerName
        mod_SQLite.CloseSQLite
        Exit Sub
    End If

    ' 4.2 Find or Create Customer Contact
    Dim contactId As Variant
    contactId = FindOrCreateCustomerContact(CLng(customerId), customerContact)
    If IsNull(contactId) Then
        Debug.Print "Failed to find or create customer contact: " & customerContact
        mod_SQLite.CloseSQLite
        Exit Sub
    End If

    ' 4.3 Find or Create Purchase Order
    Dim poId As Variant
    poId = FindOrCreatePurchaseOrder(poNumber, oeNumber, CLng(contactId))
    If IsNull(poId) Then
        Debug.Print "Failed to find or create purchase order: " & poNumber
        mod_SQLite.CloseSQLite
        Exit Sub
    End If

    ' 4.4 Find or Create Job
    Dim jobId As Variant
    jobId = FindOrCreateJob(jobNumber, CLng(poId))
    If IsNull(jobId) Then
        Debug.Print "Failed to find or create job: " & jobNumber
        mod_SQLite.CloseSQLite
        Exit Sub
    End If

    ' 4.5 Find or Create Part
    Dim partId As Variant
    If partNumber <> "" Then
        partId = FindOrCreatePart(partNumber, revision)
    Else
        partId = Null
    End If

    ' 4.6 Create Order Item
    Dim orderItemId As Variant
    orderItemId = CreateOrderItem(CLng(jobId), partId, lineNumber, quantity, actualPrice, deliveryRequiredDate)
    If IsNull(orderItemId) Then
        Debug.Print "Failed to create order item"
        Exit Sub
    End If

    ' ========== Step 5: Write Order Item ID to Spreadsheet ==========
    ' If a row number was provided, write the order_item ID to column AA (column 27)
    If rowNumber > 0 Then
        On Error Resume Next
        Set deliveryWS = ThisWorkbook.Sheets("DELIVERY SCHEDULE")
        If Not deliveryWS Is Nothing Then
            ' Disable events temporarily to prevent Worksheet_Change from triggering
            Application.EnableEvents = False
            deliveryWS.Cells(rowNumber, 27).Value = CLng(orderItemId)
            Application.EnableEvents = True
            Debug.Print "Order Item ID " & orderItemId & " written to DELIVERY SCHEDULE row " & rowNumber & " column AA"
        End If
        On Error GoTo 0
    End If

    ' ========== Step 6: Complete ==========
    ' Note: DELIVERY SCHEDULE update and hyperlink are handled by AddNextNewRecord/EMT, not here
    ' This function only handles database operations (cascading inserts)

    ' NOTE: Do NOT close database here - let the caller manage the connection
    ' This allows AddHyperlink, AddNewJobToDB to share the same connection
    ' and be called sequentially without repeated initialization
    
    Debug.Print "Order item created successfully! Order Item ID: " & orderItemId

    Exit Sub

HandleError:
    MsgBox "Error: " & Err.Description, vbCritical
    ' NOTE: Do NOT close database here either - let the caller handle cleanup
End Sub

' Find existing customer or create new one
' Parameters: customerName - Name of the customer
' Returns: Customer ID, or Null on failure
Function FindOrCreateCustomer(customerName As String) As Variant
    Dim results As Variant
    Dim insertSQL As String

    ' Try to find existing customer
    results = mod_SQLite.ExecuteQuery("SELECT id FROM customer WHERE customer_name = '" & Replace(customerName, "'", "''") & "' LIMIT 1")

    If Not IsNull(results) Then
        ' Customer exists
        FindOrCreateCustomer = results(0)(0)
        Exit Function
    End If

    ' Customer doesn't exist, create new one
    insertSQL = "INSERT INTO customer (customer_name, usage_count, created_at, updated_at) " & _
                "VALUES ('" & Replace(customerName, "'", "''") & "', 1, datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            FindOrCreateCustomer = results(0)(0)
        End If
    End If
End Function

' Find existing customer contact or create new one
' Parameters: customerId - Customer ID
'             contactName - Contact person name
' Returns: Contact ID, or Null on failure
Function FindOrCreateCustomerContact(customerId As Long, contactName As String) As Variant
    Dim results As Variant
    Dim insertSQL As String

    ' Try to find existing contact for this customer
    results = mod_SQLite.ExecuteQuery("SELECT id FROM customer_contact " & _
                                      "WHERE customer_id = " & customerId & " " & _
                                      "AND contact_name = '" & Replace(contactName, "'", "''") & "' LIMIT 1")

    If Not IsNull(results) Then
        ' Contact exists
        FindOrCreateCustomerContact = results(0)(0)
        Exit Function
    End If

    ' Contact doesn't exist, create new one
    insertSQL = "INSERT INTO customer_contact (customer_id, contact_name, usage_count, created_at, updated_at) " & _
                "VALUES (" & customerId & ", '" & Replace(contactName, "'", "''") & "', 1, datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            FindOrCreateCustomerContact = results(0)(0)
        End If
    End If
End Function

' Find existing purchase order or create new one
' Parameters: poNumber - PO number
'             oeNumber - OE number
'             contactId - Customer contact ID
' Returns: Purchase Order ID, or Null on failure
Function FindOrCreatePurchaseOrder(poNumber As String, oeNumber As String, contactId As Long) As Variant
    Dim results As Variant
    Dim insertSQL As String

    ' Try to find existing PO
    results = mod_SQLite.ExecuteQuery("SELECT id FROM purchase_order WHERE po_number = '" & Replace(poNumber, "'", "''") & "' LIMIT 1")

    If Not IsNull(results) Then
        ' PO exists
        FindOrCreatePurchaseOrder = results(0)(0)
        Exit Function
    End If

    ' PO doesn't exist, create new one
    insertSQL = "INSERT INTO purchase_order (po_number, oe_number, contact_id, is_active, created_at, updated_at) " & _
                "VALUES ('" & Replace(poNumber, "'", "''") & "', '" & Replace(oeNumber, "'", "''") & "', " & contactId & ", 1, datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            FindOrCreatePurchaseOrder = results(0)(0)
        End If
    End If
End Function

' Find existing job or create new one
' Parameters: jobNumber - Job number
'             poId - Purchase Order ID
' Returns: Job ID, or Null on failure
Function FindOrCreateJob(jobNumber As String, poId As Long) As Variant
    Dim results As Variant
    Dim insertSQL As String

    ' Try to find existing job
    results = mod_SQLite.ExecuteQuery("SELECT id FROM job WHERE job_number = '" & Replace(jobNumber, "'", "''") & "' LIMIT 1")

    If Not IsNull(results) Then
        ' Job exists
        FindOrCreateJob = results(0)(0)
        Exit Function
    End If

    ' Job doesn't exist, create new one
    insertSQL = "INSERT INTO job (job_number, po_id, priority, created_at, updated_at) " & _
                "VALUES ('" & Replace(jobNumber, "'", "''") & "', " & poId & ", 'Normal', datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            FindOrCreateJob = results(0)(0)
        End If
    End If
End Function

' Find existing part or create new one
' Parameters: drawingNumber - Drawing/Part number
'             revision - Part revision
' Returns: Part ID, or Null on failure
Function FindOrCreatePart(drawingNumber As String, revision As String) As Variant
    Dim results As Variant
    Dim insertSQL As String

    ' Try to find existing part with matching drawing_number and revision
    results = mod_SQLite.ExecuteQuery("SELECT id FROM part " & _
                                      "WHERE drawing_number = '" & Replace(drawingNumber, "'", "''") & "' " & _
                                      "AND revision = '" & Replace(revision, "'", "''") & "' LIMIT 1")

    If Not IsNull(results) Then
        ' Part exists
        FindOrCreatePart = results(0)(0)
        Exit Function
    End If

    ' Part doesn't exist, create new one
    insertSQL = "INSERT INTO part (drawing_number, revision, created_at, updated_at) " & _
                "VALUES ('" & Replace(drawingNumber, "'", "''") & "', '" & Replace(revision, "'", "''") & "', datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            FindOrCreatePart = results(0)(0)
        End If
    End If
End Function

' Create a new order item entry
' Parameters: jobId - Job ID
'             partId - Part ID (can be Null)
'             lineNumber - Line number within the job
'             quantity - Order quantity
'             actualPrice - Unit price
'             deliveryRequiredDate - Delivery deadline
' Returns: Order Item ID, or Null on failure
Function CreateOrderItem(jobId As Long, partId As Variant, lineNumber As String, quantity As String, _
                         actualPrice As String, deliveryRequiredDate As String) As Variant
    Dim insertSQL As String
    Dim results As Variant
    Dim partIdClause As String

    ' Handle optional partId
    If IsNull(partId) Or partId = "" Then
        partIdClause = "NULL"
    Else
        partIdClause = CLng(partId)
    End If

    ' Convert price and quantity to numeric values
    Dim qtyValue As Long, priceValue As Double
    qtyValue = IIf(quantity = "", 0, CLng(quantity))
    priceValue = IIf(actualPrice = "", 0, CDbl(actualPrice))

    ' Create order item
    insertSQL = "INSERT INTO order_item (job_id, part_id, line_number, quantity, actual_price, delivery_required_date, status, created_at, updated_at) " & _
                "VALUES (" & jobId & ", " & partIdClause & ", '" & Replace(lineNumber, "'", "''") & "', " & qtyValue & ", " & priceValue & ", " & _
                "'" & Replace(deliveryRequiredDate, "'", "''") & "', 'PENDING', datetime('now', 'localtime'), datetime('now', 'localtime'))"

    If mod_SQLite.ExecuteNonQuery(insertSQL) Then
        ' Return last inserted ID
        results = mod_SQLite.ExecuteQuery("SELECT last_insert_rowid()")
        If Not IsNull(results) Then
            CreateOrderItem = results(0)(0)
        End If
    End If
End Function

' Convert date format from YYYY.M.D, YYYY/M/D, or YYYY-M-D to YYYY-MM-DD
' Handles various input formats and ensures consistent database format
Function FormatDateForDatabase(dateStr As String) As String
    Dim parts() As String
    Dim year As String, month As String, day As String
    
    If Trim(dateStr) = "" Then
        FormatDateForDatabase = ""
        Exit Function
    End If
    
    ' Replace dots and slashes with hyphens for consistency
    ' Handles: 2026.1.25, 2026/1/25, 2026-1-25
    dateStr = Replace(dateStr, ".", "-")
    dateStr = Replace(dateStr, "/", "-")
    
    ' Split by hyphen
    parts = Split(dateStr, "-")
    
    If UBound(parts) < 2 Then
        ' Invalid format, return as-is
        FormatDateForDatabase = dateStr
        Exit Function
    End If
    
    year = Trim(parts(0))
    month = Trim(parts(1))
    day = Trim(parts(2))
    
    ' Pad month and day with leading zeros if needed
    month = Right("0" & month, 2)
    day = Right("0" & day, 2)
    
    FormatDateForDatabase = year & "-" & month & "-" & day
End Function




