' mod_SQLite.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Provide helper functions for user to interact with SQLite database
' -------------------------------------------------------------------------------------------------

Option Explicit

Private Const SQLITE_OK As Long = 0
Private Const SQLITE_ROW As Long = 100
Private Const SQLITE_DONE As Long = 101

#If Win64 Then
    Private Type SQLiteDB
        dbHandle As LongPtr
        dbPath As String
        initialized As Boolean
    End Type
#Else
    Private Type SQLiteDB
        dbHandle As Long
        dbPath As String
        initialized As Boolean
    End Type
#End If

' SQL Database object
Private thisDB As SQLiteDB

Public Function InitializeSQLite(dbPath As String) As Boolean
    ' Initialize SQLite database connection
    If thisDB.initialized Then
    Debug.Print "SQLite is already initialized."
        InitializeSQLite = True
        Exit Function
    End If

    thisDB.dbPath = dbPath

    ' 1. Initialize SQLite3
    Dim result As Long
    result = SQLite3Initialize(ThisWorkbook.Path)
    If result <> SQLITE_INIT_OK Then
    MsgBox "SQLite3 initialization failed. Please check if SQLite3.dll and SQLite3_StdCall.dll are in the same directory.": InitializeSQLite = False: Exit Function
    End If

    ' 2. Connect to the database
    result = SQLite3Open(dbPath, thisDB.dbHandle)
    If result <> SQLITE_OK Then
    MsgBox "Unable to open database " & dbPath & ". Please check if the file exists and permissions.": SQLite3Free: InitializeSQLite = False: Exit Function
    End If

    thisDB.initialized = True
    InitializeSQLite = True
End Function

Public Sub CloseSQLite()
    ' Close SQLite database connection and release resources

    If Not thisDB.initialized Then Exit Sub

    ' 1. Close database connection
    Dim result As Long
    result = SQLite3Close(thisDB.dbHandle)
    If result <> SQLITE_OK Then
    Debug.Print "Error closing database connection: " & SQLite3ErrMsg(thisDB.dbHandle)
    End If

    ' 2. Release SQLite3 resources
    SQLite3Free
    thisDB.initialized = False

End Sub

' Execute SQL query and return result set (if applicable)
Public Function ExecuteQuery(sql As String) As Variant

    If Not thisDB.initialized Then
    Debug.Print "SQLite is not initialized."
        ExecuteQuery = Null
        Exit Function
    End If

    Dim stmtHandle As LongPtr, result As Long, i As Long, colCount As Long
    Dim results() As Variant, row() As Variant
    Dim rowNum As Long, colNum As Long

    ' 1. Prepare SQL statement
    result = SQLite3PrepareV2(thisDB.dbHandle, sql, stmtHandle)
    If result <> SQLITE_OK Then
    Debug.Print "Error preparing SQL statement: " & SQLite3ErrMsg(thisDB.dbHandle)
        ExecuteQuery = Null
        Exit Function
    End If

    ' 2. Get column count
    colCount = SQLite3ColumnCount(stmtHandle)

    ' 3. Execute query and get results
    rowNum = 0
    Do While SQLite3Step(stmtHandle) = SQLITE_ROW
        ReDim Preserve results(rowNum)
        ReDim row(colCount - 1)

        For colNum = 0 To colCount - 1
            Select Case SQLite3ColumnType(stmtHandle, colNum)
                Case SQLITE_INTEGER
                    row(colNum) = SQLite3ColumnInt32(stmtHandle, colNum)
                Case SQLITE_FLOAT
                    row(colNum) = SQLite3ColumnDouble(stmtHandle, colNum)
                Case SQLITE_TEXT
                    row(colNum) = SQLite3ColumnText(stmtHandle, colNum)
                Case SQLITE_NULL
                    row(colNum) = Null
                Case Else
                    row(colNum) = Null ' Handle BLOB or other types if needed
            End Select
        Next colNum

        results(rowNum) = row
        rowNum = rowNum + 1
    Loop

    ' 4. Finalize statement
    SQLite3Finalize stmtHandle

    ' 5. Return results
    If rowNum > 0 Then
        ExecuteQuery = results
    Else
        ExecuteQuery = Null
    End If

End Function

' Execute non-query SQL statement (INSERT, UPDATE, DELETE)
Public Function ExecuteNonQuery(sql As String) As Boolean
    Dim stmtHandle As LongPtr
    Dim result As Long
    Dim prepareSuccess As Boolean

    ExecuteNonQuery = False  ' default: fail

    If Not thisDB.initialized Then
        Debug.Print "SQLite is not initialized."
        Exit Function
    End If

    ' -------------------------
    ' 1. Prepare SQL statement
    ' -------------------------
    result = SQLite3PrepareV2(thisDB.dbHandle, sql, stmtHandle)
    If result <> SQLITE_OK Then
        Debug.Print "Error preparing SQL: " & SQLite3ErrMsg(thisDB.dbHandle)
        GoTo CleanExit     ' still need finalize
    End If
    prepareSuccess = True

    ' -------------------------
    ' 2. Execute statement
    ' -------------------------
    result = SQLite3Step(stmtHandle)
    If result <> SQLITE_DONE Then
        Debug.Print "Error executing SQL: " & SQLite3ErrMsg(thisDB.dbHandle)
        GoTo CleanExit
    End If

    ' success
    ExecuteNonQuery = True

CleanExit:
    ' -------------------------
    ' 3. Finalize (ALWAYS)
    ' -------------------------
    If prepareSuccess Then
        SQLite3Finalize stmtHandle
    End If

End Function

Public Function GetDBHandle() As LongPtr
    GetDBHandle = thisDB.dbHandle
End Function

