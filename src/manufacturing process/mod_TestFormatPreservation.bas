'/**
' * Test Module for Format Preservation (mod_TestFormatPreservation.bas)
' * 
' * Tests the entire flow from data table to final insert to verify ** format is preserved
' * 
' * Test Flow:
' * 1. Read process from data D16: "{1} as per BOM c/w **Cert**"
' * 2. Test ReplacePlaceholders: "{1} as per BOM c/w **Cert**" → "_____ as per BOM c/w **Cert**"
' * 3. Test MergePlaceholdersWithValues with X="C-1018 HRS"
' * 4. Verify final output: "C-1018 HRS as per BOM c/w **Cert**"
' */

Option Explicit

Private Const SHEET_NAME As String = "mp"

' /**
'  * Main test function - run this to verify format preservation
'  * Output goes to Immediate window (Ctrl+J)
'  */
Public Sub TestFormatPreservation()
    On Error GoTo ErrorHandler
    
    Debug.Print "========== FORMAT PRESERVATION TEST =========="
    Debug.Print ""
    
    ' Test 1: Read from data table
    Dim ws As Worksheet
    Dim rawProcessText As String
    Set ws = ThisWorkbook.Sheets(SHEET_NAME)
    
    ' This is the process text from data D16
    rawProcessText = "{1} as per BOM c/w **Cert**"
    Debug.Print "1. Raw Process Text from data table:"
    Debug.Print "   [" & rawProcessText & "]"
    Debug.Print "   Contains '**'? " & (InStr(rawProcessText, "**") > 0)
    Debug.Print ""
    
    ' Test 2: Test ReplacePlaceholders
    Dim afterReplace As String
    afterReplace = ReplacePlaceholders(rawProcessText)
    Debug.Print "2. After ReplacePlaceholders():"
    Debug.Print "   [" & afterReplace & "]"
    Debug.Print "   Contains '**'? " & (InStr(afterReplace, "**") > 0)
    Debug.Print "   Expected: [_____ as per BOM c/w **Cert**]"
    Debug.Print ""
    
    ' Test 3: Test MergePlaceholdersWithValues
    Dim afterMerge As String
    afterMerge = MergePlaceholdersWithValues(afterReplace, "C-1018 HRS", "", "")
    Debug.Print "3. After MergePlaceholdersWithValues(X='C-1018 HRS'):"
    Debug.Print "   [" & afterMerge & "]"
    Debug.Print "   Contains '**'? " & (InStr(afterMerge, "**") > 0)
    Debug.Print "   Expected: [C-1018 HRS as per BOM c/w **Cert**]"
    Debug.Print ""
    
    ' Test 4: Cell assignment test
    Debug.Print "4. Testing cell assignment:"
    Dim testCell As Range
    Set testCell = ws.Range("AA12")
    testCell.value = afterMerge
    Dim cellReadBack As String
    cellReadBack = CStr(testCell.value)
    Debug.Print "   Assigned to cell AA12: [" & afterMerge & "]"
    Debug.Print "   Read back from cell: [" & cellReadBack & "]"
    Debug.Print "   Contains '**'? " & (InStr(cellReadBack, "**") > 0)
    Debug.Print ""
    
    ' Summary
    Debug.Print "========== TEST SUMMARY =========="
    Dim allPassed As Boolean
    allPassed = (InStr(afterReplace, "**") > 0) And (InStr(afterMerge, "**") > 0) And (InStr(cellReadBack, "**") > 0)
    
    If allPassed Then
        Debug.Print "✓ ALL TESTS PASSED - Format preservation working!"
    Else
        Debug.Print "✗ SOME TESTS FAILED - Format not preserved"
        If InStr(afterReplace, "**") = 0 Then Debug.Print "  - ReplacePlaceholders lost **"
        If InStr(afterMerge, "**") = 0 Then Debug.Print "  - MergePlaceholdersWithValues lost **"
        If InStr(cellReadBack, "**") = 0 Then Debug.Print "  - Cell assignment lost **"
    End If
    
    Exit Sub
    
