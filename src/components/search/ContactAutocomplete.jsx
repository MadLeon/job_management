import { Autocomplete, TextField, Checkbox, CircularProgress } from "@mui/material";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useContacts } from "@/lib/hooks/useContacts";
import { useCustomers } from "@/lib/hooks/useCustomers";

const icon = <CheckBoxOutlineBlankIcon fontSize="medium" />;
const checkedIcon = <CheckBoxIcon fontSize="medium" />;

/**
 * ContactAutocomplete 组件
 * 从 API 获取活跃联系人列表，按客户分组，每个客户下的联系人按 usage_count 降序、contact_name 升序排序。
 * 客户组按照与 ClientAutocomplete 相同的排序：usage_count 降序，再按客户名字母升序排列。
 * 当传入 selectedCustomer 时，联系人列表会被过滤。
 */
export default function ContactAutocomplete({ value = [], onChange, selectedCustomer = null }) {
  const { data, isLoading, error } = useContacts(selectedCustomer);
  const { data: customersData } = useCustomers();

  // 创建客户 usage_count 映射
  const customerUsageMap = {};
  if (customersData?.customers) {
    customersData.customers.forEach(c => {
      customerUsageMap[c.customer_name] = c.usage_count;
    });
  }

  // 构建分组数据：包含 contact_name 和 customer_name
  const contactOptions = data?.contacts?.map(c => ({
    contact_name: c.contact_name,
    customer_name: c.customer_name || 'Unassigned',
    label: c.contact_name,
    customerUsageCount: customerUsageMap[c.customer_name || 'Unassigned'] || 0
  })) || [];

  // 按客户的 usage_count 降序，再按客户名字母升序排序
  const sortedContacts = contactOptions.sort((a, b) => {
    // 首先按客户 usage_count 降序排序
    const usageCompare = (b.customerUsageCount || 0) - (a.customerUsageCount || 0);
    if (usageCompare !== 0) return usageCompare;
    // 如果 usage_count 相同，按客户名称升序排序（不区分大小写）
    return a.customer_name.toLowerCase().localeCompare(b.customer_name.toLowerCase());
  });

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      limitTags={2}
      size="small"
      options={sortedContacts}
      groupBy={(option) => option.customer_name}
      getOptionLabel={(option) => option.label}
      value={value.map(v => sortedContacts.find(c => c.contact_name === v) || { contact_name: v, customer_name: 'Unassigned', label: v })}
      onChange={(event, newValue) => onChange(newValue.map(item => item.contact_name))}
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
            {option.label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Contact"
          error={!!error}
          helperText={error ? 'Failed to load contacts' : ''}
          InputProps={{
            ...params.InputProps,
            endAdornment: isLoading ? <CircularProgress color="inherit" size={20} /> : params.InputProps.endAdornment,
          }}
        />
      )}
    />
  );
}