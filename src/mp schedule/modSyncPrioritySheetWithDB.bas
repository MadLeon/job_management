' modSyncPrioritySheetWithDB.bas
' Purpose: Synchronize Priority Sheet with record.db database
' Uses modSqlite.bas utilities for database operations

Option Explicit

' =============================================================================
' MAIN SYNC FUNCTION
' =============================================================================

' SyncPrioritySheetWithDB - Main synchronization function
' Steps:
'   1. Remove order items without ID from sheet
'   2. Remove order items not in database from sheet
'   3. Query database for new order items
'   4. Insert new rows into sheet
' Returns: Dictionary with operation summary (deletedRows, insertedRows)
Public Function SyncPrioritySheetWithDB() As Object
    Dim ws As Worksheet, summary As Object
    Set summary = CreateObject("Scripting.Dictionary")
    
    ' Get Priority Sheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Priority Sheet")
    If ws Is Nothing Then
        MsgBox "Priority Sheet not found": Exit Function
    End If
    On Error GoTo 0
    
    ' Step 1: Remove order items without order_item id (A column is empty)
    Debug.Print "========== SYNC PRIORITY SHEET WITH DB =========="
    Debug.Print "Step 1: Remove order items without order_item id..."
    Dim deletedRowsNoId As Long
    deletedRowsNoId = RemoveOrderItemsWithoutId(ws)
    Debug.Print "  Deleted rows (no id): " & deletedRowsNoId
    
    ' Step 2: Remove order items not in database
    Debug.Print "Step 2: Remove order items not in database..."
    Dim deletedRowsInvalid As Long
    deletedRowsInvalid = RemoveInvalidOrderItems(ws)
    Debug.Print "  Deleted rows (invalid): " & deletedRowsInvalid
    
    ' Step 3: Get new order items from database
    Debug.Print "Step 3: Query new order items from database..."
    Dim newOrderItems As Object
    Set newOrderItems = GetNewOrderItemsToAdd(ws)
    
    ' Step 4: Insert new rows
    Debug.Print "Step 4: Insert new order items..."
    Dim insertedRows As Long
    insertedRows = InsertNewOrderItemRows(ws, newOrderItems)
    Debug.Print "  Inserted rows: " & insertedRows
    Debug.Print "========== SYNC COMPLETED =========="
    
    ' Return summary
    summary("deletedRowsNoId") = deletedRowsNoId
    summary("deletedRowsInvalid") = deletedRowsInvalid
    summary("insertedRows") = insertedRows
    Set SyncPrioritySheetWithDB = summary
End Function

' =============================================================================
' REMOVAL FUNCTIONS
' =============================================================================

' RemoveOrderItemsWithoutId - Remove order item rows with empty order_item id
' Logic:
'   1. Identify order item rows (B column and subsequent columns have values)
'   2. If A column (order_item id) is empty, delete that row and all attached detail part rows
'   3. Detail part rows are identified by empty A, B, C columns
' Returns: Count of deleted rows
Private Function RemoveOrderItemsWithoutId(ws As Worksheet) As Long
    Dim lastRow As Long, r As Long
    Dim deletedCount As Long
    Dim orderItemIdValue As String
    Dim isOrderItemRow As Boolean
    
    lastRow = GetLastDataRow(ws)
    deletedCount = 0
    r = lastRow
    
    ' Iterate from bottom to top to avoid row shifting issues
    Do While r >= 2
        orderItemIdValue = Trim(ws.Cells(r, 1).Value)
        
        ' Check if this is an order item row
        ' Order item row: B (JOB #), C (PO #), D (Customer) columns have values
        isOrderItemRow = (Trim(ws.Cells(r, 2).Value) <> "" Or _
                         Trim(ws.Cells(r, 3).Value) <> "" Or _
                         Trim(ws.Cells(r, 4).Value) <> "")
        
        If isOrderItemRow And orderItemIdValue = "" Then
            ' This is an order item row with missing ID - delete it and all detail part rows below
            Dim partRowStart As Long, partRowEnd As Long
            partRowStart = r
            
            ' Find the next order item row or end of sheet
            partRowEnd = r
            Dim nextRow As Long
            nextRow = r + 1
            Do While nextRow <= lastRow
                ' Check if nextRow is an order item row (has value in B, C, or D column)
                If Trim(ws.Cells(nextRow, 2).Value) <> "" Or _
                   Trim(ws.Cells(nextRow, 3).Value) <> "" Or _
                   Trim(ws.Cells(nextRow, 4).Value) <> "" Then
                    partRowEnd = nextRow - 1
                    Exit Do
                End If
                nextRow = nextRow + 1
            Loop
            
            ' If we didn't find another order item row, delete to the last row
            If nextRow > lastRow Then
                partRowEnd = lastRow
            End If
            
            ' Delete the range (order item + attached detail part rows)
            Dim rowCount As Long
            rowCount = partRowEnd - partRowStart + 1
            ws.Rows(partRowStart & ":" & partRowEnd).Delete
            deletedCount = deletedCount + rowCount
            lastRow = lastRow - rowCount
            r = r - 1
        Else
            r = r - 1
        End If
    Loop
    
    RemoveOrderItemsWithoutId = deletedCount
