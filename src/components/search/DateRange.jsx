import { TextField, Stack } from "@mui/material";

export default function DateRange({ startDate = "", endDate = "", onStartDateChange, onEndDateChange }) {
  return (
    <Stack spacing={2} direction="row" sx={{ width: "100%" }}>
      <TextField
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
        sx={{ flex: 1 }}
      />
      <TextField
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
        sx={{ flex: 1 }}
      />
    </Stack>
  );
}
