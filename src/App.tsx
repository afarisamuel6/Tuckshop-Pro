/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { storageService } from './services/storage';
import { Product, Sale, CartItem, Customer, View, Campus, Role, Promotion } from './types';
import Sidebar from './components/Sidebar';
import Checkout from './components/Checkout';
import Inventory from './components/Inventory';
import Analytics from './components/Analytics';
import TeamLogin from './components/TeamLogin';
import AdminDashboard from './components/AdminDashboard';
import SalesRecord from './components/SalesRecord';
import Promotions from './components/Promotions';

// Create a professional theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: 'rgba(255, 255, 255, 0)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default function App() {
  const [view, setView] = useState<View>('login');
  const [role, setRole] = useState<Role | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // Initial load
  useEffect(() => {
    const storedRole = storageService.getCurrentRole();
    const storedTeam = storageService.getCurrentTeam();
    const storedCampus = storageService.getCurrentCampus();
    const storedMember = storageService.getCurrentMember();
    
    if (storedRole === 'admin') {
      setRole('admin');
      setView('admin');
    } else if (storedRole === 'team_member' && storedTeam && storedCampus && storedMember) {
      setRole('team_member');
      setTeamName(storedTeam);
      setCampus(storedCampus);
      setMemberName(storedMember);
      setView('checkout');
    }

    setProducts(storageService.getProducts());
    setSales(storageService.getSales());
    setLowStockThreshold(storageService.getLowStockThreshold());
    setPromotions(storageService.getPromotions());
  }, []);

  const handleTeamLogin = (team: string, selectedCampus: Campus, member: string) => {
    setRole('team_member');
    setTeamName(team);
    setCampus(selectedCampus);
    setMemberName(member);
    storageService.logLogin(member, 'team_member', team, selectedCampus);
    storageService.setSession(team, selectedCampus, member, 'team_member');
    setView('checkout');
  };

  const handleAdminLogin = () => {
    setRole('admin');
    storageService.logLogin('Administrator', 'admin');
    storageService.setSession(null, null, null, 'admin');
    setView('admin');
  };

  const handleLogout = () => {
    setRole(null);
    setTeamName(null);
    setCampus(null);
    setMemberName(null);
    storageService.setSession(null, null, null, null);
    setView('login');
  };

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    storageService.saveProducts(newProducts);
  };

  const handleUpdateThreshold = (newThreshold: number) => {
    setLowStockThreshold(newThreshold);
    storageService.saveLowStockThreshold(newThreshold);
  };

  const handleUpdatePromotions = (newPromotions: Promotion[]) => {
    setPromotions(newPromotions);
    storageService.savePromotions(newPromotions);
  };

  const handleCompleteSale = (items: CartItem[], customer?: Customer, promotionId?: string, discountAmount?: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalRevenue = subtotal - (discountAmount || 0);
    const totalCost = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalProfit = totalRevenue - totalCost;

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items,
      totalRevenue,
      totalProfit,
      discountAmount,
      promotionId,
      customer,
      teamName: teamName || 'Unknown Team',
      memberName: memberName || 'Unknown Member',
      campus: campus || 'Main Campus',
    };

    storageService.saveSale(newSale);
    setSales(prev => [...prev, newSale]);
    setProducts(storageService.getProducts()); // Refresh products to show updated stock
  };

  if (view === 'login') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TeamLogin onTeamLogin={handleTeamLogin} onAdminLogin={handleAdminLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          height: '100vh', 
          p: 2, 
          gap: 2,
          overflow: 'hidden'
        }}
      >
        <Sidebar 
          currentView={view} 
          onViewChange={setView} 
          teamName={teamName} 
          campus={campus}
          memberName={memberName}
          role={role}
          onLogout={handleLogout} 
        />
        
        <Box 
          component="main" 
          className="glass-panel"
          sx={{ 
            flexGrow: 1, 
            p: 0, 
            height: '100%', 
            overflow: 'hidden',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {view === 'checkout' && (
            <Checkout 
              products={products} 
              onCompleteSale={handleCompleteSale} 
              lowStockThreshold={lowStockThreshold} 
              promotions={promotions}
            />
          )}
          {view === 'inventory' && (
            <Inventory 
              products={products} 
              onUpdateProducts={handleUpdateProducts} 
              lowStockThreshold={lowStockThreshold}
              onUpdateThreshold={handleUpdateThreshold}
            />
          )}
          {view === 'analytics' && (
            <Analytics sales={sales} />
          )}
          {view === 'admin' && (
            <AdminDashboard />
          )}
          {view === 'sales' && (
            <SalesRecord 
              sales={sales} 
              role={role} 
              onSalesUpdate={() => {
                setSales(storageService.getSales());
                setProducts(storageService.getProducts());
              }} 
            />
          )}
          {view === 'promotions' && (
            <Promotions 
              promotions={promotions}
              onUpdatePromotions={handleUpdatePromotions}
              products={products}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

