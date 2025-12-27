import { Autocomplete, TextField, Checkbox, CircularProgress } from "@mui/material";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useCustomers } from '@/lib/hooks/useCustomers';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

/**
 * ClientAutocomplete 组件
 * 从 API 获取活跃客户列表，按 usage_count 降序、customer_name 升序排序。
 */
export default function ClientAutocomplete({ value = [], onChange }) {
  const { data, isLoading, error } = useCustomers();

  const customerOptions = data?.customers?.map(c => c.customer_name) || [];

  return (
    <Autocomplete
      // disablePortal
      multiple
      disableCloseOnSelect
      limitTags={2}
      size="small"
      options={customerOptions}
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      loading={isLoading}
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
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Client"
          error={!!error}
          helperText={error ? 'Failed to load clients' : ''}
          InputProps={{
            ...params.InputProps,
            endAdornment: isLoading ? <CircularProgress color="inherit" size={20} /> : params.InputProps.endAdornment,
          }}
        />
      )}
    />
  );
}