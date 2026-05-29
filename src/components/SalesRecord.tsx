/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  Box, Typography, Card, Stack, Divider, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Button, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility, Person, CalendarToday, LocationOn, FileDownload, Delete, School } from '@mui/icons-material';
import { Sale, CAMPUSES, Team, Role } from '../types';
import { storageService } from '../services/storage';

interface SalesRecordProps {
  sales: Sale[];
  role: Role | null;
  onSalesUpdate: () => void;
}

export default function SalesRecord({ sales, role, onSalesUpdate }: SalesRecordProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [teams, setTeams] = useState<Team[]>([]);

  useMemo(() => {
    // Only run once or when needed
    if (teams.length === 0) {
      setTeams(storageService.getTeams());
    }
  }, [teams.length]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();

    let filtered = sales;

    // Period filter
    switch (period) {
      case 'today':
        filtered = filtered.filter(s => s.timestamp >= startOfToday);
        break;
      case 'weekly':
        filtered = filtered.filter(s => s.timestamp >= oneWeekAgo);
        break;
      case 'monthly':
        filtered = filtered.filter(s => s.timestamp >= oneMonthAgo);
        break;
    }

    // Campus filter
    if (campusFilter !== 'all') {
      filtered = filtered.filter(s => s.campus === campusFilter);
    }

    // Team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(s => s.teamName === teamFilter);
    }

    return filtered;
  }, [sales, period, campusFilter, teamFilter]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Team', 'Seller', 'Campus', 'Customer', 'Items', 'Quantity', 'Revenue (GH₵)', 'Discount (GH₵)', 'Final Amount (GH₵)', 'Profit (GH₵)'];
    const rows = filteredSales.flatMap(sale => 
      (sale.items || []).map((item, idx) => [
        new Date(sale.timestamp).toLocaleDateString(),
        new Date(sale.timestamp).toLocaleTimeString(),
        sale.teamName,
        sale.memberName,
        sale.campus,
        sale.customer?.name || 'Walk-in',
        item.name,
        item.quantity,
        (item.sellingPrice * item.quantity).toFixed(2),
        idx === 0 ? (sale.discountAmount || 0).toFixed(2) : '0.00',
        idx === 0 ? sale.totalRevenue.toFixed(2) : (item.sellingPrice * item.quantity).toFixed(2),
        idx === 0 ? sale.totalProfit.toFixed(2) : ((item.sellingPrice - item.costPrice) * item.quantity).toFixed(2)
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tuckshop_sales_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDeleteSale = (id: string) => {
    setSaleToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSale = () => {
    if (saleToDeleteId) {
      storageService.deleteSale(saleToDeleteId);
      onSalesUpdate();
      setDeleteDialogOpen(false);
      setSaleToDeleteId(null);
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'timestamp', 
      headerName: 'Date & Time', 
      width: 180,
      valueGetter: (value: any) => new Date(value).toLocaleString()
    },
    { field: 'teamName', headerName: 'Team', width: 130 },
    { field: 'memberName', headerName: 'Seller', width: 130 },
    { field: 'campus', headerName: 'Campus', width: 140 },
    { 
      field: 'customer', 
      headerName: 'Customer', 
      width: 180,
      valueGetter: (value: any) => value ? `${value.name} (${value.class || 'N/A'})` : 'Walk-in'
    },
    { 
      field: 'items', 
      headerName: 'Items (Qty)', 
      width: 120,
      valueGetter: (value: any) => (value || []).reduce((sum: number, item: any) => sum + item.quantity, 0)
    },
    { 
      field: 'totalRevenue', 
      headerName: 'Amount (GH₵)', 
      width: 130,
      valueFormatter: (value: number) => `GH₵${value.toFixed(2)}`
    },
    {
      field: 'view',
      headerName: 'View',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton size="small" color="primary" onClick={() => setSelectedSale(params.row as Sale)}>
          <Visibility fontSize="small" />
        </IconButton>
      )
    },
    ...(role === 'admin' ? [{
      field: 'delete',
      headerName: 'Delete',
      width: 70,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton size="small" color="error" onClick={() => confirmDeleteSale(params.row.id)}>
          <Delete fontSize="small" />
        </IconButton>
      )
    }] : [])
  ];

  return (
    <Box sx={{ height: '100%', width: '100%', p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>Sales Record</Typography>
          <Typography variant="body2" color="text.secondary">History of all transactions processed.</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'stretch', flexWrap: 'wrap', width: { xs: '100%', lg: 'auto' } }}>
          <FormControl sx={{ minWidth: 120, flex: { xs: '1 1 100%', sm: '1' } }} size="small">
            <InputLabel>Campus</InputLabel>
            <Select
              value={campusFilter}
              label="Campus"
              onChange={(e) => setCampusFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Campuses</MenuItem>
              {CAMPUSES.map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120, flex: { xs: '1 1 100%', sm: '1' } }} size="small">
            <InputLabel>Team</InputLabel>
            <Select
              value={teamFilter}
              label="Team"
              onChange={(e) => setTeamFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Teams</MenuItem>
              {teams.map(t => (
                <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120, flex: { xs: '1 1 100%', sm: '1' } }} size="small">
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="weekly">This Week</MenuItem>
              <MenuItem value="monthly">This Month</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            startIcon={<FileDownload />} 
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            sx={{ fontWeight: 'bold', py: { xs: 1, sm: 'inherit' }, flex: { xs: '1 1 100%', sm: 'none' } }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flexGrow: 1, width: '100%', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
        <DataGrid
          rows={filteredSales}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 15 } },
            sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] }
          }}
          pageSizeOptions={[15, 30, 50]}
          disableRowSelectionOnClick
          sx={{ 
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              fontWeight: 'bold',
            }
          }}
        />
      </Box>

      {/* Sale Detail Dialog */}
      <Dialog 
        open={!!selectedSale} 
        onClose={() => setSelectedSale(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)' }
        }}
      >
        {selectedSale && (
          <>
            <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Transaction Details
              {role === 'admin' && (
                <Button 
                  startIcon={<Delete />} 
                  color="error" 
                  size="small" 
                  onClick={() => {
                    setSelectedSale(null);
                    confirmDeleteSale(selectedSale.id);
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  Delete Sale
                </Button>
              )}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ py: 1 }}>
                <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Total Revenue</Typography>
                      <Typography variant="h4" color="primary.main" sx={{ fontWeight: 900 }}>GH₵{selectedSale.totalRevenue.toFixed(2)}</Typography>
                      {selectedSale.discountAmount! > 0 && (
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold', display: 'block' }}>
                          Discount Applied: -GH₵{selectedSale.discountAmount!.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Profit</Typography>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>GH₵{selectedSale.totalProfit.toFixed(2)}</Typography>
                    </Box>
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>DATE</Typography>
                      </Stack>
                      <Typography variant="body2">{new Date(selectedSale.timestamp).toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>CAMPUS</Typography>
                      </Stack>
                      <Typography variant="body2">{selectedSale.campus}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>CUSTOMER</Typography>
                      </Stack>
                      <Typography variant="body2">{selectedSale.customer?.name || 'Walk-in'}</Typography>
                      {selectedSale.customer?.class && (
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                          <School sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">Class: {selectedSale.customer.class}</Typography>
                        </Stack>
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>TEAM & SELLER</Typography>
                      </Stack>
                      <Typography variant="body2">{selectedSale.teamName}</Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>{selectedSale.memberName}</Typography>
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>ITEMS BOUGHT</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent', border: '1px solid #efefef', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedSale.items || []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="right">GH₵{item.sellingPrice.toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              GH₵{(item.sellingPrice * item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Sales Record</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this sales record? This action cannot be undone and will be permanently removed from the system history.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
          <Button onClick={handleDeleteSale} color="error" variant="contained" sx={{ fontWeight: 'bold', borderRadius: 2 }}>
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
