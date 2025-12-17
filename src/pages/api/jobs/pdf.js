import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { fileLocation } = req.query;

  if (!fileLocation) {
    return res.status(400).json({ error: 'fileLocation is required' });
  }

  try {
    // 检查文件是否存在
    if (!fs.existsSync(fileLocation)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 读取文件并返回
    const fileContent = fs.readFileSync(fileLocation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fileLocation)}"`);
    res.send(fileContent);
  } catch (error) {
    console.error('PDF fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch PDF' });
  }
}
