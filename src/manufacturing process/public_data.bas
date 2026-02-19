'/**
' * Global Variable Declaration
' * Used to store and access data throughout the workbook
' */

'* Whether the drawing file corresponding to J7 Drawing Number is an Assembly Drawing
'* True: is assembly drawing
'* False: is not assembly drawing
'* Empty: not asked or cancelled
Public is_assembly As Variant

'* 防止事件处理循环的标志
Public isProcessing As Boolean
