import Dexie, { type Table } from 'dexie';
import { type RecurringItem, type PaymentHistory, type NotificationLog } from '../types';

class FamilyBillDatabase extends Dexie {
  recurringItems!: Table<RecurringItem, number>;
  paymentHistory!: Table<PaymentHistory, number>;
  notificationsLog!: Table<NotificationLog, number>;

  constructor() {
    super('FamilyBillDatabase');
    this.version(1).stores({
      // Primary keys and index definitions optimized for chronological dashboard fetches
      recurringItems: '++id, name, category, nextDueDate',
      paymentHistory: '++id, itemId, datePaid, paymentMethodType, chargedToItemId'
    });
    this.version(2).stores({
      notificationsLog: '++id, itemId, [itemId+dueDate+milestone]'
    });
  }
}

export const db = new FamilyBillDatabase();
