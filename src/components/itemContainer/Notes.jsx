import { Box, Fab, Stack, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { ActionButtonList, UserCard } from "../common";

const tempNotes = [
  {
    id: 1,
    author: 'Lester Huang',
    title: 'Initial Review',
    content: 'Reviewed the drawing and found some discrepancies in the dimensions.',
    date: '2024-01-15',
    tags: ['review', 'dimensions'],
    created_at: '2024-02-20',
    updated_at: '2024-02-20',
  },
  {
    id: 2,
    author: 'Steve Daros',
    title: 'Customer Feedback',
    content: 'Customer requested changes to the mounting holes and overall size.',
    date: '2024-03-20',
    tags: ['review', 'dimensions'],
    created_at: '2024-03-20',
    updated_at: '2024-03-20',
  },
]

export default function Notes({ notes }) {
  const Note = ({ data }) => {
    return (
      <Stack spacing={1} sx={{ width: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
          <UserCard name={data.author} />
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
            <ActionButtonList buttons={["edit", "delete", "openNew"]} />
          </Box>
        </Stack>
        <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
          <Typography variant="caption">
            {data.content}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack sx={{ width: "100%", justifyContent: "space-between", height: "100%" }}>
      <Stack spacing={2} sx={{ p: 3, width: "100%" }}>
        {
          tempNotes.map((note, index) => (
            <Note data={note} key={index} />
          ))
        }
      </Stack>
      <Box sx={{ display: "flex", width: "100%", justifyContent: "flex-end", p: 3 }}>
        <Fab color="primary" size="small" aria-label="add">
          <AddIcon />
        </Fab>
      </Box>
    </Stack >
  );
}