End Function

' RemoveInvalidOrderItems - Remove order item rows not in database
' Logic:
'   1. Query database for all valid order_item IDs
'   2. Iterate through sheet from bottom to top
'   3. Delete rows with invalid order_item IDs
' Returns: Count of deleted rows
Private Function RemoveInvalidOrderItems(ws As Worksheet) As Long
    Dim dbPath As String
    Dim lastRow As Long, r As Long
    Dim orderItemId As String, sql As String
    Dim deletedCount As Long
    Dim validOrderIds As Object
    Dim results As Variant, idx As Long
    
    Set validOrderIds = CreateObject("Scripting.Dictionary")
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite
    If Not InitializeSQLite(dbPath) Then
        MsgBox "Unable to initialize database"
        Exit Function
    End If
    
    ' Get all valid order_item IDs from database
    sql = "SELECT id FROM order_item ORDER BY id"
    results = ExecuteSQL(sql)
    If Not IsNull(results) Then
        For idx = 0 To UBound(results)
            validOrderIds(CLng(results(idx)(0))) = True
        Next idx
    End If
    
    CloseSQLite
    
    ' Now iterate through sheet from bottom to top
    lastRow = GetLastDataRow(ws)
    r = lastRow
    
    Do While r >= 2
        orderItemId = Trim(ws.Cells(r, 1).Value)
        
        ' Check if this is an order item row
        ' Order item row: B (JOB #), C (PO #), D (Customer) columns have values
        Dim isOrderItemRow As Boolean
        isOrderItemRow = (Trim(ws.Cells(r, 2).Value) <> "" Or _
                         Trim(ws.Cells(r, 3).Value) <> "" Or _
                         Trim(ws.Cells(r, 4).Value) <> "")
        
        If isOrderItemRow And orderItemId <> "" Then
            ' This is an order item row with ID - check if it exists in database
            Dim orderId As Long
            On Error Resume Next
            orderId = CLng(orderItemId)
            On Error GoTo 0
            
            If orderId = 0 Or Not validOrderIds.Exists(orderId) Then
                ' Invalid order item - delete this and all part rows below
                Dim partRowStart As Long, partRowEnd As Long
                partRowStart = r
                
                ' Find the next order item row
                partRowEnd = r
                Dim nextRow As Long
                nextRow = r + 1
                Do While nextRow <= lastRow
                    ' Check if nextRow is an order item row
                    If Trim(ws.Cells(nextRow, 2).Value) <> "" Or _
                       Trim(ws.Cells(nextRow, 3).Value) <> "" Or _
                       Trim(ws.Cells(nextRow, 4).Value) <> "" Then
                        partRowEnd = nextRow - 1
                        Exit Do
                    End If
                    nextRow = nextRow + 1
                Loop
                
                ' If we didn't find another order item row, delete to the last row
                If nextRow > lastRow Then
                    partRowEnd = lastRow
                End If
                
                ' Delete the range
                Dim rowCount As Long
                rowCount = partRowEnd - partRowStart + 1
                ws.Rows(partRowStart & ":" & partRowEnd).Delete
                deletedCount = deletedCount + rowCount
                lastRow = lastRow - rowCount
                r = r - 1
            Else
                r = r - 1
            End If
        Else
            r = r - 1
        End If
    Loop
    
    RemoveInvalidOrderItems = deletedCount
