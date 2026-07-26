import { db } from '../db/database';

const FILENAME = 'jin_tracker_backup.json';
const MIME_TYPE = 'application/json';

export async function exportDataToJson(): Promise<string> {
  const recurringItems = await db.recurringItems.toArray();
  const paymentHistory = await db.paymentHistory.toArray();
  const notificationsLog = await db.notificationsLog.toArray();

  const exportData = {
    version: 2, // Bumped to 2 for CRDT sync mapping
    timestamp: new Date().toISOString(),
    data: {
      recurringItems,
      paymentHistory,
      notificationsLog
    }
  };

  return JSON.stringify(exportData, null, 2);
}

async function performMerge(cloudData: any): Promise<void> {
  if (!cloudData || !cloudData.data) return;

  const { recurringItems: cloudItems = [], paymentHistory: cloudPayments = [], notificationsLog: cloudLogs = [] } = cloudData.data;

  await db.transaction('rw', [db.recurringItems, db.paymentHistory, db.notificationsLog], async () => {
    // 1. Merge recurringItems
    const localItems = await db.recurringItems.toArray();
    const localItemMap = new Map(localItems.map(i => [i.syncId, i]));

    for (const cItem of cloudItems) {
      if (!cItem.syncId) continue;
      const lItem = localItemMap.get(cItem.syncId);

      const cUpdated = cItem.updatedAt || 0;
      const lUpdated = lItem?.updatedAt || 0;

      if (!lItem) {
        // Cloud has it, local doesn't. Add to local, stripped of its old cloud ID so it gets a fresh local ID.
        const { id, ...itemWithoutId } = cItem;
        await db.recurringItems.add(itemWithoutId as any);
      } else if (cUpdated > lUpdated) {
        // Cloud is newer. Update local, but keep local's ID!
        const { id, ...itemWithoutId } = cItem;
        await db.recurringItems.update(lItem.id!, itemWithoutId as any);
      }
    }

    // Refresh local item map to get any newly assigned local IDs
    const updatedLocalItems = await db.recurringItems.toArray();
    const syncIdToLocalIdMap = new Map(updatedLocalItems.map(i => [i.syncId, i.id]));

    // 2. Merge paymentHistory
    const localPayments = await db.paymentHistory.toArray();
    const localPaymentMap = new Map(localPayments.map(p => [p.syncId, p]));

    for (const cPayment of cloudPayments) {
      if (!cPayment.syncId) continue;

      // Remap the itemId to the current local DB's ID for that item
      if (cPayment.itemSyncId) {
        cPayment.itemId = syncIdToLocalIdMap.get(cPayment.itemSyncId) || cPayment.itemId;
      }

      const lPayment = localPaymentMap.get(cPayment.syncId);
      const cUpdated = cPayment.updatedAt || 0;
      const lUpdated = lPayment?.updatedAt || 0;

      if (!lPayment) {
        const { id, ...paymentWithoutId } = cPayment;
        await db.paymentHistory.add(paymentWithoutId as any);
      } else if (cUpdated > lUpdated) {
        const { id, ...paymentWithoutId } = cPayment;
        await db.paymentHistory.update(lPayment.id!, paymentWithoutId as any);
      }
    }

    // 3. Merge notificationsLog
    const localLogs = await db.notificationsLog.toArray();
    const localLogMap = new Map(localLogs.map(n => [n.syncId, n]));

    for (const cLog of cloudLogs) {
      if (!cLog.syncId) continue;

      if (cLog.itemSyncId) {
        cLog.itemId = syncIdToLocalIdMap.get(cLog.itemSyncId) || cLog.itemId;
      }

      const lLog = localLogMap.get(cLog.syncId);
      const cUpdated = cLog.updatedAt || 0;
      const lUpdated = lLog?.updatedAt || 0;

      if (!lLog) {
        const { id, ...logWithoutId } = cLog;
        await db.notificationsLog.add(logWithoutId as any);
      } else if (cUpdated > lUpdated) {
        const { id, ...logWithoutId } = cLog;
        await db.notificationsLog.update(lLog.id!, logWithoutId as any);
      }
    }
  });
}

export async function syncToGoogleDrive(accessToken: string): Promise<boolean> {
  try {
    const metadata = {
      name: FILENAME,
      mimeType: MIME_TYPE
    };

    // 1. Search for existing file
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILENAME}' and trashed=false&spaces=drive`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) throw new Error('Failed to search Drive');

    const searchData = await searchRes.json();
    const files = searchData.files;

    if (files && files.length > 0) {
      const fileId = files[0].id;

      // 2. DOWNLOAD cloud data
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (downloadRes.ok) {
        const cloudData = await downloadRes.json();
        // 3. MERGE with local data
        await performMerge(cloudData);
      }

      // 4. EXPORT merged data
      const jsonContent = await exportDataToJson();

      // 5. UPLOAD merged data back
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonContent], { type: MIME_TYPE }));

      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        }
      );

      return updateRes.ok;
    } else {
      // Create new file (no merge needed because cloud is empty)
      const jsonContent = await exportDataToJson();

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonContent], { type: MIME_TYPE }));

      const createRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        }
      );

      return createRes.ok;
    }
  } catch (error) {
    console.error('Google Drive Sync Error:', error);
    return false;
  }
}
