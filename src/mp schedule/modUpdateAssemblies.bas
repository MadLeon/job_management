Option Explicit

' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Reads Job and Drawing Number relationships from "PrioritySheet" worksheet
'   - Stores data into record.db database:
'     • Adds drawing_number to part table (if not exists) with description
'     • Creates parent-child relationships in part_tree table (if not exists) with quantity
'   - Target tables: part (drawing_number, description), part_tree (parent_id, child_id, quantity)
'   - Procedures in this module can be called from other procedures
' -------------------------------------------------------------------------------------------------

' -------------------------------------------------------------------------------------------------
' Version History:
'   - 2025.11.13: Original implementation - stored data in assemblies table
'   - 2025.11.14: Added description and quantity updates to assemblies table
'   - 2026.02.12: Migrated to record.db - refactored to use part and part_tree tables
'                 Implemented new logic: insert or skip pattern for both part and part_tree
' -------------------------------------------------------------------------------------------------

' --- Configuration Variables ---
' Database path is constructed relative to the workbook location
' This allows the script to work on different machines with the same relative structure
Function GetDBPath() As String
    GetDBPath = ThisWorkbook.Path & "\..\..\data\record.db"
End Function

Public Sub UpdateAssemblies()
    ' Main procedure: Processes each row of PrioritySheet, extracts Job and Drawing Number information,
    ' and stores the relationships in record.db (part and part_tree tables).
    ' 
    ' Process:
    '   1. Reads from "Priority Sheet" worksheet
    '   2. For each part_number, extracts all child drawing_numbers and quantities
    '   3. Calls InsertAssemblyData for each relationship to be stored in database

    Dim ws As Worksheet: Set ws = ThisWorkbook.Sheets("Priority Sheet")
    Dim lastRow As Long: lastRow = GetLastDataRow(ws)
    Dim i As Long, partCount As Long
    Dim part_number As String, drawing_number As String, description As String, quantity As String
    
    If Not InitializeSQLite(GetDBPath()) Then Exit Sub
    
    For i = 2 To lastRow
        If Not IsEmpty(ws.Cells(i, "A").Value) Then
            part_number = ws.Cells(i, "F").Value
            partCount = CountParts(ws, i)
            
            Dim j As Long
            For j = i + 1 To i + partCount
                If Not IsEmpty(ws.Cells(j, "F").Value) Then
                    drawing_number = ws.Cells(j, "F").Value
                    description = ws.Cells(j, "E").Value
                    quantity = ws.Cells(j, "G").Value
                    Call InsertAssemblyData(part_number, drawing_number, description, quantity)
                End If
            Next j
            
            i = i + partCount
        End If
    Next i
    
    CloseSQLite
    MsgBox "PrioritySheet processing complete. Data has been stored in the database.", vbInformation
End Sub

Private Function GetLastDataRow(ws As Worksheet) As Long
    ' Get the last row containing data in the worksheet
    ' Returns the row number of the last non-empty row, or 1 if worksheet is empty
    
    On Error Resume Next
    GetLastDataRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If GetLastDataRow = 0 Then GetLastDataRow = 1
    On Error GoTo 0
End Function

Private Function CountParts(ws As Worksheet, startRow As Long) As Long
    ' Count the number of child parts (rows with empty A column) following the parent part at startRow
    ' Returns the count of consecutive rows where A column is empty
    
    Dim count As Long
    Dim i As Long
    Dim maxRow As Long
    
    count = 0
    maxRow = GetLastDataRow(ws)
    
    ' Count rows starting from the next row where column A is empty (child rows)
    For i = startRow + 1 To maxRow
        If IsEmpty(ws.Cells(i, "A").Value) Then
            count = count + 1
        Else
            ' Stop counting when we encounter the next parent row (non-empty A)
            Exit For
        End If
    Next i
    
    CountParts = count
End Function

