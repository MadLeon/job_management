Option Explicit

' --- Configuration Variables ---
Const DB_PATH As String = "\\rtdnas2\OE\jobs.db" ' Update with the actual network path
Const OE_ENTRY_PATH As String = "\\rtdnas2\OE\order entry log.xlsm" ' Update with the actual network path

' sync oe entry to jobs.db, then sync current workbook to jobs.db
Sub SyncJobsDBAndOrderEntryLog()
    ' --- Goal: jobs.db == oeentry(DELIVERY SCHEDULE), This file (DELIVERY SCHEDULE) ˜ jobs.db ---
    Dim dbPath As String, dbHandle As LongPtr, result As Long, stmtHandle As LongPtr
    Dim jobsDBExists As Boolean
    Dim srcEntryApp As Object, srcEntryBook As Workbook, srcEntryWS As Worksheet
    Dim curBook As Workbook, curWS As Worksheet, shippedWS As Worksheet
    Dim lastRowEntry As Long, lastRowCur As Long
    Dim entryDict As Object, dbDict As Object, curDict As Object
    Dim r As Long, i As Integer
    Dim insertSQL As String, selectSQL As String, deleteSQL As String
    Dim k As Variant

    dbPath = DB_PATH
    jobsDBExists = (Dir(dbPath) <> "")

    ' 1. Initialize DLL
    result = SQLite3Initialize(ThisWorkbook.Path)
    If result <> SQLITE_INIT_OK Then
        MsgBox "SQLite3 initialization failed": Exit Sub
    End If

    ' 2. Open/Create database
    result = SQLite3Open(dbPath, dbHandle)
    If result <> SQLITE_OK Then
        MsgBox "Unable to open database: " & SQLite3ErrMsg(dbHandle): SQLite3Free: Exit Sub
    End If

    ' 3. Create table if not exists, all fields as TEXT type
    If Not jobsDBExists Then
        Dim sqlCreate As String
        sqlCreate = "CREATE TABLE IF NOT EXISTS jobs (" & _
            "job_id INTEGER PRIMARY KEY AUTOINCREMENT, " & _
            "oe_number TEXT, job_number TEXT, customer_name TEXT, job_quantity TEXT, " & _
            "part_number TEXT, revision TEXT, customer_contact TEXT, drawing_release TEXT, line_number TEXT, " & _
            "part_description TEXT, unit_price TEXT, po_number TEXT, packing_slip TEXT, packing_quantity TEXT, " & _
            "invoice_number TEXT, delivery_required_date TEXT, delivery_shipped_date TEXT, " & _
            "create_timestamp TEXT DEFAULT (datetime('now','localtime')), last_modified TEXT)"

        result = SQLite3PrepareV2(dbHandle, sqlCreate, stmtHandle)
        If result = SQLITE_OK Then SQLite3Step stmtHandle: SQLite3Finalize stmtHandle
        Debug.Print "Database jobs.db created and jobs table initialized (all fields as TEXT)"
    Else
        Debug.Print "Database jobs.db already exists"
    End If

    ' 4. Open DELIVERY SCHEDULE sheet in order entry log.xlsm (read-only, background)
    Set srcEntryApp = CreateObject("Excel.Application")
    srcEntryApp.Visible = False
    srcEntryApp.DisplayAlerts = False
    Set srcEntryBook = srcEntryApp.Workbooks.Open(OE_ENTRY_PATH, ReadOnly:=True)
    Set srcEntryWS = srcEntryBook.Sheets("DELIVERY SCHEDULE")
    lastRowEntry = srcEntryWS.Cells(srcEntryWS.rows.Count, 1).End(-4162).row
    Debug.Print "Number of rows in oe entry: ", lastRowEntry - 3

    ' 5. Build dictionary: oeentry(Job_Number as key)
    Set entryDict = CreateObject("Scripting.Dictionary")
    For r = 4 To lastRowEntry
        If Trim(srcEntryWS.Cells(r, 2).Value) <> "" Then
            entryDict(Trim(srcEntryWS.Cells(r, 2).Value)) = r
        End If
    Next
    Debug.Print "Number of Job_Number in oe entry: ", entryDict.Count

    ' 6. Build dictionary of current Job_Number in database
    Set dbDict = CreateObject("Scripting.Dictionary")
    selectSQL = "SELECT Job_Number FROM jobs"
    result = SQLite3PrepareV2(dbHandle, selectSQL, stmtHandle)
    If result = SQLITE_OK Then
        Do While SQLite3Step(stmtHandle) = 100
            dbDict(Trim(SQLite3ColumnText(stmtHandle, 0))) = 1
        Loop
        SQLite3Finalize stmtHandle
    End If
    Debug.Print "Number of Job_Number in jobs.db: ", dbDict.Count

    ' 7. ============ A. Synchronize database and oe entry (strong consistency) =============
    '   - 1) Add: oe entry has (db does not) ==> insert into db
    '   - 2) Delete: db has (oe entry does not) ==> delete from db
    insertSQL = "INSERT INTO jobs (OE_Number, Job_Number, Customer_Name, Job_Quantity, Part_Number, Revision, Customer_Contact, " & _
      "Drawing_Release, Line_Number, Part_Description, Unit_Price, PO_Number, Packing_Slip, Packing_Quantity, Invoice_Number, Delivery_Required_Date, Delivery_Shipped_Date, Last_Modified) " & _
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

    ' (1) Add, all use SQLite3BindText
    Dim addedToDB As Long
    addedToDB = 0
    For Each k In entryDict.Keys
        If Not dbDict.Exists(k) Then
            r = entryDict(k)
            result = SQLite3PrepareV2(dbHandle, insertSQL, stmtHandle)
            If result = SQLITE_OK Then
                For i = 1 To 17
                    SQLite3BindText stmtHandle, i, Trim(srcEntryWS.Cells(r, i).Text)
                Next
                SQLite3BindText stmtHandle, 18, Format(Now, "yyyy-mm-dd HH:nn:ss")
                SQLite3Step stmtHandle
                SQLite3Finalize stmtHandle
                ' Debug.Print "Added to database: Job_Number=" & k
                addedToDB = addedToDB + 1
            End If
        End If
    Next
    Debug.Print "Number of entries added to database this time: ", addedToDB

    ' (2) Delete
    Dim deletedFromDB As Long
    deletedFromDB = 0
    For Each k In dbDict.Keys
        If Not entryDict.Exists(k) Then
            deleteSQL = "DELETE FROM jobs WHERE Job_Number = ?"
            result = SQLite3PrepareV2(dbHandle, deleteSQL, stmtHandle)
            If result = SQLITE_OK Then
                SQLite3BindText stmtHandle, 1, k
                SQLite3Step stmtHandle
                SQLite3Finalize stmtHandle
                Debug.Print "Deleted from database: Job_Number=" & k
                deletedFromDB = deletedFromDB + 1
            End If
        End If
    Next
    Debug.Print "Number of entries deleted from database this time: ", deletedFromDB

    srcEntryBook.Close False
    srcEntryApp.Quit
    Set srcEntryBook = Nothing
    Set srcEntryWS = Nothing
    Set srcEntryApp = Nothing
    
    SQLite3Close dbHandle
    SQLite3Free
    
    Debug.Print "Synchronization between oe entry and jobs.db completed!"
End Sub


