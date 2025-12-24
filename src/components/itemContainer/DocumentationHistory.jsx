import { Box, Stack, Typography } from "@mui/material";
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';

import dummyDocumentationData from "../../../data/data";

export default function DocumentationHistory() {
  return (
    <Stack sx={{ width: "100%", height: "100%" }}>
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography component="span">Drawing PDF</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {dummyDocumentationData?.map((item, index) => (
            item.type === 'pdf' &&
            <DocumentationRow key={index} item={item} />
          ))}
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
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          malesuada lacus ex, sit amet blandit leo lobortis eget.
        </AccordionDetails>
      </Accordion>
      <Accordion defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Typography component="span">Accordion Actions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          malesuada lacus ex, sit amet blandit leo lobortis eget.
        </AccordionDetails>
        <AccordionActions>
          <Button>Cancel</Button>
          <Button>Agree</Button>
        </AccordionActions>
      </Accordion>
    </Stack >
  );
}

function DocumentationRow({ item }) {
  return (
    <Stack sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center',p: 3 }}>
      <Typography variant="caption">{item.author || '-'}</Typography>
      <Typography variant="caption">{item.time || '-'}</Typography>
      <ActionButtonList actions={["opennew", "delete"]} />
    </Stack>
  );
}