Private Sub InsertAssemblyData(part_number As String, drawing_number As String, description As String, quantity As String)
    ' Inserts or updates assembly relationships in record.db.
    '
    ' Target tables:
    '   - part: Stores drawing_number and description (if drawing_number doesn't exist)
    '   - part_tree: Stores parent-child relationships (parent_id, child_id, quantity)
    '
    ' Logic (Insert or Skip):
    '   Step 1: Check if drawing_number exists in part table. If not, insert it with description.
    '   Step 2: Retrieve parent_id from part table using part_number as drawing_number.
    '   Step 3: Retrieve child_id from part table using drawing_number.
    '   Step 4: Skip self-reference (a part cannot contain itself).
    '   Step 5: Check if (parent_id, child_id) relationship exists in part_tree. 
    '           If not, insert it with quantity (default: 1 if empty).
    '
    ' Parameters:
    '   part_number: The drawing_number of the parent part
    '   drawing_number: The drawing_number of the child part
    '   description: Description of the child part
    '   quantity: Quantity of the child part per parent part

    Dim sqlCheck As String, sqlInsert As String
    Dim parentId As Long, childId As Long
    Dim result As Variant
    Dim qtVal As Long
    
    ' Handle quantity - default to 1 if empty or NULL
    qtVal = 1
    If Not IsEmpty(quantity) And quantity <> "" Then
        On Error Resume Next
        qtVal = CLng(quantity)
        On Error GoTo 0
    End If
    
    ' ================== Step 1: Check and add drawing_number to part table ==================
    sqlCheck = "SELECT COUNT(*) FROM part WHERE drawing_number = '" & drawing_number & "'"
    result = ExecuteSQL(sqlCheck)
    
    Dim drawingExists As Boolean
    If IsArray(result) Then
        If UBound(result) >= 0 And UBound(result(0)) >= 0 Then
            drawingExists = (result(0)(0) > 0)
        Else
            drawingExists = False
        End If
    Else
        drawingExists = False
    End If
    
    ' If drawing_number doesn't exist, insert new record
    If Not drawingExists Then
        sqlInsert = "INSERT INTO part (drawing_number, description) VALUES ('" & drawing_number & "', '" & description & "')"
        If ExecuteNonQuery(sqlInsert) Then
            Debug.Print "Part inserted: drawing_number = " & drawing_number
        Else
            Debug.Print "Error: Failed to insert part with drawing_number = " & drawing_number
            Exit Sub
        End If
    End If
    
    ' ================== Step 2: Retrieve parent_id (ID corresponding to part_number) ==================
    sqlCheck = "SELECT id FROM part WHERE drawing_number = '" & part_number & "'"
    result = ExecuteSQL(sqlCheck)
    
    On Error Resume Next
    parentId = result(0)(0)
    If Err.Number <> 0 Then
        Debug.Print "Error: Parent part not found with drawing_number = " & part_number
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo 0
    
    ' ================== Step 3: Retrieve child_id (ID corresponding to drawing_number) ==================
    sqlCheck = "SELECT id FROM part WHERE drawing_number = '" & drawing_number & "'"
    result = ExecuteSQL(sqlCheck)
    
    On Error Resume Next
    childId = result(0)(0)
    If Err.Number <> 0 Then
        Debug.Print "Error: Child part not found with drawing_number = " & drawing_number
        On Error GoTo 0
        Exit Sub
    End If
    On Error GoTo 0
    
    ' ================== Step 4: Skip self-reference (a part cannot contain itself) ==================
    If parentId = childId Then
        Debug.Print "Warning: Self-reference skipped (a part cannot contain itself): parent_id = child_id = " & parentId
        Exit Sub
    End If
    
    ' ================== Step 5: Check if relationship already exists in part_tree ==================
    sqlCheck = "SELECT COUNT(*) FROM part_tree WHERE parent_id = " & parentId & " AND child_id = " & childId
    result = ExecuteSQL(sqlCheck)
    
    Dim relationExists As Boolean
    If IsArray(result) Then
        If UBound(result) >= 0 And UBound(result(0)) >= 0 Then
            relationExists = (result(0)(0) > 0)
        Else
            relationExists = False
        End If
    Else
        relationExists = False
    End If
    
    ' If relationship doesn't exist, insert new record
    If Not relationExists Then
        sqlInsert = "INSERT INTO part_tree (parent_id, child_id, quantity) VALUES (" & parentId & ", " & childId & ", " & qtVal & ")"
        If ExecuteNonQuery(sqlInsert) Then
            Debug.Print "Relation inserted: parent_id = " & parentId & ", child_id = " & childId & ", quantity = " & qtVal
        Else
            Debug.Print "Error: Failed to insert relation to part_tree"
        End If
    Else
        Debug.Print "Relation skipped (already exists): parent_id = " & parentId & ", child_id = " & childId
    End If
End Sub
