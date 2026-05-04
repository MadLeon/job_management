'/**
' * mod_Integration.bas
' * 
' * Module Functionality:
' *   - Expose QR code generation as a callable macro from Excel buttons
' *   - This is the main entry point called by Form buttons
' * 
' * Callable Macros:
' *   - TestQRCodeGeneration() - Called by QR Code Test button
' */

Option Explicit

'/**
' * QR Code Generation Test Function
' * 
' * This function tests the QR code generation and insertion functionality
' * 
' * Test Behavior:
' *   1. Generates a QR code with sample data
' *   2. Inserts the QR code image into cell A1 of Sheet1
' *   3. Logs the operation to mp_log.txt
' * 
' * Excel Setup:
' *   1. Open the VBA editor (Alt+F11)
' *   2. Run this function: TestQRCodeGeneration()
' *   3. Or create a button and assign this macro
' * 
' * Verification:
' *   1. Check Sheet1 cell A1 for QR code image
' *   2. Check mp_log.txt for detailed operation logs
' */
Public Sub TestQRCodeGeneration()
    Dim qrUrl As String
    Dim result As Boolean
    Dim testPO As String
    Dim testJob As String
    Dim testLine As String
    Dim testDrawing As String
    
    On Error GoTo ErrorHandler
    
    ' Read data from specific cells
    ' PO: B7, Job: Q6, Line: F7, Drawing: J7
    ' Empty cells are allowed and will be represented as empty strings
    testPO = CStr(Sheet1.Range("B7").Value)
    testJob = CStr(Sheet1.Range("Q6").Value)
    testLine = CStr(Sheet1.Range("F7").Value)
    testDrawing = CStr(Sheet1.Range("J7").Value)
    
    ' Handle empty values (convert "" to empty string for clarity)
    If testPO = "" Or testPO = "0" Then testPO = ""
    If testJob = "" Or testJob = "0" Then testJob = ""
    If testLine = "" Or testLine = "0" Then testLine = ""
    If testDrawing = "" Or testDrawing = "0" Then testDrawing = ""
    
    ' Generate QR code (empty fields are allowed)
    qrUrl = GenerateQRCode(testPO, testJob, testLine, testDrawing)
    
    ' Check if generation succeeded
    If Len(qrUrl) = 0 Then
        MsgBox "Failed to generate QR code. Check mp_log.txt for details.", vbCritical
        Exit Sub
    End If
    
    ' Insert image into Sheet1 cell A1 (size reduced to 75x75)
    result = InsertQRCodeImage(Sheet1, qrUrl, "A1", 75, 75)
    
    If result Then
        ' QR code image inserted successfully (no message box)
    Else
        MsgBox "Failed to insert QR code image. Check mp_log.txt for details.", vbCritical
    End If
    
    Exit Sub
    
ErrorHandler:
    MsgBox "Error in TestQRCodeGeneration: " & Err.Description, vbCritical
End Sub
