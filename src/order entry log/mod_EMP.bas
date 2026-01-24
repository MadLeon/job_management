Sub NewOE()
    Application.ScreenUpdating = False
    
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValue As Variant
        lastValue = .Range("A65536").End(xlUp).Value
    End With
    
    With Sheets("Input Form")
        .Range("G5").Value = lastValue
    End With
    
    Application.ScreenUpdating = True
End Sub

Sub NewJOB()
    Application.ScreenUpdating = False
    
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValue As Variant
        lastValue = .Range("B65536").End(xlUp).Value
    End With
    
    With Sheets("Input Form")
        .Range("G7").Value = lastValue
    End With
    
    Application.ScreenUpdating = True
End Sub

' Copy data from InputForm to DELIVERY SCHEDULE, with data validation and form clearing.
' Add Call AddHyperlink(vNewRow) after data copying - Updated on Dec. 5, 2025 by Leon
Sub EMT()
    ' Declare variable
    Dim vNewRow As Long
    
    ' Find the first empty row in the data table
    vNewRow = Sheets("DELIVERY SCHEDULE").Cells(Rows.Count, 1).End(xlUp).Offset(2, 0).row
    
    ' Check for data in OE field
    If Trim(Range("OE").Value) = "" Then
        Range("OE").Activate
        MsgBox "Please enter data in OE!"
        Exit Sub
    End If
    
    ' Use With statements for brevity and clarity
    With Sheets("DELIVERY SCHEDULE")
        ' Copy the data to the data table
        .Cells(vNewRow, 1).Value = Range("OE").Value
        .Cells(vNewRow, 2).Value = Range("JobNum").Value
        .Cells(vNewRow, 3).Value = Range("Customer").Value
        .Cells(vNewRow, 5).Value = Range("Parts").Value
        .Cells(vNewRow, 6).Value = Range("Revision").Value
        .Cells(vNewRow, 10).Value = Range("desc").Value
        .Cells(vNewRow, 4).Value = Range("qty").Value
        .Cells(vNewRow, 16).Value = Range("date").Value
        .Cells(vNewRow, 7).Value = Range("contact").Value
        .Cells(vNewRow, 12).Value = Range("po").Value
        .Cells(vNewRow, 9).Value = Range("poline").Value
        .Cells(vNewRow, 11).Value = Range("price").Value
        .Cells(vNewRow, 8).Value = Range("od").Value
    End With

    'Insert hyperlink for the part number
    Call AddHyperlink(vNewRow)
    'Insert the new record to database
    Call AddNewJobToDB
    
    ' Timers (consider if these are necessary and if so, ensure Stop_Timer and Start_Timer are defined)
    Application.OnTime Now + TimeValue("00:00:00"), "Stop_Timer"
    Application.OnTime Now + TimeValue("00:00:10"), "Start_Timer"
    
    ' Clear data fields and reset the form
    With Sheets("Input Form")
        .Range("Parts").Value = ""
        .Range("Revision").Value = ""
        .Range("desc").Value = ""
        .Range("qty").Value = ""
        .Range("date").Value = ""
        .Range("poline").Value = ""
        .Range("price").Value = ""
        .Range("OE").Select
    End With
    
    ' Call NewJOB to update the Job Number
    Call NewJOB
End Sub
