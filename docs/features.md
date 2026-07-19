# JinTracker Feature Documentation

This document serves as the primary technical and behavioral reference for JinTracker. It is designed to act as both a developer guide, user manual, and context-provider for AI assistants to maintain the architectural integrity of the application.

## 1. Architectural Principles
- **Offline-First**: JinTracker operates 100% locally on the device using IndexedDB (`dexie` and `dexie-react-hooks`). There is no backend, no cloud database, and no server footprint. Data privacy and offline availability are guaranteed.
- **Reactive UI**: The UI reacts immediately to database changes through `useLiveQuery`. Do not use local component state to store primary data; always read from and write to the database.
- **Mobile-First Design**: The UI must remain highly optimized for mobile views. Use drawers for complex interactions rather than standard modals, and maintain the "Aqua Electra" dark, glassmorphism aesthetic.

## 2. Core Features & Business Logic

### 2.1 The Continuous Ledger System
The `remainingBalance` field on a `RecurringItem` operates as a continuous, double-entry style rolling ledger rather than just a status flag.

* **Partial Payments**: If a user pays less than the due amount using the "Partial Payment" flag, `remainingBalance` drops by that amount. 
* **Overpayments / Pay-in-Advance**: If a user pays *more* than the due amount using the "Partial Payment" flag, the `remainingBalance` drops below zero (becoming a negative value, representing a credit).
* **UI Clamping**: The UI (e.g. Upcoming Ledger, Forecast) automatically clamps negative balances to `0` for display purposes using `Math.max(0, val)`.
* **Cycle Rollover**: When a billing cycle completes (Full Payment), the system takes the standard `costEstimate`, adds any overpaid credit (the negative `remainingBalance`), and sets that as the new cycle's balance. This ensures advance payments seamlessly cover future cycles until the credit is exhausted.

### 2.2 Billing Frequencies & End Dates
* **One-Off Bills**: Items marked as 'One-Off' skip the cyclic ledger. Once paid, their `status` is permanently set to `Paid`, and they stop appearing on the active dashboard.
* **Recurring Bills**: Standard recurring bills (Monthly, Semi-Annually, etc.) rotate their `nextDueDate` forward upon a Full Payment.
* **End Dates**: Recurring items can have an optional `endDate`. When a cycle rollover surpasses the `endDate`, the item's `status` changes to `Paid` automatically.

### 2.3 Payoff Projections (Forecast)
The Forecast tab (Projections) visualizes the path to zero-debt for fixed obligations.

* **Eligibility**: Only bills that are Active (`status !== 'Paid'`), Fixed Cost (`isVariableCost === false`), and have an `endDate` appear in the Forecast list.
* **Calculation**: The algorithm (`calculateTotalRemainingProjection`) respects the Continuous Ledger. It takes the current cycle's `remainingBalance`, then simulates time ticking forward based on the item's frequency, adding the `costEstimate` for each future cycle until it hits the `endDate`. If a user made a massive overpayment (credit), that credit offsets the future projected cycles accurately.
* **Linked Cards**: Because items are not strictly mapped to cards in the schema, the Forecast page queries the `PaymentHistory` table. It looks at the *most recent payment* for the bill—if it was paid via a Credit Card, it assumes that card is the primary linked card for display purposes.

## 3. Data Schema

### 3.1 `RecurringItem` (Table: `recurringItems`)
- `id`: Auto-incremented primary key.
- `name`: String, name of the bill.
- `category`: String (e.g. 'Credit Card', 'Utility', 'Subscription').
- `costEstimate`: Number, the baseline expected cost per cycle.
- `frequency`: String ('Monthly', 'Semi-Annually', 'Annually', 'One-Off').
- `nextDueDate`: String (YYYY-MM-DD), the anchor date for the current cycle.
- `isVariableCost`: Boolean, flags if the cost fluctuates.
- `status`: String ('Active', 'Paid').
- `remainingBalance`: Optional Number. The rolling ledger balance for the current cycle.
- `endDate`: Optional String (YYYY-MM-DD). The absolute final date of the obligation.

### 3.2 `PaymentHistory` (Table: `paymentHistory`)
- `id`: Auto-incremented primary key.
- `itemId`: Number, foreign key to `RecurringItem`.
- `datePaid`: String (YYYY-MM-DD).
- `costIncurred`: Number, the actual physical money paid.
- `paymentMethodType`: String ('Cash/Bank', 'Credit Card').
- `chargedToItemId`: Optional Number. If paid via Credit Card, this links to the specific `RecurringItem` of category 'Credit Card' that absorbed the debt.
