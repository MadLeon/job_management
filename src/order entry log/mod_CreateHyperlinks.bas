' mod_CreateHyperlinks.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Provide functions to create hyperlinks based on drawing numbers selections (single/multiple)
'   - Provide API to add a hyperlink when creating a new job entry
' -------------------------------------------------------------------------------------------------
' Notes:
' 1. Directly query a drawing_number is more efficient and reliable than with a drawing_name
'    - drawing_name: the pdf file name, which may not always contain the drawing number
'    - drawing_number: the ID of a drawing
' 2. When drawing_number lookup fails, use drawing_name with customer folder matching
'    - drawing_name is more likely to contain the drawing number as part of the file name
'    - Matching customer folder increases accuracy in case of meaningless drawing numbers
'      e.g., "Sample" could exist for multiple customers. It will cause problems in future lookups
'            if we accept it this time and store it in the database.
' 3. Use customer_folder_map table to map customer names to folder aliases
'    - Some customer names in Delivery Schedule Sheet may not match folder names in file locations
'      e.g., folder_name: D.J.Indus vs customer_name: DJ Ind.
'            MDA                    vs M.D.A
'    - Use the map table to build a connection with them
' 4. Store the founded drawing_number for later use, which will be faster and more reliable
' -------------------------------------------------------------------------------------------------
Option Explicit

' Output the location string for a given drawing number and a customer
' Assume that the DB object is initialized
' Will be called by AddHyperlink & CreateSingleHyperlink
Function FindDrawingLocation(drawingNumber As String, customerName As String)
    Dim fileLocation As String, drawingName As String
    Dim results As Variant

    fileLocation = ""

    If drawingNumber = "" Then
        Debug.Print "Drawing number is empty."
        FindDrawingLocation = ""
        Exit Function
    End If

    ' 1. Query drawing_number directly (See Note 1 for reasoning)
    results = mod_SQLite.ExecuteQuery("SELECT file_location FROM drawings WHERE drawing_number = '" & drawingNumber & "'")
    If Not IsNull(results) Then
        fileLocation = Trim(results(0)(0))
    End If

    ' 2. If not found, query drawing_name with customer match (See Note 2 for reasoning)
    If fileLocation = "" Then
        Dim folderAlias As String
        folderAlias = ""

        ' Try to get folderAlias from customer_folder_map table (See Note 3 for reasoning)
        Dim mapResults As Variant
        mapResults = mod_SQLite.ExecuteQuery("SELECT folder_name FROM customer_folder_map WHERE customer_name = '" & Replace(customerName, "'", "''") & "'")
        If Not IsNull(mapResults) Then
        folderAlias = Trim(mapResults(0)(0))
        End If

        If folderAlias <> "" Then
        ' Use mapped folder_name for matching
        results = mod_SQLite.ExecuteQuery("SELECT file_location, drawing_name FROM drawings WHERE drawing_name LIKE '%" & drawingNumber & "%' AND file_location LIKE '%" & folderAlias & "%'")
        Else
        ' Fallback to customerName matching
        results = mod_SQLite.ExecuteQuery("SELECT file_location, drawing_name FROM drawings WHERE drawing_name LIKE '%" & drawingNumber & "%' AND file_location LIKE '%" & customerName & "%'")
        End If
        If Not IsNull(results) Then
        fileLocation = Trim(results(0)(0))
        drawingName = Trim(results(0)(1))
        End If
    End If

    ' 3. If file found, update drawing_number in database (See Note 4 for reasoning)
    Dim updateSQL As String
    If drawingName <> "" Then
        updateSQL = "UPDATE drawings SET drawing_number = '" & drawingNumber & "' WHERE drawing_name = '" & drawingName & "'"
        If Not mod_SQLite.ExecuteNonQuery(updateSQL) Then
        Debug.Print "Error updating drawing number"
        End If
    End If

    If fileLocation <> "" Then
        Debug.Print "File location for " & drawingNumber & ": " & fileLocation
    Else
        Debug.Print "No file location found for " & drawingNumber
    End If

    FindDrawingLocation = fileLocation
End Function

' Add a hyperlink when a new job is created
' Will be called by EMT
Sub AddHyperlink(row As Long)
    Dim drawingNumber As String, fileLocation As String, customerName As String
    Dim cell As Variant

    Set cell = Sheets("DELIVERY SCHEDULE").Cells(row, 5)
    customerName = Sheets("DELIVERY SCHEDULE").Cells(row, 3).Value

    drawingNumber = Trim(cell.Value)
    If drawingNumber = "" Then
        Debug.Print "Drawing number is empty."
        Exit Sub
    End If

    ' Initialize SQLite connection
    If Not mod_SQLite.InitializeSQLite(DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    fileLocation = FindDrawingLocation(drawingNumber, customerName)

    If fileLocation <> "" Then
        On Error Resume Next
        cell.Worksheet.Hyperlinks.Add Anchor:=cell, Address:=fileLocation, TextToDisplay:=drawingNumber
        On Error GoTo 0

        ' Set font style
        With cell.Font
            .Name = "Cambria"
            .Size = 12
        End With
    End If
    
    ' Clean up
    mod_SQLite.CloseSQLite
    Debug.Print "Hyperlinks created successfully!"
End Sub


' Create a Hyperlink for the selected cell
' Will be called by CreateHyperlinks
' Assume that the database is initialized, so that it cannot exists by itself
Sub CreateSingleHyperlink(cell As Range, customerName As String)
    ' Adds hyperlink to single cell by querying database directly
    Dim drawingNumber As String, fileLocation As String
    Dim results As Variant

    drawingNumber = Trim(cell.Value)
    If drawingNumber = "" Then
        Debug.Print "Drawing number is empty."
        Exit Sub
    End If

    ' Check if cell already has hyperlink
    On Error Resume Next
    Dim hyp As Hyperlink
    Set hyp = cell.Worksheet.Hyperlinks(cell.Address)
    On Error GoTo 0

    If Not hyp Is Nothing Then
        ' Skip if already hyperlinked
        Set hyp = Nothing
        Exit Sub
    End If

    fileLocation = FindDrawingLocation(drawingNumber, customerName)

    ' Add hyperlink if file found
    If fileLocation <> "" Then
        On Error Resume Next
        cell.Worksheet.Hyperlinks.Add Anchor:=cell, Address:=fileLocation, TextToDisplay:=drawingNumber
        On Error GoTo 0

        ' Set font style
        With cell.Font
            .Name = "Cambria"
            .Size = 12
        End With
    End If

End Sub

' Add all hyperlinks for the selected area, no matter it's a single cell or multiple cells
Sub CreateHyperlinks()
    ' Creates hyperlinks for selected cells in column E without caching
    Dim curBook As Workbook, curWS As Worksheet
    Dim selectedRange As Range, cell As Range
    Dim eCells As Collection
    Dim c As Variant
    Dim customerName As String

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
    If Not mod_SQLite.InitializeSQLite(DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    ' 3. Get selected range and collect column E cells
    Set selectedRange = Selection
    Set eCells = New Collection

    For Each cell In selectedRange
        If cell.Column = 5 And cell.row > 1 Then ' Column E and skip header
            customerName = Trim(curWS.Cells(cell.row, 3).Value) ' Column C's value in the same row
            If customerName <> "" Then
                eCells.Add cell
            End If
        End If
    Next cell

    ' 4. Process each selected cell
    For Each c In eCells
        Set cell = c
        Call CreateSingleHyperlink(cell, customerName)
    Next c

    ' 5. Clean up
    mod_SQLite.CloseSQLite
    Set eCells = Nothing
End Sub
