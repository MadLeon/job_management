import * as React from 'react';
import Popover from '@mui/material/Popover';
import { Paper, Stack, Divider } from '@mui/material';
import { useState } from 'react';
import ClientAutocomplete from './ClientAutocomplete';
import ContactAutocomplete from './ContactAutocomplete';
import DateRange from './DateRange';
import PriorityFilter from './PriorityFilter';
import BottomButtonGroup from '../common/BottomButtonGroup';
import { useFilters } from '@/context/FilterContext';

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
          sx: {
            height: "auto",
            overflow: "visible",
          }
        }
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <ClientAutocomplete value={clients} onChange={setClients} />
        <Divider />
        <PriorityFilter value={priorities} onChange={setPriorities} />
        <Divider />
        <DateRange startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
        <Divider />
        <ContactAutocomplete value={contacts} onChange={setContacts} />
        <BottomButtonGroup onClear={handleClear} onClose={handleClose} onApply={handleApply} />
      </Stack>
    </Popover>
  );
}