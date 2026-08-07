import { addMonths, addYears, format, parseISO, setDate, lastDayOfMonth, getDate } from 'date-fns';
import { db } from '../db/database';
import { type RecurringItem, type PaymentMethodType } from '../types';

/**
 * Iterates a given date string forward by its declared frequency tier.
 */
export function calculateNextDueDate(currentDateStr: string, frequency: string): string {
  const date = parseISO(currentDateStr);
  let nextDate: Date;

  switch (frequency) {
    case 'Semi-Monthly': {
      const currentDay = getDate(date);
      if (currentDay <= 15) {
        const targetDay = currentDay + 15;
        const maxDay = getDate(lastDayOfMonth(date));
        nextDate = setDate(date, Math.min(targetDay, maxDay));
      } else {
        const targetDay = currentDay - 15;
        nextDate = setDate(addMonths(date, 1), targetDay);
      }
      break;
    }
    case 'Monthly':
      nextDate = addMonths(date, 1);
      break;
    case 'Semi-Annually':
      nextDate = addMonths(date, 6);
      break;
    case 'Annually':
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }
  return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Processes a bill payment: logs payment history records and rolls the master cycle date.
 */
export async function processPaymentTransaction(
  item: RecurringItem,
  amount: number,
  method: PaymentMethodType,
  selectedCardId?: number,
  isPartial: boolean = false
): Promise<void> {
  if (!item.id) throw new Error("Cannot process item without a valid database identifier.");

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Execute atomically to secure table synchronization
  await db.transaction('rw', [db.paymentHistory, db.recurringItems], async () => {
    // 1. Log transaction history block
    await db.paymentHistory.add({
      syncId: crypto.randomUUID(),
      updatedAt: Date.now(),
      itemId: item.id!,
      itemSyncId: item.syncId,
      datePaid: todayStr,
      costIncurred: amount,
      paymentMethodType: method,
      chargedToItemId: method === 'Credit Card' ? selectedCardId : undefined
    });

    if (isPartial) {
      // Deduct from remaining balance, do not advance cycle. Allow it to go negative (credit)
      const currentBalance = item.remainingBalance ?? item.costEstimate;
      await db.recurringItems.update(item.id!, {
        remainingBalance: currentBalance - amount,
        updatedAt: Date.now()
      });
    } else {
      // Full payment logic
      if (item.frequency === 'One-Off') {
        await db.recurringItems.update(item.id!, { status: 'Paid', remainingBalance: 0, updatedAt: Date.now() });
      } else {
        const futureCycleDate = calculateNextDueDate(item.nextDueDate, item.frequency);
        if (item.endDate && futureCycleDate > item.endDate) {
          await db.recurringItems.update(item.id!, { status: 'Paid', remainingBalance: 0, updatedAt: Date.now() });
        } else {
          // Rotate master obligation cycle date forward
          // Apply any excess payment (or existing credit) to the new cycle's balance
          const currentBal = item.remainingBalance ?? item.costEstimate;
          const newBalance = item.costEstimate + currentBal - amount;

          await db.recurringItems.update(item.id!, {
            nextDueDate: futureCycleDate,
            remainingBalance: newBalance,
            updatedAt: Date.now()
          });
        }
      }
    }
  });
}

/**
 * Standard utility function allowing families to skip an un-encountered billing period 
 * without generating zeroed financial transaction histories.
 */
export async function skipBillingCycle(item: RecurringItem): Promise<void> {
  if (!item.id) return;
  const futureCycleDate = calculateNextDueDate(item.nextDueDate, item.frequency);
  await db.recurringItems.update(item.id, { nextDueDate: futureCycleDate, updatedAt: Date.now() });
}

/**
 * Computes the real cash leaving the family bank accounts for a specific month context (e.g., "2026-07")
 */
export async function computeMonthlyOutflow(yearMonthStr: string): Promise<number> {
  const history = await db.paymentHistory
    .where('datePaid')
    .between(`${yearMonthStr}-01`, `${yearMonthStr}-31`, true, true)
    .filter(log => !log.deletedAt)
    .toArray();

  return history.reduce((accum, log) => accum + log.costIncurred, 0);
}

/**
 * Calculates the total projected cost of an item from its nextDueDate until its endDate.
 */
export function calculateTotalRemainingProjection(item: RecurringItem): number {
  if (item.status === 'Paid') return 0;
  
  let total = item.remainingBalance ?? item.costEstimate;
  if (!item.endDate || item.frequency === 'One-Off') return total;
  
  let currentDateStr = item.nextDueDate;
  
  while (true) {
    currentDateStr = calculateNextDueDate(currentDateStr, item.frequency);
    if (currentDateStr > item.endDate) break;
    total += item.costEstimate;
  }
  
  return Math.max(0, total);
}

/**
 * Deletes a payment transaction from the history without altering the item's current state.
 */
export async function deletePaymentTransaction(paymentId: number): Promise<void> {
  await db.paymentHistory.delete(paymentId);
}

/**
 * Updates a payment transaction in the history without altering the item's current state.
 */
export async function updatePaymentTransaction(paymentId: number, updates: Partial<Omit<import('../types').PaymentHistory, 'id' | 'itemId'>>): Promise<void> {
  await db.paymentHistory.update(paymentId, { ...updates, updatedAt: Date.now() });
}
