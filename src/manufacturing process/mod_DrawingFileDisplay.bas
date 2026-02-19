'/**
' * mod_DrawingFileDisplay.bas
' * 
' * Module Functionality:
' *   - Display query results in Excel (columns W, X, and Y)
' *   - Create radio button symbols in column W (☐/☑ text symbols)
' *   - Create hyperlinks in column X
' *   - Display file paths in column Y
' *   - Set default selection for best match
' * 
' * Key Functions:
' *   - ClearResults() - Clear previous results from columns W, X, and Y
' *   - DisplayQueryResults() - Show results with radio symbols, hyperlinks, and paths
' *   - GetSelectedResultIndex() - Get user's selected result index (by clicking W column)
' */

Option Explicit

Private Const RESULTS_START_ROW As Long = 2
Private Const RESULTS_COL As String = "W"
Private Const MAX_DISPLAY_ROWS As Long = 8

'/**
' * Clear all previous results from columns W, X, and Y
' * This is called before displaying new results
' */
Public Sub ClearResults()
    Dim ws As Worksheet
    Dim clearRange As Range
    Dim i As Long
    
    On Error GoTo ErrorHandler
    
    Set ws = ActiveSheet
    
    ' Clear W column (radio button text symbols)
    Set clearRange = ws.Range("W" & RESULTS_START_ROW & ":W" & RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1)
    clearRange.ClearContents
    clearRange.ClearFormats
    
    ' Clear X column (hyperlinks)
    Set clearRange = ws.Range("X" & RESULTS_START_ROW & ":X" & RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1)
    clearRange.ClearContents
    clearRange.ClearFormats
    
    ' Clear Y column (file paths)
    Set clearRange = ws.Range("Y" & RESULTS_START_ROW & ":Y" & RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1)
    clearRange.ClearContents
    clearRange.ClearFormats
    
    ' Remove hyperlinks from X column
    For i = RESULTS_START_ROW To RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1
        On Error Resume Next
        ws.Hyperlinks("X" & i).Delete
        On Error GoTo ErrorHandler
    Next i
    
    ' Clear legacy column (Z) and beyond if they have old data
    Set clearRange = ws.Range("Z" & RESULTS_START_ROW & ":AB" & RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1)
    clearRange.ClearContents
    clearRange.ClearFormats
    
    LogDebug "Cleared results from columns W, X, Y"
    
    Exit Sub
ErrorHandler:
    LogError "Error in ClearResults: " & Err.Description
End Sub

'/**
' * Display query results with radio button symbols, hyperlinks, and file paths
' * 
' * Layout:
' *   Column W: Radio button text symbol (☑ = checked/selected, ☐ = unchecked/unselected)
' *   Column X: Hyperlink with format "N. cleaned_filename" pointing to file_path
' *   Column Y: File path with format "File Path: xxx" (no text wrap)
' * 
' * Parameters:
' *   - resultsArray: Variant array from QueryDrawingFiles()
' *   - bestMatchIndex: Index of the recommended result (shows ☑ by default)
' */
Public Sub DisplayQueryResults(resultsArray As Variant, bestMatchIndex As Long)
    Dim ws As Worksheet
    Dim i As Long
    Dim rowNum As Long
    Dim displayText As String
    Dim cellRange As Range
    Dim filePathCell As Range
    Dim resultCount As Long
    Dim cleanFileName As String
    Dim filePath As String
    
    On Error GoTo ErrorHandler
    
    Set ws = ActiveSheet
    
    ' Check if results array is empty or not an array
    If Not IsArray(resultsArray) Then
        LogDebug "No results to display - resultsArray is not an array"
        Exit Sub
    End If
    
    resultCount = UBound(resultsArray, 1) + 1
    If resultCount = 0 Then
        LogDebug "No results to display"
        Exit Sub
    End If
    
    ' Auto-fit column widths for display
    ws.Columns("W").ColumnWidth = 5     ' Radio column (text symbols)
    ws.Columns("X").ColumnWidth = 30    ' Hyperlink column, medium
    ws.Columns("Y").ColumnWidth = 60    ' File path column, very wide
    
    ' Display each result
    For i = 0 To UBound(resultsArray, 1)
        rowNum = RESULTS_START_ROW + i
        
        ' Stop if exceeding max display rows (should not happen due to 8-result limit)
        If rowNum > RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1 Then Exit For
        
        ' Get file path for hyperlink
        filePath = CStr(resultsArray(i, 3))
        
        ' Clean filename: remove special characters and format as "N. filename"
        cleanFileName = CleanFileNameString(CStr(resultsArray(i, 2)))
        
        ' 1. Add radio button text symbol to W column
        Set cellRange = ws.Range("W" & rowNum)
        If i = bestMatchIndex Then
            cellRange.Value = "☑"  ' Checked box
            cellRange.Font.Bold = True
            cellRange.Interior.Color = RGB(255, 255, 200)  ' Light yellow background
        Else
            cellRange.Value = "☐"  ' Empty box
            cellRange.Interior.ColorIndex = xlNone
        End If
        cellRange.HorizontalAlignment = xlCenter
        cellRange.Font.Size = 16
        cellRange.Font.Name = "Segoe UI Symbol"  ' Better Unicode support
        cellRange.Tag = "RadioButton_" & i  ' Mark for event handling
        
        ' 2. Add hyperlink to X column with clean filename
        displayText = (i + 1) & ". " & cleanFileName
        Set filePathCell = ws.Range("X" & rowNum)
        
        ' Create hyperlink to the file
        On Error Resume Next
        ws.Hyperlinks.Add Anchor:=filePathCell, Address:=filePath, TextToDisplay:=displayText
        On Error GoTo ErrorHandler
        
        ' Format the hyperlink cell
        With filePathCell
            .WrapText = True
            .Font.Size = 10
            .Font.Name = "Calibri"
            .Font.Color = RGB(0, 0, 255)  ' Blue for hyperlink
            .Font.Underline = True
            .VerticalAlignment = xlTop
        End With
        
        ' 3. Add full file path to Y column
        Set filePathCell = ws.Range("Y" & rowNum)
        filePathCell.Value = "File Path: " & filePath
        With filePathCell
            .WrapText = False
            .Font.Size = 9
            .Font.Name = "Calibri"
            .VerticalAlignment = xlTop
        End With
        
        LogDebug "Displayed result " & (i + 1) & " at W" & rowNum & " (radio: " & IIf(i = bestMatchIndex, "☑", "☐") & "), X" & rowNum & " (hyperlink), Y" & rowNum & " (path): " & cleanFileName
    Next i
    
    Exit Sub
