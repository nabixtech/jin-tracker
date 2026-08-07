export type ItemCategory = 'Subscription' | 'Credit Card' | 'Maintenance' | 'Utility';
export type BillingFrequency = 'Monthly' | 'Semi-Monthly' | 'Semi-Annually' | 'Annually' | 'One-Off';
export type PaymentMethodType = 'Cash/Bank' | 'Credit Card';

export interface RecurringItem {
  id?: number;              // Auto-incrementing primary key
  syncId?: string;          // UUID for multi-device sync
  updatedAt?: number;       // Timestamp for conflict resolution
  deletedAt?: number;       // Timestamp for soft deletes
  name: string;             // e.g., "Meralco Bill", "Netflix Sub", "BPI Visa"
  category: ItemCategory;
  costEstimate: number;     // Acts as baseline budget buffer for variable items
  frequency: BillingFrequency;
  nextDueDate: string;      // "YYYY-MM-DD"
  isVariableCost: boolean;  // True = varies per month (e.g., electricity); False = fixed
  endDate?: string;         // Optional end date for recurring bills "YYYY-MM-DD"
  paymentLink?: string;     // Optional link to payment portal
  accountNumber?: string;   // Encrypted account number
  remainingBalance?: number; // Tracks partial payments within a single billing cycle
  status?: 'Active' | 'Paid'; // Active by default. Paid when one-off is paid or end date is reached.
  isAutopay?: boolean;
  autopayMethod?: PaymentMethodType;
  autopayChargedToItemId?: number;
  autopayBankName?: string;
}

export interface PaymentHistory {
  id?: number;              // Auto-incrementing primary key
  syncId?: string;          // UUID for multi-device sync
  updatedAt?: number;       // Timestamp for conflict resolution
  deletedAt?: number;       // Timestamp for soft deletes
  itemId: number;           // Foreign Key linking back to the RecurringItem ID
  itemSyncId?: string;      // UUID of the parent item (crucial for multi-device sync mapping)
  datePaid: string;         // "YYYY-MM-DD"
  costIncurred: number;     // The actual financial damage/amount paid out
  paymentMethodType: PaymentMethodType;
  chargedToItemId?: number; // Foreign Key pointing to a Credit Card's RecurringItem ID
}

export interface NotificationLog {
  id?: number;
  syncId?: string;          // UUID for multi-device sync
  updatedAt?: number;       // Timestamp for conflict resolution
  deletedAt?: number;       // Timestamp for soft deletes
  itemId: number;
  itemSyncId?: string;      // UUID of the parent item
  milestone: 5 | 3 | 1 | 0; // 5 days, 3 days, tomorrow(1), today(0)
  dueDate: string;          // The specific due date we alerted about "YYYY-MM-DD"
  timestamp: string;        // When we fired the notification (ISO string)
}
