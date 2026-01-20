'/**
' * 全局变量声明
' * 用于在整个workbook中存储和访问数据
' */

'* J7 Drawing Number 对应的图纸是否为 Assembly Drawing
'* True: 是assembly drawing
'* False: 不是assembly drawing
'* Empty: 未询问或取消
Public is_assembly As Variant

'* 防止事件处理循环的标志
Public isProcessing As Boolean
