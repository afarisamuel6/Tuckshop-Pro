/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Sale, Team, ShiftReport, Campus, LoginLog, Role, Promotion } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'tuckshop_products',
  SALES: 'tuckshop_sales',
  TEAM: 'tuckshop_current_team',
  CAMPUS: 'tuckshop_current_campus',
  MEMBER: 'tuckshop_current_member',
  ROLE: 'tuckshop_current_role',
  TEAMS_LIST: 'tuckshop_teams',
  REPORTS: 'tuckshop_reports',
  LOGS: 'tuckshop_login_logs',
  THRESHOLD: 'tuckshop_low_stock_threshold',
  PROMOTIONS: 'tuckshop_promotions',
};

const ADMIN_CREDENTIALS = {
  user: 'dtient',
  pass: 'dtient26!'
};

export const storageService = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  deleteProduct: (id: string) => {
    const products = storageService.getProducts();
    const updated = products.filter(p => p.id !== id);
    storageService.saveProducts(updated);
  },

  updateProduct: (id: string, productData: Partial<Product>) => {
    const products = storageService.getProducts();
    const updated = products.map(p => p.id === id ? { ...p, ...productData } as Product : p);
    storageService.saveProducts(updated);
  },

  getTeams: (): Team[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);
    const teams = data ? JSON.parse(data) : [];
    return teams.map((t: any) => ({
      ...t,
      members: t.members || []
    }));
  },

  saveTeams: (teams: Team[]) => {
    localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(teams));
  },

  deleteTeam: (id: string) => {
    const teams = storageService.getTeams();
    const updated = teams.filter(t => t.id !== id);
    storageService.saveTeams(updated);
  },

  updateTeam: (id: string, teamData: Partial<Team>) => {
    const teams = storageService.getTeams();
    const updated = teams.map(t => t.id === id ? { ...t, ...teamData } : t);
    storageService.saveTeams(updated);
  },

  getSales: (): Sale[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    const sales = data ? JSON.parse(data) : [];
    return sales.map((s: any) => ({
      ...s,
      items: s.items || []
    }));
  },

  getReports: (): ShiftReport[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
  },

  saveShiftReport: (report: ShiftReport) => {
    const reports = storageService.getReports();
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([...reports, report]));
    
    // Clear current sales after EOD (or mark them as processed)
    // For simplicity, we'll keep them but they are now captured in a report
  },

  saveSale: (sale: Sale) => {
    const sales = storageService.getSales();
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([...sales, sale]));
    
    // Update stock levels
    const products = storageService.getProducts();
    const updatedProducts = products.map(p => {
      const cartItem = sale.items.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, stock: p.stock - cartItem.quantity };
      }
      return p;
    });
    storageService.saveProducts(updatedProducts);
  },

  getCurrentTeam: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.TEAM);
  },

  getCurrentCampus: (): Campus | null => {
    return localStorage.getItem(STORAGE_KEYS.CAMPUS) as Campus | null;
  },

  getCurrentMember: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.MEMBER);
  },

  getCurrentRole: (): 'admin' | 'team_member' | null => {
    return localStorage.getItem(STORAGE_KEYS.ROLE) as any;
  },

  getLogs: (): LoginLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },

  logLogin: (user: string, role: Role, teamName?: string, campus?: Campus) => {
    const logs = storageService.getLogs();
    const newLog: LoginLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      user,
      role,
      teamName,
      campus
    };
    // Keep only last 100 logs for performance
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  },

  validateAdmin: (user: string, pass: string): boolean => {
    return user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass;
  },

  getLowStockThreshold: (): number => {
    const data = localStorage.getItem(STORAGE_KEYS.THRESHOLD);
    return data ? parseInt(data) : 5;
  },

  saveLowStockThreshold: (threshold: number) => {
    localStorage.setItem(STORAGE_KEYS.THRESHOLD, threshold.toString());
  },

  getPromotions: (): Promotion[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
    return data ? JSON.parse(data) : [];
  },

  savePromotions: (promotions: Promotion[]) => {
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promotions));
  },

  deleteSale: (saleId: string) => {
    const sales = storageService.getSales();
    const saleToDelete = sales.find(s => s.id === saleId);
    
    if (saleToDelete) {
      // Restore stock levels
      const products = storageService.getProducts();
      const updatedProducts = products.map(p => {
        const cartItem = (saleToDelete.items || []).find(item => item.id === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock + cartItem.quantity };
        }
        return p;
      });
      storageService.saveProducts(updatedProducts);
      
      const updatedSales = sales.filter(s => s.id !== saleId);
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updatedSales));
    }
  },

  setSession: (teamName: string | null, campus: Campus | null, memberName: string | null, role: 'admin' | 'team_member' | null) => {
    if (teamName) localStorage.setItem(STORAGE_KEYS.TEAM, teamName);
    else localStorage.removeItem(STORAGE_KEYS.TEAM);
    
    if (campus) localStorage.setItem(STORAGE_KEYS.CAMPUS, campus);
    else localStorage.removeItem(STORAGE_KEYS.CAMPUS);

    if (memberName) localStorage.setItem(STORAGE_KEYS.MEMBER, memberName);
    else localStorage.removeItem(STORAGE_KEYS.MEMBER);

    if (role) localStorage.setItem(STORAGE_KEYS.ROLE, role);
    else localStorage.removeItem(STORAGE_KEYS.ROLE);
  },

  // Initialize with dummy data if empty
  init: () => {
    if (storageService.getProducts().length === 0) {
      const initialProducts: Product[] = [
        { id: '1', name: 'Coca Cola', category: 'Soft Drinks', costPrice: 0.8, sellingPrice: 1.5, stock: 20 },
        { id: '2', name: 'Mineral Water', category: 'Water', costPrice: 0.5, sellingPrice: 1.2, stock: 15 },
        { id: '3', name: 'Oreo Biscuits', category: 'Biscuit', costPrice: 0.7, sellingPrice: 1.4, stock: 4 },
        { id: '4', name: 'Gummy Bears', category: 'Candy', costPrice: 0.3, sellingPrice: 0.8, stock: 25 },
        { id: '5', name: 'Fresh Bread', category: 'Bread', costPrice: 1.2, sellingPrice: 2.5, stock: 10 },
        { id: '6', name: 'Chicken Pie', category: 'Meat', costPrice: 1.5, sellingPrice: 3.5, stock: 10 },
      ];
      storageService.saveProducts(initialProducts);
    }
    const existingTeams = storageService.getTeams();
    // Reset if teams exist but are in the old format (no members or accessCode)
    const needsMigration = existingTeams.length > 0 && existingTeams.some(t => !t.members || t.members.length === 0 || !t.accessCode);
    
    if (existingTeams.length === 0 || needsMigration) {
      const initialTeams: Team[] = [
        { id: '1', name: 'Team Alpha', members: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'], accessCode: '1234' },
        { id: '2', name: 'Team Beta', members: ['Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'], accessCode: '5678' },
        { id: '3', name: 'Team Gamma', members: ['Kevin', 'Linda', 'Mike', 'Nancy', 'Oscar'], accessCode: '9012' },
      ];
      storageService.saveTeams(initialTeams);
    }
  }
};
