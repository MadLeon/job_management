import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Paper from '@mui/material/Paper';
import JobTableHeader from './JobTableHeader';
import JobTableRow from './JobTableRow';

export default function JobTable({ data = [], isLoading = false }) {
  const cellRefs = React.useRef([]);
  const [colWidths, setColWidths] = React.useState([]);
  const [order, setOrder] = React.useState('asc');
  const [orderBy, setOrderBy] = React.useState('job_number');

  // Update column widths on render and window resize
  React.useEffect(() => {
    const updateWidths = () => {
      const widths = cellRefs.current.map((cell) => cell?.offsetWidth || 0);
      setColWidths(widths);
    };

    updateWidths();

    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);

  // Sorting comparator function
  // Database now stores dates in ISO 8601 format (YYYY-MM-DD), so direct string comparison works
  const compareValues = (aVal, bVal, orderBy) => {
    // For numeric comparisons
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;  // Returns negative if a < b, positive if a > b
    }

    // For string comparisons (includes ISO date format YYYY-MM-DD)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal);  // Direct comparison (not inverted)
      return comparison;
    }

    // Fallback comparison
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return (a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      // Null/empty handling - nulls always go to end regardless of sort direction
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;   // a is null → b comes first
      if (!bVal) return -1;  // b is null → a comes first

      let result = compareValues(aVal, bVal, orderBy);

      // Apply sort direction
      if (order === 'desc') {
        result = -result;  // Reverse for descending
      }

      // Secondary sort: If primary values are equal and sorting by job_number, sort by line_number (ascending)
      if (result === 0 && orderBy === 'job_number') {
        const lineA = a['line_number'];
        const lineB = b['line_number'];

        // Handle null/empty line values
        if (!lineA && !lineB) return 0;
        if (!lineA) return 1;
        if (!lineB) return -1;

        // Sort line_number in ascending order (always 1 → largest, regardless of primary sort direction)
        return compareValues(lineA, lineB, 'line_number');
      }

      return result;
    };
  };

  // Handle sort request
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    return [...data].sort(getComparator(order, orderBy));
  }, [data, order, orderBy]);

  return (
    <Paper sx={{ width: '100%' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
        <Table
          aria-label="job-table"
          sx={{
            tableLayout: 'fixed',
            '& thead': {
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'background.paper',
            }
          }}
        >
          <JobTableHeader
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {sortedData.map((row, index) => (
              <JobTableRow
                key={index}
                row={row}
                colWidths={colWidths}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
