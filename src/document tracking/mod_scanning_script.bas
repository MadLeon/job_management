'/**
' * Scanning Script Module for PDF Drawing Extraction
' * 
' * This module provides functionality to scan a network path for PDF files,
' * extract drawing numbers from file names, and populate Excel worksheet columns.
' * 
' * Dependencies:
' * - dat_global_variable.bas (Global variables and DEBUG_MODE)
' * - lib_logger.bas (Logging functionality)
' * 
' * Usage:
' * - Call TestScanDrawings() to test the functionality
' * - Call ScanAndFillDrawings(networkPath) to scan and populate data
' */

Option Explicit

'/**
' * Extracts the drawing number from a PDF filename
' * 
' * The drawing number is the text before the first space in the filename.
' * Only processes filenames containing "rt-" (case-insensitive).
' * Handles both space-separated and underscore-separated revision formats.
' * Returns the drawing number in uppercase.
' * 
' * Examples:
' * - "RT-87900-0408 rev1" -> "RT-87900-0408"
' * - "RT-87900-0408 Bushing Details" -> "RT-87900-0408"
' * - "RT-88000-70099-002-1-DD-B_Rev3 windows detail" -> "RT-88000-70099-002-1-DD-B"
' * - "invalid-file name" -> "" (ignored, no "rt-")
' * 
' * @param {String} fileName - The PDF filename (without extension)
' * @return {String} The extracted drawing number in uppercase, or empty string if no "rt-" found
' */
Function ExtractDrawingNumber(fileName As String) As String
    Dim spacePosition As Long
    Dim underscorePosition As Long
    Dim drawingNumber As String
    Dim afterUnderscore As String
    Dim fileNameLower As String
    
    On Error GoTo ErrorHandler
    
    ' Check if filename contains "rt-" (case-insensitive)
    fileNameLower = LCase(fileName)
    If InStr(1, fileNameLower, "rt-") = 0 Then
        Call LogDebug("Skipped file (no 'rt-' found): " & fileName)
        ExtractDrawingNumber = ""
        Exit Function
    End If
    
    ' Find the position of the first space
    spacePosition = InStr(1, fileName, " ")
    
    ' If no space found, use the entire filename
    If spacePosition = 0 Then
        drawingNumber = fileName
    Else
        ' Extract text before the first space
        drawingNumber = Left(fileName, spacePosition - 1)
    End If
    
    ' Check if there's an underscore in the drawing number
    underscorePosition = InStr(1, drawingNumber, "_")
    If underscorePosition > 0 Then
        ' Get text after underscore
        afterUnderscore = Mid(drawingNumber, underscorePosition + 1)
        
        ' Check if it matches revision pattern: Rev/rev followed by optional dot and digits
        If IsRevisionFormat(afterUnderscore) Then
            ' Remove the underscore and revision part
            drawingNumber = Left(drawingNumber, underscorePosition - 1)
            Call LogDebug("Removed underscore revision format from: " & Left(fileName, spacePosition - 1) & " -> " & drawingNumber)
        End If
    End If
    
    ' Convert to uppercase
    drawingNumber = UCase(drawingNumber)
    
    ExtractDrawingNumber = drawingNumber
    Exit Function
    
ErrorHandler:
    Call LogError("ExtractDrawingNumber failed for file: " & fileName & ", Error: " & Err.Description)
    ExtractDrawingNumber = ""
End Function

'/**
' * Helper function to check if a string matches the revision format
' * Matches patterns like: Rev1, rev3, Rev.1, rev.2, etc.
' * 
' * @param {String} textToCheck - The text to check
' * @return {Boolean} True if matches revision format, False otherwise
' */
Function IsRevisionFormat(textToCheck As String) As Boolean
    Dim char As String
    
    ' Must start with "Rev" or "rev"
    If Len(textToCheck) < 4 Then
        IsRevisionFormat = False
        Exit Function
    End If
    
    If LCase(Left(textToCheck, 3)) <> "rev" Then
        IsRevisionFormat = False
        Exit Function
    End If
    
    ' Check character after "rev"
    char = Mid(textToCheck, 4, 1)
    
    ' Can be a dot or a digit
    If char = "." Then
        ' If it's a dot, must have at least one digit after it
        IsRevisionFormat = (Len(textToCheck) > 4) And IsNumeric(Mid(textToCheck, 5, 1))
    Else
        ' Otherwise must be a digit
        IsRevisionFormat = IsNumeric(char)
    End If
End Function

'/**
' * Helper function to check if a single character is numeric
' * 
' * @param {String} char - The character to check
' * @return {Boolean} True if numeric, False otherwise
' */
Function IsNumeric(char As String) As Boolean
    IsNumeric = (char >= "0" And char <= "9")
End Function

