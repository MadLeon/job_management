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

Sub NewOE()
'Find the very last used cell in a Column:
    Application.ScreenUpdating = False
    
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValue As Variant
        lastValue = .Range("A65536").End(xlUp).Value
    End With
    
    With Sheets("Input Form")
        .Range("G5").Value = lastValue
        '.Range("OE").Value = ""
        '.Range("JobNum").Value = ""
        .Range("Customer").Value = ""
        .Range("Parts").Value = ""
        .Range("Revision").Value = ""
        .Range("desc").Value = ""
        .Range("qty").Value = ""
        .Range("date").Value = ""
        .Range("contact").Value = ""
        .Range("po").Value = ""
        .Range("poline").Value = ""
        .Range("price").Value = ""
        .Range("OE").Select
    End With

    Application.ScreenUpdating = True
End Sub

Sub OpenInputForm()
    With Sheets("Input Form")
        .Activate
        .Range("OE").Select
    End With
    Call NewJOB
    Call NewOE
End Sub

Sub AddNextNewRecord()
    Dim vNewRow As Long
    ' Find the first empty row in the data table
    vNewRow = Sheets("DELIVERY SCHEDULE").Cells(Rows.Count, 1).End(xlUp).Offset(1, 0).row
    
    ' Check for data in OE field
    If Trim(Range("OE").Value) = "" Then
        Range("OE").Activate
        MsgBox "Please enter data in OE!"
        Exit Sub
    End If

    ' Copy the data to the data table
    With Sheets("DELIVERY SCHEDULE")
        .Cells(vNewRow, 1).Value = Range("OE").Value
        .Cells(vNewRow, 2).Value = Range("JobNum").Value
        .Cells(vNewRow, 3).Value = Range("Customer").Value
        .Cells(vNewRow, 5).Value = Range("Parts").Value
        .Cells(vNewRow, 6).Value = Range("revision").Value
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

   Application.OnTime Now + TimeValue("00:02:00"), "SaveWB"

    ' Clear data fields and reset the form
    With InputForm
        .Range("Parts").Value = ""
        .Range("Revision").Value = ""
        .Range("desc").Value = ""
        .Range("qty").Value = ""
        .Range("date").Value = ""
        .Range("poline").Value = ""
        .Range("price").Value = ""
        .Range("OE").Select
    End With

   Call NewJOB

End Sub

Sub Cancel()
    ' Clear data fields and reset the form
    With Sheets("Input Form")
        .Range("Customer").Value = ""
        .Range("Parts").Value = ""
        .Range("Revision").Value = ""
        .Range("desc").Value = ""
        .Range("qty").Value = ""
        .Range("date").Value = ""
        .Range("contact").Value = ""
        .Range("po").Value = ""
        .Range("poline").Value = ""
        .Range("price").Value = ""
        .Range("OE").Select
    End With
    
    Sheets("DELIVERY SCHEDULE").Activate
End Sub

Sub PreNum()
    Application.ScreenUpdating = False

    ' Find the very last used cell in a Column
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValueB As Variant
        lastValueB = .Range("B65536").End(xlUp).Value
    End With

    With Sheets("Input Form")
        Dim lastValueJ As Variant
        lastValueJ = .Range("J7").Value ' Corrected to read from Input Form
        .Range("H7").Value = lastValueB
        .Range("G7").Value = lastValueJ
        .Range("E9").Select
    End With

    Application.ScreenUpdating = True
End Sub

Sub SaveTheWork()
    ActiveWorkbook.Save
End Sub

