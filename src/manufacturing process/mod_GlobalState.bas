'/**
' * mod_GlobalState.bas
' * 
' * Module Functionality:
' *   - Store and manage global state for Link process
' *   - Share data between Fetch and Link operations
' * 
' * Variables:
' *   - m_lastResults: Array of last query results
' *   - m_lastResultsCount: Count of results
' *   - m_lastPartId: Part ID from query
' */

Option Explicit

' Store results from Fetch operation for use by Link operation
Private m_lastResults As Variant
Private m_lastResultsCount As Long
Public m_lastPartId As Variant

'/**
' * Store array of results from Fetch operation
' * Called by FetchDrawingFiles_Main
' * 
' * Accepts Variant array and stores it globally
' */
Public Sub SetLastResults(resultsArray As Variant)
    On Error Resume Next
    
    m_lastResults = resultsArray
    
    ' Handle empty result case
    If IsArray(resultsArray) Then
        On Error Resume Next
        m_lastResultsCount = UBound(resultsArray, 1) + 1
        On Error GoTo 0
        If m_lastResultsCount < 0 Then
            m_lastResultsCount = 0
        End If
    Else
        m_lastResultsCount = 0
    End If
    
    LogDebug "GlobalState: Stored " & m_lastResultsCount & " results"
End Sub

'/**
' * Retrieve a specific result row as a 1D array
' * Called by LinkDrawingFile_Main
' */
Public Function GetStoredResult(resultIndex As Long) As Variant
    Dim result() As Variant
    Dim colCount As Long
    Dim colNum As Long
    
    On Error Resume Next
    
    If resultIndex >= 0 And resultIndex < m_lastResultsCount And IsArray(m_lastResults) Then
        ' Extract one row from 2D array into 1D array
        colCount = UBound(m_lastResults, 2) + 1
        ReDim result(0 To colCount - 1)
        
        For colNum = 0 To UBound(m_lastResults, 2)
            result(colNum) = m_lastResults(resultIndex, colNum)
        Next colNum
        
        GetStoredResult = result
    End If
End Function

'/**
' * Check if results are available
' * Called by LinkDrawingFile_Main
' */
Public Function HasStoredResults() As Boolean
    HasStoredResults = m_lastResultsCount > 0 And IsArray(m_lastResults)
End Function

'/**
' * Get all results array
' * Used by Update operations
' */
Public Function GetAllStoredResults() As Variant
    If IsArray(m_lastResults) Then
        GetAllStoredResults = m_lastResults
    Else
        GetAllStoredResults = Null
    End If
End Function

'/**
' * Get stored results count
' */
Public Function GetStoredResultsCount() As Long
    GetStoredResultsCount = m_lastResultsCount
End Function