End Function

' =============================================================================
' QUERY FUNCTION
' =============================================================================

' GetNewOrderItemsToAdd - Query database for new order items
' Logic:
'   1. Find the last order_item.id in the Priority Sheet
'   2. Query database for all order_item records with id > last value
'   3. Return results as Dictionary array
' Returns: Dictionary array of order item data
Private Function GetNewOrderItemsToAdd(ws As Worksheet) As Collection
    Dim dbPath As String
    Dim sql As String
    Dim lastOrderId As Long, r As Long, lastRow As Long
    Dim newOrderItems As Collection
    Dim results As Variant, idx As Long, resultIdx As Long
    Dim rowData As Object
    
    Set newOrderItems = New Collection
    
    ' Find last order_item ID in sheet
    lastOrderId = 0
    lastRow = GetLastDataRow(ws)
    For r = 2 To lastRow
        Dim cellVal As String
        cellVal = Trim(ws.Cells(r, 1).Value)
        
        ' Identify order item row: B, C, or D column has value
        Dim isOrderItemRow As Boolean
        isOrderItemRow = (Trim(ws.Cells(r, 2).Value) <> "" Or _
                         Trim(ws.Cells(r, 3).Value) <> "" Or _
                         Trim(ws.Cells(r, 4).Value) <> "")
        
        If isOrderItemRow And cellVal <> "" Then
            Dim orderId As Long
            On Error Resume Next
            orderId = CLng(cellVal)
            On Error GoTo 0
            
            If orderId > lastOrderId Then
                lastOrderId = orderId
            End If
        End If
    Next r
    
    Debug.Print "  *** Last order_item ID in Priority Sheet: " & lastOrderId & " ***"
    
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite
    If Not InitializeSQLite(dbPath) Then
        MsgBox "Unable to initialize database"
        Exit Function
    End If
    
    ' Query new order items
    sql = "SELECT " & _
          "oi.id, " & _
          "j.job_number, " & _
          "po.po_number, " & _
          "c.customer_name, " & _
          "p.description, " & _
          "p.drawing_number, " & _
          "oi.quantity, " & _
          "oi.delivery_required_date " & _
          "FROM order_item oi " & _
          "LEFT JOIN job j ON oi.job_id = j.id " & _
          "LEFT JOIN purchase_order po ON j.po_id = po.id " & _
          "LEFT JOIN customer c ON po.contact_id = c.id " & _
          "LEFT JOIN part p ON oi.part_id = p.id " & _
          "WHERE oi.id > " & lastOrderId & " " & _
          "ORDER BY oi.id"
    
    results = ExecuteSQL(sql)
    
    CloseSQLite
    
    If Not IsNull(results) Then
        For idx = 0 To UBound(results)
            Set rowData = CreateObject("Scripting.Dictionary")
            
            rowData("id") = CLng(results(idx)(0))
            
            ' Handle NULL values safely without converting NULL directly
            rowData("job_number") = ""
            If Not IsNull(results(idx)(1)) Then rowData("job_number") = CStr(results(idx)(1))
            
            rowData("po_number") = ""
            If Not IsNull(results(idx)(2)) Then rowData("po_number") = CStr(results(idx)(2))
            
            rowData("customer_name") = ""
            If Not IsNull(results(idx)(3)) Then rowData("customer_name") = CStr(results(idx)(3))
            
            rowData("description") = ""
            If Not IsNull(results(idx)(4)) Then rowData("description") = CStr(results(idx)(4))
            
            rowData("drawing_number") = ""
            If Not IsNull(results(idx)(5)) Then rowData("drawing_number") = CStr(results(idx)(5))
            
            rowData("quantity") = 0
            If Not IsNull(results(idx)(6)) Then rowData("quantity") = CLng(results(idx)(6))
            
            rowData("delivery_required_date") = ""
            If Not IsNull(results(idx)(7)) Then rowData("delivery_required_date") = CStr(results(idx)(7))
            
            newOrderItems.Add rowData
        Next idx
        
        Debug.Print "  *** Found " & newOrderItems.Count & " new order items to add ***"
    Else
        Debug.Print "  *** Found 0 new order items to add ***"
    End If
    
    Set GetNewOrderItemsToAdd = newOrderItems
