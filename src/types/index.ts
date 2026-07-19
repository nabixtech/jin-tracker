export type ItemCategory = 'Subscription' | 'Credit Card' | 'Maintenance' | 'Utility';
export type BillingFrequency = 'Monthly' | 'Semi-Annually' | 'Annually' | 'One-Off';
export type PaymentMethodType = 'Cash/Bank' | 'Credit Card';

export interface RecurringItem {
  id?: number;              // Auto-incrementing primary key
  name: string;             // e.g., "Meralco Bill", "Netflix Sub", "BPI Visa"
  category: ItemCategory;
  costEstimate: number;     // Acts as baseline budget buffer for variable items
  frequency: BillingFrequency;
  nextDueDate: string;      // "YYYY-MM-DD"
  isVariableCost: boolean;  // True = varies per month (e.g., electricity); False = fixed
  endDate?: string;         // Optional end date for recurring bills "YYYY-MM-DD"
  remainingBalance?: number; // Tracks partial payments within a single billing cycle
  status?: 'Active' | 'Paid'; // Active by default. Paid when one-off is paid or end date is reached.
}

export interface PaymentHistory {
  id?: number;              // Auto-incrementing primary key
  itemId: number;           // Foreign Key linking back to the RecurringItem ID
  datePaid: string;         // "YYYY-MM-DD"
  costIncurred: number;     // The actual financial damage/amount paid out
  paymentMethodType: PaymentMethodType;
  chargedToItemId?: number; // Foreign Key pointing to a Credit Card's RecurringItem ID
}
