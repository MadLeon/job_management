' mod_ExportCanduOrders.bas
' -------------------------------------------------------------------------------------------------
' Module Functionality:
'   - Export Candu orders from DELIVERY SCHEDULE sheet to CSV format
'   - Filters records where customer name contains "Candu"
'   - Exports to data folder with timestamp
' -------------------------------------------------------------------------------------------------
Option Explicit

' Export all Candu orders from DELIVERY SCHEDULE to CSV file
'
' Workflow:
' 1. Get all data from DELIVERY SCHEDULE sheet
' 2. Filter for records where Customer (column C) contains "Candu"
' 3. Export matching records to CSV file with timestamp
' 4. File is saved to data folder
' 5. Displays confirmation message with file path
Sub ExportCanduOrders()
    Dim deliveryWS As Worksheet
    Dim lastRow As Long, r As Long, c As Long
    Dim csvFilePath As String, csvContent As String
    Dim fileNumber As Integer
    Dim customerName As String
    Dim timestamp As String
    Dim headerRow As String
    Dim dataRow As String
    Dim columnCount As Integer
    Dim cell As Range
    Dim cellValue As String
    Dim poDataFolder As String

    On Error GoTo HandleError

    ' 1. Initialize worksheet reference
    Set deliveryWS = ThisWorkbook.Sheets("DELIVERY SCHEDULE")
    
    ' 2. Define PO Data folder path
    poDataFolder = Environ("USERPROFILE") & "\Record Technology & Development\Communication site - PO Data"
    
    ' 3. Generate timestamp for filename
    timestamp = Format(Now(), "yyyymmdd_hhmmss")
    
    ' 4. Build CSV file path (in PO Data folder)
    csvFilePath = poDataFolder & "\Candu_Orders_" & timestamp & ".csv"
    
    ' 5. Get last row with data
    lastRow = deliveryWS.Cells(deliveryWS.Rows.Count, 1).End(xlUp).row
    
    ' 6. Build header row (column names from first row)
    columnCount = 27 ' Based on DELIVERY SCHEDULE structure (A-AA columns)
    headerRow = BuildHeaderRow(deliveryWS, columnCount)
    csvContent = headerRow & vbCrLf
    
    ' 7. Iterate through data rows and filter for Candu orders
    For r = 2 To lastRow ' Start from row 2 (skip header)
        customerName = Trim(deliveryWS.Cells(r, 3).Value) ' Column C: Customer
        
        ' Check if customer name contains "Candu" (case-insensitive)
        If InStr(1, customerName, "Candu", vbTextCompare) > 0 Then
            ' Build and append data row to CSV content
            dataRow = BuildDataRow(deliveryWS, r, columnCount)
            csvContent = csvContent & dataRow & vbCrLf
        End If
    Next r
    
    ' 8. Delete old Candu order CSV files before creating new one
    Call DeleteOldCanduCSVFiles(poDataFolder)
    
    ' 9. Write CSV content to file
    fileNumber = FreeFile
    Open csvFilePath For Output As fileNumber
    Print #fileNumber, csvContent
    Close fileNumber
    
    ' 10. Display success message
    MsgBox "Candu orders exported successfully!" & vbCrLf & _
           "File: " & csvFilePath, vbInformation, "Export Complete"
    
    Exit Sub

HandleError:
    MsgBox "Error exporting Candu orders: " & Err.Description, vbCritical
End Sub

' Build CSV header row from column names in row 1
' Parameters: ws - Worksheet reference
'             colCount - Number of columns to include
' Returns: Comma-separated header row string
Function BuildHeaderRow(ws As Worksheet, colCount As Integer) As String
    Dim headerRow As String, c As Integer
    Dim cellValue As String
    
    For c = 1 To colCount
        cellValue = Trim(ws.Cells(1, c).Value)
        
        ' Escape quotes in cell value
        cellValue = Replace(cellValue, """", """""")
        
        ' Quote the cell value if it contains commas
        If InStr(cellValue, ",") > 0 Then
            cellValue = """" & cellValue & """"
        End If
        
        If c = 1 Then
            headerRow = cellValue
        Else
            headerRow = headerRow & "," & cellValue
        End If
    Next c
    
    BuildHeaderRow = headerRow
End Function

' Build CSV data row from worksheet row
' Parameters: ws - Worksheet reference
'             rowNum - Row number to extract
'             colCount - Number of columns to include
' Returns: Comma-separated data row string
Function BuildDataRow(ws As Worksheet, rowNum As Long, colCount As Integer) As String
    Dim dataRow As String, c As Integer
    Dim cellValue As String
    
    For c = 1 To colCount
        cellValue = Trim(ws.Cells(rowNum, c).Value)
        
        ' Escape quotes in cell value
        cellValue = Replace(cellValue, """", """""")
        
        ' Quote the cell value if it contains commas or quotes
        If InStr(cellValue, ",") > 0 Or InStr(cellValue, """") > 0 Then
            cellValue = """" & cellValue & """"
        End If
        
        If c = 1 Then
            dataRow = cellValue
        Else
            dataRow = dataRow & "," & cellValue
        End If
    Next c
    
    BuildDataRow = dataRow
End Function

' Delete old Candu order CSV files from the specified folder
' Parameters: folderPath - Path to the folder to search for old CSV files
' Finds all files matching pattern "Candu_Orders_*.csv" and deletes them
Sub DeleteOldCanduCSVFiles(folderPath As String)
    Dim fileName As String
    Dim filePath As String
    Dim deletedCount As Integer
    
    On Error GoTo ErrorHandler
    
    deletedCount = 0
    
    ' Find first matching file
    fileName = Dir(folderPath & "\Candu_Orders_*.csv")
    
    ' Loop through all matching files and delete them
    Do While fileName <> ""
        filePath = folderPath & "\" & fileName
        
        ' Delete the file
        Kill filePath
        deletedCount = deletedCount + 1
        Debug.Print "Deleted old CSV file: " & filePath
        
        ' Find next matching file
        fileName = Dir()
    Loop
    
    If deletedCount > 0 Then
        Debug.Print "Total old Candu CSV files deleted: " & deletedCount
    Else
        Debug.Print "No old Candu CSV files found to delete"
    End If
    
    Exit Sub

ErrorHandler:
    ' If error occurs, just continue (e.g., file in use)
    Debug.Print "Error deleting old CSV files: " & Err.Description
End Sub


