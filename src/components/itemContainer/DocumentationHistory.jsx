import { Box, Stack, Typography } from "@mui/material";
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';

import ActionButtonList from "../common/ActionButtonList";
import { dummyDocumentationData } from "../../../data/data";

export default function DocumentationHistory() {
  return (
    <Stack sx={{ width: "100%", height: "100%" }}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography component="span">Drawing PDF</Typography>
        </AccordionSummary>
        <AccordionDetails>          
          <Stack spacing={1}>
            {dummyDocumentationData?.map((item, index) => (
              item.type === 'pdf' &&
              <DocumentationRow key={index} item={item} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
        >
          <Typography component="span">Manufacturing Process</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {dummyDocumentationData?.map((item, index) => (
              item.type === "manufacturing_process" &&
              <DocumentationRow key={index} item={item} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">MTR</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {dummyDocumentationData?.map((item, index) => (
              item.type === "mtr" &&
              <DocumentationRow key={index} item={item} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">DDR</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {dummyDocumentationData?.map((item, index) => (
              item.type === "ddr" &&
              <DocumentationRow key={index} item={item} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">DIR</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {dummyDocumentationData?.map((item, index) => (
              item.type === "dir" &&
              <DocumentationRow key={index} item={item} />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack >
  );
}

function DocumentationRow({ item }) {
  return (
    <Stack sx={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', alignItems: 'center' }}>
      <Typography variant="caption">{item.filename || '-'}</Typography>
      <Typography variant="caption">{item.author || '-'}</Typography>
      <Typography variant="caption">{`${item.created_at} - ${item.updated_at}` || '-'}</Typography>
      <Box sx={{ justifySelf: 'end' }}>
        <ActionButtonList buttons={["openNew", "delete"]} />
      </Box>
    </Stack>
  );
}