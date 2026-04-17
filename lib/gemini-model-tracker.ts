import { getAdminDb } from './firebase-admin';

const GEMINI_PREMIUM_DAILY_LIMIT = 20;
const GEMINI_PREMIUM_MODEL = 'gemini-3-pro-preview'; // Gemini 3 Pro Preview - Best for complex UI generation

interface DailyCallTracking {
  date: string; // YYYY-MM-DD format
  count: number;
  lastReset: string; // ISO timestamp
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get or initialize daily call tracking from Firestore
 */
async function getDailyCallTracking(): Promise<DailyCallTracking> {
  const db = getAdminDb();
  const trackingRef = db.collection('system').doc('gemini-premium-daily-calls');
  const doc = await trackingRef.get();

  const today = getTodayDate();

  if (!doc.exists) {
    // Initialize tracking
    const initialTracking: DailyCallTracking = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString(),
    };
    await trackingRef.set(initialTracking);
    return initialTracking;
  }

  const data = doc.data() as DailyCallTracking;

  // Check if we need to reset (new day)
  if (data.date !== today) {
    // Reset for new day
    const resetTracking: DailyCallTracking = {
      date: today,
      count: 0,
      lastReset: new Date().toISOString(),
    };
    await trackingRef.set(resetTracking);
    return resetTracking;
  }

  return data;
}

/**
 * Check if we can use gemini-3-pro-preview (under daily limit)
 */
export async function canUseGemini3Flash(): Promise<boolean> {
  try {
    const tracking = await getDailyCallTracking();
    return tracking.count < GEMINI_PREMIUM_DAILY_LIMIT;
  } catch (error) {
    console.error('Error checking gemini-premium availability:', error);
    // On error, allow usage (fail open)
    return true;
  }
}

/**
 * Increment the daily call count for gemini-3-pro-preview
 */
export async function incrementGemini3FlashCalls(): Promise<void> {
  try {
    const db = getAdminDb();
    const trackingRef = db.collection('system').doc('gemini-premium-daily-calls');
    const tracking = await getDailyCallTracking();

    await trackingRef.set({
      date: tracking.date,
      count: tracking.count + 1,
      lastReset: tracking.lastReset,
    }, { merge: true });

    console.log(`📊 Gemini-3-Pro-Preview daily calls: ${tracking.count + 1}/${GEMINI_PREMIUM_DAILY_LIMIT}`);
  } catch (error) {
    console.error('Error incrementing gemini-premium calls:', error);
    // Don't throw - we don't want to break the generation flow
  }
}

/**
 * Get current daily call count
 */
export async function getGemini3FlashCallCount(): Promise<number> {
  try {
    const tracking = await getDailyCallTracking();
    return tracking.count;
  } catch (error) {
    console.error('Error getting gemini-premium call count:', error);
    return 0;
  }
}

/**
 * Get remaining calls for today
 */
export async function getRemainingGemini3FlashCalls(): Promise<number> {
  try {
    const tracking = await getDailyCallTracking();
    return Math.max(0, GEMINI_PREMIUM_DAILY_LIMIT - tracking.count);
  } catch (error) {
    console.error('Error getting remaining gemini-premium calls:', error);
    return GEMINI_PREMIUM_DAILY_LIMIT;
  }
}

