import { Chip } from "@mui/material";
import { priorityOptions } from '../../data/data';

export default function PriorityChip({ priority }) {
  return (
    <Chip size="small" label={priority} color={priorityOptions[priority]?.color} sx={{ fontSize: 12 }} />
  );
}