import { type ItemCategory } from '../types';

/**
 * Keyword-to-category mapping for smart expense auto-tagging.
 * Includes PH-relevant brands/services for better local matching.
 */
const EXPENSE_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'jollibee', 'mcdonalds', 'mcdonald', 'starbucks', 'coffee', 'dinner', 'lunch',
    'breakfast', 'restaurant', 'food', 'eat', 'pizza', 'burger', 'chicken', 'kfc',
    'wendy', 'subway', 'milk tea', 'boba', 'ramen', 'sushi', 'bar', 'cafe', 'bistro',
    'grill', 'fried', 'chowking', 'greenwich', 'shakey', 'kenny rogers', 'yellowcab',
    'army navy', 'max', 'inasal', 'turks', 'bonchon', 'samgyup', 'yakiniku',
    'snack', 'meal', 'dine', 'dining', 'buffet', 'delivery', 'foodpanda', 'grabfood',
    'tim hortons', 'pancake', 'karinderya', 'lechon', 'sisig', 'pares', 'tapsi'
  ],
  'Groceries': [
    'grocery', 'groceries', 'puregold', 'sm supermarket', 'robinsons supermarket',
    'landers', 'snr', 's&r', 'metro mart', 'waltermart', 'rustan', 'marketplace',
    'wet market', 'palengke', 'sari-sari', 'minimart', 'ever gotesco'
  ],
  'Transportation': [
    'grab', 'uber', 'angkas', 'gas', 'fuel', 'petrol', 'parking', 'toll', 'lrt',
    'mrt', 'bus', 'taxi', 'beep', 'autosweep', 'easytrip', 'caltex', 'shell',
    'petron', 'phoenix', 'joyride', 'move it', 'lalamove', 'car wash', 'carwash',
    'jeep', 'jeepney', 'tricycle', 'fare', 'commute', 'gasoline', 'diesel'
  ],
  'Shopping': [
    'lazada', 'shopee', 'zalora', 'shein', 'uniqlo', 'h&m', 'zara', 'sm mall',
    'mall', 'amazon', 'tiktok shop', 'clothes', 'shoes', 'bag', 'gadget', 'appliance',
    'hardware', 'ace', 'true value', 'wilcon', 'cw home', 'furniture', 'ikea',
    'decathlon', 'nike', 'adidas'
  ],
  'Healthcare': [
    'mercury drug', 'watsons', 'doctor', 'dentist', 'hospital', 'clinic', 'pharmacy',
    'medicine', 'medical', 'dental', 'health', 'checkup', 'lab', 'therapy', 'vitamin',
    'consultation', 'xray', 'x-ray', 'vaccine', 'generika', 'southstar', 'rose pharmacy'
  ],
  'Entertainment': [
    'cinema', 'movie', 'concert', 'game', 'gaming', 'steam', 'playstation', 'xbox',
    'arcade', 'karaoke', 'ktv', 'bowling', 'billiards', 'hobby', 'ticket',
    'theme park', 'enchanted kingdom', 'star city'
  ],
  'Travel': [
    'hotel', 'airbnb', 'flight', 'airline', 'cebu pacific', 'pal', 'airasia',
    'booking', 'resort', 'vacation', 'trip', 'travel', 'passport', 'visa fee',
    'agoda', 'traveloka', 'klook'
  ],
  'Education': [
    'tuition', 'school', 'book', 'course', 'training', 'seminar', 'workshop',
    'udemy', 'coursera', 'class', 'lesson', 'tutorial', 'exam', 'review',
    'enrollment', 'student', 'university', 'college', 'kindergarten'
  ],
  'Personal Care': [
    'salon', 'barber', 'spa', 'massage', 'skincare', 'haircut', 'nail', 'beauty',
    'grooming', 'parlor', 'rebond', 'hair color', 'facial', 'wax', 'laundry',
    'dry clean'
  ],
  'Gifts': [
    'gift', 'present', 'birthday', 'christmas', 'anniversary', 'donation', 'charity',
    'wedding', 'baptism', 'fiesta', 'flowers', 'bouquet', 'debut'
  ],
  'Utility': [
    'meralco', 'maynilad', 'manila water', 'globe', 'pldt', 'smart', 'converge',
    'internet', 'electric', 'water bill', 'wifi', 'postpaid', 'prepaid', 'load'
  ],
  'Subscription': [
    'netflix', 'spotify', 'youtube', 'hbo', 'disney', 'apple', 'icloud',
    'membership', 'premium', 'subscribe', 'subscription', 'monthly plan'
  ],
};

/**
 * Guesses the expense category based on the item name using keyword matching.
 * Returns 'Misc' if no keywords match.
 */
export function guessExpenseCategory(name: string): ItemCategory {
  const lower = name.toLowerCase().trim();

  for (const [category, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as ItemCategory;
      }
    }
  }

  return 'Misc';
}