ErrorHandler:
    LogError "Error in DisplayQueryResults: " & Err.Description
End Sub

'/**
' * Clean filename by removing special characters
' * Converts "RT-88000-70097-045-1-DD-C.pdf" to "RT-88000-70097-045-1-DD-C"
' * 
' * Parameters:
' *   - rawName: Original filename
' * 
' * Returns:
' *   - Cleaned filename without extension and special chars
' */
Private Function CleanFileNameString(rawName As String) As String
    Dim cleaned As String
    Dim i As Long
    Dim char As String
    
    ' Remove file extension (.pdf, .dwg, etc.)
    If InStr(rawName, ".") > 0 Then
        cleaned = Left(rawName, InStr(rawName, ".") - 1)
    Else
        cleaned = rawName
    End If
    
    CleanFileNameString = cleaned
End Function

'/**
' * Get selected result index from user clicking W column radio button
' * User selects by clicking on a row in column W (radio button symbol ☐ or ☑)
' * This function finds which row is currently selected
' * 
' * Note: Currently detects selection from W column click, but logic for
' * updating radio button state when user clicks would be in Worksheet event handler
' * 
' * Returns:
' *   - Index of selected result (0-based)
' *   - -1 if no selection or error
' */
Public Function GetSelectedResultIndex() As Long
    Dim ws As Worksheet
    Dim selectedCell As Range
    Dim rowNum As Long
    Dim resultIndex As Long
    
    On Error GoTo ErrorHandler
    
    Set ws = ActiveSheet
    Set selectedCell = ws.Application.ActiveCell
    
    ' Check if selection is in results column
    If selectedCell.Column <> ws.Range(RESULTS_COL & "1").Column Then
        LogDebug "Selection is not in results column " & RESULTS_COL
        GetSelectedResultIndex = -1
        Exit Function
    End If
    
    ' Calculate result index from row number
    rowNum = selectedCell.Row
    If rowNum < RESULTS_START_ROW Or rowNum > RESULTS_START_ROW + MAX_DISPLAY_ROWS - 1 Then
        LogDebug "Selection row " & rowNum & " is outside results range"
        GetSelectedResultIndex = -1
        Exit Function
    End If
    
    resultIndex = rowNum - RESULTS_START_ROW
    LogDebug "Selected result index: " & resultIndex
    GetSelectedResultIndex = resultIndex
    
    Exit Function
ErrorHandler:
    LogError "Error in GetSelectedResultIndex: " & Err.Description
    GetSelectedResultIndex = -1
End Function

'/**
' * Get the drawing_file ID for a selected result
' * Used by Link button to update database
' * Retrieves from the stored result array in GlobalState
' * 
' * Returns:
' *   - drawing_file ID (from column index 0 of the result row)
' */
Public Function GetSelectedResultData(resultIndex As Long) As Variant
    On Error GoTo ErrorHandler
    
    ' Get from GlobalState where entire result array is stored
    Dim storedResult As Variant
    storedResult = GetStoredResult(resultIndex)
    
    If IsArray(storedResult) Then
        ' Column 0 is drawing_file.id
        GetSelectedResultData = storedResult(0)
    Else
        GetSelectedResultData = Null
    End If
    
    Exit Function
ErrorHandler:
    LogError "Error in GetSelectedResultData: " & Err.Description
    GetSelectedResultData = Null
End Function
