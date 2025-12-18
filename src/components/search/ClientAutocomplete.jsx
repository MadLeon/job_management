import { Autocomplete, TextField, Checkbox } from "@mui/material";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

import { customerList } from '@/../data/data';

const icon = <CheckBoxOutlineBlankIcon fontSize="medium" />;
const checkedIcon = <CheckBoxIcon fontSize="medium" />;

export default function ClientAutocomplete({ value = [], onChange }) {
  return (
    <Autocomplete
      // disablePortal
      multiple
      disableCloseOnSelect
      limitTags={2}
      size="medium"
      options={customerList}
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
      renderInput={(params) => <TextField {...params} label="Select Client" />}
    />
  );
}