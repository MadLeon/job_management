import { TextField, Stack } from "@mui/material";

export default function DateRange({ startDate = "", endDate = "", onStartDateChange, onEndDateChange }) {
  return (
    <Stack spacing={2} direction="row" sx={{ width: "100%" }}>
      <TextField
        label="Del. Req'd Start"
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
        label="Del. Req'd End"
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
