Option Explicit

' Worksheet Change Event Handler for DELIVERY SCHEDULE sheet
' Monitors changes in column H (od - order discharge date) and updates database
' When H column value changes, updates the corresponding order_item.drawing_release_date
Private Sub Worksheet_Change(ByVal Target As Range)
    Dim changedCell As Range
    Dim oeNumber As String, dateValue As String
    Dim formattedDate As String
    Dim jobId As Variant, success As Boolean
    
    ' Print that event was triggered
    Debug.Print "=== Worksheet_Change Event Triggered ==="
    Debug.Print "Target cells count: " & Target.Cells.Count
    Debug.Print "Target address: " & Target.Address
    
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Check if change is in column H (column 8)
    For Each changedCell In Target
        Debug.Print "Processing cell: " & changedCell.Address & ", Column: " & changedCell.Column & ", Row: " & changedCell.Row & ", Value: " & changedCell.Value
        
        If changedCell.Column = 8 Then
            Debug.Print "  -> Cell is in column H (column 8)"
            
            ' Get the row number and validate it's a data row
            If changedCell.Row > 1 Then
                Debug.Print "  -> Row > 1, processing..."
                
                ' Get OE number from column A of the same row
                oeNumber = Trim(Me.Cells(changedCell.Row, 1).Value)
                Debug.Print "  -> OE Number from column A: " & IIf(oeNumber = "", "(empty)", oeNumber)
                
                ' Get Job number from column B of the same row
                Dim jobNumber As String
                jobNumber = Trim(Me.Cells(changedCell.Row, 2).Value)
                Debug.Print "  -> Job Number from column B: " & IIf(jobNumber = "", "(empty)", jobNumber)
                
                ' Get Delivery required date from column P (column 16) of the same row
                Dim deliveryRequiredDate As String
                deliveryRequiredDate = Trim(Me.Cells(changedCell.Row, 16).Value)
                Debug.Print "  -> Delivery Required Date from column P: " & IIf(deliveryRequiredDate = "", "(empty)", deliveryRequiredDate)
                
                ' Get the date value from column H (drawing_release_date)
                dateValue = Trim(changedCell.Value)
                Debug.Print "  -> Drawing Release Date from column H: " & IIf(dateValue = "", "(empty)", dateValue)
                
                ' Only process if all required fields exist
                If oeNumber <> "" And jobNumber <> "" And deliveryRequiredDate <> "" And dateValue <> "" Then
                    Debug.Print "  -> All required fields exist, processing..."
                    
                    ' Format the date from YYYY.M.D to YYYY-MM-DD
                    formattedDate = FormatDateForDatabase(dateValue)
                    Dim formattedDeliveryDate As String
                    formattedDeliveryDate = FormatDateForDatabase(deliveryRequiredDate)
                    Debug.Print "  -> Formatted drawing_release_date: " & formattedDate
                    Debug.Print "  -> Formatted delivery_required_date: " & formattedDeliveryDate
                    
                    ' Initialize database
                    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
                        Debug.Print "  -> ERROR: Failed to initialize database for date update"
                        GoTo Cleanup
                    End If
                    
                    Debug.Print "  -> Database initialized successfully"
                    
                    ' First, check if job exists with the given OE and Job number
                    Dim jobCheckSQL As String
                    jobCheckSQL = "SELECT job.id FROM job " & _
                                  "INNER JOIN purchase_order ON job.po_id = purchase_order.id " & _
                                  "WHERE purchase_order.oe_number = '" & Replace(oeNumber, "'", "''") & "' " & _
                                  "AND job.job_number = '" & Replace(jobNumber, "'", "''") & "'"
                    
                    Debug.Print "  -> Checking if job exists: " & jobCheckSQL
                    Dim jobCheckResult As Variant
                    jobCheckResult = mod_SQLite.ExecuteQuery(jobCheckSQL)
                    
                    ' Safely check if result exists
                    Dim foundJobId As Long
                    foundJobId = 0
                    
                    If IsNull(jobCheckResult) Then
                        Debug.Print "  -> ERROR: Job not found - Query returned null for OE:" & oeNumber & ", Job:" & jobNumber
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    ' Check array bounds - ExecuteQuery returns array of arrays: results(rowIndex)(colIndex)
                    On Error Resume Next
                    Dim rowCount As Long
                    rowCount = UBound(jobCheckResult) - LBound(jobCheckResult) + 1
                    On Error GoTo 0
                    
                    If rowCount <= 0 Then
                        Debug.Print "  -> ERROR: Job not found - Empty result set for OE:" & oeNumber & ", Job:" & jobNumber & " (rows=" & rowCount & ")"
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    ' Extract job ID from first row, first column
                    ' Note: jobCheckResult is array of arrays, not 2D array
                    ' Access as: jobCheckResult(rowIndex)(colIndex)
                    On Error Resume Next
                    Dim firstValue As Variant
                    Dim firstRow As Variant
                    firstRow = jobCheckResult(LBound(jobCheckResult))
                    firstValue = firstRow(LBound(firstRow))
                    If firstValue <> "" And Not IsNull(firstValue) Then
                        foundJobId = CLng(firstValue)
                    End If
                    On Error GoTo ErrorHandler
                    
                    Debug.Print "  -> Extracted Job ID: " & foundJobId & " from result"
                    
                    If foundJobId = 0 Then
                        Debug.Print "  -> ERROR: Job not found - Could not extract valid job ID for OE:" & oeNumber & ", Job:" & jobNumber & ", firstValue=" & firstValue
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    Debug.Print "  -> Job found! Job ID: " & foundJobId
                    
                    ' Update order_item using OE number, Job number, and Delivery required date as filters
                    Dim updateSQL As String
                    updateSQL = "UPDATE order_item " & _
                                "SET drawing_release_date = '" & formattedDate & "', " & _
                                "    updated_at = datetime('now', 'localtime') " & _
                                "WHERE job_id = " & foundJobId & " " & _
                                "AND delivery_required_date = '" & formattedDeliveryDate & "'"
                    
                    Debug.Print "  -> Executing update: " & updateSQL
                    success = mod_SQLite.ExecuteNonQuery(updateSQL)
                    
                    ' Check if any rows were actually updated
                    Dim checkUpdatedSQL As String
                    checkUpdatedSQL = "SELECT COUNT(*) FROM order_item WHERE job_id = " & foundJobId & " AND drawing_release_date = '" & formattedDate & "'"
                    Dim updatedCount As Variant
                    updatedCount = mod_SQLite.ExecuteQuery(checkUpdatedSQL)
                    
                    If Not IsNull(updatedCount) Then
                        ' updatedCount is array of arrays: updatedCount(rowIndex)(colIndex)
                        Dim updatedCountValue As Long
                        On Error Resume Next
                        updatedCountValue = CLng(updatedCount(LBound(updatedCount))(LBound(updatedCount(LBound(updatedCount)))))
                        On Error GoTo ErrorHandler
                        
                        If updatedCountValue > 0 Then
                            Debug.Print "  -> SUCCESS: Updated " & updatedCountValue & " row(s). Drawing_release_date for OE:" & oeNumber & ", Job:" & jobNumber & " set to " & formattedDate
                        Else
                            Debug.Print "  -> ERROR: Update failed or no matching order_item found with delivery_required_date = " & formattedDeliveryDate
                        End If
                    Else
                        Debug.Print "  -> ERROR: Could not verify update - query returned null"
                    End If
                    
                    ' Close database
                    Debug.Print "  -> Closing database..."
                    mod_SQLite.CloseSQLite
                Else
                    Debug.Print "  -> Skipped: Missing required fields (OE, JobNum, DeliveryDate, or DrawingReleaseDate)"
                End If
            Else
                Debug.Print "  -> Skipped: Row <= 1 (header row)"
            End If
        ElseIf changedCell.Column = 12 Then
            Debug.Print "  -> Cell is in column L (column 12)"
            
            ' Get the row number and validate it's a data row
            If changedCell.Row > 1 Then
                Debug.Print "  -> Row > 1, processing..."
                
                ' Get order_item ID from column AA (column 27) of the same row
                Dim orderItemId As String
                orderItemId = Trim(Me.Cells(changedCell.Row, 27).Value)
                Debug.Print "  -> Order Item ID from column AA: " & IIf(orderItemId = "", "(empty)", orderItemId)
                
                ' Get the PO number from column L
                Dim poNumber As String
                poNumber = Trim(changedCell.Value)
                Debug.Print "  -> PO Number from column L: " & IIf(poNumber = "", "(empty)", poNumber)
                
                ' Normalize the PO number
                Dim normalizedPoNumber As String
                normalizedPoNumber = NormalizePO(poNumber)
                Debug.Print "  -> Normalized PO Number: " & normalizedPoNumber
                
                ' Only process if both required fields exist
                If orderItemId <> "" And normalizedPoNumber <> "" Then
                    Debug.Print "  -> All required fields exist, processing..."
                    
                    ' Initialize database
                    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
                        Debug.Print "  -> ERROR: Failed to initialize database for PO update"
                        GoTo Cleanup
                    End If
                    
                    Debug.Print "  -> Database initialized successfully"
                    
                    ' First, get the PO ID by joining order_item -> job -> purchase_order
                    Dim getPOIdSQL As String
                    getPOIdSQL = "SELECT job.po_id FROM order_item " & _
                                 "INNER JOIN job ON order_item.job_id = job.id " & _
                                 "WHERE order_item.id = " & orderItemId
                    
                    Debug.Print "  -> Getting PO ID: " & getPOIdSQL
                    Dim getPOIdResult As Variant
                    getPOIdResult = mod_SQLite.ExecuteQuery(getPOIdSQL)
                    
                    Dim foundPoId As Long
                    foundPoId = 0
                    
                    If Not IsNull(getPOIdResult) Then
                        On Error Resume Next
                        Dim poIdRow As Variant
                        poIdRow = getPOIdResult(LBound(getPOIdResult))
                        Dim poIdValue As Variant
                        poIdValue = poIdRow(LBound(poIdRow))
                        If poIdValue <> "" And Not IsNull(poIdValue) Then
                            foundPoId = CLng(poIdValue)
                        End If
                        On Error GoTo ErrorHandler
                        
                        Debug.Print "  -> Found PO ID: " & foundPoId
                    Else
                        Debug.Print "  -> ERROR: Could not find PO ID for order_item ID " & orderItemId
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    If foundPoId = 0 Then
                        Debug.Print "  -> ERROR: Invalid PO ID extracted for order_item ID " & orderItemId
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    ' Update purchase_order using the found PO ID with normalized PO number
                    Dim updatePOSQL As String
                    updatePOSQL = "UPDATE purchase_order " & _
                                  "SET po_number = '" & Replace(normalizedPoNumber, "'", "''") & "', " & _
                                  "    updated_at = datetime('now', 'localtime') " & _
                                  "WHERE id = " & foundPoId
                    
                    Debug.Print "  -> Executing update: " & updatePOSQL
                    Dim poSuccess As Boolean
                    poSuccess = mod_SQLite.ExecuteNonQuery(updatePOSQL)
                    
                    ' Verify the update
                    Dim checkPOSQL As String
                    checkPOSQL = "SELECT po_number FROM purchase_order WHERE id = " & foundPoId
                    Dim poCheckResult As Variant
                    poCheckResult = mod_SQLite.ExecuteQuery(checkPOSQL)
                    
                    If Not IsNull(poCheckResult) Then
                        Dim poCheckValue As String
                        On Error Resume Next
                        Dim poCheckRow As Variant
                        poCheckRow = poCheckResult(LBound(poCheckResult))
                        poCheckValue = poCheckRow(LBound(poCheckRow))
                        On Error GoTo ErrorHandler
                        
                        If poCheckValue = normalizedPoNumber Then
                            Debug.Print "  -> SUCCESS: Updated PO ID " & foundPoId & " po_number to " & normalizedPoNumber
                        Else
                            Debug.Print "  -> ERROR: Update verification failed. Expected: " & normalizedPoNumber & ", Got: " & poCheckValue
                        End If
                    Else
                        Debug.Print "  -> ERROR: Could not verify PO update - query returned null"
                    End If
                    
                    ' Close database
                    Debug.Print "  -> Closing database..."
                    mod_SQLite.CloseSQLite
                Else
                    Debug.Print "  -> Skipped: Missing required fields (Order Item ID or PO Number)"
                End If
            Else
                Debug.Print "  -> Skipped: Row <= 1 (header row)"
            End If
        Else
            Debug.Print "  -> Skipped: Not column H or L (column " & changedCell.Column & ")"
        End If
    Next changedCell

