Option Explicit

' hlp_updateOrderItemID.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Helper module to update order_item IDs in DELIVERY SCHEDULE
'   - Scans all rows in DELIVERY SCHEDULE and fills column AA with corresponding order_item IDs
'   - Uses OE number, Job number, and Delivery required date to locate order_item records
' -------------------------------------------------------------------------------------------------

' Main function: Update all order_item IDs for every row in DELIVERY SCHEDULE
' Iterates through all data rows (starting from row 2), finds matching order_item records,
' and fills column AA (column 27) with the order_item ID
Sub UpdateOrderItemIDsForAllEntries()
    Dim deliveryWS As Worksheet
    Dim lastRow As Long
    Dim rowNum As Long
    Dim oeNumber As String, jobNumber As String, deliveryDate As String
    Dim orderItemID As Variant
    Dim successCount As Long, failureCount As Long, skipCount As Long
    
    On Error GoTo ErrorHandler
    
    ' Initialize
    Set deliveryWS = ThisWorkbook.Sheets("DELIVERY SCHEDULE")
    lastRow = deliveryWS.Cells(deliveryWS.Rows.Count, 1).End(xlUp).Row
    successCount = 0
    failureCount = 0
    skipCount = 0
    
    Debug.Print "====================================="
    Debug.Print "UpdateOrderItemIDsForAllEntries Started"
    Debug.Print "====================================="
    Debug.Print "Total rows to process: " & (lastRow - 1)
    Debug.Print ""
    
    ' Initialize database once at the beginning
    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If
    
    ' Iterate through all data rows (starting from row 2, skipping header)
    For rowNum = 2 To lastRow
        Debug.Print "Processing row " & rowNum & "..."
        
        ' Get the three key fields from the current row
        oeNumber = Trim(deliveryWS.Cells(rowNum, 1).Value)      ' Column A: OE
        jobNumber = Trim(deliveryWS.Cells(rowNum, 2).Value)     ' Column B: Job Number
        deliveryDate = Trim(deliveryWS.Cells(rowNum, 16).Value) ' Column P: Delivery Required Date
        
        Debug.Print "  OE: " & IIf(oeNumber = "", "(empty)", oeNumber)
        Debug.Print "  JobNum: " & IIf(jobNumber = "", "(empty)", jobNumber)
        Debug.Print "  DeliveryDate: " & IIf(deliveryDate = "", "(empty)", deliveryDate)
        
        ' Skip rows with missing critical fields
        If oeNumber = "" Or jobNumber = "" Or deliveryDate = "" Then
            Debug.Print "  -> SKIPPED: Missing required fields"
            skipCount = skipCount + 1
            Debug.Print ""
            GoTo NextRow
        End If
        
        ' Find the matching order_item ID from database
        orderItemID = FindOrderItemID(oeNumber, jobNumber, deliveryDate)
        
        If IsNull(orderItemID) Then
            Debug.Print "  -> FAILED: Order item not found in database"
            failureCount = failureCount + 1
        Else
            ' Update column AA with the order_item ID
            Call UpdateOrderItemIDForRow(rowNum, orderItemID)
            Debug.Print "  -> SUCCESS: Order Item ID " & orderItemID & " written to column AA"
            successCount = successCount + 1
        End If
        
        Debug.Print ""
        
NextRow:
    Next rowNum
    
    ' Close database connection
    mod_SQLite.CloseSQLite
    
    ' Summary
    Debug.Print "====================================="
    Debug.Print "UpdateOrderItemIDsForAllEntries Complete"
    Debug.Print "====================================="
    Debug.Print "Success: " & successCount
    Debug.Print "Failed: " & failureCount
    Debug.Print "Skipped: " & skipCount
    Debug.Print "Total: " & (lastRow - 1)
    Debug.Print "====================================="
    
    MsgBox "Update complete!" & vbCrLf & _
           "Success: " & successCount & vbCrLf & _
           "Failed: " & failureCount & vbCrLf & _
           "Skipped: " & skipCount, vbInformation
    
    Exit Sub

