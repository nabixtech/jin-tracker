import Dexie, { type Table } from 'dexie';
import { type RecurringItem, type PaymentHistory } from '../types';

class FamilyBillDatabase extends Dexie {
  recurringItems!: Table<RecurringItem, number>;
  paymentHistory!: Table<PaymentHistory, number>;

  constructor() {
    super('FamilyBillDatabase');
    this.version(1).stores({
      // Primary keys and index definitions optimized for chronological dashboard fetches
      recurringItems: '++id, name, category, nextDueDate',
      paymentHistory: '++id, itemId, datePaid, paymentMethodType, chargedToItemId'
    });
  }
}

export const db = new FamilyBillDatabase();
