import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import type { TableProps } from '@mui/material';
import React from 'react';

interface GenericTableProps extends TableProps {
  columns: { label: string; align?: 'left' | 'right' | 'center' }[];
  rows: any[];
  renderRow: (row: any, idx: number) => React.ReactNode;
}

export function GenericTable({ columns, rows, renderRow, ...props }: GenericTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table {...props}>
        <TableHead>
          <TableRow>
            {columns.map((col, i) => (
              <TableCell key={i} align={col.align || 'left'}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => renderRow(row, idx))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
