import { Box, FormControlLabel, Checkbox } from "@mui/material";
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
      }}
    >
      {Object.keys(priorityOptions).map((priority) => (
        <FormControlLabel
          key={priority}
          control={
            <Checkbox
              checked={value[priority] || false}
              onChange={() => handlePriorityChange(priority)}
            />
          }
          label={priority}
        />
      ))}
    </Box>
  );
}
