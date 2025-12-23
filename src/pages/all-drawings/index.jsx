import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Stack } from '@mui/material';
import Breadcrumb from '@/components/common/Breadcrumbs';
import { PageTitle } from '@/components/common';
import ItemContainer from '@/components/itemContainer';
import SearchArea from '@/components/search/SearchArea';
import { useJobs } from '@/lib/hooks/useJobs';
import { useFilters } from '@/context/FilterContext';
import JobTable from '@/components/table';

export default function AllDrawings() {
  const { data: jobs = [], isLoading } = useJobs();
  const { appliedFilters } = useFilters();
  const [createJobModalOpen, setCreateJobModalOpen] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState(null);

  /**
   * 处理搜索框选择回调
   * @param {Object} selectedJob - 选中的工作记录
   */
  const handleSearchSelect = React.useCallback((selectedJob) => {
    console.log('[ActiveJobs] 搜索选择回调:', selectedJob);
    setSearchFilter(selectedJob);
  }, []);

  /**
   * 根据应用的过滤条件过滤工作列表
   */
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

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['All Drawings']}
        href={["/all-drawings"]}
      />
      <PageTitle title="All Drawings" />
      <ItemContainer content={<SearchArea onSearchSelect={handleSearchSelect} />} />
      <ItemContainer title="All Active Jobs" content={jobsArea} component={<Typography variant="regularBold">In Progress</Typography>} />
    </Stack>
  );
}
