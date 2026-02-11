function main(workbook: ExcelScript.Workbook) {
  // 获取工作表和表格
  // let sheet = workbook.getWorksheet("Report");
  // let table = sheet.getTable("Table2");
  let sheet = workbook.getWorksheet("test");
  let table = sheet.getTable("Table22");

  // 获取表格范围（含表头和总计）
  let fullRange = table.getRange();
  // 获取表格范围（不含表头和总计，用于排序）
  let dataRange = table.getRangeBetweenHeaderAndTotal();
  let values = dataRange.getValues();

  // 获取列索引
  let poIndex = table.getColumnByName("PO").getIndex();
  let expeditorIndex = table.getColumnByName("Expeditor").getIndex();
  let orderIDIndex = table.getColumnByName("Order Item ID").getIndex();
  let numberIndex = table.getColumnByName("PO / Drawing #").getIndex();

  // const po_number = values[11];
  // 查找表格的B列, 看是否有值等于po_number
  // 如果没找到, 先插入一行PO行
  // PO行的结构如下:
  // const poRowData: string[] = new Array(columnCount).fill('');
  // rowData[0] = '';
  // rowData[1] = values[11] ?? '';
  // rowData[2] = values[6] ?? '';
  // rowData[3] = values[4] ?? '';   // drawing number
  // rowData[4] = '';
  // rowData[5] = '0';
  // rowData[6] = '';   // job number
  // rowData[7] = values[7] ?? '';   // drawing release date
  // rowData[8] = values[15] ?? '';  // delivery required date
  // table.addRow(-1, rowData);

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
  // 第二次排序：Expeditor 升序
  // -----------------------------
  values.sort((a, b) => {
    if (a[expeditorIndex] < b[expeditorIndex]) return -1;
    if (a[expeditorIndex] > b[expeditorIndex]) return 1;
    return 0;
  });

  // 写回表格
  dataRange.setValues(values);

  // -----------------------------
  // 设置整个表格细边框
  // -----------------------------
  let borders = fullRange.getFormat().getBorders();
  borders.forEach(border => {
    border.setStyle(ExcelScript.BorderLineStyle.continuous);
    border.setWeight(ExcelScript.BorderWeight.thin);
  });

  // -----------------------------
  // 在PO变化行上方设置粗边框
  // -----------------------------
  let lastPO: string | number | null = null;
  for (let i = 0; i < values.length; i++) {
    let currentPO = values[i][poIndex] as string | number;

    if (lastPO !== null && currentPO !== lastPO) {
      let rowFormat = dataRange.getRow(i).getFormat();
      let rowBorders = rowFormat.getBorders();

      if (rowBorders && rowBorders.length > 0 && rowBorders[0]) {
        rowBorders[0].setStyle(ExcelScript.BorderLineStyle.continuous);
        rowBorders[0].setWeight(ExcelScript.BorderWeight.thick);
      }
    }

    lastPO = currentPO;
  }
}
