import { Box, Stack, Typography } from "@mui/material";

import { dummyProductionData } from "../../../data/data";

export default function ProductionHistory({ productionData = [] }) {
  return (
    <Stack spacing={2} sx={{ width: "100%", justifyContent: "space-between", height: "100%", p: 3 }}>
      <Stack sx={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 1fr 1fr 1fr', alignItems: 'center', width: "100%" }}>
        <Typography variant="regularBold">PO Number</Typography>
        <Typography variant="regularBold">Time</Typography>
        <Typography variant="regularBold">Rev No</Typography>
        <Typography variant="regularBold">Qty</Typography>
        <Typography variant="regularBold">Working Hours</Typography>
      </Stack>
      {dummyProductionData?.map((item, index) => (
        <ProductionHistoryRow key={index} item={item} />
      ))}
    </Stack >
  );
}

function ProductionHistoryRow({ item }) {
  return (
    <Stack sx={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 1fr 1fr 1fr', alignItems: 'center' }}>
      <Typography variant="caption">{item.po_number || '-'}</Typography>
      <Typography variant="caption">{item.time[0] || '-'} - {item.time[1] || '-'}</Typography>
      <Typography variant="caption">{item.revision || '-'}</Typography>
      <Typography variant="caption">{item.qty || '-'}</Typography>
      <Typography variant="caption">{item.working_hours || '-'}</Typography>
    </Stack>
  );
}