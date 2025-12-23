import { Stack } from "@mui/material";

const tempNotes = [
  {
    id: 1,
    author: 'Lester',
    title: 'Initial Review',
    content: 'Reviewed the drawing and found some discrepancies in the dimensions.',
    date: '2024-01-15',
    tags: ['review', 'dimensions'],
    created_at: '2024-02-20',
    updated_at: '2024-02-20',
  },
  {
    id: 2,
    author: 'Risa',
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
      <Stack>

      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {
        tempNotes.map((note, index) => (
          <Note data={note} key={index} />
        ))
      }
    </Stack>
  );
}