import { differenceInCalendarDays, parseISO } from 'date-fns';
import { db } from '../db/database';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const checkAndFireNotifications = async () => {
  // 1. Ensure we have permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return; // Don't bother doing math if we can't notify
  }

  const today = new Date();
  
  // 2. Fetch active recurring items
  const items = await db.recurringItems.filter(item => item.status !== 'Paid').toArray();
  
  // The milestones we care about
  const milestones = [5, 3, 1, 0] as const;

  for (const item of items) {
    if (!item.id) continue;
    
    const dueDate = parseISO(item.nextDueDate);
    const daysUntilDue = differenceInCalendarDays(dueDate, today);

    // 3. Check if current days matches one of our target milestones
    // Wait, what if they open the app when it's 4 days away, but they missed the 5-day notification?
    // Usually, milestone notifications trigger EXACTLY on those days to prevent spam.
    // If we want exact days:
    if ((milestones as readonly number[]).includes(daysUntilDue)) {
      const currentMilestone = daysUntilDue as 5 | 3 | 1 | 0;
      
      // 4. Check if we already notified for THIS item, THIS due date, and THIS milestone
      const alreadyNotified = await db.notificationsLog
        .where({
          itemId: item.id,
          dueDate: item.nextDueDate,
          milestone: currentMilestone
        })
        .count();

      if (alreadyNotified === 0) {
        // Fire Notification!
        let title = '';
        let body = '';

        if (currentMilestone === 0) {
          title = `Bill Due Today: ${item.name}`;
          body = `Your bill for ${item.name} is due today!`;
        } else if (currentMilestone === 1) {
          title = `Bill Due Tomorrow: ${item.name}`;
          body = `Your bill for ${item.name} is due tomorrow.`;
        } else {
          title = `Upcoming Bill: ${item.name}`;
          body = `Your bill for ${item.name} is due in ${currentMilestone} days.`;
        }

        try {
          // Attempt to show notification via Service Worker first (better mobile PWA support)
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.showNotification) {
            await registration.showNotification(title, {
              body,
              icon: '/jin-tracker/favicon.svg',
              tag: `bill-${item.id}-${currentMilestone}`, // Prevents duplicate stacking
            });
          } else {
            // Fallback to standard web notification
            new Notification(title, { body, icon: '/jin-tracker/favicon.svg' });
          }

          // 5. Log it so we don't fire it again today
          await db.notificationsLog.add({
            itemId: item.id,
            dueDate: item.nextDueDate,
            milestone: currentMilestone,
            timestamp: new Date().toISOString()
          });

        } catch (e) {
          console.error("Failed to show notification", e);
        }
      }
    }
  }
};
