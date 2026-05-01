' /**
'  * Sheet1 Event Handlers & Row Number Update Logic
'  * 
'  * Functionality:
'  * 1. Row number updates (column E based on column D & F content)
'  * 2. U9 content updates (description text based on D column selection)
'  * 3. Worksheet_Change event monitoring for D11:D39
'  */

' ============================================================================
' PUBLIC FUNCTIONS
' ============================================================================

' /**
'  * Update row numbers from D11:D39
'  * Only assigns row numbers to rows where D column has a valid dropdown option
'  * Allows gaps (rows without valid D values will not get row numbers)
'  * Algorithm:
'  * - Iterate D11:D39, maintain counter starting at 0
'  * - For each row: check if D has a valid option (P/FI/RT/SC/I/H/W/PI)
'  * - If valid: increment counter by 10, assign to E
'  * - If invalid: skip (clear E)
'  */
Public Sub update_row_number()
    Dim ws As Worksheet
    Dim counter As Integer
    Dim i As Integer
    Dim dValue As String
    Dim validOptions As Variant
    Dim isValid As Boolean
    Dim j As Integer
    
    Set ws = ThisWorkbook.Sheets("mp")
    counter = 0
    
    ' Define valid options for D column dropdown
    validOptions = Array("P", "FI", "RT", "SC", "I", "H", "W", "PI")
    
    ' Iterate through rows 11 to 39
    For i = 11 To 39
        dValue = ws.Range("D" & i).value
        isValid = False
        
        ' Check if D value is in valid options
        For j = LBound(validOptions) To UBound(validOptions)
            If dValue = validOptions(j) Then
                isValid = True
                Exit For
            End If
        Next j
        
        ' If D has valid value, increment counter and assign to E
        If isValid Then
            counter = counter + 10
            ws.Range("E" & i).value = counter
        Else
            ' Clear E if D doesn't have valid value
            ws.Range("E" & i).value = ""
        End If
    Next i
    
End Sub

' /**
'  * Update U9 content based on D column selection in a specific row
'  * Maps code values to their descriptions using global code mappings
'  * @param rowNum - The row number to read D column value from
'  */
Public Sub update_u9_content(rowNum As Integer)
    Dim ws As Worksheet
    Dim dValue As String
    Dim u9Value As String
    
    Set ws = ThisWorkbook.Sheets("mp")
    
    ' Get value from D column of the modified row
    dValue = Trim(ws.Range("D" & rowNum).value)
    
    ' Map code to description using global function
    If dValue <> "" Then
        u9Value = GetCodeDescription(dValue)
        If u9Value <> "" Then
            ws.Range("U9").value = u9Value
            ' Trigger W9 dropdown update after U9 change
            Call mod_DisplayDropdowns.OnU9Changed(u9Value)
        End If
    End If
    
End Sub

' ============================================================================
' EVENT HANDLERS
' ============================================================================

' /**
' * Worksheet_Change event handler
' * Monitors:
' * 1. D11:D39 range for changes (triggers row number and U9 content updates)
' * 2. U9 cell for changes (triggers W9 dropdown update)
' * 3. W9 cell for changes (triggers display area update)
' */
Private Sub Worksheet_Change(ByVal Target As Range)
    Dim ws As Worksheet
    Dim monitorRange As Range
    Dim changedRange As Range
    
    Set ws = ThisWorkbook.Sheets("mp")
    
    ' Disable events to prevent recursive calls
    Application.EnableEvents = False
    
    On Error GoTo ErrorHandler
    
    ' Monitor D11:D39 for changes
    Set monitorRange = ws.Range("D11:D39")
    Set changedRange = Intersect(Target, monitorRange)
    
    If Not changedRange Is Nothing Then
        Call update_row_number
        Call update_u9_content(Target.Row)
    End If
    
    ' Monitor U9 for changes
    If Not Intersect(Target, ws.Range("U9")) Is Nothing Then
        If Target.Cells.Count = 1 Then
            Call mod_DisplayDropdowns.OnU9Changed(Target.value)
        End If
    End If
    
    ' Monitor W9 for changes
    If Not Intersect(Target, ws.Range("W9")) Is Nothing Then
        If Target.Cells.Count = 1 Then
            Call mod_DisplayProcesses.OnW9Changed(Target.value)
        End If
    End If
    
    Application.EnableEvents = True
    Exit Sub
    
ErrorHandler:
    Application.EnableEvents = True
    Call lib_logger.StartLogBlock
    Call lib_logger.LogError("Worksheet_Change error: " & Err.Description)
    Call lib_logger.FlushLogBlock
End Sub


