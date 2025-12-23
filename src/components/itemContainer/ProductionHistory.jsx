import { Box, Stack, Typography } from "@mui/material";

export default function ProductionHistory() {
  return (
    <Stack sx={{ width: "100%", justifyContent: "space-between", height: "100%" }}>
      <Stack spacing={2} sx={{ p: 3, width: "100%" }}>
        <Typography variant="regularBold">In Progress</Typography>
      </Stack>
      <Box sx={{ display: "flex", width: "100%", justifyContent: "flex-end", p: 3 }}>
      </Box>
    </Stack >
  );
}