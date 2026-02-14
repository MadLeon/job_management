Sub MPDataXfer()
Application.ScreenUpdating = False

Dim oeLog As Workbook
Dim mpTemplate As Workbook
Dim oeSheet As Worksheet
Dim mpSheet As Worksheet
Dim sourceRow As Long
Dim mpFilePath As String

On Error GoTo ErrorHandler

' 定义文件路径
mpFilePath = "D:\work\Record Tech\job_management\src\manufacturing process\Manufacturing Process.xlsm"

' 获取当前活跃的 OE Log workbook
Set oeLog = ActiveWorkbook
Set oeSheet = oeLog.ActiveSheet

' 【重要】在打开 MP 文件之前获取 OE 文件的行号
sourceRow = ActiveCell.Row

Debug.Print "========== 调试信息 =========="
Debug.Print "打开 MP 前 - ActiveCell: " & ActiveCell.Address
Debug.Print "打开 MP 前 - 获取的行号: " & sourceRow
Debug.Print "打开 MP 前 - Workbook: " & ActiveWorkbook.Name

' 打开 MP 模板文件
Set mpTemplate = Workbooks.Open(mpFilePath)
Set mpSheet = mpTemplate.Sheets("sheet1")

Debug.Print "打开 MP 后 - ActiveCell: " & ActiveCell.Address
Debug.Print "打开 MP 后 - ActiveWorkbook: " & ActiveWorkbook.Name
Debug.Print "使用的 sourceRow: " & sourceRow

' ========== 数据映射：OE 列 -> MP 单元格 ==========
mpSheet.Range("n6").Value = oeSheet.Cells(sourceRow, 1).Value    ' A -> N6
mpSheet.Range("q6").Value = oeSheet.Cells(sourceRow, 2).Value    ' B -> Q6
mpSheet.Range("b6").Value = oeSheet.Cells(sourceRow, 3).Value    ' C -> B6
mpSheet.Range("q9").Value = oeSheet.Cells(sourceRow, 4).Value    ' D -> Q9
mpSheet.Range("j7").Value = oeSheet.Cells(sourceRow, 5).Value    ' E -> J7
mpSheet.Range("n9").Value = oeSheet.Cells(sourceRow, 7).Value    ' G -> N9
mpSheet.Range("b8").Value = oeSheet.Cells(sourceRow, 8).Value    ' H -> B8
mpSheet.Range("f7").Value = oeSheet.Cells(sourceRow, 9).Value    ' I -> F7
mpSheet.Range("h8").Value = oeSheet.Cells(sourceRow, 10).Value   ' J -> H8
mpSheet.Range("d9").Value = oeSheet.Cells(sourceRow, 16).Value   ' P -> D9

' 保存 MP 模板
mpTemplate.Save

' 切回 OE Log
oeLog.Activate

Application.ScreenUpdating = True
Debug.Print "Success!"

Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    Debug.Print "Error occurred: " & Err.Description
End Sub