'/**
' * Scans a network path for PDF files and extracts drawing numbers with file paths
' * 
' * Returns a Collection where each element is an array [drawingNumber, pdfPath]
' * 
' * @param {String} networkPath - The network path to scan (e.g., "\\server\folder")
' * @return {Collection} Collection of [drawingNumber, pdfPath] pairs
' */
Function ScanNetworkPath(networkPath As String) As Collection
    Dim fso As Object
    Dim folder As Object
    Dim file As Object
    Dim results As Collection
    Dim drawingNumber As String
    Dim fileName As String
    Dim pdfPath As String
    Dim drawingInfo As Variant
    
    On Error GoTo ErrorHandler
    
    Set results = New Collection
    
    ' Create FileSystemObject
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    ' Check if path exists
    If Not fso.FolderExists(networkPath) Then
        Call LogError("Network path does not exist: " & networkPath)
        Set ScanNetworkPath = results
        Exit Function
    End If
    
    Set folder = fso.GetFolder(networkPath)
    
    ' Iterate through all files in the folder
    For Each file In folder.Files
        ' Check if file is a PDF
        If LCase(Right(file.Name, 4)) = ".pdf" Then
            ' Remove extension from filename
            fileName = Left(file.Name, Len(file.Name) - 4)
            
            ' Extract drawing number
            drawingNumber = ExtractDrawingNumber(fileName)
            
            ' Add to results if not empty
            If Len(drawingNumber) > 0 Then
                pdfPath = file.Path
                ' Create an array [drawingNumber, pdfPath]
                ReDim drawingInfo(1 To 2)
                drawingInfo(1) = drawingNumber
                drawingInfo(2) = pdfPath
                results.Add drawingInfo
                Call LogDebug("Found drawing: " & drawingNumber & " at " & pdfPath)
            End If
        End If
    Next file
    
    Set ScanNetworkPath = results
    Set fso = Nothing
    Exit Function
    
ErrorHandler:
    Call LogError("ScanNetworkPath failed for path: " & networkPath & ", Error: " & Err.Description)
    Set ScanNetworkPath = results
    Set fso = Nothing
End Function

'/**
' * Fills the worksheet with drawing numbers in a two-column layout with hyperlinks
' * Also adds data validation dropdowns in adjacent columns
' * 
' * Layout:
' * - Each page has 44 rows of content (rows 4-47 for page 1, rows 48-91 for page 2, etc.)
' * - Column A: drawing numbers 1-44 on page 1, 45-88 on page 2, etc.
' * - Columns B, C: data validation dropdowns (options from PO Status sheet H1:H2)
' * - Column E: drawing numbers 45-88 on page 1, 89-132 on page 2, etc.
' * - Columns F, G: data validation dropdowns (options from PO Status sheet H1:H2)
' * - All drawing number entries are created as hyperlinks to the corresponding PDF files
' * 
' * @param {Collection} drawingData - Collection of [drawingNumber, pdfPath] arrays
' * @return {Boolean} True if successful, False otherwise
' */
Function FillExcelColumn(drawingData As Collection) As Boolean
    Dim ws As Worksheet
    Dim poStatusSheet As Worksheet
    Dim targetCell As Range
    Dim validationCell As Range
    Dim totalCount As Long
    Dim rowsPerPage As Long
    Dim dataIndex As Long
    Dim pageIndex As Long
    Dim colIndex As Long
    Dim startRow As Long
    Dim endRow As Long
    Dim currentRow As Long
    Dim colLetter As String
    Dim drawingInfo As Variant
    Dim drawingNumber As String
    Dim pdfPath As String
    Dim validationValue As String
    
    On Error GoTo ErrorHandler
    
    ' Get the active worksheet
    Set ws = ActiveSheet
    
    ' Try to get PO Status sheet for validation options
    On Error Resume Next
    Set poStatusSheet = ws.Parent.Sheets("PO Status")
    On Error GoTo ErrorHandler
    
    Call LogInfo("Filling data in worksheet: " & ws.Name & " with hyperlinks and validations", "FillExcelColumn")
    
    totalCount = drawingData.Count
    rowsPerPage = 44
    dataIndex = 1
    pageIndex = 0        ' Page index starts at 0
    colIndex = 1         ' Column index: 1 for A, 2 for E
    
    ' Loop to fill all data
    While dataIndex <= totalCount
        ' Calculate start and end rows for current page/column
        If colIndex = 1 Then        ' Column A (with B, C validations)
            startRow = 4 + pageIndex * rowsPerPage
            endRow = startRow + rowsPerPage - 1
            colLetter = "A"
        Else                         ' Column E (with F, G validations)
            startRow = 4 + pageIndex * rowsPerPage
            endRow = startRow + rowsPerPage - 1
            colLetter = "E"
        End If
        
        ' Fill current column
        For currentRow = startRow To endRow
            If dataIndex <= totalCount Then
                ' Get drawing data
                drawingInfo = drawingData(dataIndex)
                drawingNumber = drawingInfo(1)
                pdfPath = drawingInfo(2)
                
                Set targetCell = ws.Range(colLetter & currentRow)
                targetCell.Value = drawingNumber
                
                ' Create hyperlink to PDF
                On Error Resume Next
                ws.Hyperlinks.Add Anchor:=targetCell, Address:=pdfPath, TextToDisplay:=drawingNumber
                On Error GoTo ErrorHandler
                
                ' Add data validation to adjacent columns
                If colIndex = 1 Then
                    ' Add validation to columns B and C
                    Call AddValidationToCell(ws, poStatusSheet, "B" & currentRow)
                    Call AddValidationToCell(ws, poStatusSheet, "C" & currentRow)
                Else
                    ' Add validation to columns F and G
                    Call AddValidationToCell(ws, poStatusSheet, "F" & currentRow)
                    Call AddValidationToCell(ws, poStatusSheet, "G" & currentRow)
                End If
                
                dataIndex = dataIndex + 1
            End If
        Next currentRow
        
        ' Move to next column or page
        If colIndex = 1 Then
            colIndex = 2
        Else
            colIndex = 1
            pageIndex = pageIndex + 1
        End If
    Wend
    
    Call LogInfo("Successfully filled " & totalCount & " drawing numbers with hyperlinks and validations", "FillExcelColumn")
    FillExcelColumn = True
    Exit Function
    