End Function

' =============================================================================
' INSERT FUNCTION
' =============================================================================

' InsertNewOrderItemRows - Insert new order item rows into sheet
' Logic:
'   1. Add empty row after last data row
'   2. Insert order item rows with spacing rule
'   3. Spacing: one empty line between order items
' Parameters:
'   - ws: Worksheet to insert into
'   - newOrderItems: Dictionary of new order item data
' Returns: Count of inserted rows (including spacing)
Private Function InsertNewOrderItemRows(ws As Worksheet, newOrderItems As Collection) As Long
    Dim lastRow As Long, insertedCount As Long
    Dim idx As Long, rowToInsert As Long
    Dim rowData As Object
    
    lastRow = GetLastDataRow(ws)
    insertedCount = 0
    rowToInsert = lastRow + 1
    
    ' Check if we need to add initial spacing
    If lastRow >= 2 Then
        ' Add one empty row as spacing
        rowToInsert = rowToInsert + 1
        insertedCount = 1
    End If
    
    ' Insert each new order item
    For idx = 1 To newOrderItems.Count
        Set rowData = newOrderItems(idx)
        
        ' Fill in the columns A-H
        ws.Cells(rowToInsert, 1).Value = rowData("id")                         ' A: Order Item ID
        ws.Cells(rowToInsert, 2).Value = rowData("job_number")                 ' B: JOB #
        ws.Cells(rowToInsert, 3).Value = rowData("po_number")                  ' C: PO #
        ws.Cells(rowToInsert, 4).Value = rowData("customer_name")              ' D: Customer
        ws.Cells(rowToInsert, 5).Value = rowData("description")                ' E: Description
        ws.Cells(rowToInsert, 6).Value = rowData("drawing_number")             ' F: Part #
        ws.Cells(rowToInsert, 7).Value = rowData("quantity")                   ' G: Qty.
        ws.Cells(rowToInsert, 8).Value = rowData("delivery_required_date")     ' H: Ship Date
        
        insertedCount = insertedCount + 1
        rowToInsert = rowToInsert + 1
        
        ' Add spacing row (except after the last item)
        If idx < newOrderItems.Count Then
            rowToInsert = rowToInsert + 1
            insertedCount = insertedCount + 1
        End If
    Next idx
    
    InsertNewOrderItemRows = insertedCount
End Function

' =============================================================================
' HELPER FUNCTION
' =============================================================================

' GetLastDataRow - Get the last row with data in the worksheet
' Parameters:
'   - ws: Worksheet to check
' Returns: Row number of last data row
Function GetLastDataRow(ws As Worksheet) As Long
    ' Get the last row in columns A, D, E
    Dim lastRowA As Long, lastRowD As Long, lastRowE As Long
    
    lastRowA = ws.Cells(ws.rows.Count, "A").End(xlUp).row
    lastRowD = ws.Cells(ws.rows.Count, "D").End(xlUp).row
    lastRowE = ws.Cells(ws.rows.Count, "E").End(xlUp).row
    
    ' Compare D and E results
    Dim lastRowDE As Long
    If lastRowD >= lastRowE Then
        lastRowDE = lastRowD
    Else
        lastRowDE = lastRowE
    End If
    
    ' If D or E is greater than A, take the larger of D/E, otherwise A+1
    If lastRowDE > lastRowA Then
        GetLastDataRow = lastRowDE
    Else
        If lastRowA < 2 Then
            GetLastDataRow = 2
        Else
            GetLastDataRow = lastRowA + 1
        End If
    End If
End Function
