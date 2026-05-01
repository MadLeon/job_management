# xlsm 文件格式参考

## 文件基本信息

- **文件路径**: `src/manufacturing process/Manufacturing Process - dev.xlsm`
- **文件类型**: Excel Macro-Enabled Workbook (.xlsm)
- **Sheets数量**: 2

## Sheet 1: "mp" (Manufacturing Process)

### 尺寸

- 列数: 29 (A - AC)
- 行数: 44

### 列宽配置 (前10列)

```
A: 6.71
B: 10.71
C: 0.14 (隐藏列)
D: 7.00
E: 13.00
F: 7.71
G: 2.57
H: 1.43 (隐藏列)
I: 6.57
J: 6.00
```

### 内容特点

- 前5行通常为空或包含标题
- 第4行第10列包含标题: "MANUFACTURING PROCESS..."
- 数据从第6行开始

## Sheet 2: "data" (数据参考)

### 尺寸

- 列数: 7
- 行数: 73

### 列宽配置

```
A: 5.86
B: 10.57
C: 11.86
D: 27.57
E: 9.71
F: 10.00
G: 9.14
```

### 内容结构

| Row | A (Code) | B   | C   | D (Detail)                   | E   | F   | G   |
| --- | -------- | --- | --- | ---------------------------- | --- | --- | --- |
| 1   | Code     | -   | -   | Detail                       | -   | -   | -   |
| 2   | P        | -   | -   | P = Purchase                 | -   | -   | -   |
| 3   | FI       | -   | -   | FI = Free Issued Material    | -   | -   | -   |
| 4   | RT       | -   | -   | RT = Record to Manufacturing | -   | -   | -   |
| 5   | SC       | -   | -   | SC = Subcontract             | -   | -   | -   |

### 编码说明

- **P**: Purchase (采购)
- **FI**: Free Issued Material (免费发放物料)
- **RT**: Record to Manufacturing (记录到制造)
- **SC**: Subcontract (分包)

## 使用此格式的场景

当需要创建或修改Manufacturing Process相关的Excel文件时，参考此格式：

- 维护Sheet命名约定 ('mp' 和 'data')
- 保持相似的列宽设置
- 遵循数据编码方案
- 使用相同的数据验证编码

## 分析脚本

用于分析此格式的Python脚本: `./analyze_excel_simple.py`
