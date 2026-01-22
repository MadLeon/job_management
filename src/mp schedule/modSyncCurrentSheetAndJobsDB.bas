' --- Configuration Variables ---
Const DB_PATH As String = "\\rtdnas2\OE\jobs.db"

Sub SyncCurrentSheetAndJobsDB()
    ' Synchronize local test.xlsm with jobs.db content:
    ' 1. If a job exists in the local Priority Sheet but not in the database, move it to the Shipped sheet
    ' 2. If a job exists in the database but not in the local Priority Sheet, append it to the end of the Priority Sheet and format it

    Dim dbPath As String, dbHandle As LongPtr, result As Long, stmtHandle As LongPtr
    Dim curBook As Workbook, curWS As Worksheet, shippedWS As Worksheet
    Dim lastRowCur As Long
    Dim dbDict As Object, curDict As Object
    Dim selectSQL As String, r As Long, k As Variant
    Dim jobNum As String, firstPartRow As Long

    dbPath = DB_PATH
    Set curBook = ThisWorkbook
    
    ' Get or create Priority Sheet and set header
    On Error Resume Next
    Set curWS = curBook.Sheets("Priority Sheet")
    If curWS Is Nothing Then
        Set curWS = curBook.Sheets.Add(After:=curBook.Sheets(curBook.Sheets.Count))
        curWS.Name = "Priority Sheet"
    End If
    On Error GoTo 0

    ' Set header A1:I1
    With curWS
        .Range("A1:I1").Value = Array("JOB #", "PO #", "Customer", "Description", "Part #", "Qty.", "Ship Date", "Memo", "Status")
    End With

    lastRowCur = GetLastDataRow(curWS)

    ' 1. Initialize DLL
    result = SQLite3Initialize(ThisWorkbook.Path)
    If result <> 0 Then
        MsgBox "SQLite3 initialization failed": Exit Sub
    End If
    result = SQLite3Open(dbPath, dbHandle)
    If result <> 0 Then
        MsgBox "Unable to open database": Exit Sub
    End If

    ' 2. Get job list from database
    Set dbDict = CreateObject("Scripting.Dictionary")
    selectSQL = "SELECT Job_Number, PO_Number, Customer_Name, Part_description, Part_Number, Job_Quantity, Delivery_Required_Date FROM jobs"
    result = SQLite3PrepareV2(dbHandle, selectSQL, stmtHandle)
    If result = 0 Then
        Do While SQLite3Step(stmtHandle) = 100
            jobNum = Trim(SQLite3ColumnText(stmtHandle, 0))
            If jobNum <> "" Then
                Dim jobData(6) As Variant
                jobData(0) = SQLite3ColumnText(stmtHandle, 0) ' Job_Number
                jobData(1) = SQLite3ColumnText(stmtHandle, 1) ' PO_Number
                jobData(2) = SQLite3ColumnText(stmtHandle, 2) ' Customer_Name
                jobData(3) = SQLite3ColumnText(stmtHandle, 3) ' Part_Description
                jobData(4) = SQLite3ColumnText(stmtHandle, 4) ' Part_Number
                jobData(5) = SQLite3ColumnText(stmtHandle, 5) ' Job_Quantity
                jobData(6) = SQLite3ColumnText(stmtHandle, 6) ' Delivery_Required_Date
                dbDict(jobNum) = jobData
            End If
        Loop
        SQLite3Finalize stmtHandle
    End If

    ' 3. Scan Priority Sheet
    Set curDict = CreateObject("Scripting.Dictionary")
    For r = 2 To lastRowCur
        jobNum = Trim(curWS.Cells(r, 1).Value) 'JOB # ÔÚµÚ1ÁÐ
        If jobNum <> "" Then
            curDict(jobNum) = r
        End If
    Next

    ' 4.  Get or create Shipped sheet
    On Error Resume Next
    Set shippedWS = curBook.Sheets("Shipped")
    If shippedWS Is Nothing Then
        Set shippedWS = curBook.Sheets.Add(After:=curBook.Sheets(curBook.Sheets.Count))
        shippedWS.Name = "Shipped"
    ' Set Shipped sheet header
        shippedWS.Range("A1:I1").Value = Array("JOB #", "PO #", "Customer", "Description", "Part #", "Qty.", "Ship Date", "Memo", "Status")
        With shippedWS.Range(shippedWS.Cells(1, 1), shippedWS.Cells(1, 10))
            .Interior.Color = RGB(255, 199, 206) ' Light red color
            .Font.Bold = True
            .Font.Size = 16
            .Font.Name = "Cambria"
            .HorizontalAlignment = xlCenter
            With .Borders
                .LineStyle = xlContinuous
                .Color = vbBlack
                .Weight = xlThin
            End With
        End With
        shippedWS.Range(shippedWS.Cells(1, 1), shippedWS.Cells(1, 10)).EntireColumn.AutoFit
    End If
    On Error GoTo 0

    ' -------- 5. Process rows to move from Priority Sheet to Shipped --------
    Dim movedCount As Long: movedCount = 0
    r = 2 ' Start from the first data row
    Do While r <= lastRowCur
        jobNum = Trim(curWS.Cells(r, 1).Value)
        If jobNum <> "" Then  ' If this is a Job row
            If Not dbDict.Exists(jobNum) Then
                ' Get the number of parts under this job
                Dim partsCount As Long
                partsCount = CountParts(curWS, r)

                ' Calculate total rows to move
                Dim totalRowsToMove As Long
                totalRowsToMove = 1 + partsCount

                ' Get the last row of the Shipped sheet
                Dim shipLastRow As Long: shipLastRow = GetLastDataRow(shippedWS) + 1

                ' Move rows
                curWS.rows(r).Resize(totalRowsToMove).Copy shippedWS.rows(shipLastRow)

                ' Delete rows
                curWS.rows(r).Resize(totalRowsToMove).Delete

                ' Update row count
                movedCount = movedCount + totalRowsToMove
                lastRowCur = GetLastDataRow(curWS)

                ' IMPORTANT: Sync r value to avoid skipping rows
                r = r - 1 ' Because of deletion, recheck this row
                If r < 2 Then r = 2 ' Prevent r from being less than header

             Else
                 r = r + 1 'Jump to next job start position
            End If
        End If

        r = r + 1
        If r > lastRowCur Then Exit Do
    Loop
    Debug.Print "Total moved " & movedCount & " rows"

    ' -------- 7. Only trigger autofit if data was moved --------
    If movedCount > 0 Then
        Dim shippedLastRow As Long
        Dim shippedUsedRng As Range
        shippedLastRow = shippedWS.Cells(shippedWS.rows.Count, 1).End(-4162).row
        Set shippedUsedRng = shippedWS.Range(shippedWS.Cells(1, 1), shippedWS.Cells(shippedLastRow, 10)) ' °üº¬JÁÐ
        shippedUsedRng.Columns.AutoFit
    End If

    ' -------- 8. If a job exists in the database but not in the local Priority Sheet, add it to Priority Sheet, insert blank rows, and format --------
    Dim rg As Range
    Dim assemblySQL As String, assemblyStmtHandle As LongPtr, drawingNumber As String
    Dim jobInfoSQL As String, jobInfoStmtHandle As LongPtr
    Dim partDescription As String, jobQuantity As String, drawingRelease As String
    For Each k In dbDict.Keys
        If Not curDict.Exists(k) Then
            ' Append record to Priority Sheet
            lastRowCur = lastRowCur + 1

            ' Fetch content from database and add new data by field
            With curWS
                .Cells(lastRowCur, 1).Value = dbDict(k)(0) 'JOB #
                .Cells(lastRowCur, 2).Value = dbDict(k)(1) 'PO #
                .Cells(lastRowCur, 3).Value = dbDict(k)(2) 'Customer
                .Cells(lastRowCur, 4).Value = dbDict(k)(3) 'Description
                .Cells(lastRowCur, 5).Value = dbDict(k)(4) 'Part #
                .Cells(lastRowCur, 6).Value = dbDict(k)(5) 'Qty.
                .Cells(lastRowCur, 7).Value = dbDict(k)(6) 'Ship Date
            End With

            ' Call CreateSingleHyperlink to add hyperlink
            Call CreateSingleHyperlink(curWS.Cells(lastRowCur, 5))

            ' Set data row area: columns A-G, set to orange
            Set rg = curWS.Range(curWS.Cells(lastRowCur, 1), curWS.Cells(lastRowCur, 7))
            With rg
                .Interior.Color = RGB(255, 199, 44) ' Orange
            End With

            ' Set gray background for blank row
            lastRowCur = lastRowCur + 1
            
            Set rg = curWS.Range(curWS.Cells(lastRowCur, 1), curWS.Cells(lastRowCur, 7))
            With rg
                .Interior.Color = RGB(242, 242, 242) ' Light gray
            End With

            ' Query assemblies table to get drawing_number
            Dim partNumber As String: partNumber = dbDict(k)(4) ' Part #
            assemblySQL = "SELECT drawing_number FROM assemblies WHERE part_number = '" & partNumber & "'"
            result = SQLite3PrepareV2(dbHandle, assemblySQL, assemblyStmtHandle)
            If result = 0 Then
                Dim firstDrawing As Boolean: firstDrawing = True
                Do While SQLite3Step(assemblyStmtHandle) = 100
                    drawingNumber = Trim(SQLite3ColumnText(assemblyStmtHandle, 0))
                    If drawingNumber <> "" Then
                        ' Query jobs table by drawing_number to get part_description and job_quantity
                        jobInfoSQL = "SELECT Part_description, Job_Quantity, Drawing_Release FROM jobs WHERE Part_Number = '" & drawingNumber & "'"
                        Dim jobInfoResult As Long: jobInfoResult = SQLite3PrepareV2(dbHandle, jobInfoSQL, jobInfoStmtHandle)
                        If jobInfoResult = 0 Then
                            If SQLite3Step(jobInfoStmtHandle) = 100 Then
                                partDescription = Trim(SQLite3ColumnText(jobInfoStmtHandle, 0))
                                jobQuantity = Trim(SQLite3ColumnText(jobInfoStmtHandle, 1))
                                drawingRelease = Trim(SQLite3ColumnText(jobInfoStmtHandle, 2))

                                If firstDrawing Then
                                    ' For the first drawing_number, operate directly on the current gray background row
                                    curWS.Cells(lastRowCur, 5).Value = drawingNumber ' Col E: drawing_number
                                    curWS.Cells(lastRowCur, 4).Value = partDescription ' Col D: part_description
                                    curWS.Cells(lastRowCur, 6).Value = jobQuantity ' Col F: job_quantity
                                    curWS.Cells(lastRowCur, 7).Value = drawingRelease ' Col G: drawing_release
                                    firstDrawing = False
                                Else
                                    ' For subsequent drawing_numbers, add a gray row first
                                    lastRowCur = lastRowCur + 1
                                    Set rg = curWS.Range(curWS.Cells(lastRowCur, 1), curWS.Cells(lastRowCur, 7))
                                    With rg
                                        .Interior.Color = RGB(242, 242, 242) ' Light gray
                                    End With

                                    ' Then fill in the queried info
                                    curWS.Cells(lastRowCur, 5).Value = drawingNumber ' Col E: drawing_number
                                    curWS.Cells(lastRowCur, 4).Value = partDescription ' Col D: part_description
                                    curWS.Cells(lastRowCur, 6).Value = jobQuantity ' Col F: job_quantity
                                    curWS.Cells(lastRowCur, 7).Value = drawingRelease ' Col G: drawing_release
                                End If
                            End If
                            SQLite3Finalize jobInfoStmtHandle
                        End If
                    End If
                Loop
                SQLite3Finalize assemblyStmtHandle
            End If
        End If
    Next

    ' -------- 9. Complete cleanup --------
    SQLite3Close dbHandle
    SQLite3Free
    Set curDict = Nothing: Set dbDict = Nothing
    Set srcEntryBook = Nothing: Set srcEntryWS = Nothing: Set srcEntryApp = Nothing

    Debug.Print "Local file and database synchronization completed"
