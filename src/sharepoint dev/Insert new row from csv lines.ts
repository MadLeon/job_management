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
 * OE CSV 列映射：
 * [0]=PO, [1]=Job#, [4]=DrawingNum, [5]=Rev, [6]=Contact, [7]=OEDate, [9]=Desc, [11]=PONum, [15]=DeliveryDate, [26]=OrderItemID
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
 * 列顺序：Order Item ID, Expeditor, PO, Title, Rev, Job #, OE Date, PO Delivery, ...
 */
function buildPORow(poNumber: string, columnCount: number): string[] {
    const rowData: string[] = new Array(columnCount).fill('');
    // 列 C（索引 2）是 PO
    rowData[2] = poNumber;
    // TODO: 数据验证 - 如需要，可在此处添加值格式化或验证逻辑
    return rowData;
}

/**
 * 构造 Order Item 行
 * 列顺序对应 PO Report 表：
 * [0]=OrderItemID, [1]=Expeditor, [2]=PO, [3]=Title, [4]=Rev, [5]=JobNum, [6]=OEDate, [7]=PODelivery, ...
 */
function buildOrderItemRow(
    parsed: ReturnType<typeof parseOELine>,
    columnCount: number
): string[] {
    const rowData: string[] = new Array(columnCount).fill('');
    rowData[0] = parsed.orderItemId;   // Order Item ID
    rowData[1] = '';                   // Expeditor (留空)
    rowData[2] = parsed.poNumber;      // PO
    rowData[3] = parsed.description;   // Title
    rowData[4] = parsed.revision;      // Rev
    rowData[5] = parsed.jobNumber;     // Job #
    rowData[6] = parsed.oeDate;        // OE Date
    rowData[7] = parsed.deliveryDate;  // PO Delivery
    // TODO: 数据验证 - 如需要，可在此处添加值格式化或验证逻辑
    return rowData;
}

/**
 * 主函数 - 内存方案实现
 * 1. 读取表数据到内存
 * 2. 构建 PO 映射
 * 3. 处理新数据，收集插入操作
 * 4. 逆序执行插入（避免索引混乱）
 * 5. 一次性写回 Excel
 */
function main(workbook: ExcelScript.Workbook, lines: string[]) {
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
