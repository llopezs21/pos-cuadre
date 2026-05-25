import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

export function GenericInput(props: TextFieldProps) {
  return <TextField variant="filled" {...props} />;
}