ErrorHandler:
    Call LogError("FillExcelColumn failed: " & Err.Description)
    FillExcelColumn = False
End Function

'/**
' * Helper function to add data validation dropdown to a cell
' * 
' * Retrieves validation options from PO Status sheet cells H1 and H2
' * 
' * @param {Worksheet} ws - The worksheet to add validation to
' * @param {Worksheet} poStatusSheet - The PO Status sheet (may be Nothing)
' * @param {String} cellAddress - The cell address (e.g., "B4")
' */
Sub AddValidationToCell(ws As Worksheet, poStatusSheet As Worksheet, cellAddress As String)
    Dim validationCell As Range
    Dim h1Value As String
    Dim h2Value As String
    Dim validationFormula As String
    
    On Error GoTo ErrorHandler
    
    Set validationCell = ws.Range(cellAddress)
    
    ' Clear any existing validation
    On Error Resume Next
    validationCell.Validation.Delete
    On Error GoTo ErrorHandler
    
    ' Try to get values from PO Status sheet
    If poStatusSheet Is Nothing Then
        Call LogDebug("PO Status sheet not found, skipping validation for " & cellAddress)
        Exit Sub
    End If
    
    On Error Resume Next
    h1Value = poStatusSheet.Range("H1").Value
    h2Value = poStatusSheet.Range("H2").Value
    On Error GoTo ErrorHandler
    
    ' Check if we have any values
    If Len(h1Value) = 0 And Len(h2Value) = 0 Then
        Call LogDebug("PO Status sheet H1 and H2 are empty")
        Exit Sub
    End If
    
    ' Build validation formula using sheet reference
    validationFormula = "='" & poStatusSheet.Name & "'!H1:H2"
    
    ' Add data validation with the range formula
    On Error Resume Next
    With validationCell.Validation
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Formula1:=validationFormula
        .IgnoreBlank = True
        .InCellDropdown = True
    End With
    On Error GoTo ErrorHandler
    
    Call LogDebug("Added validation to " & cellAddress & " with formula: " & validationFormula)
    Exit Sub
    
ErrorHandler:
    Call LogError("AddValidationToCell failed for " & cellAddress & ": " & Err.Description)
End Sub

'/**
' * Main function: Scans network path and populates Excel worksheet
' * 
' * @param {String} networkPath - The network path to scan
' * @return {Boolean} True if successful, False otherwise
' */
Function ScanAndFillDrawings(networkPath As String) As Boolean
    Dim drawingNumbers As Collection
    Dim fillResult As Boolean
    
    On Error GoTo ErrorHandler
    
    Call StartLogBlock()
    Call LogInfo("Starting scan and fill process for path: " & networkPath, "ScanAndFillDrawings")
    
    ' Scan network path
    Set drawingNumbers = ScanNetworkPath(networkPath)
    
    ' Fill Excel column
    fillResult = FillExcelColumn(drawingNumbers)
    
    Call FlushLogBlock()
    
    ScanAndFillDrawings = fillResult
    Exit Function
    
ErrorHandler:
    Call LogError("ScanAndFillDrawings failed: " & Err.Description)
    Call FlushLogBlock()
    ScanAndFillDrawings = False
End Function

'/**
' * Public Interface: Scan and Fill Drawing Numbers
' * 
' * This subroutine is designed to be called from Excel buttons or other UI elements.
' * Prompts the user for a network path, scans for PDF files, extracts drawing numbers,
' * and fills them into column A of the current worksheet starting from row 4.
' * 
' * Usage: Bind this subroutine directly to a button in Excel
' */
Sub ScanDrawingsUI()
    Dim customPath As String
    Dim result As Boolean
    Dim msg As String
    
    ' Prompt user for network path
    customPath = InputBox("Enter the network path to scan:", "Scan Path Input")
    
    ' If user cancelled, exit
    If Len(customPath) = 0 Then
        MsgBox "Operation cancelled.", vbInformation, "Cancelled"
        Exit Sub
    End If
    
    Call StartLogBlock()
    Call LogInfo("=== ScanDrawingsUI: Starting Scan ===", "ScanDrawingsUI")
    Call LogInfo("Network path: " & customPath, "ScanDrawingsUI")
    
    ' Execute scan and fill
    result = ScanAndFillDrawings(customPath)
    
    Call FlushLogBlock()
End Sub
