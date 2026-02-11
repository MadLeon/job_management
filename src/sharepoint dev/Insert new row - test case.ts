/**
 * 测试文件：Insert new row from csv lines.ts
 * 
 * 目的：
 * - 提供 5 行模拟 OE CSV 数据
 * - 覆盖各种插入场景
 * - 观察 main() 函数的运行情况和日志输出
 * 
 * 运行方式：
 * 1. 在 Excel Online 中打开 PO Report 表
 * 2. 运行此脚本，查看控制台日志
 * 3. 验证表格中是否正确插入了数据
 */

function main(workbook: ExcelScript.Workbook, lines: string[]) {
    // ============================================================
    // 此处放入 Insert new row from csv lines.ts 中的 main() 函数内容
    // 为简化测试，我们在下方直接调用核心逻辑
    // ============================================================

    const sheet = workbook.getWorksheet("test");
    const table = sheet.getTable("Table22");

    const columnCount = table.getColumns().length;
    console.log(`table column count: ${columnCount}`);
    console.log(`incoming lines: ${lines.length}`);

    // ============ 阶段 1：准备（读取表数据）============
    const poIndex = table.getColumnByName("PO").getIndex();
    const orderIDIndex = table.getColumnByName("Order Item ID").getIndex();

    const dataRange = table.getRangeBetweenHeaderAndTotal();
    let values = dataRange.getValues();

    console.log(`table data rows: ${values.length}`);

    // ============ 阶段 2：构建 PO 映射（记录每个 PO 的行索引）============
    const poMap = new Map<string, number[]>();

    for (let i = 0; i < values.length; i++) {
        const po = values[i][poIndex] as string;
        if (po && po.trim()) {
            if (!poMap.has(po)) {
                poMap.set(po, []);
            }
            poMap.get(po)!.push(i);
        }
    }

    console.log(`PO map size: ${poMap.size}`);

    // ============ 阶段 3：处理新数据（收集插入操作）============
    interface Insertion {
        index: number;
        rows: string[][];
    }
    const insertions: Insertion[] = [];
    let insertionOffset = 0;

    lines.forEach((line, lineIndex) => {
        const parsed = parseOELine(line);
        const poNumber = parsed.poNumber.trim();

        console.log(`processing line ${lineIndex}: PO=${poNumber}, OrderItemID=${parsed.orderItemId}`);

        // 跳过 PO number 为空的行（无效数据）
        if (!poNumber) {
            console.warn(`  ⚠ skipping line ${lineIndex}: empty PO number`);
            return;
        }

        if (poMap.has(poNumber)) {
            // 方案 A：PO 存在 → 在该 PO 的最后一行后插入 order item 行
            const rowIndices = poMap.get(poNumber)!;
            const lastRowIndex = rowIndices[rowIndices.length - 1];
            const insertIndex = lastRowIndex + insertionOffset + 1;

            const orderItemRow = buildOrderItemRow(parsed, columnCount);
            insertions.push({ index: insertIndex, rows: [orderItemRow] });

            console.log(`  → PO exists at rows ${rowIndices}, inserting order item at index ${insertIndex}`);

            insertionOffset++;
            rowIndices.push(insertIndex);
        } else {
            // 方案 B：PO 不存在 → 先插入 PO 行，再插入 order item 行
            const insertIndex = values.length + insertionOffset;

            const poRow = buildPORow(poNumber, columnCount);
            const orderItemRow = buildOrderItemRow(parsed, columnCount);
            insertions.push({ index: insertIndex, rows: [poRow, orderItemRow] });

            console.log(`  → PO does not exist, inserting PO row + order item row at index ${insertIndex}`);

            insertionOffset += 2;
            poMap.set(poNumber, [insertIndex, insertIndex + 1]);
        }
    });

    console.log(`total insertions to execute: ${insertions.length}`);

    // ============ 阶段 4：逆序执行插入（避免索引混乱）============
    for (let i = insertions.length - 1; i >= 0; i--) {
        const { index, rows } = insertions[i];
        values.splice(index, 0, ...rows);
    }

    console.log(`final table rows after insertions: ${values.length}`);

    // ============ 阶段 5：一次性写回 Excel============
    dataRange.setValues(values);

    console.log(`✓ completed - all data written back to Excel`);
}

/**
 * 规范化 CSV 行，处理可能的 JSON 数组格式和引号
 */
function normalizeLine(line: string): string {
    const trimmed = line.trim();

    // 处理 ["xxx"] 这种 stringify
    if (trimmed.startsWith('[')) {
        const parsed: unknown = JSON.parse(trimmed);

        if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            typeof parsed[0] === 'string'
        ) {
            return parsed[0];
        }
    }

    // 去掉首尾引号
    return trimmed.replace(/^"|"$/g, '');
}

/**
 * 解析 OE CSV 行，提取关键字段
 */
function parseOELine(line: string): {
    orderItemId: string;
    poNumber: string;
    expeditor: string;
    drawingNumber: string;
    description: string;
    revision: string;
    jobNumber: string;
    oeDate: string;
    deliveryDate: string;
} {
    const actualLine = normalizeLine(line);
    const values = actualLine.split(',');

    return {
        orderItemId: values[26] ?? '',
        poNumber: values[11] ?? '',
        expeditor: values[6] ?? '',
        drawingNumber: values[4] ?? '',
        description: values[9] ?? '',
        revision: values[5] ?? '',
        jobNumber: values[1] ?? '',
        oeDate: values[7] ?? '',
        deliveryDate: values[15] ?? '',
    };
}

