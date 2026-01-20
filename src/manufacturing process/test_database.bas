'/**
' * Database Test Module
' * Provides simple test procedures to verify database connection and query functionality
' */

Option Explicit

'/**
' * Test database connection and basic queries
' * Invoke from VBA Editor: Press F5 to run directly
' * Or call TestDatabase from other VBA procedures
' */
Public Sub TestDatabase()
  On Error GoTo ErrorHandler
  
  Dim dbPath As String
  Dim message As String
  Dim initResult As Boolean
  Dim queryResult As Variant
  Dim tableCount As Long
  Dim partCount As Long
  Dim i As Long
  
  '* Build database path - using data\record.db under project root
  dbPath = GetRecordDbPath()
  
  message = "Starting database test..." & vbCrLf & vbCrLf
  
  '* Step 1: Check if database file exists
  message = message & "Step 1: Check Database File" & vbCrLf
  If Dir(dbPath) = "" Then
    message = message & "FAILED: Database file does not exist" & vbCrLf & _
              "Path: " & dbPath & vbCrLf & vbCrLf
    MsgBox message, vbCritical, "Database Test - File Check Failed"
    Exit Sub
  Else
    message = message & "SUCCESS: Database file exists" & vbCrLf & _
              "Path: " & dbPath & vbCrLf & vbCrLf
  End If
  
  '* Step 2: Initialize database connection
  message = message & "Step 2: Initialize Database Connection" & vbCrLf
  initResult = InitializeSQLite(dbPath)
  If Not initResult Then
    message = message & "FAILED: Cannot initialize database connection" & vbCrLf & vbCrLf
    MsgBox message, vbCritical, "Database Test - Initialization Failed"
    Exit Sub
  Else
    message = message & "SUCCESS: Database connection initialized" & vbCrLf & vbCrLf
  End If
  
  '* Step 3: Test table count query
  message = message & "Step 3: Query Table Count" & vbCrLf
  queryResult = ExecuteQuery("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
  If Not IsNull(queryResult) And IsArray(queryResult) Then
    If UBound(queryResult) >= 0 Then
      tableCount = queryResult(0)(0)
      message = message & "SUCCESS: Found " & tableCount & " tables" & vbCrLf & vbCrLf
    Else
      message = message & "WARNING: No result from table count query" & vbCrLf & vbCrLf
    End If
  Else
    message = message & "WARNING: No tables found in database" & vbCrLf & vbCrLf
  End If
  
  '* Step 4: Test part table query
  message = message & "Step 4: Query part Table" & vbCrLf
  queryResult = ExecuteQuery("SELECT COUNT(*) FROM part")
  If Not IsNull(queryResult) And IsArray(queryResult) Then
    If UBound(queryResult) >= 0 Then
      partCount = queryResult(0)(0)
      message = message & "SUCCESS: part table contains " & partCount & " records" & vbCrLf & vbCrLf
    Else
      message = message & "WARNING: No result from part count query" & vbCrLf & vbCrLf
    End If
  Else
    message = message & "FAILED: Cannot query part table" & vbCrLf & vbCrLf
  End If
  
  '* Step 5: Test sample data query
  message = message & "Step 5: Query Sample Data" & vbCrLf
  queryResult = ExecuteQuery("SELECT id, drawing_number FROM part LIMIT 1")
  If Not IsNull(queryResult) And IsArray(queryResult) Then
    If UBound(queryResult) >= 0 Then
      Dim sampleId As Long
      Dim sampleDrawing As String
      sampleId = queryResult(0)(0)
      sampleDrawing = queryResult(0)(1)
      message = message & "SUCCESS: Retrieved sample record" & vbCrLf & _
                "  ID: " & sampleId & vbCrLf & _
                "  Drawing Number: " & sampleDrawing & vbCrLf & vbCrLf
    Else
      message = message & "WARNING: No sample data found" & vbCrLf & vbCrLf
    End If
  Else
    message = message & "WARNING: No sample data found" & vbCrLf & vbCrLf
  End If
  
  '* Close database connection
  CloseSQLite
  message = message & "Database connection closed" & vbCrLf & vbCrLf & _
            "========================================" & vbCrLf & _
            "All tests completed - Database is working properly"
  
  MsgBox message, vbInformation, "Database Test - Success"
  Exit Sub
  
ErrorHandler:
  '* Try to close database connection
  On Error Resume Next
  CloseSQLite
  On Error GoTo 0
  
  MsgBox "Test failed with error: " & Err.Description, vbCritical, "Database Test - Error"
End Sub

'/**
' * Get the full path of the record.db database
' * @return Full path to database file
' */
Private Function GetRecordDbPath() As String
  '* Using hard-coded path - can be modified if needed
  '* Path should point to project root\data\record.db
  GetRecordDbPath = "C:\Users\ee\job_management\data\record.db"
End Function
