' modFormatPrioritySheet.bas
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
    lastCol = 9 ' Only process the first 9 columns

    Set usedRng = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol))

    ' 1. Cell format: text, font size, font name
    usedRng.NumberFormat = "@"
    usedRng.Font.Name = "Cambria"
    usedRng.Font.Size = 16

    ' 2. All cells vertically centered
    usedRng.VerticalAlignment = xlVAlignCenter

    ' 3. Auto-fit column width (like double-clicking the column header edge)
    usedRng.Columns.AutoFit

    ' 4. Header row settings
    With ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol))
        .Interior.Color = RGB(255, 199, 206) ' Light pink
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        ' Add all inner and outer borders (thin line)
        With .Borders
            .LineStyle = xlContinuous
            .Color = vbBlack
            .Weight = xlThin
        End With
    End With

    ' 5. Cell horizontal alignment control
    ' Columns 1,2,3,6,7,8,9: center horizontally
    ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, 1)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 2), ws.Cells(lastRow, 2)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 3), ws.Cells(lastRow, 3)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 5), ws.Cells(lastRow, 5)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 6), ws.Cells(lastRow, 6)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 7), ws.Cells(lastRow, 7)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 8), ws.Cells(lastRow, 8)).HorizontalAlignment = xlCenter
    ws.Range(ws.Cells(1, 9), ws.Cells(lastRow, 9)).HorizontalAlignment = xlCenter
    ' Columns 4 (except header row): left align
    If lastRow > 1 Then
        ws.Range(ws.Cells(2, 4), ws.Cells(lastRow, 4)).HorizontalAlignment = xlLeft
    End If

    ' Set column 7 (G) from row 2 to last row as date format (yyyy-mm-dd)
    If lastRow > 1 Then
        ws.Range(ws.Cells(2, 7), ws.Cells(lastRow, 7)).NumberFormat = "yyyy-mm-dd"
    End If

    ' 6. Add sort/filter dropdowns to first 9 columns (AutoFilter)
    ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol)).AutoFilter

    ' 7. Add borders to data area A1:G
    With ws.Range(ws.Cells(2, 1), ws.Cells(lastRow, 7)).Borders
        .LineStyle = xlContinuous
        .Color = vbBlack
        .Weight = xlThin
    End With

    Debug.Print "Priority Sheet formatting completed!"
End Sub


