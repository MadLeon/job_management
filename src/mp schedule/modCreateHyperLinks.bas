Option Explicit

' --- Configuration Variables ---
Const DB_PATH As String = "\\rtdnas2\OE\record.db"

Function CreateSingleHyperlink(cell As Range) As Boolean
    ' Adds hyperlink to single cell by querying new database schema
    ' Returns True if hyperlink was created, False otherwise
    Dim drawingNumber As String, filePath As String, poNumber As String
    Dim partId As Variant, results As Variant
    Dim i As Long, activeCount As Long, selectedFile As String
    Dim hasMatch As Boolean, latestTime As String
    Dim hyp As Hyperlink

    CreateSingleHyperlink = False ' Default return value
    drawingNumber = Trim(cell.Value)
    poNumber = Trim(cell.Worksheet.Cells(cell.row, 4).Value) ' Column D is PO Number

    If drawingNumber = "" Then
        Exit Function
    End If

    ' Check if cell already has hyperlink
    On Error Resume Next
    Set hyp = cell.Worksheet.Hyperlinks(cell.Address)
    On Error GoTo 0

    If Not hyp Is Nothing Then
        ' Already hyperlinked, skip
        Exit Function
    End If

    filePath = ""

    ' ========== PHASE 1: Exact Match - Query part by drawing_number ==========
    partId = modSQLite.ExecuteSQL("SELECT id FROM part WHERE drawing_number = '" & drawingNumber & "' LIMIT 1")

    If Not IsNull(partId) Then
        ' Found part_id, now query drawing_file
        Dim partIdValue As Long
        partIdValue = CLng(partId(0)(0))

        ' Try to find file with part_id (active files only)
        results = modSQLite.ExecuteSQL("SELECT file_path FROM drawing_file WHERE part_id = " & partIdValue & " AND is_active = 1 LIMIT 1")

        If Not IsNull(results) Then
            ' Best case: exact match found
            filePath = Trim(results(0)(0))
        Else
            ' part_id found but no active file, enter fuzzy matching
            filePath = FuzzyMatchDrawingFile(drawingNumber, poNumber)
        End If
    Else
        ' No part_id found, enter fuzzy matching
        filePath = FuzzyMatchDrawingFile(drawingNumber, poNumber)
    End If

    ' ========== Add Hyperlink if File Found ==========
    If filePath <> "" Then
        On Error Resume Next
        cell.Worksheet.Hyperlinks.Add Anchor:=cell, Address:=filePath, TextToDisplay:=drawingNumber
        On Error GoTo 0

        ' Set font style
        With cell.Font
            .Name = "Cambria"
            .Size = 16
        End With
        
        CreateSingleHyperlink = True
    End If
End Function

Function FuzzyMatchDrawingFile(drawingNumber As String, poNumber As String) As String
    ' Performs fuzzy matching in drawing_file table
    ' Returns file_path if found, empty string otherwise
    
    Dim results As Variant, i As Long, j As Long
    Dim activeCount As Long, hasMatch As Boolean
    Dim latestTime As String, selectedFile As String
    
    ' Query drawing_file with fuzzy match
    results = modSQLite.ExecuteSQL("SELECT file_path, is_active, last_modified_at FROM drawing_file " & _
                                   "WHERE file_name LIKE '%" & drawingNumber & "%' OR file_path LIKE '%" & drawingNumber & "%' " & _
                                   "ORDER BY last_modified_at DESC")
    
    If IsNull(results) Then
        ' No results found
        FuzzyMatchDrawingFile = ""
        Exit Function
    End If
    
    If UBound(results) < 0 Then
        ' No results found
        FuzzyMatchDrawingFile = ""
        Exit Function
    End If
    
    ' Count results with is_active = 1
    activeCount = 0
    For i = 0 To UBound(results)
        If CLng(results(i)(1)) = 1 Then
            activeCount = activeCount + 1
        End If
    Next i
    
    ' ========== Rule 1: Exactly one active file ==========
    If activeCount = 1 Then
        For i = 0 To UBound(results)
            If CLng(results(i)(1)) = 1 Then
                FuzzyMatchDrawingFile = Trim(results(i)(0))
                Exit Function
            End If
        Next i
    End If
    
    ' ========== Rule 2: Multiple active files or no active files ==========
    ' Check if any file_path contains po_number
    latestTime = ""
    selectedFile = ""
    hasMatch = False
    
    For i = 0 To UBound(results)
        Dim currentPath As String, currentTime As String
        currentPath = Trim(results(i)(0))
        currentTime = Trim(results(i)(2))
        
        ' Check if file_path contains po_number
        If poNumber <> "" And InStr(1, currentPath, poNumber, vbTextCompare) > 0 Then
            hasMatch = True
            If latestTime = "" Or currentTime > latestTime Then
                latestTime = currentTime
                selectedFile = currentPath
            End If
        End If
    Next i
    
    ' If found matches with po_number, return the latest one
    If hasMatch Then
        FuzzyMatchDrawingFile = selectedFile
        Exit Function
    End If
    
    ' If no po_number match, return the latest by last_modified_at
    If UBound(results) >= 0 Then
        FuzzyMatchDrawingFile = Trim(results(0)(0)) ' Already ordered by last_modified_at DESC
    End If
End Function


Sub CreateHyperlinks()
    ' Creates hyperlinks for selected cells in column E without caching
    Dim curBook As Workbook, curWS As Worksheet
    Dim selectedRange As Range, cell As Range
    Dim eCells As Collection
    Dim c As Variant
    Dim successCount As Long, totalCount As Long

    ' 1. Initialize workbook and worksheet
    Set curBook = ThisWorkbook
    On Error Resume Next
    Set curWS = curBook.Sheets("Priority Sheet")
    If curWS Is Nothing Then
        MsgBox "Worksheet 'Priority Sheet' not found!", vbCritical
        Exit Sub
    End If
    On Error GoTo 0

    ' 2. Initialize SQLite connection
    If Not modSQLite.InitializeSQLite(DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    ' 3. Get selected range and collect column E cells
    Set selectedRange = Selection
    Set eCells = New Collection

    For Each cell In selectedRange
        If cell.Column = 5 And cell.row > 1 Then ' Column E and skip header
            eCells.Add cell
        End If
    Next cell

    ' 4. Process each selected cell and count success
    totalCount = eCells.Count
    successCount = 0
    
    For Each c In eCells
        Set cell = c
        If CreateSingleHyperlink(cell) Then
            successCount = successCount + 1
        End If
    Next c

    ' 5. Clean up
    modSQLite.CloseSQLite
    Set eCells = Nothing
    
    ' 6. Show result message only if at least one hyperlink was created
    If successCount > 0 Then
        MsgBox "Hyperlinks created successfully! (" & successCount & " of " & totalCount & " cells)", vbInformation
    Else
        MsgBox "No hyperlinks were created. (0 of " & totalCount & " cells)", vbExclamation
    End If
End Sub



