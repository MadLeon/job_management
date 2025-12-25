import * as React from 'react';
import Popover from '@mui/material/Popover';
import { Stack, Divider, Box } from '@mui/material';
import { useState } from 'react';
import ClientAutocomplete from './ClientAutocomplete';
import ContactAutocomplete from './ContactAutocomplete';
import DateRange from './DateRange';
import PriorityFilter from './PriorityFilter';
import BottomButtonGroup from './BottomButtonGroup';
import { useFilters } from '@/context/FilterContext';
import ItemContainer from '../itemContainer';
import { FieldLabel } from '../common';

export default function FilterPopover({ id, open, anchorEl, handleClose }) {
  const { applyFilters } = useFilters();
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priorities, setPriorities] = useState({});

  const handleClear = () => {
    setClients([]);
    setContacts([]);
    setStartDate("");
    setEndDate("");
    setPriorities({});
  };

  const handleApply = () => {
    applyFilters({
      clients,
      contacts,
      startDate,
      endDate,
      priorities,
    });
    handleClose();
  };

  const filterContent = (
    <Stack>
      <Stack spacing={3} sx={{ p: 3, width: '100%' }}>
        <FieldLabel label="Client">
          <ClientAutocomplete value={clients} onChange={setClients} />
        </FieldLabel>
        <FieldLabel label="Priority">
          <PriorityFilter value={priorities} onChange={setPriorities} />
        </FieldLabel>
        <FieldLabel label="Delivery Required Date">
          <DateRange startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
        </FieldLabel>
        <FieldLabel label="Contact">
          <ContactAutocomplete value={contacts} onChange={setContacts} />
        </FieldLabel>
      </Stack>
      <Divider />
      <Box >
        <BottomButtonGroup onClear={handleClear} onClose={handleClose} onApply={handleApply} />
      </Box>
    </Stack>
  );

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          elevation: 4,
          sx: {
            height: "auto",
            overflow: "visible",
            borderRadius: '10px',
          }
        }
      }}
    >
      <ItemContainer
        title="Filter Options"
        content={filterContent}
        align="flex-start"
      />
    </Popover>
  );
}