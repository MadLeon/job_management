'/**
' * Button Event Handler Class (cls_InsertButtonHandler.cls)
' *
' * Class module to manage Insert button click events
' * Uses OnAction property binding with Application.Caller for compatibility
' * 
' * Design:
' * 1. Each button gets a handler instance (stored in mod_ButtonManager.handlersByRow)
' * 2. Button OnAction property points to mod_ButtonManager.HandleButtonClick
' * 3. HandleButtonClick uses Application.Caller to identify the button
' * 4. Handler instance is invoked to process the click
' */

Option Explicit

Private mRowNumber As Long

' /**
'  * Initialize handler with row number
'  * Called during button creation to associate handler with row
'  * 
'  * @param rowNumber: The row number where button is located (12-39)
'  */
Public Sub Initialize(rowNumber As Long)
    mRowNumber = rowNumber
End Sub

' /**
'  * Get the stored row number
'  * @return: Row number for this button
'  */
Public Function GetRowNumber() As Long
    GetRowNumber = mRowNumber
End Function

' /**
'  * Handle button click event
'  * Processes the Insert action for this button's row
'  * 
'  * Called by mod_ButtonManager.HandleButtonClick when button is clicked
'  */
Public Sub HandleButtonClick()
    On Error GoTo ErrorHandler
    
    Call mod_InsertProcess.OnInsertButtonClick(mRowNumber)
    
    Exit Sub
    
ErrorHandler:
    Call lib_logger.LogError("cls_InsertButtonHandler.HandleButtonClick failed: " & Err.Description)
    MsgBox "Button click handler error: " & Err.Description, vbCritical, "Button Handler Error"
End Sub
