/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  Box, Card, CardContent, Typography, Button, IconButton, 
  Stack, Divider, TextField, Chip, Alert, CardActionArea, Badge, List, MenuItem
} from '@mui/material';
import { Add, Remove, ShoppingCart, Person, Phone, Lightbulb, LocalOffer } from '@mui/icons-material';
import { Product, CartItem, CATEGORIES, CUSTOMER_TIPS, Customer, Promotion } from '../types';

interface CheckoutProps {
  products: Product[];
  onCompleteSale: (items: CartItem[], customer?: Customer, promotionId?: string, discountAmount?: number) => void;
  lowStockThreshold: number;
  promotions: Promotion[];
}

export default function Checkout({ products, onCompleteSale, lowStockThreshold, promotions }: CheckoutProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [tipIndex] = useState(() => Math.floor(Math.random() * CUSTOMER_TIPS.length));
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return selectedCategory === 'All' 
      ? products 
      : products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  }, [cart]);

  const applicablePromotions = useMemo(() => {
    return promotions.filter(p => {
      if (!p.active) return false;
      
      // If product specific
      if (p.productId) {
        const item = cart.find(i => i.id === p.productId);
        if (!item) return false;
        
        if (p.type === 'bogo') {
          return item.quantity >= (p.minPurchase || 2);
        }
        
        return (item.sellingPrice * item.quantity) >= (p.minPurchase || 0);
      }
      
      // General
      return total >= (p.minPurchase || 0);
    });
  }, [promotions, cart, total]);

  const discountAmount = useMemo(() => {
    const promo = promotions.find(p => p.id === selectedPromotionId);
    if (!promo || !promo.active) return 0;

    let discount = 0;
    if (promo.productId) {
      const item = cart.find(i => i.id === promo.productId);
      if (!item) return 0;

      if (promo.type === 'percentage') {
        discount = (item.sellingPrice * item.quantity) * (promo.value / 100);
      } else if (promo.type === 'fixed') {
        discount = promo.value;
      } else if (promo.type === 'bogo') {
        const numFree = Math.floor(item.quantity / (promo.minPurchase || 2));
        discount = numFree * item.sellingPrice;
      }
    } else {
       if (promo.type === 'percentage') {
        discount = total * (promo.value / 100);
      } else if (promo.type === 'fixed') {
        discount = promo.value;
      }
    }

    return Math.min(discount, total);
  }, [selectedPromotionId, promotions, cart, total]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Soft Drinks': return '🥤';
      case 'Water': return '💧';
      case 'Biscuit': return '🍪';
      case 'Candy': return '🍬';
      case 'Bread': return '🍞';
      case 'Meat': return '🍗';
      case 'Snacks': return '🍿';
      case 'Stationery': return '📓';
      default: return '🛍️';
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onCompleteSale(
      cart, 
      customer.name ? customer : undefined, 
      selectedPromotionId || undefined, 
      discountAmount > 0 ? discountAmount : undefined
    );
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setSelectedPromotionId('');
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '8fr 4fr' }, 
        gap: 3, 
        flex: 1, 
        minHeight: 0 
      }}>
        {/* Product Selection */}
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Point of Sale</Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
              <Chip 
                label="All" 
                clickable 
                color={selectedCategory === 'All' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('All')} 
              />
              {CATEGORIES.map(cat => (
                <Chip 
                  key={cat} 
                  label={cat} 
                  clickable 
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(cat)} 
                />
              ))}
            </Stack>
          </Stack>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, 
            gap: 2 
          }}>
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="product-card"
                sx={{ 
                  height: '100%', 
                  opacity: product.stock <= 0 ? 0.6 : 1,
                  background: 'rgba(255, 255, 255, 0.9) !important',
                  borderRadius: 4
                }}
              >
                <CardActionArea 
                  onClick={() => addToCart(product)} 
                  disabled={product.stock <= 0}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ 
                      aspectRatio: '1/1', 
                      bgcolor: 'rgba(25, 118, 210, 0.05)', 
                      borderRadius: 2, 
                      mb: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '2rem'
                    }}>
                      {getCategoryIcon(product.category)}
                    </Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800 }} noWrap>
                      {product.name}
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Typography variant="caption" color={product.stock < lowStockThreshold ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 'bold' }}>
                        Stock: {product.stock}
                      </Typography>
                      <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 800 }}>
                        GH₵{product.sellingPrice.toFixed(2)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Cart & Checkout */}
        <Box sx={{ height: '100%' }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Badge badgeContent={cart.length} color="secondary">
                    <ShoppingCart />
                  </Badge>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Current Order</Typography>
                </Stack>
              </Box>

              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Customer Details (Optional)
                </Typography>
                <Stack spacing={2} sx={{ mb: 2 }}>
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Name" 
                    slotProps={{ input: { startAdornment: <Person sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} /> } }}
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  />
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Phone" 
                    slotProps={{ input: { startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} /> } }}
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </Stack>
              </Box>

              <Divider />

              {promotions.length > 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Apply Promotion
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Promotion"
                    value={selectedPromotionId}
                    onChange={(e) => setSelectedPromotionId(e.target.value)}
                    disabled={applicablePromotions.length === 0}
                    slotProps={{ input: { startAdornment: <LocalOffer sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} /> } }}
                  >
                    <MenuItem value="">No Promotion</MenuItem>
                    {applicablePromotions.map((promo) => (
                      <MenuItem key={promo.id} value={promo.id}>
                        {promo.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {applicablePromotions.length === 0 && cart.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      No promotions applicable to this order.
                    </Typography>
                  )}
                </Box>
              )}

              <Divider />

              <List sx={{ p: 0 }}>
                {cart.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                    <ShoppingCart sx={{ fontSize: 48, mb: 1 }} />
                    <Typography>Cart is empty</Typography>
                  </Box>
                ) : (
                  cart.map(item => (
                    <Box key={item.id} sx={{ p: 2, borderBottom: '1px solid #efefef' }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            GH₵{(item.sellingPrice * item.quantity).toFixed(2)} (GH₵{item.sellingPrice.toFixed(2)})
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <IconButton size="small" onClick={() => removeFromCart(item.id)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography sx={{ fontWeight: 'bold' }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => addToCart(item)}>
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  ))
                )}
              </List>
            </CardContent>

            <Divider />

            <Box sx={{ p: 2, bgcolor: 'rgba(255, 235, 59, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <Box sx={{ 
                bgcolor: 'rgba(255, 245, 157, 0.4)', 
                p: 2, 
                borderRadius: 3, 
                border: '1px solid rgba(255, 235, 59, 0.3)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Lightbulb sx={{ color: '#fbc02d', fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#f57f17', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Tip of the Day
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#5d4037', fontStyle: 'italic', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  "{CUSTOMER_TIPS[tipIndex]}"
                </Typography>
              </Box>

              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    GH₵{total.toFixed(2)}
                  </Typography>
                </Stack>
                {discountAmount > 0 && (
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="error.main">Discount</Typography>
                    <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 'bold' }}>
                      -GH₵{discountAmount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>Total</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    GH₵{(total - discountAmount).toFixed(2)}
                  </Typography>
                </Stack>
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  sx={{ 
                    py: 1.5, 
                    borderRadius: 3, 
                    fontWeight: 800,
                    bgcolor: 'success.main',
                    boxShadow: '0 8px 16px rgba(46, 125, 50, 0.2)',
                    '&:hover': { bgcolor: '#1b5e20', transform: 'scale(1.02)' },
                    transition: 'all 0.2s'
                  }}
                >
                  Complete Sale
                </Button>
              </Stack>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
