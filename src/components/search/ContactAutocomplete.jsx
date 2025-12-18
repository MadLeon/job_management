import { Autocomplete, TextField, Checkbox } from "@mui/material";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useJobs } from "@/lib/hooks/useJobs";
import { useMemo } from "react";

const icon = <CheckBoxOutlineBlankIcon fontSize="medium" />;
const checkedIcon = <CheckBoxIcon fontSize="medium" />;

export default function ContactAutocomplete({ value = [], onChange }) {
  const { data: jobsData } = useJobs();

  const contactOptions = useMemo(() => {
    if (!jobsData || !Array.isArray(jobsData)) return [];

    const contacts = new Set();
    jobsData.forEach(job => {
      if (job.customer_contact) {
        contacts.add(job.customer_contact);
      }
    });
    return Array.from(contacts).sort();
  }, [jobsData]);

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      limitTags={2}
      size="medium"
      options={contactOptions}
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option}
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} label="Select Contact" />}
    />
  );
}