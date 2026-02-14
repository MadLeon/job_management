function main(workbook: ExcelScript.Workbook) {
  // 获取工作表和表格
  let sheet = workbook.getWorksheet("Report");
  let table = sheet.getTable("Table2");

  // ============ 阶段 1：删除空行 ============
  console.log("🧹 [阶段 1] 删除空行...");
  let dataRange = table.getRangeBetweenHeaderAndTotal();
  let tableValues = dataRange.getValues();

  console.log(`  删除前行数: ${tableValues.length}`);

  let deletedCount = 0;
  // 从最后一行往上遍历，删除所有空行
  for (let i = tableValues.length - 1; i >= 0; i--) {
    const rowValues = tableValues[i];

    // 判断整行是否为空
    const isEmpty = rowValues.every((cell) => cell === null || cell === '');

    if (isEmpty) {
      table.deleteRowsAt(i, 1);
      deletedCount++;
    }
  }

  console.log(`  ✓ 已删除 ${deletedCount} 行空行`);

  // 重新获取表格范围（含表头和总计）
  let fullRange = table.getRange();
  // 重新获取表格范围（不含表头和总计，用于排序）
  dataRange = table.getRangeBetweenHeaderAndTotal();
  tableValues = dataRange.getValues();

  console.log(`  ✓ 删除后行数: ${tableValues.length}`);

  // ============ 阶段 2：排序和设置边框 ============
  // 获取列索引
  let poIndex = table.getColumnByName("PO").getIndex();
  let expeditorIndex = table.getColumnByName("Expeditor").getIndex();
  let orderIDIndex = table.getColumnByName("Order Item ID").getIndex();

  // 获取值用于排序
  let values = dataRange.getValues();

  // -----------------------------
  // 第一次排序：PO + Order Item ID（空在最上）
  // -----------------------------
  values.sort((a, b) => {
    if (a[poIndex] < b[poIndex]) return -1;
    if (a[poIndex] > b[poIndex]) return 1;

    let aID = a[orderIDIndex];
    let bID = b[orderIDIndex];

    if (aID === null || aID === "" || aID === undefined) return -1;
    if (bID === null || bID === "" || bID === undefined) return 1;

    return Number(aID) - Number(bID);
  });

  // -----------------------------
  // 第二次排序：Expeditor 升序（空值排在最后）
  // -----------------------------
  values.sort((a, b) => {
    let aExp = a[expeditorIndex];
    let bExp = b[expeditorIndex];
    
    // 两个都为空
    if ((aExp === null || aExp === "") && (bExp === null || bExp === "")) {
      return 0;
    }
    
    // a为空，b不为空 -> a排在后面
    if (aExp === null || aExp === "") {
      return 1;
    }
    
    // b为空，a不为空 -> a排在前面
    if (bExp === null || bExp === "") {
      return -1;
    }
    
    // 都不为空，正常比较
    if (aExp < bExp) return -1;
    if (aExp > bExp) return 1;
    return 0;
  });

  // 写回表格
  dataRange.setValues(values);

  // 清除所有边框，从头开始
  let borders = fullRange.getFormat().getBorders();
  borders.forEach(border => {
    border.setStyle(ExcelScript.BorderLineStyle.none);
  });

  // 重新获取范围并设置细边框
  fullRange = table.getRange();

  // 设置整个表格细边框 (edges: 0=top, 1=bottom, 2=left, 3=right, 4=horizontal, 5=vertical)
  let edgeBorders = fullRange.getFormat().getBorders();
  edgeBorders[0].setStyle(ExcelScript.BorderLineStyle.continuous); // top
  edgeBorders[1].setStyle(ExcelScript.BorderLineStyle.continuous); // bottom
  edgeBorders[2].setStyle(ExcelScript.BorderLineStyle.continuous); // left
  edgeBorders[3].setStyle(ExcelScript.BorderLineStyle.continuous); // right
  edgeBorders[4].setStyle(ExcelScript.BorderLineStyle.continuous); // inside horizontal
  edgeBorders[5].setStyle(ExcelScript.BorderLineStyle.continuous); // inside vertical

  // -----------------------------
  // 在PO变化行上方设置粗边框
  let lastPO: string | number | null = null;
  for (let i = 0; i < values.length; i++) {
    let currentPO = values[i][poIndex] as string | number;

    if (lastPO !== null && currentPO !== lastPO) {
      let rowRange = dataRange.getRow(i);
      let rowBorders = rowRange.getFormat().getBorders();

      // 只设置这一行的顶部边框为粗线 (index 0 = top)
      rowBorders[0].setStyle(ExcelScript.BorderLineStyle.continuous);
      rowBorders[0].setWeight(ExcelScript.BorderWeight.thick);
    }

    lastPO = currentPO;
  }
}