ErrorHandler:
    Debug.Print "ERROR in UpdateOrderItemIDsForAllEntries: " & Err.Description
    MsgBox "Error: " & Err.Description, vbCritical
    mod_SQLite.CloseSQLite
End Sub

' Find order_item ID for a given OE number, Job number, and Delivery date
' Parameters:
'   oeNumber - OE number from DELIVERY SCHEDULE column A
'   jobNumber - Job number from DELIVERY SCHEDULE column B
'   deliveryDate - Delivery required date from DELIVERY SCHEDULE column P (format: 2026/1/24 or similar)
' Returns:
'   Order item ID if found, Null otherwise
Function FindOrderItemID(oeNumber As String, jobNumber As String, deliveryDate As String) As Variant
    Dim querySQL As String
    Dim results As Variant
    Dim formattedDate As String
    
    ' Format the delivery date for database query
    formattedDate = FormatDateForQuery(deliveryDate)
    Debug.Print "  Formatted date for query: " & formattedDate
    
    ' Build SQL query: Find order_item using OE number, Job number, and Delivery required date
    ' The query joins with job and purchase_order tables to match the criteria
    querySQL = "SELECT order_item.id " & _
               "FROM order_item " & _
               "INNER JOIN job ON order_item.job_id = job.id " & _
               "INNER JOIN purchase_order ON job.po_id = purchase_order.id " & _
               "WHERE purchase_order.oe_number = '" & Replace(oeNumber, "'", "''") & "' " & _
               "AND job.job_number = '" & Replace(jobNumber, "'", "''") & "' " & _
               "AND order_item.delivery_required_date = '" & formattedDate & "' " & _
               "LIMIT 1"
    
    Debug.Print "  Query: " & querySQL
    
    ' Execute query
    results = mod_SQLite.ExecuteQuery(querySQL)
    
    ' Return result if found
    If Not IsNull(results) Then
        On Error Resume Next
        FindOrderItemID = CLng(results(0, 0))
        On Error GoTo 0
    End If
End Function

' Update a single row's column AA with the order_item ID
' Parameters:
'   rowNum - Row number in DELIVERY SCHEDULE
'   orderItemID - The order_item ID to write
Sub UpdateOrderItemIDForRow(rowNum As Long, orderItemID As Variant)
    Dim deliveryWS As Worksheet
    
    On Error Resume Next
    Set deliveryWS = ThisWorkbook.Sheets("DELIVERY SCHEDULE")
    
    If Not deliveryWS Is Nothing Then
        ' Temporarily disable events to prevent Worksheet_Change from triggering
        Application.EnableEvents = False
        deliveryWS.Cells(rowNum, 27).Value = CLng(orderItemID)
        Application.EnableEvents = True
        Debug.Print "  Updated DELIVERY SCHEDULE row " & rowNum & " column AA with ID: " & orderItemID
    End If
    On Error GoTo 0
End Sub

' Convert date format from various formats (2026/1/24, 2026.1.24, 2026-1-24) to database format (2026-01-24)
' Parameters:
'   dateStr - Date string in various formats
' Returns:
'   Formatted date string in YYYY-MM-DD format
Function FormatDateForQuery(dateStr As String) As String
    Dim parts() As String
    Dim year As String, month As String, day As String
    
    If Trim(dateStr) = "" Then
        FormatDateForQuery = ""
        Exit Function
    End If
    
    ' Replace dots and slashes with hyphens for consistency
    dateStr = Replace(dateStr, ".", "-")
    dateStr = Replace(dateStr, "/", "-")
    
    ' Split by hyphen
    parts = Split(dateStr, "-")
    
    If UBound(parts) < 2 Then
        ' Invalid format, return as-is
        FormatDateForQuery = dateStr
        Exit Function
    End If
    
    year = Trim(parts(0))
    month = Trim(parts(1))
    day = Trim(parts(2))
    
    ' Pad month and day with leading zeros if needed
    month = Right("0" & month, 2)
    day = Right("0" & day, 2)
    
    FormatDateForQuery = year & "-" & month & "-" & day
End Function
