' mod_PublicData.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Store global variables in this file, so that all modules can share data listed here
'   - Provide getters and setters for each variable
' -------------------------------------------------------------------------------------------------
Option Explicit

Public Const DB_PATH As String = "D:\work\Record Tech\job_management\data\record.db"
Public lastEditedRow As Long

Public Function GetLastEditedRow() As Long
    GetLastEditedRow = lastEditedRow
End Function

Public Sub SetLastEditedRow(ByVal row As Long)
    lastEditedRow = row
End Sub
