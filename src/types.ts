/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  name: string;
  phone: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  accessCode: string;
}

export type Campus = 'Main Campus' | 'Nsaa Campus' | 'Sabala Campus';

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  totalRevenue: number;
  totalProfit: number;
  discountAmount?: number;
  promotionId?: string;
  customer?: Customer;
  teamName: string;
  memberName: string;
  campus: Campus;
}

export interface ShiftReport {
  id: string;
  timestamp: number;
  teamName: string;
  campus: Campus;
  totalRevenue: number;
  totalProfit: number;
  salesCount: number;
}

export type PromotionType = 'percentage' | 'bogo' | 'fixed';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number; // Percentage (e.g. 10 for 10%) or Fixed amount
  minPurchase?: number; // Minimum subtotal (for percentage/fixed) or minimum quantity (for bogo)
  productId?: string; // Optional: Only applies to this product
  active: boolean;
}

export interface LoginLog {
  id: string;
  timestamp: number;
  user: string; // Name of person or 'Admin'
  role: Role;
  teamName?: string;
  campus?: Campus;
}

export type View = 'checkout' | 'inventory' | 'analytics' | 'login' | 'admin' | 'sales' | 'promotions';
export type Role = 'admin' | 'team_member';

export const CATEGORIES = ['Soft Drinks', 'Water', 'Biscuit', 'Candy', 'Bread', 'Meat', 'Other'];
export const CAMPUSES: Campus[] = ['Main Campus', 'Nsaa Campus', 'Sabala Campus'];

export const CUSTOMER_TIPS = [
  "Always greet customers with a smile! 😊",
  "Suggest a cold drink with every snack purchase.",
  "Upselling can increase revenue by 20%!",
  "Check stock levels before the rush hour.",
  "Ask if they want a receipt (it helps building trust).",
  "The customer is always right—even when they're not!",
  "Make sure your change is counted twice.",
  "Keep your workspace clean to attract more sales.",
  "Learn your regulars' names and favorite items."
];
