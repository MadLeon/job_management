import React from 'react';
import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import PriorityChip from '@/components/shared/PriorityChip';
import JobInformation from '@/components/itemContainer/JobInformation';
import AdditionalJobInfo from '@/components/itemContainer/AdditionalJobInfo';
import { useJobs } from '@/lib/hooks/useJobs';
import { useJobDrawings } from '@/lib/hooks/useJobDrawings';
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

  /**
   * 根据 job_number 查找对应的工作记录
   */
  const currentJob = React.useMemo(() => {
    return jobs.find(job => job.job_number === job_number);
  }, [jobs, job_number]);

  /**
   * 使用 useJobDrawings 钩子获取当前工作的所有图纸和组件数据
   */
  const { data: drawings = [], isLoading: drawingsLoading } = useJobDrawings(job_number);

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['purchase orders', currentJob?.po_number || 'Loading', job_number || 'Detail']}
        href={["/purchase-orders", `/purchase-orders/${currentJob?.po_number}`, `/purchase-orders/${currentJob?.po_number}/${job_number}`]}
      />
      <PageTitle title="Job Overview" />
      <ItemContainer
        title="Basic Information"
        content={<JobInformation jobData={currentJob} />}
        component={currentJob ? <PriorityChip priority={currentJob.priority} /> : null}
        sx={{ width: '100%' }}
      />
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
              <JobCompletionChart jobData={currentJob} />
            }
            component={<Typography variant="h3">In Progress</Typography>}
            width="100%"
          />
        </Stack>
        <ItemContainer
          title="Drawing Tracker"
          align="normal"
          content={
            <DrawingsTable
              drawings={drawings}
              isLoading={drawingsLoading}
              jobNumber={job_number}
            />
          }
        />
      </Stack>
    </Stack>
  );
}
