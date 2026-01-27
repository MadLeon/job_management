Option Explicit

' Insert current system date in YYYY-MM-DD format to E27 cell
' Follows the date format convention used in record.db (date portion only)
' Called from Input Form when user clicks the "Insert Date" button
Sub InsertCurrentDate()
    Dim inputWS As Worksheet
    Dim targetCell As Range
    Dim currentDate As String
    
    On Error Resume Next
    Set inputWS = ThisWorkbook.Sheets("Input Form")
    On Error GoTo 0
    
    If inputWS Is Nothing Then
        MsgBox "Cannot find 'Input Form' sheet", vbCritical
        Exit Sub
    End If
    
    ' Format current system date as YYYY-MM-DD
    currentDate = Format(Now, "YYYY-MM-DD")
    
    ' Set the value in cell E27
    Set targetCell = inputWS.Range("E27")
    targetCell.Value = currentDate
    
    Debug.Print "Current date " & currentDate & " inserted to E27"
End Sub
