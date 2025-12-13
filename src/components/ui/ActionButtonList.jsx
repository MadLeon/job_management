import * as React from 'react';
import { Stack, useTheme } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export default function ActionButtonList({ type = "assembly" }) {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={0} padding="0">
      <IconButton
        size="small"
        aria-label={"EditIcon button"}
        onClick={() => console.log("EditIcon button clicked")}
      >
        <ImageOutlinedIcon color="primary" sx={{ fontSize: 20 }} />
      </IconButton>
      <IconButton
        size="small"
        aria-label={"EditIcon button"}
        onClick={() => console.log("EditIcon button clicked")}
      >
        <EditIcon color="primary" sx={{ fontSize: 20 }} />
      </IconButton>
      <IconButton
        size="small"
        aria-label={"EditIcon button"}
        onClick={() => console.log("EditIcon button clicked")}
      >
        <RemoveCircleOutlineOutlinedIcon sx={{ fontSize: 20, color: theme.palette.darkRed.main }} />
      </IconButton>
      {type === "assembly" && (
        <>
          <IconButton
            size="small"
            aria-label={"EditIcon button"}
            onClick={() => console.log("EditIcon button clicked")}
          >
            <AddCircleOutlineIcon color="secondary" sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            aria-label={"EditIcon button"}
            onClick={() => console.log("EditIcon button clicked")}
          >
            <OpenInNewIcon color="primary" sx={{ fontSize: 20 }} />
          </IconButton>
        </>
      )}
    </Stack>
  );
}
