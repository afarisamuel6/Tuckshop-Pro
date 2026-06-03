/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Sale, Team, ShiftReport, Campus, LoginLog, Role, Promotion } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize client-side Firebase for fallback when running serverless (e.g. on Vercel)
let clientDb: any = null;
try {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  console.log('Firebase Firestore initialized successfully on client side with database ID:', firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('Failed to initialize Firebase client-side SDK:', error);
}

// Helper to merge append-only lists by ID
function mergeAppendOnlyClient<T extends { id: string }>(serverList: T[], incomingList: T[]): T[] {
  const mergedMap = new Map<string, T>();
  for (const item of serverList || []) {
    if (item && item.id) mergedMap.set(item.id, item);
  }
  for (const item of incomingList || []) {
    if (item && item.id) mergedMap.set(item.id, item);
  }
  return Array.from(mergedMap.values());
}

// Helper to merge updated items by timestamp or lastUpdated
function mergeUpdatedClient<T extends { id: string, lastUpdated?: number }>(serverList: T[], incomingList: T[]): T[] {
  const mergedMap = new Map<string, T>();
  for (const item of serverList || []) {
    if (item && item.id) mergedMap.set(item.id, item);
  }
  for (const item of incomingList || []) {
    if (item && item.id) {
      const existing = mergedMap.get(item.id);
      if (!existing || (item.lastUpdated || 0) > (existing.lastUpdated || 0)) {
        mergedMap.set(item.id, item);
      }
    }
  }
  return Array.from(mergedMap.values());
}

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
        promotions: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMOTIONS) || '[]'),
        resetTimestamp: Number(localStorage.getItem('tuckshop_reset_timestamp')) || 0
      };

      let syncSucceeded = false;

      // 1. First attempt through full-stack Express API
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const json = await res.json();
            if (json.success && json.data) {
              storageService.updateLocalStateWithServerData(json.data, payload.lowStockThreshold);
              syncSucceeded = true;
            }
          }
        }
      } catch (apiErr) {
        console.warn('Backend Express sync failed / not running. Falling back to direct client-side Firebase sync...', apiErr);
      }

      // 2. Direct client-side Firestore fallback (e.g., when hosted on Vercel)
      if (!syncSucceeded && clientDb) {
        const docRef = doc(clientDb, 'settings', 'state');
        const docSnap = await getDoc(docRef);
        
        let currentDb: any = {
          products: [],
          sales: [],
          teams: [],
          reports: [],
          logs: [],
          lowStockThreshold: 5,
          promotions: [],
          resetTimestamp: 0
        };

        if (docSnap.exists()) {
          const firestoreData = docSnap.data();
          if (firestoreData) {
            currentDb = {
              products: firestoreData.products || [],
              sales: firestoreData.sales || [],
              teams: firestoreData.teams || [],
              reports: firestoreData.reports || [],
              logs: firestoreData.logs || [],
              lowStockThreshold: firestoreData.lowStockThreshold !== undefined ? firestoreData.lowStockThreshold : 5,
              promotions: firestoreData.promotions || [],
              resetTimestamp: Number(firestoreData.resetTimestamp) || 0
            };
          }
        }

        const serverResetTimestamp = Number(currentDb.resetTimestamp) || 0;
        const incomingResetTimestamp = payload.resetTimestamp;

        if (serverResetTimestamp > incomingResetTimestamp) {
          // Server reset is newer, discard client's local updates
          storageService.updateLocalStateWithServerData(currentDb, payload.lowStockThreshold);
          syncSucceeded = true;
        } else if (incomingResetTimestamp > serverResetTimestamp) {
          // Client reset is newer, override firestore
          currentDb.resetTimestamp = incomingResetTimestamp;
          currentDb.products = payload.products;
          currentDb.sales = payload.sales;
          currentDb.teams = payload.teams;
          currentDb.reports = payload.reports;
          currentDb.logs = payload.logs;
          currentDb.promotions = payload.promotions;
          currentDb.lowStockThreshold = payload.lowStockThreshold;

          await setDoc(docRef, currentDb);
          storageService.updateLocalStateWithServerData(currentDb, payload.lowStockThreshold);
          syncSucceeded = true;
        } else {
          // Standard merge logic client-side
          currentDb.sales = mergeAppendOnlyClient(currentDb.sales, payload.sales);
          currentDb.reports = mergeAppendOnlyClient(currentDb.reports, payload.reports);
          currentDb.logs = mergeAppendOnlyClient(currentDb.logs, payload.logs);

          currentDb.products = mergeUpdatedClient(currentDb.products, payload.products);
          currentDb.teams = mergeUpdatedClient(currentDb.teams, payload.teams);
          currentDb.promotions = mergeUpdatedClient(currentDb.promotions, payload.promotions);

          if (payload.lowStockThreshold !== undefined && payload.lowStockThreshold !== currentDb.lowStockThreshold) {
            currentDb.lowStockThreshold = payload.lowStockThreshold;
          }

          // Save back direct to Firestore
          await setDoc(docRef, currentDb);
          
          // Sync local storage with newly merged state
          storageService.updateLocalStateWithServerData(currentDb, payload.lowStockThreshold);
          syncSucceeded = true;
        }
      }
    } catch (err) {
      console.warn('Sync failed completely (offline or firestore permission issue):', err);
    } finally {
      isSyncing = false;
    }
  },

  updateLocalStateWithServerData: (serverData: any, localThreshold: number) => {
    let hasChanges = false;

    const serverResetTimestamp = Number(serverData.resetTimestamp) || 0;
    const localResetTimestamp = Number(localStorage.getItem('tuckshop_reset_timestamp')) || 0;

    if (serverResetTimestamp > localResetTimestamp) {
      console.log('Detected a remote database reset. Clearing local storage data to start fresh...');
      
      localStorage.setItem('tuckshop_reset_timestamp', serverResetTimestamp.toString());
      localStorage.setItem('tuckshop_initialized', 'true');
      
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(serverData.products || []));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(serverData.sales || []));
      localStorage.setItem(STORAGE_KEYS.TEAMS_LIST, JSON.stringify(serverData.teams || []));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(serverData.reports || []));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(serverData.logs || []));
      localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(serverData.promotions || []));
      localStorage.setItem(STORAGE_KEYS.THRESHOLD, (serverData.lowStockThreshold || 5).toString());
      
      hasChanges = true;
    } else {
      const updateKey = (key: string, serverVal: any) => {
        const serverStr = JSON.stringify(serverVal || []);
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
      if (localThreshold !== serverThreshold) {
        localStorage.setItem(STORAGE_KEYS.THRESHOLD, serverThreshold.toString());
        hasChanges = true;
      }
    }

    if (hasChanges) {
      syncCallbacks.forEach(cb => {
        try { cb(); } catch (e) { console.error(e); }
      });
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

  resetAllData: async () => {
    const timestamp = Date.now();
    const cleanDb = {
      products: [],
      sales: [],
      teams: [],
      reports: [],
      logs: [
        {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          user: 'Administrator',
          role: 'admin' as const,
          teamName: 'System Reset',
          campus: 'Main Campus' as const
        }
      ],
      lowStockThreshold: 5,
      promotions: [],
      resetTimestamp: timestamp
    };

    // 1. Try backend reset route
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          localStorage.setItem('tuckshop_reset_timestamp', timestamp.toString());
          localStorage.setItem('tuckshop_initialized', 'true');
          storageService.updateLocalStateWithServerData(cleanDb, 5);
          return true;
        }
      }
    } catch (err) {
      console.warn('Backend reset API failed, attempting client-side direct override...', err);
    }

    // 2. Client-side Firestore direct override fallback
    if (clientDb) {
      try {
        const docRef = doc(clientDb, 'settings', 'state');
        await setDoc(docRef, cleanDb);
        localStorage.setItem('tuckshop_reset_timestamp', timestamp.toString());
        localStorage.setItem('tuckshop_initialized', 'true');
        storageService.updateLocalStateWithServerData(cleanDb, 5);
        return true;
      } catch (err) {
        console.error('Failed direct client-side reset:', err);
      }
    }

    // 3. Fallback to offline local storage-only reset
    localStorage.setItem('tuckshop_reset_timestamp', timestamp.toString());
    localStorage.setItem('tuckshop_initialized', 'true');
    storageService.updateLocalStateWithServerData(cleanDb, 5);
    return true;
  },

  // Initialize with dummy data if empty
  init: () => {
    if (localStorage.getItem('tuckshop_initialized') === 'true') {
      // Already initialized or has been explicitly reset to start fresh
      storageService.syncWithServer();
      return;
    }

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

    localStorage.setItem('tuckshop_initialized', 'true');

    // Run initial background sync
    storageService.syncWithServer();
  }
};
