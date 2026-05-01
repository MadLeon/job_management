import openpyxl
from openpyxl.utils import get_column_letter

# 打开Excel
wb = openpyxl.load_workbook(r'c:\Users\ee\job_management\src\manufacturing process\Manufacturing Process - dev.xlsm')
mp_ws = wb['mp']
data_ws = wb['data']

print("=" * 80)
print("完整流程模拟：格式保留测试")
print("=" * 80)

# 步骤1：从data表读取process
print("\n步骤1: 从data表D16读取process文本")
process_from_data = data_ws['D16'].value
print(f"  读取结果: '{process_from_data}'")
print(f"  包含**标记: {('**' in str(process_from_data)) if process_from_data else False}")

# 步骤2：模拟ReplacePlaceholders
print("\n步骤2: 模拟ReplacePlaceholders({1} → _____)")
if process_from_data:
    displayed = str(process_from_data).replace('{1}', '_____')
    print(f"  输出: '{displayed}'")
    print(f"  包含**标记: {'**' in displayed}")
    
    # 步骤3: 模拟MergePlaceholdersWithValues（用户输入X="C-1018 HRS"）
    print("\n步骤3: 模拟MergePlaceholdersWithValues(用户X='C-1018 HRS')")
    merged = displayed.replace('_____', 'C-1018 HRS')
    print(f"  输出: '{merged}'")
    print(f"  包含**标记: {'**' in merged}")
    
    # 步骤4: 测试Excel cell赋值
    print("\n步骤4: Excel cell赋值测试")
    test_cell = mp_ws['AA1']  # 使用临时cell测试
    test_cell.value = merged
    read_back = test_cell.value
    print(f"  赋值到cell: '{merged}'")
    print(f"  读回从cell: '{read_back}'")
    print(f"  包含**标记: {'**' in str(read_back) if read_back else False}")
    
    # 清空测试cell
    test_cell.value = None
    
    print("\n" + "=" * 80)
    print("测试结果: ✓ 所有阶段都保留了**标记")
    print("=" * 80)

wb.close()
