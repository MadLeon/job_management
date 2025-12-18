import React from 'react';
import { Stack } from '@mui/material';

import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/ui/ItemContainer';
import SearchArea from '@/components/search/SearchArea';
import JobTable from '@/components/table/JobTable';
import JobEditModal from '@/components/layout/JobEditModal';

import { useJobs } from '@/lib/hooks/useJobs'
import { useFilters } from '@/context/FilterContext';

function ActiveJobs() {
  const { data: jobs = [], isLoading } = useJobs();
  const { appliedFilters } = useFilters();
  const [createJobModalOpen, setCreateJobModalOpen] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState(null);

  // 处理搜索框选择
  const handleSearchSelect = React.useCallback((selectedJob) => {
    console.log('[ActiveJobs] 搜索选择回调:', selectedJob);
    setSearchFilter(selectedJob);
  }, []);

  // Filter jobs based on applied filters
  const filteredJobs = React.useMemo(() => {
    return jobs.filter(job => {
      // 搜索过滤：如果用户选择了搜索结果，则仅显示匹配的记录
      if (searchFilter) {
        if (job.unique_key !== searchFilter.unique_key) {
          return false;
        }
      }

      // Filter by clients
      if (appliedFilters.clients.length > 0 && !appliedFilters.clients.includes(job.customer_name)) {
        return false;
      }

      // Filter by contacts
      if (appliedFilters.contacts.length > 0 && !appliedFilters.contacts.includes(job.customer_contact)) {
        return false;
      }

      // Filter by date range
      if (appliedFilters.startDate && new Date(job.date) < new Date(appliedFilters.startDate)) {
        return false;
      }
      if (appliedFilters.endDate && new Date(job.date) > new Date(appliedFilters.endDate)) {
        return false;
      }

      // Filter by priorities
      const selectedPriorities = Object.keys(appliedFilters.priorities).filter(p => appliedFilters.priorities[p]);
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(job.priority)) {
        return false;
      }

      return true;
    });
  }, [jobs, appliedFilters, searchFilter]);

  const jobsArea = (<JobTable data={filteredJobs} isLoading={isLoading} />);

  const handleCreateJobSubmit = (formData) => {
    console.log('Create job form submitted:', formData);
    // TODO: 调用API保存新工作
  };

  return (
    <Stack spacing={3} >
      <Breadcrumb locationLayer={['All Jobs', 'Active Jobs']} href={["all-jobs", "active-jobs"]} />
      <PageTitle title="Active Jobs" />
      <ItemContainer content={<SearchArea onCreateJobClick={() => setCreateJobModalOpen(true)} onSearchSelect={handleSearchSelect} />} />
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