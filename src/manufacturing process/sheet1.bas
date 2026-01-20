'/**
' * Sheet1 事件处理
' * 监控J7格子的变化并触发assembly drawing确认
' */

'/**
' * 当J7单元格被修改时触发
' * 询问该drawing number是否对应assembly drawing
' */
Private Sub Worksheet_Change(ByVal Target As Range)
  On Error GoTo ErrorHandler
  
  '* 防止事件处理循环
  If isProcessing Then Exit Sub
  isProcessing = True
  
  '* 检查修改的单元格是否为J7
  If Not Intersect(Target, Me.Range("J7")) Is Nothing Then
    Call HandleJ7Change()
  End If
  
  isProcessing = False
  Exit Sub
  
ErrorHandler:
  isProcessing = False
  MsgBox "错误: " & Err.Description, vbCritical, "事件处理错误"
End Sub

'/**
' * 处理J7单元格变化
' * 弹出对话框询问drawing number是否为assembly drawing
' */
Private Sub HandleJ7Change()
  Dim drawingNumber As String
  Dim response As VbMsgBoxResult
  Dim message As String
  
  '* 获取J7的值（Drawing Number）
  drawingNumber = Me.Range("J7").Value
  
  '* 如果J7为空，则重置is_assembly
  If Len(Trim(drawingNumber)) = 0 Then
    is_assembly = Empty
    Exit Sub
  End If
  
  '* 构建询问消息
  message = "Drawing Number: " & drawingNumber & vbCrLf & vbCrLf & _
            "该图纸是否为 Assembly Drawing?"
  
  '* 弹出确认对话框
  response = MsgBox(message, vbYesNoCancel + vbQuestion, _
                    "Drawing Type Confirmation")
  
  '* 根据用户选择保存结果
  Select Case response
    Case vbYes
      is_assembly = True
    Case vbNo
      is_assembly = False
    Case vbCancel
      is_assembly = Empty
  End Select
End Sub
