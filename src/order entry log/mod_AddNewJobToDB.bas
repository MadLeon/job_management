' VBA
Option Explicit

' This sub is triggered by clicking add new record button in a sheet called input form.
Sub AddNewJobToDB()
    ' --- Goal: Directly add new job entry from order entry log to jobs.db ---
    Dim dbPath As String
    Dim curBook As Workbook, inputWS As Worksheet, deliveryWS As Worksheet
    Dim lastRowDelivery As Long
    Dim jobDict As Object
    Dim r As Long, i As Integer
    Dim insertSQL As String, checkSQL As String, historyInsertSQL As String, deleteSQL As String
    Dim k As Variant
    Dim OE_Number As String, Job_Number As String, Customer_Name As String, Job_Quantity As String, Part_Number As String
    Dim Revision As String, Customer_Contact As String, Drawing_Release As String, Line_Number As String, Part_Description As String
    Dim Unit_Price As String, PO_Number As String, Packing_Slip As String, Packing_Quantity As String, Invoice_Number As String
    Dim Delivery_Required_Date As String, Delivery_Shipped_Date As String
    Dim rs As Variant

    ' 1. Set object variables
    Set curBook = ThisWorkbook
    Set inputWS = curBook.Sheets("Input Form")
    Set deliveryWS = curBook.Sheets("DELIVERY SCHEDULE")

    ' 2. Initialize SQLite
    If Not InitializeSQLite(DB_PATH) Then
        MsgBox "Failed to initialize SQLite. Check the mod_SQLite module.", vbCritical
        Exit Sub
    End If

    ' 3. Get data from Input Form
    OE_Number = Trim(inputWS.Range("OE").Value)
    Job_Number = Trim(inputWS.Range("JobNum").Value)
    Customer_Name = Trim(inputWS.Range("Customer").Value)
    Job_Quantity = Trim(inputWS.Range("qty").Value)
    Part_Number = Trim(inputWS.Range("Parts").Value)
    Revision = Trim(inputWS.Range("Revision").Value)
    Customer_Contact = Trim(inputWS.Range("contact").Value)
    Drawing_Release = Trim(inputWS.Range("od").Value)
    Line_Number = Trim(inputWS.Range("poline").Value)
    Part_Description = Trim(inputWS.Range("desc").Value)
    Unit_Price = Trim(inputWS.Range("price").Value)
    PO_Number = Trim(inputWS.Range("po").Value)
    Delivery_Required_Date = Trim(inputWS.Range("date").Value)

    ' 4. Check if required data exists
    If OE_Number = "" Or Job_Number = "" Then
        Debug.Print "Critical input is missing.", vbCritical
        CloseSQLite
        Exit Sub
    End If
    
    ' 5. Build dictionary of current Job_Number in delivery schedule
    Set jobDict = CreateObject("Scripting.Dictionary")
    lastRowDelivery = LastRow(deliveryWS)
    
        For r = 4 To lastRowDelivery
        Dim jn As String, ln As String, dr As String
        jn = Trim(deliveryWS.Cells(r, 2).Value)   ' Job_Number
        ln = Trim(deliveryWS.Cells(r, 9).Value)   ' Line_Number
        dr = Trim(deliveryWS.Cells(r, 16).Value)  ' Delivery_Required_Date

        If jn <> "" Then
            Dim compositeKey As String
            compositeKey = jn & "|" & ln & "|" & dr
            jobDict(compositeKey) = r
        End If
    Next r

    Debug.Print "Number of unique job entries: "; jobDict.Count
    
    ' 6. Insert new job into jobs table
    ' Generate the unique key
    Dim Unique_Key As String
    Unique_Key = Job_Number & "|" & Line_Number & "|" & Delivery_Required_Date

    insertSQL = "INSERT INTO jobs (OE_Number, Job_Number, Customer_Name, Job_Quantity, Part_Number, Revision, Customer_Contact, " & _
                "Drawing_Release, Line_Number, Part_Description, Unit_Price, PO_Number, Delivery_Required_Date, unique_key, " & _
                "create_timestamp, last_modified) " & _
                "VALUES ('" & Replace(OE_Number, "'", "''") & "', '" & Replace(Job_Number, "'", "''") & "', '" & Replace(Customer_Name, "'", "''") & "', '" & _
                Replace(Job_Quantity, "'", "''") & "', '" & Replace(Part_Number, "'", "''") & "', '" & Replace(Revision, "'", "''") & "', '" & _
                Replace(Customer_Contact, "'", "''") & "', '" & Replace(Drawing_Release, "'", "''") & "', '" & Replace(Line_Number, "'", "''") & "', '" & _
                Replace(Part_Description, "'", "''") & "', '" & Replace(Unit_Price, "'", "''") & "', '" & Replace(PO_Number, "'", "''") & "', '" & _
                Replace(Delivery_Required_Date, "'", "''") & "', '" & Replace(Unique_Key, "'", "''") & "', datetime('now','localtime'), datetime('now','localtime'))"

    If ExecuteNonQuery(insertSQL) Then
       Debug.Print "New job added to jobs table: " & Job_Number
    Else
       Debug.Print "Failed to add new job to jobs table: " & Job_Number
    End If

    On Error GoTo 0
    
    ' 9. Close SQLite
    CloseSQLite
    Exit Sub
    
    'Debug.Print "AddNewJobToDB completed!"

HandleDuplicate:
    If Err.Number <> 0 Then
        Debug.Print "A record with the same Job Number, Line Number, and Delivery Required Date already exists.", vbExclamation
        Err.Clear
    End If
    CloseSQLite
    Exit Sub

End Sub

' Helper function to get the last row with data in a worksheet
Function LastRow(ws As Worksheet) As Long
    LastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
End Function

' Helper function to check if a table exists in the database
Function TableExists(tableName As String) As Boolean
    Dim sql As String, rs As Variant
    sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='" & tableName & "';"
    rs = ExecuteSQL(sql)
    TableExists = Not IsEmpty(rs)
End Function



