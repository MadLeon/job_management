' mod_CreateHyperlinks.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Provide functions to create hyperlinks based on drawing numbers in record.db
'   - Three-phase matching: Exact Match → Fuzzy Match → PO Number Verification
'   - Provide API to add hyperlinks when creating new job entries
' -------------------------------------------------------------------------------------------------
' Implementation Notes:
' 1. Database: Uses new schema (record.db) with part and drawing_file tables
' 2. Three-Phase Matching Strategy:
'    Phase 1: Exact Match - Query part by drawing_number, then find active drawing_file
'    Phase 2: Fuzzy Match - Search drawing_file by file_name or file_path containing drawing_number
'    Phase 3: PO Verification - If multiple results, prioritize ones containing PO number
' 3. Returns latest modified file if multiple matches after all filters applied
' -------------------------------------------------------------------------------------------------
Option Explicit

' Uses DB_PATH from mod_PublicData for database connection

' Find drawing file path using three-phase matching strategy
' Parameters: drawingNumber - The drawing number to search for
'             poNumber - Optional PO number for secondary verification
' Returns: File path string if found, empty string otherwise
Function FindDrawingFile(drawingNumber As String, poNumber As String) As String
    Dim filePath As String, partId As Variant, results As Variant

    filePath = ""

    If drawingNumber = "" Then
        Debug.Print "Drawing number is empty."
        FindDrawingFile = ""
        Exit Function
    End If

    ' ========== PHASE 1: Exact Match - Query part by drawing_number ==========
    partId = mod_SQLite.ExecuteQuery("SELECT id FROM part WHERE drawing_number = '" & Replace(drawingNumber, "'", "''") & "' LIMIT 1")

    If Not IsNull(partId) Then
        ' Found part_id, now query drawing_file
        Dim partIdValue As Long
        partIdValue = CLng(partId(0)(0))

        ' Try to find file with part_id (active files only)
        results = mod_SQLite.ExecuteQuery("SELECT file_path FROM drawing_file WHERE part_id = " & partIdValue & " AND is_active = 1 LIMIT 1")

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

    FindDrawingFile = filePath
End Function

