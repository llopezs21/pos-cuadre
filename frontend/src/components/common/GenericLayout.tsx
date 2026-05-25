import { Box, Stack } from '@mui/material';
import type { BoxProps } from '@mui/material';
import React from 'react';

interface GenericLayoutProps extends BoxProps {
  children: React.ReactNode;
  maxWidth?: number | string;
}

export function GenericLayout({ children, maxWidth = 900, ...props }: GenericLayoutProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }} {...props}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth }}>
        {children}
      </Stack>
    </Box>
  );
}
