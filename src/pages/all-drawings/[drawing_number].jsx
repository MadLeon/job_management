import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import { useJobs } from '@/lib/hooks/useJobs';
import { useDrawingDetail } from '@/lib/hooks/useDrawingDetail';
import Notes from '@/components/itemContainer/Notes';
import ProfileInformation from '@/components/itemContainer/ProfileInformation';
import ProductionHistory from '@/components/itemContainer/ProductionHistory';
import DocumentationHistory from '@/components/itemContainer/DocumentationHistory';

/**
 * 图纸配置文件页面
 * 
 * 显示特定图纸或装配体的完整配置文件信息，包括基本信息、生产历史、文档和备注
 * 
 * 路由: /all-drawings/[drawing_number]
 * 
 * 布局结构:
 * - 顶部: 面包屑导航和页面标题
 * - 上方: 基本信息容器（展示图纸元数据）
 * - 下方: 两列布局
 *   - 左侧 (70%): 生产历史 + 文档历史
 *   - 右侧 (30%): 备注
 *
 * 数据源:
 * - 从 /api/drawings/detail API 获取图纸元数据
 * - 使用 useDrawingDetail hook 管理数据获取和缓存
 * 
 * @component
 * @returns {JSX.Element} 图纸配置文件页面
 */
export default function DrawingDetailPage() {
  const router = useRouter();
  const { drawing_number } = router.query;

  /**
   * 从 API 获取图纸元数据
   * @type {Object} currentDrawing - 图纸详情数据
   * @type {boolean} isLoading - 加载状态
   * @type {Error} error - 错误信息
   */
  const { data: currentDrawing, isLoading, error } = useDrawingDetail(drawing_number);

  /**
   * 判断当前是否为装配体
   * 通过 detail_drawing 表中的 isAssembly 标记判断
   * @type {boolean}
   */
  const isAssembly = currentDrawing?.isAssembly === 1 || currentDrawing?.isAssembly === true;

  /**
   * 格式化日期为 YYYY-MM-DD 格式
   * 
   * 处理无效日期、空值和异常情况
   * 
   * @param {string} dateStr - 输入日期字符串
   * @returns {string} 格式化后的日期 (YYYY-MM-DD) 或 '-' (无效值)
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('日期格式化错误:', error);
      return dateStr;
    }
  };

  /**
   * 在新窗口中打开文件位置
   * 
   * 检查文件路径是否存在后调用系统打开
   * 
   * @returns {void}
   */
  const handleOpenFileLocation = () => {
    if (currentDrawing?.file_location) {
      window.open(currentDrawing.file_location, '_blank');
    }
  };

  return (
    <Stack spacing={3} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Breadcrumb
        locationLayer={['All Drawings', drawing_number || 'Detail']}
        href={["/all-drawings", '#']}
      />
      <PageTitle title={isAssembly ? "Assembly Profile" : "Drawing Profile"} />
      {/* 基本信息容器 - 展示图纸元数据 */}
      <ItemContainer
        title="Basic Information"
        content={<ProfileInformation data={currentDrawing} type={isAssembly ? "assembly" : "detail"} />}
      />
      {/* 主要内容区域 - 生产历史和文档历史在左侧，备注在右侧 */}
      <Stack direction={"row"} spacing={3} sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧列表 - 生产历史和文档历史 */}
        <Stack spacing={3} sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <ItemContainer
            title="Production History"
            component={<Typography variant="regularBold">In Progress</Typography>}
            content={<ProductionHistory />}
            width="100%"
          />
          <ItemContainer
            title="Drawing Documentation"
            align="normal"
            content={<DocumentationHistory />}
            component={<Typography variant="regularBold">In Progress</Typography>}
            width="100%"
            sx={{ flex: 1, minHeight: 0 }}
          />
        </Stack>
        {/* 右侧栏 - 备注 */}
        <ItemContainer
          title="Notes"
          align="normal"
          width="30%"
          content={
            <Notes notes={currentDrawing?.notes} />
          }
          component={<Typography variant="regularBold">In Progress</Typography>}
        />
      </Stack>
    </Stack>
  );
}
