'/**
' * Export OE data to CSV
' * Save to SharePoint sync directory
' * Multi-user support: automatically adapt to each user's path
' */
Sub ExportToCSV()
    On Error GoTo ErrorHandler
    
    ' Get current user's home directory
    Dim userPath As String
    userPath = Environ("USERPROFILE")
    
    ' Build SharePoint sync path (different for each user)
    Dim csvFolderPath As String
    csvFolderPath = userPath & "\Record Technology & Development\Communication site - PO Data"
    
    ' Check if path exists
    If Len(userPath) = 0 Then
        MsgBox "Error: Unable to get user path", vbCritical
        Exit Sub
    End If
    
    ' Build CSV target path
    Dim csvPath As String
    csvPath = csvFolderPath & "\oe_export.csv"
    
    ' Check if target folder exists
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If Not fso.FolderExists(csvFolderPath) Then
        MsgBox "Error: Folder does not exist" & vbCrLf & csvFolderPath, vbCritical
        Exit Sub
    End If
    
    ' =============================================================================
    
    ' Prepare CSV data
    Dim csvContent As String
    Dim i As Integer
    
    ' CSV header
    csvContent = "ID,PO_Number,Quantity,Amount,Date,Status" & vbCrLf
    
    ' Generate 10 rows of sample data
    For i = 1 To 10
        csvContent = csvContent & _
            CStr(i) & "," & _
            "PO-2026-" & Format(i, "0000") & "," & _
            Format(Rnd() * 100, "0") & "," & _
            Format(Rnd() * 50000, "0.00") & "," & _
            Format(Now - Rnd() * 30, "yyyy-mm-dd") & "," & _
            Choose(Int(Rnd() * 3) + 1, "Pending", "In Progress", "Completed") & vbCrLf
    Next i
    
    ' Write CSV file (overwrite old file)
    Dim fileNum As Integer
    fileNum = FreeFile
    Open csvPath For Output As fileNum
    Print #fileNum, csvContent
    Close fileNum
    
    ' =============================================================================
    
    ' Success message
    MsgBox "CSV exported successfully" & vbCrLf & vbCrLf & _
           "File location: " & csvPath & vbCrLf & vbCrLf & _
           "File will be automatically synced to SharePoint", vbInformation
    
    Exit Sub
    
ErrorHandler:
    MsgBox "Error: " & Err.Description, vbCritical
End Sub