/**
 * 构造 PO 行（只有 PO number，其他字段为空）
 */
function buildPORow(poNumber: string, columnCount: number): string[] {
    const rowData: string[] = new Array(columnCount).fill('');
    rowData[2] = poNumber;
    return rowData;
}

/**
 * 构造 Order Item 行
 */
function buildOrderItemRow(
    parsed: ReturnType<typeof parseOELine>,
    columnCount: number
): string[] {
    const rowData: string[] = new Array(columnCount).fill('');
    rowData[0] = parsed.orderItemId;
    rowData[1] = '';
    rowData[2] = parsed.poNumber;
    rowData[3] = parsed.description;
    rowData[4] = parsed.revision;
    rowData[5] = parsed.jobNumber;
    rowData[6] = parsed.oeDate;
    rowData[7] = parsed.deliveryDate;
    return rowData;
}

/**
 * ============================================================
 * 测试数据和执行
 * ============================================================
 * 
 * 本测试包含 5 行 OE CSV 数据，覆盖以下场景：
 */

function testInsertNewRow(workbook: ExcelScript.Workbook) {
    // ============ 5 行测试数据 ============
    // 格式说明：CSV 行，按 OE CSV 的列顺序
    // 关键列：[1]=Job#, [4]=DrawingNum, [5]=Rev, [6]=Expeditor, [7]=OEDate, [9]=Description, [11]=PO, [15]=DeliveryDate, [26]=OrderItemID
    
    const testLines = [
        // 场景 1：新 PO，新 Order Item
        // PO="RT00-NEW-PN-R001", OrderItemID=5001
        // 预期：创建新 PO 行 + Order Item 行
        "38900,75001,Candu,10,RT00-NEW-0001-01-DD-1,1,David Weldon,2026/01/15,2,Test Component A,5000,RT00-NEW-PN-R001,,,,2026/06/15,,,,,,,,,,,5001",

        // 场景 2：现有 PO，新 Order Item（追加）
        // PO="RT79-79112-PN-R002", OrderItemID=5002
        // 预期：在该 PO 的最后一行后追加 Order Item 行
        "38901,75002,Candu,5,RT79-79112-0001-01-DD-1,0,Amritha Gopan,2025/05/26,1,Test Component B,3000,RT79-79112-PN-R002,,,,2026/01/26,,,,,,,,,,,5002",

        // 场景 3：新 PO（同场景 1），第 2 个 Order Item（多个 item 同一新 PO）
        // PO="RT00-NEW-PN-R001", OrderItemID=5003
        // 预期：在已创建的 PO 行下追加第 2 个 Order Item
        "38902,75003,Candu,3,RT00-NEW-0002-01-DD-1,2,David Weldon,2026/01/16,2,Test Component C,2500,RT00-NEW-PN-R001,,,,2026/06/20,,,,,,,,,,,5003",

        // 场景 4：另一个现有 PO，新 Order Item
        // PO="RT98-87290-PN-R004", OrderItemID=5004
        // 预期：在该 PO 的最后一行后追加 Order Item 行
        "38903,75004,Candu,2,RT98-87290-0001-01-DD-1,3,Wendy Wu,2025/08/12,1,Test Component D,4500,RT98-87290-PN-R004,,,,2026/12/17,,,,,,,,,,,5004",

        // 场景 5：新 PO（特殊字符），新 Order Item
        // PO="RT99-SPECIAL-PN-R001", OrderItemID=5005
        // 预期：创建新 PO 行 + Order Item 行，正确处理特殊字符
        "38904,75005,Candu,7,RT99-SPECIAL-0001-01-DD-1,1,Brandon Kwakye,2026/02/07,1,Special-Test Component,6000,RT99-SPECIAL-PN-R001,,,,2026/07/25,,,,,,,,,,,5005",
    ];

    console.log("\n");
    console.log("════════════════════════════════════════════════════════════════");
    console.log("🧪 TEST: Insert New Row from CSV Lines");
    console.log("════════════════════════════════════════════════════════════════");
    console.log("\n📋 测试数据说明：\n");
    console.log("  Line 1: 场景 1 - 新 PO (RT00-NEW-PN-R001), Order Item 5001");
    console.log("          预期：插入 PO 行 + Order Item 行");
    console.log("");
    console.log("  Line 2: 场景 2 - 现有 PO (RT79-79112-PN-R002), Order Item 5002");
    console.log("          预期：在现有 PO 最后一行后追加 Order Item 行");
    console.log("");
    console.log("  Line 3: 场景 3 - 新 PO (RT00-NEW-PN-R001), Order Item 5003");
    console.log("          预期：在已创建的 PO 下追加第 2 个 Order Item");
    console.log("");
    console.log("  Line 4: 场景 4 - 现有 PO (RT98-87290-PN-R004), Order Item 5004");
    console.log("          预期：在现有 PO 最后一行后追加 Order Item 行");
    console.log("");
    console.log("  Line 5: 场景 5 - 新 PO (RT99-SPECIAL-PN-R001), Order Item 5005");
    console.log("          预期：插入 PO 行 + Order Item 行（处理特殊字符）");
    console.log("\n════════════════════════════════════════════════════════════════\n");

    // 执行 main() 函数
    main(workbook, testLines);
}

// 执行测试
const wb = ExcelScript.getContext().application.getActiveWorkbook();
testInsertNewRow(wb);
