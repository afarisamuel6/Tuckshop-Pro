/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

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
function loadDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }
  return { ...defaultDB };
}

// Helper to save db
function saveDB(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db file:', err);
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
  app.post('/api/sync', (req, res) => {
    const incoming = req.body;
    const db = loadDB();

    // 1. Merge append-only collections by ID
    db.sales = mergeAppendOnly(db.sales, incoming.sales);
    db.reports = mergeAppendOnly(db.reports, incoming.reports);
    db.logs = mergeAppendOnly(db.logs, incoming.logs);

    // 2. Merge mutable collections by lastUpdated timestamp
    db.products = mergeUpdated(db.products, incoming.products);
    db.teams = mergeUpdated(db.teams, incoming.teams);
    db.promotions = mergeUpdated(db.promotions, incoming.promotions);

    // 3. Simple replace/largest values for threshold
    if (incoming.lowStockThreshold !== undefined && incoming.lowStockThreshold !== db.lowStockThreshold) {
      // Use client threshold if there is any change
      db.lowStockThreshold = incoming.lowStockThreshold;
    }

    saveDB(db);

    res.json({
      success: true,
      data: db
    });
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
