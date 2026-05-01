'/**
' * ThisWorkbook Module (thisworkbook.bas)
' * 
' * Workbook-level event handlers
' * Handles application startup and shutdown
' */

Option Explicit

' /**
'  * Workbook_Open event
'  * Triggered when the workbook is opened
'  * Initializes all data structures and mappings
'  */
Private Sub Workbook_Open()
    Call mod_DataInitialization.InitializeOnWorkbookOpen
End Sub
