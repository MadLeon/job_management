import { Stack, FormControlLabel, Checkbox } from "@mui/material";
import { priorityOptions } from "@/../data/data";

export default function PriorityFilter({ value = {}, onChange }) {
  const handlePriorityChange = (priority) => {
    const newValue = {
      ...value,
      [priority]: !value[priority],
    };
    onChange(newValue);
  };

  return (
    <Stack spacing={1} direction="row" flexWrap="wrap">
      {Object.keys(priorityOptions).map((priority, index) => (
        <FormControlLabel
          key={priority}
          control={
            <Checkbox
              checked={value[priority] || false}
              onChange={() => handlePriorityChange(priority)}
            />
          }
          label={priority}
          sx={{
            width: "calc(33.333% - 16px)",
            marginLeft: 1,
          }}
        />
      ))}
    </Stack>
  );
}
