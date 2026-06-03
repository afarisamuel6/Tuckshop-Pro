/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');
const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

// Handle active Firebase connection
let db: any = null;
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp, config.firestoreDatabaseId);
    console.log('Firebase Firestore initialized successfully with project ID:', config.projectId, 'and database ID:', config.firestoreDatabaseId);
  } else {
    console.warn('Firebase config not found at:', CONFIG_FILE);
  }
} catch (error) {
  console.error('Failed to initialize Firebase inside server-side environment:', error);
}

// Interface for DB schema
interface Database {
  products: any[];
  sales: any[];
  teams: any[];
  reports: any[];
  logs: any[];
  lowStockThreshold: number;
  promotions: any[];
}

const defaultDB: Database = {
  products: [
    { id: '1', name: 'Coca Cola', category: 'Soft Drinks', costPrice: 0.8, sellingPrice: 1.5, stock: 20, lastUpdated: Date.now() },
    { id: '2', name: 'Mineral Water', category: 'Water', costPrice: 0.5, sellingPrice: 1.2, stock: 15, lastUpdated: Date.now() },
    { id: '3', name: 'Oreo Biscuits', category: 'Biscuit', costPrice: 0.7, sellingPrice: 1.4, stock: 4, lastUpdated: Date.now() },
    { id: '4', name: 'Gummy Bears', category: 'Candy', costPrice: 0.3, sellingPrice: 0.8, stock: 25, lastUpdated: Date.now() },
    { id: '5', name: 'Fresh Bread', category: 'Bread', costPrice: 1.2, sellingPrice: 2.5, stock: 10, lastUpdated: Date.now() },
    { id: '6', name: 'Chicken Pie', category: 'Meat', costPrice: 1.5, sellingPrice: 3.5, stock: 10, lastUpdated: Date.now() },
  ],
  sales: [],
  teams: [
    { id: '1', name: 'Team Alpha', members: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'], accessCode: '1234', lastUpdated: Date.now() },
    { id: '2', name: 'Team Beta', members: ['Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'], accessCode: '5678', lastUpdated: Date.now() },
    { id: '3', name: 'Team Gamma', members: ['Kevin', 'Linda', 'Mike', 'Nancy', 'Oscar'], accessCode: '9012', lastUpdated: Date.now() },
  ],
  reports: [],
  logs: [],
  lowStockThreshold: 5,
  promotions: []
};

// Helper to load db
async function loadDB(): Promise<Database> {
  // Try retrieving state from Firestore first
  if (db) {
    try {
      const docRef = doc(db, 'settings', 'state');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        if (firestoreData) {
          return {
            products: firestoreData.products || [],
            sales: firestoreData.sales || [],
            teams: firestoreData.teams || [],
            reports: firestoreData.reports || [],
            logs: firestoreData.logs || [],
            lowStockThreshold: firestoreData.lowStockThreshold !== undefined ? firestoreData.lowStockThreshold : 5,
            promotions: firestoreData.promotions || []
          };
        }
      }
    } catch (err) {
      console.error('Error reading Firestore settings/state doc:', err);
    }
  }

  // Fall back to local db.json
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Automatically migrate local db.json to Firestore on first launch if Firestore is ready
      if (db) {
        await saveDB(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading local file backup:', err);
  }
  return { ...defaultDB };
}

// Helper to save db
async function saveDB(data: Database) {
  if (db) {
    try {
      const docRef = doc(db, 'settings', 'state');
      await setDoc(docRef, data);
    } catch (err) {
      console.error('Error saving state to Firestore:', err);
    }
  }

  // Preserve local backup for extra resilience/offline development
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local file backup:', err);
  }
}

// Helper to merge append-only lists by ID
function mergeAppendOnly<T extends { id: string }>(serverList: T[], incomingList: T[]): T[] {
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
function mergeUpdated<T extends { id: string, lastUpdated?: number }>(serverList: T[], incomingList: T[]): T[] {
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

async function startServer() {
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));

  // API endpoint for syncing data
  app.post('/api/sync', async (req, res) => {
    try {
      const incoming = req.body;
      const currentDb = await loadDB();

      // 1. Merge append-only collections by ID
      currentDb.sales = mergeAppendOnly(currentDb.sales, incoming.sales);
      currentDb.reports = mergeAppendOnly(currentDb.reports, incoming.reports);
      currentDb.logs = mergeAppendOnly(currentDb.logs, incoming.logs);

      // 2. Merge mutable collections by lastUpdated timestamp
      currentDb.products = mergeUpdated(currentDb.products, incoming.products);
      currentDb.teams = mergeUpdated(currentDb.teams, incoming.teams);
      currentDb.promotions = mergeUpdated(currentDb.promotions, incoming.promotions);

      // 3. Simple replace/largest values for threshold
      if (incoming.lowStockThreshold !== undefined && incoming.lowStockThreshold !== currentDb.lowStockThreshold) {
        currentDb.lowStockThreshold = incoming.lowStockThreshold;
      }

      await saveDB(currentDb);

      res.json({
        success: true,
        data: currentDb
      });
    } catch (error) {
      console.error('Error during live sync processing:', error);
      res.status(500).json({ success: false, error: 'Internal server error during synchronization' });
    }
  });

  // API endpoint for health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Vite middleware for development or serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
