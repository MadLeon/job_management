import { TextField, Stack } from "@mui/material";

export default function DateRange({ startDate = "", endDate = "", onStartDateChange, onEndDateChange }) {
  return (
    <Stack spacing={3} direction="row" sx={{ py: 1, minWidth: '400px' }}>
      <TextField
        label="Start Date"
        type="date"
        size="small"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        slotProps={{
          inputLabel: {
            shrink: true,
          }
        }}
        sx={{ flex: 1 }}
      />
      <TextField
        label="End Date"
        type="date"
        size="small"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        slotProps={{
          inputLabel: {
            shrink: true,
          }
        }}
        sx={{ flex: 1 }}
      />
    </Stack>
  );
}
