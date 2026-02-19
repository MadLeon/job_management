'/**
' * mod_Integration.bas
' * 
' * Module Functionality:
' *   - Expose Fetch and Link operations as callable macros from Excel buttons
' *   - These are the main entry points called by Form buttons
' * 
' * Callable Macros:
' *   - FetchButton_Click() - Called by Fetch button
' *   - LinkButton_Click() - Called by Link button
' */

Option Explicit

'/**
' * Fetch Button Click Handler
' * 
' * This is the main entry point for the Fetch button
' * It searches for drawing files based on drawing number in J7 and PO in B7
' * 
' * Excel Setup:
' *   1. Create a Form Button on Sheet1 named "Fetch Button"
' *   2. Assign this macro: FetchButton_Click
' *   3. Button should be placed near J7 for user convenience
' */
Public Sub FetchButton_Click()
    Call FetchDrawingFiles_Main
End Sub

'/**
' * Link Button Click Handler
' * 
' * This is the main entry point for the Link button
' * It updates the database with the user's selected drawing file
' * 
' * Excel Setup:
' *   1. Create a Form Button on Sheet1 named "Link Button"
' *   2. Assign this macro: LinkButton_Click
' *   3. Button should be placed near column X for user convenience
' */
Public Sub LinkButton_Click()
    Call LinkDrawingFile_Main
End Sub
