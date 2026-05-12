/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Box, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Avatar } from '@mui/material';
import { ShoppingCart, Inventory, BarChart, Logout, Store, AdminPanelSettings, EventAvailable, ReceiptLong, LocalOffer } from '@mui/icons-material';
import { View, Campus, Role } from '../types';
import { useState } from 'react';
import { storageService } from '../services/storage';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  teamName: string | null;
  campus: Campus | null;
  memberName: string | null;
  role: Role | null;
  onLogout: () => void;
}

const drawerWidth = 240;

export default function Sidebar({ currentView, onViewChange, teamName, campus, memberName, role, onLogout }: SidebarProps) {
  const [eodOpen, setEodOpen] = useState(false);
  const [report, setReport] = useState<any>(null);

  const menuItems = [
    { text: 'Checkout', icon: <ShoppingCart />, view: 'checkout' as View, roles: ['team_member'] },
    { text: 'Sales Record', icon: <ReceiptLong />, view: 'sales' as View, roles: ['admin', 'team_member'] },
    { text: 'Inventory', icon: <Inventory />, view: 'inventory' as View, roles: ['admin'] },
    { text: 'Analytics', icon: <BarChart />, view: 'analytics' as View, roles: ['admin'] },
    { text: 'Promotions', icon: <LocalOffer />, view: 'promotions' as View, roles: ['admin'] },
    { text: 'Admin', icon: <AdminPanelSettings />, view: 'admin' as View, roles: ['admin'] },
  ].filter(item => !role || item.roles.includes(role));

  const handleEndDay = () => {
    const sales = storageService.getSales();
    const teamSales = sales.filter(s => s.teamName === teamName && s.campus === campus);
    
    const totalRevenue = teamSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalProfit = teamSales.reduce((sum, s) => sum + s.totalProfit, 0);
    
    const shiftReport = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      teamName: teamName || '',
      campus: campus || 'Main Campus' as Campus,
      totalRevenue,
      totalProfit,
      salesCount: teamSales.length
    };
    
    storageService.saveShiftReport(shiftReport);
    setReport(shiftReport);
    setEodOpen(true);
  };

  const handleFinishEod = () => {
    setEodOpen(false);
    onLogout();
  };

  return (
    <Box
      className="glass-panel"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        height: '100%',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar 
          src="/logo.png"
          variant="rounded"
          sx={{ 
            width: 40, 
            height: 40, 
            bgcolor: 'primary.main', 
            borderRadius: 2,
            '& img': { p: 0.5, objectFit: 'contain' }
          }}
        >
          T
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            DTI TuckShop
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            Entrepreneurship Tool
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ opacity: 0.1 }} />
      
      <Box sx={{ p: 2, m: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2, border: '1px solid rgba(25, 118, 210, 0.1)' }}>
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
          Active Shift
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          {teamName || 'Rotating Shift'}
        </Typography>
        <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600 }}>
          {memberName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {campus || 'Main Campus'}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">Shift in progress</Typography>
        </Stack>
      </Box>

      <List sx={{ px: 0 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              selected={currentView === item.view}
              onClick={() => onViewChange(item.view)}
              sx={{
                py: 1.2,
                px: 3,
                borderRight: currentView === item.view ? '4px solid #1976d2' : '4px solid transparent',
                bgcolor: currentView === item.view ? 'rgba(25, 118, 210, 0.1) !important' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: currentView === item.view ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography 
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: currentView === item.view ? 700 : 500,
                      color: currentView === item.view ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {item.text}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Stack spacing={1}>
          <Button 
            fullWidth 
            variant="contained" 
            color="success" 
            startIcon={<EventAvailable />}
            onClick={handleEndDay}
            sx={{ fontWeight: 'bold' }}
          >
            End of Day
          </Button>
          <Button 
            fullWidth 
            variant="text" 
            color="inherit" 
            startIcon={<Logout />} 
            onClick={onLogout}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.05)' }
            }}
          >
            Logout
          </Button>
        </Stack>
      </Box>

      <Dialog open={eodOpen} onClose={() => setEodOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Shift Summary Report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Box sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary">Shift Revenue</Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 900 }}>
                GH₵{report?.totalRevenue.toFixed(2)}
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, border: '1px solid #efefef', borderRadius: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Total Profit:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>GH₵{report?.totalProfit.toFixed(2)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Transactions:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{report?.salesCount}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Campus:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{report?.campus}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2">Team:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{report?.teamName}</Typography>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button fullWidth variant="contained" onClick={handleFinishEod}>Confirm & Logout</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