' Perform fuzzy matching for drawing file
' Parameters: drawingNumber - The drawing number to search for
'             poNumber - Optional PO number for verification
' Returns: File path string if found, empty string otherwise
'
' Matching Rules:
' 1. If exactly one active file found, return it
' 2. If multiple results, check if any file_path contains po_number
'    - If match found, return latest modified one
' 3. Otherwise, return latest modified file overall
Function FuzzyMatchDrawingFile(drawingNumber As String, poNumber As String) As String
    Dim results As Variant, i As Long
    Dim activeCount As Long, hasMatch As Boolean
    Dim latestTime As String, selectedFile As String
    
    ' Query drawing_file with fuzzy match on file_name and file_path
    results = mod_SQLite.ExecuteQuery("SELECT file_path, is_active, last_modified_at FROM drawing_file " & _
                                      "WHERE file_name LIKE '%" & Replace(drawingNumber, "'", "''") & "%' " & _
                                      "OR file_path LIKE '%" & Replace(drawingNumber, "'", "''") & "%' " & _
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

' Add hyperlink to a single cell in DELIVERY SCHEDULE sheet
' Parameters: row - Row number where the drawing number is located (column E)
'
' NOTE: Assumes database is already initialized by the caller
' Does NOT initialize or close the database connection
' Called by AddNextNewRecord/EMT when creating new job entry
Sub AddHyperlink(row As Long)
    Dim drawingNumber As String, filePath As String, poNumber As String
    Dim cell As Range, hyp As Hyperlink
    Dim deliveryWS As Worksheet

    On Error Resume Next
    Set deliveryWS = ThisWorkbook.Sheets("DELIVERY SCHEDULE")
    On Error GoTo 0

    If deliveryWS Is Nothing Then
        Debug.Print "Worksheet 'DELIVERY SCHEDULE' not found."
        Exit Sub
    End If

    Set cell = deliveryWS.Cells(row, 5) ' Column E: Drawing Number
    drawingNumber = Trim(cell.Value)
    poNumber = Trim(deliveryWS.Cells(row, 12).Value) ' Column L: PO Number

    If drawingNumber = "" Then
        Debug.Print "Drawing number is empty at row " & row
        Exit Sub
    End If

    ' Check if cell already has hyperlink
    On Error Resume Next
    Set hyp = cell.Worksheet.Hyperlinks(cell.Address)
    On Error GoTo 0

    If Not hyp Is Nothing Then
        ' Already hyperlinked, skip
        Debug.Print "Cell at row " & row & " already has hyperlink."
        Exit Sub
    End If

    ' Find drawing file path
    filePath = FindDrawingFile(drawingNumber, poNumber)

    ' Only add hyperlink if file was found
    If filePath = "" Then
        Debug.Print "No drawing file found for " & drawingNumber & " at row " & row
        Exit Sub
    End If

    ' Add hyperlink with the found file path
    On Error Resume Next
    cell.Worksheet.Hyperlinks.Add Anchor:=cell, Address:=filePath, TextToDisplay:=drawingNumber
    On Error GoTo 0

    ' Set font style
    With cell.Font
        .Name = "Cambria"
        .Size = 12
    End With

    Debug.Print "Hyperlink added for drawing " & drawingNumber & " at row " & row
End Sub

' Create hyperlinks for selected cells in column E of DELIVERY SCHEDULE
'
' Workflow:
' 1. Get selection and filter for column E cells (drawing numbers)
' 2. Initialize database connection
' 3. For each cell, attempt to create hyperlink using three-phase matching
' 4. Report results
Sub CreateHyperlinks()
    ' Creates hyperlinks for selected cells in column E
    Dim curBook As Workbook, curWS As Worksheet
    Dim selectedRange As Range, cell As Range
    Dim eCells As Collection
    Dim c As Variant
    Dim drawingNumber As String, poNumber As String, filePath As String
    Dim successCount As Long, totalCount As Long
    Dim hyp As Hyperlink

    ' 1. Initialize workbook and worksheet
    Set curBook = ThisWorkbook
    On Error Resume Next
    Set curWS = curBook.Sheets("DELIVERY SCHEDULE")
    If curWS Is Nothing Then
        MsgBox "Worksheet 'DELIVERY SCHEDULE' not found!", vbCritical
        Exit Sub
    End If
    On Error GoTo 0

    ' 2. Initialize SQLite connection
    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    ' 3. Get selected range and collect column E cells
    Set selectedRange = Selection
    Set eCells = New Collection

    For Each cell In selectedRange
        If cell.Column = 5 And cell.Row > 1 Then ' Column E and skip header
            eCells.Add cell
        End If
    Next cell

    ' 4. Process each selected cell
    totalCount = eCells.Count
    successCount = 0

    For Each c In eCells
        Set cell = c
        drawingNumber = Trim(cell.Value)
        poNumber = Trim(curWS.Cells(cell.Row, 12).Value) ' Column L: PO Number

        If drawingNumber <> "" Then
            ' Check if cell already has hyperlink
            On Error Resume Next
            Set hyp = cell.Worksheet.Hyperlinks(cell.Address)
            On Error GoTo 0

            If hyp Is Nothing Then
                ' Cell doesn't have hyperlink, try to create one
                filePath = FindDrawingFile(drawingNumber, poNumber)

                If filePath <> "" Then
                    On Error Resume Next
                    cell.Worksheet.Hyperlinks.Add Anchor:=cell, Address:=filePath, TextToDisplay:=drawingNumber
                    On Error GoTo 0

                    ' Set font style
                    With cell.Font
                        .Name = "Cambria"
                        .Size = 12
                    End With

                    successCount = successCount + 1
                End If
            End If
        End If
    Next c

    ' 5. Clean up
    mod_SQLite.CloseSQLite
    Set eCells = Nothing

    ' 6. Show result message
    If successCount > 0 Then
        Debug.Print "Hyperlinks created successfully! (" & successCount & " of " & totalCount & " cells)", vbInformation
    Else
        Debug.Print "No hyperlinks were created. (0 of " & totalCount & " cells)", vbExclamation
    End If
End Sub
