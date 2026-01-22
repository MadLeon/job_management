Sub SyncAll()
    ' Interface for all functions
    Call SyncJobsDBAndOrderEntryLog
    Call SyncCurrentSheetAndJobsDB
    Call UpdateAssemblies
    Call FormatPrioritySheet
End Sub