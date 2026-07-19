import { db } from '../db/database';
import { type RecurringItem, type PaymentHistory } from '../types';

const formatYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export async function seedDatabase() {
  // Check if DB is already seeded to prevent duplicate runs
  const count = await db.recurringItems.count();
  if (count > 0) return;

  const today = new Date();
  
  // 1. Insert Credit Cards
  const cards: RecurringItem[] = [
    {
      name: 'CyberBank Quantum Card',
      category: 'Credit Card',
      costEstimate: 0,
      frequency: 'Monthly',
      nextDueDate: formatYMD(addDays(today, 10)),
      isVariableCost: true,
      status: 'Active'
    },
    {
      name: 'Neon Finance Platinum',
      category: 'Credit Card',
      costEstimate: 0,
      frequency: 'Monthly',
      nextDueDate: formatYMD(addDays(today, 25)),
      isVariableCost: true,
      status: 'Active'
    }
  ];
  
  await db.recurringItems.bulkAdd(cards);
  
  const insertedCards = await db.recurringItems.where('category').equals('Credit Card').toArray();
  const cyberCardId = insertedCards.find(c => c.name.includes('CyberBank'))?.id;
  
  // 2. Insert Standard Obligations
  const items: RecurringItem[] = [
    {
      name: 'Grid Energy (Electricity)',
      category: 'Utility',
      costEstimate: 4500,
      frequency: 'Monthly',
      nextDueDate: formatYMD(today), // Due today! (Imminent)
      isVariableCost: true,
      status: 'Active',
      remainingBalance: 2500 // Example of partial payment
    },
    {
      name: 'NetRunner Subscription',
      category: 'Subscription',
      costEstimate: 549,
      frequency: 'Monthly',
      nextDueDate: formatYMD(addDays(today, 2)),
      isVariableCost: false,
      status: 'Active'
    },
    {
      name: 'HyperLink Fiber Internet',
      category: 'Utility',
      costEstimate: 1699,
      frequency: 'Monthly',
      nextDueDate: formatYMD(addDays(today, -1)), // Due yesterday (Critical)
      isVariableCost: false,
      status: 'Active'
    },
    {
      name: 'Hovercar Maintenance',
      category: 'Maintenance',
      costEstimate: 12000,
      frequency: 'Semi-Annually',
      nextDueDate: formatYMD(addDays(today, 45)),
      isVariableCost: true,
      status: 'Active'
    },
    {
      name: 'Gym Membership Promo',
      category: 'Subscription',
      costEstimate: 1500,
      frequency: 'Monthly',
      nextDueDate: formatYMD(addDays(today, 15)),
      endDate: formatYMD(addDays(today, 100)), // Example of end date
      isVariableCost: false,
      status: 'Active'
    },
    {
      name: 'Grocery Restock',
      category: 'Utility',
      costEstimate: 3500,
      frequency: 'One-Off',
      nextDueDate: formatYMD(addDays(today, -2)),
      isVariableCost: false,
      status: 'Paid' // Already paid one-off
    }
  ];
  
  await db.recurringItems.bulkAdd(items);
  
  // 3. Insert Historical Payments to populate the "Total Paid" metric
  const allItems = await db.recurringItems.toArray();
  const netrunner = allItems.find(i => i.name.includes('NetRunner'));
  const gridEnergy = allItems.find(i => i.name.includes('Grid Energy'));
  const grocery = allItems.find(i => i.name.includes('Grocery Restock'));
  
  const history: PaymentHistory[] = [];
  
  // Payment made 5 days ago via Credit Card
  if (netrunner && netrunner.id) {
    history.push({
      itemId: netrunner.id,
      datePaid: formatYMD(addDays(today, -5)),
      costIncurred: 549,
      paymentMethodType: 'Credit Card',
      chargedToItemId: cyberCardId
    });
    
    // Simulate the business logic updating the card's cost estimate
    if (cyberCardId) {
       const card = insertedCards.find(c => c.id === cyberCardId);
       if (card) {
          await db.recurringItems.update(cyberCardId, { costEstimate: card.costEstimate + 549 });
       }
    }
  }
  
  // Partial payment made today via Cash/Bank
  if (gridEnergy && gridEnergy.id) {
    history.push({
      itemId: gridEnergy.id,
      datePaid: formatYMD(today),
      costIncurred: 2000,
      paymentMethodType: 'Cash/Bank'
    });
  }

  // One-off payment made 2 days ago
  if (grocery && grocery.id) {
    history.push({
      itemId: grocery.id,
      datePaid: formatYMD(addDays(today, -2)),
      costIncurred: 3500,
      paymentMethodType: 'Cash/Bank'
    });
  }
  
  if (history.length > 0) {
    await db.paymentHistory.bulkAdd(history);
  }
  
  // Force a page reload to ensure reactive queries pick up the mass insert nicely
  window.location.reload();
}
