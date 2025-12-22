import React from 'react';
import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import PriorityChip from '@/components/shared/PriorityChip';
import JobInformation from '@/components/itemContainer/JobInformation';
import AdditionalJobInfo from '@/components/itemContainer/AdditionalJobInfo';
import QRCodeDisplay from '@/components/itemContainer/QRCodeDisplay';
import { useJobs } from '@/lib/hooks/useJobs';
import { useAssemblies } from '@/lib/hooks/useAssemblies';
import JobCompletionChart from '@/components/itemContainer/JobCompletionChart';
import { DrawingsTable } from '@/components/table';

/**
 * 工作详情页面
 * 动态路由根据 job_number 显示特定工作的详细信息
 * 路由: /active-jobs/[job_number]
 * 
 * @component
 * @returns {JSX.Element} 工作详情页面
 */
export default function JobDetailPage() {
  const router = useRouter();
  const { job_number } = router.query;
  const { data: jobs = [] } = useJobs();
  const basicInfoRef = React.useRef(null);
  const [containerHeight, setContainerHeight] = React.useState(0);

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

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['All Jobs', 'Active Jobs', job_number || 'Detail']}
        href={["/all-jobs", "/active-jobs", `/active-jobs/${job_number}`]}
      />
      <PageTitle title={`Job Overview - # ${job_number || 'Loading...'}`} />
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <ItemContainer
          ref={basicInfoRef}
          title="Basic Information"
          content={<JobInformation jobData={currentJob} />}
          component={currentJob ? <PriorityChip priority={currentJob.priority} /> : null}
          sx={{ width: '80%' }}
        />
        <QRCodeDisplay size={containerHeight} />
      </Stack>
      <Stack direction={"row"} spacing={3}>
        <Stack spacing={3} width="40%">
          <ItemContainer
            title="Job Information"
            content={<AdditionalJobInfo jobData={currentJob} />}
            width="100%"
          />
          <ItemContainer
            title="Job Completion"
            content={
              <JobCompletionChart jobData={currentJob} />}
            width="100%"
          />
        </Stack>
        <ItemContainer title="Drawing Tracker" align="normal" content={<DrawingsTable drawings={assemblies} isLoading={assembliesLoading} />} />
      </Stack>
    </Stack>
  );
}