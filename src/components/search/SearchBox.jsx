import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export default function SearchBox() {
  return (
    <Autocomplete
      disablePortal
      size='small'
      options={["The Shawshank Redemption", "The Godfather", "The Dark Knight", "Pulp Fiction"]}
      sx={{ width: 250 }}
      renderInput={(params) =>
        <TextField
          {...params}
          label="Search"
          placeholder="Job / Drawing / OE. / PO."
        />
      }
    />
  );
}