End Sub

'Í³¼ÆÁã²¿¼þ·½·¨£º
Function CountParts(ws As Worksheet, startRow As Long) As Long
    Dim r As Long
    Dim lastRowD As Long, lastRowE As Long
    
    CountParts = 0

    ' Get the last data row in columns D and E
    lastRowD = ws.Cells(ws.rows.Count, "D").End(xlUp).row
    lastRowE = ws.Cells(ws.rows.Count, "E").End(xlUp).row

    ' Use the larger one as the base
    Dim lastRow As Long
    If lastRowD >= lastRowE Then
        lastRow = lastRowD
    Else
        lastRow = lastRowE
    End If

    Debug.Print "CountParts: startRow = " & startRow & ", lastRowD = " & lastRowD & ", lastRowE = " & lastRowE

    If startRow >= lastRow Then
      lastRow = startRow + 1
    End If

    r = startRow + 1 ' Start from the next row

    Do While r <= lastRow
        If Trim(ws.Cells(r, 1).Value) <> "" Then
            Debug.Print "CountParts: Found next Job at row " & r & ", part info ends"
            Exit Do ' Found next Job, exit
        End If

        CountParts = CountParts + 1
        r = r + 1 ' Move to next row
    Loop

    Debug.Print "CountParts: Found " & CountParts & " parts for Job at row " & startRow
    CountParts = CountParts
