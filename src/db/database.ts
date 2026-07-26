import Dexie, { type Table } from 'dexie';
import { type RecurringItem, type PaymentHistory, type NotificationLog } from '../types';
import { encryptString, decryptString } from '../lib/encryption';

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
    this.version(3).stores({
      recurringItems: '++id, syncId, name, category, nextDueDate',
      paymentHistory: '++id, syncId, itemId, itemSyncId, datePaid, paymentMethodType, chargedToItemId',
      notificationsLog: '++id, syncId, itemId, itemSyncId, [itemId+dueDate+milestone]'
    }).upgrade(tx => {
      return tx.table('recurringItems').toCollection().modify(item => {
        if (!item.syncId) item.syncId = crypto.randomUUID();
        if (!item.updatedAt) item.updatedAt = Date.now();
      }).then(async () => {
        const items = await tx.table('recurringItems').toArray();
        const itemMap = new Map(items.map((i: any) => [i.id, i.syncId]));
        
        await tx.table('paymentHistory').toCollection().modify(item => {
          if (!item.syncId) item.syncId = crypto.randomUUID();
          if (!item.updatedAt) item.updatedAt = Date.now();
          if (!item.itemSyncId && item.itemId) item.itemSyncId = itemMap.get(item.itemId);
        });
        
        await tx.table('notificationsLog').toCollection().modify(item => {
          if (!item.syncId) item.syncId = crypto.randomUUID();
          if (!item.updatedAt) item.updatedAt = Date.now();
          if (!item.itemSyncId && item.itemId) item.itemSyncId = itemMap.get(item.itemId);
        });
      });
    });

    // Add lifecycle hooks for encryption/decryption
    this.recurringItems.hook('creating', (primKey, obj, trans) => {
      if (obj.accountNumber) {
        obj.accountNumber = encryptString(obj.accountNumber);
      }
    });

    this.recurringItems.hook('updating', (modifications, primKey, obj, trans) => {
      if (modifications.accountNumber !== undefined) {
        modifications.accountNumber = encryptString(modifications.accountNumber);
      }
    });

    this.recurringItems.hook('reading', (obj) => {
      if (obj && obj.accountNumber) {
        obj.accountNumber = decryptString(obj.accountNumber);
      }
      return obj;
    });
  }
}

export const db = new FamilyBillDatabase();
