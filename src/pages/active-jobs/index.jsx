import React from 'react';
import { Stack, Snackbar, Alert, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import SearchArea from '@/components/search/SearchArea';
import JobTable from '@/components/table/JobTable';
import JobEditModal from '@/components/modals/JobEditModal';

import { useJobs } from '@/lib/hooks/useJobs'
import { useFilters } from '@/context/FilterContext';

/**
 * 活跃工作列表页面
 * 显示所有活跃的制造工作，支持搜索和过滤
 * 路由: /active-jobs
 * 
 * @component
 * @returns {JSX.Element} 活跃工作列表页面
 */
function ActiveJobs() {
  const { data: jobs = [], isLoading } = useJobs();
  const { appliedFilters } = useFilters();
  const [createJobModalOpen, setCreateJobModalOpen] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState(null);

  // 全局 Snackbar 状态
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);

  /**
   * 显示全局 Snackbar
   */
  const showSnackbar = React.useCallback(() => {
    setSnackbarOpen(true);
  }, []);

  /**
   * 关闭全局 Snackbar
   */
  const handleSnackbarClose = React.useCallback(() => {
    setSnackbarOpen(false);
  }, []);

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

  /**
   * 处理创建新工作的表单提交
   * @param {Object} formData - 表单数据
   */
  const handleCreateJobSubmit = (formData) => {
    console.log('Create job form submitted:', formData);
    // TODO: 调用API保存新工作
  };

  return (
    <Stack spacing={3} >
      <Breadcrumb locationLayer={['Active Jobs']} href={["active-jobs"]} />
      <PageTitle title="Active Jobs" />
      <ItemContainer content={<SearchArea onCreateJobClick={() => setCreateJobModalOpen(true)} onSearchSelect={handleSearchSelect} />} />
      <ItemContainer title="All Active Jobs" content={jobsArea} />
      <JobEditModal
        open={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        jobData={null}
        isCreateMode={true}
        onSubmit={handleCreateJobSubmit}
        onCopyPathSuccess={showSnackbar}
      />
      {/* 全局 Snackbar，底部居中 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Drawing file path copied to clipboard!"
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleSnackbarClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Stack>
  );
}

export default ActiveJobs;
