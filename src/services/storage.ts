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

let syncCallbacks: (() => void)[] = [];
let isSyncing = false;

export const storageService = {
  onSync: (cb: () => void) => {
    syncCallbacks.push(cb);
    return () => {
      syncCallbacks = syncCallbacks.filter(c => c !== cb);
    };
  },

  syncWithServer: async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      // Prepare payload with local data
      const payload = {
        products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'),
        sales: JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]'),
        teams: JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS_LIST) || '[]'),
        reports: JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]'),
        logs: JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]'),
        lowStockThreshold: storageService.getLowStockThreshold(),
        promotions: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMOTIONS) || '[]')
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const serverData = json.data;
          let hasChanges = false;

          const updateKey = (key: string, serverVal: any) => {
            const serverStr = JSON.stringify(serverVal);
            const localStr = localStorage.getItem(key);
            if (localStr !== serverStr) {
              localStorage.setItem(key, serverStr);
              hasChanges = true;
            }
          };

          updateKey(STORAGE_KEYS.PRODUCTS, serverData.products);
          updateKey(STORAGE_KEYS.SALES, serverData.sales);
          updateKey(STORAGE_KEYS.TEAMS_LIST, serverData.teams);
          updateKey(STORAGE_KEYS.REPORTS, serverData.reports);
          updateKey(STORAGE_KEYS.LOGS, serverData.logs);
          updateKey(STORAGE_KEYS.PROMOTIONS, serverData.promotions);

          const serverThreshold = Number(serverData.lowStockThreshold) || 5;
          if (payload.lowStockThreshold !== serverThreshold) {
            localStorage.setItem(STORAGE_KEYS.THRESHOLD, serverThreshold.toString());
            hasChanges = true;
          }

          if (hasChanges) {
            syncCallbacks.forEach(cb => {
              try { cb(); } catch (e) { console.error(e); }
            });
          }
        }
      }
    } catch (err) {
      console.warn('Sync failed (offline or server issues):', err);
    } finally {
      isSyncing = false;
    }
  },

  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const parsed = data ? JSON.parse(data) : [];
    // Filter out logically deleted products
    return parsed.filter((p: any) => !p.deleted);
  },

  saveProducts: (products: Product[]) => {
    // Keep logically deleted products so they aren't lost when syncing with server
    const currentRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const deletedMap = new Map<string, any>();
    currentRaw.forEach((p: any) => {
      if (p.deleted) deletedMap.set(p.id, p);
    });

    const withTimestamps = products.map(p => ({
      ...p,
      lastUpdated: p.lastUpdated || Date.now()
    }));

    // Re-insert marked deleted ones so the server knows they are deleted
    const finalProducts = [...withTimestamps];
    deletedMap.forEach((p) => {
      if (!finalProducts.some(fp => fp.id === p.id)) {
        finalProducts.push(p);
      }
    });

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(finalProducts));
    storageService.syncWithServer();
  },

  deleteProduct: (id: string) => {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const updated = raw.map((p: any) => 
      p.id === id ? { ...p, deleted: true, lastUpdated: Date.now() } : p
    );
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    storageService.syncWithServer();
  },

  updateProduct: (id: string, productData: Partial<Product>) => {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const updated = raw.map((p: any) => 
      p.id === id ? { ...p, ...productData, lastUpdated: Date.now() } : p
    );
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    storageService.syncWithServer();
  },

  getTeams: (): Team[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);
    const teams = data ? JSON.parse(data) : [];
    return teams
      .filter((t: any) => !t.deleted)
      .map((t: any) => ({
        ...t,
        members: t.members || []
      }));
  },

  saveTeams: (teams: Team[]) => {
    const currentRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS_LIST) || '[]');
    const deletedMap = new Map<string, any>();
    currentRaw.forEach((t: any) => {
      if (t.deleted) deletedMap.set(t.id, t);
    });

    const withTimestamps = teams.map(t => ({
      ...t,
      lastUpdated: t.lastUpdated || Date.now()
    }));

    const finalTeams = [...withTimestamps];
    deletedMap.forEach((t) => {
      if (!finalTeams.some(ft => ft.id === t.id)) {
        finalTeams.push(t);
      }
    });

    localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(finalTeams));
    storageService.syncWithServer();
  },

  deleteTeam: (id: string) => {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS_LIST) || '[]');
    const updated = raw.map((t: any) => 
      t.id === id ? { ...t, deleted: true, lastUpdated: Date.now() } : t
    );
    localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(updated));
    storageService.syncWithServer();
  },

  updateTeam: (id: string, teamData: Partial<Team>) => {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS_LIST) || '[]');
    const updated = raw.map((t: any) => 
      t.id === id ? { ...t, ...teamData, lastUpdated: Date.now() } : t
    );
    localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(updated));
    storageService.syncWithServer();
  },

  getSales: (): Sale[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    const sales = data ? JSON.parse(data) : [];
    return sales
      .filter((s: any) => !s.deleted)
      .map((s: any) => ({
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
    storageService.syncWithServer();
  },

  saveSale: (sale: Sale) => {
    const sales = storageService.getSales();
    const newSale = { ...sale, lastUpdated: Date.now() };
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([...sales, newSale]));
    
    // Update stock levels
    const products = storageService.getProducts();
    const updatedProducts = products.map(p => {
      const cartItem = sale.items.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, stock: p.stock - cartItem.quantity, lastUpdated: Date.now() };
      }
      return p;
    });
    storageService.saveProducts(updatedProducts);
    // saveProducts automatically calls syncWithServer()
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
    storageService.syncWithServer();
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
    storageService.syncWithServer();
  },

  getPromotions: (): Promotion[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
    const parsed = data ? JSON.parse(data) : [];
    return parsed.filter((p: any) => !p.deleted);
  },

  savePromotions: (promotions: Promotion[]) => {
    const currentRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMOTIONS) || '[]');
    const deletedMap = new Map<string, any>();
    currentRaw.forEach((p: any) => {
      if (p.deleted) deletedMap.set(p.id, p);
    });

    const withTimestamps = promotions.map(p => ({
      ...p,
      lastUpdated: p.lastUpdated || Date.now()
    }));

    const finalPromotions = [...withTimestamps];
    deletedMap.forEach((p) => {
      if (!finalPromotions.some(fp => fp.id === p.id)) {
        finalPromotions.push(p);
      }
    });

    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(finalPromotions));
    storageService.syncWithServer();
  },

  deleteSale: (saleId: string) => {
    const rawSales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
    const saleToDelete = rawSales.find((s: any) => s.id === saleId);
    
    if (saleToDelete) {
      // Restore stock levels
      const products = storageService.getProducts();
      const updatedProducts = products.map(p => {
        const cartItem = (saleToDelete.items || []).find((item: any) => item.id === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock + cartItem.quantity, lastUpdated: Date.now() };
        }
        return p;
      });
      storageService.saveProducts(updatedProducts);
      
      const updatedSales = rawSales.map((s: any) => 
        s.id === saleId ? { ...s, deleted: true, lastUpdated: Date.now() } : s
      );
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updatedSales));
      storageService.syncWithServer();
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
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      const initialProducts: Product[] = [
        { id: '1', name: 'Coca Cola', category: 'Soft Drinks', costPrice: 0.8, sellingPrice: 1.5, stock: 20, lastUpdated: Date.now() },
        { id: '2', name: 'Mineral Water', category: 'Water', costPrice: 0.5, sellingPrice: 1.2, stock: 15, lastUpdated: Date.now() },
        { id: '3', name: 'Oreo Biscuits', category: 'Biscuit', costPrice: 0.7, sellingPrice: 1.4, stock: 4, lastUpdated: Date.now() },
        { id: '4', name: 'Gummy Bears', category: 'Candy', costPrice: 0.3, sellingPrice: 0.8, stock: 25, lastUpdated: Date.now() },
        { id: '5', name: 'Fresh Bread', category: 'Bread', costPrice: 1.2, sellingPrice: 2.5, stock: 10, lastUpdated: Date.now() },
        { id: '6', name: 'Chicken Pie', category: 'Meat', costPrice: 1.5, sellingPrice: 3.5, stock: 10, lastUpdated: Date.now() },
      ];
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    }
    const data = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);
    const existingTeams = data ? JSON.parse(data) : [];
    const needsMigration = existingTeams.length > 0 && existingTeams.some((t: any) => !t.members || t.members.length === 0 || !t.accessCode);
    
    if (existingTeams.length === 0 || needsMigration) {
      const initialTeams: Team[] = [
        { id: '1', name: 'Team Alpha', members: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'], accessCode: '1234', lastUpdated: Date.now() },
        { id: '2', name: 'Team Beta', members: ['Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'], accessCode: '5678', lastUpdated: Date.now() },
        { id: '3', name: 'Team Gamma', members: ['Kevin', 'Linda', 'Mike', 'Nancy', 'Oscar'], accessCode: '9012', lastUpdated: Date.now() },
      ];
      localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(initialTeams));
    }

    // Run initial background sync
    storageService.syncWithServer();
  }
};
