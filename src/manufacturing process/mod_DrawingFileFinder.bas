'/**
' * mod_DrawingFileFinder.bas
' * 
' * Module Functionality:
' *   - Search and query drawing files from database based on drawing number
' *   - Rank results by priority (is_active, PO match, last modified)
' *   - Return up to 8 most recent results
' * 
' * Key Functions:
' *   - QueryPartByDrawingNumber() - Find part record by drawing_number
' *   - QueryDrawingFiles() - Find all drawing files matching drawing_number
' *   - RankAndFilterResults() - Sort by priority, return top 8
' * 
' * Note: Returns Variant array (2D) to avoid VBA type coercion issues
' */

Option Explicit

'/**
' * Query part table for a given drawing number
' * 
' * Returns:
' *   - part_id if found (Long value)
' *   - Null if not found
' * 
' * Note: If multiple results exist, returns the first one
' */
Public Function QueryPartByDrawingNumber(drawingNumber As String) As Variant
    Dim ws As Worksheet
    Dim dbPath As String
    Dim sql As String
    Dim result As Variant
    Dim partId As Variant
    
    On Error GoTo ErrorHandler
    
    ' Get active sheet context
    Set ws = ActiveSheet
    
    ' Get database path
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite if not already initialized
    If Not InitializeSQLite(dbPath) Then
        LogError "Failed to initialize SQLite in QueryPartByDrawingNumber"
        QueryPartByDrawingNumber = Null
        Exit Function
    End If
    
    ' Query part table
    sql = "SELECT id FROM part WHERE drawing_number = '" & drawingNumber & "' LIMIT 1"
    
    result = ExecuteQuery(sql)
    If IsArray(result) Then
        If UBound(result) >= 0 Then
            partId = result(0, 0)
            LogDebug "Found part.id=" & partId & " for drawing_number=" & drawingNumber
            QueryPartByDrawingNumber = partId
        Else
            LogDebug "No part found for drawing_number=" & drawingNumber
            QueryPartByDrawingNumber = Null
        End If
    Else
        LogDebug "No part found for drawing_number=" & drawingNumber
        QueryPartByDrawingNumber = Null
    End If
    
    Exit Function
ErrorHandler:
    LogError "Error in QueryPartByDrawingNumber: " & Err.Description
    QueryPartByDrawingNumber = Null
End Function

'/**
' * Query drawing_file table for a given drawing number
' * Returns Variant array with up to 8 results (2D array: rows=results, columns=fields)
' * 
' * Query Logic:
' *   1. Find all records where file_name contains drawingNumber
' *   2. Rank by: is_active (desc), file_path contains PO (desc), last_modified_at (desc)
' *   3. Return top 8 results
' * 
' * Parameters:
' *   - drawingNumber: The drawing number to search for (from cell J7)
' *   - poNumber: The PO number to match in file_path (from cell B7)
' * 
' * Returns:
' *   - Array of results, empty array if none found
' */
Public Function QueryDrawingFiles(drawingNumber As String, poNumber As String) As Variant
    Dim ws As Worksheet
    Dim dbPath As String
    Dim sql As String
    Dim results As Variant
    Dim resultsArray As Variant
    Dim i As Long
    Dim resultCount As Long
    
    On Error GoTo ErrorHandler
    
    ' Get active sheet context
    Set ws = ActiveSheet
    
    ' Get database path
    dbPath = ThisWorkbook.Path & "\..\..\data\record.db"
    
    ' Initialize SQLite if not already initialized
    If Not InitializeSQLite(dbPath) Then
        LogError "Failed to initialize SQLite in QueryDrawingFiles"
        QueryDrawingFiles = resultsArray
        Exit Function
    End If
    
    ' Build SQL query with priority ranking
    ' Priority: is_active DESC, file_path LIKE poNumber DESC, last_modified_at DESC
    sql = "SELECT id, part_id, file_name, file_path, is_active, last_modified_at, revision " & _
          "FROM drawing_file " & _
          "WHERE file_name LIKE '%" & drawingNumber & "%' " & _
          "ORDER BY " & _
          "  is_active DESC, " & _
          "  (CASE WHEN file_path LIKE '%" & poNumber & "%' THEN 1 ELSE 0 END) DESC, " & _
          "  last_modified_at DESC " & _
          "LIMIT 8"
    
    LogDebug "Executing query: " & sql
    
    results = ExecuteQuery(sql)
    
    ' Process results: add priority column (index 7) to Variant array
    If IsArray(results) Then
        resultCount = UBound(results, 1) + 1
        ' Extend array to add priority column
        ReDim Preserve results(0 To UBound(results, 1), 0 To 7)
        
        For i = 0 To UBound(results, 1)
            ' Determine priority for this result
            ' (i, 0)=id, (i, 4)=is_active, (i, 3)=file_path
            If CLng(results(i, 4)) = 1 Then
                results(i, 7) = 2  ' Highest: is_active
            ElseIf InStr(CStr(results(i, 3)), poNumber) > 0 Then
                results(i, 7) = 1  ' Medium: PO match
            Else
                results(i, 7) = 0  ' Default: by date
            End If
        Next i
        
        LogDebug "Found " & resultCount & " drawing files for drawing_number=" & drawingNumber
        resultsArray = results
    Else
        LogDebug "No drawing files found for drawing_number=" & drawingNumber
        resultsArray = Null
    End If
    
    QueryDrawingFiles = resultsArray
    Exit Function
    
ErrorHandler:
    LogError "Error in QueryDrawingFiles: " & Err.Description
    QueryDrawingFiles = Null
End Function

'/**
' * Get the best matching result (index 0 of the results array)
' * This is already sorted by priority, so index 0 is the recommended selection
' * 
' * Parameters:
' *   - resultsArray: Variant array from QueryDrawingFiles()
' * 
' * Returns:
' *   - Index of the recommended result (0 if exists, -1 if no results)
' */
Public Function GetBestMatchingResultIndex(resultsArray As Variant) As Long
    On Error Resume Next
    
    If IsArray(resultsArray) And UBound(resultsArray, 1) >= 0 Then
        LogDebug "Best matching result is at index 0 with priority=" & resultsArray(0, 7)
        GetBestMatchingResultIndex = 0
    Else
        LogDebug "No results available"
        GetBestMatchingResultIndex = -1
    End If
End Function

'/**
' * Get result count (for display in T8)
' */
Public Function GetResultCount(resultsArray As Variant) As Long
    On Error Resume Next
    
    If IsArray(resultsArray) Then
        GetResultCount = UBound(resultsArray, 1) + 1
    Else
        GetResultCount = 0
    End If
End Function
