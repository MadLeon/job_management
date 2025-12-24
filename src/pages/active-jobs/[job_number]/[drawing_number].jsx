import React from 'react';
import { Box, Container, Stack, Typography, Button, Divider, Card, CardContent, Chip } from '@mui/material';
import { useRouter } from 'next/router';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import { useJobs } from '@/lib/hooks/useJobs';
import { useAssemblies } from '@/lib/hooks/useAssemblies';
import JobInformation from '@/components/itemContainer/JobInformation';
import QRCodeDisplay from '@/components/itemContainer/QRCodeDisplay';
import AdditionalJobInfo from '@/components/itemContainer/AdditionalJobInfo';
import OpenInNewLink from '@/components/common/OpenInNewLink';
import { PriorityChip } from '@/components/shared';
import DrawingDocumentation from '@/components/itemContainer/DrawingDocumentation';
import { DrawingsTable } from '@/components/table';
import Notes from '@/components/itemContainer/Notes';
import Timeline from '@/components/itemContainer/Timeline';

/**
 * 图纸详情页面
 * 用于显示特定工作的图纸或装配体详细信息
 * 路由: /active-jobs/[job_number]/[drawing_number]
 * 
 * 面包屑导航:
 * - All Jobs > Active Jobs > Job Number > Part Number（若为装配体）或 Drawing Number（若为图纸）
 * 
 * @component
 * @returns {JSX.Element} 图纸详情页面
 */
export default function DrawingDetailPage() {
  const router = useRouter();
  const { job_number, drawing_number } = router.query;

  const basicInfoRef = React.useRef(null);
  const [containerHeight, setContainerHeight] = React.useState(0);
  const { data: jobs = [] } = useJobs();

  /**
   * 根据 job_number 查找对应的工作记录
   */
  const currentJob = React.useMemo(() => {
    return jobs.find(job => job.job_number === job_number);
  }, [jobs, job_number]);

  /**
   * 使用 useAssemblies 钩子获取当前工作的装配数据
   */
  const { data: assemblies = [], isLoading: assembliesLoading } = useAssemblies(currentJob?.part_number);

  /**
   * 根据 drawing_number 查找对应的图纸详情
   */
  const currentDrawing = React.useMemo(() => {
    return assemblies.find(item => item.drawing_number === drawing_number);
  }, [assemblies, drawing_number]);

  /**
   * 判断当前图纸是否为装配体
   * 通过 detail_drawing 表中的 isAssembly 标记
   */
  const isAssembly = currentDrawing?.isAssembly === 1 || currentDrawing?.isAssembly === true;

  /**
   * 确定面包屑导航中的显示文本
   * 如果是装配体，显示 part_number，否则显示 drawing_number
   */
  const breadcrumbLabel = isAssembly ? currentJob?.part_number : drawing_number;

  /**
   * 监测 BasicInformation 容器的高度变化
   * 并同步更新 QR 码尺寸
   */
  React.useEffect(() => {
    if (basicInfoRef.current) {
      const observer = new ResizeObserver(() => {
        setContainerHeight(basicInfoRef.current?.offsetHeight || 0);
      });
      observer.observe(basicInfoRef.current);
      // 初始化高度
      setContainerHeight(basicInfoRef.current.offsetHeight);
      return () => observer.disconnect();
    }
  }, []);

  /**
   * 格式化日期为 "YYYY-MM-DD" 格式
   * @param {string} dateStr - 日期字符串
   * @returns {string} 格式化后的日期
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
   * 处理返回上一页
   */
  const handleGoBack = () => {
    router.push(`/active-jobs/${job_number}`);
  };

  /**
   * 处理在新窗口中打开文件位置
   */
  const handleOpenFileLocation = () => {
    if (currentDrawing?.file_location) {
      // 可以通过 API 调用或直接打开文件路径
      window.open(currentDrawing.file_location, '_blank');
    }
  };

  return (
    <Stack spacing={3} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Breadcrumb
        locationLayer={['All Jobs', 'Active Jobs', job_number || 'Loading...', breadcrumbLabel || 'Detail']}
        href={["/all-jobs", "/active-jobs", `/active-jobs/${job_number}`, '#']}
      />
      <PageTitle title="Drawing Details" />
      <Stack direction="row" spacing={3} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <ItemContainer
          ref={basicInfoRef}
          title="Basic Information"
          content={<JobInformation jobData={currentJob} assemblyData={currentDrawing} type="detail" />}
          component={<OpenInNewLink url={`/all-drawings/${drawing_number}`} text="Drawing History" />}
        // sx={{ width: '80%' }}
        />
        <QRCodeDisplay size={containerHeight} />
      </Stack>

      <Stack direction={"row"} spacing={3} sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Stack spacing={3} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, width: "100%" }}>
          <ItemContainer
            title="Drawing Information"
            content={<AdditionalJobInfo jobData={currentJob} />}
            component={<PriorityChip priority={currentJob?.priority} />}
            width="100%"
          />
          <ItemContainer
            title="Drawing Documentation"
            align="normal"
            content={<DrawingDocumentation jobData={currentDrawing} />}
            component={<Typography variant="regularBold">In Progress</Typography>}
            width="100%"
            sx={{ flex: 1, minHeight: 0 }}
          />
        </Stack>
        <ItemContainer
          title="Notes"
          align="normal"
          content={
            <Notes notes={currentDrawing?.notes} />
          }
          component={<Typography variant="regularBold">In Progress</Typography>}
        />
        <ItemContainer
          title="Timeline"
          align="normal"
          content={<Timeline />}
          component={<Typography variant="regularBold">In Progress</Typography>}
        />
      </Stack>
    </Stack>
  );
}
