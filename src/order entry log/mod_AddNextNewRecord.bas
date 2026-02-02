Option Explicit

' Populate the next Job Number in the Input Form
' Reads the last job number from DELIVERY SCHEDULE column B
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

' Populate the next OE Number and clear form fields in the Input Form
' Reads the last OE number from DELIVERY SCHEDULE column A
Sub NewOE()
    Application.ScreenUpdating = False
    
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValue As Variant
        lastValue = .Range("A65536").End(xlUp).Value
    End With
    
    With Sheets("Input Form")
        .Range("G5").Value = lastValue
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

' Open the Input Form for creating a new job
' Initializes the form with the next job and OE numbers
Sub OpenInputForm()
    With Sheets("Input Form")
        .Activate
        .Range("OE").Select
    End With
    Call NewJOB
    Call NewOE
End Sub

' Add a new record to DELIVERY SCHEDULE and insert to database
'
' Workflow:
' 1. Validate OE field is not empty
' 2. Copy data from Input Form to DELIVERY SCHEDULE
' 3. Add hyperlink for the part drawing number
' 4. Insert record to database (cascading insert across multiple tables)
' 5. Clear form and reset for next entry
Sub AddNextNewRecord()
    Dim vNewRow As Long
    
    ' Find the first empty row in the data table
    vNewRow = Sheets("DELIVERY SCHEDULE").Cells(Rows.Count, 1).End(xlUp).Offset(1, 0).Row
    
    ' Check for data in OE field
    If Trim(Range("OE").Value) = "" Then
        Range("OE").Activate
        MsgBox "Please enter data in OE!", vbExclamation
        Exit Sub
    End If

    ' Copy the data to the data table
    ' Temporarily disable events to prevent Worksheet_Change triggering during initial write
    Application.EnableEvents = False
    
    With Sheets("DELIVERY SCHEDULE")
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
    
    Application.EnableEvents = True

    ' Initialize database once for both hyperlink and data insertion
    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    ' Add hyperlink for the part number
    Call AddHyperlink(vNewRow)
    
    ' Insert the new record to database
    Call AddNewJobToDB(vNewRow)

    ' Schedule workbook save after 2 seconds
    Application.OnTime Now + TimeValue("00:02:00"), "SaveWB"

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

    Call NewJOB
    
    ' Export Candu orders to CSV
    Call ExportCanduOrders
End Sub

' Cancel the current form entry and reset
' Clears all form fields and returns to DELIVERY SCHEDULE sheet
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

' Populate previous job numbers in the form
' Displays last job number and OE number for reference
Sub PreNum()
    Application.ScreenUpdating = False

    ' Find the very last used cell in column B (Job numbers)
    With Sheets("DELIVERY SCHEDULE")
        Dim lastValueB As Variant
        lastValueB = .Range("B65536").End(xlUp).Value
    End With

    With Sheets("Input Form")
        Dim lastValueJ As Variant
        lastValueJ = .Range("J7").Value ' Read from Input Form
        .Range("H7").Value = lastValueB
        .Range("G7").Value = lastValueJ
        .Range("E9").Select
    End With

    Application.ScreenUpdating = True
End Sub

' Save the workbook
' Called by scheduled timer after database insert
Sub SaveTheWork()
    ActiveWorkbook.Save
End Sub

