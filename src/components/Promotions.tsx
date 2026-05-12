/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Box, Typography, Button, Stack, Card, CardContent, Grid, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Switch, FormControlLabel, Chip, IconButton
} from '@mui/material';
import { Add, Delete, Edit, Percent, LocalOffer, ConfirmationNumber } from '@mui/icons-material';
import { Promotion, PromotionType, Product } from '../types';

interface PromotionsProps {
  promotions: Promotion[];
  onUpdatePromotions: (promotions: Promotion[]) => void;
  products: Product[];
}

export default function Promotions({ promotions, onUpdatePromotions, products }: PromotionsProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Promotion, 'id'>>({
    name: '',
    type: 'percentage',
    value: 0,
    minPurchase: 0,
    productId: '',
    active: true
  });

  const handleOpen = (promo?: Promotion) => {
    if (promo) {
      setEditingId(promo.id);
      setFormData({
        name: promo.name,
        type: promo.type,
        value: promo.value,
        minPurchase: promo.minPurchase || 0,
        productId: promo.productId || '',
        active: promo.active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        productId: '',
        active: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = () => {
    if (editingId) {
      const updated = promotions.map(p => p.id === editingId ? { ...formData, id: editingId } : p);
      onUpdatePromotions(updated);
    } else {
      const newPromo: Promotion = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      };
      onUpdatePromotions([...promotions, newPromo]);
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    onUpdatePromotions(promotions.filter(p => p.id !== id));
  };

  const getTypeIcon = (type: PromotionType) => {
    switch (type) {
      case 'percentage': return <Percent />;
      case 'fixed': return <ConfirmationNumber />;
      case 'bogo': return <LocalOffer />;
    }
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>Promotions & Discounts</Typography>
          <Typography variant="body2" color="text.secondary">
            Define special offers to boost sales and clear inventory.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          New Promotion
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {promotions.map((promo) => (
          <Grid item xs={12} md={6} lg={4} key={promo.id}>
            <Card sx={{ 
              opacity: promo.active ? 1 : 0.6,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{promo.name}</Typography>
                      <Chip 
                        size="small" 
                        label={promo.type.toUpperCase()} 
                        icon={getTypeIcon(promo.type)}
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 1, fontWeight: 'bold' }}
                      />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpen(promo)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(promo.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Stack>

                  <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      {promo.type === 'percentage' && `${promo.value}% OFF`}
                      {promo.type === 'fixed' && `GH₵${promo.value} OFF`}
                      {promo.type === 'bogo' && `Buy ${promo.minPurchase} Get 1 FREE`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {promo.productId 
                        ? `Applies only to ${products.find(p => p.id === promo.productId)?.name || 'selected product'}`
                        : 'Applies to entire order sum'}
                    </Typography>
                    {promo.minPurchase! > 0 && promo.type !== 'bogo' && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Minimum Purchase: GH₵{promo.minPurchase}
                      </Typography>
                    )}
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch 
                        checked={promo.active} 
                        onChange={(e) => {
                          const updated = promotions.map(p => p.id === promo.id ? { ...p, active: e.target.checked } : p);
                          onUpdatePromotions(updated);
                        }}
                      />
                    }
                    label={<Typography variant="body2">{promo.active ? 'Active' : 'Inactive'}</Typography>}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingId ? 'Edit Promotion' : 'Create Promotion'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Promotion Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. End of Term Sale"
            />
            
            <TextField
              select
              label="Type"
              fullWidth
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as PromotionType })}
            >
              <MenuItem value="percentage">Percentage (%) Discount</MenuItem>
              <MenuItem value="fixed">Fixed Amount (GH₵) Discount</MenuItem>
              <MenuItem value="bogo">Buy X Get 1 FREE (BOGO)</MenuItem>
            </TextField>

            <TextField
              label={formData.type === 'percentage' ? 'Percentage (%)' : formData.type === 'fixed' ? 'Amount (GH₵)' : 'Quantity to Buy'}
              fullWidth
              type="number"
              value={formData.type === 'bogo' ? formData.minPurchase : formData.value}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (formData.type === 'bogo') {
                  setFormData({ ...formData, minPurchase: val, value: 1 }); // Value=1 means 1 free
                } else {
                  setFormData({ ...formData, value: val });
                }
              }}
            />

            {formData.type !== 'bogo' && (
              <TextField
                label="Minimum Purchase Amount (GH₵)"
                fullWidth
                type="number"
                value={formData.minPurchase}
                onChange={(e) => setFormData({ ...formData, minPurchase: parseFloat(e.target.value) || 0 })}
                helperText="Leave 0 for no minimum"
              />
            )}

            <TextField
              select
              label="Applicable Product"
              fullWidth
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <MenuItem value="">Entire Cart (Total Order)</MenuItem>
              {products.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch 
                  checked={formData.active} 
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })} 
                />
              }
              label="Promotion Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
            {editingId ? 'Save Changes' : 'Create Promotion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