End Function

Function GetLastDataRow(ws As Worksheet) As Long
    ' Get the last data row in Priority Sheet (combine columns A, D, E)

  Dim lastRowA As Long, lastRowD As Long, lastRowE As Long

    ' Get the last row in columns A, D, E
  lastRowA = ws.Cells(ws.rows.Count, "A").End(xlUp).row
  lastRowD = ws.Cells(ws.rows.Count, "D").End(xlUp).row
  lastRowE = ws.Cells(ws.rows.Count, "E").End(xlUp).row

    ' Compare D and E results
  Dim lastRowDE As Long
  If lastRowD >= lastRowE Then
     lastRowDE = lastRowD
  Else
     lastRowDE = lastRowE
  End If

    ' If D or E is greater than A, take the larger of D/E, otherwise +1
  If lastRowDE > lastRowA Then
     GetLastDataRow = lastRowDE
  Else
     If lastRowA < 2 Then
       GetLastDataRow = 1
     Else
       GetLastDataRow = lastRowA + 1 ' È·±£ÐÂÐÐ
     End If
  End If

    Debug.Print "GetLastDataRow: lastRowA=" & lastRowA & ", lastRowD=" & lastRowD & ", lastRowE=" & lastRowE & ", Result=" & GetLastDataRow
End Function


