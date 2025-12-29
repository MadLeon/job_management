import React from 'react';
import { Stack } from '@mui/material';

import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import SearchArea from '@/components/search/SearchArea';
import JobTable from '@/components/table/JobTable';
import JobEditModal from '@/components/modals/JobEditModal';

import { useJobs } from '@/lib/hooks/useJobs'
import { useFilters } from '@/context/FilterContext';
import { useSnackbar } from '@/context/SnackbarContext';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';

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
  const { showSnackbar } = useSnackbar();
  const [jobModalOpen, setJobModalOpen] = React.useState(false);
  const [isCreateMode, setIsCreateMode] = React.useState(true);
  const [passedJobData, setPassedJobData] = React.useState(null);
  const [searchFilter, setSearchFilter] = React.useState(null);
  const [deleteDialogState, setDeleteDialogState] = React.useState({
    open: false,
    title: '',
    message: '',
    itemName: '',
    jobNumber: null
  });

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

  const jobsArea = (
    <JobTable
      onEditJobClick={
        (jobData) => {
          setJobModalOpen(true);
          setIsCreateMode(false);
          setPassedJobData(jobData);
        }
      }
      onDeleteJobClick={
        (passedJobData) => {
          setDeleteDialogState({
            open: true,
            title: passedJobData.title || 'Deletion Confirm',
            message: passedJobData.message || 'Are you sure you want to delete this job?',
            itemName: passedJobData.job_number,
            jobNumber: passedJobData.job_number
          });
        }
      }
      data={filteredJobs}
      isLoading={isLoading} />
  );

  /**
   * 处理创建新工作的表单提交
   * @param {Object} formData - 表单数据
   */
  const handleJobSubmit = (formData) => {
    console.log(`${isCreateMode ? 'Create' : 'Edit'} job form submitted:`, formData);
  };

  /**
   * 复制路径成功时弹出 snackbar
   */
  const handleCopyPathSuccess = React.useCallback(() => {
    showSnackbar({ message: 'Drawing file path copied to clipboard!' });
  }, [showSnackbar]);

  const handleCloseDeleteDialog = () => {
    setDeleteDialogState((prevState) => ({ ...prevState, open: false }));
  };

  const handleConfirmDelete = (deleteData) => {
    console.log('[DeleteConfirmDialog] Job Data:', deleteData);
    // Additional logic can be added here in the future
  };

  return (
    <Stack spacing={3} >
      <Breadcrumb locationLayer={['Active Jobs']} href={["active-jobs"]} />
      <PageTitle title="Active Jobs" />
      <ItemContainer
        content={
          <SearchArea onCreateJobClick={
            () => {
              setJobModalOpen(true)
              setIsCreateMode(true)
            }
          }
            onSearchSelect={handleSearchSelect} />
        }
      />
      <ItemContainer title="All Active Jobs" content={jobsArea} />
      <JobEditModal
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        jobData={passedJobData}
        isCreateMode={isCreateMode}
        onSubmit={handleJobSubmit}
      />
      <DeleteConfirmDialog
        open={deleteDialogState.open}
        onClose={handleCloseDeleteDialog}
        onConfirm={() => handleConfirmDelete(deleteDialogState)}
        title={deleteDialogState.title}
        message={deleteDialogState.message}
        itemName={deleteDialogState.itemName}
      />
    </Stack>
  );
}

export default ActiveJobs;