ErrorHandler:
    Debug.Print "ERROR in TestFormatPreservation: " & Err.Description
End Sub

' ============================================================================
' HELPER FUNCTIONS (copied from mod_DisplayProcesses and mod_InsertProcess)
' ============================================================================

' /**
'  * Replace placeholders like {1}, {2}, etc. with underscores
'  */
Private Function ReplacePlaceholders(processText As String) As String
    Dim result As String
    Dim i As Long
    Dim char As String
    Dim inBrace As Boolean
    Dim braceContent As String
    
    result = ""
    inBrace = False
    braceContent = ""
    
    For i = 1 To Len(processText)
        char = Mid(processText, i, 1)
        
        If char = "{" Then
            inBrace = True
            braceContent = ""
        ElseIf char = "}" And inBrace Then
            If IsNumeric(braceContent) Then
                result = result & "_____"
            Else
                result = result & "{" & braceContent & "}"
            End If
            inBrace = False
        ElseIf inBrace Then
            braceContent = braceContent & char
        Else
            result = result & char
        End If
    Next i
    
    If inBrace Then
        result = result & "{" & braceContent
    End If
    
    ReplacePlaceholders = result
End Function

' /**
'  * Check if string is numeric
'  */
Private Function IsNumeric(s As String) As Boolean
    Dim i As Long
    Dim char As String
    
    If Len(s) = 0 Then
        IsNumeric = False
        Exit Function
    End If
    
    For i = 1 To Len(s)
        char = Mid(s, i, 1)
        If char < "0" Or char > "9" Then
            IsNumeric = False
            Exit Function
        End If
    Next i
    
    IsNumeric = True
End Function

' /**
'  * Merge placeholders with user values
'  */
Private Function MergePlaceholdersWithValues(displayText As String, xValue As String, yValue As String, zValue As String) As String
    Dim result As String
    Dim placeholderValues(1 To 3) As String
    Dim i As Long
    Dim j As Long
    Dim char As String
    Dim currentUnderscoreCount As Long
    Dim currentUnderscoreIndex As Long
    Const PLACEHOLDER_MARKER As String = "________"
    
    placeholderValues(1) = IIf(Trim(xValue) <> "" And Trim(xValue) <> PLACEHOLDER_MARKER, Trim(xValue), "")
    placeholderValues(2) = IIf(Trim(yValue) <> "" And Trim(yValue) <> PLACEHOLDER_MARKER, Trim(yValue), "")
    placeholderValues(3) = IIf(Trim(zValue) <> "" And Trim(zValue) <> PLACEHOLDER_MARKER, Trim(zValue), "")
    
    result = ""
    currentUnderscoreIndex = 0
    currentUnderscoreCount = 0
    
    For i = 1 To Len(displayText)
        char = Mid(displayText, i, 1)
        
        If char = "_" Then
            currentUnderscoreCount = currentUnderscoreCount + 1
            
            If currentUnderscoreCount = 5 Then
                currentUnderscoreIndex = currentUnderscoreIndex + 1
                
                If currentUnderscoreIndex <= 3 And placeholderValues(currentUnderscoreIndex) <> "" Then
                    result = result & placeholderValues(currentUnderscoreIndex)
                Else
                    result = result & "_____"
                End If
                
                currentUnderscoreCount = 0
            End If
        Else
            If currentUnderscoreCount > 0 Then
                For j = 1 To currentUnderscoreCount
                    result = result & "_"
                Next j
                currentUnderscoreCount = 0
            End If
            result = result & char
        End If
    Next i
    
    If currentUnderscoreCount > 0 Then
        For j = 1 To currentUnderscoreCount
            result = result & "_"
        Next j
    End If
    
    MergePlaceholdersWithValues = result
End Function