Cleanup:
    Debug.Print "=== Worksheet_Change Event Complete ==="
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    Exit Sub

ErrorHandler:
    Debug.Print "ERROR in Worksheet_Change: " & Err.Description & " (Error " & Err.Number & ")"
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

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

/**
 * Normalize PO number
 * Steps:
 * 1. Remove all spaces
 * 2. Convert to uppercase
 * 3. Simplify REV. to R.
 * 4. Ensure - before R.
 * 5. Convert -RN to -R.N (single digit)
 * 6. Remove leading zeros from R.0N → R.N
 * 7. Remove spaces around -
 */
Function NormalizePO(poNumber As String) As String
    Dim normalized As String
    Dim result As String
    Dim i As Long, j As Long
    Dim tempStr As String
    
    normalized = Trim(poNumber)
    
    ' Step 1: Remove all spaces
    normalized = Replace(normalized, " ", "")
    
    ' Step 2: Convert to uppercase
    normalized = UCase(normalized)
    
    ' Step 3: Simplify REV. to R.
    normalized = Replace(normalized, "REV.", "R.")
    
    ' Step 4: Ensure - before R. (if R. preceded by letter/digit but no -)
    result = ""
    i = 1
    Do While i <= Len(normalized)
        If i < Len(normalized) - 1 Then
            If Mid(normalized, i, 2) = "R." Then
                If i > 1 Then
                    Dim prevChar As String
                    prevChar = Mid(normalized, i - 1, 1)
                    If (prevChar >= "A" And prevChar <= "Z") Or (prevChar >= "0" And prevChar <= "9") Then
                        If prevChar <> "-" Then
                            result = result & "-"
                        End If
                    End If
                End If
            End If
        End If
        result = result & Mid(normalized, i, 1)
        i = i + 1
    Loop
    normalized = result
    
    ' Step 5: Convert -RN to -R.N (single digit only)
    result = ""
    i = 1
    Do While i <= Len(normalized)
        If i <= Len(normalized) - 1 Then
            If Mid(normalized, i, 2) = "-R" Then
                If i + 2 <= Len(normalized) Then
                    Dim nextChar As String
                    nextChar = Mid(normalized, i + 2, 1)
                    ' Check if next char is single digit and NOT followed by another digit
                    If nextChar >= "0" And nextChar <= "9" Then
                        If i + 3 > Len(normalized) Or Not (Mid(normalized, i + 3, 1) >= "0" And Mid(normalized, i + 3, 1) <= "9") Then
                            result = result & "-R." & nextChar
                            i = i + 3
                            GoTo NextIteration
                        End If
                    End If
                End If
            End If
        End If
        result = result & Mid(normalized, i, 1)
        i = i + 1
NextIteration:
    Loop
    normalized = result
    
    ' Step 6: Remove leading zeros from R.0N → R.N
    normalized = Replace(normalized, "R.0", "R.")
    
    ' Step 7: Remove spaces around -
    normalized = Replace(normalized, " -", "-")
    normalized = Replace(normalized, "- ", "-")
    
    NormalizePO = normalized
End Function