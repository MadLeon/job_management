import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { drawingNumber, customerName } = req.query;

      if (!drawingNumber) {
        return res.status(400).json({ error: 'drawingNumber query parameter is required' });
      }

      const db = getDB();
      let fileLocation = null;

      // 步骤 1：直接匹配 drawing_number
      const directMatch = db.prepare(
        'SELECT file_location FROM drawings WHERE drawing_number = ?'
      ).get(drawingNumber);

      if (directMatch && directMatch.file_location) {
        fileLocation = directMatch.file_location;
      } else if (customerName) {
        // 步骤 2：模糊匹配 + customer_folder_map 映射

        // 获取 customer 的 folder_name（如果存在）
        const folderMapResult = db.prepare(
          'SELECT folder_name FROM customer_folder_map WHERE customer_name = ?'
        ).get(customerName);

        const searchName = folderMapResult ? folderMapResult.folder_name : customerName;

        // 查询所有包含 drawing_number 的 drawing
        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name'
        ).all(`%${drawingNumber}%`);

        // 查找第一个有效的 file_location
        for (const match of fuzzyMatches) {
          if (match.file_location) {
            // 检查 file_location 是否包含 customer_name 或 folder_name
            const fileLocationLower = match.file_location.toLowerCase();
            const customerNameLower = customerName.toLowerCase();
            const searchNameLower = searchName.toLowerCase();

            if (
              fileLocationLower.includes(customerNameLower) ||
              fileLocationLower.includes(searchNameLower)
            ) {
              fileLocation = match.file_location;
              break;
            }
          }
        }
      } else {
        // 如果没有customerName，只做模糊匹配
        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name LIMIT 1'
        ).get(`%${drawingNumber}%`);

        if (fuzzyMatches && fuzzyMatches.file_location) {
          fileLocation = fuzzyMatches.file_location;
        }
      }

      res.status(200).json({
        fileLocation: fileLocation || null
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
