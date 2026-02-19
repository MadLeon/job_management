'/**
' * mod_FetchDrawingFiles.bas
' * 
' * Module Functionality:
' *   - Handle Fetch button click event
' *   - Orchestrate the query workflow
' *   - Display results and status messages
' * 
' * Key Functions:
' *   - FetchDrawingFiles_Main() - Main handler for Fetch button
' */

Option Explicit

'/**
' * Main handler for Fetch button
' * 
' * Workflow:
' *   1. Get drawing_number from J7 and po_number from B7
' *   2. Validate inputs
' *   3. Query part table for part_id
' *   4. Query drawing_file table for matching files
' *   5. Clear previous results
' *   6. Display new results in column X
' *   7. Show result count in T8
' * 
' * Called by: Fetch button click event
' */
Public Sub FetchDrawingFiles_Main()
    Dim ws As Worksheet
    Dim drawingNumber As String
    Dim poNumber As String
    Dim partId As Variant
    Dim resultsArray As Variant
    Dim bestMatchIndex As Long
    Dim resultCount As Long
    Dim messageText As String
    
    On Error GoTo ErrorHandler
    
    ' Initialize log block for this operation
    StartLogBlock
    
    Set ws = ActiveSheet
    
    ' 1. Get input values
    drawingNumber = Trim(ws.Range("J7").Value)
    poNumber = Trim(ws.Range("B7").Value)
    
    LogInfo "FetchDrawingFiles_Main started - Drawing: " & drawingNumber & ", PO: " & poNumber
    
    ' 2. Validate inputs
    If drawingNumber = "" Then
        messageText = "Drawing number cannot be empty. Please enter drawing number in J7."
        ws.Range("T8").Value = messageText
        LogError messageText
        MsgBox messageText, vbExclamation, "Input Validation Error"
        FlushLogBlock
        Exit Sub
    End If
    
    If poNumber = "" Then
        LogDebug "PO number is empty. This is OK, will search without PO filter."
        poNumber = ""
    End If
    
    ' 3. Query part table
    LogDebug "Querying part table for drawing_number=" & drawingNumber
    partId = QueryPartByDrawingNumber(drawingNumber)
    
    ' Store partId for later use by Link button
    m_lastPartId = partId
    
    ' 4. Query drawing_file table
    LogDebug "Querying drawing_file table"
    resultsArray = QueryDrawingFiles(drawingNumber, poNumber)
    
    resultCount = GetResultCount(resultsArray)
    LogDebug "Found " & resultCount & " results"
    
    ' Check if any results found
    If resultCount = 0 Then
        messageText = "Drawing not found"
        ws.Range("T8").Value = messageText
        Call ClearResults
        LogInfo "No drawing files found for " & drawingNumber
        MsgBox messageText, vbInformation, "No Results"
        FlushLogBlock
        Exit Sub
    End If
    
    ' 5. Store results for Link button
    Call SetLastResults(resultsArray)
    
    ' 6. Clear previous display
    Call ClearResults
    
    ' 7. Get best match index
    bestMatchIndex = GetBestMatchingResultIndex(resultsArray)
    
    ' 8. Display results
    Call DisplayQueryResults(resultsArray, bestMatchIndex)
    
    ' 9. Show status message with count
    messageText = "Found " & resultCount & " results"
    ws.Range("T8").Value = messageText
    
    LogInfo "FetchDrawingFiles_Main completed - " & messageText
    FlushLogBlock
    Exit Sub
    
ErrorHandler:
    messageText = "Error: " & Err.Description
    ws.Range("T8").Value = messageText
    LogError "Error in FetchDrawingFiles_Main: " & Err.Description
    FlushLogBlock
    MsgBox messageText, vbExclamation, "Error"
End Sub

