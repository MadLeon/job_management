'/**
' * mod_DrawingFileLink.bas
' *
' * Module Functionality:
' *   - Handle Link button click event
' *   - Update database based on user selection
' *   - Manage part_id mapping
' *   - Display success/error messages
' *   - Copy picture confirmation
' *
' * Key Functions:
' *   - LinkDrawingFile_Main() - Main handler for Link button
' *   - UpdateDrawingFileAsActive() - Set selected file as is_active=1
' *   - UpdateDrawingFileInactive() - Set other files as is_active=0
' *   - UpdatePartIdMapping() - Link part_id to drawing files
' *   - CopyConfirmationPicture() - Copy picture from data sheet
' */

Option Explicit

'/**
' * Main handler for Link button
' *
' * Workflow:
' *   1. Get user selection from displayed results
' *   2. Get the drawing_file record ID from the selection
' *   3. Update is_active: selected=1, others=0
' *   4. Update part_id if we found a part match
' *   5. Display success message in T8
' *   6. Copy confirmation picture from data sheet
' *
' * Called by: Fetch button handler or Link button click
' */
Public Sub LinkDrawingFile_Main()
    Dim ws As Worksheet
    Dim selectedIndex As Long
    Dim selectedResult As Variant
    Dim partId As Variant
    Dim drawingNumber As String
    Dim poNumber As String
    Dim resultCount As Long
    Dim i As Long
    Dim messageText As String
    
    On Error GoTo ErrorHandler
    
    ' Initialize log block for this operation
    StartLogBlock
    
    Set ws = ActiveSheet
    
    ' Get values from cells
    drawingNumber = ws.Range("J7").Value
    poNumber = ws.Range("B7").Value
    
    LogDebug "LinkDrawingFile_Main started - Drawing: " & drawingNumber & ", PO: " & poNumber
    
    ' Check if user selected a result
    If Not HasStoredResults() Then
        messageText = "No results to link. Please click Fetch first."
        ws.Range("T8").Value = messageText
        LogError messageText
        MsgBox messageText, vbExclamation, "Link Error"
        Exit Sub
    End If
    
    ' Get selected result index from module variable (from last Fetch call)
    ' Assumption: the first result (index 0) is automatically selected
    ' User can click on a different row to change selection
    selectedIndex = 0  ' Default to best match
    
    ' Get the selected result
    selectedResult = GetStoredResult(selectedIndex)
    
    If selectedResult(0) = 0 Then
        messageText = "Invalid selection. Please try again."
        ws.Range("T8").Value = messageText
        LogError messageText
        MsgBox messageText, vbExclamation, "Link Error"
        FlushLogBlock
        Exit Sub
    End If
    
    resultCount = GetStoredResultsCount()
    
    ' Update database
    LogDebug "Updating drawing_file records: setting id=" & selectedResult(0) & " to is_active=1"
    
    ' 1. Set selected file as active
    If Not UpdateDrawingFileAsActive(CLng(selectedResult(0))) Then
        messageText = "Failed to update database. Please check database connection."
        ws.Range("T8").Value = messageText
        LogError messageText
        MessageBox messageText, vbExclamation, "Database Error"
        FlushLogBlock
        Exit Sub
    End If
    
    ' 2. Set other files as inactive
    Dim lastResults As Variant
    lastResults = GetAllStoredResults()
    If IsArray(lastResults) Then
        For i = 0 To UBound(lastResults, 1)
            If lastResults(i, 0) <> selectedResult(0) Then
                Call UpdateDrawingFileInactive(CLng(lastResults(i, 0)))
            End If
        Next i
    End If
    
    ' 3. Update part_id mapping if part was found
    partId = m_lastPartId  ' Global variable set by Fetch handler
    If Not IsNull(partId) And partId <> "" Then
        Call UpdatePartIdToSelected(partId, resultCount)
    End If
    
    ' 4. Display success message with result count
    messageText = "Link successful! (" & resultCount & " results processed)"
    ws.Range("T8").Value = messageText
    LogInfo messageText
    
    ' 5. Copy confirmation picture from data sheet
    Call CopyConfirmationPicture
    
    ' Show success message
    MsgBox "Drawing file linked successfully!", vbInformation, "Success"
    
    LogDebug "LinkDrawingFile_Main completed successfully"
    FlushLogBlock
    Exit Sub
    
ErrorHandler:
    messageText = "Error: " & Err.Description
    ws.Range("T8").Value = messageText
    LogError "Error in LinkDrawingFile_Main: " & Err.Description
    FlushLogBlock
    MsgBox messageText, vbExclamation, "Error"
End Sub

'/**
' * Update a drawing_file record to is_active=1
' *
' * Parameters:
' *   - drawingFileId: The drawing_file.id to update
' *
' * Returns:
' *   - True if successful, False otherwise
' */
Private Function UpdateDrawingFileAsActive(drawingFileId As Long) As Boolean
    Dim dbPath As String
    Dim sql As String
    Dim result As Long
    
    On Error GoTo ErrorHandler
    
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite
    If Not InitializeSQLite(dbPath) Then
        LogError "Failed to initialize SQLite in UpdateDrawingFileAsActive"
        UpdateDrawingFileAsActive = False
        Exit Function
    End If
    
    ' Update SQL
    sql = "UPDATE drawing_file SET is_active = 1 WHERE id = " & drawingFileId
    
    result = ExecuteUpdate(sql)
    If result > 0 Then
        LogDebug "Updated drawing_file id=" & drawingFileId & " to is_active=1"
        UpdateDrawingFileAsActive = True
    Else
        LogError "Failed to update drawing_file id=" & drawingFileId
        UpdateDrawingFileAsActive = False
    End If
    
    Exit Function
