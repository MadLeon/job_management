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

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['All Jobs', 'Active Jobs', job_number || 'Detail']}
        href={["/all-jobs", "/active-jobs", `/active-jobs/${job_number}`]}
      />
      <PageTitle title={`Job Overview - # ${job_number || 'Loading...'}`} />
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <ItemContainer
          title="Basic Information"
          content={<JobInformation jobData={currentJob} />}
          component={currentJob ? <PriorityChip priority={currentJob.priority} /> : null}
          sx={{ width: '60%' }}
        />
        <Box><QRCodeDisplay size={170} /></Box>
      </Stack>
      <ItemContainer
        title="Job Information"
        content={<AdditionalJobInfo jobData={currentJob} />}
        width="25%"
      />
    </Stack>
  );
}