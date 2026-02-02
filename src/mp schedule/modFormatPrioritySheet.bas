' modFormatPrioritySheet.bas
/**
 * FormatPrioritySheet - Format Priority Sheet columns A-H
 * Columns: A (Order Item ID), B (JOB #), C (PO #), D (Customer), 
 *          E (Description), F (Part #), G (Qty.), H (Ship Date)
 */
Sub FormatPrioritySheet()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Priority Sheet")
    If ws Is Nothing Then
        MsgBox "Priority Sheet not found": Exit Sub
    End If
    On Error GoTo 0

    Dim usedRng As Range, lastRow As Long, lastCol As Long
    lastRow = GetLastDataRow(ws)
    lastCol = 8 ' Columns A-H (8 columns)

    Set usedRng = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol))

    ' 1. Cell format: text, font size, font name
    usedRng.NumberFormat = "@"
    usedRng.Font.Name = "Cambria"
    usedRng.Font.Size = 11

    ' 2. All cells vertically centered
    usedRng.VerticalAlignment = xlVAlignCenter

    ' 3. Auto-fit column width
    usedRng.Columns.AutoFit

    ' 4. Header row settings (Row 1)
    With ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol))
        .Interior.Color = RGB(255, 199, 206) ' Light pink
        .Font.Bold = True
        .Font.Size = 12
        .HorizontalAlignment = xlCenter
        ' Add borders
        With .Borders
            .LineStyle = xlContinuous
            .Color = vbBlack
            .Weight = xlThin
        End With
    End With

    ' 5. Column horizontal alignment control
    ' Columns A (1), B (2), C (3), F (6), G (7), H (8): center horizontally
    ' Columns D (4), E (5): left align
    If lastRow > 1 Then
        ws.Range(ws.Cells(2, 1), ws.Cells(lastRow, 1)).HorizontalAlignment = xlCenter ' A: Order Item ID
        ws.Range(ws.Cells(2, 2), ws.Cells(lastRow, 2)).HorizontalAlignment = xlCenter ' B: JOB #
        ws.Range(ws.Cells(2, 3), ws.Cells(lastRow, 3)).HorizontalAlignment = xlCenter ' C: PO #
        ws.Range(ws.Cells(2, 4), ws.Cells(lastRow, 4)).HorizontalAlignment = xlLeft   ' D: Customer
        ws.Range(ws.Cells(2, 5), ws.Cells(lastRow, 5)).HorizontalAlignment = xlLeft   ' E: Description
        ws.Range(ws.Cells(2, 6), ws.Cells(lastRow, 6)).HorizontalAlignment = xlCenter ' F: Part #
        ws.Range(ws.Cells(2, 7), ws.Cells(lastRow, 7)).HorizontalAlignment = xlCenter ' G: Qty.
        ws.Range(ws.Cells(2, 8), ws.Cells(lastRow, 8)).HorizontalAlignment = xlCenter ' H: Ship Date
        
        ' Set date format for column H (Ship Date)
        ws.Range(ws.Cells(2, 8), ws.Cells(lastRow, 8)).NumberFormat = "yyyy-mm-dd"
    End If

    ' 6. Add sort/filter dropdowns to all 8 columns
    ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol)).AutoFilter

    ' 7. Add borders to data area
    With ws.Range(ws.Cells(2, 1), ws.Cells(lastRow, lastCol)).Borders
        .LineStyle = xlContinuous
        .Color = vbBlack
        .Weight = xlThin
    End With

    Debug.Print "Priority Sheet formatting completed! (Columns A-H)"
End Sub

/**
 * GetLastDataRow - Helper function to get last row with data
 */
Function GetLastDataRow(ws As Worksheet) As Long
    Dim lastRowA As Long, lastRowD As Long, lastRowE As Long, lastRowDE As Long
    
    lastRowA = ws.Cells(ws.rows.Count, "A").End(xlUp).row
    lastRowD = ws.Cells(ws.rows.Count, "D").End(xlUp).row
    lastRowE = ws.Cells(ws.rows.Count, "E").End(xlUp).row
    
    If lastRowD >= lastRowE Then
        lastRowDE = lastRowD
    Else
        lastRowDE = lastRowE
    End If
    
    If lastRowDE > lastRowA Then
        GetLastDataRow = lastRowDE
    Else
        If lastRowA < 2 Then
            GetLastDataRow = 2
        Else
            GetLastDataRow = lastRowA + 1
        End If
    End If
End Function


