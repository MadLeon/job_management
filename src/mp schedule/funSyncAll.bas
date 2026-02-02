Sub SyncAll()
    ' Interface for all functions
    ' Sync Priority Sheet with record.db database
    Call SyncPrioritySheetWithDB
    ' Format the sheet
    Call FormatPrioritySheet
End Sub