/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Box, Typography, Button, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Stack, MenuItem, Chip, IconButton 
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete, Warning } from '@mui/icons-material';
import { Product, CATEGORIES } from '../types';

interface InventoryProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  lowStockThreshold: number;
  onUpdateThreshold: (threshold: number) => void;
}

export default function Inventory({ 
  products, 
  onUpdateProducts, 
  lowStockThreshold, 
  onUpdateThreshold 
}: InventoryProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: CATEGORIES[0],
    costPrice: 0,
    sellingPrice: 0,
    stock: 0
  });

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData(product);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        category: CATEGORIES[0],
        costPrice: 0,
        sellingPrice: 0,
        stock: 0
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (editingId) {
      const updated = products.map(p => p.id === editingId ? { ...p, ...formData } as Product : p);
      onUpdateProducts(updated);
    } else {
      const newProduct: Product = {
        ...formData as Product,
        id: Math.random().toString(36).substr(2, 9)
      };
      onUpdateProducts([...products, newProduct]);
    }
    handleClose();
  };

  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (productToDelete) {
      onUpdateProducts(products.filter(p => p.id !== productToDelete));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 150 },
    { field: 'category', headerName: 'Category', width: 130 },
    { 
      field: 'costPrice', 
      headerName: 'Cost (GH₵)', 
      width: 120,
      valueFormatter: (value: number) => `GH₵${value.toFixed(2)}`
    },
    { 
      field: 'sellingPrice', 
      headerName: 'Price (GH₵)', 
      width: 120,
      valueFormatter: (value: number) => `GH₵${value.toFixed(2)}`
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontWeight: (params.value as number) < lowStockThreshold ? 'bold' : 'normal' }}>
            {params.value as number}
          </Typography>
          {(params.value as number) < lowStockThreshold && (
            <Chip 
              icon={<Warning sx={{ fontSize: '1rem !important' }} />} 
              label="Low" 
              color="error" 
              size="small" 
              variant="filled"
            />
          )}
        </Stack>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <IconButton size="small" color="primary" onClick={() => handleOpen(params.row as Product)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => confirmDelete(params.id as string)}>
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      )
    }
  ];

  return (
    <Box sx={{ height: '100%', width: '100%', p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>Inventory Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your tuck shop stock levels and prices.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'stretch' }}>
          <TextField
            size="small"
            label="Low Stock Threshold"
            type="number"
            value={lowStockThreshold}
            onChange={(e) => onUpdateThreshold(parseInt(e.target.value) || 0)}
            sx={{ width: { xs: '100%', sm: 160 } }}
            slotProps={{
              htmlInput: { min: 0 }
            }}
          />
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ py: { xs: 1, sm: 'inherit' } }}>
            Add Product
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ 
        flexGrow: 1,
        minHeight: 250,
        width: '100%', 
        borderRadius: 4, 
        overflow: 'hidden', 
        border: '1px solid rgba(0, 0, 0, 0.1)',
        bgcolor: 'background.paper'
      }}>
        <DataGrid
          rows={products}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          getRowClassName={(params) => {
            return params.row.stock < lowStockThreshold ? 'low-stock-row' : '';
          }}
          sx={{ 
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              fontWeight: 'bold',
            },
            '& .low-stock-row': {
              bgcolor: 'rgba(211, 47, 47, 0.04)',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.08)',
              }
            }
          }}
        />
      </Box>

      {/* Edit/Add Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Product Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                type="number"
                label="Cost Price (GH₵)"
                fullWidth
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
              <TextField
                type="number"
                label="Selling Price (GH₵)"
                fullWidth
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
              />
            </Stack>
            <TextField
              type="number"
              label="Starting Stock"
              fullWidth
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formData.name}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this product? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
