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
                    If IsNull(jobCheckResult) Then
                        Debug.Print "  -> ERROR: Job not found - Query returned null for OE:" & oeNumber & ", Job:" & jobNumber
                        mod_SQLite.CloseSQLite
                        GoTo Cleanup
                    End If
                    
                    ' Check array bounds
                    On Error Resume Next
                    If UBound(jobCheckResult, 1) < 0 Then
                        Debug.Print "  -> ERROR: Job not found - Empty result set for OE:" & oeNumber & ", Job:" & jobNumber
                        mod_SQLite.CloseSQLite
                        On Error GoTo ErrorHandler
                        GoTo Cleanup
                    End If
                    On Error GoTo ErrorHandler
                    
                    ' Extract job ID from result
                    On Error Resume Next
                    foundJobId = CLng(jobCheckResult(0, 0))
                    On Error GoTo ErrorHandler
                    
                    If foundJobId = 0 Then
                        Debug.Print "  -> ERROR: Job not found - Invalid job ID for OE:" & oeNumber & ", Job:" & jobNumber
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
                    
                    If Not IsNull(updatedCount) And CLng(updatedCount(0)(0)) > 0 Then
                        Debug.Print "  -> SUCCESS: Updated " & CLng(updatedCount(0)(0)) & " row(s). Drawing_release_date for OE:" & oeNumber & ", Job:" & jobNumber & " set to " & formattedDate
                    Else
                        Debug.Print "  -> ERROR: Update failed or no matching order_item found with delivery_required_date = " & formattedDeliveryDate
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
        Else
            Debug.Print "  -> Skipped: Not column H (column " & changedCell.Column & ")"
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