import React from 'react';
import { Stack } from '@mui/material';

import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/ui/ItemContainer';
import SearchArea from '@/components/common/SearchArea';
import JobTable from '@/components/table/JobTable';
import JobEditModal from '@/components/layout/JobEditModal';

import { useJobs } from '@/lib/hooks/useJobs'

function ActiveJobs() {
  const { data: jobs = [], isLoading } = useJobs();
  const [createJobModalOpen, setCreateJobModalOpen] = React.useState(false);

  const jobsArea = (<JobTable data={jobs} isLoading={isLoading} />);

  const handleCreateJobSubmit = (formData) => {
    console.log('Create job form submitted:', formData);
    // TODO: 调用API保存新工作
  };

  return (
    <Stack spacing={3} >
      <Breadcrumb locationLayer={['All Jobs', 'Active Jobs']} href={["all-jobs", "active-jobs"]} />
      <PageTitle title="Active Jobs" />
      <ItemContainer content={<SearchArea onCreateJobClick={() => setCreateJobModalOpen(true)} />} />
      <ItemContainer title="All Active Jobs" content={jobsArea} />
      <JobEditModal
        open={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        jobData={null}
        isCreateMode={true}
        onSubmit={handleCreateJobSubmit}
      />
    </Stack>
  );
}

export default ActiveJobs;