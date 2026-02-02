Option Explicit

' Uses DB_PATH from mod_PublicData for database connection

' Populate the next OE Number in the Input Form
' Reads the last OE number from DELIVERY SCHEDULE column A
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

' Copy data from InputForm to DELIVERY SCHEDULE with cascading database insert
'
' This procedure (previously named EMP):
' 1. Copies form inputs to DELIVERY SCHEDULE sheet
' 2. Adds hyperlink for the part drawing number
' 3. Performs cascading insert to record.db
' 4. Resets form for next entry
'
' NOTE: This is an alternative to AddNextNewRecord
' Use either EMT OR AddNextNewRecord, not both, to avoid duplicate records
'
' The database insertion is handled by AddNewJobToDB which manages
' multi-table cascading updates for the new normalized schema
Sub EMT()
    Dim vNewRow As Long
    
    ' Find the first empty row in the data table
    vNewRow = Sheets("DELIVERY SCHEDULE").Cells(Rows.Count, 1).End(xlUp).Offset(1, 0).Row
    
    ' Check for data in OE field
    If Trim(Range("OE").Value) = "" Then
        Range("OE").Activate
        MsgBox "Please enter data in OE!", vbExclamation
        Exit Sub
    End If
    
    ' Temporarily disable events to prevent Worksheet_Change triggering during initial write
    Application.EnableEvents = False
    
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
    
    Application.EnableEvents = True

    ' Initialize database once for both hyperlink and data insertion
    If Not mod_SQLite.InitializeSQLite(mod_PublicData.DB_PATH) Then
        MsgBox "Failed to initialize database!", vbCritical
        Exit Sub
    End If

    ' Insert hyperlink for the part number
    Call AddHyperlink(vNewRow)
    
    ' Insert the new record to database (cascading insert to multiple tables)
    Call AddNewJobToDB(vNewRow)
    
    ' Close database connection
    mod_SQLite.CloseSQLite
    
    ' Timers for data processing synchronization
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
    
    ' Export Candu orders to CSV
    Call ExportCanduOrders
End Sub