ErrorHandler:
    LogError "Error in UpdateDrawingFileAsActive: " & Err.Description
    UpdateDrawingFileAsActive = False
End Function

'/**
' * Update a drawing_file record to is_active=0
' *
' * Parameters:
' *   - drawingFileId: The drawing_file.id to update
' *
' * Returns:
' *   - True if successful, False otherwise
' */
Private Function UpdateDrawingFileInactive(drawingFileId As Long) As Boolean
    Dim dbPath As String
    Dim sql As String
    Dim result As Long
    
    On Error GoTo ErrorHandler
    
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite
    If Not InitializeSQLite(dbPath) Then
        LogError "Failed to initialize SQLite in UpdateDrawingFileInactive"
        UpdateDrawingFileInactive = False
        Exit Function
    End If
    
    ' Update SQL
    sql = "UPDATE drawing_file SET is_active = 0 WHERE id = " & drawingFileId
    
    result = ExecuteUpdate(sql)
    If result > 0 Then
        LogDebug "Updated drawing_file id=" & drawingFileId & " to is_active=0"
        UpdateDrawingFileInactive = True
    Else
        LogDebug "No rows affected for drawing_file id=" & drawingFileId
        UpdateDrawingFileInactive = True  ' Don't fail if no rows affected
    End If
    
    Exit Function
ErrorHandler:
    LogError "Error in UpdateDrawingFileInactive: " & Err.Description
    UpdateDrawingFileInactive = False
End Function

'/**
' * Update part_id for drawing files that have NULL part_id
' * Only updates records that are in the displayed results list
' *
' * Parameters:
' *   - partId: The part.id to assign
' *   - resultCount: Number of results displayed (for logging)
' *
' * Returns:
' *   - True if successful, False otherwise
' */
Private Function UpdatePartIdToSelected(partId As Variant, resultCount As Long) As Boolean
    Dim dbPath As String
    Dim sql As String
    Dim result As Long
    Dim i As Long
    Dim updateCount As Long
    
    On Error GoTo ErrorHandler
    
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite
    If Not InitializeSQLite(dbPath) Then
        LogError "Failed to initialize SQLite in UpdatePartIdToSelected"
        UpdatePartIdToSelected = False
        Exit Function
    End If
    
    ' Update part_id for all results that have NULL part_id
    Dim localResults As Variant
    localResults = GetAllStoredResults()
    If IsArray(localResults) Then
        For i = 0 To UBound(localResults, 1)
            ' Column 1 is part_id, Column 0 is id
            If IsNull(localResults(i, 1)) Or CStr(localResults(i, 1)) = "" Then
                sql = "UPDATE drawing_file SET part_id = " & partId & " WHERE id = " & CLng(localResults(i, 0))
                result = ExecuteUpdate(sql)
                If result > 0 Then
                    updateCount = updateCount + 1
                    LogDebug "Updated drawing_file id=" & CLng(localResults(i, 0)) & " part_id=" & partId
                End If
            End If
        Next i
    End If
    
    If updateCount > 0 Then
        LogInfo "Updated part_id for " & updateCount & " drawing files"
    End If
    
    UpdatePartIdToSelected = True
    Exit Function
    
ErrorHandler:
    LogError "Error in UpdatePartIdToSelected: " & Err.Description
    UpdatePartIdToSelected = False
End Function

'/**
' * Copy Picture 1 from data sheet to Sheet1 cell S7
' * This serves as visual confirmation of successful link
' */
Private Sub CopyConfirmationPicture()
    Dim dataSheet As Worksheet
    Dim thisSheet As Worksheet
    Dim picture As Shape
    Dim pictureFound As Boolean
    
    On Error GoTo ErrorHandler
    
    Set thisSheet = ActiveSheet
    
    ' Try to find "data" sheet variant names
    pictureFound = False
    On Error Resume Next
    Set dataSheet = ThisWorkbook.Sheets("data")
    If dataSheet Is Nothing Then
        Set dataSheet = ThisWorkbook.Sheets("Data")
    End If
    If dataSheet Is Nothing Then
        Set dataSheet = ThisWorkbook.Sheets("DATA")
    End If
    On Error GoTo ErrorHandler
    
    If dataSheet Is Nothing Then
        LogDebug "Data sheet not found. Picture copy skipped."
        Exit Sub
    End If
    
    ' Find Picture 1 in data sheet
    For Each picture In dataSheet.Shapes
        If picture.Name = "Picture 1" Or picture.Type = msoPicture Then
            ' Found picture, copy to Sheet1 S7
            picture.Copy
            thisSheet.Range("S7").Select
            thisSheet.Paste
            pictureFound = True
            LogDebug "Copied Picture 1 from data sheet to S7"
            Exit For
        End If
    Next picture
    
    If Not pictureFound Then
        LogDebug "Picture 1 not found in data sheet"
    End If
    
    Exit Sub
ErrorHandler:
    LogDebug "Error in CopyConfirmationPicture: " & Err.Description
End Sub



